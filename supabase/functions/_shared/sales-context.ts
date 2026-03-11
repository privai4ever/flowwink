import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

/**
 * Sales Intelligence Context Loader
 * 
 * Assembles a unified context string from 4 layers:
 * 1. CMS Pages (CAG) — published products/services
 * 2. Sales Intelligence Profiles — company ICP + user pitch
 * 3. Site Settings — company name, brand tone
 * 4. Agent Memory — previous research (optional)
 * 
 * Used by prospect-research, prospect-fit-analysis, and sales-profile-setup.
 */

export interface SalesContext {
  /** Formatted context string ready for AI prompts */
  formatted: string;
  /** Raw company profile data */
  companyProfile: Record<string, unknown>;
  /** Raw user profile data (if user_id provided) */
  userProfile: Record<string, unknown> | null;
  /** Site settings map */
  siteSettings: Record<string, unknown>;
  /** CMS page summaries */
  pagesSummary: string;
}

export async function loadSalesContext(options?: {
  userId?: string;
  includePages?: boolean;
  maxPageTokens?: number;
}): Promise<SalesContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const includePages = options?.includePages ?? true;
  const maxPageTokens = options?.maxPageTokens ?? 8000;

  // Parallel loads
  const [profilesRes, settingsRes, pagesRes] = await Promise.all([
    // Layer 2: Sales Intelligence Profiles
    supabase
      .from('sales_intelligence_profiles')
      .select('type, user_id, data')
      .in('type', ['company', 'user']),

    // Layer 3: Site Settings
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['company_name', 'company_profile', 'brand_tone', 'industry']),

    // Layer 1: CMS Pages (published only)
    includePages
      ? supabase
          .from('pages')
          .select('title, slug, content_json, meta_json')
          .eq('status', 'published')
          .order('menu_order')
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  // --- Process profiles ---
  const profiles = profilesRes.data || [];
  const companyProfileRow = profiles.find(p => p.type === 'company');
  const userProfileRow = options?.userId
    ? profiles.find(p => p.type === 'user' && p.user_id === options.userId)
    : null;

  const companyProfile = (companyProfileRow?.data as Record<string, unknown>) || {};
  const userProfile = (userProfileRow?.data as Record<string, unknown>) || null;

  // --- Process site settings ---
  const settingsMap: Record<string, unknown> = {};
  for (const s of (settingsRes.data || [])) {
    settingsMap[s.key] = s.value;
  }

  // --- Process CMS pages into text summaries ---
  let pagesSummary = '';
  if (includePages && pagesRes.data && pagesRes.data.length > 0) {
    const pageTexts: string[] = [];
    let totalChars = 0;

    for (const page of pagesRes.data) {
      const blocks = page.content_json as any[];
      if (!blocks || !Array.isArray(blocks)) continue;

      const textParts: string[] = [];
      for (const block of blocks) {
        if (block.type === 'text' && block.data?.content) {
          // Strip HTML tags for plain text
          const plain = (block.data.content as string).replace(/<[^>]*>/g, '').trim();
          if (plain) textParts.push(plain);
        } else if (block.type === 'hero' && block.data?.title) {
          textParts.push(block.data.title);
          if (block.data.subtitle) textParts.push(block.data.subtitle);
        } else if (block.type === 'features' && block.data?.features) {
          for (const f of block.data.features) {
            if (f.title) textParts.push(`${f.title}: ${f.description || ''}`);
          }
        }
      }

      if (textParts.length === 0) continue;

      const pageText = `### ${page.title}\n${textParts.join('\n')}`;
      totalChars += pageText.length;
      if (totalChars > maxPageTokens * 4) break; // rough char-to-token ratio
      pageTexts.push(pageText);
    }

    pagesSummary = pageTexts.join('\n\n');
  }

  // --- Build formatted context ---
  const sections: string[] = [];

  // Company identity
  const companyName = (settingsMap.company_name as string) || (companyProfile.company_name as string) || '';
  if (companyName) {
    sections.push(`## Our Company: ${companyName}`);
  }

  // Company profile (ICP, value prop, etc.)
  if (Object.keys(companyProfile).length > 0) {
    const cp = companyProfile;
    const profileParts: string[] = [];
    if (cp.value_proposition) profileParts.push(`Value Proposition: ${cp.value_proposition}`);
    if (cp.icp) profileParts.push(`Ideal Customer Profile: ${cp.icp}`);
    if (cp.differentiators) profileParts.push(`Key Differentiators: ${cp.differentiators}`);
    if (cp.competitors) profileParts.push(`Competitors: ${cp.competitors}`);
    if (cp.pricing_notes) profileParts.push(`Pricing: ${cp.pricing_notes}`);
    if (cp.industry) profileParts.push(`Industry: ${cp.industry}`);

    if (profileParts.length > 0) {
      sections.push(`## Company Profile\n${profileParts.join('\n')}`);
    }
  }

  // Fallback to old site_settings company_profile
  if (Object.keys(companyProfile).length === 0 && settingsMap.company_profile) {
    sections.push(`## Company Profile (Legacy)\n${JSON.stringify(settingsMap.company_profile, null, 2)}`);
  }

  // User profile (sender context)
  if (userProfile && Object.keys(userProfile).length > 0) {
    const up = userProfile;
    const userParts: string[] = [];
    if (up.full_name) userParts.push(`Name: ${up.full_name}`);
    if (up.title) userParts.push(`Title: ${up.title}`);
    if (up.email) userParts.push(`Email: ${up.email}`);
    if (up.personal_pitch) userParts.push(`Personal Pitch: ${up.personal_pitch}`);
    if (up.tone) userParts.push(`Preferred Tone: ${up.tone}`);
    if (up.signature) userParts.push(`Signature: ${up.signature}`);

    if (userParts.length > 0) {
      sections.push(`## Sender Profile\n${userParts.join('\n')}`);
    }
  }

  // CMS Pages
  if (pagesSummary) {
    sections.push(`## Our Products & Services (from website)\n${pagesSummary}`);
  }

  return {
    formatted: sections.join('\n\n'),
    companyProfile,
    userProfile,
    siteSettings: settingsMap,
    pagesSummary,
  };
}
