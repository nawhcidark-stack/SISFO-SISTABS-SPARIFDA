import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, QrCode, Building, ShieldCheck, Loader2, CheckCircle2, ArrowRight, Wallet, ReceiptText, ShieldAlert } from 'lucide-react';

interface MidtransPayModalProps {
  isOpen: boolean;
  token: string | null;
  orderId: string | null;
  amount: number;
  itemName: string;
  isSimulated: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export default function MidtransPayModal({
  isOpen,
  token,
  orderId,
  amount,
  itemName,
  isSimulated,
  onSuccess,
  onClose
}: MidtransPayModalProps) {
  const [payMethod, setPayMethod] = useState<'gopay' | 'va' | 'card' | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('BCA');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [timerCount, setTimerCount] = useState(5);

  // Trigger real Midtrans Snap Popup if NOT simulated and snap is loaded
  useEffect(() => {
    if (isOpen && token && !isSimulated && (window as any).snap) {
      try {
        (window as any).snap.pay(token, {
          onSuccess: function (result: any) {
            console.log('Midtrans Snap Success:', result);
            // Notify server of success if it hasn't handled it yet.
            // Note that webhooks will also handle this in absolute prod, but this ensures instant local sync!
            fetch('/api/simulate-payment-success', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, paymentType: 'Midtrans Snap' })
            }).then(() => {
              onSuccess();
            });
          },
          onPending: function (result: any) {
            console.log('Midtrans Snap Pending:', result);
            alert('Pembayaran ditunda (Pending). Silakan cek instruksi pembayaran Midtrans.');
            onClose();
          },
          onError: function (result: any) {
            console.error('Midtrans Snap Error:', result);
            alert('Terjadi kesalahan pembayaran Midtrans Snap.');
            onClose();
          },
          onClose: function () {
            console.log('Midtrans Snap closed by user');
            onClose();
          }
        });
      } catch (err) {
        console.error('Failed to open native Midtrans Snap UI', err);
      }
    }
  }, [isOpen, token, isSimulated, orderId]);

  if (!isOpen) return null;

  // Handle local payment simulation actions
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    let pType = 'Simulator';
    if (payMethod === 'gopay') pType = 'GoPay';
    if (payMethod === 'va') pType = `${selectedBank} VA`;
    if (payMethod === 'card') pType = 'Kartu Kredit';

    try {
      const response = await fetch('/api/simulate-payment-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentType: pType
        })
      });

      if (!response.ok) {
        throw new Error('Gagal memproses transaksi simulasi.');
      }

      const resData = await response.json();
      if (resData.success) {
        setStatus('success');
        // Countdown to close
        let count = 3;
        const interval = setInterval(() => {
          count -= 1;
          setTimerCount(count);
          if (count <= 0) {
            clearInterval(interval);
            onSuccess();
          }
        }, 800);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
      >
        {/* Header (Midtrans Brand Header) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500 text-slate-900 font-bold font-mono text-xs">
              M
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight">midtrans</span>
              <span className="text-[10px] text-amber-400 block -mt-1 font-semibold">SANDBOX EMULATOR</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xs font-mono border border-slate-700 px-2 py-1 rounded"
          >
            Batal
          </button>
        </div>

        {/* Transaction Summary */}
        <div className="bg-slate-50 border-b border-slate-100 p-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono tracking-wider">Item Pembayaran</span>
              <p className="text-slate-800 font-medium text-sm truncate">{itemName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono tracking-wider">Total</span>
              <p className="text-emerald-600 font-bold text-sm">Rp {amount.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-200/50 text-[11px] text-slate-500 font-mono">
            <span>#{orderId}</span>
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck size={12} /> SSL 256-bit Secure
            </span>
          </div>
        </div>

        {/* Dynamic Sandbox body */}
        <div className="flex-1 overflow-y-auto p-4">
          {status === 'idle' && (
            <div>
              <p className="text-xs text-slate-500 mb-3 font-medium">
                Pilih metode pembayaran (Simulasi Pembayaran Midtrans):
              </p>

              <div className="flex flex-col gap-2">
                {/* GoPay */}
                <button
                  id="pay-method-gopay"
                  onClick={() => setPayMethod('gopay')}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    payMethod === 'gopay'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <QrCode size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800">GoPay / QRIS</h4>
                      <p className="text-[10px] text-slate-400">Bayar instan pakai QR Code OVO, ShopeePay, GoPay</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className={payMethod === 'gopay' ? 'text-emerald-600' : 'text-slate-400'} />
                </button>

                {/* Bank Transfer VA */}
                <button
                  id="pay-method-va"
                  onClick={() => setPayMethod('va')}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    payMethod === 'va'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Building size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800">Transfer Bank Virtual Account</h4>
                      <p className="text-[10px] text-slate-400">Bayar otomatis beralih otomatis (BCA, Mandiri, BNI)</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className={payMethod === 'va' ? 'text-emerald-600' : 'text-slate-400'} />
                </button>

                {/* Credit Card */}
                <button
                  id="pay-method-card"
                  onClick={() => setPayMethod('card')}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    payMethod === 'card'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800">Kartu Kredit / Visa / Mastercard</h4>
                      <p className="text-[10px] text-slate-400">Bayar instan cicilan / bayar penuh kartu standard</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className={payMethod === 'card' ? 'text-emerald-600' : 'text-slate-400'} />
                </button>
              </div>

              {/* Sub-form details */}
              <AnimatePresence mode="wait">
                {payMethod === 'gopay' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 border border-blue-100 bg-blue-50/30 rounded-xl flex flex-col items-center gap-3 text-center overflow-hidden"
                  >
                    <div className="bg-white p-3 rounded-lg border border-slate-200/50 shadow-sm shadow-blue-100">
                      <QrCode size={110} className="text-slate-800" />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">Scan QR Code diatas</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Buka aplikasi E-wallet favorit Anda untuk bayar cepat</p>
                    </div>
                    <form onSubmit={handlePaymentSubmit} className="w-full">
                      <button
                        type="submit"
                        id="submit-pay-gopay"
                        className="w-full bg-slate-900 text-white font-medium text-xs py-2.5 px-4 rounded-lg hover:bg-slate-800 transition-colors shadow flex items-center justify-center gap-2"
                      >
                        <Wallet size={14} /> Simulasikan Berhasil Bayar Rp {amount.toLocaleString('id-ID')}
                      </button>
                    </form>
                  </motion.div>
                )}

                {payMethod === 'va' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 border border-purple-100 bg-purple-50/30 rounded-xl overflow-hidden"
                  >
                    <label className="block text-[10px] text-purple-700 uppercase font-bold tracking-wider mb-2">Pilih Bank</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {['BCA', 'BNI', 'MANDIRI'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setSelectedBank(b)}
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                            selectedBank === b
                              ? 'border-purple-600 bg-purple-600/10 text-purple-700'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-100 text-center font-mono my-3 shadow-inner">
                      <span className="text-[9px] text-slate-400 block uppercase font-sans font-semibold tracking-wider">No. Rek Virtual Account</span>
                      <strong className="text-slate-800 text-sm">881239088{orderId?.replace(/[^0-9]/g, '').slice(0, 4) || '9231'}</strong>
                    </div>

                    <form onSubmit={handlePaymentSubmit}>
                      <button
                        type="submit"
                        id="submit-pay-va"
                        className="w-full bg-slate-900 text-white font-medium text-xs py-2.5 px-4 rounded-lg hover:bg-slate-800 transition-colors shadow flex items-center justify-center gap-2"
                      >
                        <ReceiptText size={14} /> Simulasikan Transfer Lunas
                      </button>
                    </form>
                  </motion.div>
                )}

                {payMethod === 'card' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 border border-orange-100 bg-orange-50/30 rounded-xl overflow-hidden"
                  >
                    <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Nomor Kartu Kredit</label>
                        <input
                          type="text"
                          required
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 19))}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Berlaku S/D</label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, '').slice(0, 5))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">CVV</label>
                          <input
                            type="password"
                            required
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        id="submit-pay-card"
                        className="w-full bg-slate-900 text-white font-medium text-xs py-2.5 px-4 rounded-lg hover:bg-slate-800 transition-colors shadow flex items-center justify-center gap-2 mt-2"
                      >
                        <CreditCard size={14} /> Simulasikan Transaksi Kartu
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="animate-spin text-emerald-600 mb-4" size={42} />
              <h3 className="font-semibold text-slate-800 text-sm">Menghubungi Server Midtrans...</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                Dokumen SSL aman dienkripsi. Mohon tidak menutup halaman ini.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="text-emerald-500 mb-4" size={48} />
              <h3 className="font-bold text-slate-800 text-sm">TRANSAKSI BERHASIL!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                Notifikasi instan real-time telah dikirim menggunakan Server-Sent Events (SSE) ke semua wali murid dan admin sekolah.
              </p>
              <div className="mt-6 px-4 py-2 rounded-full bg-slate-100 text-[10px] font-mono text-slate-500">
                Menutup otomatis dalam {timerCount} detik...
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-red-600">
              <ShieldAlert className="mb-4" size={48} />
              <h3 className="font-bold text-sm">TRANSAKSI GAGAL</h3>
              <p className="text-xs text-slate-500 mt-1">
                Kunci Server salah atau gagal terhubung ke proxy bayar Midtrans.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-6 border border-red-500 text-red-500 hover:bg-red-50 py-2 px-4 rounded-lg text-xs font-semibold"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        {/* Foot lock */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-center gap-2">
          <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
            🛡️ DIENKRIPSI DAN AMANKAN OLEH MIDTRANS SANDBOX
          </span>
        </div>
      </motion.div>
    </div>
  );
}
