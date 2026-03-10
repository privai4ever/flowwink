import { useState, useCallback, useEffect } from 'react';

export interface PinnedPage {
  href: string;
  name: string;
  icon: string; // lucide icon name stored as string
}

const MAX_PINS = 8;

function getStorageKey(userId: string) {
  return `flowwink-pinned-${userId}`;
}

export function usePinnedPages(userId: string | undefined) {
  const [pins, setPins] = useState<PinnedPage[]>([]);

  // Load from localStorage on mount / userId change
  useEffect(() => {
    if (!userId) {
      setPins([]);
      return;
    }
    try {
      const stored = localStorage.getItem(getStorageKey(userId));
      if (stored) {
        setPins(JSON.parse(stored));
      }
    } catch {
      setPins([]);
    }
  }, [userId]);

  const persist = useCallback(
    (next: PinnedPage[]) => {
      if (!userId) return;
      setPins(next);
      localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
    },
    [userId],
  );

  const addPin = useCallback(
    (page: PinnedPage) => {
      setPins((prev) => {
        if (prev.length >= MAX_PINS) return prev;
        if (prev.some((p) => p.href === page.href)) return prev;
        const next = [...prev, page];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removePin = useCallback(
    (href: string) => {
      setPins((prev) => {
        const next = prev.filter((p) => p.href !== href);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isPinned = useCallback(
    (href: string) => pins.some((p) => p.href === href),
    [pins],
  );

  return { pins, addPin, removePin, isPinned };
}
