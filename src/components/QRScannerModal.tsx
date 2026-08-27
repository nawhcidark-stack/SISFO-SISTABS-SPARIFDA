import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'motion/react';
import { Camera, RefreshCw, X, AlertCircle, Sparkles, Check, Send } from 'lucide-react';
import { Student } from '../types';

interface QRScannerModalProps {
  students: Student[];
  onSelectStudentByNis: (nis: string) => void;
  onClose: () => void;
}

export default function QRScannerModal({ students, onSelectStudentByNis, onClose }: QRScannerModalProps) {
  const [cameraPermissionState, setCameraPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [isMirrored, setIsMirrored] = useState(false);
  
  // Manual NIS fallback
  const [manualNis, setManualNis] = useState('');
  const [manualError, setManualError] = useState('');

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const playBeepRef = useRef<() => void>(() => {});

  // Define premium beep synthesizer
  useEffect(() => {
    playBeepRef.current = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6 note (crystal clear chirp)
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
      } catch (err) {
        console.warn('Scan audio beep failed', err);
      }
    };
  }, []);

  const startScanner = async (cameraId?: string) => {
    setIsInitializing(true);
    setCameraError(null);
    setScannedResult(null);
    setScannedStudent(null);

    // Stop existing scanner if any
    if (html5QrcodeRef.current) {
      if (html5QrcodeRef.current.isScanning) {
        try {
          await html5QrcodeRef.current.stop();
        } catch (e) {
          console.error('Failed to stop previous scanner instance', e);
        }
      }
    }

    try {
      const qrCodeId = "qr-video-container";
      const html5QrCode = new Html5Qrcode(qrCodeId);
      html5QrcodeRef.current = html5QrCode;

      // Determine camera option
      const cameraConfig = cameraId ? cameraId : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Silent frame scanning failures is preferred to avoid console noise
        }
      );

      setCameraPermissionState('granted');
      setIsInitializing(false);

      // Fetch lists of cameras if not populated yet
      if (availableCameras.length === 0) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          setAvailableCameras(cameras || []);
          if (cameras && cameras.length > 0 && !cameraId) {
            // Find rear camera of preference, else just the first one
            const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
            if (backCam) {
              setSelectedCameraId(backCam.id);
            } else {
              setSelectedCameraId(cameras[0].id);
            }
          }
        } catch (err) {
          console.warn('Failed to retrieve list of camera devices', err);
        }
      }
    } catch (err: any) {
      console.error('Scanner start error:', err);
      setCameraError(err.message || 'Gagal memulai scanner kamera. Pastikan browser diizinkan mengakses kamera perangkat ini.');
      setCameraPermissionState('denied');
      setIsInitializing(false);
    }
  };

  const handleSuccessfulScan = (decodedText: string) => {
    const trimmedNis = decodedText.trim();
    if (!trimmedNis) return;

    // Find student
    const matched = students.find(s => s.nis.toLowerCase() === trimmedNis.toLowerCase());
    
    // Play professional feedback sound
    if (playBeepRef.current) playBeepRef.current();

    // Trigger device vibration if available
    if (navigator.vibrate) {
      try {
        navigator.vibrate(100);
      } catch (e) {}
    }

    setScannedResult(trimmedNis);

    if (matched) {
      setScannedStudent(matched);
      // Automatically proceed to selection after 1.2s to show success feedback animation
      setTimeout(() => {
        onSelectStudentByNis(matched.nis);
      }, 1200);
    } else {
      setScannedStudent(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    if (!manualNis.trim()) {
      setManualError('Masukkan NIS Siswa!');
      return;
    }

    const matched = students.find(s => s.nis.toLowerCase() === manualNis.trim().toLowerCase());
    if (matched) {
      if (playBeepRef.current) playBeepRef.current();
      onSelectStudentByNis(matched.nis);
    } else {
      setManualError('Siswa dengan NIS tersebut tidak ditemukan.');
    }
  };

  // Monitor camera changes
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  useEffect(() => {
    // Initial check and startup
    startScanner();

    return () => {
      // Unmount cleanup
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          html5QrcodeRef.current.stop()
            .then(() => {
              html5QrcodeRef.current?.clear();
            })
            .catch(err => console.error("Error stopping scanner during cleanup", err));
        }
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl shadow-indigo-950/45 text-left text-white overflow-hidden flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Camera size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">SCANNER QR PEMBAYARAN KASIR</h3>
              <p className="text-[10px] text-slate-400">Scan kartu QR siswa untuk deteksi instan loket teller</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Camera Stage */}
        <div className="relative bg-slate-950 aspect-[4/3] flex flex-col items-center justify-center overflow-hidden border-b border-slate-800">
          
          {/* Style to mirror video if active */}
          {isMirrored && (
            <style dangerouslySetInnerHTML={{ __html: `
              #qr-video-container video {
                transform: scaleX(-1) !important;
                -webkit-transform: scaleX(-1) !important;
              }
            `}} />
          )}

          {/* Floating Mirror Toggle directly on Camera View */}
          {!cameraError && !isInitializing && !scannedResult && (
            <button
              type="button"
              onClick={() => setIsMirrored(prev => !prev)}
              className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-lg ${
                isMirrored 
                  ? 'bg-indigo-600/90 hover:bg-indigo-600 border-indigo-400 text-white' 
                  : 'bg-slate-900/80 hover:bg-slate-950/90 border-slate-700 text-slate-300'
              }`}
              title="Cerminkan tampilan kamera"
            >
              <RefreshCw size={10} className={`shrink-0 ${isMirrored ? 'rotate-180 transition-transform duration-500' : ''}`} />
              <span>{isMirrored ? 'Mirror: Aktif 🔄' : 'Mirror: Nonaktif'}</span>
            </button>
          )}

          {/* Main Scanning container */}
          <div id="qr-video-container" className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

          {/* Glowing view finder overlay (Only visible when active & not scanned) */}
          {!scannedResult && !cameraError && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-52 h-52 border-2 border-dashed border-indigo-400/40 rounded-2xl flex items-center justify-center bg-slate-950/10 backdrop-blur-[0.5px]">
                {/* Visual corners */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                {/* Laser animation line */}
                <div className="w-[90%] h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-0 animate-[bounce_2s_infinite] shadow-[0_0_10px_2px_rgba(52,211,153,0.5)]" />
                
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest bg-slate-950/80 px-2 py-1 rounded border border-emerald-500/10">
                  SCANNING QR...
                </span>
              </div>
            </div>
          )}

          {/* Initializing indicator */}
          {isInitializing && !cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="text-indigo-400 animate-spin" size={24} />
              <span className="text-xs font-semibold text-slate-300">Menyalakan modul kamera...</span>
              <span className="text-[10px] text-slate-500">Mohon berikan izin penggunaan kamera</span>
            </div>
          )}

          {/* Success Result Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              {scannedStudent ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-emerald-500/20 rounded-full border border-emerald-500/30 text-emerald-400 text-lg">
                    <Check size={36} className="stroke-[3]" />
                  </div>
                  <h4 className="text-emerald-400 font-extrabold text-base tracking-wide">QR BERHASIL TERDETEKSI!</h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-1 min-w-[240px]">
                    <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Nama Siswa</span>
                    <span className="block text-sm text-white font-extrabold mt-0.5">{scannedStudent.name}</span>
                    <span className="block text-xs font-mono text-indigo-300 mt-1">NIS: {scannedStudent.nis} &bull; Kelas: {scannedStudent.class}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2 italic animate-pulse">Membuka lembar tabungan &amp; tagihan...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-amber-500/20 rounded-full border border-amber-500/30 text-amber-400 text-lg">
                    <AlertCircle size={36} className="stroke-[3]" />
                  </div>
                  <h4 className="text-amber-400 font-extrabold text-base tracking-wide flex items-center gap-1.5 justify-center">
                    QR KODE TIDAK TERDAFTAR
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-1 min-w-[240px]">
                    <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">NIS Hasil Scan</span>
                    <span className="block text-sm text-yellow-300 font-mono font-extrabold mt-0.5">{scannedResult}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                    Data NIS ini tidak terdaftar di sistem. Anda bisa mengulang proses scan atau mencari manual.
                  </p>
                  <button
                    type="button"
                    onClick={() => startScanner(selectedCameraId)}
                    className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Scan Ulang
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Camera Permission/Error State */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950 text-slate-300 px-6 py-4 flex flex-col items-center justify-center text-center gap-3">
              <div className="p-3 bg-red-500/15 rounded-full text-red-400 border border-red-500/20">
                <AlertCircle size={24} />
              </div>
              <span className="font-extrabold text-xs text-red-400">KAMERA TIDAK AKTIF / DITOLAK</span>
              <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
                {cameraError}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => startScanner(selectedCameraId)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Coba Akses Lagi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Options / Controls */}
        <div className="p-5 flex flex-col gap-4 bg-slate-950/50">
          
          {/* Camera devices & mirror select options */}
          {!cameraError && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-[11px] border-b border-slate-800 pb-3 flex-wrap">
              {availableCameras.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0">
                    <RefreshCw size={11} className="shrink-0" />
                    <span>PILIH KAMERA:</span>
                  </span>
                  <select
                    value={selectedCameraId}
                    onChange={handleCameraChange}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-250 outline-none max-w-[200px] cursor-pointer"
                  >
                    {availableCameras.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Kamera ${availableCameras.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-slate-500 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>Kamera Utama Aktif</span>
                </div>
              )}

              {/* Mirror Camera Toggle Block */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none py-1.5 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition-all shrink-0">
                <input
                  type="checkbox"
                  checked={isMirrored}
                  onChange={(e) => setIsMirrored(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                />
                <span className="font-extrabold text-slate-300 text-[10px] tracking-wide uppercase">Cerminkan Kamera (Mirror)</span>
              </label>
            </div>
          )}

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">Alternatif Input NIS Manual</label>
              {manualError && <span className="text-[10px] text-red-400 font-bold">{manualError}</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualNis}
                onChange={(e) => {
                  setManualNis(e.target.value);
                  setManualError('');
                }}
                placeholder="Masukkan Nomor Induk Siswa (NIS) contoh: 12345"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-indigo-200 transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 transition hover:shadow-lg active:scale-95 cursor-pointer text-white"
              >
                <Send size={12} />
                <span>Kirim</span>
              </button>
            </div>
          </form>

          {/* Close button */}
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 font-bold cursor-pointer transition text-right"
            >
              Tutup Panel Scanner
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
