/**
 * Momentum Template - Single-page YC-style
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const momentumTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'momentum')!;
