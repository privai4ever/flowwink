/**
 * useAgentOperate
 * 
 * Hook for FlowPilot "Operate" mode — chat-based CMS control
 * through the agent-execute skill engine.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AgentSkill, AgentActivity } from '@/types/agent';

export interface OperateMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  skillResult?: {
    skill: string;
    status: 'success' | 'pending_approval' | 'error';
    result?: unknown;
  };
}

export function useAgentOperate() {
  const [messages, setMessages] = useState<OperateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const abortRef = useRef<AbortController | null>(null);

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

  // Send a message — AI decides which skill to call
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
      // Build conversation for AI
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Get AI to decide which skill to use
      const { data, error } = await supabase.functions.invoke('agent-operate', {
        body: { messages: history, available_skills: skills.map(s => s.tool_definition) },
      });

      if (error) throw new Error(error.message);

      const assistantMsg: OperateMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || data.error || 'Done.',
        createdAt: new Date(),
        skillResult: data.skill_result,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Refresh activity feed
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
  }, [messages, skills, loadActivity]);

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

  // Approve a pending action
  const approveAction = useCallback(async (activityId: string) => {
    const { error } = await supabase
      .from('agent_activity')
      .update({ status: 'approved' })
      .eq('id', activityId);
    if (error) {
      toast.error('Failed to approve action');
      return;
    }
    toast.success('Action approved');
    await loadActivity();
  }, [loadActivity]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    skills,
    activities,
    sendMessage,
    executeSkill,
    approveAction,
    loadSkills,
    loadActivity,
    clearMessages,
  };
}
