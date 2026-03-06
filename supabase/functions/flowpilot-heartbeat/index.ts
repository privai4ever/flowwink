import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveAiConfig,
  loadSoulIdentity,
  buildSoulPrompt,
  loadMemories,
  loadObjectives,
  loadSkillInstructions,
  loadSkillTools,
  getBuiltInTools,
  executeBuiltInTool,
  isBuiltInTool,
} from "../agent-reason/index.ts";

/**
 * FlowPilot Heartbeat — Thin wrapper around agent-reason
 *
 * Scheduled autonomous loop that wakes FlowPilot every N hours.
 * Gathers system context, builds heartbeat-specific prompt, then
 * delegates the full reasoning loop to agent-reason.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITERATIONS = 8;

// ─── Context loaders (heartbeat-specific) ─────────────────────────────────────

async function loadRecentActivity(supabase: any): Promise<string> {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const { data } = await supabase
    .from("agent_activity")
    .select("skill_name, status, error_message, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);
  if (!data?.length) return "\nNo activity in the last 24 hours.";
  return (
    "\n\nRecent activity (24h):\n" +
    data
      .map((a: any) => `- ${a.skill_name || "unknown"}: ${a.status}${a.error_message ? ` (${a.error_message})` : ""}`)
      .join("\n")
  );
}

async function loadSiteStats(supabase: any): Promise<string> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [views, leads, posts, subscribers] = await Promise.all([
    supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
    supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published").gte("published_at", weekAgo.toISOString()),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
  ]);

  return `\n\nSite stats (7 days):
- Page views: ${views.count ?? 0}
- New leads: ${leads.count ?? 0}
- Blog posts published: ${posts.count ?? 0}
- Total confirmed subscribers: ${subscribers.count ?? 0}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const startTime = Date.now();

  try {
    // 1. Gather context in parallel
    const [{ soul, identity }, memoryCtx, objectiveCtx, activityCtx, statsCtx] = await Promise.all([
      loadSoulIdentity(supabase),
      loadMemories(supabase),
      loadObjectives(supabase),
      loadRecentActivity(supabase),
      loadSiteStats(supabase),
    ]);

    const soulPrompt = buildSoulPrompt(soul, identity);

    // 2. Resolve AI config
    const { apiKey, apiUrl, model } = await resolveAiConfig(supabase);

    // 3. Load tools
    const builtInTools = getBuiltInTools(['memory', 'objectives', 'reflect']);
    const skillTools = await loadSkillTools(supabase, 'internal');
    const allTools = [...builtInTools, ...skillTools];

    // 4. Build heartbeat system prompt
    const systemPrompt = `You are FlowPilot running in AUTONOMOUS HEARTBEAT mode. This is a scheduled check-in — no human is watching.
${soulPrompt}

Your mission: Review the state of the system, advance active objectives, and take any needed actions.

CONTEXT:
${memoryCtx}
${objectiveCtx}
${activityCtx}
${statsCtx}

HEARTBEAT PROTOCOL:
1. REFLECT — Use the 'reflect' tool to analyze the past 7 days.
2. OBJECTIVES — Review each active objective. Update progress based on current site stats. If criteria are met, mark as complete.
3. ACT — If any objective needs action and you have the skill for it, DO IT.
4. REMEMBER — If you learn anything new, save it to memory.
5. SUMMARIZE — Write a brief heartbeat report of what you found and did.

CONSTRAINTS:
- Maximum ${MAX_ITERATIONS} tool iterations
- Do NOT send newsletters or do destructive actions without approval
- Be efficient: only act when progress is needed
- If everything is on track, just update progress and report "all clear"

IMPORTANT: Always call 'reflect' first to understand current state before taking action.`;

    // 5. Run the reasoning loop (non-streaming, via agent-reason's shared logic)
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Heartbeat triggered at ${new Date().toISOString()}. Review objectives and system health, then take any needed autonomous actions.` },
    ];

    let finalResponse = "";
    const actionsExecuted: string[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const aiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          tools: allTools.length > 0 ? allTools : undefined,
          tool_choice: allTools.length > 0 ? "auto" : undefined,
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        console.error("[heartbeat] AI error:", aiResponse.status, err);
        throw new Error(`AI provider error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      if (!choice) throw new Error("No AI response");

      const msg = choice.message;

      if (!msg.tool_calls?.length) {
        finalResponse = msg.content || "Heartbeat complete.";
        break;
      }

      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs: any;
        try { fnArgs = JSON.parse(tc.function.arguments || "{}"); } catch { fnArgs = {}; }

        console.log(`[heartbeat] Executing: ${fnName}`, JSON.stringify(fnArgs).slice(0, 200));
        actionsExecuted.push(fnName);

        let result: any;
        try {
          result = await executeBuiltInTool(supabase, supabaseUrl, serviceKey, fnName, fnArgs);
        } catch (err: any) {
          result = { error: err.message };
        }

        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    const duration = Date.now() - startTime;

    // 6. Log heartbeat
    await supabase.from("agent_activity").insert({
      agent: "flowpilot",
      skill_name: "heartbeat",
      input: { trigger: "scheduled", actions: actionsExecuted },
      output: { summary: finalResponse.slice(0, 2000) },
      status: "success",
      duration_ms: duration,
    });

    console.log(`[heartbeat] Complete in ${duration}ms, ${actionsExecuted.length} actions: ${actionsExecuted.join(", ")}`);

    return new Response(
      JSON.stringify({ status: "ok", duration_ms: duration, actions: actionsExecuted, summary: finalResponse.slice(0, 500) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("[heartbeat] Error:", err);

    await supabase.from("agent_activity").insert({
      agent: "flowpilot",
      skill_name: "heartbeat",
      input: { trigger: "scheduled" },
      output: {},
      status: "failed",
      error_message: err.message || "Unknown error",
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
