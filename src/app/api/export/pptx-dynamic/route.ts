// ============================================
// DeckForge — Dynamic PPTX Generation Engine
// Generates presentations FROM SCRATCH using pptxgenjs
// Supports: charts, tables, multi-layout slides, Avanade branding
// Used for category: "apresentacao-livre"
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

// pptxgenjs types don't expose .shapes and .charts on instance — use any for those
type PptxInstance = PptxGenJS & { shapes: Record<string, any>; charts: Record<string, any> };

// --- Avanade Brand Colors ---
const BRAND = {
  orange: 'FF5800',
  deepBlack: '08080B',
  white: 'FFFFFF',
  gray100: 'F5F5F5',
  gray200: 'E5E5E5',
  gray500: '6B7280',
  gray700: '374151',
  gray900: '111827',
  magenta: 'CE0569',
  blue: '00B0F0',
  green: '28A745',
  darkBg: '1A1A2E',
  cardBg: '16213E',
};

// --- Types from the agent output ---
interface ChartDataInput {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'stacked-bar' | 'radar';
  title?: string;
  categories: string[];
  series: { name: string; values: number[]; color?: string }[];
  showLegend?: boolean;
  showValues?: boolean;
}

interface TableDataInput {
  headers: string[];
  rows: string[][];
  headerColor?: string;
  alternateRowColor?: string;
  fontSize?: number;
}

interface DynamicSlide {
  order: number;
  layoutHint: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  speakerNotes?: string;
  chartData?: ChartDataInput | null;
  tableData?: TableDataInput | null;
  accentColor?: string;
  duration?: number;
  fields?: Record<string, string>;
}

interface DynamicExportRequest {
  slides: DynamicSlide[];
  title: string;
  category: string;
}

// --- Helpers ---

function hexToRgb(hex: string): string {
  return hex.replace('#', '').toUpperCase();
}

function getAccent(slide: DynamicSlide): string {
  return slide.accentColor ? hexToRgb(slide.accentColor) : BRAND.orange;
}

// Map pptxgenjs chart types — use runtime lookup since types don't expose .charts
function mapChartType(pptx: any, type: string): any {
  const charts = pptx.charts || {};
  const map: Record<string, any> = {
    'bar': charts.BAR || 'bar',
    'stacked-bar': charts.BAR || 'bar',
    'line': charts.LINE || 'line',
    'area': charts.AREA || 'area',
    'pie': charts.PIE || 'pie',
    'donut': charts.DOUGHNUT || 'doughnut',
    'radar': charts.RADAR || 'radar',
  };
  return map[type] || charts.BAR || 'bar';
}

// --- Slide Generators ---

function addTitleSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  // Dark gradient background
  s.background = { fill: BRAND.deepBlack };

  // Accent bar at top
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: accent },
  });

  // Title
  s.addText(slide.title || 'Apresentação', {
    x: 0.8, y: 1.8, w: 8.4, h: 1.5,
    fontSize: 36, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
    align: 'left', valign: 'bottom',
  });

  // Subtitle
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.8, y: 3.4, w: 8.4, h: 0.8,
      fontSize: 18, fontFace: 'Segoe UI',
      color: BRAND.gray500, bold: false,
      align: 'left', valign: 'top',
    });
  }

  // Accent line under title
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 3.25, w: 2, h: 0.04,
    fill: { color: accent },
  });

  // Footer: DeckForge branding
  s.addText('Powered by DeckForge AI', {
    x: 0.8, y: 4.8, w: 4, h: 0.3,
    fontSize: 9, fontFace: 'Segoe UI',
    color: BRAND.gray500, italic: true,
  });

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addSectionHeader(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  // Large centered title
  s.addText(slide.title || '', {
    x: 1, y: 1.5, w: 8, h: 2,
    fontSize: 32, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
    align: 'center', valign: 'middle',
  });

  // Accent line
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 3.5, y: 3.6, w: 3, h: 0.04,
    fill: { color: accent },
  });

  // Subtitle
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 1.5, y: 3.8, w: 7, h: 0.6,
      fontSize: 16, fontFace: 'Segoe UI',
      color: BRAND.gray500, align: 'center',
    });
  }

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addContentSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  // Title bar
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.6, y: 0.9, w: 8.8, h: 0.4,
      fontSize: 13, fontFace: 'Segoe UI',
      color: BRAND.gray500,
    });
  }

  // Bullets
  const bullets = slide.bullets || [];
  if (bullets.length > 0) {
    const bulletObjects = bullets.map((b) => ({
      text: b,
      options: {
        fontSize: 14,
        fontFace: 'Segoe UI',
        color: BRAND.gray200,
        bullet: { code: '25CF', color: accent } as any,
        paraSpaceAfter: 8,
      },
    }));

    s.addText(bulletObjects as any, {
      x: 0.8, y: 1.5, w: 8.4, h: 3.2,
      valign: 'top',
    });
  }

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addTwoColumnSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  const bullets = slide.bullets || [];
  const mid = Math.ceil(bullets.length / 2);
  const leftBullets = bullets.slice(0, mid);
  const rightBullets = bullets.slice(mid);

  // Left column
  if (leftBullets.length > 0) {
    const leftItems = leftBullets.map((b) => ({
      text: b,
      options: {
        fontSize: 13, fontFace: 'Segoe UI', color: BRAND.gray200,
        bullet: { code: '25CF', color: accent } as any,
        paraSpaceAfter: 6,
      },
    }));
    s.addText(leftItems as any, { x: 0.6, y: 1.3, w: 4.3, h: 3.2, valign: 'top' });
  }

  // Right column
  if (rightBullets.length > 0) {
    const rightItems = rightBullets.map((b) => ({
      text: b,
      options: {
        fontSize: 13, fontFace: 'Segoe UI', color: BRAND.gray200,
        bullet: { code: '25CF', color: accent } as any,
        paraSpaceAfter: 6,
      },
    }));
    s.addText(rightItems as any, { x: 5.2, y: 1.3, w: 4.3, h: 3.2, valign: 'top' });
  }

  // Vertical divider
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 4.95, y: 1.4, w: 0.02, h: 2.8,
    fill: { color: BRAND.gray700 },
  });

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addChartSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);
  const cd = slide.chartData;

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  if (cd && cd.categories && cd.series) {
    const chartType = mapChartType(pptx, cd.type);
    const defaultColors = [BRAND.orange, BRAND.blue, BRAND.green, BRAND.magenta, 'FFD700', '9B59B6'];

    const chartData = cd.series.map((ser, i) => ({
      name: ser.name,
      labels: cd.categories,
      values: ser.values.map(v => typeof v === 'number' ? v : parseFloat(String(v)) || 0),
    }));

    const chartColors = cd.series.map((ser, i) =>
      ser.color ? hexToRgb(ser.color) : defaultColors[i % defaultColors.length]
    );

    const chartOpts: any = {
      x: 0.6, y: 1.2, w: 8.8, h: 3.8,
      showTitle: !!cd.title,
      title: cd.title || '',
      titleColor: BRAND.gray200,
      titleFontSize: 11,
      showLegend: cd.showLegend !== false,
      legendPos: 'b',
      legendColor: BRAND.gray500,
      legendFontSize: 9,
      showValue: cd.showValues || false,
      dataLabelColor: BRAND.gray200,
      dataLabelFontSize: 9,
      chartColors,
      catAxisLabelColor: BRAND.gray500,
      valAxisLabelColor: BRAND.gray500,
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      catGridLine: { style: 'none' },
      valGridLine: { color: '333333', style: 'dash' },
      plotArea: { fill: { color: BRAND.deepBlack } },
    };

    // Stacked bar
    if (cd.type === 'stacked-bar') {
      chartOpts.barGrouping = 'stacked';
    }

    // Donut hole
    if (cd.type === 'donut') {
      chartOpts.holeSize = 50;
    }

    try {
      s.addChart(chartType, chartData, chartOpts);
    } catch (e) {
      console.error('[DynamicPPTX] Chart error:', e);
      s.addText('⚠️ Erro ao gerar gráfico', {
        x: 2, y: 2.5, w: 6, h: 1,
        fontSize: 16, color: BRAND.orange, align: 'center',
      });
    }
  }

  // Optional insight bullet below chart
  if (slide.bullets && slide.bullets.length > 0) {
    s.addText(slide.bullets[0], {
      x: 0.6, y: 4.7, w: 8.8, h: 0.4,
      fontSize: 11, fontFace: 'Segoe UI',
      color: BRAND.gray500, italic: true,
    });
  }

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addTableSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);
  const td = slide.tableData;

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  if (td && td.headers && td.rows) {
    const headerColor = td.headerColor ? hexToRgb(td.headerColor) : accent;
    const fontSize = td.fontSize || 11;

    const headerRow = td.headers.map((h) => ({
      text: h,
      options: {
        fontSize: fontSize + 1,
        fontFace: 'Segoe UI',
        color: BRAND.white,
        bold: true,
        fill: { color: headerColor },
        align: 'left' as const,
        valign: 'middle' as const,
        border: [
          { type: 'solid' as const, pt: 0.5, color: '333333' },
          { type: 'solid' as const, pt: 0.5, color: '333333' },
          { type: 'solid' as const, pt: 0.5, color: '333333' },
          { type: 'solid' as const, pt: 0.5, color: '333333' },
        ],
      },
    }));

    const dataRows = td.rows.map((row, rowIdx) => {
      const bgColor = rowIdx % 2 === 0 ? '1C1C2E' : '222240';
      return row.map((cell) => ({
        text: cell,
        options: {
          fontSize,
          fontFace: 'Segoe UI',
          color: BRAND.gray200,
          fill: { color: td.alternateRowColor ? hexToRgb(td.alternateRowColor) : bgColor },
          align: 'left' as const,
          valign: 'middle' as const,
          border: [
            { type: 'solid' as const, pt: 0.5, color: '333333' },
            { type: 'solid' as const, pt: 0.5, color: '333333' },
            { type: 'solid' as const, pt: 0.5, color: '333333' },
            { type: 'solid' as const, pt: 0.5, color: '333333' },
          ],
        },
      }));
    });

    const tableRows = [headerRow, ...dataRows];
    const colW = 8.8 / td.headers.length;

    try {
      s.addTable(tableRows as any, {
        x: 0.6, y: 1.2, w: 8.8,
        colW: Array(td.headers.length).fill(colW),
        rowH: 0.35,
        autoPage: false,
      });
    } catch (e) {
      console.error('[DynamicPPTX] Table error:', e);
    }
  }

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addChartAndTextSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);
  const cd = slide.chartData;

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  // Chart on left (60%)
  if (cd && cd.categories && cd.series) {
    const chartType = mapChartType(pptx, cd.type);
    const defaultColors = [BRAND.orange, BRAND.blue, BRAND.green, BRAND.magenta];
    const chartData = cd.series.map((ser) => ({
      name: ser.name,
      labels: cd.categories,
      values: ser.values.map(v => typeof v === 'number' ? v : parseFloat(String(v)) || 0),
    }));
    const chartColors = cd.series.map((ser, i) =>
      ser.color ? hexToRgb(ser.color) : defaultColors[i % defaultColors.length]
    );
    try {
      s.addChart(chartType, chartData, {
        x: 0.4, y: 1.2, w: 5.6, h: 3.6,
        showLegend: cd.showLegend !== false,
        legendPos: 'b',
        legendColor: BRAND.gray500,
        chartColors,
        catAxisLabelColor: BRAND.gray500,
        valAxisLabelColor: BRAND.gray500,
        catGridLine: { style: 'none' },
        valGridLine: { color: '333333', style: 'dash' },
      });
    } catch (e) {
      console.error('[DynamicPPTX] Chart-and-text chart error:', e);
    }
  }

  // Text on right (40%)
  const bullets = slide.bullets || [];
  if (bullets.length > 0) {
    const items = bullets.map((b) => ({
      text: b,
      options: {
        fontSize: 12, fontFace: 'Segoe UI', color: BRAND.gray200,
        bullet: { code: '25CF', color: accent } as any,
        paraSpaceAfter: 6,
      },
    }));
    s.addText(items as any, { x: 6.2, y: 1.3, w: 3.4, h: 3.4, valign: 'top' });
  }

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addKPIDashboard(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || 'KPIs', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  // Use bullets as KPI entries: "R$ 2.5M|Receita Anual|+15% YoY"
  const kpis = (slide.bullets || []).map((b) => {
    const parts = b.split('|').map(p => p.trim());
    return { value: parts[0] || '', label: parts[1] || '', detail: parts[2] || '' };
  });

  const count = Math.min(kpis.length, 6);
  const cols = count <= 3 ? count : Math.ceil(count / 2);
  const rows = count <= 3 ? 1 : 2;
  const cardW = 8.4 / cols;
  const cardH = rows === 1 ? 2.8 : 1.5;
  const startY = rows === 1 ? 1.5 : 1.3;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.8 + col * cardW;
    const y = startY + row * (cardH + 0.3);

    // Card background
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y, w: cardW - 0.2, h: cardH,
      fill: { color: BRAND.cardBg },
      rectRadius: 0.1,
    });

    // Value
    s.addText(kpi.value, {
      x, y: y + (cardH * 0.1), w: cardW - 0.2, h: cardH * 0.45,
      fontSize: rows === 1 ? 28 : 22, fontFace: 'Segoe UI',
      color: accent, bold: true, align: 'center', valign: 'bottom',
    });

    // Label
    s.addText(kpi.label, {
      x, y: y + (cardH * 0.55), w: cardW - 0.2, h: cardH * 0.25,
      fontSize: 11, fontFace: 'Segoe UI',
      color: BRAND.gray200, align: 'center', valign: 'top',
    });

    // Detail
    if (kpi.detail) {
      s.addText(kpi.detail, {
        x, y: y + (cardH * 0.75), w: cardW - 0.2, h: cardH * 0.2,
        fontSize: 9, fontFace: 'Segoe UI',
        color: BRAND.gray500, align: 'center', valign: 'top',
      });
    }
  });

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addQuoteSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  // Large quote mark
  s.addText('"', {
    x: 0.6, y: 0.8, w: 1, h: 1.2,
    fontSize: 72, fontFace: 'Georgia',
    color: accent, bold: true,
  });

  // Quote text
  s.addText(slide.title || '', {
    x: 1.2, y: 1.5, w: 7.5, h: 2,
    fontSize: 24, fontFace: 'Segoe UI',
    color: BRAND.white, italic: true,
    align: 'left', valign: 'middle',
  });

  // Author/source
  if (slide.subtitle) {
    s.addText(`— ${slide.subtitle}`, {
      x: 1.2, y: 3.7, w: 7.5, h: 0.5,
      fontSize: 14, fontFace: 'Segoe UI',
      color: BRAND.gray500, align: 'left',
    });
  }

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addTimelineSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  // Parse bullets as "Phase|Description" timeline entries
  const entries = (slide.bullets || []).map((b) => {
    const parts = b.split('|').map(p => p.trim());
    return { phase: parts[0] || '', desc: parts[1] || b };
  });

  const count = Math.min(entries.length, 6);
  const itemW = 8.4 / count;

  // Horizontal line
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 2.6, w: 8.4, h: 0.03,
    fill: { color: BRAND.gray700 },
  });

  entries.forEach((entry, i) => {
    const x = 0.8 + i * itemW;

    // Dot
    s.addShape(pptx.shapes.OVAL, {
      x: x + itemW / 2 - 0.1, y: 2.5, w: 0.2, h: 0.2,
      fill: { color: accent },
    });

    // Phase label (above line)
    s.addText(entry.phase, {
      x, y: 1.6, w: itemW, h: 0.8,
      fontSize: 12, fontFace: 'Segoe UI',
      color: accent, bold: true, align: 'center', valign: 'bottom',
    });

    // Description (below line)
    s.addText(entry.desc, {
      x, y: 2.8, w: itemW, h: 1.2,
      fontSize: 10, fontFace: 'Segoe UI',
      color: BRAND.gray200, align: 'center', valign: 'top',
    });
  });

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addComparisonSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.06,
    fill: { color: accent },
  });

  s.addText(slide.title || '', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
  });

  // Parse bullets as comparison items: "Option Name|Detail 1|Detail 2|..."
  const options = (slide.bullets || []).map((b) => {
    const parts = b.split('|').map(p => p.trim());
    return { name: parts[0] || '', details: parts.slice(1) };
  });

  const count = Math.min(options.length, 3);
  const colW = 8.4 / count;
  const colors = [accent, BRAND.blue, BRAND.green];

  options.forEach((opt, i) => {
    const x = 0.8 + i * colW;

    // Card background
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.1, y: 1.3, w: colW - 0.2, h: 3.2,
      fill: { color: BRAND.cardBg },
      rectRadius: 0.1,
    });

    // Option name
    s.addText(opt.name, {
      x: x + 0.1, y: 1.4, w: colW - 0.2, h: 0.5,
      fontSize: 16, fontFace: 'Segoe UI',
      color: colors[i % colors.length], bold: true, align: 'center',
    });

    // Details
    const detailText = opt.details.map((d) => ({
      text: d,
      options: {
        fontSize: 11, fontFace: 'Segoe UI', color: BRAND.gray200,
        bullet: { code: '2022', color: colors[i % colors.length] } as any,
        paraSpaceAfter: 4,
      },
    }));
    if (detailText.length > 0) {
      s.addText(detailText as any, {
        x: x + 0.2, y: 2.0, w: colW - 0.4, h: 2.2, valign: 'top',
      });
    }
  });

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

function addClosingSlide(pptx: any, slide: DynamicSlide) {
  const s = pptx.addSlide();
  const accent = getAccent(slide);

  s.background = { fill: BRAND.deepBlack };

  // Accent bar
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: accent },
  });

  s.addText(slide.title || 'Obrigado!', {
    x: 1, y: 1.5, w: 8, h: 1.2,
    fontSize: 32, fontFace: 'Segoe UI',
    color: BRAND.white, bold: true,
    align: 'center', valign: 'middle',
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 1.5, y: 2.8, w: 7, h: 0.5,
      fontSize: 16, fontFace: 'Segoe UI',
      color: BRAND.gray500, align: 'center',
    });
  }

  // CTA bullets
  const bullets = slide.bullets || [];
  if (bullets.length > 0) {
    const items = bullets.map((b) => ({
      text: b,
      options: {
        fontSize: 14, fontFace: 'Segoe UI', color: BRAND.gray200,
        bullet: { code: '2794', color: accent } as any,
        paraSpaceAfter: 6,
      },
    }));
    s.addText(items as any, {
      x: 2, y: 3.4, w: 6, h: 1.5,
      align: 'center', valign: 'top',
    });
  }

  // Footer
  s.addText('DeckForge — Apresentação gerada por IA', {
    x: 2, y: 4.8, w: 6, h: 0.3,
    fontSize: 9, fontFace: 'Segoe UI',
    color: BRAND.gray500, italic: true, align: 'center',
  });

  if (slide.speakerNotes) s.addNotes(slide.speakerNotes);
}

// --- Main Generator ---

function generateDynamicPptx(slides: DynamicSlide[], title: string): PptxGenJS {
  const pptx = new PptxGenJS();

  pptx.author = 'DeckForge AI';
  pptx.company = 'Avanade';
  pptx.subject = title;
  pptx.title = title;
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5" (widescreen 16:9)

  // Sort slides by order
  const sorted = [...slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const slide of sorted) {
    const hint = (slide.layoutHint || 'content').toLowerCase();

    switch (hint) {
      case 'title-slide':
        addTitleSlide(pptx, slide);
        break;
      case 'section-header':
        addSectionHeader(pptx, slide);
        break;
      case 'content':
        addContentSlide(pptx, slide);
        break;
      case 'two-column':
        addTwoColumnSlide(pptx, slide);
        break;
      case 'chart':
        addChartSlide(pptx, slide);
        break;
      case 'table':
        addTableSlide(pptx, slide);
        break;
      case 'chart-and-text':
        addChartAndTextSlide(pptx, slide);
        break;
      case 'kpi-dashboard':
        addKPIDashboard(pptx, slide);
        break;
      case 'quote':
        addQuoteSlide(pptx, slide);
        break;
      case 'timeline':
        addTimelineSlide(pptx, slide);
        break;
      case 'comparison':
        addComparisonSlide(pptx, slide);
        break;
      case 'closing':
        addClosingSlide(pptx, slide);
        break;
      default:
        // Fallback: if slide has chartData, use chart layout; if tableData, use table; else content
        if (slide.chartData) {
          addChartSlide(pptx, slide);
        } else if (slide.tableData) {
          addTableSlide(pptx, slide);
        } else {
          addContentSlide(pptx, slide);
        }
        break;
    }
  }

  return pptx;
}

// --- API Handler ---

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DynamicExportRequest;
    const { slides, title } = body;

    if (!slides?.length) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 });
    }

    console.log(`[DynamicPPTX] Generating ${slides.length} slides for "${title}"`);
    slides.forEach((s, i) => {
      console.log(`  [${i}] layoutHint=${s.layoutHint} title="${(s.title || '').slice(0, 40)}" chart=${!!s.chartData} table=${!!s.tableData}`);
    });

    const pptx = generateDynamicPptx(slides, title || 'Apresentação DeckForge');

    // Generate buffer
    const outputBase64 = await pptx.write({ outputType: 'base64' }) as string;
    const outputBuffer = Buffer.from(outputBase64, 'base64');

    const fileName = (title || 'Apresentacao-DeckForge')
      .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);

    console.log(`[DynamicPPTX] Output size: ${(outputBuffer.length / 1024).toFixed(0)}KB`);

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}.pptx"`,
        'Content-Length': String(outputBuffer.length),
      },
    });
  } catch (err: any) {
    console.error('[DynamicPPTX] Error:', err);
    return NextResponse.json({ error: err.message || 'Dynamic PPTX generation failed' }, { status: 500 });
  }
}
