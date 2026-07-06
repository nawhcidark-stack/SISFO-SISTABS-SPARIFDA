import * as XLSX from "xlsx";

// 1. Export Daily Report (Laporan Harian) to Excel
export function exportDailyReportToExcel(params: {
  date: string;
  totalSppTunai: number;
  totalSppOnline: number;
  totalTabunganMasuk: number;
  totalTabunganKeluar: number;
  totalKasMasukLokal: number;
  netKasLokal: number;
  totalMidtransToday: number;
  sppPaidToday: any[];
  savingsToday: any[];
  midtransTransactionsToday: any[];
  students: any[];
}) {
  const {
    date,
    totalSppTunai,
    totalSppOnline,
    totalTabunganMasuk,
    totalTabunganKeluar,
    totalKasMasukLokal,
    netKasLokal,
    totalMidtransToday,
    sppPaidToday,
    savingsToday,
    midtransTransactionsToday,
    students,
  } = params;

  const wb = XLSX.utils.book_new();

  // --- SHEET 1: RINGKASAN ---
  const ringkasanData = [
    ["LAPORAN HARIAN KEUANGAN SEKOLAH"],
    ["SMP MAARIF NU PANDAAN"],
    [`Tanggal: ${date}`],
    [],
    ["RINGKASAN ARUS KAS"],
    ["Kategori", "Penerimaan / Pengeluaran", "Nominal (IDR)"],
    ["Iuran SPP Tunai / Manual", "Penerimaan", totalSppTunai],
    ["Iuran SPP Online (Midtrans)", "Penerimaan", totalSppOnline],
    ["Setoran Tabungan Tunai", "Penerimaan", totalTabunganMasuk],
    ["Penarikan Tabungan Tunai", "Pengeluaran", totalTabunganKeluar],
    ["Total Kas Masuk Lokal (SPP Tunai + Setor Tabungan)", "Penerimaan", totalKasMasukLokal],
    ["Net Kas Lokal (Kas Masuk - Tarik Tabungan)", "Saldo", netKasLokal],
    ["Total Transaksi Midtrans Online", "Penerimaan", totalMidtransToday],
  ];
  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
  XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan Kas");

  // --- SHEET 2: SPP TUNAI / MANUAL ---
  const sppHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Bulan Tagihan", "Metode Pembayaran", "Nominal (IDR)"];
  const sppRows = sppPaidToday.map((b, idx) => {
    const s = students.find((st) => st.id === b.studentId);
    return [
      idx + 1,
      b.paidAt ? new Date(b.paidAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
      s?.nis || "-",
      s?.name || "Siswa dihapus",
      s?.class ? `Kelas ${s.class}` : "-",
      `${b.month} ${b.year}`,
      b.paymentMethod || "Manual",
      b.amount,
    ];
  });
  const sppSheetData = [
    ["LAPORAN TRANSAKSI SPP HARIAN (TUNAI & MANUAL)"],
    [`Tanggal: ${date}`],
    [],
    sppHeaders,
    ...sppRows,
  ];
  const wsSpp = XLSX.utils.aoa_to_sheet(sppSheetData);
  XLSX.utils.book_append_sheet(wb, wsSpp, "SPP Tunai & Manual");

  // --- SHEET 3: MUTASI TABUNGAN ---
  const tabunganHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Jenis Mutasi", "Keterangan", "Nominal (IDR)"];
  const tabunganRows = savingsToday.map((t, idx) => {
    const s = students.find((st) => st.id === t.studentId);
    return [
      idx + 1,
      t.createdAt ? new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
      s?.nis || "-",
      s?.name || "Siswa dihapus",
      s?.class ? `Kelas ${s.class}` : "-",
      t.type === "deposit" ? "SETOR" : "TARIK",
      t.notes || "-",
      t.amount,
    ];
  });
  const tabunganSheetData = [
    ["LAPORAN MUTASI TABUNGAN HARIAN"],
    [`Tanggal: ${date}`],
    [],
    tabunganHeaders,
    ...tabunganRows,
  ];
  const wsTabungan = XLSX.utils.aoa_to_sheet(tabunganSheetData);
  XLSX.utils.book_append_sheet(wb, wsTabungan, "Mutasi Tabungan");

  // --- SHEET 4: TRANSAKSI MIDTRANS ---
  const midtransHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Kategori", "Keterangan", "Order ID", "Metode Detail", "Nominal (IDR)"];
  const midtransRows = midtransTransactionsToday.map((item, idx) => {
    const s = students.find((st) => st.id === item.studentId);
    
    const getMidtransDetail = (method?: string) => {
      if (!method) return "Lain-lain";
      const match = method.match(/Midtrans \(([^)]+)\)/i);
      if (match) {
        return match[1].toUpperCase();
      }
      if (method.toLowerCase().includes("snap")) {
        return "SNAP GATEWAY";
      }
      return "ONLINE PG";
    };

    return [
      idx + 1,
      item.time ? new Date(item.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
      s?.nis || "-",
      s?.name || "Siswa dihapus",
      s?.class ? `Kelas ${s.class}` : "-",
      item.category,
      item.details,
      item.orderId || "-",
      getMidtransDetail(item.paymentMethod),
      item.amount,
    ];
  });
  const midtransSheetData = [
    ["LAPORAN TRANSAKSI MIDTRANS ONLINE"],
    [`Tanggal: ${date}`],
    [],
    midtransHeaders,
    ...midtransRows,
  ];
  const wsMidtrans = XLSX.utils.aoa_to_sheet(midtransSheetData);
  XLSX.utils.book_append_sheet(wb, wsMidtrans, "Transaksi Midtrans");

  XLSX.writeFile(wb, `Laporan_Keuangan_Harian_${date}.xlsx`);
}

// 2. Export SPP Recap (Rekap SPP) to Excel
export function exportSppRecapToExcel(params: {
  rekapSppGradeFilter: string;
  rekapSppClassFilter: string;
  rekapSppYearFilter: string;
  summaryMatrix: any[];
  globalTotalPaid: number;
  globalTotalUnpaid: number;
}) {
  const {
    rekapSppGradeFilter,
    rekapSppClassFilter,
    rekapSppYearFilter,
    summaryMatrix,
    globalTotalPaid,
    globalTotalUnpaid,
  } = params;

  const wb = XLSX.utils.book_new();

  const headers = [
    "No",
    "NIS",
    "Nama Siswa",
    "Kelas",
    "Persentase Kelunasan",
    "Lunas (Bulan)",
    "Total Lunas (IDR)",
    "Total Tertunggak (IDR)"
  ];

  const rows = summaryMatrix.map((item, idx) => [
    idx + 1,
    item.student.nis,
    item.student.name,
    item.student.class ? `Kelas ${item.student.class}` : "-",
    `${item.pct}%`,
    `${item.paidCount} / ${item.totalBillsCount} Bulan`,
    item.totalPaidNominal,
    item.totalUnpaidNominal,
  ]);

  const sheetData = [
    ["REKAPITULASI TAGIHAN SPP BULANAN"],
    ["SMP MAARIF NU PANDAAN"],
    [`Tingkat: ${rekapSppGradeFilter === "all" ? "Semua" : `Kelas ${rekapSppGradeFilter}`}`],
    [`Kelas: ${rekapSppClassFilter === "all" ? "Semua" : `Kelas ${rekapSppClassFilter}`}`],
    [`Tahun Ajaran: ${rekapSppYearFilter === "all" ? "Semua" : `TA ${rekapSppYearFilter}`}`],
    [],
    ["Ringkasan Dana"],
    ["Total Dana Masuk SPP", globalTotalPaid],
    ["Total Piutang Tertunggak SPP", globalTotalUnpaid],
    [],
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "Rekap SPP");

  const gradeName = rekapSppGradeFilter === "all" ? "SemuaTingkat" : `Tingkat${rekapSppGradeFilter}`;
  const className = rekapSppClassFilter === "all" ? "SemuaKelas" : `Kelas${rekapSppClassFilter}`;
  const rawYear = rekapSppYearFilter === "all" ? "SemuaTA" : `TA_${rekapSppYearFilter}`;
  const safeYear = rawYear.replace(/\//g, "-");

  const fileName = `Rekap_SPP_${gradeName}_${className}_${safeYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 3. Export Savings Recap (Rekap Tabungan) to Excel
export function exportSavingsRecapToExcel(params: {
  rekapTabunganGradeFilter: string;
  rekapTabunganClassFilter: string;
  orderedStudentsBySavings: any[];
  totalGlobalSavings: number;
  countActiveAccounts: number;
  filteredTabunganStudentsLength: number;
}) {
  const {
    rekapTabunganGradeFilter,
    rekapTabunganClassFilter,
    orderedStudentsBySavings,
    totalGlobalSavings,
    countActiveAccounts,
    filteredTabunganStudentsLength,
  } = params;

  const wb = XLSX.utils.book_new();

  const headers = ["No", "NIS", "Nama Siswa", "Kelas", "Saldo Tabungan Saat Ini (IDR)"];
  const rows = orderedStudentsBySavings.map((student, idx) => [
    idx + 1,
    student.nis,
    student.name,
    student.class ? `Kelas ${student.class}` : "-",
    student.savingsBalance,
  ]);

  const rate = filteredTabunganStudentsLength > 0 ? Math.round(totalGlobalSavings / filteredTabunganStudentsLength) : 0;
  const pctActive = filteredTabunganStudentsLength > 0 ? Math.round((countActiveAccounts / filteredTabunganStudentsLength) * 100) : 0;

  const sheetData = [
    ["REKAPITULASI SALDO TABUNGAN SISWA"],
    ["SMP MAARIF NU PANDAAN"],
    [`Tingkat: ${rekapTabunganGradeFilter === "all" ? "Semua" : `Tingkat ${rekapTabunganGradeFilter}`}`],
    [`Kelas: ${rekapTabunganClassFilter === "all" ? "Semua" : `Kelas ${rekapTabunganClassFilter}`}`],
    [],
    ["Ringkasan Tabungan"],
    ["Total Tabungan Global", totalGlobalSavings],
    ["Rekening Terisi / Aktif Setor", `${countActiveAccounts} Siswa (${pctActive}%)`],
    ["Rata-rata Saldo Tabungan", rate],
    [],
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Tabungan");

  const gradeName = rekapTabunganGradeFilter === "all" ? "SemuaTingkat" : `Tingkat${rekapTabunganGradeFilter}`;
  const className = rekapTabunganClassFilter === "all" ? "SemuaKelas" : `Kelas${rekapTabunganClassFilter}`;

  const fileName = `Rekap_Tabungan_${gradeName}_${className}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 4. Export Misc Recap (Rekap Lain-lain) to Excel
export function exportMiscRecapToExcel(params: {
  rekapMiscGradeFilter: string;
  rekapMiscClassFilter: string;
  totalMiscTarget: number;
  totalMiscPaid: number;
  totalMiscUnpaid: number;
  groupedMiscList: any[];
  studentMiscDetails: any[];
}) {
  const {
    rekapMiscGradeFilter,
    rekapMiscClassFilter,
    totalMiscTarget,
    totalMiscPaid,
    totalMiscUnpaid,
    groupedMiscList,
    studentMiscDetails,
  } = params;

  const wb = XLSX.utils.book_new();

  // SHEET 1: RINGKASAN JENIS TAGIHAN
  const summaryHeaders = ["No", "Nama Tagihan / Kegiatan", "Tingkat Penagihan (Siswa Lunas)", "Total Tagihan (IDR)", "Realisasi Setoran (IDR)", "Progress %"];
  const summaryRows = groupedMiscList.map((item, idx) => [
    idx + 1,
    item.title,
    `${item.paidCount} / ${item.targetCount} Siswa`,
    item.targetNominal,
    item.paidNominal,
    `${item.pct}%`,
  ]);

  const summarySheetData = [
    ["REKAPITULASI PEMBAYARAN LAIN-LAIN (NON-SPP)"],
    ["SMP MAARIF NU PANDAAN"],
    [`Tingkat: ${rekapMiscGradeFilter === "all" ? "Semua" : `Tingkat ${rekapMiscGradeFilter}`}`],
    [`Kelas: ${rekapMiscClassFilter === "all" ? "Semua" : `Kelas ${rekapMiscClassFilter}`}`],
    [],
    ["Ringkasan Dana"],
    ["Total Tagihan Lain-lain", totalMiscTarget],
    ["Realisasi Setoran", totalMiscPaid],
    ["Sisa Tunggakan", totalMiscUnpaid],
    [],
    ["RINGKASAN PER JENIS TAGIHAN"],
    summaryHeaders,
    ...summaryRows,
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Jenis Tagihan");

  // SHEET 2: DETAIL PER SISWA
  const studentHeaders = ["No", "NIS", "Nama Siswa", "Kelas", "Total Tagihan (IDR)", "Realisasi Setoran (IDR)", "Sisa Tunggakan (IDR)"];
  const studentRows = studentMiscDetails.map((item, idx) => [
    idx + 1,
    item.student.nis,
    item.student.name,
    item.student.class ? `Kelas ${item.student.class}` : "-",
    item.totalBilled,
    item.totalPaid,
    item.totalUnpaid,
  ]);

  const studentSheetData = [
    ["DETAIL TAGIHAN LAIN-LAIN PER SISWA"],
    ["SMP MAARIF NU PANDAAN"],
    [],
    studentHeaders,
    ...studentRows,
  ];

  const wsStudents = XLSX.utils.aoa_to_sheet(studentSheetData);
  XLSX.utils.book_append_sheet(wb, wsStudents, "Detail Per Siswa");

  const gradeName = rekapMiscGradeFilter === "all" ? "SemuaTingkat" : `Tingkat${rekapMiscGradeFilter}`;
  const className = rekapMiscClassFilter === "all" ? "SemuaKelas" : `Kelas${rekapMiscClassFilter}`;

  const fileName = `Rekap_Lain_Lain_${gradeName}_${className}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
