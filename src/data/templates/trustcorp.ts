/**
 * TrustCorp Template - Enterprise
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const trustcorpTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'trustcorp')!;
