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
 * Export using the built-in Avanade PPTX template.
 * Clones selected slides from the catalog and replaces placeholder text.
 * Preserves all formatting, fonts, colors, images, and layouts.
 * For 'relatorio-executivo' category, uses the specialized exec report template.
 */
export async function exportFromTemplate(
  slides: SlideContent[],
  title: string,
  subtitle?: string,
  templateBase64?: string,
  category?: string,
): Promise<void> {
  const res = await fetch('/api/export/pptx-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slides,
      title,
      subtitle,
      ...(templateBase64 ? { templateBase64 } : {}),
      ...(category ? { category } : {}),
    }),
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
