// ============================================
// DeckForge — PPTX Export API Route (server-side)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

interface SlideInput {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes: string;
  visualSuggestion: string;
  layoutType: 'title' | 'content' | 'two-column' | 'quote' | 'data' | 'closing' | 'section-break' | 'exec-report';
  /** Base64 data URL for background image */
  backgroundImage?: string;
  /** Structured data for exec-report layout */
  execData?: {
    problema: string;
    hipotese: string;
    solucao: string;
    resultadoTangivel: string;
    resultadoIntangivel: string;
    objetivo: string;
    investimentoTotal: string;
    vpl: string;
    roiAcumulado: string;
    tir: string;
    paybackSimples: string;
    paybackDescontado: string;
    aumentoReceita: string;
    reducaoCusto: string;
    eficienciaOperacional: string;
  };
}

// --- Brand colors ---
const BRAND = {
  purple: '7C3AED',
  purpleLight: 'EDE9FE',
  dark: '1E1B4B',
  gray: '6B7280',
  white: 'FFFFFF',
  accent: 'A78BFA',
};

const LAYOUT_COLORS: Record<string, { bg: string; accent: string }> = {
  title: { bg: '1E1B4B', accent: '7C3AED' },
  'section-break': { bg: '312E81', accent: 'A78BFA' },
  content: { bg: 'FFFFFF', accent: '7C3AED' },
  'two-column': { bg: 'FFFFFF', accent: '7C3AED' },
  quote: { bg: 'F5F3FF', accent: '7C3AED' },
  data: { bg: 'FFFFFF', accent: '4F46E5' },
  closing: { bg: '1E1B4B', accent: 'A78BFA' },
  'exec-report': { bg: 'FFFFFF', accent: 'F97316' },
};

// Avanade brand colors for exec-report
const AVA = {
  orange: 'F97316',
  orangeLight: 'FFF7ED',
  orangeDark: 'EA580C',
  dark: '1F2937',
  gray: '6B7280',
  grayLight: 'D1D5DB',
  white: 'FFFFFF',
};

function isDark(layoutType: string): boolean {
  return ['title', 'section-break', 'closing'].includes(layoutType);
}

export async function POST(req: NextRequest) {
  try {
    const { slides, title, subtitle } = (await req.json()) as {
      slides: SlideInput[];
      title: string;
      subtitle?: string;
    };

    if (!slides?.length || !title) {
      return NextResponse.json({ error: 'slides and title are required' }, { status: 400 });
    }

    const pptx = new PptxGenJS();
    pptx.author = 'DeckForge AI';
    pptx.company = 'DeckForge';
    pptx.title = title;
    pptx.subject = subtitle || 'Apresentação gerada por IA';
    pptx.layout = 'LAYOUT_WIDE';

    for (const slide of slides) {
      const pptSlide = pptx.addSlide();
      const colors = LAYOUT_COLORS[slide.layoutType] || LAYOUT_COLORS.content;
      const dark = isDark(slide.layoutType);

      // Background: use reference image if available, otherwise solid color
      if (slide.backgroundImage) {
        try {
          // Use image as full-slide background
          pptSlide.background = { data: slide.backgroundImage };

          // Add dark overlay for text readability
          pptSlide.addShape('rect' as any, {
            x: 0, y: 0, w: '100%', h: '100%',
            fill: { color: '000000', transparency: 50 },
          });
        } catch {
          // Fallback to solid color if image fails
          pptSlide.background = { color: colors.bg };
        }
      } else {
        pptSlide.background = { color: colors.bg };
      }

      // Accent bar (thinner when image is present)
      pptSlide.addShape('rect' as any, {
        x: 0,
        y: 0,
        w: '100%',
        h: slide.backgroundImage ? 0.04 : 0.06,
        fill: { color: colors.accent },
      });

      // Speaker notes
      if (slide.speakerNotes) {
        pptSlide.addNotes(slide.speakerNotes);
      }

      // Force white text when background image is present
      const forceDark = !!slide.backgroundImage || dark;

      switch (slide.layoutType) {
        case 'title':
          renderTitleSlide(pptSlide, slide, forceDark);
          break;
        case 'section-break':
          renderSectionBreak(pptSlide, slide, forceDark);
          break;
        case 'quote':
          renderQuoteSlide(pptSlide, slide, forceDark);
          break;
        case 'closing':
          renderClosingSlide(pptSlide, slide, forceDark);
          break;
        case 'two-column':
          renderTwoColumnSlide(pptSlide, slide, forceDark);
          break;
        case 'exec-report':
          renderExecReportSlide(pptSlide, slide);
          break;
        default:
          renderContentSlide(pptSlide, slide, forceDark);
          break;
      }
    }

    // Generate as base64 string
    const data = await pptx.write({ outputType: 'base64' });

    // Return as binary download
    const buffer = Buffer.from(data as string, 'base64');
    const fileName = title.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}.pptx"`,
      },
    });
  } catch (err: any) {
    console.error('[PPTX Export] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PPTX' }, { status: 500 });
  }
}

// --- Slide Renderers ---

function renderTitleSlide(pptSlide: any, slide: SlideInput, dark: boolean) {
  pptSlide.addText(slide.title, {
    x: 0.8, y: 1.5, w: '85%', h: 1.8,
    fontSize: 36, bold: true,
    color: dark ? BRAND.white : BRAND.dark,
    fontFace: 'Segoe UI', align: 'left', valign: 'bottom',
  });

  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 0.8, y: 3.4, w: '85%', h: 0.8,
      fontSize: 18, color: dark ? BRAND.accent : BRAND.gray,
      fontFace: 'Segoe UI', align: 'left',
    });
  }

  // Decorative line
  pptSlide.addShape('rect' as any, {
    x: 0.8, y: 3.2, w: 1.5, h: 0.04,
    fill: { color: BRAND.accent },
  });
}

function renderSectionBreak(pptSlide: any, slide: SlideInput, dark: boolean) {
  pptSlide.addText(slide.title, {
    x: 1, y: 2, w: '80%', h: 1.5,
    fontSize: 30, bold: true,
    color: dark ? BRAND.white : BRAND.dark,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle',
  });

  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 1, y: 3.5, w: '80%', h: 0.7,
      fontSize: 16, color: dark ? BRAND.accent : BRAND.gray,
      fontFace: 'Segoe UI', align: 'center',
    });
  }
}

function renderContentSlide(pptSlide: any, slide: SlideInput, dark: boolean) {
  pptSlide.addText(slide.title, {
    x: 0.6, y: 0.3, w: '90%', h: 0.7,
    fontSize: 22, bold: true, color: dark ? BRAND.white : BRAND.dark, fontFace: 'Segoe UI',
  });

  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 0.6, y: 0.9, w: '90%', h: 0.5,
      fontSize: 14, color: dark ? BRAND.accent : BRAND.gray, fontFace: 'Segoe UI',
    });
  }

  if (slide.bullets.length > 0) {
    const startY = slide.subtitle ? 1.5 : 1.2;
    const bulletTexts = slide.bullets.map((b) => ({
      text: b,
      options: {
        fontSize: 15, color: dark ? BRAND.white : BRAND.dark, fontFace: 'Segoe UI',
        bullet: { code: '25CF', color: dark ? BRAND.accent : BRAND.purple },
        paraSpaceAfter: 8, lineSpacing: 22,
      },
    }));

    pptSlide.addText(bulletTexts, {
      x: 0.8, y: startY, w: '85%', h: 4.0, valign: 'top',
    });
  }

  if (slide.visualSuggestion) {
    pptSlide.addText(`💡 ${slide.visualSuggestion}`, {
      x: 5, y: 5.0, w: 4.8, h: 0.4,
      fontSize: 8, italic: true, color: 'B0B0B0',
      fontFace: 'Segoe UI', align: 'right',
    });
  }
}

function renderTwoColumnSlide(pptSlide: any, slide: SlideInput, dark: boolean) {
  pptSlide.addText(slide.title, {
    x: 0.6, y: 0.3, w: '90%', h: 0.7,
    fontSize: 22, bold: true, color: dark ? BRAND.white : BRAND.dark, fontFace: 'Segoe UI',
  });

  const mid = Math.ceil(slide.bullets.length / 2);
  const leftBullets = slide.bullets.slice(0, mid);
  const rightBullets = slide.bullets.slice(mid);

  const bulletOpts = (b: string) => ({
    text: b,
    options: {
      fontSize: 14, color: dark ? BRAND.white : BRAND.dark, fontFace: 'Segoe UI',
      bullet: { code: '25CF', color: dark ? BRAND.accent : BRAND.purple },
      paraSpaceAfter: 6, lineSpacing: 20,
    },
  });

  if (leftBullets.length > 0) {
    pptSlide.addText(leftBullets.map(bulletOpts), {
      x: 0.6, y: 1.2, w: 4.5, h: 4.2, valign: 'top',
    });
  }

  if (rightBullets.length > 0) {
    pptSlide.addText(rightBullets.map(bulletOpts), {
      x: 5.4, y: 1.2, w: 4.5, h: 4.2, valign: 'top',
    });
  }

  // Vertical divider
  pptSlide.addShape('rect' as any, {
    x: 5.1, y: 1.3, w: 0.02, h: 3.8,
    fill: { color: dark ? BRAND.accent : BRAND.purpleLight },
  });
}

function renderQuoteSlide(pptSlide: any, slide: SlideInput, dark: boolean) {
  pptSlide.addText('"', {
    x: 0.6, y: 0.8, w: 1, h: 1.2,
    fontSize: 72, color: BRAND.accent, fontFace: 'Georgia', bold: true,
  });

  const quoteText = slide.bullets[0] || slide.title;
  pptSlide.addText(quoteText, {
    x: 1.2, y: 1.8, w: '75%', h: 2.0,
    fontSize: 22, italic: true, color: dark ? BRAND.white : BRAND.dark,
    fontFace: 'Georgia', align: 'left', valign: 'middle',
  });

  if (slide.subtitle) {
    pptSlide.addText(`— ${slide.subtitle}`, {
      x: 1.2, y: 3.9, w: '75%', h: 0.5,
      fontSize: 14, color: dark ? BRAND.accent : BRAND.gray, fontFace: 'Segoe UI',
    });
  }
}

function renderClosingSlide(pptSlide: any, slide: SlideInput, dark: boolean) {
  pptSlide.addText(slide.title, {
    x: 1, y: 1.8, w: '80%', h: 1.2,
    fontSize: 32, bold: true, color: BRAND.white,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle',
  });

  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 1, y: 3.2, w: '80%', h: 0.6,
      fontSize: 16, color: BRAND.accent,
      fontFace: 'Segoe UI', align: 'center',
    });
  }

  if (slide.bullets.length > 0) {
    const bulletTexts = slide.bullets.map((b) => ({
      text: b,
      options: {
        fontSize: 14, color: BRAND.white, fontFace: 'Segoe UI',
        bullet: { code: '2713', color: BRAND.accent },
        paraSpaceAfter: 6,
      },
    }));

    pptSlide.addText(bulletTexts, {
      x: 2, y: 4.0, w: '60%', h: 1.5,
      align: 'center', valign: 'top',
    });
  }

  pptSlide.addText('Gerado com DeckForge AI', {
    x: 0, y: 5.2, w: '100%', h: 0.3,
    fontSize: 8, color: '6366F1', fontFace: 'Segoe UI', align: 'center',
  });
}

// --- Exec Report Slide (Avanade IT Forum pattern) ---

function renderExecReportSlide(pptSlide: any, slide: SlideInput) {
  const d = slide.execData;
  if (!d) {
    // Fallback to content slide if no exec data
    renderContentSlide(pptSlide, slide, false);
    return;
  }

  // Override background to white
  pptSlide.background = { color: AVA.white };

  // Orange accent bar at top (Avanade brand)
  pptSlide.addShape('rect' as any, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: AVA.orange },
  });

  // === LEFT SIDE (x: 0.3 to 5.0) ===

  // Problem title
  pptSlide.addText(d.problema || slide.title, {
    x: 0.3, y: 0.2, w: 4.5, h: 0.6,
    fontSize: 22, bold: true, color: AVA.dark,
    fontFace: 'Segoe UI', valign: 'top',
  });

  // Hypothesis
  pptSlide.addText(`Hipótese testada: ${d.hipotese}`, {
    x: 0.3, y: 0.75, w: 4.5, h: 0.3,
    fontSize: 10, color: AVA.gray, italic: true,
    fontFace: 'Segoe UI',
  });

  // Solution box (orange gradient background)
  pptSlide.addShape('roundRect' as any, {
    x: 0.3, y: 1.2, w: 4.0, h: 2.4,
    fill: { color: AVA.orange },
    rectRadius: 0.1,
  });

  pptSlide.addText('Solução', {
    x: 0.5, y: 1.3, w: 3.6, h: 0.35,
    fontSize: 14, bold: true, color: AVA.white,
    fontFace: 'Segoe UI',
  });

  pptSlide.addText(d.solucao, {
    x: 0.5, y: 1.65, w: 3.6, h: 0.5,
    fontSize: 10, color: AVA.white,
    fontFace: 'Segoe UI',
  });

  // Solution bullets (tangible + intangible results)
  const solutionBullets = [
    { text: d.resultadoTangivel, options: { fontSize: 9, color: AVA.white, fontFace: 'Segoe UI', bullet: { code: '25CF', color: AVA.white }, paraSpaceAfter: 4 } },
    { text: d.resultadoIntangivel, options: { fontSize: 9, color: AVA.white, fontFace: 'Segoe UI', bullet: { code: '25CF', color: AVA.white }, paraSpaceAfter: 4 } },
  ];
  pptSlide.addText(solutionBullets, {
    x: 0.5, y: 2.2, w: 3.6, h: 1.2, valign: 'top',
  });

  // Objective box (dashed border)
  pptSlide.addShape('roundRect' as any, {
    x: 0.3, y: 3.8, w: 4.0, h: 0.8,
    fill: { color: AVA.white },
    line: { color: AVA.grayLight, dashType: 'dash', width: 1 },
    rectRadius: 0.05,
  });

  pptSlide.addText(d.objetivo, {
    x: 0.5, y: 3.9, w: 3.6, h: 0.6,
    fontSize: 10, color: AVA.gray,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle',
  });

  // === RIGHT SIDE (x: 5.0 to 9.7) ===

  // Impact potential label
  pptSlide.addText('Potencial de impacto', {
    x: 5.2, y: 0.2, w: 4.3, h: 0.3,
    fontSize: 9, bold: true, color: AVA.gray,
    fontFace: 'Segoe UI', italic: true, align: 'right',
  });

  // Impact bars
  const impactItems = [
    { label: 'Aumento receita', value: d.aumentoReceita },
    { label: 'Redução de custo', value: d.reducaoCusto },
    { label: 'Eficiência operacional', value: d.eficienciaOperacional },
  ];

  impactItems.forEach((item, idx) => {
    const y = 0.55 + idx * 0.28;
    // Label
    pptSlide.addText(item.label, {
      x: 5.2, y, w: 2.0, h: 0.25,
      fontSize: 8, color: AVA.orange, bold: true,
      fontFace: 'Segoe UI',
    });
    // Bar background
    pptSlide.addShape('rect' as any, {
      x: 7.2, y: y + 0.04, w: 2.0, h: 0.15,
      fill: { color: 'E5E7EB' },
    });
    // Bar fill (parse percentage)
    const pct = parseFloat(item.value) || 0;
    const barW = Math.min(2.0, (pct / 100) * 2.0);
    if (barW > 0) {
      pptSlide.addShape('rect' as any, {
        x: 7.2, y: y + 0.04, w: barW, h: 0.15,
        fill: { color: AVA.orange },
      });
    }
    // Value
    pptSlide.addText(item.value, {
      x: 9.2, y, w: 0.6, h: 0.25,
      fontSize: 9, bold: true, color: AVA.orange,
      fontFace: 'Segoe UI', align: 'right',
    });
  });

  // "CENÁRIO APRESENTADO" banner
  pptSlide.addShape('roundRect' as any, {
    x: 5.8, y: 1.5, w: 3.4, h: 0.35,
    fill: { color: AVA.orange },
    rectRadius: 0.05,
  });
  pptSlide.addText('CENÁRIO APRESENTADO', {
    x: 5.8, y: 1.5, w: 3.4, h: 0.35,
    fontSize: 10, bold: true, color: AVA.white,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle',
  });

  // Financial metrics grid (2x3)
  const metrics = [
    { label: 'Investimento total\n(CAPEX+OPEX)', value: d.investimentoTotal },
    { label: 'VPL\n(a 10% a.a.)', value: d.vpl },
    { label: 'ROI acumulado\n5 anos', value: d.roiAcumulado },
    { label: 'TIR', value: d.tir },
    { label: 'Payback\nSimples', value: d.paybackSimples },
    { label: 'Payback descontado\n(10%a.a)', value: d.paybackDescontado },
  ];

  metrics.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const mx = 5.4 + col * 2.2;
    const my = 2.0 + row * 1.0;

    // Metric box border
    pptSlide.addShape('roundRect' as any, {
      x: mx, y: my, w: 2.0, h: 0.9,
      fill: { color: AVA.white },
      line: { color: 'E5E7EB', width: 0.5 },
      rectRadius: 0.05,
    });

    // Label
    pptSlide.addText(m.label, {
      x: mx + 0.1, y: my + 0.05, w: 1.8, h: 0.35,
      fontSize: 7, color: AVA.gray,
      fontFace: 'Segoe UI', align: 'center', valign: 'top',
    });

    // Value
    pptSlide.addText(m.value, {
      x: mx + 0.1, y: my + 0.35, w: 1.8, h: 0.5,
      fontSize: 14, bold: true, color: AVA.orange,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle',
    });
  });

  // Avanade footer
  pptSlide.addText('avanade', {
    x: 0.3, y: 5.15, w: 1.5, h: 0.25,
    fontSize: 9, bold: true, color: '16A34A',
    fontFace: 'Segoe UI',
  });
  pptSlide.addText('©2026 Avanade Inc. All Rights Reserved.', {
    x: 3.0, y: 5.15, w: 4.0, h: 0.25,
    fontSize: 7, color: AVA.grayLight,
    fontFace: 'Segoe UI', align: 'center',
  });
  pptSlide.addText('Do what matters', {
    x: 7.5, y: 5.15, w: 2.3, h: 0.25,
    fontSize: 9, bold: true, color: AVA.dark,
    fontFace: 'Segoe UI', align: 'right',
  });
}
