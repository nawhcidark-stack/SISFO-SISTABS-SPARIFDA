import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { Student, SppBill, MiscBill, SavingsTransaction } from '../types';

export interface StudentFinancialSummary {
  paidMonthsText: string;
  paidMonthsCount: number;
  endingSavingsBalance: number;
  totalOutstandingMisc: number;
  unpaidMiscCount: number;
  unpaidMiscTitles: string;
  studentNis: string;
}

export function getStudentFinancialSummary({
  student,
  bills = [],
  miscBills = [],
  allStudents = [],
  currentReceipt,
}: {
  student: Student;
  bills?: SppBill[];
  miscBills?: MiscBill[];
  allStudents?: Student[];
  currentReceipt?: {
    type: string;
    detail: any;
  } | null;
}): StudentFinancialSummary {
  // 1. List bulan SPP Lunas (bulan dipisahkan koma)
  const ACADEMIC_MONTH_ORDER: Record<string, number> = {
    Juli: 1,
    Agustus: 2,
    September: 3,
    Oktober: 4,
    November: 5,
    Desember: 6,
    Januari: 7,
    Februari: 8,
    Maret: 9,
    April: 10,
    Mei: 11,
    Juni: 12,
  };

  const matchedStudent =
    (allStudents || []).find((s) => s.id === student?.id || (student?.nis && s.nis === student.nis)) || student;

  const studentIds = new Set<string>();
  if (student?.id) studentIds.add(String(student.id));
  if (student?.nis) studentIds.add(String(student.nis));
  if (matchedStudent?.id) studentIds.add(String(matchedStudent.id));
  if (matchedStudent?.nis) studentIds.add(String(matchedStudent.nis));

  const studentSppBills = (bills || []).filter(
    (b) => studentIds.has(String(b.studentId)) || b.studentId === student?.id
  );

  // Identify paid bills (or bill in active receipt being printed)
  const paidBills = studentSppBills.filter((b) => {
    if (b.status === 'paid' || b.paidAt) return true;
    if (
      currentReceipt?.type === 'spp' &&
      (currentReceipt.detail?.id === b.id ||
        (currentReceipt.detail?.month === b.month && currentReceipt.detail?.year === b.year))
    ) {
      return true;
    }
    if (currentReceipt?.type === 'consolidated' && currentReceipt.detail?.items) {
      if (currentReceipt.detail.items.some((it: any) => it.billId === b.id || it.id === b.id)) {
        return true;
      }
    }
    return false;
  });

  // Sort paid bills chronologically by academic cycle
  paidBills.sort((a, b) => {
    if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
    const orderA = ACADEMIC_MONTH_ORDER[a.month] || 0;
    const orderB = ACADEMIC_MONTH_ORDER[b.month] || 0;
    return orderA - orderB;
  });

  const uniqueYears = Array.from(new Set(paidBills.map((b) => b.year).filter(Boolean)));
  const multipleYears = uniqueYears.length > 1;

  let paidMonthStrings: string[] = paidBills.map((b) =>
    multipleYears && b.year ? `${b.month} ${b.year}` : b.month
  );

  // If current receipt is SPP and contains month not yet recorded
  if (currentReceipt?.type === 'spp' && currentReceipt.detail?.month) {
    const receiptMonthStr =
      multipleYears && currentReceipt.detail.year
        ? `${currentReceipt.detail.month} ${currentReceipt.detail.year}`
        : currentReceipt.detail.month;
    if (!paidMonthStrings.includes(receiptMonthStr)) {
      paidMonthStrings.push(receiptMonthStr);
    }
  }

  // Deduplicate while preserving chronological order
  paidMonthStrings = Array.from(new Set(paidMonthStrings));
  const paidMonthsText =
    paidMonthStrings.length > 0 ? paidMonthStrings.join(', ') : '- (Belum ada)';

  // 2. Saldo akhir tabungan
  let endingSavingsBalance = matchedStudent?.savingsBalance ?? student?.savingsBalance ?? 0;

  if (
    currentReceipt?.type === 'savings' &&
    typeof currentReceipt.detail?.balanceAfter === 'number'
  ) {
    endingSavingsBalance = currentReceipt.detail.balanceAfter;
  }

  // 3. Tunggakan lain-lain belum terbayar
  const studentMisc = (miscBills || []).filter(
    (b) => studentIds.has(String(b.studentId)) || (b.studentId && b.studentId === student?.id)
  );

  // Extract receipt payment date / today date (YYYY-MM-DD)
  const receiptDateStr = (() => {
    const raw =
      currentReceipt?.detail?.paidAt ||
      currentReceipt?.detail?.createdAt ||
      currentReceipt?.detail?.date ||
      currentReceipt?.detail?.time;
    if (raw) {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch {
        // fallback
      }
    }
    return new Date().toISOString().split('T')[0];
  })();
  const todayStr = new Date().toISOString().split('T')[0];

  // Identifikasi apakah pada hari itu (tanggal kuitansi atau hari ini) tunggakan dibayar
  // 1) Nota yang dicetak bertipe 'misc' (Pembayaran Lain-lain / pelunasan tunggakan)
  const isMiscReceipt = currentReceipt?.type === 'misc';

  // 2) Nota konsolidasi (keranjang/kolektif) yang memuat pembayaran tagihan lain-lain
  const isConsolidatedMisc =
    currentReceipt?.type === 'consolidated' &&
    Array.isArray(currentReceipt.detail?.items) &&
    currentReceipt.detail.items.some(
      (it: any) =>
        it.type === 'misc' ||
        (it.billId && String(it.billId).startsWith('misc')) ||
        (it.title && String(it.title).toLowerCase().includes('lain'))
    );

  // 3) Siswa memiliki tagihan lain-lain yang lunas dibayar pada hari itu
  const hasMiscPaidOnThatDay = studentMisc.some((b) => {
    if (b.status === 'paid' && b.paidAt) {
      try {
        const paidDate = new Date(b.paidAt).toISOString().split('T')[0];
        return paidDate === receiptDateStr || paidDate === todayStr;
      } catch {
        return false;
      }
    }
    return false;
  });

  const isTunggakanPaidToday = isMiscReceipt || isConsolidatedMisc || hasMiscPaidOnThatDay;

  let unpaidMisc = studentMisc.filter((b) => {
    if (
      currentReceipt?.type === 'misc' &&
      (currentReceipt.detail?.id === b.id || currentReceipt.detail?.billId === b.id)
    ) {
      return false; // Paid in this receipt
    }
    if (currentReceipt?.type === 'consolidated' && currentReceipt.detail?.items) {
      if (currentReceipt.detail.items.some((it: any) => it.billId === b.id || it.id === b.id)) {
        return false; // Paid in this consolidated receipt
      }
    }
    return b.status !== 'paid';
  });

  let totalOutstandingMisc = unpaidMisc.reduce((sum, b) => sum + (b.amount || 0), 0);
  let unpaidMiscTitles = unpaidMisc.map((b) => b.title).join(', ');

  // Instruksi Pengguna:
  // "untuk tunggakan pembayaran lain-lain pada nota, jika pada hari itu tunggakan dibayar, maka tunggakan otomatis 0/lunas/nihil"
  if (isTunggakanPaidToday) {
    totalOutstandingMisc = 0;
    unpaidMisc = [];
    unpaidMiscTitles = '';
  }

  return {
    paidMonthsText,
    paidMonthsCount: paidMonthStrings.length,
    endingSavingsBalance,
    totalOutstandingMisc,
    unpaidMiscCount: unpaidMisc.length,
    unpaidMiscTitles,
    studentNis: String(student?.nis || matchedStudent?.nis || ''),
  };
}

export function ReceiptQrCode({ nis, size = 80 }: { nis: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!nis) return;
    QRCode.toDataURL(String(nis), {
      margin: 1,
      width: size * 2, // Hi-DPI scaling for sharp thermal & standard print
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => console.error('Error generating receipt QR code:', err));

    return () => {
      isMounted = false;
    };
  }, [nis, size]);

  if (!qrUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[8px] font-mono text-slate-400"
      >
        QR...
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt={`QR Code NIS ${nis}`}
      style={{ width: size, height: size }}
      className="object-contain block"
      referrerPolicy="no-referrer"
    />
  );
}

interface ReceiptFinancialFooterProps {
  student: Student;
  bills?: SppBill[];
  miscBills?: MiscBill[];
  allStudents?: Student[];
  currentReceipt?: {
    type: string;
    detail: any;
  } | null;
  format: 'standard' | 'thermal';
}

export default function ReceiptFinancialFooter({
  student,
  bills = [],
  miscBills = [],
  allStudents = [],
  currentReceipt,
  format,
}: ReceiptFinancialFooterProps) {
  const summary = useMemo(() => {
    return getStudentFinancialSummary({
      student,
      bills,
      miscBills,
      allStudents,
      currentReceipt,
    });
  }, [student, bills, miscBills, allStudents, currentReceipt]);

  if (format === 'thermal') {
    return (
      <div className="border-t border-dashed border-slate-900 pt-2 pb-1 flex flex-col gap-1 text-[8px] text-left uppercase print:border-black">
        <div className="font-bold border-b border-dotted border-slate-500 pb-0.5 text-[8.5px] text-center tracking-wider">
          * INFORMASI KEUANGAN SISWA *
        </div>

        <div className="flex flex-col gap-1 pt-1 normal-case text-slate-900">
          <div className="leading-tight">
            <span className="font-bold uppercase text-[7.5px] text-slate-700 block">
              1. SPP Lunas:
            </span>
            <span className="font-mono text-[8px] font-bold block mt-0.5 leading-snug">
              {summary.paidMonthsText}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-0.5 border-t border-dotted border-slate-300">
            <span className="font-bold uppercase text-[7.5px] text-slate-700">
              2. Saldo Tabungan:
            </span>
            <span className="font-mono font-bold text-[8.5px]">
              Rp {summary.endingSavingsBalance.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-0.5 border-t border-dotted border-slate-300">
            <span className="font-bold uppercase text-[7.5px] text-slate-700">
              3. Tunggakan Lain:
            </span>
            <span className="font-mono font-bold text-[8.5px]">
              {summary.totalOutstandingMisc === 0
                ? 'Rp 0 (Nihil / Lunas)'
                : `Rp ${summary.totalOutstandingMisc.toLocaleString('id-ID')}`}
            </span>
          </div>
        </div>

        {/* 4. QR code NIS siswa */}
        <div className="flex flex-col items-center justify-center pt-2 pb-0.5 border-t border-dashed border-slate-900">
          <div className="p-1 bg-white border border-slate-400 rounded inline-block">
            <ReceiptQrCode nis={summary.studentNis} size={64} />
          </div>
          <span className="text-[7.5px] font-mono font-bold tracking-wider mt-1 text-slate-900 uppercase">
            NIS: {summary.studentNis}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-300 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-slate-800 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-700">
              Informasi Status Keuangan Siswa
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              &bull; NIS: {summary.studentNis}
            </span>
          </div>

          <div className="grid grid-cols-[145px_10px_1fr] text-[10.5px] items-baseline leading-relaxed">
            <span className="text-slate-600 font-medium">1. SPP Lunas</span>
            <span className="text-slate-400 font-bold">:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {summary.paidMonthsText}
            </span>
          </div>

          <div className="grid grid-cols-[145px_10px_1fr] text-[10.5px] items-baseline leading-relaxed">
            <span className="text-slate-600 font-medium">2. Saldo Akhir Tabungan</span>
            <span className="text-slate-400 font-bold">:</span>
            <span className="font-bold text-emerald-700 font-mono">
              Rp {summary.endingSavingsBalance.toLocaleString('id-ID')},00
            </span>
          </div>

          <div className="grid grid-cols-[145px_10px_1fr] text-[10.5px] items-baseline leading-relaxed">
            <span className="text-slate-600 font-medium">3. Tunggakan Lain-lain</span>
            <span className="text-slate-400 font-bold">:</span>
            <span
              className={`font-bold font-mono ${
                summary.totalOutstandingMisc > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {summary.totalOutstandingMisc === 0
                ? 'Rp 0,00 (Nihil / Lunas)'
                : `Rp ${summary.totalOutstandingMisc.toLocaleString('id-ID')},00${
                    summary.unpaidMiscTitles ? ` (${summary.unpaidMiscTitles})` : ''
                  }`}
            </span>
          </div>
        </div>

        {/* 4. QR code NIS siswa */}
        <div className="flex flex-col items-center justify-center sm:pl-3 sm:border-l sm:border-slate-200 shrink-0 pt-2 sm:pt-0">
          <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-xs">
            <ReceiptQrCode nis={summary.studentNis} size={76} />
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-800 mt-1">
            NIS: {summary.studentNis}
          </span>
          <span className="text-[7.5px] text-slate-400 uppercase font-semibold tracking-wider">
            QR Code Siswa
          </span>
        </div>
      </div>
    </div>
  );
}
