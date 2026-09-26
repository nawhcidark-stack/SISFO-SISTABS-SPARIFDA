import React, { useState } from 'react';
import { 
  Printer, X, FileText, CheckCircle, AlertTriangle, 
  Wallet, CreditCard, Sparkles, ExternalLink, Calendar, 
  ShieldCheck, UserCheck, Layers, AlertCircle
} from 'lucide-react';
import { Student, SppBill, MiscBill, SavingsTransaction, SchoolIdentity } from '../types';

export interface StudentFinancialRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  bills: SppBill[];
  miscBills?: MiscBill[];
  transactions?: SavingsTransaction[];
  schoolIdentity?: SchoolIdentity;
  homeroomTeacherName?: string;
  className?: string;
}

export const StudentFinancialRecapModal: React.FC<StudentFinancialRecapModalProps> = ({
  isOpen,
  onClose,
  student,
  bills,
  miscBills = [],
  transactions = [],
  schoolIdentity,
  homeroomTeacherName,
  className
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'arrears_only' | 'summary'>('all');

  if (!isOpen || !student) return null;

  const currentClass = className || student.class || '-';
  const teacherName = homeroomTeacherName || 'Wali Kelas';
  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolSubheading = schoolIdentity?.subheading || "KABUPATEN PASURUAN";
  const schoolAddress = schoolIdentity?.address || "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan";
  const schoolPhone = schoolIdentity?.phone || "-";
  const schoolPrincipal = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";
  const academicYear = schoolIdentity?.activeAcademicYear ? schoolIdentity.activeAcademicYear.replace('/', ' / ') : '2026 / 2027';

  // Spp bills for student
  const studentSppBills = bills.filter(b => b.studentId === student.id);
  const paidSppBills = studentSppBills.filter(b => b.status === 'paid');
  const unpaidSppBills = studentSppBills.filter(b => b.status === 'unpaid' || b.status === 'pending');
  const waivedSppBills = studentSppBills.filter(b => b.status === 'waived');

  const totalSppBilled = studentSppBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSppPaid = paidSppBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSppUnpaid = unpaidSppBills.reduce((sum, b) => sum + (b.amount || 0), 0);

  // Misc bills for student
  const studentMiscBills = miscBills.filter(b => b.studentId === student.id);
  const paidMiscBills = studentMiscBills.filter(b => b.status === 'paid');
  const unpaidMiscBills = studentMiscBills.filter(b => b.status !== 'paid');

  const totalMiscBilled = studentMiscBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalMiscPaid = paidMiscBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalMiscUnpaid = unpaidMiscBills.reduce((sum, b) => sum + (b.amount || 0), 0);

  // Savings
  const currentSavings = student.savingsBalance || 0;
  const studentTxs = transactions
    .filter(t => (t.studentId === student.id || (student.nis && String(t.studentId).trim() === String(student.nis).trim())) && (t.status === 'success' || !t.status || (t.status as string) === 'completed'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Grand totals
  const grandTotalBilled = totalSppBilled + totalMiscBilled;
  const grandTotalPaid = totalSppPaid + totalMiscPaid;
  const grandTotalArrears = totalSppUnpaid + totalMiscUnpaid;

  const isAllClear = grandTotalArrears === 0;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  };

  const currentDateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const handlePrint = () => {
    window.print();
  };

  // Popup print helper for pristine separate window printing
  const handlePrintNewWindow = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) {
      window.print();
      return;
    }

    const sppRows = (filterMode === 'arrears_only' ? unpaidSppBills : studentSppBills).map((bill, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px; font-weight: bold;">SPP ${bill.month} ${bill.year}</td>
        <td style="text-align: right; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px; font-family: monospace;">${formatRupiah(bill.amount)}</td>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px;">
          ${bill.status === 'paid' 
            ? '<span style="color: #166534; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">LUNAS</span>' 
            : bill.status === 'waived'
            ? '<span style="color: #1e40af; font-weight: bold; background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-size: 10px;">BEBAS</span>'
            : '<span style="color: #991b1b; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-size: 10px;">BELUM LUNAS</span>'}
        </td>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 10.5px;">${bill.paidAt ? bill.paidAt.substring(0, 10) : '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 10.5px; color: #475569;">${bill.paymentMethod || (bill.status === 'paid' ? 'Kasir Tunai' : '-')}</td>
      </tr>
    `).join('');

    const miscRows = (filterMode === 'arrears_only' ? unpaidMiscBills : studentMiscBills).map((bill, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px; font-weight: bold;">${bill.title}</td>
        <td style="text-align: right; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px; font-family: monospace;">${formatRupiah(bill.amount)}</td>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 11px;">
          ${bill.status === 'paid' 
            ? '<span style="color: #166534; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">LUNAS</span>' 
            : '<span style="color: #991b1b; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-size: 10px;">BELUM LUNAS</span>'}
        </td>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 10.5px;">${bill.paidAt ? bill.paidAt.substring(0, 10) : '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-size: 10.5px; color: #475569;">${bill.paymentMethod || (bill.status === 'paid' ? 'Kasir Tunai' : '-')}</td>
      </tr>
    `).join('');

    const savingsRows = studentTxs.map((tx, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #94a3b8; padding: 5px 8px; font-size: 10.5px;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 8px; font-size: 10.5px;">${tx.createdAt ? tx.createdAt.substring(0, 10) : '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 8px; font-size: 10.5px; font-weight: bold; color: ${tx.type === 'deposit' ? '#166534' : '#991b1b'};">
          ${tx.type === 'deposit' ? '+ Setor Tabungan' : '- Tarik Tabungan'}
        </td>
        <td style="text-align: right; border: 1px solid #94a3b8; padding: 5px 8px; font-size: 10.5px; font-family: monospace;">${formatRupiah(tx.amount)}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 8px; font-size: 10.5px; color: #475569;">${tx.notes || tx.paymentMethod || 'Kas Tabungan'}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>REKAP KEUANGAN SISWA - ${student.name} (${student.nis})</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              color: #0f172a; 
              background: #fff;
              line-height: 1.4;
              margin: 0;
              padding: 10px;
            }
            .header-kop { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .school-name { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
            .school-meta { font-size: 11px; color: #475569; margin-top: 3px; }
            .doc-title { text-align: center; font-size: 13.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px; }
            .student-info { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
            .student-info td { padding: 4px 6px; }
            .student-info td.label { width: 15%; font-weight: bold; color: #475569; }
            .student-info td.val { width: 35%; font-weight: 600; color: #0f172a; }
            
            .summary-cards { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .summary-cards td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; vertical-align: top; }
            .summary-title { font-size: 9.5px; text-transform: uppercase; font-weight: 700; color: #64748b; }
            .summary-val { font-size: 13px; font-weight: 800; font-family: monospace; margin-top: 3px; }
            
            .table-sec-title { font-size: 11.5px; font-weight: 800; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px; color: #0f172a; border-left: 3px solid #0284c7; padding-left: 6px; }
            .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            .data-table th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 6px 8px; font-size: 10px; text-transform: uppercase; font-weight: 700; color: #1e293b; }
            
            .status-badge { font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; display: inline-block; }
            .badge-clear { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .badge-arrears { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

            .signatures { width: 100%; margin-top: 25px; border-collapse: collapse; page-break-inside: avoid; }
            .signatures td { width: 33.3%; text-align: center; font-size: 11px; vertical-align: top; }
            .sig-space { height: 60px; }
          </style>
        </head>
        <body>
          ${schoolIdentity?.letterhead ? `
            <div style="width: 100%; text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
              <img src="${schoolIdentity.letterhead}" style="width: 100%; max-height: 110px; object-fit: contain;" />
            </div>
          ` : `
            <div class="header-kop">
              <div class="school-name">${schoolName}</div>
              <div class="school-meta">${schoolSubheading} | Alamat: ${schoolAddress}</div>
              <div class="school-meta">Telp: ${schoolPhone} | Tahun Ajaran: ${academicYear}</div>
            </div>
          `}

          <div class="doc-title">LEMBAR REKAPITULASI KEUANGAN & ADMINISTRASI SISWA</div>

          <table class="student-info">
            <tr>
              <td class="label">Nama Lengkap</td>
              <td class="val">: <strong>${student.name}</strong></td>
              <td class="label">Wali Kelas</td>
              <td class="val">: ${teacherName}</td>
            </tr>
            <tr>
              <td class="label">Nomor Induk / NIS</td>
              <td class="val">: <span style="font-family: monospace;">${student.nis || '-'}</span></td>
              <td class="label">Tahun Ajaran</td>
              <td class="val">: ${academicYear}</td>
            </tr>
            <tr>
              <td class="label">Kelas / Rombel</td>
              <td class="val">: Kelas ${currentClass}</td>
              <td class="label">Tanggal Cetak</td>
              <td class="val">: ${currentDateStr}</td>
            </tr>
          </table>

          <!-- Financial Snapshot -->
          <table class="summary-cards">
            <tr>
              <td style="background: #f0fdf4;">
                <div class="summary-title" style="color: #166534;">Saldo Tabungan</div>
                <div class="summary-val" style="color: #15803d;">${formatRupiah(currentSavings)}</div>
              </td>
              <td style="background: #f8fafc;">
                <div class="summary-title">Total SPP Lunas</div>
                <div class="summary-val" style="color: #0f172a;">${formatRupiah(totalSppPaid)}</div>
              </td>
              <td style="background: ${totalSppUnpaid > 0 ? '#fff1f2' : '#f8fafc'};">
                <div class="summary-title" style="color: ${totalSppUnpaid > 0 ? '#b91c1c' : '#475569'};">Tunggakan SPP</div>
                <div class="summary-val" style="color: ${totalSppUnpaid > 0 ? '#dc2626' : '#64748b'};">${formatRupiah(totalSppUnpaid)}</div>
              </td>
              <td style="background: ${totalMiscUnpaid > 0 ? '#fff1f2' : '#f8fafc'};">
                <div class="summary-title" style="color: ${totalMiscUnpaid > 0 ? '#b91c1c' : '#475569'};">Tunggakan Iuran Lain</div>
                <div class="summary-val" style="color: ${totalMiscUnpaid > 0 ? '#dc2626' : '#64748b'};">${formatRupiah(totalMiscUnpaid)}</div>
              </td>
              <td style="background: ${isAllClear ? '#dcfce7' : '#fee2e2'};">
                <div class="summary-title" style="color: ${isAllClear ? '#15803d' : '#991b1b'};">Total Kewajiban Menunggak</div>
                <div class="summary-val" style="color: ${isAllClear ? '#166534' : '#b91c1c'};">${formatRupiah(grandTotalArrears)}</div>
              </td>
            </tr>
          </table>

          <!-- SECTION 1: SPP Bills -->
          <div class="table-sec-title">I. Rincian Tagihan SPP Bulanan</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 30%; text-align: left;">Bulan / Tahun</th>
                <th style="width: 18%; text-align: right;">Nominal</th>
                <th style="width: 17%;">Status</th>
                <th style="width: 15%;">Tgl Lunas</th>
                <th style="width: 15%; text-align: left;">Kanal / Bukti</th>
              </tr>
            </thead>
            <tbody>
              ${sppRows.length > 0 ? sppRows : `<tr><td colspan="6" style="text-align: center; border: 1px solid #94a3b8; padding: 8px; color: #64748b;">Tidak ada catatan tagihan SPP</td></tr>`}
            </tbody>
          </table>

          <!-- SECTION 2: Misc Bills -->
          <div class="table-sec-title">II. Rincian Tagihan Iuran Lain-lain / Non-SPP</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 35%; text-align: left;">Nama Tagihan / Iuran</th>
                <th style="width: 18%; text-align: right;">Nominal</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 14%;">Tgl Lunas</th>
                <th style="width: 13%; text-align: left;">Kanal</th>
              </tr>
            </thead>
            <tbody>
              ${miscRows.length > 0 ? miscRows : `<tr><td colspan="6" style="text-align: center; border: 1px solid #94a3b8; padding: 8px; color: #64748b;">Tidak ada catatan tagihan iuran lain</td></tr>`}
            </tbody>
          </table>

          ${studentTxs.length > 0 ? `
            <!-- SECTION 3: Savings Mutations -->
            <div class="table-sec-title">III. Ringkasan Mutasi Tabungan Terakhir (Saldo Terkini: ${formatRupiah(currentSavings)})</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 5%;">No</th>
                  <th style="width: 18%; text-align: left;">Tanggal</th>
                  <th style="width: 25%; text-align: left;">Jenis Mutasi</th>
                  <th style="width: 20%; text-align: right;">Nominal</th>
                  <th style="width: 32%; text-align: left;">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${savingsRows}
              </tbody>
            </table>
          ` : ''}

          <div style="font-size: 10px; color: #475569; margin-top: 15px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            <em>* Catatan: Lembar rekapitulasi keuangan ini merupakan dokumen resmi administrasi wali kelas. Pembayaran tagihan dapat dilakukan melalui Kasir Bendahara Sekolah atau kanal daring resmi yang disediakan sekolah.</em>
          </div>

          <!-- Signatures -->
          <table class="signatures">
            <tr>
              <td>
                Orang Tua / Wali Murid
                <div class="sig-space"></div>
                ( .................................................. )
              </td>
              <td>
                Mengetahui,<br/>
                Kepala Sekolah
                <div class="sig-space"></div>
                <strong><u>${schoolPrincipal}</u></strong>
              </td>
              <td>
                Pandaan, ${currentDateStr}<br/>
                Wali Kelas ${currentClass}
                <div class="sig-space"></div>
                <strong><u>${teacherName}</u></strong>
              </td>
            </tr>
          </table>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header (Non-printable) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-snug">
                Rekapitulasi Keuangan Siswa (Cetak PDF)
              </h3>
              <p className="text-xs text-slate-300">
                {student.name} &bull; NIS: <span className="font-mono font-bold text-amber-300">{student.nis}</span> &bull; Kelas {currentClass}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar & Selector (Non-printable) */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-200/90 p-1 rounded-xl">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} className="text-indigo-600" /> Semua Tagihan
            </button>
            <button
              onClick={() => setFilterMode('arrears_only')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'arrears_only' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle size={13} className="text-rose-600" /> Hanya Tunggakan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintNewWindow}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              title="Buka Lembar Cetak / Save PDF di Tab Baru"
            >
              <ExternalLink size={14} /> Tab Cetak Baru
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 shadow-emerald-100"
              title="Cetak Langsung atau Simpan sebagai PDF"
            >
              <Printer size={15} /> Cetak Rekap PDF
            </button>
          </div>
        </div>

        {/* PRINTABLE CONTAINER CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 print:p-0 print:bg-white print:overflow-visible">
          
          {/* Print CSS injection */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-financial-recap, #printable-financial-recap * {
                visibility: visible !important;
              }
              #printable-financial-recap {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10mm !important;
                background: white !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
          ` }} />

          <div id="printable-financial-recap" className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
            
            {/* Header Kop */}
            {schoolIdentity?.letterhead ? (
              <div className="w-full text-center mb-5 pb-3 border-b-2 border-slate-900">
                <img src={schoolIdentity.letterhead} alt="Kop Surat" className="w-full max-h-24 object-contain" />
              </div>
            ) : (
              <div className="text-center pb-4 mb-4 border-b-2 border-slate-900">
                <h2 className="text-lg font-black tracking-wide text-slate-900 uppercase">{schoolName}</h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{schoolSubheading} &bull; Alamat: {schoolAddress}</p>
                <p className="text-xs text-slate-500 font-medium">Telepon: {schoolPhone} &bull; Tahun Ajaran: {academicYear}</p>
              </div>
            )}

            {/* Document Title */}
            <div className="text-center bg-slate-100 border border-slate-300 py-2 px-3 rounded-lg mb-4">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                LEMBAR REKAPITULASI ADMINISTRASI & KEUANGAN SISWA
              </h3>
            </div>

            {/* Student Metadata */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              <div className="flex">
                <span className="w-28 text-slate-500 font-bold">Nama Siswa</span>
                <span className="font-extrabold text-slate-900">: {student.name}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-bold">Wali Kelas</span>
                <span className="font-bold text-slate-800">: {teacherName}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-bold">NIS / NISN</span>
                <span className="font-mono font-bold text-slate-900">: {student.nis} / {student.nisn || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-bold">Tahun Pelajaran</span>
                <span className="font-semibold text-slate-800">: {academicYear}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-bold">Kelas / Rombel</span>
                <span className="font-extrabold text-slate-900">: Kelas {currentClass}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-bold">Tanggal Cetak</span>
                <span className="font-medium text-slate-700">: {currentDateStr}</span>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                <span className="block text-[9px] font-black uppercase text-emerald-800 tracking-wider">Saldo Tabungan</span>
                <span className="block font-mono font-black text-sm text-emerald-700 mt-1">{formatRupiah(currentSavings)}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="block text-[9px] font-black uppercase text-slate-600 tracking-wider">Total SPP Lunas</span>
                <span className="block font-mono font-black text-sm text-slate-800 mt-1">{formatRupiah(totalSppPaid)}</span>
              </div>
              <div className={`p-3 rounded-xl border text-center ${totalSppUnpaid > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block text-[9px] font-black uppercase tracking-wider ${totalSppUnpaid > 0 ? 'text-rose-800' : 'text-slate-600'}`}>Tunggakan SPP</span>
                <span className={`block font-mono font-black text-sm mt-1 ${totalSppUnpaid > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{formatRupiah(totalSppUnpaid)}</span>
              </div>
              <div className={`p-3 rounded-xl border text-center ${grandTotalArrears > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-emerald-50/70 border-emerald-300'}`}>
                <span className={`block text-[9px] font-black uppercase tracking-wider ${grandTotalArrears > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {grandTotalArrears > 0 ? 'Total Tunggakan' : 'Status Administrasi'}
                </span>
                <span className={`block font-mono font-black text-sm mt-1 ${grandTotalArrears > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {grandTotalArrears > 0 ? formatRupiah(grandTotalArrears) : '✓ LUNAS'}
                </span>
              </div>
            </div>

            {/* SECTION 1: SPP Bills Table */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-indigo-600" />
                  I. Rincian Tagihan SPP Bulanan
                </h4>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {paidSppBills.length} Lunas &bull; {unpaidSppBills.length} Belum Dibayar
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-2.5 text-center w-8">No</th>
                      <th className="py-2 px-2.5">Bulan / Tahun</th>
                      <th className="py-2 px-2.5 text-right">Nominal</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-center">Tgl Lunas</th>
                      <th className="py-2 px-2.5">Kanal / Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {((filterMode === 'arrears_only' ? unpaidSppBills : studentSppBills).length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          {filterMode === 'arrears_only' ? 'Tidak ada tunggakan SPP (Semua tagihan lunas).' : 'Belum ada data tagihan SPP.'}
                        </td>
                      </tr>
                    ) : (
                      (filterMode === 'arrears_only' ? unpaidSppBills : studentSppBills).map((bill, idx) => (
                        <tr key={bill.id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-800">SPP {bill.month} {bill.year}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-700">{formatRupiah(bill.amount)}</td>
                          <td className="py-1.5 px-2.5 text-center">
                            {bill.status === 'paid' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ LUNAS
                              </span>
                            ) : bill.status === 'waived' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                BEBAS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                BELUM LUNAS
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-center text-slate-600 font-mono text-[10px]">
                            {bill.paidAt ? bill.paidAt.substring(0, 10) : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-600 text-[10px]">
                            {bill.paymentMethod || (bill.status === 'paid' ? 'Kasir Tunai' : '-')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: Misc Bills Table */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-amber-600" />
                  II. Rincian Tagihan Iuran Lain-lain / Non-SPP
                </h4>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {paidMiscBills.length} Lunas &bull; {unpaidMiscBills.length} Belum Dibayar
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-2.5 text-center w-8">No</th>
                      <th className="py-2 px-2.5">Nama Tagihan / Iuran</th>
                      <th className="py-2 px-2.5 text-right">Nominal</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-center">Tgl Lunas</th>
                      <th className="py-2 px-2.5">Kanal / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {((filterMode === 'arrears_only' ? unpaidMiscBills : studentMiscBills).length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          {filterMode === 'arrears_only' ? 'Tidak ada tunggakan iuran lain-lain.' : 'Belum ada data iuran lain-lain.'}
                        </td>
                      </tr>
                    ) : (
                      (filterMode === 'arrears_only' ? unpaidMiscBills : studentMiscBills).map((bill, idx) => (
                        <tr key={bill.id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-800">{bill.title}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-700">{formatRupiah(bill.amount)}</td>
                          <td className="py-1.5 px-2.5 text-center">
                            {bill.status === 'paid' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ LUNAS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                BELUM LUNAS
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-center text-slate-600 font-mono text-[10px]">
                            {bill.paidAt ? bill.paidAt.substring(0, 10) : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-600 text-[10px]">
                            {bill.paymentMethod || (bill.status === 'paid' ? 'Kasir Tunai' : '-')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: Savings Mutations if any */}
            {studentTxs.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Wallet size={13} className="text-emerald-600" />
                    III. Ringkasan Mutasi Tabungan Siswa (10 Transaksi Terakhir)
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-700">
                    Saldo Aktif: {formatRupiah(currentSavings)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-1.5 px-2 text-center w-8">No</th>
                        <th className="py-1.5 px-2">Tanggal</th>
                        <th className="py-1.5 px-2">Jenis Mutasi</th>
                        <th className="py-1.5 px-2 text-right">Nominal</th>
                        <th className="py-1.5 px-2">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10.5px]">
                      {studentTxs.map((tx, idx) => (
                        <tr key={tx.id || idx}>
                          <td className="py-1 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1 px-2 font-mono text-slate-600">{tx.createdAt ? tx.createdAt.substring(0, 10) : '-'}</td>
                          <td className="py-1 px-2 font-bold">
                            <span className={tx.type === 'deposit' ? 'text-emerald-700' : 'text-rose-700'}>
                              {tx.type === 'deposit' ? '+ Setor Tabungan' : '- Tarik Tabungan'}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-slate-800">{formatRupiah(tx.amount)}</td>
                          <td className="py-1 px-2 text-slate-500 text-[10px]">{tx.notes || tx.paymentMethod || 'Kas Tabungan'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Note & Disclaimer */}
            <div className="bg-slate-50 border border-dashed border-slate-300 p-3 rounded-xl mb-6 text-[10.5px] text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-700 mb-0.5">Ketentuan & Maklumat Administrasi:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Lembar rekapitulasi keuangan ini dicetak sebagai catatan resmi perkembangan pemenuhan administrasi siswa.</li>
                <li>Apabila terdapat ketidaksesuaian data pembayaran, mohon menunjukkan bukti transfer atau kuitansi fisik kepada bendahara sekolah / wali kelas.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs mt-8 pt-4 border-t border-slate-200">
              <div className="flex flex-col justify-between h-28">
                <span className="font-medium text-slate-600">Orang Tua / Wali Murid,</span>
                <span className="font-bold text-slate-800 underline underline-offset-4">( ............................................ )</span>
              </div>
              <div className="flex flex-col justify-between h-28">
                <div>
                  <span className="font-medium text-slate-600 block">Mengetahui,</span>
                  <span className="font-bold text-slate-800">Kepala Sekolah</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 underline block">{schoolPrincipal}</span>
                  <span className="text-[10px] text-slate-400">NIP / PegID -</span>
                </div>
              </div>
              <div className="flex flex-col justify-between h-28">
                <div>
                  <span className="font-medium text-slate-600 block">Pandaan, {currentDateStr}</span>
                  <span className="font-bold text-slate-800">Wali Kelas {currentClass}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 underline block">{teacherName}</span>
                  <span className="text-[10px] text-slate-400">NIP / PegID -</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
