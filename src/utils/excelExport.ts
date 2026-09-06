import * as XLSX from "xlsx";

// 1. Export Daily Report (Laporan Harian) to Excel
export function exportDailyReportToExcel(params: {
  date: string;
  totalSppTunai: number;
  totalSppOnline: number;
  totalMiscTunai?: number;
  totalMiscOnline?: number;
  totalTabunganMasuk: number;
  totalTabunganKeluar: number;
  totalKasMasukLokal: number;
  totalBkuPengeluaran?: number;
  netKasLokal: number;
  totalMidtransToday: number;
  sppPaidToday: any[];
  miscPaidToday?: any[];
  savingsToday: any[];
  midtransTransactionsToday: any[];
  bkuToday?: any[];
  students: any[];
}) {
  const {
    date,
    totalSppTunai,
    totalSppOnline,
    totalMiscTunai = 0,
    totalMiscOnline = 0,
    totalTabunganMasuk,
    totalTabunganKeluar,
    totalKasMasukLokal,
    totalBkuPengeluaran = 0,
    netKasLokal,
    totalMidtransToday,
    sppPaidToday,
    miscPaidToday = [],
    savingsToday,
    midtransTransactionsToday,
    bkuToday = [],
    students,
  } = params;

  const wb = XLSX.utils.book_new();

  // Helper for Midtrans payment channel detection
  const getMidtransDetail = (method?: string) => {
    if (!method) return "Lain-lain";
    const match = method.match(/Midtrans \(([^)]+)\)/i);
    if (match) {
      return match[1].toUpperCase();
    }
    if (method.toLowerCase().includes("snap")) {
      return "SNAP GATEWAY";
    }
    if (method.toLowerCase().includes("midtrans")) {
      return "MIDTRANS ONLINE";
    }
    return method.toUpperCase();
  };

  // Channel breakdown calculation
  const channelSummary: { [channel: string]: { count: number; total: number } } = {};
  midtransTransactionsToday.forEach((item) => {
    const ch = getMidtransDetail(item.paymentMethod);
    if (!channelSummary[ch]) {
      channelSummary[ch] = { count: 0, total: 0 };
    }
    channelSummary[ch].count += 1;
    channelSummary[ch].total += item.amount;
  });

  const channelRows = Object.entries(channelSummary).map(([channel, stat]) => [
    channel,
    stat.count,
    stat.total,
  ]);

  // --- SHEET 1: RINGKASAN ARUS KAS ---
  const ringkasanData = [
    ["LAPORAN LENGKAP KEUANGAN HARIAN SEKOLAH"],
    ["SMP MAARIF NU PANDAAN"],
    [`Tanggal Buku Teller: ${date}`],
    [],
    ["1. RINGKASAN PENERIMAAN & PENGELUARAN"],
    ["Kategori Pemasukan / Pengeluaran", "Jenis Aliran", "Nominal (IDR)"],
    ["Iuran SPP Tunai / Teller Manual", "Penerimaan Brankas", totalSppTunai],
    ["Iuran SPP Online (Midtrans Gateway)", "Penerimaan Online", totalSppOnline],
    ["Tagihan Lain-Lain Tunai / Manual", "Penerimaan Brankas", totalMiscTunai],
    ["Tagihan Lain-Lain Online (Midtrans Gateway)", "Penerimaan Online", totalMiscOnline],
    ["Setoran Tabungan Siswa Tunai", "Penerimaan Brankas", totalTabunganMasuk],
    ["Penarikan Tabungan Siswa (Kredit)", "Pengeluaran Brankas", totalTabunganKeluar],
    ["Pengeluaran BKU / Kas Operasional Sekolah", "Pengeluaran Kas", totalBkuPengeluaran],
    [],
    ["2. REKONSILIASI KAS & ONLINE"],
    ["Total Kas Masuk Brankas Lokal (SPP Tunai + Misc Tunai + Setor Tabungan)", "Penerimaan Lokal", totalKasMasukLokal],
    ["Net Aliran Kas Teller Lokal (Kas Masuk - Tarik Tabungan - BKU)", "Saldo Net Brankas", netKasLokal],
    ["Total Gateway Midtrans Online (SPP + Misc + Tabungan Online)", "Penerimaan Online", totalMidtransToday],
    [],
    ["3. BREAKDOWN METODE PEMBAYARAN MIDTRANS ONLINE"],
    ["Channel Payment Gateway", "Jumlah Transaksi", "Total Nominal (IDR)"],
    ...channelRows,
  ];
  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);
  XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan Kas");

  // --- SHEET 2: SPP LUNAS HARIAN ---
  const sppHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Bulan Tagihan", "Metode Pembayaran", "Channel Detail", "Order ID / Ref", "Nominal (IDR)"];
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
      getMidtransDetail(b.paymentMethod),
      b.orderId || "-",
      b.amount,
    ];
  });
  const totalSppPaid = sppPaidToday.reduce((acc, c) => acc + c.amount, 0);
  const sppSheetData = [
    ["LAPORAN TRANSAKSI SPP LUNAS HARIAN"],
    [`Tanggal: ${date}`],
    [],
    sppHeaders,
    ...sppRows,
    [],
    ["", "", "", "", "", "", "", "", "TOTAL SPP LUNAS:", totalSppPaid],
  ];
  const wsSpp = XLSX.utils.aoa_to_sheet(sppSheetData);
  XLSX.utils.book_append_sheet(wb, wsSpp, "SPP Lunas");

  // --- SHEET 3: TAGIHAN LAIN-LAIN LUNAS HARIAN ---
  const miscHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Judul Tagihan", "Pos Anggaran", "Metode Pembayaran", "Channel Detail", "Order ID / Ref", "Nominal (IDR)"];
  const miscRows = miscPaidToday.map((b, idx) => {
    const s = students.find((st) => st.id === b.studentId);
    return [
      idx + 1,
      b.paidAt ? new Date(b.paidAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
      s?.nis || "-",
      s?.name || "Siswa dihapus",
      s?.class ? `Kelas ${s.class}` : "-",
      b.title || "Tagihan Lain",
      b.category || "Operasional",
      b.paymentMethod || "Manual",
      getMidtransDetail(b.paymentMethod),
      b.orderId || "-",
      b.amount,
    ];
  });
  const totalMiscPaid = miscPaidToday.reduce((acc, c) => acc + c.amount, 0);
  const miscSheetData = [
    ["LAPORAN TRANSAKSI TAGIHAN LAIN-LAIN / NON-SPP HARIAN"],
    [`Tanggal: ${date}`],
    [],
    miscHeaders,
    ...miscRows,
    [],
    ["", "", "", "", "", "", "", "", "", "TOTAL TAGIHAN LAIN:", totalMiscPaid],
  ];
  const wsMisc = XLSX.utils.aoa_to_sheet(miscSheetData);
  XLSX.utils.book_append_sheet(wb, wsMisc, "Tagihan Lain-Lain");

  // --- SHEET 4: MUTASI TABUNGAN ---
  const tabunganHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Jenis Mutasi", "Metode Pembayaran", "Keterangan", "Order ID / Ref", "Nominal (IDR)"];
  const tabunganRows = savingsToday.map((t, idx) => {
    const s = students.find((st) => st.id === t.studentId);
    return [
      idx + 1,
      t.createdAt ? new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
      s?.nis || "-",
      s?.name || "Siswa dihapus",
      s?.class ? `Kelas ${s.class}` : "-",
      t.type === "deposit" ? "SETOR" : "TARIK",
      t.paymentMethod || "Cash/Teller",
      t.notes || "-",
      t.orderId || "-",
      t.amount,
    ];
  });
  const tabunganSheetData = [
    ["LAPORAN MUTASI TABUNGAN SISWA HARIAN"],
    [`Tanggal: ${date}`],
    [],
    tabunganHeaders,
    ...tabunganRows,
    [],
    ["", "", "", "", "", "", "", "", "TOTAL SETORAN TABUNGAN:", totalTabunganMasuk],
    ["", "", "", "", "", "", "", "", "TOTAL PENARIKAN TABUNGAN:", totalTabunganKeluar],
  ];
  const wsTabungan = XLSX.utils.aoa_to_sheet(tabunganSheetData);
  XLSX.utils.book_append_sheet(wb, wsTabungan, "Mutasi Tabungan");

  // --- SHEET 5: TRANSAKSI MIDTRANS ONLINE ---
  const midtransHeaders = ["No", "Waktu", "NIS", "Nama Siswa", "Kelas", "Kategori", "Detail Keterangan", "Order ID Midtrans", "Channel Payment", "Status", "Nominal (IDR)"];
  const midtransRows = midtransTransactionsToday.map((item, idx) => {
    const s = students.find((st) => st.id === item.studentId);
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
      "LUNAS / SETTLEMENT",
      item.amount,
    ];
  });
  const midtransSheetData = [
    ["LAPORAN TRANSAKSI REKAPITULASI MIDTRANS ONLINE GATEWAY"],
    [`Tanggal: ${date}`],
    [],
    midtransHeaders,
    ...midtransRows,
    [],
    ["", "", "", "", "", "", "", "", "", "TOTAL MIDTRANS ONLINE:", totalMidtransToday],
  ];
  const wsMidtrans = XLSX.utils.aoa_to_sheet(midtransSheetData);
  XLSX.utils.book_append_sheet(wb, wsMidtrans, "Transaksi Midtrans");

  // --- SHEET 6: BUKU KAS UMUM (BKU) OPERASIONAL ---
  const bkuHeaders = ["No", "Tanggal", "Jenis", "Kategori POS", "Deskripsi / Keterangan", "Pencatat / Sumber", "Nominal (IDR)"];
  const bkuRows = bkuToday.map((t, idx) => [
    idx + 1,
    t.date || date,
    t.type === "incoming" ? "Pemasukan" : "Pengeluaran",
    t.category || "Operasional",
    t.description || "-",
    t.createdBy || t.source || "Bendahara",
    t.amount || 0,
  ]);
  const bkuSheetData = [
    ["BUKU KAS UMUM (BKU) OPERASIONAL BENDAHARA"],
    [`Tanggal: ${date}`],
    [],
    bkuHeaders,
    ...bkuRows,
    [],
    ["", "", "", "", "", "TOTAL BKU PENGELUARAN:", totalBkuPengeluaran],
  ];
  const wsBku = XLSX.utils.aoa_to_sheet(bkuSheetData);
  XLSX.utils.book_append_sheet(wb, wsBku, "Jurnal BKU Operasional");

  XLSX.writeFile(wb, `Laporan_Keuangan_Harian_Lengkap_${date}.xlsx`);
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

// 2b. Export SPP Checklist Matrix (Rekap Ceklist SPP) to Excel
export function exportSppChecklistToExcel(params: {
  rekapSppGradeFilter: string;
  rekapSppClassFilter: string;
  rekapSppYearFilter: string;
  checklistMatrix: any[];
  globalTotalPaid: number;
  globalTotalUnpaid: number;
}) {
  const {
    rekapSppGradeFilter,
    rekapSppClassFilter,
    rekapSppYearFilter,
    checklistMatrix,
    globalTotalPaid,
    globalTotalUnpaid,
  } = params;

  const wb = XLSX.utils.book_new();

  const headers = [
    "No",
    "NIS",
    "Nama Siswa",
    "Kelas",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Kelunasan (Bulan)",
    "Total Tunggakan (IDR)"
  ];

  const months = ["Juli", "Agustus", "September", "Oktober", "November", "Desember", "Januari", "Februari", "Maret", "April", "Mei", "Juni"];

  const rows = checklistMatrix.map((item, idx) => {
    const monthCols = months.map(m => {
      const st = item.monthlyMap?.[m]?.status;
      if (st === "paid") return "✓";
      if (st === "waived") return "Beasiswa";
      if (st === "unpaid") return "✗";
      return "-";
    });

    return [
      idx + 1,
      item.student.nis,
      item.student.name,
      item.student.class ? `Kelas ${item.student.class}` : "-",
      ...monthCols,
      `${item.paidCount} / ${item.totalBillsCount} Bulan`,
      item.totalUnpaidNominal,
    ];
  });

  const sheetData = [
    ["REKAPITULASI CEKLIST PEMBAYARAN SPP BULANAN"],
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
    [],
    ["Keterangan: ✓ = Lunas, Beasiswa = Bebas/Beasiswa, ✗ = Belum Lunas, - = Non-Aktif/Tanpa Tagihan"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Ceklist SPP");

  const gradeName = rekapSppGradeFilter === "all" ? "SemuaTingkat" : `Tingkat${rekapSppGradeFilter}`;
  const className = rekapSppClassFilter === "all" ? "SemuaKelas" : `Kelas${rekapSppClassFilter}`;
  const rawYear = rekapSppYearFilter === "all" ? "SemuaTA" : `TA_${rekapSppYearFilter}`;
  const safeYear = rawYear.replace(/\//g, "-");

  const fileName = `Rekap_Ceklist_SPP_${gradeName}_${className}_${safeYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 3. Export Savings Recap (Rekap Tabungan) to Excel (Lengkap dengan Mutasi & Memo)
export interface ExportSavingsRecapOptions {
  rekapTabunganGradeFilter: string;
  rekapTabunganClassFilter: string;
  orderedStudentsBySavings: any[];
  totalGlobalSavings: number;
  countActiveAccounts: number;
  filteredTabunganStudentsLength: number;
  transactions?: any[];
  includeMutations?: boolean;
  onlyMutations?: boolean;
  startDate?: string;
  endDate?: string;
  schoolName?: string;
}

export function exportSavingsRecapToExcel(params: ExportSavingsRecapOptions) {
  const {
    rekapTabunganGradeFilter,
    rekapTabunganClassFilter,
    orderedStudentsBySavings,
    totalGlobalSavings,
    countActiveAccounts,
    filteredTabunganStudentsLength,
    transactions = [],
    includeMutations = false,
    onlyMutations = false,
    startDate,
    endDate,
    schoolName = "SMP MAARIF NU PANDAAN",
  } = params;

  const wb = XLSX.utils.book_new();

  // Create fast lookup maps for students
  const studentMap = new Map<string, any>();
  const studentNisMap = new Map<string, any>();
  orderedStudentsBySavings.forEach((s) => {
    if (s.id) studentMap.set(String(s.id), s);
    if (s.nis) studentNisMap.set(String(s.nis).trim(), s);
  });

  // Track per-student mutation statistics
  const studentStats = new Map<
    string,
    { deposits: number; withdrawals: number; count: number; lastDate: string }
  >();
  orderedStudentsBySavings.forEach((s) => {
    studentStats.set(String(s.id), {
      deposits: 0,
      withdrawals: 0,
      count: 0,
      lastDate: "-",
    });
  });

  // Filter transactions for relevant students and date range
  const relevantTxs: any[] = [];
  let totalMutasiSetor = 0;
  let totalMutasiTarik = 0;

  transactions.forEach((tx) => {
    if (
      tx.status &&
      tx.status !== "success" &&
      tx.status !== "completed" &&
      tx.status !== "settlement"
    ) {
      return;
    }

    const matchedStudent =
      (tx.studentId && studentMap.get(String(tx.studentId))) ||
      (tx.studentNis && studentNisMap.get(String(tx.studentNis).trim())) ||
      (tx.studentId && studentNisMap.get(String(tx.studentId).trim()));

    if (!matchedStudent) return;

    if (startDate && tx.createdAt && tx.createdAt.substring(0, 10) < startDate)
      return;
    if (endDate && tx.createdAt && tx.createdAt.substring(0, 10) > endDate)
      return;

    const isDeposit = tx.type === "deposit";
    const amount = Number(tx.amount) || 0;
    if (isDeposit) {
      totalMutasiSetor += amount;
    } else {
      totalMutasiTarik += amount;
    }

    const stat = studentStats.get(String(matchedStudent.id));
    if (stat) {
      if (isDeposit) stat.deposits += amount;
      else stat.withdrawals += amount;
      stat.count += 1;
      if (
        !stat.lastDate ||
        stat.lastDate === "-" ||
        new Date(tx.createdAt).getTime() > new Date(stat.lastDate).getTime()
      ) {
        stat.lastDate = tx.createdAt;
      }
    }

    relevantTxs.push({
      ...tx,
      student: matchedStudent,
    });
  });

  // Sort transactions chronologically (oldest to newest for proper ledger)
  relevantTxs.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const gradeName =
    rekapTabunganGradeFilter === "all"
      ? "SemuaTingkat"
      : `Tingkat${rekapTabunganGradeFilter}`;
  const className =
    rekapTabunganClassFilter === "all"
      ? "SemuaKelas"
      : `Kelas${rekapTabunganClassFilter}`;
  const dateStamp = new Date().toISOString().split("T")[0];

  const rate =
    filteredTabunganStudentsLength > 0
      ? Math.round(totalGlobalSavings / filteredTabunganStudentsLength)
      : 0;
  const pctActive =
    filteredTabunganStudentsLength > 0
      ? Math.round(
          (countActiveAccounts / filteredTabunganStudentsLength) * 100,
        )
      : 0;

  // -------------------------------------------------------------
  // SHEET 1: RINGKASAN SALDO TABUNGAN (Jika bukan mode onlyMutations)
  // -------------------------------------------------------------
  if (!onlyMutations) {
    const headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Total Akumulasi Setor (IDR)",
      "Total Akumulasi Tarik (IDR)",
      "Saldo Tabungan Akhir (IDR)",
      "Frekuensi Mutasi",
      "Status Rekening",
      "Transaksi Terakhir",
    ];

    const rows = orderedStudentsBySavings.map((student, idx) => {
      const stat = studentStats.get(String(student.id)) || {
        deposits: 0,
        withdrawals: 0,
        count: 0,
        lastDate: "-",
      };
      const lastDateFormatted =
        stat.lastDate && stat.lastDate !== "-"
          ? new Date(stat.lastDate).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "-";

      return [
        idx + 1,
        student.nis,
        student.name,
        student.class ? `Kelas ${student.class}` : "-",
        stat.deposits > 0
          ? stat.deposits
          : student.savingsBalance > 0
            ? student.savingsBalance
            : 0,
        stat.withdrawals,
        student.savingsBalance,
        `${stat.count}x Transaksi`,
        student.savingsBalance > 0 ? "Aktif (Ada Saldo)" : "Saldo Nol",
        lastDateFormatted,
      ];
    });

    const sheetData = [
      ["REKAPITULASI SALDO TABUNGAN SISWA"],
      [schoolName],
      [
        `Tingkat: ${rekapTabunganGradeFilter === "all" ? "Semua Tingkat" : `Tingkat ${rekapTabunganGradeFilter}`} | Kelas: ${rekapTabunganClassFilter === "all" ? "Semua Kelas" : `Kelas ${rekapTabunganClassFilter}`}`,
      ],
      [
        `Dicetak Pada: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
      ],
      [],
      ["RINGKASAN TABUNGAN FILTERED"],
      ["Total Tabungan Global Siswa (IDR)", totalGlobalSavings],
      [
        "Rekening Terisi / Aktif Memiliki Saldo",
        `${countActiveAccounts} Siswa (${pctActive}%)`,
      ],
      [
        "Total Akumulasi Setoran Tercatat (IDR)",
        totalMutasiSetor > 0 ? totalMutasiSetor : totalGlobalSavings,
      ],
      ["Total Akumulasi Penarikan Tercatat (IDR)", totalMutasiTarik],
      ["Rata-rata Saldo Tabungan Per Siswa (IDR)", rate],
      [
        "Total Riwayat Transaksi Mutasi",
        `${relevantTxs.length} Baris Transaksi`,
      ],
      [],
      headers,
      ...rows,
      [],
      [
        "",
        "",
        "",
        "TOTAL SALDO TABUNGAN:",
        "",
        "",
        totalGlobalSavings,
        `${relevantTxs.length}x`,
        "",
        "",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 30 },
      { wch: 14 },
      { wch: 26 },
      { wch: 26 },
      { wch: 26 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Ringkasan Saldo");
  }

  // -------------------------------------------------------------
  // SHEET 2: BUKU BESAR MUTASI & MEMO LENGKAP
  // -------------------------------------------------------------
  if (includeMutations || onlyMutations) {
    const mutasiHeaders = [
      "No",
      "Waktu Mutasi (Tgl & Jam)",
      "NIS",
      "Nama Siswa",
      "Kelas",
      "Jenis Mutasi",
      "Nominal Setor / Masuk (IDR)",
      "Nominal Tarik / Keluar (IDR)",
      "Saldo Akhir Siswa (IDR)",
      "Metode Pembayaran / Saluran",
      "No. Order / Ref Transaksi",
      "Keterangan / Memo Mutasi",
      "Status Verifikasi",
    ];

    const mutasiRows = relevantTxs.map((tx, idx) => {
      const isDeposit = tx.type === "deposit";
      const d = tx.createdAt ? new Date(tx.createdAt) : null;
      const timeFormatted = d
        ? `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
        : "-";

      let memo = tx.notes ? String(tx.notes).trim() : "";
      if (!memo) {
        memo = isDeposit
          ? "Setoran Tabungan Siswa"
          : "Penarikan Dana Tabungan";
      }

      let method = tx.paymentMethod || "Loket Teller";
      if (tx.orderId && tx.orderId.toLowerCase().includes("midtrans")) {
        method = "Midtrans Online";
      } else if (tx.orderId && tx.orderId.startsWith("SAV-")) {
        method = "Loket Teller Sekolah";
      }

      return [
        idx + 1,
        timeFormatted,
        tx.student?.nis || tx.studentNis || "-",
        tx.student?.name || tx.studentName || "Siswa",
        tx.student?.class ? `Kelas ${tx.student.class}` : "-",
        isDeposit ? "SETORAN (MASUK)" : "PENARIKAN (KELUAR)",
        isDeposit ? tx.amount : 0,
        !isDeposit ? tx.amount : 0,
        tx.student?.savingsBalance ?? "-",
        method,
        tx.orderId || tx.transactionId || tx.id || "-",
        memo,
        tx.status === "success" || !tx.status || tx.status === "completed"
          ? "BERHASIL / VALID"
          : String(tx.status).toUpperCase(),
      ];
    });

    const dateFilterNote =
      startDate || endDate
        ? ` | Periode: ${startDate || "Awal"} s.d. ${endDate || "Sekarang"}`
        : " | Periode: Seluruh Riwayat";

    const mutasiSheetData = [
      ["BUKU BESAR MUTASI & MEMO TRANSAKSI TABUNGAN SISWA"],
      [schoolName],
      [
        `Tingkat: ${rekapTabunganGradeFilter === "all" ? "Semua Tingkat" : `Tingkat ${rekapTabunganGradeFilter}`} | Kelas: ${rekapTabunganClassFilter === "all" ? "Semua Kelas" : `Kelas ${rekapTabunganClassFilter}`}${dateFilterNote}`,
      ],
      [
        `Tanggal Unduh: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
      ],
      [],
      ["REKAPITULASI ARUS MUTASI KAS TABUNGAN"],
      ["Total Frekuensi Transaksi Mutasi", `${relevantTxs.length} Transaksi`],
      ["Total Nominal Setoran / Masuk (IDR)", totalMutasiSetor],
      ["Total Nominal Penarikan / Keluar (IDR)", totalMutasiTarik],
      [
        "Net Arus Bersih Kas Tabungan (IDR)",
        totalMutasiSetor - totalMutasiTarik,
      ],
      [],
      mutasiHeaders,
      ...mutasiRows,
      [],
      [
        "",
        "",
        "",
        "",
        "",
        "TOTAL KESELURUHAN MUTASI:",
        totalMutasiSetor,
        totalMutasiTarik,
        "",
        "",
        "",
        `Selisih Bersih: Rp ${(totalMutasiSetor - totalMutasiTarik).toLocaleString("id-ID")}`,
        "",
      ],
    ];

    const wsMutasi = XLSX.utils.aoa_to_sheet(mutasiSheetData);
    wsMutasi["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 28 },
      { wch: 12 },
      { wch: 22 },
      { wch: 26 },
      { wch: 26 },
      { wch: 22 },
      { wch: 22 },
      { wch: 26 },
      { wch: 45 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMutasi, "Buku Mutasi & Memo");
  }

  let fileName = `Rekap_Tabungan_${gradeName}_${className}.xlsx`;
  if (onlyMutations) {
    fileName = `Mutasi_Tabungan_Lengkap_${gradeName}_${className}_${dateStamp}.xlsx`;
  } else if (includeMutations) {
    fileName = `Rekap_Tabungan_Lengkap_Mutasi_Memo_${gradeName}_${className}_${dateStamp}.xlsx`;
  }

  XLSX.writeFile(wb, fileName);
}

// 3b. Export Individual Student Savings Passbook (Buku Rekening Per Siswa) to Excel
export function exportStudentSavingsPassbookToExcel(params: {
  student: any;
  transactions: any[];
  schoolName?: string;
}) {
  const {
    student,
    transactions,
    schoolName = "SMP MAARIF NU PANDAAN",
  } = params;

  const wb = XLSX.utils.book_new();

  // Filter student transactions
  const studentTxs = transactions
    .filter(
      (t) =>
        (t.studentId === student.id ||
          (student.nis &&
            String(t.studentId).trim() === String(student.nis).trim())) &&
        (t.status === "success" || !t.status || t.status === "completed"),
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  let currentBalance = 0;
  let totalDeposit = 0;
  let totalWithdrawal = 0;

  const headers = [
    "No",
    "Tanggal & Jam",
    "Jenis Transaksi",
    "Setoran / Masuk (IDR)",
    "Penarikan / Keluar (IDR)",
    "Saldo Akhir (IDR)",
    "Metode Pembayaran",
    "No. Order / Ref",
    "Memo & Keterangan Transaksi",
    "Petugas / Teller",
  ];

  const rows = studentTxs.map((tx, idx) => {
    const isDeposit = tx.type === "deposit";
    const amount = Number(tx.amount) || 0;
    if (isDeposit) {
      currentBalance += amount;
      totalDeposit += amount;
    } else {
      currentBalance -= amount;
      totalWithdrawal += amount;
    }

    const d = tx.createdAt ? new Date(tx.createdAt) : null;
    const timeFormatted = d
      ? `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
      : "-";

    let memo = tx.notes ? String(tx.notes).trim() : "";
    if (!memo) {
      memo = isDeposit ? "Setoran Tabungan" : "Penarikan Tunai";
    }

    return [
      idx + 1,
      timeFormatted,
      isDeposit ? "SETORAN" : "PENARIKAN",
      isDeposit ? amount : 0,
      !isDeposit ? amount : 0,
      currentBalance,
      tx.paymentMethod || (tx.orderId?.startsWith("SAV-") ? "Teller Sekolah" : "Cash / Tunai"),
      tx.orderId || tx.transactionId || "-",
      memo,
      "Teller Sekolah",
    ];
  });

  const finalBal = student.savingsBalance ?? currentBalance;

  const sheetData = [
    ["BUKU TABUNGAN & REKENING MUTASI SISWA"],
    [schoolName],
    [],
    ["IDENTITAS REKENING SISWA"],
    ["Nomor Induk Siswa (NIS)", student.nis || "-"],
    ["Nama Lengkap Siswa", student.name || "-"],
    ["Kelas / Rombel", student.class ? `Kelas ${student.class}` : "-"],
    ["Saldo Tabungan Saat Ini", `Rp ${finalBal.toLocaleString("id-ID")}`],
    ["Total Akumulasi Setoran", `Rp ${totalDeposit.toLocaleString("id-ID")}`],
    ["Total Akumulasi Penarikan", `Rp ${totalWithdrawal.toLocaleString("id-ID")}`],
    ["Total Transaksi Mutasi", `${studentTxs.length} Transaksi`],
    [],
    headers,
    ...rows,
    [],
    [
      "",
      "",
      "TOTAL AKUMULASI:",
      totalDeposit,
      totalWithdrawal,
      finalBal,
      "",
      "",
      `Saldo Akhir Bersih: Rp ${finalBal.toLocaleString("id-ID")}`,
      "",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 45 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Mutasi Rekening");

  const safeNis = (student.nis || "siswa").replace(/[^a-zA-Z0-9]/g, "_");
  const safeName = (student.name || "siswa").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Buku_Tabungan_${safeNis}_${safeName}.xlsx`;
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

// 5. Export Filtered Misc Bills Detailed List to Excel
export function exportFilteredMiscBillsToExcel(params: {
  filterInfo: {
    grade: string;
    classStr: string;
    type: string;
    month: string;
    status: string;
    search: string;
  };
  totalTarget: number;
  totalPaid: number;
  totalUnpaid: number;
  groupedList: any[];
  bills: any[];
  students: any[];
}) {
  const { filterInfo, totalTarget, totalPaid, totalUnpaid, groupedList, bills, students } = params;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ringkasan
  const summaryHeaders = ["No", "Nama Tagihan / Kegiatan", "Tipe", "Target Siswa", "Total Tagihan (IDR)", "Realisasi Setoran (IDR)", "Sisa Tunggakan (IDR)", "Progress %"];
  const summaryRows = groupedList.map((item, idx) => [
    idx + 1,
    item.title,
    item.isMonthly ? "Bulanan" : "Sekali Bayar",
    `${item.paidCount} / ${item.targetCount} Siswa`,
    item.targetNominal,
    item.paidNominal,
    item.targetNominal - item.paidNominal,
    `${item.pct}%`,
  ]);

  const summarySheetData = [
    ["LAPORAN REKAPITULASI PEMBAYARAN LAIN-LAIN (NON-SPP)"],
    ["SMP MAARIF NU PANDAAN"],
    [`Tingkat: ${filterInfo.grade === "all" ? "Semua" : `Tingkat ${filterInfo.grade}`}`],
    [`Kelas: ${filterInfo.classStr === "all" ? "Semua" : `Kelas ${filterInfo.classStr}`}`],
    [`Tipe Tagihan: ${filterInfo.type === "all" ? "Semua" : filterInfo.type === "once" ? "Sekali Bayar" : "Bulanan"}`],
    [`Status: ${filterInfo.status === "all" ? "Semua" : filterInfo.status === "paid" ? "Lunas" : "Belum Lunas"}`],
    filterInfo.search ? [`Pencarian: "${filterInfo.search}"`] : [],
    [],
    ["Ringkasan Dana"],
    ["Total Tagihan Lain-lain", totalTarget],
    ["Realisasi Terbayar (Lunas)", totalPaid],
    ["Sisa Tunggakan (Belum Lunas)", totalUnpaid],
    ["Persentase Realisasi", totalTarget > 0 ? `${Math.round((totalPaid / totalTarget) * 100)}%` : "0%"],
    [],
    ["RINGKASAN PER JENIS TAGIHAN"],
    summaryHeaders,
    ...summaryRows,
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Tagihan");

  // Sheet 2: Rincian Lengkap Data Tagihan Siswa
  const detailHeaders = [
    "No",
    "NIS",
    "Nama Siswa",
    "Kelas",
    "Judul Tagihan",
    "Deskripsi",
    "Tipe / Periode",
    "Nominal Tagihan (IDR)",
    "Status",
    "Tanggal Bayar",
    "Metode Pembayaran",
    "Order ID / Ref",
  ];

  const detailRows = bills.map((bill, idx) => {
    const s = students.find((st) => st.id === bill.studentId);
    return [
      idx + 1,
      s?.nis || "-",
      s?.name || "-",
      s?.class ? `Kelas ${s.class}` : "-",
      bill.title,
      (bill as any).description || "-",
      bill.isMonthly ? (bill.month || "Bulanan") : "Sekali Bayar",
      bill.amount || 0,
      bill.status === "paid" ? "LUNAS" : "BELUM BAYAR",
      bill.paidAt ? new Date(bill.paidAt).toLocaleDateString("id-ID") : "-",
      bill.paymentMethod || "-",
      bill.orderId || "-",
    ];
  });

  const detailSheetData = [
    ["RINCIAN DATA PEMBAYARAN LAIN-LAIN SISWA"],
    ["SMP MAARIF NU PANDAAN"],
    [],
    detailHeaders,
    ...detailRows,
  ];

  const wsDetails = XLSX.utils.aoa_to_sheet(detailSheetData);
  XLSX.utils.book_append_sheet(wb, wsDetails, "Rincian Tagihan Siswa");

  const gradePart = filterInfo.grade !== "all" ? `Tingkat_${filterInfo.grade}_` : "";
  const classPart = filterInfo.classStr !== "all" ? `Kelas_${filterInfo.classStr}_` : "";
  const statusPart = filterInfo.status !== "all" ? `${filterInfo.status}_` : "";
  const fileName = `Laporan_Pembayaran_Lain_${gradePart}${classPart}${statusPart}${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

