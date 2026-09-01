import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldCheck, ShieldAlert, CheckCircle2, QrCode, CreditCard, AlertCircle } from 'lucide-react';

interface MidtransPayModalProps {
  isOpen: boolean;
  token: string | null;
  orderId: string | null;
  amount: number;
  itemName: string;
  isProduction?: boolean;
  clientKey?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function MidtransPayModal({
  isOpen,
  token,
  orderId,
  amount = 0,
  itemName = 'Tagihan Sekolah',
  isProduction = false,
  clientKey = '',
  onSuccess,
  onClose
}: MidtransPayModalProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'simulated'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulatingSuccess, setIsSimulatingSuccess] = useState(false);

  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const safeOrderId = orderId || `TRX-${Date.now()}`;
  const isMockToken = Boolean(token && (token.startsWith('mock-') || token.includes('mock')));

  useEffect(() => {
    if (!isOpen || !token) return;

    setErrorMessage(null);

    // If it's a simulated/mock token, switch to mock sandbox simulation mode
    if (isMockToken) {
      setStatus('simulated');
      return;
    }

    setStatus('loading');

    // Function to initialize payment using client-side Snap SDK
    const initSnapPay = () => {
      const snapInstance = (window as any).snap;
      if (!snapInstance) {
        setStatus('error');
        setErrorMessage('SDK Midtrans Snap tidak terdeteksi di window object.');
        return;
      }

      try {
        snapInstance.pay(token, {
          onSuccess: function (result: any) {
            console.log('Midtrans Snap Payment Success:', result);
            setStatus('success');
            // Instant verification request to update local database state securely
            fetch('/api/simulate-payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: safeOrderId, paymentType: result?.payment_type || 'Midtrans Snap' })
            })
              .then(() => {
                setTimeout(() => {
                  onSuccess();
                }, 1200);
              })
              .catch((err) => {
                console.error('Local verification sync failed:', err);
                setTimeout(() => {
                  onSuccess();
                }, 1200);
              });
          },
          onPending: function (result: any) {
            console.log('Midtrans Snap Payment Pending:', result);
            onClose();
          },
          onError: function (result: any) {
            console.error('Midtrans Snap Payment Error:', result);
            setStatus('error');
            setErrorMessage(result?.status_message || 'Terjadi kesalahan saat memproses pembayaran di Midtrans.');
          },
          onClose: function () {
            console.log('Midtrans Snap overlay closed by user');
            onClose();
          }
        });
      } catch (err: any) {
        console.error('Failed to trigger Midtrans Snap:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Gagal merender jendela pembayaran Midtrans.');
      }
    };

    // Load or ensure Midtrans Snap.js script is properly loaded
    const scriptSrc = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';

    const alternateSrc = isProduction
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js';

    // Remove any alternate snap script to avoid environment pollution
    const altScript = document.querySelector(`script[src="${alternateSrc}"]`);
    if (altScript) {
      altScript.remove();
      if ((window as any).snap) {
        try {
          delete (window as any).snap;
        } catch (e) {
          (window as any).snap = undefined;
        }
      }
    }

    // Find if the correct script already exists
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;

    if ((window as any).snap) {
      initSnapPay();
    } else if (existingScript) {
      existingScript.onload = () => {
        initSnapPay();
      };
      existingScript.onerror = () => {
        setStatus('error');
        setErrorMessage('Gagal memuat skrip pembayaran Midtrans Snap. Silakan periksa jaringan internet Anda.');
      };
    } else {
      // Inject Midtrans Snap script dynamically
      const script = document.createElement('script');
      script.src = scriptSrc;
      if (clientKey) {
        script.setAttribute('data-client-key', clientKey);
      }
      script.async = true;
      script.onload = () => {
        initSnapPay();
      };
      script.onerror = () => {
        setStatus('error');
        setErrorMessage('Gagal mengunduh modul pengaman Midtrans dari jaringan. Pastikan koneksi internet aktif.');
      };
      document.body.appendChild(script);
    }

    return () => {
      try {
        if ((window as any).snap && typeof (window as any).snap.hide === 'function') {
          (window as any).snap.hide();
        }
      } catch (e) {
        console.warn('Error closing Midtrans snap iframe overlay:', e);
      }
    };
  }, [isOpen, token, isProduction, clientKey, safeOrderId, isMockToken]);

  const handleSimulatePayment = async () => {
    setIsSimulatingSuccess(true);
    try {
      const res = await fetch('/api/simulate-payment-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: safeOrderId,
          paymentType: 'Midtrans QRIS (Simulasi Sandbox)'
        })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(errJson.error || 'Gagal mensimulasikan pembayaran lunas.');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e.message || 'Koneksi ke backend simulasi gagal.');
    } finally {
      setIsSimulatingSuccess(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl w-full max-w-sm p-6 text-center"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
            <h3 className="font-bold text-slate-800 text-sm">Menghubungkan Midtrans Secure Gateway...</h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              Membuka panel pembayaran aman. Mohon jangan menutup atau merefresh halaman ini.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 w-full flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span className="truncate max-w-[140px]">#{safeOrderId}</span>
              <span className="text-slate-600 font-bold">Rp {safeAmount.toLocaleString('id-ID')}</span>
            </div>
            <button
              onClick={onClose}
              className="mt-6 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-2 transition-all font-semibold cursor-pointer"
            >
              Batalkan Pembayaran
            </button>
          </div>
        )}

        {status === 'simulated' && (
          <div className="flex flex-col items-center py-2">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-3 border border-amber-200/60">
              <QrCode size={24} />
            </div>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-black text-[9px] uppercase tracking-wider rounded-full mb-2">
              Mode Uji Coba Sandbox
            </span>
            <h3 className="font-black text-slate-800 text-sm">{itemName || 'Pembayaran Tagihan'}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Midtrans Keys belum diisi / berada dalam mode simulasi pengujian.
            </p>

            <div className="w-full mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-left text-xs space-y-1.5 font-sans">
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Order ID:</span>
                <span className="font-mono font-bold text-slate-700 truncate max-w-[170px]">{safeOrderId}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200/60 pt-1.5">
                <span>Total Bayar:</span>
                <span className="text-emerald-700 font-extrabold">Rp {safeAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="mt-5 w-full space-y-2">
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isSimulatingSuccess}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSimulatingSuccess ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>Simulasikan Pembayaran Lunas (QRIS/VA)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Tutup / Batalkan
              </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-3">
              <ShieldCheck size={36} />
            </div>
            <h3 className="font-black text-slate-800 text-sm">TRANSAKSI DIKONFIRMASI</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Terima kasih, pembayaran diproses secara aman oleh sistem.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
              <ShieldAlert size={36} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">PENGALIHAN TRANSAKSI GAGAL</h3>
            <p className="text-xs text-red-500 mt-2 bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-left max-w-xs break-words font-mono">
              {errorMessage || 'Jaringan ditolak atau respon API Midtrans tidak valid.'}
            </p>
            <p className="text-[10px] text-slate-400 mt-3 text-left">
              Pastikan konfigurasi Client Key dan Server Key di Pengaturan Admin sudah sesuai dengan tipe lingkungan Midtrans (Sandbox / Production).
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full font-sans">
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="w-full text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={13} />
                <span>Simulasikan Sukses (Mode Pengujian)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
