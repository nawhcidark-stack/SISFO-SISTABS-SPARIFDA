import React, { useState } from 'react';
import { Printer, X, Barcode, Plus, Minus, CheckSquare, Square, Zap } from 'lucide-react';
import { KoperasiProduct, KoperasiSaleTransaction } from '../types';

/**
 * Standard Code-128 Pattern Table (Values 0 to 106)
 * Each pattern represents widths of 3 bars and 3 spaces (11 modules total, except Stop code 106 which has 13 modules).
 */
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112'
];

/**
 * Generates an array of bar/space widths for Code 128 Subset B
 */
export function generateCode128Modules(rawText: string): { bars: { x: number; w: number }[]; totalUnits: number } {
  const cleanText = (rawText || 'ATR-001').trim();
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < cleanText.length; i++) {
    const ascii = cleanText.charCodeAt(i);
    // Code 128B supports ASCII 32..126
    const val = ascii >= 32 && ascii <= 126 ? ascii - 32 : 13; // fallback to '-' (ASCII 45 -> 13)
    codes.push(val);
    checksum += val * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop pattern

  const bars: { x: number; w: number }[] = [];
  let cursor = 10; // Quiet zone left (10 units)

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      const isBar = i % 2 === 0;
      if (isBar) {
        bars.push({ x: cursor, w: width });
      }
      cursor += width;
    }
  }

  cursor += 10; // Quiet zone right
  return { bars, totalUnits: cursor };
}

/**
 * Generates a raw self-contained SVG string for instant printing without React/Tailwind overhead
 */
export function generateCode128SvgString(value: string, height = 26, showText = true): string {
  const { bars, totalUnits } = generateCode128Modules(value);
  const svgHeight = showText ? height + 14 : height;
  const rects = bars
    .map(b => `<rect x="${b.x}" y="2" width="${b.w}" height="${height - 2}" fill="#000"/>`)
    .join('');
  const textEl = showText
    ? `<text x="${totalUnits / 2}" y="${height + 11}" text-anchor="middle" fill="#000" font-size="10" font-weight="bold" font-family="Courier New, monospace">${escapeHtml(
        value
      )}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalUnits} ${svgHeight}" style="width:100%;max-width:190px;height:auto;display:block;margin:0 auto;background:#fff;"><rect x="0" y="0" width="${totalUnits}" height="${svgHeight}" fill="#fff"/>${rects}${textEl}</svg>`;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ultra-fast isolated iframe print engine.
 * Avoids layouting the main SPA DOM (which has thousands of Tailwind nodes, charts, and tables)
 * so the Windows Print Preview dialog renders in < 30ms.
 */
export function instantPrintHtmlDocument(htmlBody: string, cssStyles: string, docTitle = 'Cetak Struk Koperasi') {
  const existingFrame = document.getElementById('koperasi-instant-print-iframe') as HTMLIFrameElement | null;
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'koperasi-instant-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = frameWin?.document || iframe.contentDocument;
  if (!frameDoc || !frameWin) {
    window.print();
    return;
  }

  frameDoc.open();
  frameDoc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  ${cssStyles}
</style>
</head>
<body>
${htmlBody}
</body>
</html>`);
  frameDoc.close();

  // Trigger print immediately on next micro-frame so zero external assets are waited on
  setTimeout(() => {
    try {
      frameWin.focus();
      frameWin.print();
    } catch (_) {
      window.print();
    }
  }, 20);
}

/**
 * Instant Thermal Receipt (58mm / 80mm) & Nota Kuitansi A5 Printer
 * Renders in Windows Print Dialog instantaneously without multi-page lag.
 */
export function printKoperasiReceiptInstant(
  sale: KoperasiSaleTransaction,
  options: {
    format: 'thermal58' | 'thermal80' | 'thermal' | 'a5';
    schoolName: string;
    schoolAddress: string;
  }
) {
  const isA5 = options.format === 'a5';
  const is58 = options.format === 'thermal58';

  const timeStr = sale.createdAt
    ? new Date(sale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';
  const buyerSuffix =
    sale.buyerType === 'teacher'
      ? ` (${escapeHtml(sale.teacherRole || 'Guru')})`
      : sale.studentClass
      ? ` (${escapeHtml(sale.studentClass)})`
      : '';
  const buyerLabel = `${escapeHtml(sale.buyerName)}${buyerSuffix}`;
  const paymentLabel = sale.paymentMethod === 'bank' ? 'TRANSFER / QRIS' : 'TUNAI / KAS';
  const barcodeSvg = generateCode128SvgString(sale.invoiceNumber, 24, true);

  if (!isA5) {
    // Thermal 58mm or 80mm pure lightweight monospace receipt
    const paperWidth = is58 ? '54mm' : '74mm';
    const pageSize = is58 ? '58mm auto' : '80mm auto';
    const fontSizeBase = is58 ? '10px' : '11px';

    const itemsHtml = sale.items
      .map(item => {
        const sizeLabel =
          item.size && item.size !== '-' && item.size !== 'All Size' ? ` (Uk:${escapeHtml(item.size)})` : '';
        return `
        <div class="item-row">
          <div class="item-name">${escapeHtml(item.productName)}${sizeLabel}</div>
          <div class="flex-between">
            <span>${item.qty} ${escapeHtml(item.unit)} x Rp ${(item.sellingPrice || 0).toLocaleString('id-ID')}</span>
            <strong>Rp ${(item.subtotalSelling || 0).toLocaleString('id-ID')}</strong>
          </div>
        </div>`;
      })
      .join('');

    const notesHtml = sale.notes
      ? `<div class="divider"></div><div class="notes">Catatan: ${escapeHtml(sale.notes)}</div>`
      : '';

    const css = `
      @page { size: ${pageSize}; margin: 1.5mm; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: ${fontSizeBase};
        line-height: 1.32;
        width: ${paperWidth};
        margin: 0 auto;
        padding: 2mm 1.5mm;
        color: #000;
      }
      .center { text-align: center; }
      .title { font-size: ${is58 ? '12px' : '13px'}; font-weight: bold; text-transform: uppercase; }
      .subtitle { font-size: ${is58 ? '10px' : '11px'}; font-weight: bold; text-transform: uppercase; }
      .addr { font-size: 9px; margin-top: 2px; }
      .divider { border-top: 1px dashed #000; margin: 5px 0; }
      .flex-between { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; }
      .meta-row { margin: 2px 0; }
      .item-row { margin: 4px 0; }
      .item-name { font-weight: bold; }
      .total-row { font-size: ${is58 ? '12px' : '13px'}; font-weight: bold; margin: 3px 0; }
      .notes { font-size: 9.5px; }
      .barcode-box { margin: 6px auto 4px; width: 155px; text-align: center; }
      .footer { font-size: 9.5px; text-align: center; margin-top: 4px; }
    `;

    const html = `
      <div class="center">
        <div class="title">KOPERASI SEKOLAH</div>
        <div class="subtitle">${escapeHtml(options.schoolName)}</div>
        <div class="addr">${escapeHtml(options.schoolAddress)}</div>
      </div>
      <div class="divider"></div>
      <div class="meta-row flex-between"><span>No. Struk:</span><strong>${escapeHtml(sale.invoiceNumber)}</strong></div>
      <div class="meta-row flex-between"><span>Tanggal:</span><span>${escapeHtml(sale.date)} ${escapeHtml(timeStr)}</span></div>
      <div class="meta-row flex-between"><span>Pembeli:</span><strong>${buyerLabel}</strong></div>
      <div class="meta-row flex-between"><span>Kasir:</span><span>${escapeHtml(sale.cashierName)}</span></div>
      <div class="meta-row flex-between"><span>Bayar:</span><strong>${paymentLabel}</strong></div>
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="flex-between total-row">
        <span>TOTAL BAYAR</span>
        <span>Rp ${(sale.totalAmount || 0).toLocaleString('id-ID')}</span>
      </div>
      <div class="flex-between meta-row">
        <span>Uang Diterima</span>
        <span>Rp ${(sale.cashReceived || 0).toLocaleString('id-ID')}</span>
      </div>
      <div class="flex-between meta-row">
        <strong>Kembalian</strong>
        <strong>Rp ${(sale.changeAmount || 0).toLocaleString('id-ID')}</strong>
      </div>
      ${notesHtml}
      <div class="divider"></div>
      <div class="barcode-box">${barcodeSvg}</div>
      <div class="divider"></div>
      <div class="footer">
        <div><strong>Terima Kasih Atas Pembelian Anda</strong></div>
        <div>Barang/Atribut sesuai ukuran pilihan</div>
        <div>Tercatat Otomatis di BKU Bendahara</div>
      </div>
    `;

    instantPrintHtmlDocument(html, css, `Struk_${sale.invoiceNumber}`);
    return;
  }

  // Nota Kuitansi A5 format
  const rowsHtml = sale.items
    .map((item, idx) => {
      const sizeLabel =
        item.size && item.size !== '-' && item.size !== 'All Size' ? ` (Uk: ${escapeHtml(item.size)})` : '';
      return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${escapeHtml(item.productName)}</strong>${sizeLabel}</td>
        <td style="text-align:center;">${item.qty} ${escapeHtml(item.unit)}</td>
        <td style="text-align:right;">Rp ${(item.sellingPrice || 0).toLocaleString('id-ID')}</td>
        <td style="text-align:right;"><strong>Rp ${(item.subtotalSelling || 0).toLocaleString('id-ID')}</strong></td>
      </tr>`;
    })
    .join('');

  const a5Css = `
    @page { size: A5 landscape; margin: 8mm; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      padding: 4mm;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
    .title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
    .subtitle { font-size: 12px; font-weight: bold; }
    .meta-grid { display: table; width: 100%; margin-bottom: 8px; }
    .meta-col { display: table-cell; width: 50%; vertical-align: top; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.items th, table.items td { border: 1px solid #000; padding: 5px 6px; font-size: 11px; }
    table.items th { background: #f0f0f0; text-transform: uppercase; font-size: 10px; }
    .footer-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px; }
  `;

  const a5Html = `
    <div class="header">
      <div>
        <div class="title">NOTA KUITANSI KOPERASI SEKOLAH</div>
        <div class="subtitle">${escapeHtml(options.schoolName)}</div>
        <div style="font-size:10px;">${escapeHtml(options.schoolAddress)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;font-weight:bold;">NO: ${escapeHtml(sale.invoiceNumber)}</div>
        <div style="font-size:10px;">Tanggal: ${escapeHtml(sale.date)} ${escapeHtml(timeStr)}</div>
        <div style="font-size:10px;">Metode: <strong>${paymentLabel}</strong></div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-col">
        <div><strong>Pembeli:</strong> ${buyerLabel}</div>
        ${sale.studentNis ? `<div><strong>NIS:</strong> ${escapeHtml(sale.studentNis)}</div>` : ''}
      </div>
      <div class="meta-col" style="text-align:right;">
        <div><strong>Petugas Kasir:</strong> ${escapeHtml(sale.cashierName)}</div>
        <div><strong>Status BKU:</strong> Tercatat Otomatis di BKU Bendahara</div>
      </div>
    </div>
    <table class="items">
      <thead>
        <tr>
          <th style="width:32px;">No</th>
          <th>Nama Atribut Sekolah</th>
          <th style="width:70px;">Jumlah</th>
          <th style="width:105px;">Harga Satuan</th>
          <th style="width:115px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right;font-weight:bold;">TOTAL PEMBAYARAN</td>
          <td style="text-align:right;font-weight:bold;font-size:12px;">Rp ${(sale.totalAmount || 0).toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align:right;">Uang Diterima / Kembalian</td>
          <td style="text-align:right;">Rp ${(sale.cashReceived || 0).toLocaleString('id-ID')} / Kembali Rp ${(sale.changeAmount || 0).toLocaleString('id-ID')}</td>
        </tr>
      </tfoot>
    </table>
    <div class="footer-grid">
      <div style="width:160px;">${barcodeSvg}</div>
      <div style="text-align:center;min-width:160px;">
        <div>Pandaan, ${escapeHtml(sale.date)}</div>
        <div style="margin-bottom:34px;">Kasir / Bendahara Koperasi</div>
        <div><strong>(${escapeHtml(sale.cashierName)})</strong></div>
      </div>
    </div>
  `;

  instantPrintHtmlDocument(a5Html, a5Css, `Nota_${sale.invoiceNumber}`);
}

/**
 * Instant Barcode Label Sheet Printer (renders in <30ms in Windows Print Dialog)
 */
export function printKoperasiBarcodeLabelsInstant(
  labels: KoperasiProduct[],
  options: {
    columnsMode: '3col' | '4col' | 'thermal';
    showPrice: boolean;
    showSize: boolean;
    showSchoolHeader: boolean;
    schoolName: string;
  }
) {
  const isThermal = options.columnsMode === 'thermal';
  const colCount = options.columnsMode === '4col' ? 4 : options.columnsMode === '3col' ? 3 : 1;

  const cardsHtml = labels
    .map(item => {
      const headerHtml = options.showSchoolHeader
        ? `<div class="kop">${escapeHtml(options.schoolName)}</div>`
        : '';
      const sizeHtml =
        options.showSize && item.size && item.size !== '-'
          ? `<span class="size-badge">Uk: ${escapeHtml(item.size)}</span>`
          : '';
      const priceHtml = options.showPrice
        ? `<span class="price">Rp ${(item.sellingPrice || 0).toLocaleString('id-ID')}</span>`
        : '';
      const svg = generateCode128SvgString(item.code, 30, true);
      return `
      <div class="label-card">
        ${headerHtml}
        <div class="prod-name">${escapeHtml(item.name)}</div>
        <div class="meta-line">${sizeHtml} ${priceHtml}</div>
        <div class="svg-wrap">${svg}</div>
      </div>`;
    })
    .join('');

  const css = `
    @page { size: ${isThermal ? '80mm auto' : 'A4 portrait'}; margin: ${isThermal ? '2mm' : '6mm'}; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${colCount}, 1fr);
      gap: 6px;
      width: ${isThermal ? '72mm' : '100%'};
      margin: 0 auto;
    }
    .label-card {
      border: 1px dashed #666;
      border-radius: 4px;
      padding: 5px 4px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .kop { font-size: 7.5px; font-weight: bold; text-transform: uppercase; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prod-name { font-size: 9.5px; font-weight: bold; color: #000; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta-line { font-size: 8.5px; margin-bottom: 2px; }
    .size-badge { border: 1px solid #888; padding: 0 3px; border-radius: 2px; font-weight: bold; margin-right: 4px; }
    .price { font-weight: bold; }
    .svg-wrap { width: 100%; max-width: 150px; margin: 0 auto; }
  `;

  instantPrintHtmlDocument(`<div class="grid">${cardsHtml}</div>`, css, 'Cetak_Label_Barcode_Koperasi');
}

interface Code128BarcodeProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const Code128BarcodeSvg: React.FC<Code128BarcodeProps> = ({
  value,
  height = 42,
  showText = true,
  className = ''
}) => {
  const { bars, totalUnits } = generateCode128Modules(value);
  const svgHeight = showText ? height + 16 : height;

  return (
    <svg
      viewBox={`0 0 ${totalUnits} ${svgHeight}`}
      className={`w-full max-w-full bg-white ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={totalUnits} height={svgHeight} fill="#ffffff" />
      {bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x}
          y={2}
          width={bar.w}
          height={height - 2}
          fill="#000000"
        />
      ))}
      {showText && (
        <text
          x={totalUnits / 2}
          y={height + 12}
          textAnchor="middle"
          fill="#000000"
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {value}
        </text>
      )}
    </svg>
  );
};

/**
 * Plays a realistic POS Cashier Barcode Scanner Beep using Web Audio API
 */
export function playScannerBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.26);
    }
  } catch (_) {
    // Ignore audio context restriction if not interacted yet
  }
}

interface BarcodeLabelPrintModalProps {
  products: KoperasiProduct[];
  initialSelectedProductId?: string | null;
  schoolName?: string;
  onClose: () => void;
}

export const BarcodeLabelPrintModal: React.FC<BarcodeLabelPrintModalProps> = ({
  products,
  initialSelectedProductId,
  schoolName = "KOPERASI SMP MA'ARIF NU PANDAAN",
  onClose
}) => {
  // Map of productId -> number of barcode labels to print
  const [labelCounts, setLabelCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (initialSelectedProductId) {
      initial[initialSelectedProductId] = 12;
    } else {
      products.slice(0, 6).forEach(p => {
        initial[p.id] = 4;
      });
    }
    return initial;
  });

  const [columnsMode, setColumnsMode] = useState<'3col' | '4col' | 'thermal'>('4col');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showSize, setShowSize] = useState<boolean>(true);
  const [showSchoolHeader, setShowSchoolHeader] = useState<boolean>(true);

  const toggleProductSelection = (productId: string) => {
    setLabelCounts(prev => {
      const copy = { ...prev };
      if (copy[productId] && copy[productId] > 0) {
        delete copy[productId];
      } else {
        copy[productId] = 4;
      }
      return copy;
    });
  };

  const setProductCopies = (productId: string, count: number) => {
    setLabelCounts(prev => {
      const copy = { ...prev };
      if (count <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = Math.min(200, count);
      }
      return copy;
    });
  };

  const selectAllProducts = (copiesEach = 4) => {
    const next: Record<string, number> = {};
    products.forEach(p => {
      next[p.id] = copiesEach;
    });
    setLabelCounts(next);
  };

  const clearAllSelection = () => {
    setLabelCounts({});
  };

  // Flatten items to print
  const labelsToRender: KoperasiProduct[] = [];
  products.forEach(product => {
    const count = labelCounts[product.id] || 0;
    for (let i = 0; i < count; i++) {
      labelsToRender.push(product);
    }
  });

  const handlePrint = () => {
    printKoperasiBarcodeLabelsInstant(labelsToRender, {
      columnsMode,
      showPrice,
      showSize,
      showSchoolHeader,
      schoolName
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Barcode className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg">
                CETAK LABEL BARCODE ATRIBUT KOPERASI SEKOLAH
              </h2>
              <p className="text-xs text-slate-300">
                Render Cepat (Instant Print) • Standar Code-128 Barcode • Siap dipindai Scanner Laser USB maupun Kamera
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Left Configuration + Right Live Label Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Pilih Atribut & Jumlah Cetak (5/12) */}
          <div className="lg:col-span-5 border-r border-slate-200 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {/* Layout Options */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Ukuran & Tata Letak Kertas Label
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setColumnsMode('4col')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    columnsMode === '4col'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  A4 (4 Kolom)
                </button>
                <button
                  type="button"
                  onClick={() => setColumnsMode('3col')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    columnsMode === '3col'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  A4 (3 Kolom)
                </button>
                <button
                  type="button"
                  onClick={() => setColumnsMode('thermal')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    columnsMode === 'thermal'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Thermal Roll
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSchoolHeader}
                    onChange={e => setShowSchoolHeader(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Nama Koperasi</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={e => setShowPrice(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Harga Jual</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSize}
                    onChange={e => setShowSize(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Ukuran</span>
                </label>
              </div>
            </div>

            {/* Product List & Copies Counter */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Pilih Atribut & Jumlah Stiker
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectAllProducts(4)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Pilih Semua (4x)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllSelection}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
                {products.map(prod => {
                  const count = labelCounts[prod.id] || 0;
                  const isSelected = count > 0;
                  return (
                    <div
                      key={prod.id}
                      className={`py-2.5 px-2 rounded-lg flex items-center justify-between gap-2 transition ${
                        isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleProductSelection(prod.id)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-800">{prod.code}</span>
                            <span>•</span>
                            <span>Uk: {prod.size}</span>
                            <span>•</span>
                            <span>Rp {(prod.sellingPrice || 0).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setProductCopies(prod.id, count - 1)}
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={count}
                          onChange={e =>
                            setProductCopies(prod.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-11 text-center text-xs font-bold border border-slate-300 rounded py-1 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setProductCopies(prod.id, count + 1)}
                          className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Live Preview & Print Sheet (7/12) */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto bg-slate-100 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600">
                Pratinjau Kertas Label Barcode ({labelsToRender.length} Stiker Siap Cetak)
              </span>
              <div className="flex items-center gap-2">
                {[4, 8, 12, 24].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (initialSelectedProductId) {
                        setProductCopies(initialSelectedProductId, preset);
                      } else if (products[0]) {
                        setProductCopies(products[0].id, preset);
                      }
                    }}
                    className="px-2 py-1 rounded bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Set {preset} Label
                  </button>
                ))}
              </div>
            </div>

            {labelsToRender.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 w-full">
                <Barcode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm text-slate-600">
                  Belum ada atribut yang dipilih untuk cetak barcode
                </p>
                <p className="text-xs mt-1">
                  Centang atribut di panel sebelah kiri dan tentukan jumlah stiker yang ingin dicetak.
                </p>
              </div>
            ) : (
              <div
                id="koperasi-barcode-print-sheet"
                className={`bg-white p-4 rounded-xl shadow-sm border border-slate-300 w-full ${
                  columnsMode === 'thermal' ? 'max-w-[320px]' : ''
                }`}
              >
                <div
                  className={`grid gap-2.5 ${
                    columnsMode === '4col'
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : columnsMode === '3col'
                      ? 'grid-cols-2 sm:grid-cols-3'
                      : 'grid-cols-1'
                  }`}
                >
                  {labelsToRender.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="border border-dashed border-slate-400 rounded-lg p-2 flex flex-col items-center justify-between text-center bg-white break-inside-avoid"
                    >
                      {showSchoolHeader && (
                        <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-600 truncate w-full">
                          {schoolName}
                        </div>
                      )}
                      <div className="text-[10px] font-black text-slate-900 leading-tight line-clamp-1 w-full mt-0.5">
                        {item.name}
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-700 my-0.5">
                        {showSize && item.size && item.size !== '-' && (
                          <span className="px-1 py-0.2 bg-slate-100 rounded border border-slate-300">
                            Uk: {item.size}
                          </span>
                        )}
                        {showPrice && (
                          <span className="font-black text-slate-950">
                            Rp {(item.sellingPrice || 0).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                      <div className="w-full px-1">
                        <Code128BarcodeSvg value={item.code} height={34} showText={true} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Mode Render Cepat Aktif • Total Stiker:{' '}
              <strong className="text-slate-900">{labelsToRender.length} Label</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={labelsToRender.length === 0}
              onClick={handlePrint}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow transition cursor-pointer ${
                labelsToRender.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {labelsToRender.length} Label Barcode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
