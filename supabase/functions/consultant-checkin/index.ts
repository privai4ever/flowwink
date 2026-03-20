import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Consultant Check-in — Standalone conversational interview flow
 * Separated from chat-completion for cleaner architecture.
 * Uses OpenAI-compatible API (works with OpenAI, Gemini compat, Local LLM).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

const SAVE_PROFILE_TOOL = {
  type: "function",
  function: {
    name: "save_consultant_profile",
    description: "Save the updated consultant profile after gathering information about their latest project, skills, and availability. Call this when you have enough information (at least 3 exchanges).",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "A comprehensive updated bio/summary of the consultant." },
        skills: { type: "array", items: { type: "string" }, description: "Updated list of all skills and technologies." },
        availability: { type: "string", enum: ["available", "busy", "on_leave"], description: "Current availability status." },
        title: { type: "string", description: "Updated professional title if mentioned." },
      },
      required: ["summary"],
    },
  },
};

// Resolve AI config for check-in (reads from site_settings.integrations)
async function resolveCheckinAiConfig(supabase: any): Promise<{ apiKey: string; apiUrl: string; model: string }> {
  const { data: integrationSettings } = await supabase
    .from('site_settings').select('value').eq('key', 'integrations').maybeSingle();

  const integrations = integrationSettings?.value as any;

  // Try OpenAI first
  if (integrations?.openai?.enabled) {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (apiKey) {
      return { apiKey, apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-mini' };
    }
  }

  // Gemini via OpenAI-compat endpoint
  if (integrations?.gemini?.enabled) {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (apiKey) {
      return { apiKey, apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' };
    }
  }

  // Lovable AI fallback
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableKey) {
    return { apiKey: lovableKey, apiUrl: 'https://ai.gateway.lovable.dev/v1/chat/completions', model: 'google/gemini-2.5-flash' };
  }

  // Final fallback
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiKey) {
    return { apiKey: openaiKey, apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4.1-mini' };
  }

  throw new Error('No AI provider configured for check-in.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, checkinId } = await req.json();

    if (!checkinId) {
      return new Response(JSON.stringify({ error: 'checkinId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Load consultant profile + AI config in parallel
    const [{ data: consultant }, aiConfig] = await Promise.all([
      supabase.from('consultant_profiles')
        .select('name, title, skills, summary, availability, experience_years, bio')
        .eq('id', checkinId).maybeSingle(),
      resolveCheckinAiConfig(supabase),
    ]);

    const consultantName = consultant?.name || 'consultant';
    const existingProfile = consultant
      ? `Name: ${consultant.name}\nTitle: ${consultant.title || 'N/A'}\nSkills: ${(consultant.skills || []).join(', ')}\nExperience: ${consultant.experience_years || 0} years\nAvailability: ${consultant.availability || 'unknown'}\nSummary: ${consultant.summary || 'No summary yet.'}\nBio: ${consultant.bio || 'N/A'}`
      : 'No existing profile found.';

    const systemPrompt = `You are FlowPilot, conducting a friendly professional check-in interview with ${consultantName}.

Your goal is to update their consultant profile by asking conversational questions. Keep it natural and brief — this is a quick check-in, not a formal interview.

Current profile:
${existingProfile}

Ask about (one at a time, conversationally):
1. Their most recent project or assignment (what, where, duration, tech stack)
2. What went particularly well
3. Any interesting challenges
4. Current availability and preferred next role

After 3–5 exchanges when you have enough information, call the save_consultant_profile tool with the updated summary, skills array, availability, and title. Then confirm to the consultant that their profile has been updated.

IMPORTANT: Always respond in the same language the consultant writes in.`;

    const { apiKey, apiUrl, model } = aiConfig;
    const tools = [SAVE_PROFILE_TOOL];

    // Build full message list
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Non-streaming call to check for tool calls
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: fullMessages, tools, tool_choice: 'auto' }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error('[consultant-checkin] AI error:', aiResponse.status, err);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    if (!choice) throw new Error('No AI response');

    const msg = choice.message;

    // Handle tool calls (save_consultant_profile)
    if (msg.tool_calls?.length) {
      const toolResults: ChatMessage[] = [];

      for (const tc of msg.tool_calls) {
        if (tc.function.name === 'save_consultant_profile') {
          let args: any;
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }

          let result = 'Missing summary.';
          if (args.summary) {
            try {
              const updateData: Record<string, unknown> = {
                summary: args.summary,
                updated_at: new Date().toISOString(),
              };
              if (args.skills?.length) updateData.skills = args.skills;
              if (args.availability) updateData.availability = args.availability;
              if (args.title) updateData.title = args.title;

              const { error } = await supabase
                .from('consultant_profiles')
                .update(updateData)
                .eq('id', checkinId);

              result = error ? `Failed: ${error.message}` : 'Consultant profile updated successfully.';
            } catch (err: any) {
              result = `Failed: ${err.message}`;
            }
          }

          toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
      }

      // Follow-up call to get final response after tool execution
      const followUpMessages = [...fullMessages, msg, ...toolResults];
      const followUpResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: followUpMessages, stream: true }),
      });

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // No tool calls — stream the response
    const streamResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: fullMessages, tools, tool_choice: 'auto', stream: true }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (err: any) {
    console.error('[consultant-checkin] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
