// ============================================
// DeckForge — PPTX Export Client (calls server API)
// ============================================

import type { SlideContent } from './agents';

/**
 * Generate a PPTX file from DeckForge slides via server-side API
 * and trigger browser download.
 */
export async function exportToPptx(
  slides: SlideContent[],
  title: string,
  subtitle?: string,
): Promise<void> {
  // Include background images in the payload
  const slidesPayload = slides.map((s) => ({
    ...s,
    backgroundImage: s.backgroundImage || undefined,
  }));

  const res = await fetch('/api/export/pptx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: slidesPayload, title, subtitle }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Export failed (HTTP ${res.status})`);
  }

  // Download the file
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
