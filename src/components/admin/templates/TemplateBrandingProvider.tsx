/**
 * Lightweight branding provider for template previews.
 * Supplies branding context from template data instead of fetching from DB.
 */
import { ReactNode, createContext, useContext } from 'react';
import type { BrandingSettings } from '@/hooks/useSiteSettings';

// Mirror the same context shape as the real BrandingProvider
interface BrandingContextValue {
  branding: BrandingSettings | null;
  isLoading: boolean;
}

const TemplateBrandingContext = createContext<BrandingContextValue>({
  branding: null,
  isLoading: false,
});

// Re-export useBranding that reads from our context
// We override the module-level context by wrapping with this provider
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
    <TemplateBrandingContext.Provider value={{ branding: fullBranding, isLoading: false }}>
      {children}
    </TemplateBrandingContext.Provider>
  );
}
