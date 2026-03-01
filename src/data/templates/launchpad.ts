/**
 * LaunchPad Template - Startup SaaS
 * 
 * Re-exports from the original monolith during migration.
 * TODO: Move page data inline once extraction is complete.
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const launchpadTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'launchpad')!;
