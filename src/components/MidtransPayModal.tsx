import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

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
  amount,
  itemName,
  isProduction = false,
  clientKey = '',
  onSuccess,
  onClose
}: MidtransPayModalProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;

    setStatus('loading');
    setErrorMessage(null);

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
              body: JSON.stringify({ orderId, paymentType: result?.payment_type || 'Midtrans Snap' })
            })
              .then(() => {
                onSuccess();
              })
              .catch((err) => {
                console.error('Local verification sync failed:', err);
                onSuccess(); // still succeed since Midtrans already authorized successfully
              });
          },
          onPending: function (result: any) {
            console.log('Midtrans Snap Payment Pending:', result);
            alert('Pembayaran tertunda (Pending). Harap selesaikan pembayaran sesuai petunjuk.');
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

    // Remove any alternate snap script to avoid environment pollution (e.g., loading sandbox token with production script or vice versa)
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
  }, [isOpen, token, isProduction, clientKey, orderId]);

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
              <span>#{orderId}</span>
              <span className="text-slate-600 font-bold">Rp {amount.toLocaleString('id-ID')}</span>
            </div>
            <button
              onClick={onClose}
              className="mt-6 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-2 transition-all font-semibold"
            >
              Batalkan Pembayaran
            </button>
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
          <div className="flex flex-col items-center py-6">
            <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3 animate-bounce">
              <ShieldAlert size={36} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">PENGALIHAN TRANSAKSI GAGAL</h3>
            <p className="text-xs text-red-500 mt-2 bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-left max-w-xs break-words font-mono">
              {errorMessage || 'Jaringan ditolak atau respon API Midtrans tidak valid.'}
            </p>
            <p className="text-[10px] text-slate-400 mt-3 text-left">
              Pastikan konfigurasi Client Key dan Server Key (Production/Sandbox) di Panel Pengaturan Admin sudah diatur dengan benar dan sesuai lingkungan (Sandbox / Production).
            </p>
            <div className="mt-6 flex justify-center gap-2 w-full font-sans">
              <button
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
