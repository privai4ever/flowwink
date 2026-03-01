/**
 * Digital Shop Template - E-commerce
 */
import { STARTER_TEMPLATES } from '@/data/starter-templates';
import type { StarterTemplate } from './types';

export const digitalShopTemplate: StarterTemplate = STARTER_TEMPLATES.find(t => t.id === 'digital-shop')!;
