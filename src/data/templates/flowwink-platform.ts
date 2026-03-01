/**
 * FlowWink Platform Template - CMS Showcase (Dogfooding)
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const flowwinkPlatformTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'flowwink-platform')!;
