/**
 * ServicePro Template - Service Business
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const serviceProTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'service-pro')!;
