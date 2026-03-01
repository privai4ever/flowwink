/**
 * SecureHealth Template - Healthcare/Compliance
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const securehealthTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'securehealth')!;
