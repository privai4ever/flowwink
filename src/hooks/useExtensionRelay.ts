/**
 * useExtensionRelay — Chrome Extension Relay Hook
 *
 * Enables FlowPilot's admin panel to communicate with the
 * Signal Capture Chrome Extension for browser automation.
 *
 * Like OpenClaw's Extension Relay: the agent commands the user's
 * real browser session to fetch login-walled content (LinkedIn, X, etc.)
 * without violating ToS — it's just the user browsing.
 *
 * Flow:
 * 1. Agent calls browser_fetch skill
 * 2. Edge function returns { action: 'relay_required', url }
 * 3. This hook sends navigate_and_scrape to the Chrome Extension
 * 4. Extension opens tab in user's browser, scrapes, returns content
 * 5. Hook calls browser-fetch again with relay_result
 */

import { useState, useCallback, useRef } from 'react';

const EXTENSION_PING_TIMEOUT = 2000;

// Safe accessor for chrome.runtime (only exists in Chrome with extensions)
function getChromeRuntime(): any {
  const w = window as any;
  return w?.chrome?.runtime;
}

interface RelayResult {
  success: boolean;
  title?: string;
  content?: string;
  html?: string;
  url?: string;
  error?: string;
}

interface ExtensionStatus {
  installed: boolean;
  version?: string;
  extensionId?: string;
}

export function useExtensionRelay() {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({ installed: false });
  const [isRelaying, setIsRelaying] = useState(false);
  const extensionIdRef = useRef<string | null>(null);

  const detectExtension = useCallback(async (knownExtensionId?: string): Promise<boolean> => {
    const runtime = getChromeRuntime();
    if (!runtime?.sendMessage) {
      console.log('[relay] Chrome runtime not available');
      return false;
    }

    const idsToTry = knownExtensionId ? [knownExtensionId] : [];
    const savedId = localStorage.getItem('flowwink_extension_id');
    if (savedId && !idsToTry.includes(savedId)) idsToTry.push(savedId);

    for (const id of idsToTry) {
      try {
        const result = await Promise.race([
          new Promise<any>((resolve) => {
            runtime.sendMessage(id, { type: 'ping' }, (response: any) => {
              if (runtime.lastError) resolve(null);
              else resolve(response);
            });
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), EXTENSION_PING_TIMEOUT)),
        ]);

        if (result?.installed) {
          extensionIdRef.current = id;
          setExtensionStatus({ installed: true, version: result.version, extensionId: id });
          console.log(`[relay] Extension detected: v${result.version} (${id})`);
          return true;
        }
      } catch {
        // Extension not reachable
      }
    }

    setExtensionStatus({ installed: false });
    return false;
  }, []);

  const navigateAndScrape = useCallback(async (url: string): Promise<RelayResult> => {
    const extId = extensionIdRef.current;
    const runtime = getChromeRuntime();
    if (!extId || !runtime?.sendMessage) {
      return { success: false, error: 'Extension not connected. Install the Signal Capture extension and configure the extension ID.' };
    }

    setIsRelaying(true);
    try {
      const result = await new Promise<RelayResult>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Extension relay timed out (30s)' });
        }, 30000);

        runtime.sendMessage(extId, { type: 'navigate_and_scrape', url }, (response: any) => {
          clearTimeout(timeout);
          if (runtime.lastError) {
            resolve({ success: false, error: runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'No response from extension' });
          }
        });
      });
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsRelaying(false);
    }
  }, []);

  const scrapeActiveTab = useCallback(async (): Promise<RelayResult> => {
    const extId = extensionIdRef.current;
    const runtime = getChromeRuntime();
    if (!extId || !runtime?.sendMessage) {
      return { success: false, error: 'Extension not connected' };
    }

    setIsRelaying(true);
    try {
      const result = await new Promise<RelayResult>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Scrape timed out (15s)' });
        }, 15000);

        runtime.sendMessage(extId, { type: 'scrape_active_tab' }, (response: any) => {
          clearTimeout(timeout);
          if (runtime.lastError) {
            resolve({ success: false, error: runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'No response' });
          }
        });
      });
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsRelaying(false);
    }
  }, []);

  const setExtensionId = useCallback((id: string) => {
    localStorage.setItem('flowwink_extension_id', id);
    extensionIdRef.current = id;
    detectExtension(id);
  }, [detectExtension]);

  return {
    extensionStatus,
    isRelaying,
    detectExtension,
    navigateAndScrape,
    scrapeActiveTab,
    setExtensionId,
  };
}
