import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain, company_name, focus_areas = ['content', 'positioning', 'seo'] } = await req.json();

    if (!domain || !company_name) {
      return new Response(JSON.stringify({ error: 'domain and company_name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    // Step 1: Scrape competitor website
    let siteContent = '';
    
    if (firecrawlKey) {
      try {
        const scrapeResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firecrawlKey}` },
          body: JSON.stringify({ url: `https://${domain}`, formats: ['markdown'] }),
        });
        const scrapeData = await scrapeResp.json();
        siteContent = scrapeData.data?.markdown || '';
      } catch (e) {
        console.error('[competitor-monitor] Scrape failed:', e);
      }
    }

    // Step 2: Search for recent content/news
    let recentContent: any[] = [];
    if (firecrawlKey) {
      try {
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firecrawlKey}` },
          body: JSON.stringify({ 
            query: `${company_name} latest news blog updates 2026`, 
            limit: 5, 
            scrapeContent: false 
          }),
        });
        const searchData = await searchResp.json();
        recentContent = (searchData.data || []).map((r: any) => ({
          title: r.title || r.metadata?.title,
          url: r.url,
          description: r.description || r.metadata?.description,
        }));
      } catch (e) {
        console.error('[competitor-monitor] Search failed:', e);
      }
    }

    // Step 3: Analyze with AI
    let analysis: any = {
      company_name,
      domain,
      scanned_at: new Date().toISOString(),
      recent_content: recentContent,
      positioning_summary: 'Analysis not available - no AI key configured',
      our_gaps: [],
      opportunities: [],
    };

    if (geminiKey && (siteContent || recentContent.length > 0)) {
      try {
        const analysisPrompt = `Analyze this competitor for a digital agency/SaaS platform:

Company: ${company_name}
Domain: ${domain}
Focus areas: ${focus_areas.join(', ')}

Website content (first 3000 chars):
${siteContent.substring(0, 3000)}

Recent content/news:
${recentContent.map((r: any) => `- ${r.title}: ${r.description || ''}`).join('\n')}

Provide a JSON analysis with:
{
  "positioning_summary": "2-3 sentence summary of their market positioning",
  "content_strategy": "How they approach content (topics, frequency, formats)",
  "key_differentiators": ["list of unique selling points"],
  "recent_themes": ["trending topics they're covering"],
  "our_gaps": ["areas where they're ahead that we should address"],
  "opportunities": ["weaknesses or gaps we can exploit"],
  "seo_observations": "Notable SEO patterns (if seo is a focus area)"
}

Return ONLY valid JSON.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const aiResp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analysisPrompt }] }],
            generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
          }),
        });
        const aiData = await aiResp.json();
        const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Extract JSON from response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          analysis = { ...analysis, ...parsed };
        }
      } catch (e) {
        console.error('[competitor-monitor] AI analysis failed:', e);
      }
    }

    // Step 4: Store in agent_memory for future reference
    const memoryKey = `competitor:${domain}`;
    const { data: existing } = await supabase
      .from('agent_memory')
      .select('id')
      .eq('key', memoryKey)
      .maybeSingle();

    if (existing) {
      await supabase.from('agent_memory').update({
        value: analysis,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('agent_memory').insert({
        key: memoryKey,
        value: analysis,
        category: 'context',
        created_by: 'flowpilot',
      });
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[competitor-monitor] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
