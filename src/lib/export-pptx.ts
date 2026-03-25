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
  designSystem?: {
    primary_color?: string;
    accent_color?: string;
    font_style?: string;
    visual_theme?: string;
  },
): Promise<void> {
  // Include background images in the payload
  const slidesPayload = slides.map((s) => ({
    ...s,
    backgroundImage: s.backgroundImage || undefined,
  }));

  const res = await fetch('/api/export/pptx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: slidesPayload, title, subtitle, designSystem }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Export failed (HTTP ${res.status})`);
  }

  downloadBlob(await res.blob(), title);
}

/**
 * Export using an uploaded PPTX as the template.
 * Clones the original file and replaces placeholder text with AI-generated data.
 * Preserves all formatting, fonts, colors, images, and layouts.
 */
export async function exportFromTemplate(
  templateBase64: string,
  slides: SlideContent[],
  title: string,
  subtitle?: string,
): Promise<void> {
  const res = await fetch('/api/export/pptx-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateBase64, slides, title, subtitle }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Template export failed (HTTP ${res.status})`);
  }

  downloadBlob(await res.blob(), title);
}

function downloadBlob(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
