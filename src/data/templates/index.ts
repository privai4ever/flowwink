/**
 * Template Registry
 * 
 * Aggregates all starter templates from individual files.
 * Each template lives in its own file for easier maintenance and contribution.
 * 
 * ## Adding a New Template
 * 
 * 1. Create a new `.ts` file in this directory (e.g. `my-template.ts`)
 * 2. Export a `StarterTemplate` object from it  
 * 3. Import and add it to `ALL_TEMPLATES` below
 * 4. Run `bun run test` to validate
 * 
 * See docs/TEMPLATE-AUTHORING.md for the full block reference.
 * See templates/README.md for contribution guidelines.
 */

// Re-export types for convenience
export type { StarterTemplate, TemplatePage, TemplateBlogPost, TemplateProduct, HelpStyle } from './types';

// Individual template re-exports
export { launchpadTemplate } from './launchpad';
export { momentumTemplate } from './momentum';
export { trustcorpTemplate } from './trustcorp';
export { securehealthTemplate } from './securehealth';
export { flowwinkPlatformTemplate } from './flowwink-platform';
export { helpCenterTemplate } from './helpcenter';
export { serviceProTemplate } from './service-pro';
export { digitalShopTemplate } from './digital-shop';
export { flowwinkAgencyTemplate } from './flowwink-agency';
export { BLANK_TEMPLATE } from './blank';

// Import for aggregation
import { launchpadTemplate } from './launchpad';
import { momentumTemplate } from './momentum';
import { trustcorpTemplate } from './trustcorp';
import { securehealthTemplate } from './securehealth';
import { flowwinkPlatformTemplate } from './flowwink-platform';
import { helpCenterTemplate } from './helpcenter';
import { serviceProTemplate } from './service-pro';
import { digitalShopTemplate } from './digital-shop';
import { flowwinkAgencyTemplate } from './flowwink-agency';

import type { StarterTemplate } from './types';

/**
 * All available starter templates in display order.
 */
export const ALL_TEMPLATES: StarterTemplate[] = [
  launchpadTemplate,
  momentumTemplate,
  trustcorpTemplate,
  securehealthTemplate,
  flowwinkPlatformTemplate,
  helpCenterTemplate,
  serviceProTemplate,
  digitalShopTemplate,
  flowwinkAgencyTemplate,
];
