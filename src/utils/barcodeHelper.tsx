import React, { useState } from 'react';
import { Printer, X, Barcode, Plus, Minus, CheckSquare, Square, Sparkles } from 'lucide-react';
import { KoperasiProduct } from '../types';

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
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #koperasi-barcode-print-sheet, #koperasi-barcode-print-sheet * {
            visibility: visible !important;
          }
          #koperasi-barcode-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Barcode className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg">
                CETAK LABEL BARCODE ATRIBUT KOPERASI SEKOLAH
              </h2>
              <p className="text-xs text-slate-300">
                Standar Code-128 Barcode • Siap dipindai menggunakan Scanner Laser USB/Wireless maupun Kamera HP/Laptop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Left Configuration + Right Live Label Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Panel: Pilih Atribut & Jumlah Cetak (5/12) */}
          <div className="lg:col-span-5 border-r border-slate-200 p-4 overflow-y-auto space-y-4 bg-slate-50 print:hidden">
            {/* Layout Options */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Ukuran & Tata Letak Kertas Label
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setColumnsMode('4col')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition ${
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
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition ${
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
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition ${
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
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Pilih Semua (4x)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllSelection}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
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
                        className="flex items-start gap-2 text-left flex-1 min-w-0"
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
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
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
                          className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white"
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
            <div className="w-full flex items-center justify-between mb-3 print:hidden">
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
                    className="px-2 py-1 rounded bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
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
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Total Stiker Barcode: <strong className="text-slate-900">{labelsToRender.length} Label</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={labelsToRender.length === 0}
              onClick={handlePrint}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black shadow transition ${
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
