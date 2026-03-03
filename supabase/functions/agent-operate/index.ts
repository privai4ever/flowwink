import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, available_skills } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get AI config from settings
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

    // Fallback to Lovable AI if no keys
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

    const systemPrompt = `You are FlowPilot in Operate mode — an AI assistant that controls a CMS platform.

You have access to tools/skills that let you take real actions: write blog posts, add leads, analyze traffic, book appointments, send newsletters, and more.

RULES:
- When the user asks you to do something, USE the appropriate tool immediately.
- After using a tool, summarize what you did in a friendly, concise way.
- If no tool matches, answer conversationally with your knowledge.
- Be concise: 1-2 sentences max before or after tool calls.
- Use emoji sparingly but naturally.
- If a task requires multiple steps, explain your plan first.`;

    // Call AI with tool calling
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools: available_skills || [],
        tool_choice: 'auto',
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      return new Response(JSON.stringify({ error: 'AI provider error', message: `Could not process your request. Please try again.` }), {
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

    // Check if AI wants to call a tool
    if (choice.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments || '{}');

      // Execute the skill through agent-execute
      const executeResponse = await fetch(`${supabaseUrl}/functions/v1/agent-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          skill_name: fnName,
          arguments: fnArgs,
          agent_type: 'flowpilot',
        }),
      });

      const executeResult = await executeResponse.json();

      // Get AI to summarize the result
      const summaryResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            choice.message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(executeResult),
            },
          ],
        }),
      });

      const summaryData = await summaryResponse.json();
      const summaryText = summaryData.choices?.[0]?.message?.content || 'Action completed.';

      return new Response(JSON.stringify({
        message: summaryText,
        skill_result: {
          skill: fnName,
          status: executeResult.status || 'success',
          result: executeResult.result,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No tool call — just a text response
    return new Response(JSON.stringify({
      message: choice.message?.content || 'I\'m not sure how to help with that.',
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
