/**
 * Lightweight branding provider for template previews.
 * Supplies branding context from template data instead of fetching from DB.
 */
import { ReactNode } from 'react';
import { BrandingContext } from '@/providers/BrandingProvider';
import type { BrandingSettings } from '@/hooks/useSiteSettings';

export function TemplateBrandingProvider({ 
  branding, 
  children 
}: { 
  branding: Partial<BrandingSettings>; 
  children: ReactNode;
}) {
  const fullBranding: BrandingSettings = {
    logo: '',
    logoDark: '',
    favicon: '',
    organizationName: '',
    primaryColor: '220 100% 26%',
    secondaryColor: '210 40% 96%',
    accentColor: '199 89% 48%',
    headingFont: 'PT Serif',
    bodyFont: 'Inter',
    borderRadius: 'md',
    shadowIntensity: 'subtle',
    ...branding,
  };

  return (
    <BrandingContext.Provider value={{ branding: fullBranding, isLoading: false }}>
      {children}
    </BrandingContext.Provider>
  );
}
