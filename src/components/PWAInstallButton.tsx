import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Check, X, Info, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'compact' | 'banner' | 'pill';
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
  label = 'Instal Aplikasi Android'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidManualGuide, setShowAndroidManualGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If running inside standalone installed PWA, hide install prompts
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // In browsers where beforeinstallprompt hasn't fired yet or already dismissed
      setShowAndroidManualGuide(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black tracking-wide m-0 text-white">Pasang Aplikasi di HP Android</h4>
              <p className="text-[11px] text-emerald-100 font-medium m-0">Akses instan seperti aplikasi asli tanpa buka browser berulang kali</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>{isInstalling ? 'Memasang...' : 'Instal Sekarang'}</span>
          </button>
        </div>
      ) : variant === 'pill' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          title="Instal Aplikasi ke Layar Utama Smartphone"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[11px] font-black tracking-wide shadow-sm transition-all cursor-pointer ${className}`}
        >
          <Smartphone size={13} />
          <span>{label}</span>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          title="Instal Aplikasi Android"
          className={`p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center justify-center ${className}`}
        >
          <Download size={15} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer ${className}`}
        >
          <Smartphone size={15} />
          <span>{isInstalling ? 'Memproses Instalasi...' : label}</span>
        </button>
      )}

      {/* Modal Panduan Instalasi di iOS (Safari iPhone / iPad) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Smartphone size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900 m-0">Instal di iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Browser Safari di iOS mendukung instalasi aplikasi ke layar utama melalui menu Bagikan (Share):
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-bold text-slate-800 m-0">Ketuk ikon Bagikan (Share)</p>
                  <p className="text-[11px] text-slate-500 m-0">Ikon kotak dengan panah atas di bar bawah Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-bold text-slate-800 m-0">Pilih "Tambahkan ke Layar Utama"</p>
                  <p className="text-[11px] text-slate-500 m-0">(Add to Home Screen) pada daftar menu opsi.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-bold text-slate-800 m-0">Ketuk "Tambah" (Add)</p>
                  <p className="text-[11px] text-slate-500 m-0">Aplikasi akan muncul langsung di layar utama HP Anda.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Panduan Instalasi Android (Manual Chrome Guide jika prompt sistem belum muncul) */}
      {showAndroidManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Smartphone size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900 m-0">Panduan Pasang Aplikasi Android</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAndroidManualGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Jika pop-up otomatis tidak terbuka, Anda dapat memasang aplikasi langsung melalui menu browser Google Chrome / Samsung Internet:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-bold text-slate-800 m-0">Ketuk Titik Tiga (⋮) di Pojok Kanan Atas</p>
                  <p className="text-[11px] text-slate-500 m-0">Buka menu pengaturan browser Chrome.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-bold text-slate-800 m-0">Pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama"</p>
                  <p className="text-[11px] text-slate-500 m-0">(Install App / Add to Home screen).</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-bold text-slate-800 m-0">Konfirmasi Instal</p>
                  <p className="text-[11px] text-slate-500 m-0">Aplikasi akan terpasang di HP Anda dengan ikon resmi sekolah.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidManualGuide(false)}
              className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
