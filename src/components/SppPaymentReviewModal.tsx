import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SppBill } from '../types';
import { ShieldCheck, Info, X, ChevronRight, Calculator } from 'lucide-react';

interface SppPaymentReviewModalProps {
  isOpen: boolean;
  bill: SppBill | null;
  depositAmount?: number | null;
  studentName: string;
  studentNis: string;
  studentClass: string;
  midtransStatus: {
    merchantId: string;
    clientKey: string;
    hasServerKey: boolean;
    isProduction: boolean;
    isDisabled?: boolean;
    adminFee?: number;
    systemMaintenanceFee?: number;
    chargeFeesToUser?: boolean;
  } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SppPaymentReviewModal({
  isOpen,
  bill,
  depositAmount = null,
  studentName,
  studentNis,
  studentClass,
  midtransStatus,
  onCancel,
  onConfirm,
}: SppPaymentReviewModalProps) {
  if (!isOpen || (!bill && !depositAmount)) return null;

  const isDeposit = !bill && depositAmount ? true : false;
  const baseAmount = isDeposit ? (depositAmount || 0) : (bill?.amount || 0);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-white m-0">Review Rincian Pembayaran</h3>
                <p className="text-[10px] text-slate-450 font-bold block">Konfirmasikan rincian tagihan Anda sebelum melakukan checkout</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body Content - Student Profile & Bill Amount ONLY */}
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
            {/* Profil Pembayar Card */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                <span className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Profil Pembayar</span>
                <span className="text-[9.5px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 font-mono">SISWA</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Nama Lengkap</span>
                  <span className="font-extrabold text-slate-850 leading-tight block mt-0.5">{studentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">NIS</span>
                  <span className="font-extrabold text-slate-850 leading-tight block mt-0.5 font-mono">{studentNis}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Kelas / Level</span>
                  <span className="font-extrabold text-slate-850 leading-tight block mt-0.5">{studentClass}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {isDeposit ? 'Jenis Transaksi' : 'Periode SPP'}
                  </span>
                  <span className="font-bold text-emerald-700 leading-tight block mt-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 max-w-max uppercase tracking-wider font-mono">
                    {isDeposit ? 'SETORAN TABUNGAN' : bill ? `${bill.month} ${bill.year}` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Nominal Yang Akan Dibayarkan */}
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-extrabold text-xs text-indigo-950 uppercase tracking-wide">Nominal Pembayaran</span>
                <span className="text-[10px] text-indigo-700 font-medium">Jumlah nilai pokok yang akan disetor</span>
              </div>
              <span className="font-black text-lg text-indigo-700 font-mono">{formatIDR(baseAmount)}</span>
            </div>

            {/* Temporary Disabled Warning */}
            {midtransStatus?.isDisabled && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-150 text-[11px] text-rose-900 leading-relaxed font-sans flex gap-2 items-start shrink-0">
                <Info size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-rose-950">Pembayaran Online Dinonaktifkan Sementara</span>
                  <p className="m-0 text-rose-800 font-medium mt-0.5">Gerbang pembayaran elektronik SMP Maarif NU Pandaan sedang dinonaktifkan sementara oleh Administrator. Silakan lakukan penyetoran tunai ke Teller sekolah.</p>
                </div>
              </div>
            )}

            {/* Safe Standard SSL Badge */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 text-[10px] text-slate-500 leading-relaxed font-sans flex gap-2 items-start shrink-0">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Keamanan Finansial Terjamin</span>
                <p className="m-0 text-slate-450 font-medium mt-0.5">Suku bunga, rekonsiliasi transfer, dan kuitansi elektronik diproses secara aman melalui standard integrasi terenkripsi Midtrans.</p>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            {midtransStatus?.isDisabled && (
              <div className="mr-auto text-[10px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 flex items-center gap-1.5 animate-pulse uppercase tracking-wider font-mono">
                ⚠️ GERBANG NONAKTIF
              </div>
            )}
            <button
              onClick={onCancel}
              className="px-4 py-2.5 font-bold rounded-xl text-xs hover:bg-slate-100 text-slate-700 border border-slate-250 transition-all cursor-pointer bg-white shadow-xs font-semibold"
            >
              Batalkan
            </button>
            <button
              onClick={onConfirm}
              disabled={!!midtransStatus?.isDisabled}
              className="px-5 py-2.5 font-black rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white shadow-md disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {midtransStatus?.isDisabled ? "Pembayaran Nonaktif" : <>Lanjutkan ke Pembayaran <ChevronRight size={14} /></>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
