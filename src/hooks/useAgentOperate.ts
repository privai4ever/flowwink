/**
 * useAgentOperate
 * 
 * Hook for FlowPilot "Operate" mode — chat-based CMS control
 * through the agent-execute skill engine.
 * 
 * Conversations are persisted to chat_conversations/chat_messages.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AgentSkill, AgentActivity } from '@/types/agent';

export interface OperateMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  skillResults?: Array<{
    skill: string;
    status: 'success' | 'pending_approval' | 'error';
    result?: unknown;
  }>;
  /** @deprecated Use skillResults instead */
  skillResult?: {
    skill: string;
    status: 'success' | 'pending_approval' | 'error';
    result?: unknown;
  };
}

const FLOWPILOT_CONVERSATION_KEY = 'flowpilot_conversation_id';

export function useAgentOperate() {
  const [messages, setMessages] = useState<OperateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Conversation persistence ───────────────────────────────────────

  const getOrCreateConversation = useCallback(async (): Promise<string> => {
    // Check for existing conversation in localStorage
    const existingId = localStorage.getItem(FLOWPILOT_CONVERSATION_KEY);
    if (existingId && conversationId === existingId) return existingId;

    if (existingId) {
      // Verify it still exists
      const { data } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', existingId)
        .maybeSingle();
      if (data) {
        setConversationId(existingId);
        return existingId;
      }
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        title: 'FlowPilot Session',
        conversation_status: 'active',
        priority: 'normal',
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to create conversation');
    
    localStorage.setItem(FLOWPILOT_CONVERSATION_KEY, data.id);
    setConversationId(data.id);
    return data.id;
  }, [conversationId]);

  const persistMessage = useCallback(async (convId: string, role: string, content: string, metadata?: any) => {
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      role,
      content,
      metadata: metadata || null,
    });
  }, []);

  // Load existing conversation on mount
  useEffect(() => {
    const loadExistingConversation = async () => {
      const existingId = localStorage.getItem(FLOWPILOT_CONVERSATION_KEY);
      if (!existingId) return;

      const { data: conv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', existingId)
        .maybeSingle();

      if (!conv) {
        localStorage.removeItem(FLOWPILOT_CONVERSATION_KEY);
        return;
      }

      setConversationId(existingId);

      // Load messages
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', existingId)
        .order('created_at', { ascending: true });

      if (msgs && msgs.length > 0) {
        const loaded: OperateMessage[] = msgs
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: new Date(m.created_at),
            skillResults: m.metadata?.skill_results || undefined,
            skillResult: m.metadata?.skill_results?.[0] || undefined,
          }));
        setMessages(loaded);
      }
    };

    loadExistingConversation();
  }, []);

  // Load available skills
  const loadSkills = useCallback(async () => {
    const { data } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('enabled', true)
      .in('scope', ['internal', 'both'])
      .order('category');
    if (data) setSkills(data as unknown as AgentSkill[]);
  }, []);

  // Load recent activity
  const loadActivity = useCallback(async () => {
    const { data } = await supabase
      .from('agent_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setActivities(data as unknown as AgentActivity[]);
  }, []);

  // Send a message — AI decides which skills to call (multi-tool loop)
  const sendMessage = useCallback(async (content: string) => {
    const userMsg: OperateMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const convId = await getOrCreateConversation();
      await persistMessage(convId, 'user', content);

      // Build conversation for AI
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('agent-operate', {
        body: { messages: history, available_skills: skills.map(s => s.tool_definition) },
      });

      if (error) throw new Error(error.message);

      const skillResults = data.skill_results || (data.skill_result ? [data.skill_result] : undefined);

      const assistantMsg: OperateMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || data.error || 'Done.',
        createdAt: new Date(),
        skillResults,
        skillResult: skillResults?.[0],
      };

      setMessages(prev => [...prev, assistantMsg]);
      await persistMessage(convId, 'assistant', assistantMsg.content, { skill_results: skillResults });
      await loadActivity();

    } catch (err: any) {
      const errorMsg: OperateMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Something went wrong: ${err.message}`,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      toast.error('Agent error', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [messages, skills, loadActivity, getOrCreateConversation, persistMessage]);

  // Execute a specific skill directly
  const executeSkill = useCallback(async (skillName: string, args: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-execute', {
        body: { skill_name: skillName, arguments: args, agent_type: 'flowpilot' },
      });

      if (error) throw new Error(error.message);

      const msg: OperateMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.status === 'pending_approval'
          ? `⏳ "${skillName}" requires approval before executing.`
          : `✅ Executed "${skillName}" successfully.`,
        createdAt: new Date(),
        skillResult: { skill: skillName, status: data.status, result: data.result },
      };
      setMessages(prev => [...prev, msg]);
      await loadActivity();
      return data;

    } catch (err: any) {
      toast.error('Skill execution failed', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [loadActivity]);

  // Approve a pending action and re-execute it
  const approveAction = useCallback(async (activityId: string) => {
    // Get the activity details for re-execution
    const { data: activity, error: fetchErr } = await supabase
      .from('agent_activity')
      .select('*')
      .eq('id', activityId)
      .single();

    if (fetchErr || !activity) {
      toast.error('Failed to find action');
      return;
    }

    // Mark as approved
    const { error } = await supabase
      .from('agent_activity')
      .update({ status: 'approved' })
      .eq('id', activityId);

    if (error) {
      toast.error('Failed to approve action');
      return;
    }

    toast.success('Action approved — re-executing...');

    // Re-execute the skill with original arguments
    try {
      const { data, error: execErr } = await supabase.functions.invoke('agent-execute', {
        body: {
          skill_name: activity.skill_name,
          arguments: activity.input || {},
          agent_type: activity.agent || 'flowpilot',
          conversation_id: activity.conversation_id,
        },
      });

      if (execErr) throw new Error(execErr.message);

      const msg: OperateMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ Approved and executed "${activity.skill_name}" successfully.`,
        createdAt: new Date(),
        skillResult: { skill: activity.skill_name || '', status: 'success', result: data?.result },
      };
      setMessages(prev => [...prev, msg]);
      toast.success(`"${activity.skill_name}" executed`);
    } catch (err: any) {
      toast.error('Re-execution failed', { description: err.message });
    }

    await loadActivity();
  }, [loadActivity]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(FLOWPILOT_CONVERSATION_KEY);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    skills,
    activities,
    conversationId,
    sendMessage,
    executeSkill,
    approveAction,
    loadSkills,
    loadActivity,
    clearMessages,
  };
}
