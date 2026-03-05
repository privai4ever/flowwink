import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * FlowPilot Heartbeat
 *
 * Scheduled autonomous loop that wakes FlowPilot every N hours to:
 * 1. Review active objectives and update progress
 * 2. Reflect on recent activity (errors, unused skills)
 * 3. Take autonomous actions (write content, qualify leads, etc.)
 * 4. Log a summary as agent_activity
 *
 * Runs non-streaming — collects tool calls and final response synchronously.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ITERATIONS = 8;

// ─── Built-in tool handlers (duplicated from agent-operate for isolation) ─────

async function loadMemories(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("agent_memory")
    .select("key, value, category")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (!data?.length) return "";
  return (
    "\n\nYour memory:\n" +
    data
      .map((m: any) => `- [${m.category}] ${m.key}: ${JSON.stringify(m.value)}`)
      .join("\n")
  );
}

async function loadObjectives(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("agent_objectives")
    .select("id, goal, status, constraints, success_criteria, progress")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);
  if (!data?.length) return "";
  return (
    "\n\nYour active objectives:\n" +
    data
      .map(
        (o: any) =>
          `- [${o.id.slice(0, 8)}] "${o.goal}" | progress: ${JSON.stringify(o.progress)} | criteria: ${JSON.stringify(o.success_criteria)} | constraints: ${JSON.stringify(o.constraints)}`
      )
      .join("\n")
  );
}

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
      .map(
        (a: any) =>
          `- ${a.skill_name || "unknown"}: ${a.status}${a.error_message ? ` (${a.error_message})` : ""}`
      )
      .join("\n")
  );
}

async function loadSiteStats(supabase: any): Promise<string> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [views, leads, posts, subscribers] = await Promise.all([
    supabase
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", weekAgo.toISOString()),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
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
    // 1. Gather context
    const [memoryCtx, objectiveCtx, activityCtx, statsCtx] = await Promise.all([
      loadMemories(supabase),
      loadObjectives(supabase),
      loadRecentActivity(supabase),
      loadSiteStats(supabase),
    ]);

    // 2. Get AI config
    let apiKey = Deno.env.get("OPENAI_API_KEY") || "";
    let apiUrl = "https://api.openai.com/v1/chat/completions";
    let model = "gpt-4o";

    const { data: settings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "system_ai")
      .maybeSingle();

    if (settings?.value) {
      const cfg = settings.value as Record<string, string>;
      if (cfg.provider === "gemini" && Deno.env.get("GEMINI_API_KEY")) {
        apiKey = Deno.env.get("GEMINI_API_KEY")!;
        apiUrl =
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        model = cfg.model || "gemini-2.5-flash";
      } else if (cfg.provider === "openai" && Deno.env.get("OPENAI_API_KEY")) {
        apiKey = Deno.env.get("OPENAI_API_KEY")!;
        model = cfg.model || "gpt-4o";
      }
    }

    if (!apiKey) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        apiKey = lovableKey;
        apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
        model = "google/gemini-2.5-flash";
      }
    }

    if (!apiKey) {
      throw new Error("No AI provider configured");
    }

    // 3. Load available skills as tools
    const { data: skills } = await supabase
      .from("agent_skills")
      .select("name, tool_definition, scope")
      .eq("enabled", true)
      .in("scope", ["internal", "both"]);

    const skillTools = (skills || [])
      .filter((s: any) => s.tool_definition?.function)
      .map((s: any) => s.tool_definition);

    // Built-in tools (subset for heartbeat — memory + objectives + reflect)
    const builtInTools = [
      {
        type: "function",
        function: {
          name: "memory_write",
          description: "Save to persistent memory.",
          parameters: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { description: "Info to remember" },
              category: {
                type: "string",
                enum: ["preference", "context", "fact"],
              },
            },
            required: ["key", "value"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "objective_update_progress",
          description: "Update progress on an active objective.",
          parameters: {
            type: "object",
            properties: {
              objective_id: { type: "string" },
              progress: { type: "object" },
            },
            required: ["objective_id", "progress"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "objective_complete",
          description: "Mark objective as completed.",
          parameters: {
            type: "object",
            properties: { objective_id: { type: "string" } },
            required: ["objective_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "reflect",
          description:
            "Analyze performance over past 7 days. Returns skill usage, error rates, suggestions.",
          parameters: {
            type: "object",
            properties: {
              focus: { type: "string", enum: ["errors", "usage", "automations", "objectives"] },
            },
          },
        },
      },
    ];

    const allTools = [...builtInTools, ...skillTools];

    const systemPrompt = `You are FlowPilot running in AUTONOMOUS HEARTBEAT mode. This is a scheduled check-in — no human is watching.

Your mission: Review the state of the system, advance active objectives, and take any needed actions.

CONTEXT:
${memoryCtx}
${objectiveCtx}
${activityCtx}
${statsCtx}

HEARTBEAT PROTOCOL:
1. REFLECT — Use the 'reflect' tool to analyze the past 7 days.
2. OBJECTIVES — Review each active objective. Update progress based on current site stats. If criteria are met, mark as complete.
3. ACT — If any objective needs action and you have the skill for it, DO IT. Examples:
   - Blog objective behind → draft a blog post
   - Lead response objective → check for unqualified leads
   - Newsletter growth objective → review subscriber count
4. REMEMBER — If you learn anything new, save it to memory.
5. SUMMARIZE — Write a brief heartbeat report of what you found and did.

CONSTRAINTS:
- Maximum ${MAX_ITERATIONS} tool iterations
- Do NOT send newsletters or do destructive actions without approval
- Be efficient: only act when progress is needed
- If everything is on track, just update progress and report "all clear"

IMPORTANT: Always call 'reflect' first to understand current state before taking action.`;

    // 4. Run the agentic loop (non-streaming)
    let messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Heartbeat triggered at ${new Date().toISOString()}. Review objectives and system health, then take any needed autonomous actions.`,
      },
    ];

    let finalResponse = "";
    const actionsExecuted: string[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const aiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools: allTools.length > 0 ? allTools : undefined,
          tool_choice: allTools.length > 0 ? "auto" : undefined,
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        console.error("AI error:", aiResponse.status, err);
        throw new Error(`AI provider error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      if (!choice) throw new Error("No AI response");

      const msg = choice.message;

      // No tool calls — we're done
      if (!msg.tool_calls?.length) {
        finalResponse = msg.content || "Heartbeat complete.";
        break;
      }

      // Execute tool calls
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs: any;
        try {
          fnArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          fnArgs = {};
        }

        console.log(`[heartbeat] Executing: ${fnName}`, JSON.stringify(fnArgs).slice(0, 200));
        actionsExecuted.push(fnName);

        let result: any;
        try {
          result = await executeBuiltinOrSkill(
            supabase,
            supabaseUrl,
            serviceKey,
            fnName,
            fnArgs
          );
        } catch (err: any) {
          result = { error: err.message };
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    const duration = Date.now() - startTime;

    // 5. Log heartbeat as agent_activity
    await supabase.from("agent_activity").insert({
      agent: "flowpilot",
      skill_name: "heartbeat",
      input: { trigger: "scheduled", actions: actionsExecuted },
      output: { summary: finalResponse.slice(0, 2000) },
      status: "success",
      duration_ms: duration,
    });

    console.log(
      `[heartbeat] Complete in ${duration}ms, ${actionsExecuted.length} actions: ${actionsExecuted.join(", ")}`
    );

    return new Response(
      JSON.stringify({
        status: "ok",
        duration_ms: duration,
        actions: actionsExecuted,
        summary: finalResponse.slice(0, 500),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("[heartbeat] Error:", err);

    // Log failure
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ─── Execute built-in tools or delegate to agent-execute ──────────────────────

async function executeBuiltinOrSkill(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  fnName: string,
  args: any
): Promise<any> {
  // Memory
  if (fnName === "memory_write") {
    const { key, value, category = "context" } = args;
    const { data: existing } = await supabase
      .from("agent_memory")
      .select("id")
      .eq("key", key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("agent_memory")
        .update({
          value: typeof value === "object" ? value : { text: value },
          category,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("agent_memory").insert({
        key,
        value: typeof value === "object" ? value : { text: value },
        category,
        created_by: "flowpilot",
      });
    }
    return { status: "saved", key };
  }

  // Objective progress
  if (fnName === "objective_update_progress") {
    const { error } = await supabase
      .from("agent_objectives")
      .update({ progress: args.progress })
      .eq("id", args.objective_id);
    if (error) return { status: "error", error: error.message };
    return { status: "updated", objective_id: args.objective_id };
  }

  // Objective complete
  if (fnName === "objective_complete") {
    const { error } = await supabase
      .from("agent_objectives")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", args.objective_id);
    if (error) return { status: "error", error: error.message };
    return { status: "completed", objective_id: args.objective_id };
  }

  // Reflect
  if (fnName === "reflect") {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data: activity } = await supabase
      .from("agent_activity")
      .select("skill_name, status, duration_ms, error_message")
      .gte("created_at", since.toISOString())
      .limit(100);

    const stats: Record<string, { count: number; errors: number }> = {};
    for (const a of activity || []) {
      const n = a.skill_name || "unknown";
      if (!stats[n]) stats[n] = { count: 0, errors: 0 };
      stats[n].count++;
      if (a.status === "failed") stats[n].errors++;
    }

    const { data: objectives } = await supabase
      .from("agent_objectives")
      .select("goal, status, progress");

    return {
      period: "7 days",
      total_actions: (activity || []).length,
      skill_usage: stats,
      objectives: objectives || [],
    };
  }

  // All other tools → delegate to agent-execute
  const response = await fetch(`${supabaseUrl}/functions/v1/agent-execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      skill_name: fnName,
      arguments: args,
      agent_type: "flowpilot",
    }),
  });
  return response.json();
}
