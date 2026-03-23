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
  layoutType: 'title' | 'content' | 'two-column' | 'quote' | 'data' | 'closing' | 'section-break';
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

      pptSlide.background = { color: colors.bg };

      // Accent bar
      pptSlide.addShape('rect' as any, {
        x: 0,
        y: 0,
        w: '100%',
        h: 0.06,
        fill: { color: colors.accent },
      });

      // Speaker notes
      if (slide.speakerNotes) {
        pptSlide.addNotes(slide.speakerNotes);
      }

      switch (slide.layoutType) {
        case 'title':
          renderTitleSlide(pptSlide, slide, dark);
          break;
        case 'section-break':
          renderSectionBreak(pptSlide, slide, dark);
          break;
        case 'quote':
          renderQuoteSlide(pptSlide, slide, dark);
          break;
        case 'closing':
          renderClosingSlide(pptSlide, slide, dark);
          break;
        case 'two-column':
          renderTwoColumnSlide(pptSlide, slide, dark);
          break;
        default:
          renderContentSlide(pptSlide, slide, dark);
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
    fontSize: 22, bold: true, color: BRAND.dark, fontFace: 'Segoe UI',
  });

  if (slide.subtitle) {
    pptSlide.addText(slide.subtitle, {
      x: 0.6, y: 0.9, w: '90%', h: 0.5,
      fontSize: 14, color: BRAND.gray, fontFace: 'Segoe UI',
    });
  }

  if (slide.bullets.length > 0) {
    const startY = slide.subtitle ? 1.5 : 1.2;
    const bulletTexts = slide.bullets.map((b) => ({
      text: b,
      options: {
        fontSize: 15, color: BRAND.dark, fontFace: 'Segoe UI',
        bullet: { code: '25CF', color: BRAND.purple },
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
    fontSize: 22, bold: true, color: BRAND.dark, fontFace: 'Segoe UI',
  });

  const mid = Math.ceil(slide.bullets.length / 2);
  const leftBullets = slide.bullets.slice(0, mid);
  const rightBullets = slide.bullets.slice(mid);

  const bulletOpts = (b: string) => ({
    text: b,
    options: {
      fontSize: 14, color: BRAND.dark, fontFace: 'Segoe UI',
      bullet: { code: '25CF', color: BRAND.purple },
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
    fill: { color: BRAND.purpleLight },
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
    fontSize: 22, italic: true, color: BRAND.dark,
    fontFace: 'Georgia', align: 'left', valign: 'middle',
  });

  if (slide.subtitle) {
    pptSlide.addText(`— ${slide.subtitle}`, {
      x: 1.2, y: 3.9, w: '75%', h: 0.5,
      fontSize: 14, color: BRAND.gray, fontFace: 'Segoe UI',
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
