import React, { useState } from 'react';
import { Printer, X, FileText, BookOpen, CheckCircle, ArrowDownLeft, ArrowUpRight, Landmark, Sparkles } from 'lucide-react';
import { Student, SavingsTransaction, SchoolIdentity } from '../types';

interface SavingsPassbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  transactions: SavingsTransaction[];
  schoolIdentity?: SchoolIdentity;
}

export const SavingsPassbookModal: React.FC<SavingsPassbookModalProps> = ({
  isOpen,
  onClose,
  student,
  transactions,
  schoolIdentity
}) => {
  const [printTab, setPrintTab] = useState<'both' | 'cover' | 'mutation'>('both');

  if (!isOpen || !student) return null;

  // Filter only successful or completed transactions for the student
  const studentTxs = transactions
    .filter(t => (t.studentId === student.id || (student.nis && String(t.studentId).trim() === String(student.nis).trim())) && (t.status === 'success' || !t.status || t.status === 'completed'))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Calculate running balance for each transaction
  let currentBalance = 0;
  const ledgerRows = studentTxs.map((tx, idx) => {
    const isDeposit = tx.type === 'deposit';
    if (isDeposit) {
      currentBalance += tx.amount;
    } else {
      currentBalance -= tx.amount;
    }
    return {
      index: idx + 1,
      ...tx,
      runningBalance: currentBalance,
    };
  });

  const totalDeposit = studentTxs.filter(t => t.type === 'deposit').reduce((acc, t) => acc + t.amount, 0);
  const totalWithdraw = studentTxs.filter(t => t.type === 'withdrawal').reduce((acc, t) => acc + t.amount, 0);
  const finalBalance = student.savingsBalance ?? currentBalance;

  const handlePrint = () => {
    window.print();
  };

  const schoolName = schoolIdentity?.name || "SMP MAARIF NU PANDAAN";
  const schoolSub = schoolIdentity?.subheading || "Sekolah Inspiratif";
  const schoolAddress = schoolIdentity?.address || "Jl. Raya A. Yani No. 92 Pandaan, Kab. Pasuruan 67156";
  const schoolPhone = schoolIdentity?.phone || "(0343) 631655";
  const schoolEmail = "smpmaarifpdn@gmail.com";
  const schoolWeb = "smpmaarifpdn.sch.id";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Modal Header (Non-printable) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-snug">
                Buku Tabungan & Mutasi Rekening Siswa
              </h3>
              <p className="text-xs text-slate-300">
                Format resmi buku rekening bank {schoolName} (NIS: <span className="font-mono font-bold text-emerald-400">{student.nis}</span>)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar & Selector (Non-printable) */}
        <div className="px-6 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setPrintTab('both')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                printTab === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={13} className="text-amber-500" /> Cetak Lengkap
            </button>
            <button
              onClick={() => setPrintTab('cover')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                printTab === 'cover' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen size={13} className="text-emerald-600" /> Sampul Buku
            </button>
            <button
              onClick={() => setPrintTab('mutation')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                printTab === 'mutation' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={13} className="text-indigo-600" /> Lembar Mutasi Ledger
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shadow-emerald-100"
          >
            <Printer size={15} /> Cetak Sekarang (Print / PDF)
          </button>
        </div>

        {/* PRINTABLE CONTAINER CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 print:p-0 print:bg-white print:overflow-visible">
          
          {/* STYLE INJECTION FOR DIRECT PRINTING */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-passbook-wrapper, #printable-passbook-wrapper * {
                visibility: visible !important;
              }
              #printable-passbook-wrapper {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              .page-break {
                page-break-before: always !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
            }
          ` }} />

          <div id="printable-passbook-wrapper" className="space-y-8">

            {/* 1. SAMPUL BUKU TABUNGAN (PASSBOOK COVER) */}
            {(printTab === 'both' || printTab === 'cover') && (
              <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-emerald-800/30 text-white font-sans bg-emerald-950 print:shadow-none print:rounded-none">
                
                {/* Background Art Layer with Green/Gold Waves & Patterns */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 z-0"></div>
                
                {/* Golden Curve ribbons */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Decorative Wave Borders */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 z-10"></div>

                {/* COVER HEADER */}
                <div className="relative z-10 p-6 sm:p-8 bg-emerald-900/60 backdrop-blur-xs border-b border-amber-400/30">
                  {schoolIdentity?.letterhead ? (
                    <div className="w-full flex justify-center items-center py-1 bg-transparent">
                      <img
                        src={schoolIdentity.letterhead}
                        alt="KOP Resmi Sekolah"
                        className="w-full max-h-36 object-contain mx-auto mix-blend-multiply bg-transparent"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        {/* Left Logo / NU Emblem */}
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-800 border-2 border-amber-400/80 flex items-center justify-center p-1 shadow-md shrink-0">
                            {schoolIdentity?.logo ? (
                              <img src={schoolIdentity.logo} alt="Logo Sekolah" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <div className="text-center leading-none">
                                <span className="text-[18px] font-black text-amber-300 block">NU</span>
                                <span className="text-[8px] font-extrabold text-white uppercase tracking-tighter">SMP MAARIF</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* School Center Heading */}
                        <div className="text-center flex-1">
                          <span className="text-amber-300 font-black text-xs sm:text-sm tracking-wider uppercase block italic font-serif">
                            {schoolSub}
                          </span>
                          <h1 className="text-lg sm:text-2xl font-black tracking-wide text-white uppercase drop-shadow-md">
                            {schoolName}
                          </h1>
                          <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs font-bold text-amber-200 mt-1 font-mono">
                            <span>NSS : 202051911030</span>
                            <span>|</span>
                            <span>NPSN : 20519113</span>
                          </div>
                        </div>

                        {/* Right Logo / Book Sun Emblem */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-400/20 border-2 border-amber-400/80 flex items-center justify-center p-2 shadow-md shrink-0">
                          <Landmark className="text-amber-300" size={28} />
                        </div>
                      </div>

                      {/* School Contact Strip */}
                      <div className="mt-4 pt-2.5 border-t border-emerald-700/60 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[9px] sm:text-[10px] text-slate-200 text-center font-medium">
                        <span>📍 Alamat: {schoolAddress}</span>
                        <span>📞 Telp: {schoolPhone}</span>
                        <span>✉️ Email: {schoolEmail}</span>
                        <span>🌐 Website: {schoolWeb}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* COVER BODY CENTER TITLE */}
                <div className="relative z-10 py-8 px-6 text-center">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase font-serif drop-shadow-lg">
                    BUKU TABUNGAN
                  </h2>
                  <div className="inline-flex items-center gap-2 mt-1 px-4 py-1 rounded-full bg-amber-400/20 border border-amber-400/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    <span className="text-amber-300 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                      Simpanan Pelajar
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                  </div>

                  {/* STUDENT IDENTITY CARD BOX (WHITE ROUNDED CARD WITH GOLD BORDER) */}
                  <div className="mt-8 max-w-lg mx-auto bg-white text-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border-2 border-amber-400/90 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-bl-full pointer-events-none"></div>

                    <table className="w-full text-xs sm:text-sm font-semibold border-separate border-spacing-y-2.5">
                      <tbody>
                        <tr>
                          <td className="w-28 text-slate-700 font-extrabold uppercase text-[11px] sm:text-xs">
                            NIS
                          </td>
                          <td className="w-4 text-slate-400 font-bold">:</td>
                          <td className="font-mono font-black text-emerald-800 text-sm sm:text-base tracking-wider">
                            {student.nis}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-slate-700 font-extrabold uppercase text-[11px] sm:text-xs">
                            Nama
                          </td>
                          <td className="text-slate-400 font-bold">:</td>
                          <td className="font-black text-slate-900 uppercase tracking-wide">
                            {student.name}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-slate-700 font-extrabold uppercase text-[11px] sm:text-xs">
                            Kelas
                          </td>
                          <td className="text-slate-400 font-bold">:</td>
                          <td className="font-bold text-slate-800">
                            Kelas {student.class}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* COVER FOOTER STRIP */}
                <div className="relative z-10 py-3 px-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-t border-amber-400/30 text-center text-[10px] text-amber-200 font-mono tracking-wider">
                  SISTEM INFORMASI KEUANGAN TABUNGAN PELAJAR &bull; {schoolName.toUpperCase()}
                </div>
              </div>
            )}

            {/* PAGE BREAK FOR PRINT IF BOTH COVER & MUTATION ARE SELECTED */}
            {printTab === 'both' && <div className="page-break"></div>}

            {/* 2. LEMBAR MUTASI REKENING (BANK PASSBOOK MUTATION LEDGER) */}
            {(printTab === 'both' || printTab === 'mutation') && (
              <div className="w-full max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
                
                {/* LEDGER HEADER */}
                {schoolIdentity?.letterhead ? (
                  <div className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-5 overflow-hidden rounded-t-2xl border-b-2 border-slate-900 print:rounded-none">
                    <img
                      src={schoolIdentity.letterhead}
                      alt="KOP Sekolah"
                      className="w-full h-auto max-h-36 object-fill w-full block"
                    />
                    <div className="px-6 sm:px-8 py-2 bg-slate-50 flex flex-wrap justify-between items-center border-t border-slate-200">
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                        LAPORAN MUTASI REKENING TABUNGAN SISWA
                      </span>
                      <div className="font-mono text-xs">
                        <span className="bg-white border border-emerald-300 px-3 py-1 rounded-lg text-emerald-900 font-black">
                          NIS: {student.nis}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                        {schoolIdentity?.logo ? (
                          <img src={schoolIdentity.logo} alt="Logo" className="max-h-full max-w-full object-contain p-1" />
                        ) : (
                          "NU"
                        )}
                      </div>
                      <div>
                        <h2 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight">
                          {schoolName}
                        </h2>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          BUKU TABUNGAN SIMPANAN PELAJAR - LAPORAN MUTASI REKENING
                        </p>
                        <p className="text-[10px] text-slate-500">{schoolAddress}</p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-900 font-bold text-right">
                        <span className="text-[9px] text-emerald-700 block uppercase tracking-wider">NIS (No. Sub Rekening)</span>
                        <span className="text-sm font-black tracking-wide">{student.nis}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STUDENT METADATA STRIP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-6">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Nama Nasabah Siswa</span>
                    <span className="font-black text-slate-800 text-xs uppercase truncate block" title={student.name}>{student.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Kelas</span>
                    <span className="font-bold text-slate-800 text-xs">Kelas {student.class}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Tanggal Cetak</span>
                    <span className="font-bold text-slate-800 text-xs">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Saldo Akhir Saat Ini</span>
                    <span className="font-black text-emerald-700 font-mono text-xs">Rp {finalBalance.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* BANK PASSBOOK TRANSACTION TABLE */}
                <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-800 text-white font-extrabold uppercase text-[9px] tracking-wider divide-x divide-slate-700">
                        <th className="py-2.5 px-2 text-center w-8">NO</th>
                        <th className="py-2.5 px-3 w-28">TANGGAL</th>
                        <th className="py-2.5 px-3">KETERANGAN / MUTASI</th>
                        <th className="py-2.5 px-3 text-right w-28 text-rose-300">DEBET (TARIK)</th>
                        <th className="py-2.5 px-3 text-right w-28 text-emerald-300">KREDIT (SETOR)</th>
                        <th className="py-2.5 px-3 text-right w-32">SALDO (IDR)</th>
                        <th className="py-2.5 px-2 text-center w-16">PARAF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px] font-medium text-slate-800">
                      {ledgerRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                            Belum ada riwayat transaksi mutasi tabungan yang tercatat untuk siswa ini.
                          </td>
                        </tr>
                      ) : (
                        ledgerRows.map((row) => {
                          const isDeposit = row.type === 'deposit';
                          return (
                            <tr key={row.id} className="hover:bg-slate-50 divide-x divide-slate-100">
                              <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-500">{row.index}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                {new Date(row.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-800 block leading-tight">{row.notes || (isDeposit ? 'Setoran Tabungan' : 'Penarikan Tabungan')}</span>
                                {row.orderId && <span className="text-[8px] font-mono text-slate-400">Ref: {row.orderId}</span>}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                {!isDeposit ? `Rp ${row.amount.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {isDeposit ? `Rp ${row.amount.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                                Rp {row.runningBalance.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-2 text-center text-[9px] text-slate-400 italic font-mono">
                                [OK]
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    
                    {/* TABLE SUMMARY FOOTER */}
                    {ledgerRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300 divide-x divide-slate-200 text-xs">
                          <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider text-slate-600">
                            TOTAL AKUMULASI MUTASI:
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                            Rp {totalWithdraw.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                            Rp {totalDeposit.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm text-slate-900 bg-emerald-50 border-emerald-300 font-black whitespace-nowrap">
                            Rp {finalBalance.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-2"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* SIGNATURE & STAMP VERIFICATION SECTION */}
                <div className="grid grid-cols-2 gap-6 mt-8 pt-4 border-t border-slate-200 text-xs">
                  <div className="flex flex-col justify-between h-28">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Wali Murid / Pemilik Rekening
                    </span>
                    <div className="border-b border-slate-400 w-36 pb-1 text-center font-bold text-slate-800">
                      ({student.name.substring(0, 20)})
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end h-28 text-right relative">
                    <div>
                      <p className="font-bold text-slate-800">
                        Pandaan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Teller / Bendahara Keuangan Sekolah
                      </p>
                    </div>

                    {/* School Stamp Overlay if available */}
                    {schoolIdentity?.schoolStamp && (
                      <div className="absolute top-4 right-10 w-24 h-24 opacity-80 pointer-events-none select-none z-10">
                        <img src={schoolIdentity.schoolStamp} alt="Stempel Resmi" className="w-full h-full object-contain" />
                      </div>
                    )}

                    <div className="border-b border-slate-400 w-44 pb-1 text-center font-bold text-slate-800">
                      ({schoolIdentity?.treasurer || "Bendahara Sekolah"})
                    </div>
                  </div>
                </div>

                {/* PASSBOOK FOOTER NOTE */}
                <div className="mt-8 pt-2 border-t border-slate-100 text-[9px] text-slate-400 text-center font-mono">
                  Buku Tabungan & Mutasi ini dicetak secara sah oleh Sistem Informasi Keuangan {schoolName}.
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
