import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * FlowPilot Morning Briefing
 * 
 * Compiles a daily business health digest from all platform data.
 * Called by cron (8 AM daily) or manually from the dashboard.
 * Saves to flowpilot_briefings table for in-app display.
 * Future: sends email via Resend when email domain is configured.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const prevWeek = new Date(now);
    prevWeek.setDate(prevWeek.getDate() - 14);

    // ─── Parallel data collection ───────────────────────────────────
    const [
      viewsToday, viewsWeek, viewsPrevWeek,
      leadsToday, leadsWeek,
      postsPublished, postsDraft,
      subscribersTotal, subscribersNew,
      ordersWeek, ordersPrevWeek,
      bookingsWeek,
      agentActivity,
      objectivesActive,
      chatConversations,
      proposals,
    ] = await Promise.all([
      // Traffic
      supabase.from("page_views").select("id", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString()),
      supabase.from("page_views").select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString()),
      supabase.from("page_views").select("id", { count: "exact", head: true })
        .gte("created_at", prevWeek.toISOString())
        .lt("created_at", weekAgo.toISOString()),
      
      // Leads
      supabase.from("leads").select("id, name, email, source, score, status", { count: "exact" })
        .gte("created_at", yesterday.toISOString()),
      supabase.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString()),

      // Content
      supabase.from("blog_posts").select("id, title", { count: "exact" })
        .eq("status", "published")
        .gte("published_at", weekAgo.toISOString()),
      supabase.from("blog_posts").select("id", { count: "exact", head: true })
        .eq("status", "draft"),

      // Subscribers
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("confirmed_at", weekAgo.toISOString()),

      // Revenue
      supabase.from("orders").select("total_cents, currency", { count: "exact" })
        .gte("created_at", weekAgo.toISOString())
        .eq("status", "completed"),
      supabase.from("orders").select("total_cents", { count: "exact" })
        .gte("created_at", prevWeek.toISOString())
        .lt("created_at", weekAgo.toISOString())
        .eq("status", "completed"),

      // Bookings
      supabase.from("bookings").select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString())
        .neq("status", "cancelled"),

      // FlowPilot activity
      supabase.from("agent_activity").select("skill_name, status, created_at")
        .gte("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),

      // Objectives
      supabase.from("agent_objectives").select("id, goal, status, progress")
        .eq("status", "active"),

      // Chat conversations
      supabase.from("chat_conversations").select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString()),

      // Content proposals
      supabase.from("content_proposals").select("id, topic, status")
        .in("status", ["draft", "ready"])
        .limit(5),
    ]);

    // ─── Compute metrics ────────────────────────────────────────────
    const trafficToday = viewsToday.count ?? 0;
    const trafficWeek = viewsWeek.count ?? 0;
    const trafficPrevWeek = viewsPrevWeek.count ?? 0;
    const trafficTrend = trafficPrevWeek > 0
      ? Math.round(((trafficWeek - trafficPrevWeek) / trafficPrevWeek) * 100)
      : trafficWeek > 0 ? 100 : 0;

    const newLeadsToday = leadsToday.count ?? 0;
    const newLeadsWeek = leadsWeek.count ?? 0;

    const revenueWeek = (ordersWeek.data || []).reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);
    const revenuePrevWeek = (ordersPrevWeek.data || []).reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);
    const revenueTrend = revenuePrevWeek > 0
      ? Math.round(((revenueWeek - revenuePrevWeek) / revenuePrevWeek) * 100)
      : revenueWeek > 0 ? 100 : 0;

    const publishedThisWeek = postsPublished.count ?? 0;
    const draftsReady = postsDraft.count ?? 0;
    const totalSubscribers = subscribersTotal.count ?? 0;
    const newSubscribers = subscribersNew.count ?? 0;
    const bookingsCount = bookingsWeek.count ?? 0;
    const chatCount = chatConversations.count ?? 0;

    // FlowPilot actions summary
    const actions = agentActivity.data || [];
    const successActions = actions.filter((a: any) => a.status === "success").length;
    const failedActions = actions.filter((a: any) => a.status === "failed").length;
    const skillsUsed = [...new Set(actions.map((a: any) => a.skill_name).filter(Boolean))];

    // Active objectives progress
    const objectives = (objectivesActive.data || []).map((o: any) => {
      const plan = o.progress?.plan;
      const completion = plan?.steps
        ? Math.round((plan.steps.filter((s: any) => s.status === "done").length / plan.total_steps) * 100)
        : 0;
      return { goal: o.goal, completion };
    });

    // ─── Build sections ─────────────────────────────────────────────
    const sections = [];

    // 1. Business Pulse
    sections.push({
      title: "📊 Business Pulse",
      type: "metrics",
      items: [
        { label: "Page Views (24h)", value: trafficToday, trend: null },
        { label: "Page Views (7d)", value: trafficWeek, trend: trafficTrend, unit: "%" },
        { label: "New Leads (24h)", value: newLeadsToday, trend: null },
        { label: "New Leads (7d)", value: newLeadsWeek, trend: null },
        { label: "Revenue (7d)", value: revenueWeek / 100, trend: revenueTrend, unit: "%", format: "currency" },
        { label: "Bookings (7d)", value: bookingsCount, trend: null },
        { label: "Chat Conversations (7d)", value: chatCount, trend: null },
        { label: "Subscribers", value: totalSubscribers, trend: newSubscribers > 0 ? `+${newSubscribers}` : null },
      ],
    });

    // 2. FlowPilot Activity
    sections.push({
      title: "🤖 FlowPilot Activity (24h)",
      type: "activity",
      items: [
        { label: "Actions executed", value: actions.length },
        { label: "Successful", value: successActions },
        { label: "Failed", value: failedActions },
        { label: "Skills used", value: skillsUsed.join(", ") || "none" },
      ],
    });

    // 3. Objective Progress
    if (objectives.length > 0) {
      sections.push({
        title: "🎯 Objective Progress",
        type: "objectives",
        items: objectives.map((o: any) => ({
          label: o.goal,
          value: `${o.completion}%`,
        })),
      });
    }

    // 4. Content Pipeline
    sections.push({
      title: "✍️ Content Pipeline",
      type: "content",
      items: [
        { label: "Published this week", value: publishedThisWeek },
        { label: "Drafts ready for review", value: draftsReady },
        { label: "Proposals pending", value: proposals.data?.length ?? 0 },
      ],
    });

    // ─── Build action items ─────────────────────────────────────────
    const actionItems: any[] = [];

    if (newLeadsToday > 0) {
      const hotLeads = (leadsToday.data || []).filter((l: any) => (l.score || 0) >= 20);
      if (hotLeads.length > 0) {
        actionItems.push({
          priority: "high",
          text: `${hotLeads.length} hot lead${hotLeads.length > 1 ? "s" : ""} captured — review and follow up`,
          link: "/admin/contacts",
        });
      }
    }

    if (draftsReady > 0) {
      actionItems.push({
        priority: "medium",
        text: `${draftsReady} blog draft${draftsReady > 1 ? "s" : ""} ready for review`,
        link: "/admin/blog",
      });
    }

    if (failedActions > 0) {
      actionItems.push({
        priority: "high",
        text: `${failedActions} FlowPilot action${failedActions > 1 ? "s" : ""} failed — check Skill Hub`,
        link: "/admin/skills",
      });
    }

    if (trafficTrend < -20) {
      actionItems.push({
        priority: "medium",
        text: `Traffic down ${Math.abs(trafficTrend)}% vs last week — consider new content`,
        link: "/admin/analytics",
      });
    }

    const pendingProposals = (proposals.data || []).filter((p: any) => p.status === "ready");
    if (pendingProposals.length > 0) {
      actionItems.push({
        priority: "low",
        text: `${pendingProposals.length} content proposal${pendingProposals.length > 1 ? "s" : ""} ready to publish`,
        link: "/admin/campaigns",
      });
    }

    // ─── Build summary ──────────────────────────────────────────────
    const summaryParts: string[] = [];
    if (trafficToday > 0) summaryParts.push(`${trafficToday} visitors today`);
    if (newLeadsToday > 0) summaryParts.push(`${newLeadsToday} new lead${newLeadsToday > 1 ? "s" : ""}`);
    if (successActions > 0) summaryParts.push(`FlowPilot completed ${successActions} action${successActions > 1 ? "s" : ""}`);
    if (publishedThisWeek > 0) summaryParts.push(`${publishedThisWeek} post${publishedThisWeek > 1 ? "s" : ""} published this week`);

    const summary = summaryParts.length > 0
      ? summaryParts.join(" · ")
      : "Quiet day — no significant activity to report.";

    const title = `Daily Briefing — ${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;

    // ─── Compute health score (0-100) ───────────────────────────────
    let healthScore = 50; // base
    if (trafficWeek > 50) healthScore += 10;
    if (trafficTrend > 0) healthScore += 5;
    if (newLeadsWeek > 0) healthScore += 10;
    if (publishedThisWeek > 0) healthScore += 10;
    if (totalSubscribers > 10) healthScore += 5;
    if (failedActions > 2) healthScore -= 10;
    if (trafficTrend < -20) healthScore -= 10;
    if (objectives.some((o: any) => o.completion > 50)) healthScore += 10;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const metrics = {
      health_score: healthScore,
      traffic_today: trafficToday,
      traffic_week: trafficWeek,
      traffic_trend: trafficTrend,
      leads_today: newLeadsToday,
      leads_week: newLeadsWeek,
      revenue_week: revenueWeek,
      revenue_trend: revenueTrend,
      subscribers: totalSubscribers,
      bookings_week: bookingsCount,
      content_published: publishedThisWeek,
      content_drafts: draftsReady,
      flowpilot_actions: actions.length,
      flowpilot_success_rate: actions.length > 0 ? Math.round((successActions / actions.length) * 100) : 0,
    };

    // ─── Save briefing ──────────────────────────────────────────────
    const { data: briefing, error } = await supabase
      .from("flowpilot_briefings")
      .insert({
        type: "daily_digest",
        title,
        summary,
        sections,
        metrics,
        action_items: actionItems,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[briefing] Created: ${title} | Health: ${healthScore} | Actions: ${actionItems.length}`);

    return new Response(
      JSON.stringify({ status: "ok", briefing_id: briefing.id, health_score: healthScore, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[briefing] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
