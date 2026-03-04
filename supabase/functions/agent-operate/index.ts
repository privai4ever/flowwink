import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TOOL_ITERATIONS = 6;

// ─── Memory helpers ───────────────────────────────────────────────────────────

async function loadMemories(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('agent_memory')
    .select('key, value, category')
    .order('updated_at', { ascending: false })
    .limit(30);

  if (!data || data.length === 0) return '';
  const lines = data.map((m: any) => `- [${m.category}] ${m.key}: ${JSON.stringify(m.value)}`);
  return `\n\nYour memory (things you've learned about this site and its owner):\n${lines.join('\n')}`;
}

async function handleMemoryWrite(supabase: any, args: { key: string; value: any; category?: string }) {
  const { key, value, category = 'context' } = args;
  const { data: existing } = await supabase
    .from('agent_memory').select('id').eq('key', key).maybeSingle();

  if (existing) {
    await supabase.from('agent_memory')
      .update({ value: typeof value === 'object' ? value : { text: value }, category, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('agent_memory')
      .insert({ key, value: typeof value === 'object' ? value : { text: value }, category, created_by: 'flowpilot' });
  }
  return { status: 'saved', key };
}

async function handleMemoryRead(supabase: any, args: { key?: string; category?: string }) {
  let q = supabase.from('agent_memory').select('key, value, category, updated_at');
  if (args.key) q = q.ilike('key', `%${args.key}%`);
  if (args.category) q = q.eq('category', args.category);
  const { data } = await q.order('updated_at', { ascending: false }).limit(10);
  return { memories: data || [] };
}

// ─── Objectives helpers ───────────────────────────────────────────────────────

async function loadObjectives(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('agent_objectives')
    .select('id, goal, status, constraints, success_criteria, progress')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return '';
  const lines = data.map((o: any) =>
    `- [${o.id.slice(0, 8)}] "${o.goal}" | progress: ${JSON.stringify(o.progress)} | criteria: ${JSON.stringify(o.success_criteria)} | constraints: ${JSON.stringify(o.constraints)}`
  );
  return `\n\nYour active objectives (high-level goals to work toward):\n${lines.join('\n')}`;
}

async function handleObjectiveUpdateProgress(supabase: any, args: { objective_id: string; progress: any }) {
  const { error } = await supabase
    .from('agent_objectives').update({ progress: args.progress }).eq('id', args.objective_id);
  if (error) return { status: 'error', error: error.message };
  return { status: 'updated', objective_id: args.objective_id };
}

async function handleObjectiveComplete(supabase: any, args: { objective_id: string }) {
  const { error } = await supabase
    .from('agent_objectives')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', args.objective_id);
  if (error) return { status: 'error', error: error.message };
  return { status: 'completed', objective_id: args.objective_id };
}

// ─── Built-in tool definitions ────────────────────────────────────────────────

const memoryTools = [
  {
    type: 'function',
    function: {
      name: 'memory_write',
      description: 'Save something to your persistent memory.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Short identifier e.g. "preferred_blog_tone"' },
          value: { description: 'The information to remember' },
          category: { type: 'string', enum: ['preference', 'context', 'fact'] },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'memory_read',
      description: 'Search your persistent memory.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Search term' },
          category: { type: 'string', enum: ['preference', 'context', 'fact'] },
        },
      },
    },
  },
];

const objectiveTools = [
  {
    type: 'function',
    function: {
      name: 'objective_update_progress',
      description: 'Update progress on an active objective.',
      parameters: {
        type: 'object',
        properties: {
          objective_id: { type: 'string' },
          progress: { type: 'object', description: 'Updated progress object' },
        },
        required: ['objective_id', 'progress'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'objective_complete',
      description: 'Mark an objective as completed.',
      parameters: {
        type: 'object',
        properties: {
          objective_id: { type: 'string' },
        },
        required: ['objective_id'],
      },
    },
  },
];

// ─── Tool execution helper ────────────────────────────────────────────────────

async function executeToolCall(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  fnName: string,
  fnArgs: any,
): Promise<any> {
  if (fnName === 'memory_write') return handleMemoryWrite(supabase, fnArgs);
  if (fnName === 'memory_read') return handleMemoryRead(supabase, fnArgs);
  if (fnName === 'objective_update_progress') return handleObjectiveUpdateProgress(supabase, fnArgs);
  if (fnName === 'objective_complete') return handleObjectiveComplete(supabase, fnArgs);

  // External skill via agent-execute
  const response = await fetch(`${supabaseUrl}/functions/v1/agent-execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({ skill_name: fnName, arguments: fnArgs, agent_type: 'flowpilot' }),
  });
  return response.json();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, available_skills } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get AI config
    let apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    let apiUrl = 'https://api.openai.com/v1/chat/completions';
    let model = 'gpt-4o';

    const { data: settings } = await supabase
      .from('site_settings').select('value').eq('key', 'system_ai').maybeSingle();

    if (settings?.value) {
      const cfg = settings.value as Record<string, string>;
      if (cfg.provider === 'gemini' && Deno.env.get('GEMINI_API_KEY')) {
        apiKey = Deno.env.get('GEMINI_API_KEY')!;
        apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        model = cfg.model || 'gemini-2.5-flash';
      } else if (cfg.provider === 'openai' && Deno.env.get('OPENAI_API_KEY')) {
        apiKey = Deno.env.get('OPENAI_API_KEY')!;
        model = cfg.model || 'gpt-4o';
      }
    }

    if (!apiKey) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (lovableKey) {
        apiKey = lovableKey;
        apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
        model = 'google/gemini-2.5-flash';
      }
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No AI provider configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load context
    const [memoryContext, objectiveContext] = await Promise.all([
      loadMemories(supabase),
      loadObjectives(supabase),
    ]);

    const systemPrompt = `You are FlowPilot in Operate mode — an autonomous AI assistant that controls a CMS platform.

You can use MULTIPLE tools in a single turn and CHAIN tool calls across iterations.
When a task requires multiple steps, execute them sequentially — don't just describe a plan.

TOOLS & SKILLS:
- You have access to CMS skills: blog posts, leads, analytics, bookings, newsletters, etc.
- You have PERSISTENT MEMORY (memory_write / memory_read).
- You can track OBJECTIVES (objective_update_progress / objective_complete).

MEMORY GUIDELINES:
- Save user preferences, facts, and context with memory_write
- Check memory before answering questions about the site
${memoryContext}

OBJECTIVES:
- After executing skills that contribute to an objective, update progress.
- When all success_criteria are met, mark as complete.
${objectiveContext}

RULES:
- When the user asks you to do something, USE the appropriate tools immediately.
- You can call MULTIPLE tools in parallel when they're independent.
- After tool results come back, you may call MORE tools if the task isn't done.
- After all actions complete, summarize what you did concisely.
- Use markdown formatting for clear, readable responses.
- Be concise but thorough. Use emoji sparingly.`;

    const allTools = [...memoryTools, ...objectiveTools, ...(available_skills || [])];

    // ─── Iterative tool-call loop ───────────────────────────────────────
    let conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const allSkillResults: any[] = [];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: conversationMessages,
          tools: allTools.length > 0 ? allTools : undefined,
          tool_choice: allTools.length > 0 ? 'auto' : undefined,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error('AI error:', aiResponse.status, errText);
        return new Response(JSON.stringify({ error: 'AI provider error', message: 'Could not process your request.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      if (!choice) {
        return new Response(JSON.stringify({ message: 'No response from AI' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const assistantMessage = choice.message;

      // No tool calls — final text response, loop ends
      if (!assistantMessage.tool_calls?.length) {
        return new Response(JSON.stringify({
          message: assistantMessage.content || "Done.",
          skill_results: allSkillResults.length > 0 ? allSkillResults : undefined,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process ALL tool calls in parallel
      conversationMessages.push(assistantMessage);

      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (tc: any) => {
          const fnName = tc.function.name;
          let fnArgs: any;
          try {
            fnArgs = JSON.parse(tc.function.arguments || '{}');
          } catch {
            fnArgs = {};
          }

          let result: any;
          try {
            result = await executeToolCall(supabase, supabaseUrl, serviceKey, fnName, fnArgs);
          } catch (err: any) {
            result = { error: err.message };
          }

          // Track skill results for the response
          const isBuiltIn = ['memory_write', 'memory_read', 'objective_update_progress', 'objective_complete'].includes(fnName);
          if (!isBuiltIn) {
            allSkillResults.push({
              skill: fnName,
              status: result?.status || 'success',
              result: result?.result || result,
            });
          }

          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        })
      );

      // Add all tool results to conversation
      conversationMessages.push(...toolResults);

      // Continue loop — AI will see tool results and decide if more calls needed
    }

    // If we hit max iterations, do one final call without tools to get summary
    const finalResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: conversationMessages }),
    });
    const finalData = await finalResponse.json();
    const finalText = finalData.choices?.[0]?.message?.content || 'Completed all actions.';

    return new Response(JSON.stringify({
      message: finalText,
      skill_results: allSkillResults.length > 0 ? allSkillResults : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('agent-operate error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
