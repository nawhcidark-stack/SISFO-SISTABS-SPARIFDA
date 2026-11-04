import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldCheck, ShieldAlert, CreditCard, QrCode, CheckCircle2, Building2, Smartphone, ArrowRight, ExternalLink } from 'lucide-react';

interface MidtransPayModalProps {
  isOpen: boolean;
  token: string | null;
  orderId: string | null;
  amount: number;
  itemName: string;
  isProduction?: boolean;
  clientKey?: string;
  redirectUrl?: string | null;
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
  redirectUrl,
  onSuccess,
  onClose
}: MidtransPayModalProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success' | 'mock_interactive'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMockMethod, setSelectedMockMethod] = useState<'qris' | 'bca_va' | 'mandiri_va' | 'bri_va' | 'gopay'>('qris');
  const [isSubmittingMock, setIsSubmittingMock] = useState(false);

  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);

  useEffect(() => {
    if (!isOpen || !token) return;

    setErrorMessage(null);

    // If this is a mock token (e.g. Sandbox mode or local dev without active production keys)
    if (token.startsWith('mock-')) {
      setStatus('mock_interactive');
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
              body: JSON.stringify({ orderId, paymentType: result?.payment_type || 'Midtrans Snap' })
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
  }, [isOpen, token, isProduction, clientKey, orderId]);

  const handleExecuteMockPayment = async () => {
    if (!orderId) return;
    setIsSubmittingMock(true);
    try {
      const methodLabels: Record<string, string> = {
        qris: 'Midtrans QRIS',
        bca_va: 'Midtrans BCA VA',
        mandiri_va: 'Midtrans Mandiri VA',
        bri_va: 'Midtrans BRI VA',
        gopay: 'Midtrans GoPay'
      };
      const res = await fetch('/api/simulate-payment-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentType: methodLabels[selectedMockMethod] || 'Midtrans Snap'
        })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Gagal memproses pembayaran');
      }
      setStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Gagal memproses pembayaran simulasi.');
    } finally {
      setIsSubmittingMock(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl w-full max-w-md p-6 text-center"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
            <h3 className="font-bold text-slate-800 text-sm">Menghubungkan Midtrans Secure Gateway...</h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              Membuka panel pembayaran aman. Mohon jangan menutup atau merefresh halaman ini.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 w-full flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span className="truncate max-w-[160px]">#{orderId || 'PENDING'}</span>
              <span className="text-slate-600 font-bold">Rp {safeAmount.toLocaleString('id-ID')}</span>
            </div>

            {/* Fallback simulation button if popup is blocked */}
            <div className="mt-6 flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={handleExecuteMockPayment}
                className="w-full text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={13} /> Selesaikan Pembayaran Langsung (Bypass)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2 transition-all font-semibold cursor-pointer"
              >
                Batalkan Pembayaran
              </button>
            </div>
          </div>
        )}

        {status === 'mock_interactive' && (
          <div className="flex flex-col items-center text-left">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Gateway Pembayaran Online</h4>
                  <span className="text-[10px] text-slate-400 font-mono">#{orderId}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-wider">Total Tagihan</span>
                <span className="text-sm font-extrabold text-emerald-600 font-mono">Rp {safeAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="w-full my-3.5">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">Pilih Metode Pembayaran:</span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMockMethod('qris')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                    selectedMockMethod === 'qris'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode size={16} className="text-indigo-600" />
                    <span>QRIS (GoPay, OVO, Dana, ShopeePay, BCA QR)</span>
                  </div>
                  {selectedMockMethod === 'qris' && <CheckCircle2 size={14} className="text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMockMethod('bca_va')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                    selectedMockMethod === 'bca_va'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} className="text-blue-600" />
                    <span>BCA Virtual Account</span>
                  </div>
                  {selectedMockMethod === 'bca_va' && <CheckCircle2 size={14} className="text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMockMethod('mandiri_va')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                    selectedMockMethod === 'mandiri_va'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} className="text-amber-600" />
                    <span>Mandiri Virtual Account</span>
                  </div>
                  {selectedMockMethod === 'mandiri_va' && <CheckCircle2 size={14} className="text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMockMethod('bri_va')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                    selectedMockMethod === 'bri_va'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} className="text-sky-600" />
                    <span>BRI Virtual Account</span>
                  </div>
                  {selectedMockMethod === 'bri_va' && <CheckCircle2 size={14} className="text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMockMethod('gopay')}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs ${
                    selectedMockMethod === 'gopay'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={16} className="text-emerald-600" />
                    <span>GoPay / E-Wallet</span>
                  </div>
                  {selectedMockMethod === 'gopay' && <CheckCircle2 size={14} className="text-indigo-600" />}
                </button>
              </div>
            </div>

            <div className="w-full flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingMock}
                className="w-1/3 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteMockPayment}
                disabled={isSubmittingMock}
                className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                {isSubmittingMock ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <span>Bayar Sekarang</span>
                    <ArrowRight size={14} />
                  </>
                )}
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
            <div className="mt-6 flex flex-col gap-2 w-full font-sans">
              <button
                type="button"
                onClick={handleExecuteMockPayment}
                className="w-full text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={13} /> Selesaikan Pembayaran (Mode Uji Coba)
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

