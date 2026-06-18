import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SppBill } from '../types';
import { ShieldCheck, Info, X, CreditCard, ChevronRight, Calculator, Check, Building, Smartphone, Store } from 'lucide-react';

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

  // Extract rates and configurations
  const isDeposit = !bill && depositAmount ? true : false;
  const baseAmount = isDeposit ? (depositAmount || 0) : (bill?.amount || 0);
  const adminPG = midtransStatus?.adminFee !== undefined ? midtransStatus.adminFee : 4000;

  // Internal state to dynamically preview different payment methods inside Midtrans gateway
  const [selectedMethodId, setSelectedMethodId] = useState<'va' | 'qris' | 'retail' | 'cc'>('va');

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Define details for each payment channel
  const vaFee = adminPG;
  const qrisFee = Math.round(baseAmount * 0.007);
  const retailFee = 5000;
  const ccFee = Math.round(baseAmount * 0.029 + 2000);

  const paymentMethods = [
    {
      id: 'va' as const,
      name: 'Virtual Account',
      provider: 'Transfer Bank (BRI, BNI, Mandiri, Permata)',
      icon: Building,
      badge: 'Biasa Digunakan',
      feeLabel: `${formatIDR(vaFee)}`,
      feeValue: vaFee,
      formula: `Rp 0 (0% tarif persentase) + ${formatIDR(vaFee)} flat`,
      explanation: `${formatIDR(baseAmount)} + (0% + ${formatIDR(vaFee)})`,
    },
    {
      id: 'qris' as const,
      name: 'QRIS / E-Wallet',
      provider: 'GoPay, ShopeePay, OVO, Dana, LinkAja',
      icon: Smartphone,
      badge: 'Hemat / Instan',
      feeLabel: `0.7% (${formatIDR(qrisFee)})`,
      feeValue: qrisFee,
      formula: `0.7% x ${formatIDR(baseAmount)} (biaya persentase)`,
      explanation: `${formatIDR(baseAmount)} + (0.7% x ${formatIDR(baseAmount)})`,
    },
    {
      id: 'retail' as const,
      name: 'Gerai Ritel',
      provider: 'Pembayaran Kasir Alfamart / Indomaret',
      icon: Store,
      badge: 'Loket Ritel',
      feeLabel: `${formatIDR(retailFee)}`,
      feeValue: retailFee,
      formula: `Rp 0 (0% tarif persentase) + ${formatIDR(retailFee)} flat`,
      explanation: `${formatIDR(baseAmount)} + (0% + ${formatIDR(retailFee)})`,
    },
    {
      id: 'cc' as const,
      name: 'Kartu Kredit / Debit',
      provider: 'Kartu Visa / Mastercard / JCB Online',
      icon: CreditCard,
      badge: 'Global Card',
      feeLabel: `2.9% + ${formatIDR(2000)} (${formatIDR(ccFee)})`,
      feeValue: ccFee,
      formula: `(2.9% x ${formatIDR(baseAmount)}) + ${formatIDR(2000)} flat`,
      explanation: `${formatIDR(baseAmount)} + (2.9% x ${formatIDR(baseAmount)} + ${formatIDR(2000)})`,
    }
  ];

  const currentActiveMethod = paymentMethods.find(m => m.id === selectedMethodId) || paymentMethods[0];
  const activeGrandTotal = baseAmount + currentActiveMethod.feeValue;


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
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {isDeposit ? 'Jenis Transaksi' : 'Periode SPP'}
                  </span>
                  <span className="font-bold text-emerald-700 leading-tight block mt-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 max-w-max uppercase tracking-wider font-mono">
                    {isDeposit ? 'SETORAN TABUNGAN' : bill ? `${bill.month} ${bill.year}` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Breakdown Details */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black text-slate-450 uppercase font-mono tracking-wider">Komponen & Metode Pembayaran</h4>

              <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs bg-white flex flex-col divide-y divide-slate-150">
                {/* 1. SPP / Tabungan */}
                <div className="p-3.5 flex justify-between items-center transition-all bg-white hover:bg-slate-50/40">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-805">
                      {isDeposit ? 'Nominal Dana Tabungan' : 'Nominal SPP Pokok'}
                    </span>
                    <span className="text-[10px] text-slate-450 font-medium">
                      {isDeposit ? 'Iuran pengisian buku tabungan siswa' : 'Iuran pendidikan pokok wajib sekolah'}
                    </span>
                  </div>
                  <span className="font-black text-xs text-slate-800 font-mono">{formatIDR(baseAmount)}</span>
                </div>

                {/* 2. Interactive Payment Channel Selection (Percentage vs Flat explanations) */}
                <div className="p-3.5 bg-slate-50/40 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-extrabold text-xs text-indigo-950">Biaya Administrasi Gerbang Pembayaran</span>
                    <span className="text-[10px] text-slate-500 font-medium font-sans">
                      PILIH SIMULASI METODE PEMBAYARAN DI BAWAH INI UNTUK MELIHAT PERHITUNGAN PERSENTASE:
                    </span>
                  </div>

                  {/* Horizontal/Grid Channel Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => {
                      const IconComponent = method.icon;
                      const isSelected = selectedMethodId === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-left transition-all cursor-pointer relative select-none ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs ring-1 ring-indigo-300'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full justify-between">
                            <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                              <IconComponent size={14} />
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] font-black leading-tight mt-1">{method.name}</span>
                          <span className="text-[9.5px] text-slate-450 leading-none truncate w-full mt-0.5">{method.provider}</span>
                          <div className="mt-1 flex items-center justify-between w-full border-t border-slate-150/40 pt-1.5">
                            <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider">{method.badge}</span>
                            <span className="text-[10px] font-black text-slate-800 font-mono">{method.feeLabel}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Math Formula / Breakdown Explanations Banner */}
                  <div className="p-3.5 rounded-2xl bg-indigo-950 text-indigo-100 border border-indigo-900 flex flex-col gap-2.5 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-indigo-900 pb-2">
                      <span className="text-[8.5px] bg-indigo-800 text-indigo-200 font-black px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Rumus Tarif {currentActiveMethod.name}</span>
                      <span className="text-[10px] font-bold text-indigo-300">{currentActiveMethod.formula}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {/* Step 1: Percentage Calculation */}
                      <div className="flex justify-between items-start text-[10.5px]">
                        <span className="text-indigo-300 font-medium">1. Perhitungan Biaya Admin:</span>
                        <div className="text-right">
                          <span className="font-black font-mono text-white block">{formatIDR(currentActiveMethod.feeValue)}</span>
                          <span className="text-[8.5px] text-indigo-300 block italic font-mono">{currentActiveMethod.formula}</span>
                        </div>
                      </div>

                      <div className="h-px bg-indigo-900" />

                      {/* Step 2: Multiplication Matrix Equation */}
                      <div className="flex flex-col gap-1 text-[10px] bg-indigo-900/55 p-2 rounded-lg border border-indigo-850">
                        <span className="text-indigo-300 font-extrabold uppercase tracking-wide text-[8px] block">Persamaan Matematika Riil:</span>
                        <div className="font-mono text-white font-bold leading-relaxed whitespace-pre-wrap">
                          {isDeposit ? 'Nominal Tabungan' : 'Nominal SPP Pokok'} + Biaya Admin = Total Akhir
                          <div className="text-emerald-300 mt-1 flex flex-wrap gap-1 items-center">
                            <span>{formatIDR(baseAmount)}</span>
                            <span>+</span>
                            <span>{formatIDR(currentActiveMethod.feeValue)}</span>
                            <span>=</span>
                            <span className="bg-emerald-900 text-emerald-200 px-1 py-0.2 rounded font-black text-[11px]">{formatIDR(activeGrandTotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Load Relative Ratio */}
                      <div className="flex justify-between items-center text-[9.5px] text-indigo-200 font-medium">
                        <span>Proporsi Rasio Beban Admin terhadap Pokok:</span>
                        <span className="font-bold text-white bg-indigo-900 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          +{((currentActiveMethod.feeValue / baseAmount) * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="p-4 flex justify-between items-center bg-slate-50">
                  <div className="flex flex-col">
                    <span className="font-black text-xs text-slate-900 uppercase tracking-wide">Total Pembayaran</span>
                    <span className="text-[9.5px] text-slate-450 font-bold">Harga final siap ditransaksikan</span>
                  </div>
                  <span className="font-black text-base text-indigo-700 font-mono">{formatIDR(activeGrandTotal)}</span>
                </div>
              </div>
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
            {midtransStatus?.isDisabled && (
              <div className="mr-auto text-[10px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 flex items-center gap-1.5 animate-pulse uppercase tracking-wider font-mono">
                ⚠️ GERBANG NONAKTIF
              </div>
            )}
            <button
              onClick={onCancel}
              className="px-4 py-2.5 font-bold rounded-xl text-xs hover:bg-slate-100 text-slate-700 border border-slate-250 transition-all cursor-pointer bg-white shadow-xs"
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
