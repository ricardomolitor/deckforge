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
 *
 * Uses XMLHttpRequest with responseType='blob' to handle large files (80-120MB)
 * without running into fetch() memory issues.
 */
export async function exportFromTemplate(
  slides: SlideContent[],
  title: string,
  subtitle?: string,
  templateBase64?: string,
  category?: string,
): Promise<void> {
  const payload = JSON.stringify({
    slides,
    title,
    subtitle,
    ...(templateBase64 ? { templateBase64 } : {}),
    ...(category ? { category } : {}),
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/export/pptx-template', true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 300000; // 5 min timeout for large templates

    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = xhr.response as Blob;
        console.log(`[Export] PPTX blob received: ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
        downloadBlob(blob, title);
        resolve();
      } else {
        // Try to read error from response
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const err = JSON.parse(reader.result as string);
            reject(new Error(err.error || `Export failed (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Export failed (HTTP ${xhr.status})`));
          }
        };
        reader.onerror = () => reject(new Error(`Export failed (HTTP ${xhr.status})`));
        reader.readAsText(xhr.response);
      }
    };

    xhr.onerror = () => reject(new Error('Erro de rede ao exportar PPTX'));
    xhr.ontimeout = () => reject(new Error('Timeout: o template é muito grande. Tente novamente.'));

    xhr.send(payload);
  });
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

/**
 * Dynamic PPTX export — generates from scratch using pptxgenjs.
 * Used for "apresentacao-livre" category.
 */
export async function exportDynamic(
  slides: SlideContent[],
  title: string,
): Promise<void> {
  const payload = JSON.stringify({ slides, title, category: 'apresentacao-livre' });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/export/pptx-dynamic', true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 120000; // 2 min (dynamic is fast, no large template)

    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = xhr.response as Blob;
        console.log(`[Export Dynamic] PPTX blob: ${(blob.size / 1024).toFixed(0)}KB`);
        downloadBlob(blob, title);
        resolve();
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const err = JSON.parse(reader.result as string);
            reject(new Error(err.error || `Dynamic export failed (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Dynamic export failed (HTTP ${xhr.status})`));
          }
        };
        reader.onerror = () => reject(new Error(`Dynamic export failed (HTTP ${xhr.status})`));
        reader.readAsText(xhr.response);
      }
    };

    xhr.onerror = () => reject(new Error('Erro de rede ao exportar PPTX dinâmico'));
    xhr.ontimeout = () => reject(new Error('Timeout na geração dinâmica do PPTX'));

    xhr.send(payload);
  });
}
