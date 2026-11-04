import { Student, SppBill, MiscBill, SavingsTransaction, SchoolIdentity } from '../types';

export interface PrintStudentFinancialOptions {
  student: Student;
  bills: SppBill[];
  miscBills?: MiscBill[];
  transactions?: SavingsTransaction[];
  schoolIdentity?: SchoolIdentity;
  homeroomTeacherName?: string;
  className?: string;
}

export interface PrintClassFinancialOptions {
  className: string;
  teacherName: string;
  students: Student[];
  bills: SppBill[];
  miscBills?: MiscBill[];
  schoolIdentity?: SchoolIdentity;
}

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
};

export function printClassFinancialRecapPdf({
  className,
  teacherName,
  students,
  bills,
  miscBills = [],
  schoolIdentity
}: PrintClassFinancialOptions) {
  const printWin = window.open("", "_blank");
  if (!printWin) return;

  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolSubheading = schoolIdentity?.subheading || "KABUPATEN PASURUAN";
  const schoolAddress = schoolIdentity?.address || "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan";
  const schoolPhone = schoolIdentity?.phone || "-";
  const schoolPrincipal = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";
  const academicYear = schoolIdentity?.activeAcademicYear ? schoolIdentity.activeAcademicYear.replace('/', ' / ') : '2026 / 2027';

  const currentDateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Aggregate stats
  let totalSavings = 0;
  let totalSppPaid = 0;
  let totalSppUnpaid = 0;
  let totalMiscPaid = 0;
  let totalMiscUnpaid = 0;
  let countClearStudents = 0;
  let countArrearsStudents = 0;

  const rows = students.map((student, idx) => {
    const sBills = bills.filter(b => b.studentId === student.id);
    const paidSpp = sBills.filter(b => b.status === 'paid');
    const unpaidSpp = sBills.filter(b => b.status === 'unpaid' || b.status === 'pending');
    
    const sSppPaidAmt = paidSpp.reduce((sum, b) => sum + (b.amount || 0), 0);
    const sSppUnpaidAmt = unpaidSpp.reduce((sum, b) => sum + (b.amount || 0), 0);

    const sMisc = miscBills.filter(b => b.studentId === student.id);
    const paidMisc = sMisc.filter(b => b.status === 'paid');
    const unpaidMisc = sMisc.filter(b => b.status !== 'paid');

    const sMiscPaidAmt = paidMisc.reduce((sum, b) => sum + (b.amount || 0), 0);
    const sMiscUnpaidAmt = unpaidMisc.reduce((sum, b) => sum + (b.amount || 0), 0);

    const sSavings = student.savingsBalance || 0;
    const totalStudentArrears = sSppUnpaidAmt + sMiscUnpaidAmt;

    totalSavings += sSavings;
    totalSppPaid += sSppPaidAmt;
    totalSppUnpaid += sSppUnpaidAmt;
    totalMiscPaid += sMiscPaidAmt;
    totalMiscUnpaid += sMiscUnpaidAmt;

    if (totalStudentArrears === 0) {
      countClearStudents++;
    } else {
      countArrearsStudents++;
    }

    const unpaidMonthsText = unpaidSpp.map(b => b.month.substring(0, 3)).join(', ');
    const unpaidMiscText = unpaidMisc.map(b => b.title).join(', ');

    return `
      <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: center; font-mono font-size: 10px;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: center; font-mono font-size: 10px; font-weight: bold;">${student.nis || '-'}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; font-size: 10.5px; font-weight: 600;">${student.name}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: right; font-mono font-size: 10px; color: #166534; font-weight: bold;">${formatRupiah(sSavings)}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: right; font-mono font-size: 10px;">${formatRupiah(sSppPaidAmt)}</td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: right; font-mono font-size: 10px; color: ${sSppUnpaidAmt > 0 ? '#b91c1c' : '#475569'}; font-weight: ${sSppUnpaidAmt > 0 ? 'bold' : 'normal'};">
          ${formatRupiah(sSppUnpaidAmt)}
          ${unpaidMonthsText ? `<br/><span style="font-size: 8.5px; color: #dc2626; font-weight: normal;">(${unpaidMonthsText})</span>` : ''}
        </td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: right; font-mono font-size: 10px; color: ${sMiscUnpaidAmt > 0 ? '#b91c1c' : '#475569'}; font-weight: ${sMiscUnpaidAmt > 0 ? 'bold' : 'normal'};">
          ${formatRupiah(sMiscUnpaidAmt)}
          ${unpaidMiscText ? `<br/><span style="font-size: 8.5px; color: #dc2626; font-weight: normal;">(${unpaidMiscText})</span>` : ''}
        </td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: right; font-mono font-size: 10px; font-weight: 800; color: ${totalStudentArrears > 0 ? '#991b1b' : '#166534'};">
          ${formatRupiah(totalStudentArrears)}
        </td>
        <td style="border: 1px solid #94a3b8; padding: 5px 6px; text-align: center; font-size: 9.5px; font-weight: bold;">
          ${totalStudentArrears === 0 
            ? '<span style="color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 4px; border: 1px solid #86efac;">LUNAS</span>' 
            : '<span style="color: #b91c1c; background: #fee2e2; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5;">MENUNGGAK</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const grandTotalArrears = totalSppUnpaid + totalMiscUnpaid;

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>REKAP KEUANGAN KELAS ${className} - ${academicYear}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #0f172a; 
            background: #fff;
            margin: 0;
            padding: 8px;
            font-size: 10px;
            line-height: 1.35;
          }
          .header-kop { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .school-name { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .school-meta { font-size: 10.5px; color: #475569; margin-top: 2px; }
          .doc-title { text-align: center; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px; }
          
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
          .meta-table td { padding: 3px 5px; }
          .meta-table td.label { font-weight: bold; width: 14%; color: #475569; }
          .meta-table td.val { font-weight: 600; width: 36%; color: #0f172a; }

          .stats-cards { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          .stats-cards td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; vertical-align: top; }
          .stat-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .stat-val { font-size: 12px; font-weight: 800; font-family: monospace; margin-top: 2px; }

          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5px; }
          .data-table th { background: #1e293b; color: #ffffff; border: 1px solid #64748b; padding: 6px 5px; font-size: 9.5px; text-transform: uppercase; font-weight: 700; text-align: center; }
          
          .total-row { background: #e2e8f0 !important; font-weight: bold; }
          .total-row td { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 5px; font-mono font-size: 10px; }

          .signatures { width: 100%; margin-top: 20px; border-collapse: collapse; page-break-inside: avoid; }
          .signatures td { width: 50%; text-align: center; font-size: 11px; vertical-align: top; }
          .sig-space { height: 55px; }
        </style>
      </head>
      <body>
        ${schoolIdentity?.letterhead ? `
          <div style="width: 100%; text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 5px;">
            <img src="${schoolIdentity.letterhead}" style="width: 100%; max-height: 90px; object-fit: contain;" />
          </div>
        ` : `
          <div class="header-kop">
            <div class="school-name">${schoolName}</div>
            <div class="school-meta">${schoolSubheading} &bull; ${schoolAddress} &bull; Telp: ${schoolPhone}</div>
          </div>
        `}

        <div class="doc-title">REKAPITULASI KEUANGAN & STATUS ADMINISTRASI KELAS ${className}</div>

        <table class="meta-table">
          <tr>
            <td class="label">Kelas / Rombel</td>
            <td class="val">: <strong>Kelas ${className}</strong></td>
            <td class="label">Tahun Ajaran</td>
            <td class="val">: ${academicYear}</td>
          </tr>
          <tr>
            <td class="label">Wali Kelas</td>
            <td class="val">: <strong>${teacherName}</strong></td>
            <td class="label">Tanggal Cetak</td>
            <td class="val">: ${currentDateStr}</td>
          </tr>
        </table>

        <!-- Aggregate Summary Strip -->
        <table class="stats-cards">
          <tr>
            <td style="background: #f0fdf4;">
              <div class="stat-label" style="color: #166534;">Total Tabungan Kelas</div>
              <div class="stat-val" style="color: #15803d;">${formatRupiah(totalSavings)}</div>
            </td>
            <td style="background: #f8fafc;">
              <div class="stat-label">Total SPP Terbayar</div>
              <div class="stat-val" style="color: #0f172a;">${formatRupiah(totalSppPaid)}</div>
            </td>
            <td style="background: #fff1f2;">
              <div class="stat-label" style="color: #b91c1c;">Total Tunggakan SPP</div>
              <div class="stat-val" style="color: #dc2626;">${formatRupiah(totalSppUnpaid)}</div>
            </td>
            <td style="background: #fff1f2;">
              <div class="stat-label" style="color: #b91c1c;">Total Tunggakan Iuran Lain</div>
              <div class="stat-val" style="color: #dc2626;">${formatRupiah(totalMiscUnpaid)}</div>
            </td>
            <td style="background: #fee2e2;">
              <div class="stat-label" style="color: #991b1b;">Total Tunggakan Keseluruhan</div>
              <div class="stat-val" style="color: #b91c1c;">${formatRupiah(grandTotalArrears)}</div>
            </td>
            <td style="background: #f8fafc;">
              <div class="stat-label">Status Kelengkapan Siswa</div>
              <div class="stat-val" style="font-size: 11px;">
                <span style="color: #15803d;">${countClearStudents} Lunas</span> / <span style="color: #b91c1c;">${countArrearsStudents} Menunggak</span>
              </div>
            </td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 3%;">No</th>
              <th style="width: 8%;">NIS</th>
              <th style="width: 22%; text-align: left;">Nama Siswa</th>
              <th style="width: 11%; text-align: right;">Saldo Tabungan</th>
              <th style="width: 10%; text-align: right;">SPP Lunas</th>
              <th style="width: 14%; text-align: right;">Tunggakan SPP</th>
              <th style="width: 14%; text-align: right;">Tunggakan Iuran</th>
              <th style="width: 11%; text-align: right;">Total Menunggak</th>
              <th style="width: 7%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" style="text-align: center; font-weight: bold; border: 1px solid #64748b;">TOTAL REKAPITULASI KELAS</td>
              <td style="text-align: right; border: 1px solid #64748b; color: #166534;">${formatRupiah(totalSavings)}</td>
              <td style="text-align: right; border: 1px solid #64748b;">${formatRupiah(totalSppPaid)}</td>
              <td style="text-align: right; border: 1px solid #64748b; color: #b91c1c;">${formatRupiah(totalSppUnpaid)}</td>
              <td style="text-align: right; border: 1px solid #64748b; color: #b91c1c;">${formatRupiah(totalMiscUnpaid)}</td>
              <td style="text-align: right; border: 1px solid #64748b; color: #991b1b; font-weight: 800;">${formatRupiah(grandTotalArrears)}</td>
              <td style="text-align: center; border: 1px solid #64748b;">-</td>
            </tr>
          </tfoot>
        </table>

        <table class="signatures">
          <tr>
            <td>
              Mengetahui,<br/>
              Kepala Sekolah
              <div class="sig-space"></div>
              <strong><u>${schoolPrincipal}</u></strong><br/>
              <span style="font-size: 10px; color: #64748b;">NIP / PegID -</span>
            </td>
            <td>
              Pandaan, ${currentDateStr}<br/>
              Wali Kelas ${className}
              <div class="sig-space"></div>
              <strong><u>${teacherName}</u></strong><br/>
              <span style="font-size: 10px; color: #64748b;">NIP / PegID -</span>
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
}
