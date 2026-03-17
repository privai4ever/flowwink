/**
 * useProactiveMessages
 * 
 * Subscribes to proactive FlowPilot messages via Realtime and provides
 * them merged into the admin chat stream.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProactiveMessage {
  id: string;
  content: string;
  source: string;
  action_payload: any;
  created_at: string;
  conversation_id: string;
}

export function useProactiveMessages(conversationId?: string) {
  const queryClient = useQueryClient();
  const [realtimeMessages, setRealtimeMessages] = useState<ProactiveMessage[]>([]);

  // Fetch existing proactive messages for current conversation
  const { data: storedMessages = [] } = useQuery({
    queryKey: ['proactive-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content, source, action_payload, created_at, conversation_id')
        .eq('conversation_id', conversationId)
        .in('source', ['proactive', 'system'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProactiveMessage[];
    },
    enabled: !!conversationId,
  });

  // Subscribe to realtime inserts of proactive messages
  useEffect(() => {
    const channel = supabase
      .channel('proactive-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `source=in.(proactive,system)`,
        },
        (payload) => {
          const msg = payload.new as unknown as ProactiveMessage;
          // Only add if it's for our conversation or no conversation filter
          if (!conversationId || msg.conversation_id === conversationId) {
            setRealtimeMessages(prev => [...prev, msg]);
            // Invalidate briefing queries so bell updates
            queryClient.invalidateQueries({ queryKey: ['flowpilot-briefings'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Merge stored + realtime, dedup by id
  const allMessages = useCallback(() => {
    const map = new Map<string, ProactiveMessage>();
    for (const m of storedMessages) map.set(m.id, m);
    for (const m of realtimeMessages) map.set(m.id, m);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [storedMessages, realtimeMessages]);

  return {
    messages: allMessages(),
    unreadCount: allMessages().length,
  };
}

/**
 * useUnreadProactiveCount
 * 
 * Lightweight hook for the bell badge — counts unread proactive messages
 * across all conversations.
 */
export function useUnreadProactiveCount() {
  const { data: count = 0 } = useQuery({
    queryKey: ['proactive-unread-count'],
    queryFn: async () => {
      // Count proactive messages not yet "read" (using flowpilot_briefings read_at as proxy)
      const { count, error } = await supabase
        .from('flowpilot_briefings')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return count;
}
