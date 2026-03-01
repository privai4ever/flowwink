/**
 * FlowWink Agency Template - Agency/Consultant
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const flowwinkAgencyTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'flowwink-agency')!;
