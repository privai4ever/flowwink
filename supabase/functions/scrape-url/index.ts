import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Scrape URL — Operator skill for FlowPilot
 *
 * Uses Firecrawl to fetch and extract content from any URL.
 * FlowPilot uses this to "go fetch" web pages, LinkedIn posts, articles, etc.
 * This is the outbound operator capability (FlowPilot commanding external reads).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, formats = ['markdown'], extract_links = false } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl not configured — cannot scrape URLs' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    console.log(`[scrape-url] Scraping: ${targetUrl}`);

    const requestFormats = [...formats];
    if (extract_links && !requestFormats.includes('links')) {
      requestFormats.push('links');
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: requestFormats,
        onlyMainContent: true,
        waitFor: 2000, // Wait for dynamic content (LinkedIn, etc.)
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[scrape-url] Firecrawl error:', data);
      return new Response(JSON.stringify({
        error: data.error || `Scrape failed (${response.status})`,
        url: targetUrl,
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract from nested data structure
    const result = {
      url: targetUrl,
      title: data.data?.metadata?.title || data.metadata?.title || '',
      description: data.data?.metadata?.description || data.metadata?.description || '',
      markdown: data.data?.markdown || data.markdown || '',
      html: data.data?.html || data.html || '',
      links: data.data?.links || data.links || [],
      source_url: data.data?.metadata?.sourceURL || data.metadata?.sourceURL || targetUrl,
    };

    // Truncate markdown for tool response (keep it reasonable for LLM context)
    if (result.markdown.length > 15000) {
      result.markdown = result.markdown.substring(0, 15000) + '\n\n[...content truncated at 15000 chars]';
    }

    console.log(`[scrape-url] Success: ${result.title} (${result.markdown.length} chars)`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[scrape-url] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
