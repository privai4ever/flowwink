/**
 * OpenClaw Bridge — Edge Function
 * 
 * Receives structured feedback from an external OpenClaw instance acting as
 * a beta tester. Stores sessions, findings, and exchanges. Optionally triggers
 * FlowPilot to analyze and learn from the feedback.
 * 
 * Endpoints (via action param):
 *   start_session  — Begin a new test session
 *   end_session    — Complete a session with summary
 *   report_finding — Log a bug, suggestion, or observation
 *   exchange       — Send a message between OpenClaw ↔ FlowPilot
 *   get_status     — Retrieve current sessions and findings
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openclaw-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { action, ...data } = body;

    switch (action) {
      case 'start_session': {
        const { scenario, peer_name, metadata } = data;
        if (!scenario) {
          return jsonResponse({ error: 'scenario is required' }, 400);
        }

        const { data: session, error } = await supabase
          .from('beta_test_sessions')
          .insert({
            scenario,
            peer_name: peer_name || 'openclaw',
            metadata: metadata || {},
            status: 'running',
          })
          .select('id, scenario, status, started_at')
          .single();

        if (error) throw error;

        return jsonResponse({ success: true, session });
      }

      case 'end_session': {
        const { session_id, summary, status } = data;
        if (!session_id) {
          return jsonResponse({ error: 'session_id is required' }, 400);
        }

        const now = new Date().toISOString();
        const { data: session, error: fetchErr } = await supabase
          .from('beta_test_sessions')
          .select('started_at')
          .eq('id', session_id)
          .single();

        const durationMs = session
          ? Date.now() - new Date(session.started_at).getTime()
          : null;

        const { error } = await supabase
          .from('beta_test_sessions')
          .update({
            status: status || 'completed',
            summary,
            completed_at: now,
            duration_ms: durationMs,
          })
          .eq('id', session_id);

        if (error) throw error;

        return jsonResponse({ success: true, session_id, duration_ms: durationMs });
      }

      case 'report_finding': {
        const { session_id, type, severity, title, description, context, screenshot_url } = data;
        if (!session_id || !type || !title) {
          return jsonResponse({ error: 'session_id, type, and title are required' }, 400);
        }

        const { data: finding, error } = await supabase
          .from('beta_test_findings')
          .insert({
            session_id,
            type,
            severity: severity || 'medium',
            title,
            description,
            context: context || {},
            screenshot_url,
          })
          .select('id, type, severity, title')
          .single();

        if (error) throw error;

        return jsonResponse({ success: true, finding });
      }

      case 'exchange': {
        const { session_id, direction, message_type, content, payload } = data;
        if (!content || !direction) {
          return jsonResponse({ error: 'content and direction are required' }, 400);
        }

        const { data: exchange, error } = await supabase
          .from('beta_test_exchanges')
          .insert({
            session_id: session_id || null,
            direction,
            message_type: message_type || 'observation',
            content,
            payload: payload || {},
          })
          .select('id, direction, message_type, created_at')
          .single();

        if (error) throw error;

        return jsonResponse({ success: true, exchange });
      }

      case 'get_status': {
        const { data: sessions, error: sessErr } = await supabase
          .from('beta_test_sessions')
          .select('*, beta_test_findings(count)')
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: recentFindings } = await supabase
          .from('beta_test_findings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        const { data: recentExchanges } = await supabase
          .from('beta_test_exchanges')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        return jsonResponse({
          sessions: sessions || [],
          findings: recentFindings || [],
          exchanges: recentExchanges || [],
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('[openclaw-bridge] Error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Internal error' },
      500
    );
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
