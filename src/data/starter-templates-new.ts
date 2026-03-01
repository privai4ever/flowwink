/**
 * Starter Templates - Hub File
 * 
 * Re-exports all templates from individual files in src/data/templates/.
 * This file maintains backward compatibility with existing imports.
 * 
 * To add a new template:
 * 1. Create a new .ts file in src/data/templates/
 * 2. Export your StarterTemplate from it
 * 3. Add it to src/data/templates/index.ts
 * 
 * See docs/TEMPLATE-AUTHORING.md for block reference.
 * See templates/README.md for contribution guidelines.
 */

// Re-export types (backward compat)
export type { 
  StarterTemplate, 
  TemplatePage, 
  TemplateBlogPost, 
  TemplateProduct, 
  HelpStyle 
} from './templates/types';

// Re-export the BLANK_TEMPLATE
export { BLANK_TEMPLATE } from './templates/blank';

// Import all templates from the registry
import { ALL_TEMPLATES } from './templates';
import type { StarterTemplate } from './templates/types';

// Main export - backward compatible
export const STARTER_TEMPLATES: StarterTemplate[] = [...ALL_TEMPLATES];

// Helper functions
export function getTemplateById(id: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: StarterTemplate['category']): StarterTemplate[] {
  return STARTER_TEMPLATES.filter(t => t.category === category);
}
