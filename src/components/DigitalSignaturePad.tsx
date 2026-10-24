import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle2 } from 'lucide-react';

interface DigitalSignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  required?: boolean;
  signerName?: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  value,
  onChange,
  label = "Tanda Tangan Digital",
  required = false,
  signerName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Initialize canvas with proper DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width) || 360;
    const height = 160;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // Deep dark ink

    // If an initial value is provided, draw it onto canvas
    if (value && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        hasDrawnRef.current = true;
        setIsEmpty(false);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, width, height);
      hasDrawnRef.current = false;
      setIsEmpty(true);
    }
  }, [value]);

  useEffect(() => {
    setupCanvas();

    const handleResize = () => {
      // If empty, re-setup. If drawn, preserve is handled by setupCanvas if re-triggered
      if (isEmpty) {
        setupCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, isEmpty]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to ensure smooth strokes even if finger slips slightly outside
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    isDrawingRef.current = true;
    hasDrawnRef.current = true;
    setIsEmpty(false);

    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw a single dot in case it's a tap
    ctx.lineTo(x + 0.5, y + 0.5);
    ctx.stroke();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Export transparent PNG Data URL
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawnRef.current = false;
    setIsEmpty(true);
    onChange('');
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {!isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Hapus tanda tangan dan buat ulang"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / Hapus</span>
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        className={`relative w-full rounded-xl border-2 transition-all bg-white dark:bg-slate-900 overflow-hidden shadow-inner ${
          isEmpty 
            ? 'border-slate-300 dark:border-slate-700 hover:border-emerald-400' 
            : 'border-emerald-500/80 dark:border-emerald-500/80 ring-2 ring-emerald-500/10'
        }`}
        style={{ minHeight: '160px' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="w-full h-[160px] cursor-crosshair select-none block"
          style={{ touchAction: 'none' }}
        />

        {/* Placeholder guide line and prompt */}
        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            <div className="w-48 border-b-2 border-dashed border-slate-300 dark:border-slate-700 mb-2"></div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center">
              Bubuhkan tanda tangan di area ini (Gunakan jari atau stylus)
            </p>
          </div>
        )}

        {/* Success watermark when signed */}
        {!isEmpty && (
          <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Tertandatangani</span>
          </div>
        )}

        {/* Signer name preview at bottom if provided */}
        {signerName && (
          <div className="absolute bottom-1.5 left-3 pointer-events-none text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[80%]">
            ({signerName})
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
        Tanda tangan digital ini sah dan tersimpan langsung ke sistem buku tamu database MySQL.
      </p>
    </div>
  );
};
