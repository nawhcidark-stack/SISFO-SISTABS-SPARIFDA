import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SppBill } from '../types';
import { ShieldCheck, Info, X, CreditCard, ChevronRight, Calculator } from 'lucide-react';

interface SppPaymentReviewModalProps {
  isOpen: boolean;
  bill: SppBill | null;
  studentName: string;
  studentNis: string;
  studentClass: string;
  midtransStatus: {
    merchantId: string;
    clientKey: string;
    hasServerKey: boolean;
    isProduction: boolean;
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
  studentName,
  studentNis,
  studentClass,
  midtransStatus,
  onCancel,
  onConfirm,
}: SppPaymentReviewModalProps) {
  if (!isOpen || !bill) return null;

  // Extract rates and configurations
  const baseSpp = bill.amount;
  const adminPG = midtransStatus?.adminFee !== undefined ? midtransStatus.adminFee : 4000;
  
  const grandTotal = baseSpp + adminPG;

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
                <p className="text-[10px] text-slate-400 font-bold block">Konfirmasikan rincian tagihan Anda sebelum melakukan checkout</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Student Profile & Bill Summary Info Card */}
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                <span className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Profil Pembayar</span>
                <span className="text-[9.5px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 font-mono">SISWA</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Nama Lengkap</span>
                  <span className="font-extrabold text-slate-800 leading-tight block mt-0.5">{studentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">NIS</span>
                  <span className="font-extrabold text-slate-800 leading-tight block mt-0.5 font-mono">{studentNis}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Kelas / Level</span>
                  <span className="font-extrabold text-slate-800 leading-tight block mt-0.5">{studentClass}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Periode SPP</span>
                  <span className="font-bold text-emerald-700 leading-tight block mt-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 max-w-max uppercase tracking-wide">
                    {bill.month} {bill.year}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Breakdown Details */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black text-slate-450 uppercase font-mono tracking-wider">Rincian Komponen Biaya</h4>

              <div className="border border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs bg-white">
                {/* 1. SPP */}
                <div className="p-3.5 flex justify-between items-center transition-all bg-white hover:bg-slate-50/40">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-850">SPP Bulanan</span>
                    <span className="text-[10px] text-slate-450 font-medium">Iuran pendidikan wajib sekolah</span>
                  </div>
                  <span className="font-black text-xs text-slate-800 font-mono">{formatIDR(baseSpp)}</span>
                </div>

                {/* 2. Admin Payment Gateway */}
                <div className="p-3.5 flex justify-between items-center transition-all bg-white hover:bg-slate-50/40">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-850">Admin Payment Gateway</span>
                    <span className="text-[10px] text-slate-450 font-medium">Biaya jasa gerbang finansial Midtrans</span>
                  </div>
                  <span className="font-black text-xs text-slate-800 font-mono">{formatIDR(adminPG)}</span>
                </div>

                {/* Grand Total */}
                <div className="p-4 flex justify-between items-center bg-slate-50 border-t border-slate-200">
                  <div className="flex flex-col">
                    <span className="font-black text-xs text-slate-900 uppercase tracking-wide">Total Pembayaran</span>
                    <span className="text-[9.5px] text-slate-450 font-bold">Harga final untuk ditransaksikan</span>
                  </div>
                  <span className="font-black text-sm text-indigo-700 font-mono">{formatIDR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* SSL Safe Badge */}
            <div className="p-3 rounded-lg bg-indigo-50/30 border border-indigo-150 text-[10px] text-indigo-800 leading-relaxed font-sans flex gap-2 items-start shrink-0">
              <Info size={14} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Keamanan Finansial Terjamin</span>
                <p className="m-0 text-slate-500 font-medium mt-0.5">Sistem review ini menjamin transparansi iuran sesuai kesepakatan sekolah. Transaksi dilindungi enkripsi bank standar 256-bit SSL melalui Midtrans.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 font-bold rounded-xl text-xs hover:bg-slate-100 text-slate-700 border border-slate-250 transition-all cursor-pointer bg-white shadow-xs"
            >
              Batalkan
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2.5 font-black rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 transition-all cursor-pointer flex items-center gap-1.5"
            >
              Lanjutkan ke Pembayaran <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
