import { Router } from "express";
import { 
  Student, 
  SppBill, 
  MiscBill, 
  SavingsTransaction, 
  TreasurerTransaction, 
  RealtimeNotification, 
  MidtransConfig, 
  MidtransTransactionRecord,
  SpmbCandidate
} from "../../types";
import { AUTHORITATIVE_SAVINGS_MAP } from "../../savings_map";

export interface MidtransRouterDeps {
  midtransConfig: MidtransConfig;
  sppBills: SppBill[];
  miscBills: MiscBill[];
  students: Student[];
  savingsTransactions: SavingsTransaction[];
  treasurerTransactions: TreasurerTransaction[];
  midtransTransactions: MidtransTransactionRecord[];
  spmbCandidates?: SpmbCandidate[];
  spmbConfig?: any;
  saveState: (skipRemoteSync?: boolean) => void;
  broadcastNotification: (notif: RealtimeNotification) => void;
  sendWhatsappNotification: (to: string, msg: string) => Promise<any>;
  saveConfigToMysql: (configId: string, data: any) => Promise<boolean>;
}

// ---------------- Helper Functions ----------------

export const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const ACADEMIC_MONTHS = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni"
];

export const MONTH_LOOKUP: { [alias: string]: string } = {
  // Indonesian full
  "januari": "Januari", "februari": "Februari", "maret": "Maret", "april": "April",
  "mei": "Mei", "juni": "Juni", "juli": "Juli", "agustus": "Agustus",
  "september": "September", "oktober": "Oktober", "november": "November", "desember": "Desember",
  // English full
  "january": "Januari", "february": "Februari", "march": "Maret", "june": "Juni",
  "july": "Juli", "august": "Agustus", "october": "Oktober", "december": "Desember",
  // Abbreviations & aliases
  "jan": "Januari", "feb": "Februari", "mar": "Maret", "apr": "April",
  "jun": "Juni", "jul": "Juli", "agu": "Agustus", "ags": "Agustus", "aug": "Agustus", "agt": "Agustus",
  "sep": "September", "sept": "September", "okt": "Oktober", "oct": "Oktober",
  "nov": "November", "des": "Desember", "dec": "Desember"
};

export function extractMonthAndYear(text: string): { month?: string; year?: number } {
  if (!text) return {};
  const clean = text.trim();

  // 1. Check for short month + 2 or 4 digit year like Jul26, Ags26, Agu2026, Sep26, Okt26, Nov26, Des26, Jan27, Feb27
  const shortMonthYearRegex = /(?:^|[-_ \/\.,])(Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Ags|Aug|Agt|Sep|Sept|Okt|Oct|Nov|Des|Dec)[-_ \/\.]?(20\d{2}|\d{2})(?:[-_ \/\.,]|$)/i;
  const match1 = clean.match(shortMonthYearRegex);
  if (match1) {
    const rawMonth = match1[1].toLowerCase();
    const rawYear = match1[2];
    const month = MONTH_LOOKUP[rawMonth];
    const year = rawYear.length === 2 ? 2000 + parseInt(rawYear, 10) : parseInt(rawYear, 10);
    if (month) return { month, year };
  }

  // 2. Check full or short month name
  const monthNameRegex = /\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Ags|Aug|Agt|Sep|Sept|Okt|Oct|Nov|Des|Dec)\b/i;
  const match2 = clean.match(monthNameRegex);
  let detectedMonth: string | undefined = undefined;
  if (match2) {
    detectedMonth = MONTH_LOOKUP[match2[1].toLowerCase()];
  }

  // Check 4-digit year (2020 - 2035) or 2-digit year preceded by keyword
  const yearMatch = clean.match(/\b(202[0-9]|203[0-9])\b/) || clean.match(/(?:tahun|thn|year|yr)[-_: ]*(\d{2,4})/i);
  let detectedYear: number | undefined = undefined;
  if (yearMatch) {
    const yStr = yearMatch[1];
    detectedYear = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
  }

  if (detectedMonth) {
    return { month: detectedMonth, year: detectedYear };
  }

  // 3. Check 2-digit numerical month with 2 or 4 digit year in order ID (e.g. -0726- or -082026-)
  const numMonthYearRegex = /(?:^|[-_ \/\.,])(0[1-9]|1[0-2])[-_ \/\.]?(20\d{2}|\d{2})(?:[-_ \/\.,]|$)/;
  const match3 = clean.match(numMonthYearRegex);
  if (match3) {
    const num = match3[1];
    const numMap: { [k: string]: string } = {
      "01": "Januari", "02": "Februari", "03": "Maret", "04": "April", "05": "Mei", "06": "Juni",
      "07": "Juli", "08": "Agustus", "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
    };
    const month = numMap[num];
    const rawYear = match3[2];
    const year = rawYear.length === 2 ? 2000 + parseInt(rawYear, 10) : parseInt(rawYear, 10);
    if (month) return { month, year };
  }

  return { month: undefined, year: detectedYear };
}

export function decompressBillIdForMidtrans(id: string): string {
  if (!id) return id;
  if (id.startsWith("B-S-")) {
    return "bill-std-std-" + id.slice(4);
  } else if (id.startsWith("B-")) {
    const raw = id.slice(2);
    const hyphenIdx = raw.indexOf("-");
    if (hyphenIdx !== -1) {
      const studentNis = raw.slice(0, hyphenIdx);
      const rest = raw.slice(hyphenIdx + 1);
      return `bill-std-${studentNis}-${rest}`;
    }
  }
  return id;
}

export function compressMiscBillIdForMidtrans(id: string): string {
  if (!id) return id;
  return id.replace(/^misc-bill-std-/, "M-").replace(/^misc-bill-/, "MB-").replace(/^misc-/, "M-");
}

// Check if an order or description is explicitly a Non-SPP payment (Misc bill)
export function isExplicitNonSpp(orderId?: string, description?: string, miscBillsList?: MiscBill[]): boolean {
  const o = (orderId || "").toLowerCase();
  const d = (description || "").toLowerCase();
  
  if (o.startsWith("misc-") || o.startsWith("m-") || o.startsWith("mb-") || o.startsWith("nonspp-") || o.startsWith("non-spp-") || o.startsWith("lain-")) return true;
  
  const nonSppKeywords = [
    "uang gedung", "gedung", "seragam", "infaq", "infak", "pembangunan",
    "buku", "lks", "kitab", "ujian", "pts", "pas", "pat", "asesmen",
    "kegiatan", "outing", "studi tour", "study tour", "wisuda", "perpisahan",
    "sarpras", "osis", "dsp", "dpp", "lain-lain", "lain2", "non spp", "non-spp",
    "daftar ulang siswa", "formulir", "sumbangan", "ekskul", "pramuka", "mos", "mpls",
    "studi lapangan", "field trip", "bimbel", "les", "alumni", "kartu pelajar", "raport"
  ];
  
  if (nonSppKeywords.some(kw => o.includes(kw) || d.includes(kw))) return true;

  if (miscBillsList && miscBillsList.length > 0) {
    if (miscBillsList.some(m => {
      const titleLower = m.title.toLowerCase();
      return (d && d.includes(titleLower)) || (o && o.includes(titleLower)) || (m.id && o.includes(m.id.toLowerCase()));
    })) {
      return true;
    }
  }

  return false;
}

// Check if an order or description is explicitly a savings deposit
export function isExplicitSavings(orderId?: string, description?: string): boolean {
  const o = (orderId || "").toLowerCase();
  const d = (description || "").toLowerCase();
  if (o.startsWith("sav-") || o.startsWith("tab-") || o.startsWith("tabungan-") || o.startsWith("deposit-")) return true;
  if (d.includes("tabungan") || d.includes("setor tabungan") || d.includes("setoran tabungan") || d.includes("deposit tabungan") || d.includes("simpanan")) return true;
  return false;
}

// Check if an order or description is explicitly an SPMB candidate transaction
export function isExplicitSpmb(orderId?: string, description?: string): boolean {
  const o = (orderId || "").toLowerCase();
  const d = (description || "").toLowerCase();
  if (o.startsWith("spmb-") || o.startsWith("ppdb-") || o.startsWith("token-") || o.startsWith("rereg-")) return true;
  if (d.includes("spmb") || d.includes("ppdb") || d.includes("token pendaftaran") || d.includes("formulir spmb") || d.includes("daftar ulang spmb") || d.includes("penerimaan murid baru") || d.includes("penerimaan siswa baru") || d.includes("token formulir")) return true;
  return false;
}

// Check if an order or description is explicitly a Cart multi-bill package
export function isExplicitCart(orderId?: string, description?: string): boolean {
  const o = (orderId || "").toLowerCase();
  const d = (description || "").toLowerCase();
  if (o.startsWith("cart-") || o.startsWith("paket-") || o.startsWith("collective-cart-")) return true;
  if (d.includes("keranjang") || d.includes("paket pembayaran") || d.includes("multi tagihan") || d.includes("multi-bill")) return true;
  return false;
}

// Check if an order or description is explicitly SPP
export function isExplicitSpp(orderId?: string, description?: string): boolean {
  const o = (orderId || "").toLowerCase();
  const d = (description || "").toLowerCase();
  if (isExplicitNonSpp(orderId, description) || isExplicitSavings(orderId, description) || isExplicitSpmb(orderId, description) || isExplicitCart(orderId, description)) {
    return false;
  }
  if (o.startsWith("spp-") || o.startsWith("b-") || o.startsWith("bill-std-")) return true;
  if (d.includes("spp") || d.includes("syahriah") || d.includes("bulanan") || d.includes("spp bulan")) return true;
  return false;
}

// Smart Misc Bill Matcher
export function findMiscBillMatching(
  idOrOrderId: string,
  miscBillsList: MiscBill[],
  targetStudentId?: string,
  extraHints?: { description?: string; amount?: number }
): MiscBill | undefined {
  if (!idOrOrderId && !extraHints?.description && !targetStudentId) return undefined;
  const cleanKey = (idOrOrderId || "").trim();

  // 1. Direct exact match by orderId, id, or transactionId
  if (cleanKey) {
    const directMatch = miscBillsList.find(m =>
      m.orderId === cleanKey ||
      m.id === cleanKey ||
      m.transactionId === cleanKey ||
      m.id === cleanKey + "-unpaid"
    );
    if (directMatch) return directMatch;
  }

  // 2. Direct match with trailing timestamp/random suffix stripped
  if (cleanKey) {
    const cleanWithoutSuffix = cleanKey.replace(/-\d{4,6}$/, "");
    const suffixMatch = miscBillsList.find(m =>
      m.id === cleanWithoutSuffix ||
      m.id === cleanWithoutSuffix + "-unpaid" ||
      m.orderId === cleanWithoutSuffix
    );
    if (suffixMatch) return suffixMatch;
  }

  // 3. Shortened ID prefix matching (e.g. M-1010-01 matching misc-bill-std-1010-01)
  if (cleanKey) {
    const withoutPrefix = cleanKey.replace(/^MISC-/, "").replace(/^M-/, "").replace(/^MB-/, "");
    const matchShort = miscBillsList.find(m =>
      m.id.includes(withoutPrefix) ||
      (m.orderId && m.orderId.includes(withoutPrefix))
    );
    if (matchShort) return matchShort;
  }

  // 4. Match by target student + title keywords in description
  if (targetStudentId) {
    const studentMiscBills = miscBillsList.filter(m => m.studentId === targetStudentId);
    if (studentMiscBills.length > 0) {
      if (extraHints?.description) {
        const descLower = extraHints.description.toLowerCase();
        // Exact title substring match
        const titleMatch = studentMiscBills.find(m => descLower.includes(m.title.toLowerCase()) || m.title.toLowerCase().includes(descLower));
        if (titleMatch) return titleMatch;

        // Specific category keyword matching
        const kwMatch = studentMiscBills.find(m => {
          const t = m.title.toLowerCase();
          if (descLower.includes("gedung") && t.includes("gedung")) return true;
          if (descLower.includes("seragam") && t.includes("seragam")) return true;
          if ((descLower.includes("infaq") || descLower.includes("infak")) && (t.includes("infaq") || t.includes("infak"))) return true;
          if (descLower.includes("buku") && t.includes("buku")) return true;
          if (descLower.includes("lks") && t.includes("lks")) return true;
          if (descLower.includes("ujian") && (t.includes("ujian") || t.includes("pts") || t.includes("pas") || t.includes("pat"))) return true;
          if (descLower.includes("wisuda") && (t.includes("wisuda") || t.includes("perpisahan"))) return true;
          if (descLower.includes("kegiatan") && t.includes("kegiatan")) return true;
          if (descLower.includes("osis") && t.includes("osis")) return true;
          return false;
        });
        if (kwMatch) return kwMatch;
      }

      // Match by amount if specified
      if (extraHints?.amount && extraHints.amount > 0) {
        const amountMatch = studentMiscBills.find(m => (m.status === "pending" || m.status === "unpaid") && m.amount === extraHints.amount);
        if (amountMatch) return amountMatch;
      }

      // If only one unpaid misc bill exists for this student and this is explicitly a Non-SPP order
      if (isExplicitNonSpp(cleanKey, extraHints?.description)) {
        const unpaidMisc = studentMiscBills.find(m => m.status === "pending" || m.status === "unpaid");
        if (unpaidMisc) return unpaidMisc;
      }
    }
  }

  // 5. Global title matching across all misc bills if description contains unique title
  if (extraHints?.description) {
    const descLower = extraHints.description.toLowerCase();
    const globalMatch = miscBillsList.find(m => descLower.includes(m.title.toLowerCase()) && (extraHints.amount ? m.amount === extraHints.amount : true));
    if (globalMatch) return globalMatch;
  }

  return undefined;
}

export function findSppBillMatching(
  idOrOrderId: string, 
  sppBillsList: SppBill[], 
  targetStudentId?: string,
  extraHints?: { description?: string; month?: string; year?: number; miscBillsList?: MiscBill[] }
): SppBill | undefined {
  if (!idOrOrderId && !extraHints?.description && !extraHints?.month) return undefined;
  const cleanKey = (idOrOrderId || "").trim();

  // Guard: NEVER match as SPP if the order or description is explicitly Non-SPP, Savings, SPMB, or Cart
  if (isExplicitNonSpp(cleanKey, extraHints?.description, extraHints?.miscBillsList)) return undefined;
  if (isExplicitSavings(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitSpmb(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitCart(cleanKey, extraHints?.description)) return undefined;

  // 1. Direct exact match by orderId, id, or transactionId
  if (cleanKey) {
    const directMatch = sppBillsList.find(b => 
      b.orderId === cleanKey || 
      b.id === cleanKey || 
      b.transactionId === cleanKey ||
      b.id === cleanKey + "-unpaid"
    );
    if (directMatch) return directMatch;
  }

  // 2. Direct match by stripping trailing 4-digit timestamp or random suffix
  if (cleanKey) {
    const cleanWithoutSuffix = cleanKey.replace(/-\d{4,6}$/, "");
    const suffixMatch = sppBillsList.find(b =>
      b.id === cleanWithoutSuffix ||
      b.id === cleanWithoutSuffix + "-unpaid" ||
      b.orderId === cleanWithoutSuffix
    );
    if (suffixMatch) return suffixMatch;
  }

  // 3. Decompressed Bill ID match
  if (cleanKey) {
    const decompressed = decompressBillIdForMidtrans(cleanKey);
    if (decompressed && decompressed !== cleanKey) {
      const decompressedMatch = sppBillsList.find(b => 
        b.id === decompressed || 
        b.id === decompressed + "-unpaid" || 
        b.orderId === decompressed
      );
      if (decompressedMatch) return decompressedMatch;
    }
  }

  // 4. Extract Month & Year from explicit hints or text strings
  let detectedMonth = extraHints?.month ? MONTH_LOOKUP[extraHints.month.toLowerCase().trim()] : undefined;
  let detectedYear = extraHints?.year;

  if (!detectedMonth && cleanKey) {
    const fromOrder = extractMonthAndYear(cleanKey);
    detectedMonth = fromOrder.month;
    if (!detectedYear && fromOrder.year) detectedYear = fromOrder.year;
  }

  if (!detectedMonth && extraHints?.description) {
    const fromDesc = extractMonthAndYear(extraHints.description);
    detectedMonth = fromDesc.month;
    if (!detectedYear && fromDesc.year) detectedYear = fromDesc.year;
  }

  // 5. Match by Target Student ID + Detected Month (+ Year)
  if (targetStudentId && detectedMonth) {
    // If year is detected, first try matching exact month AND year
    if (detectedYear) {
      const exactYearMatch = sppBillsList.find(b => 
        b.studentId === targetStudentId && 
        b.month.toLowerCase() === detectedMonth!.toLowerCase() && 
        b.year === detectedYear
      );
      if (exactYearMatch) return exactYearMatch;
    }

    // Fallback match by exact month for this student (regardless of year)
    const monthMatch = sppBillsList.find(b => 
      b.studentId === targetStudentId && 
      b.month.toLowerCase() === detectedMonth!.toLowerCase()
    );
    if (monthMatch) return monthMatch;
  }

  // 6. If cleanKey contains student NIS and month name/code
  if (cleanKey && cleanKey.startsWith("SPP-")) {
    const withoutPrefix = cleanKey.slice(4);
    const lastHyphen = withoutPrefix.lastIndexOf("-");
    const extractedBillId = lastHyphen === -1 ? withoutPrefix : withoutPrefix.slice(0, lastHyphen);
    
    let bill = sppBillsList.find(b => b.id === extractedBillId || b.id === `bill-std-${extractedBillId}`);
    if (bill) return bill;

    const parts = withoutPrefix.split("-");
    const rawNis = parts[0];
    if (rawNis && detectedMonth) {
      const nisMatch = sppBillsList.find(b => 
        (b.id.includes(rawNis) || b.studentId.includes(rawNis)) && 
        b.month.toLowerCase() === detectedMonth!.toLowerCase() &&
        (!detectedYear || b.year === detectedYear)
      );
      if (nisMatch) return nisMatch;
    }
  }

  return undefined;
}

export function isBillActive(bill: SppBill, studentBills: SppBill[]): boolean {
  if (!bill) return false;
  if (bill.status === "paid" || bill.status === "waived") return true;
  
  const monthOrder = [
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    "Januari", "Februari", "Maret", "April", "Mei", "Juni"
  ];
  
  const currentBillIdx = monthOrder.indexOf(bill.month);
  if (currentBillIdx === -1) return true;

  const previousBills = studentBills.filter(b => {
    const idx = monthOrder.indexOf(b.month);
    return idx !== -1 && idx < currentBillIdx && b.year === bill.year;
  });

  return previousBills.every(b => b.status === "paid" || b.status === "waived");
}

export function parseMidtransTime(timeStr: string): string {
  if (!timeStr) return new Date().toISOString();
  try {
    const parsed = new Date(timeStr.replace(" ", "T") + "+07:00");
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (e) {}
  return new Date().toISOString();
}

// ---------------- Router Factory ----------------

export function createMidtransRouter(deps: MidtransRouterDeps): Router {
  const router = Router();
  const {
    midtransConfig,
    sppBills,
    miscBills,
    students,
    savingsTransactions,
    treasurerTransactions,
    midtransTransactions,
    spmbCandidates = [],
    spmbConfig,
    saveState,
    broadcastNotification,
    sendWhatsappNotification,
    saveConfigToMysql
  } = deps;

  function recordOrUpdateMidtransTransaction(data: {
    orderId: string;
    transactionId?: string;
    billType: "spp" | "cart" | "misc" | "savings" | "spmb_token" | "spmb_reregistration" | "other";
    grossAmount: number;
    studentName?: string;
    studentNis?: string;
    description?: string;
    transactionStatus: "settlement" | "capture" | "pending" | "expire" | "cancel" | "deny" | "refund" | "failure";
    paymentType?: string;
    transactionTime?: string;
    settlementTime?: string;
    rawResponse?: any;
  }) {
    if (!data.orderId) return;
    const existing = midtransTransactions.find(t => t.orderId === data.orderId || (data.transactionId && t.transactionId === data.transactionId));
    if (existing) {
      existing.transactionStatus = data.transactionStatus;
      if (data.transactionId) existing.transactionId = data.transactionId;
      if (data.paymentType) existing.paymentType = data.paymentType;
      if (data.settlementTime) existing.settlementTime = data.settlementTime;
      if (data.transactionTime) existing.transactionTime = data.transactionTime;
      if (data.studentName && !existing.studentName) existing.studentName = data.studentName;
      if (data.studentNis && !existing.studentNis) existing.studentNis = data.studentNis;
      if (data.description && !existing.description) existing.description = data.description;
      existing.updatedAt = new Date().toISOString();
    } else {
      midtransTransactions.unshift({
        id: `mt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderId: data.orderId,
        transactionId: data.transactionId || "",
        billType: data.billType,
        grossAmount: data.grossAmount,
        studentName: data.studentName || "",
        studentNis: data.studentNis || "",
        description: data.description || "",
        transactionStatus: data.transactionStatus,
        paymentType: data.paymentType || "Midtrans",
        transactionTime: data.transactionTime || new Date().toISOString(),
        settlementTime: data.settlementTime || (data.transactionStatus === "settlement" ? new Date().toISOString() : undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  function autoSyncHistoricalMidtransTransactions() {
    sppBills.forEach(b => {
      if (b.orderId && (b.paidAt || b.status === "paid")) {
        const student = students.find(s => s.id === b.studentId);
        recordOrUpdateMidtransTransaction({
          orderId: b.orderId,
          transactionId: b.transactionId,
          billType: "spp",
          grossAmount: b.amount,
          studentName: student?.name,
          studentNis: student?.nis,
          description: `SPP ${b.month} ${b.year}`,
          transactionStatus: "settlement",
          paymentType: b.paymentMethod || "Midtrans",
          settlementTime: b.paidAt
        });
      }
    });
    miscBills.forEach(m => {
      if (m.orderId && (m.paidAt || m.status === "paid")) {
        const student = students.find(s => s.id === m.studentId);
        recordOrUpdateMidtransTransaction({
          orderId: m.orderId,
          transactionId: m.transactionId,
          billType: "misc",
          grossAmount: m.amount,
          studentName: student?.name,
          studentNis: student?.nis,
          description: m.title,
          transactionStatus: "settlement",
          paymentType: m.paymentMethod || "Midtrans",
          settlementTime: m.paidAt
        });
      }
    });
    savingsTransactions.forEach(t => {
      if (t.orderId && t.status === "success") {
        const student = students.find(s => s.id === t.studentId);
        recordOrUpdateMidtransTransaction({
          orderId: t.orderId,
          billType: "savings",
          grossAmount: t.amount,
          studentName: student?.name,
          studentNis: student?.nis,
          description: "Setor Tabungan Siswa",
          transactionStatus: "settlement",
          paymentType: "Midtrans",
          settlementTime: t.createdAt
        });
      }
    });
  }

  async function getMidtransStatus(orderId: string): Promise<any> {
    const serverKey = (midtransConfig.serverKey || "").trim();
    if (!serverKey || !orderId) return null;
    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
    
    const primaryUrl = midtransConfig.isProduction
      ? `https://api.midtrans.com/v2/${encodeURIComponent(orderId)}/status`
      : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`;
    const fallbackUrl = midtransConfig.isProduction
      ? `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`
      : `https://api.midtrans.com/v2/${encodeURIComponent(orderId)}/status`;

    try {
      let res = await fetch(primaryUrl, {
        method: "GET",
        headers: { "Authorization": `Basic ${authHeader}`, "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status_code && data.status_code !== "404") return data;
      }
      res = await fetch(fallbackUrl, {
        method: "GET",
        headers: { "Authorization": `Basic ${authHeader}`, "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status_code && data.status_code !== "404") return data;
      }
    } catch (e) {
      console.error("[Midtrans Status Fetch Error]:", e);
    }
    return null;
  }

  const midtransAutoPollerStats = {
    lastRunTime: "",
    scannedCount: 0,
    reconciledCount: 0,
    expiredCount: 0,
    totalAutoReconciledLifetime: 0,
    lastLog: [] as string[]
  };

  // Smart Auto-Allocation Engine: Intelligently allocates online payment to student's oldest unpaid SPP bills, Non-SPP bills, or Savings Balance
  function autoAllocateStudentPayment(
    targetStudent: Student,
    amountVal: number,
    orderId: string,
    transactionId: string | undefined,
    paymentType: string,
    paidAt: string,
    options?: {
      preferredCategory?: string;
      notes?: string;
    }
  ): {
    reconciled: boolean;
    amountReconciled: number;
    paidSppCount: number;
    paidMiscCount: number;
    savingsDeposited: number;
    category: string;
    itemsDetail: string[];
    message: string;
  } {
    let remainingAmount = amountVal;
    let paidSppCount = 0;
    let paidMiscCount = 0;
    let savingsDeposited = 0;
    const itemsDetail: string[] = [];

    // 1. Unpaid SPP bills sorted chronologically by academic year
    const unpaidSpp = sppBills
      .filter(b => b.studentId === targetStudent.id && (b.status === "unpaid" || b.status === "pending"))
      .sort((a, b) => {
        const yearDiff = (a.year || 2026) - (b.year || 2026);
        if (yearDiff !== 0) return yearDiff;
        const idxA = ACADEMIC_MONTHS.indexOf(a.month);
        const idxB = ACADEMIC_MONTHS.indexOf(b.month);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

    // 2. Unpaid Misc bills
    const unpaidMisc = miscBills.filter(
      m => m.studentId === targetStudent.id && (m.status === "unpaid" || m.status === "pending")
    );

    // Step A: Pay unpaid SPP bills greedily or exact match
    for (const b of unpaidSpp) {
      if (remainingAmount >= b.amount && b.amount > 0) {
        b.status = "paid";
        b.paidAt = paidAt;
        b.paymentMethod = paymentType;
        b.orderId = orderId;
        if (transactionId) b.transactionId = transactionId;

        remainingAmount -= b.amount;
        paidSppCount++;
        itemsDetail.push(`SPP ${b.month} ${b.year}`);
      }
    }

    // Step B: Pay unpaid Misc bills if amount remains
    for (const m of unpaidMisc) {
      if (remainingAmount >= m.amount && m.amount > 0) {
        m.status = "paid";
        m.paidAt = paidAt;
        m.paymentMethod = paymentType;
        m.orderId = orderId;
        if (transactionId) m.transactionId = transactionId;

        remainingAmount -= m.amount;
        paidMiscCount++;
        itemsDetail.push(`Non-SPP: ${m.title}`);
      }
    }

    // Step C: If still remainingAmount > 0 (or student had no unpaid bills) -> deposit to Savings
    if (remainingAmount > 0) {
      const newSavingsTx: SavingsTransaction = {
        id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: targetStudent.id,
        studentNis: targetStudent.nis,
        type: "deposit",
        amount: remainingAmount,
        status: "success",
        createdAt: paidAt,
        paymentMethod: paymentType,
        orderId: orderId,
        transactionId: transactionId,
        notes: options?.notes || `Alokasi Otomatis Pembayaran Midtrans (${orderId})`
      };
      savingsTransactions.unshift(newSavingsTx);
      targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + remainingAmount;
      AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;
      savingsDeposited = remainingAmount;
      itemsDetail.push(`Saldo Tabungan (Rp ${remainingAmount.toLocaleString("id-ID")})`);
      remainingAmount = 0;
    }

    const categoryName = itemsDetail.length > 0
      ? (paidSppCount > 0 && paidMiscCount === 0 && savingsDeposited === 0 
          ? (paidSppCount === 1 ? itemsDetail[0] : `SPP (${paidSppCount} Bulan)`)
          : (savingsDeposited > 0 && paidSppCount === 0 && paidMiscCount === 0
              ? "Setoran Tabungan Siswa"
              : `Paket Pembayaran (${itemsDetail.length} Item)`))
      : "Pembayaran Midtrans Terverifikasi";

    return {
      reconciled: true,
      amountReconciled: amountVal,
      paidSppCount,
      paidMiscCount,
      savingsDeposited,
      category: categoryName,
      itemsDetail,
      message: `BERHASIL DILUNASI! Otomatis dialokasikan untuk: ${itemsDetail.join(" + ")} a.n ${targetStudent.name} (${targetStudent.class || targetStudent.nis}).`
    };
  }

  async function processMidtransOrderStatus(orderId: string, customMidtransStatus?: any): Promise<{
    status: "settled" | "expired" | "pending" | "not_found" | "no_change";
    actionTaken: boolean;
    detailMessage: string;
    midtransStatus: any;
  }> {
    const cleanOrderId = (orderId || "").trim();
    if (!cleanOrderId) {
      return { status: "not_found", actionTaken: false, detailMessage: "Order ID kosong", midtransStatus: null };
    }

    let statusData = customMidtransStatus || await getMidtransStatus(cleanOrderId);
    if (!statusData) {
      return { status: "not_found", actionTaken: false, detailMessage: `Order ID ${cleanOrderId} tidak ditemukan di Gateway Midtrans`, midtransStatus: null };
    }

    const ts = statusData.transaction_status || "";
    const isSettled = ts === "settlement" || ts === "capture";
    const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";
    const paymentType = statusData.payment_type || "Online Gateway";
    const actualPaymentType = `Midtrans (${paymentType})`;
    const midtransTime = statusData.settlement_time || statusData.transaction_time || "";
    const resolvedPaidAt = parseMidtransTime(midtransTime);
    const targetOrderId = statusData.order_id || cleanOrderId;
    const targetTransactionId = statusData.transaction_id || "";

    let actionTaken = false;
    let detailMessage = "";

    // 1. SPP BILLS
    if (targetOrderId.startsWith("SPP-") || cleanOrderId.startsWith("SPP-")) {
      const activeOrderId = targetOrderId.startsWith("SPP-") ? targetOrderId : cleanOrderId;
      const bill = findSppBillMatching(activeOrderId, sppBills) || findSppBillMatching(cleanOrderId, sppBills);
      if (bill) {
        if (isSettled && bill.status !== "paid") {
          bill.status = "paid";
          bill.paidAt = resolvedPaidAt;
          bill.paymentMethod = actualPaymentType;
          bill.orderId = targetOrderId;
          if (targetTransactionId) bill.transactionId = targetTransactionId;
          actionTaken = true;

          const student = students.find(s => s.id === bill.studentId);

          recordOrUpdateMidtransTransaction({
            orderId: targetOrderId,
            transactionId: targetTransactionId,
            billType: "spp",
            grossAmount: bill.amount,
            studentName: student?.name,
            studentNis: student?.nis,
            description: `SPP ${bill.month} ${bill.year}`,
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });

          broadcastNotification({
            id: `notif-${Date.now()}`,
            title: "Pembayaran SPP Lunas ✅",
            message: `Pembayaran SPP ${bill.month} oleh ${student?.name || "Siswa"} sebesar Rp ${bill.amount.toLocaleString("id-ID")} berhasil diverifikasi.`,
            type: "success",
            createdAt: new Date().toISOString()
          });

          if (student?.phone) {
            sendWhatsappNotification(
              student.phone,
              `*KUITANSI PEMBAYARAN SPP ONLINE*\n\nAlhamdulillah, pembayaran SPP bulan *${bill.month} ${bill.year}* untuk siswa *${student.name}* (NIS: ${student.nis}) sebesar *Rp ${bill.amount.toLocaleString("id-ID")}* telah LUNAS.\n\nNomor Order: ${targetOrderId}\nMetode: ${actualPaymentType}\nWaktu: ${new Date(resolvedPaidAt).toLocaleString("id-ID")}\n\nTerima kasih.\n*SMP Maarif NU Pandaan*`
            ).catch(() => {});
          }

          detailMessage = `Tagihan SPP ${bill.month} ${bill.year} (${student?.name || "Siswa"}) berhasil di-settle LUNAS.`;
        } else if (isExpired && bill.status === "pending") {
          bill.status = "unpaid";
          bill.orderId = undefined;
          actionTaken = true;
          detailMessage = `Tagihan SPP ${bill.month} ${bill.year} direset menjadi belum bayar karena expired/cancel.`;
        }
      }
    }

    // 2. MISC BILLS
    else if (targetOrderId.startsWith("MISC-") || cleanOrderId.startsWith("MISC-")) {
      const activeOrderId = targetOrderId.startsWith("MISC-") ? targetOrderId : cleanOrderId;
      const bill = miscBills.find(m => m.orderId === activeOrderId || m.orderId === cleanOrderId || m.id === cleanOrderId);
      if (bill) {
        if (isSettled && bill.status !== "paid") {
          bill.status = "paid";
          bill.paidAt = resolvedPaidAt;
          bill.paymentMethod = actualPaymentType;
          bill.orderId = targetOrderId;
          if (targetTransactionId) bill.transactionId = targetTransactionId;
          actionTaken = true;

          const student = students.find(s => s.id === bill.studentId);
          recordOrUpdateMidtransTransaction({
            orderId: targetOrderId,
            transactionId: targetTransactionId,
            billType: "misc",
            grossAmount: bill.amount,
            studentName: student?.name,
            studentNis: student?.nis,
            description: bill.title,
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });

          detailMessage = `Tagihan Non-SPP "${bill.title}" berhasil di-settle LUNAS.`;
        } else if (isExpired && bill.status === "pending") {
          bill.status = "unpaid";
          bill.orderId = undefined;
          actionTaken = true;
          detailMessage = `Tagihan Non-SPP "${bill.title}" direset menjadi belum bayar karena expired.`;
        }
      }
    }

    // 3. SAVINGS DEPOSITS
    else if (targetOrderId.startsWith("SAV-") || cleanOrderId.startsWith("SAV-")) {
      const activeOrderId = targetOrderId.startsWith("SAV-") ? targetOrderId : cleanOrderId;
      const trans = savingsTransactions.find(t => t.orderId === activeOrderId || t.orderId === cleanOrderId || t.id === cleanOrderId);
      if (trans) {
        if (isSettled && trans.status !== "success") {
          trans.status = "success";
          actionTaken = true;
          const student = students.find(s => s.id === trans.studentId);
          if (student) {
            student.savingsBalance = (Number(student.savingsBalance) || 0) + Number(trans.amount);
            AUTHORITATIVE_SAVINGS_MAP[student.id] = student.savingsBalance;
          }
          recordOrUpdateMidtransTransaction({
            orderId: targetOrderId,
            transactionId: targetTransactionId,
            billType: "savings",
            grossAmount: trans.amount,
            studentName: student?.name,
            studentNis: student?.nis,
            description: "Setoran Tabungan",
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });
          detailMessage = `Setoran tabungan sebesar Rp ${trans.amount.toLocaleString("id-ID")} berhasil masuk ke saldo siswa.`;
        } else if (isExpired && trans.status === "pending") {
          trans.status = "failed";
          actionTaken = true;
          detailMessage = `Setoran tabungan dibatalkan karena expired.`;
        }
      }
    }

    // 4. MULTI-BILL CART
    else if (targetOrderId.startsWith("CART-") || cleanOrderId.startsWith("CART-") || targetOrderId.startsWith("COLLECTIVE-CART-") || cleanOrderId.startsWith("COLLECTIVE-CART-")) {
      const activeOrderId = targetOrderId.startsWith("CART-") || targetOrderId.startsWith("COLLECTIVE-CART-") ? targetOrderId : cleanOrderId;
      const matchedSpp = sppBills.filter(b => b.orderId === activeOrderId || b.orderId === cleanOrderId);
      const matchedMisc = miscBills.filter(m => m.orderId === activeOrderId || m.orderId === cleanOrderId);
      const matchedSavings = savingsTransactions.filter(t => t.orderId === activeOrderId || t.orderId === cleanOrderId);

      if (matchedSpp.length > 0 || matchedMisc.length > 0 || matchedSavings.length > 0) {
        if (isSettled) {
          matchedSpp.forEach(b => {
            if (b.status !== "paid") {
              b.status = "paid";
              b.paidAt = resolvedPaidAt;
              b.paymentMethod = actualPaymentType;
              if (targetTransactionId) b.transactionId = targetTransactionId;
              actionTaken = true;
            }
          });
          matchedMisc.forEach(m => {
            if (m.status !== "paid") {
              m.status = "paid";
              m.paidAt = resolvedPaidAt;
              m.paymentMethod = actualPaymentType;
              if (targetTransactionId) m.transactionId = targetTransactionId;
              actionTaken = true;
            }
          });
          matchedSavings.forEach(t => {
            if (t.status !== "success") {
              t.status = "success";
              actionTaken = true;
              const student = students.find(s => s.id === t.studentId);
              if (student) {
                student.savingsBalance = (Number(student.savingsBalance) || 0) + Number(t.amount);
                AUTHORITATIVE_SAVINGS_MAP[student.id] = student.savingsBalance;
              }
            }
          });

          const totalCartAmount = matchedSpp.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) +
                                  matchedMisc.reduce((sum, m) => sum + (Number(m.amount) || 0), 0) +
                                  matchedSavings.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

          const studentId = matchedSpp[0]?.studentId || matchedMisc[0]?.studentId || matchedSavings[0]?.studentId;
          const student = students.find(s => s.id === studentId);

          recordOrUpdateMidtransTransaction({
            orderId: activeOrderId,
            transactionId: targetTransactionId,
            billType: "cart",
            grossAmount: totalCartAmount || (statusData.gross_amount ? Number(statusData.gross_amount) : 0),
            studentName: student?.name || "Siswa",
            studentNis: student?.nis || "-",
            description: `Paket Pembayaran Keranjang (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan)`,
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });

          broadcastNotification({
            id: `notif-cart-${Date.now()}`,
            title: "Pembayaran Keranjang Lunas ✅",
            message: `Pembayaran keranjang (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) oleh ${student?.name || "Siswa"} sebesar Rp ${totalCartAmount.toLocaleString("id-ID")} berhasil diverifikasi.`,
            type: "success",
            studentId: student?.id,
            createdAt: new Date().toISOString()
          });

          if (student?.phone) {
            sendWhatsappNotification(
              student.phone,
              `*KUITANSI PEMBAYARAN KERANJANG ONLINE*\n\nAlhamdulillah, pembayaran paket keranjang (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) untuk siswa *${student.name}* (NIS: ${student.nis}) sebesar *Rp ${totalCartAmount.toLocaleString("id-ID")}* telah LUNAS.\n\nNomor Order: ${activeOrderId}\nMetode: ${actualPaymentType}\nWaktu: ${new Date(resolvedPaidAt).toLocaleString("id-ID")}\n\nTerima kasih.\n*SMP Maarif NU Pandaan*`
            ).catch(() => {});
          }

          detailMessage = `Keranjang pembayaran (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) berhasil di-settle LUNAS.`;
        } else if (isExpired) {
          matchedSpp.forEach(b => { if (b.status === "pending") { b.status = "unpaid"; b.orderId = undefined; actionTaken = true; } });
          matchedMisc.forEach(m => { if (m.status === "pending") { m.status = "unpaid"; m.orderId = undefined; actionTaken = true; } });
          matchedSavings.forEach(t => { if (t.status === "pending") { t.status = "failed"; actionTaken = true; } });
          detailMessage = `Keranjang pembayaran direset karena expired/cancel.`;
        }
      } else if (isSettled) {
        // Smart Allocation fallback for Cart orders without pre-tagged orderId
        let targetStudent = students.find(s => activeOrderId.includes(s.nis) || s.id === `std-${activeOrderId}`);
        if (!targetStudent) {
          const parts = activeOrderId.split("-");
          for (const p of parts) {
            if (/^\d{3,12}$/.test(p)) {
              const matched = students.find(s => String(s.nis).trim() === p || s.id === `std-${p}`);
              if (matched) {
                targetStudent = matched;
                break;
              }
            }
          }
        }

        if (targetStudent) {
          const grossAmt = statusData.gross_amount ? Number(statusData.gross_amount) : 0;
          const alloc = autoAllocateStudentPayment(targetStudent, grossAmt, activeOrderId, targetTransactionId, actualPaymentType, resolvedPaidAt);
          actionTaken = true;

          recordOrUpdateMidtransTransaction({
            orderId: activeOrderId,
            transactionId: targetTransactionId,
            billType: "cart",
            grossAmount: grossAmt,
            studentName: targetStudent.name,
            studentNis: targetStudent.nis,
            description: alloc.category,
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });

          broadcastNotification({
            id: `notif-cart-${Date.now()}`,
            title: "Pembayaran Keranjang Lunas ✅",
            message: `Pembayaran ${alloc.category} oleh ${targetStudent.name} sebesar Rp ${grossAmt.toLocaleString("id-ID")} berhasil diverifikasi.`,
            type: "success",
            studentId: targetStudent.id,
            createdAt: new Date().toISOString()
          });

          if (targetStudent.phone) {
            sendWhatsappNotification(
              targetStudent.phone,
              `*KUITANSI PEMBAYARAN ONLINE*\n\nAlhamdulillah, pembayaran untuk siswa *${targetStudent.name}* (NIS: ${targetStudent.nis}) sebesar *Rp ${grossAmt.toLocaleString("id-ID")}* telah LUNAS.\n\nRincian: ${alloc.itemsDetail.join(", ")}\nNomor Order: ${activeOrderId}\nMetode: ${actualPaymentType}\nWaktu: ${new Date(resolvedPaidAt).toLocaleString("id-ID")}\n\nTerima kasih.\n*SMP Maarif NU Pandaan*`
            ).catch(() => {});
          }

          detailMessage = alloc.message;
        }
      }
    }

    // 5. SPMB TRANSACTIONS (TOKEN & DAFTAR ULANG)
    else if (targetOrderId.startsWith("SPMB-") || cleanOrderId.startsWith("SPMB-")) {
      const activeOrderId = targetOrderId.startsWith("SPMB-") ? targetOrderId : cleanOrderId;
      const isToken = activeOrderId.startsWith("SPMB-TOKEN-");
      const isRereg = activeOrderId.startsWith("SPMB-REREG-");

      const candidate = spmbCandidates.find(c => 
        c.tokenPaymentOrderId === activeOrderId || 
        c.reRegistrationOrderId === activeOrderId ||
        c.tokenPaymentOrderId === cleanOrderId ||
        c.reRegistrationOrderId === cleanOrderId
      );

      if (candidate) {
        if (isToken) {
          if (isSettled && candidate.tokenPaymentStatus !== "paid") {
            candidate.tokenPaymentStatus = "paid";
            candidate.tokenPaidAt = resolvedPaidAt;
            candidate.tokenPaymentMethod = actualPaymentType;
            candidate.tokenPaymentOrderId = targetOrderId;
            actionTaken = true;

            recordOrUpdateMidtransTransaction({
              orderId: targetOrderId,
              transactionId: targetTransactionId,
              billType: "spmb_token",
              grossAmount: Number(candidate.tokenAmount) || 50000,
              studentName: candidate.fullName,
              studentNis: candidate.nisn || candidate.registrationNo,
              description: `Token Formulir SPMB (${candidate.registrationNo})`,
              transactionStatus: "settlement",
              paymentType: actualPaymentType,
              settlementTime: resolvedPaidAt
            });

            detailMessage = `Token formulir SPMB a.n ${candidate.fullName} (${candidate.registrationNo}) berhasil di-settle LUNAS.`;
          } else if (isExpired && candidate.tokenPaymentStatus !== "paid") {
            candidate.tokenPaymentStatus = "unpaid";
            candidate.tokenPaymentOrderId = undefined;
            actionTaken = true;
            detailMessage = `Pembayaran token SPMB a.n ${candidate.fullName} dibatalkan karena expired.`;
          }
        } else if (isRereg) {
          if (isSettled && candidate.reRegistrationStatus !== "paid") {
            candidate.reRegistrationStatus = "paid";
            candidate.reRegistrationPaidAt = resolvedPaidAt;
            candidate.reRegistrationPaymentMethod = actualPaymentType;
            candidate.reRegistrationOrderId = targetOrderId;
            actionTaken = true;

            recordOrUpdateMidtransTransaction({
              orderId: targetOrderId,
              transactionId: targetTransactionId,
              billType: "spmb_reregistration",
              grossAmount: Number(candidate.reRegistrationAmount) || 0,
              studentName: candidate.fullName,
              studentNis: candidate.nisn || candidate.registrationNo,
              description: `Daftar Ulang SPMB (${candidate.registrationNo})`,
              transactionStatus: "settlement",
              paymentType: actualPaymentType,
              settlementTime: resolvedPaidAt
            });

            detailMessage = `Daftar Ulang SPMB a.n ${candidate.fullName} (${candidate.registrationNo}) berhasil di-settle LUNAS.`;
          } else if (isExpired && candidate.reRegistrationStatus === "pending") {
            candidate.reRegistrationStatus = "unpaid";
            candidate.reRegistrationOrderId = undefined;
            actionTaken = true;
            detailMessage = `Pembayaran daftar ulang SPMB a.n ${candidate.fullName} dibatalkan karena expired.`;
          }
        }
      }
    }

    if (actionTaken) {
      saveState();
    }

    return {
      status: isSettled ? "settled" : isExpired ? "expired" : "pending",
      actionTaken,
      detailMessage,
      midtransStatus: statusData
    };
  }

  async function runAutomatedMidtransReconciliation() {
    const serverKey = (midtransConfig.serverKey || "").trim();
    if (!serverKey || midtransConfig.isDisabled) {
      return { scannedCount: 0, reconciledCount: 0, expiredCount: 0, totalAutoReconciledLifetime: midtransAutoPollerStats.totalAutoReconciledLifetime };
    }

    const pendingOrders = new Set<string>();
    sppBills.filter(b => b.status === "pending" && b.orderId).forEach(b => pendingOrders.add(b.orderId!));
    miscBills.filter(m => m.status === "pending" && m.orderId).forEach(m => pendingOrders.add(m.orderId!));
    savingsTransactions.filter(t => t.status === "pending" && t.orderId).forEach(t => pendingOrders.add(t.orderId!));

    let reconciled = 0;
    let expired = 0;

    for (const orderId of pendingOrders) {
      try {
        const result = await processMidtransOrderStatus(orderId);
        if (result.actionTaken) {
          if (result.status === "settled") reconciled++;
          if (result.status === "expired") expired++;
        }
      } catch (e) {}
    }

    midtransAutoPollerStats.lastRunTime = new Date().toISOString();
    midtransAutoPollerStats.scannedCount = pendingOrders.size;
    midtransAutoPollerStats.reconciledCount = reconciled;
    midtransAutoPollerStats.expiredCount = expired;
    midtransAutoPollerStats.totalAutoReconciledLifetime += reconciled;

    return {
      scannedCount: pendingOrders.size,
      reconciledCount: reconciled,
      expiredCount: expired,
      totalAutoReconciledLifetime: midtransAutoPollerStats.totalAutoReconciledLifetime
    };
  }

  // =========================================================================
  // API ROUTE DEFINITIONS
  // =========================================================================

  // 1. Get Midtrans visual details (safely masks server key)
  router.get("/midtrans-config", (req, res) => {
    res.json({
      merchantId: midtransConfig.merchantId,
      clientKey: midtransConfig.clientKey,
      hasServerKey: !!midtransConfig.serverKey,
      isProduction: midtransConfig.isProduction,
      isDisabled: !!midtransConfig.isDisabled,
      adminFee: 0,
      systemMaintenanceFee: 0,
      chargeFeesToUser: false,
      hasPin: !!midtransConfig.pin
    });
  });

  // 2. Set dynamic Midtrans credentials
  router.post("/set-midtrans-config", async (req, res) => {
    try {
      const { merchantId, clientKey, serverKey, isProduction, isDisabled, pin } = req.body;
      
      midtransConfig.merchantId = merchantId !== undefined ? String(merchantId).trim() : (midtransConfig.merchantId || "");
      midtransConfig.clientKey = clientKey !== undefined ? String(clientKey).trim() : (midtransConfig.clientKey || "");
      if (serverKey) {
        midtransConfig.serverKey = String(serverKey).trim();
      }
      midtransConfig.isProduction = !!isProduction;
      midtransConfig.isDisabled = !!isDisabled;
      if (pin) {
        midtransConfig.pin = String(pin).trim();
      }

      const notif: RealtimeNotification = {
        id: `notif-sys-${Date.now()}`,
        title: "Konfigurasi Gateway Diupdate ⚙️",
        message: `Konfigurasi Midtrans diperbarui. Pembayaran online sekarang ${midtransConfig.isDisabled ? 'NONAKTIF' : 'AKTIF'}.`,
        type: "info",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notif);

      saveState();
      await saveConfigToMysql("midtransConfig", midtransConfig).catch(() => {});

      res.json({ 
        success: true, 
        message: "Konfigurasi Midtrans berhasil disimpan!",
        config: {
          merchantId: midtransConfig.merchantId,
          clientKey: midtransConfig.clientKey,
          hasServerKey: !!midtransConfig.serverKey,
          isProduction: midtransConfig.isProduction,
          isDisabled: !!midtransConfig.isDisabled,
          hasPin: !!midtransConfig.pin
        }
      });
    } catch (err: any) {
      console.error("Error setting midtrans config:", err);
      res.status(500).json({ error: "Gagal menyimpan konfigurasi: " + (err.message || err) });
    }
  });

  // 3. Verify Midtrans PIN
  router.post("/verify-midtrans-pin", (req, res) => {
    const { pin } = req.body;
    const isCorrect = String(pin).trim() === String(midtransConfig.pin || "1234").trim();
    res.json({ success: isCorrect });
  });

  // 4. Get list of all Midtrans transactions
  router.get("/admin/midtrans-transactions", (req, res) => {
    autoSyncHistoricalMidtransTransactions();
    const sorted = [...midtransTransactions].sort((a, b) => {
      const timeA = new Date(a.transactionTime || a.createdAt || 0).getTime();
      const timeB = new Date(b.transactionTime || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    res.json({ success: true, transactions: sorted, count: sorted.length });
  });

  // 5. Trigger batch status sync with Midtrans Gateway for pending transactions
  router.post("/admin/midtrans-transactions/sync-all", async (req, res) => {
    try {
      const result = await runAutomatedMidtransReconciliation();
      autoSyncHistoricalMidtransTransactions();
      res.json({
        success: true,
        message: `Penyelarasan selesai. ${result.scannedCount} order pending dipindai, ${result.reconciledCount} order berhasil diselaraskan.`,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ error: "Gagal menyelaraskan transaksi: " + err.message });
    }
  });

  // 6. Export transactions
  router.get("/admin/midtrans-transactions/export", (req, res) => {
    autoSyncHistoricalMidtransTransactions();
    res.json({ success: true, transactions: midtransTransactions });
  });

  // 7. Auto-Poller Engine Status Endpoint
  router.get("/midtrans-autopoller-status", (req, res) => {
    res.json({
      success: true,
      stats: midtransAutoPollerStats,
      config: {
        hasServerKey: !!(midtransConfig.serverKey || "").trim(),
        isProduction: midtransConfig.isProduction,
        isDisabled: !!midtransConfig.isDisabled
      }
    });
  });

  // 8. Force Manual Run of Auto-Poller Engine Endpoint
  router.post("/midtrans-autopoller-run", async (req, res) => {
    try {
      const result = await runAutomatedMidtransReconciliation();
      res.json({
        success: true,
        ...result,
        message: result.reconciledCount > 0 
          ? `Sistem berhasil memverifikasi & merekonsiliasi ${result.reconciledCount} transaksi Midtrans terlewat!` 
          : `Pindai selesai. Dipindai ${result.scannedCount} order pending. Semua status di database sudah selaras dengan Midtrans.`
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // 9. Verify pending orders for a specific student or system-wide
  router.post("/verify-midtrans-pending", async (req, res) => {
    try {
      const { studentId } = req.body;
      const pendingOrdersToVerify: string[] = [];

      if (studentId) {
        sppBills.filter(b => b.studentId === studentId && (b.status === "pending" || b.status === "unpaid") && b.orderId)
          .forEach(b => pendingOrdersToVerify.push(b.orderId!));
        miscBills.filter(b => b.studentId === studentId && b.status !== "paid" && b.orderId)
          .forEach(b => pendingOrdersToVerify.push(b.orderId!));
        savingsTransactions.filter(t => t.studentId === studentId && t.status === "pending" && t.orderId)
          .forEach(t => pendingOrdersToVerify.push(t.orderId!));
      }

      let updatedCount = 0;
      for (const orderId of pendingOrdersToVerify) {
        const result = await processMidtransOrderStatus(orderId);
        if (result.actionTaken) updatedCount++;
      }

      res.json({ success: true, updatedCount });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // 10. Generate snap payment token for SPP payment
  router.post("/pay-spp-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Pembayaran online mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { billId } = req.body;
    const bill = sppBills.find(b => b.id === billId);
    if (!bill) {
      return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    }
    if (bill.status === "paid" || bill.status === "waived") {
      return res.status(400).json({ error: "Tagihan sudah lunas atau dibebaskan." });
    }
    const studentBills = sppBills.filter(b => b.studentId === bill.studentId);
    if (!isBillActive(bill, studentBills)) {
      return res.status(400).json({ error: `Tagihan SPP ${bill.month} ${bill.year} belum aktif. Silakan lunasi SPP bulan berjalan terlebih dahulu.` });
    }
    const student = students.find(s => s.id === bill.studentId);
    if (!student) {
      return res.status(404).json({ error: "Siswa tidak ditemukan." });
    }

    const monthMapShorten: { [key: string]: string } = {
      "Januari": "Jan", "Februari": "Feb", "Maret": "Mar", "April": "Apr",
      "Mei": "Mei", "Juni": "Jun", "Juli": "Jul", "Agustus": "Ags",
      "September": "Sep", "Oktober": "Okt", "November": "Nov", "Desember": "Des"
    };
    const shortMonth = monthMapShorten[bill.month] || bill.month.slice(0, 3);
    const shortYear = (bill.year || 2026).toString().slice(-2);
    const studentNis = (student.nis ? String(student.nis).trim() : student.id.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    let orderId = `SPP-${studentNis}-${shortMonth}${shortYear}-${Date.now().toString().slice(-4)}`;
    if (orderId.length > 48) {
      orderId = `SPP-${studentNis.slice(0, 10)}-${shortMonth}${shortYear}-${Date.now().toString().slice(-4)}`;
    }

    bill.orderId = orderId;
    bill.status = "pending";
    saveState();

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.json({
        token: `mock-snap-token-${Date.now()}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-token-${Date.now()}`,
        orderId,
        isMock: true
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: bill.amount
        },
        item_details: [
          {
            id: bill.id.slice(0, 45),
            price: bill.amount,
            quantity: 1,
            name: `SPP ${bill.month} ${bill.year} - ${student.name}`.slice(0, 45)
          }
        ],
        customer_details: {
          first_name: student.name.slice(0, 45),
          email: student.email || `${student.nis || "siswa"}@smpmaarifnu.sch.id`,
          phone: student.phone || "081234567890"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_messages ? data.error_messages.join(", ") : "Gagal membuat transaksi Snap");
      }

      recordOrUpdateMidtransTransaction({
        orderId,
        billType: "spp",
        grossAmount: bill.amount,
        studentName: student.name,
        studentNis: student.nis,
        description: `SPP ${bill.month} ${bill.year}`,
        transactionStatus: "pending",
        paymentType: "Midtrans Snap"
      });

      res.json({
        token: data.token,
        redirect_url: data.redirect_url,
        orderId,
        totalAmount: bill.amount,
        itemCount: 1,
        isMock: false,
        isSimulated: false
      });
    } catch (err: any) {
      console.error("Midtrans API Error:", err);
      res.status(500).json({ error: err.message || "Gagal menghubungkan ke Midtrans" });
    }
  });

  // 11. Midtrans SNAP Token Generator for Cart/Multiple Payments
  router.post("/pay-cart-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Pembayaran online mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { 
      billIds = [], 
      sppBillIds = [], 
      miscBillIds = [], 
      savingsDeposits = [], 
      studentId: reqStudentId 
    } = req.body;

    const rawBillIds: any[] = Array.isArray(billIds) ? billIds : [];
    const rawSppIds: any[] = Array.isArray(sppBillIds) ? sppBillIds : [];
    const rawMiscIds: any[] = Array.isArray(miscBillIds) ? miscBillIds : [];
    const rawSavings: any[] = Array.isArray(savingsDeposits) ? savingsDeposits : [];

    // Filter SPP bills
    const selectedSpp = sppBills.filter(b => 
      rawSppIds.includes(b.id) || (rawBillIds.includes(b.id) && !b.id.startsWith("misc-") && !b.id.startsWith("sav-"))
    );

    // Filter Misc bills
    const selectedMisc = miscBills.filter(m => 
      rawMiscIds.includes(m.id) || (rawBillIds.includes(m.id) && (m.id.startsWith("misc-") || miscBills.some(x => x.id === m.id)))
    );

    // Extract Savings deposits from savingsDeposits AND from billIds strings (e.g. savings-deposit-timestamp-amount)
    const selectedSavings: { studentId?: string; amount: number; notes?: string }[] = [];

    if (rawSavings.length > 0) {
      rawSavings.forEach((sav: any) => {
        const val = typeof sav === "object" ? Number(sav.amount) : Number(sav);
        if (!isNaN(val) && val > 0) {
          selectedSavings.push({
            studentId: sav.studentId || reqStudentId,
            amount: val,
            notes: sav.notes || "Setoran Tabungan Siswa"
          });
        }
      });
    }

    rawBillIds.forEach((item: any) => {
      if (typeof item === "string" && (item.startsWith("savings-deposit-") || item.startsWith("sav-deposit-") || item.startsWith("cart-savings-"))) {
        const parts = item.split("-");
        const lastPart = parts[parts.length - 1];
        const val = Number(lastPart);
        if (!isNaN(val) && val > 0) {
          selectedSavings.push({
            studentId: reqStudentId,
            amount: val,
            notes: "Setoran Tabungan Siswa"
          });
        }
      }
    });

    if (selectedSpp.length === 0 && selectedMisc.length === 0 && selectedSavings.length === 0) {
      return res.status(400).json({ error: "Tidak ada tagihan atau setoran tabungan yang dipilih dalam keranjang." });
    }

    const studentId = reqStudentId || selectedSpp[0]?.studentId || selectedMisc[0]?.studentId || selectedSavings[0]?.studentId;
    let student = students.find(s => s.id === studentId || s.nis === studentId);
    if (!student && students.length > 0) {
      student = students[0];
    }
    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan." });
    }

    const totalAmount = selectedSpp.reduce((sum, b) => sum + Number(b.amount || 0), 0) +
                        selectedMisc.reduce((sum, m) => sum + Number(m.amount || 0), 0) +
                        selectedSavings.reduce((sum, s) => sum + Number(s.amount || 0), 0);

    const itemCount = selectedSpp.length + selectedMisc.length + selectedSavings.length;

    const studentNis = (student.nis ? String(student.nis).trim() : student.id.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    let orderId = `CART-${studentNis}-${Date.now()}`;
    if (orderId.length > 48) {
      orderId = `CART-${studentNis.slice(0, 12)}-${Date.now().toString().slice(-6)}`;
    }

    selectedSpp.forEach(b => { b.orderId = orderId; b.status = "pending"; });
    selectedMisc.forEach(m => { m.orderId = orderId; m.status = "pending"; });
    selectedSavings.forEach(s => {
      const trans: SavingsTransaction = {
        id: `sav-cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: s.studentId || student!.id,
        type: "deposit",
        amount: s.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        orderId
      };
      savingsTransactions.unshift(trans);
    });

    saveState();

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.json({
        token: `mock-cart-snap-token-${Date.now()}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-cart-${Date.now()}`,
        orderId,
        totalAmount,
        itemCount,
        isMock: true,
        isSimulated: true
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const itemDetails: any[] = [];
      selectedSpp.forEach(b => {
        itemDetails.push({ id: b.id.slice(0, 45), price: b.amount, quantity: 1, name: `SPP ${b.month} ${b.year}`.slice(0, 45) });
      });
      selectedMisc.forEach(m => {
        itemDetails.push({ id: m.id.slice(0, 45), price: m.amount, quantity: 1, name: m.title.slice(0, 45) });
      });
      selectedSavings.forEach((s, idx) => {
        itemDetails.push({ id: `SAV-${Date.now()}-${idx}`.slice(0, 45), price: s.amount, quantity: 1, name: (s.notes || "Setoran Tabungan").slice(0, 45) });
      });

      const payload = {
        transaction_details: { order_id: orderId, gross_amount: totalAmount },
        item_details: itemDetails,
        customer_details: {
          first_name: student.name.slice(0, 45),
          email: student.email || `${student.nis || "siswa"}@smpmaarifnu.sch.id`,
          phone: student.phone || "081234567890"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Basic ${authHeader}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_messages ? data.error_messages.join(", ") : "Gagal membuat transaksi Snap Cart");
      }

      recordOrUpdateMidtransTransaction({
        orderId,
        billType: "cart",
        grossAmount: totalAmount,
        studentName: student.name,
        studentNis: student.nis,
        description: `Paket Pembayaran (${selectedSpp.length} SPP, ${selectedMisc.length} Non-SPP, ${selectedSavings.length} Tabungan)`,
        transactionStatus: "pending",
        paymentType: "Midtrans Snap Cart"
      });

      res.json({
        token: data.token,
        redirect_url: data.redirect_url,
        orderId,
        totalAmount,
        itemCount,
        isMock: false,
        isSimulated: false
      });
    } catch (err: any) {
      console.error("Midtrans Cart API Error:", err);
      // Fallback: If gateway call fails, return mock simulation token so user can still test/proceed without crash
      res.json({
        token: `mock-cart-snap-token-${Date.now()}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-cart-${Date.now()}`,
        orderId,
        totalAmount,
        itemCount,
        isMock: true,
        isSimulated: true,
        gatewayError: err.message
      });
    }
  });

  // 12. Non-SPP SNAP Token Generator
  router.post("/pay-misc-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Pembayaran online mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { billId } = req.body;
    const bill = miscBills.find(b => b.id === billId);
    if (!bill) return res.status(404).json({ error: "Tagihan tidak ditemukan." });
    if (bill.status === "paid") return res.status(400).json({ error: "Tagihan sudah lunas." });

    const student = students.find(s => s.id === bill.studentId);
    if (!student) return res.status(404).json({ error: "Siswa tidak ditemukan." });

    const studentNis = (student.nis ? String(student.nis).trim() : student.id.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    const shortBillId = compressMiscBillIdForMidtrans(bill.id);
    let orderId = `MISC-${studentNis}-${shortBillId}-${Date.now().toString().slice(-4)}`;
    if (orderId.length > 48) {
      orderId = `MISC-${studentNis.slice(0, 10)}-${shortBillId.slice(0, 12)}-${Date.now().toString().slice(-4)}`;
    }

    bill.orderId = orderId;
    bill.status = "pending";
    saveState();

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.json({
        token: `mock-misc-token-${Date.now()}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-misc-${Date.now()}`,
        orderId,
        isMock: true
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const payload = {
        transaction_details: { order_id: orderId, gross_amount: bill.amount },
        item_details: [{ id: bill.id.slice(0, 45), price: bill.amount, quantity: 1, name: bill.title.slice(0, 45) }],
        customer_details: {
          first_name: student.name.slice(0, 45),
          email: student.email || `${student.nis || "siswa"}@smpmaarifnu.sch.id`,
          phone: student.phone || "081234567890"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Basic ${authHeader}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_messages ? data.error_messages.join(", ") : "Gagal membuat transaksi Snap Tagihan Lain");
      }

      recordOrUpdateMidtransTransaction({
        orderId,
        billType: "misc",
        grossAmount: bill.amount,
        studentName: student.name,
        studentNis: student.nis,
        description: bill.title,
        transactionStatus: "pending",
        paymentType: "Midtrans Snap"
      });

      res.json({
        token: data.token,
        redirect_url: data.redirect_url,
        orderId,
        totalAmount: bill.amount,
        itemCount: 1,
        isMock: false,
        isSimulated: false
      });
    } catch (err: any) {
      console.error("Midtrans Misc Error:", err);
      res.status(500).json({ error: err.message || "Gagal menghubungkan ke Midtrans" });
    }
  });

  // 13. Deposit Tabungan SNAP Token Generator
  router.post("/deposit-savings-snap", async (req, res) => {
    if (midtransConfig.isDisabled) {
      return res.status(400).json({ error: "Deposit tabungan mandiri via Midtrans sedang dinonaktifkan sementara oleh Administrator sekolah." });
    }
    const { studentId, amount } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ error: "Siswa tidak ditemukan." });

    const valAmount = Number(amount);
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: "Jumlah deposit harus positif." });
    }

    const studentNis = (student.nis ? String(student.nis).trim() : studentId.replace(/^std-/, '')).replace(/[^a-zA-Z0-9]/g, '');
    let orderId = `SAV-${studentNis}-${Date.now()}`;
    if (orderId.length > 48) {
      orderId = `SAV-${studentNis.slice(0, 12)}-${Date.now().toString().slice(-6)}`;
    }

    const trans: SavingsTransaction = {
      id: `sav-pay-${Date.now()}`,
      studentId,
      type: "deposit",
      amount: valAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
      orderId
    };
    savingsTransactions.unshift(trans);
    saveState();

    const hasMidtrans = midtransConfig.serverKey && midtransConfig.clientKey;
    if (!hasMidtrans) {
      return res.json({
        token: `mock-sav-snap-token-${Date.now()}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-sav-${Date.now()}`,
        orderId,
        totalAmount: valAmount,
        itemCount: 1,
        isMock: true,
        isSimulated: true
      });
    }

    try {
      const authHeader = Buffer.from(`${midtransConfig.serverKey}:`).toString("base64");
      const url = midtransConfig.isProduction 
        ? "https://app.midtrans.com/snap/v1/transactions" 
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";

      const payload = {
        transaction_details: { order_id: orderId, gross_amount: valAmount },
        item_details: [{ id: trans.id.slice(0, 45), price: valAmount, quantity: 1, name: "Setor Tabungan Siswa".slice(0, 45) }],
        customer_details: {
          first_name: student.name.slice(0, 45),
          email: student.email || `${student.nis || "siswa"}@smpmaarifnu.sch.id`,
          phone: student.phone || "081234567890"
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Basic ${authHeader}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_messages ? data.error_messages.join(", ") : "Gagal membuat transaksi Snap Tabungan");
      }

      recordOrUpdateMidtransTransaction({
        orderId,
        billType: "savings",
        grossAmount: valAmount,
        studentName: student.name,
        studentNis: student.nis,
        description: "Setor Tabungan Siswa",
        transactionStatus: "pending",
        paymentType: "Midtrans Snap"
      });

      res.json({
        token: data.token,
        redirect_url: data.redirect_url,
        orderId,
        totalAmount: valAmount,
        itemCount: 1,
        isMock: false,
        isSimulated: false
      });
    } catch (err: any) {
      console.error("Midtrans Savings Error:", err);
      res.status(500).json({ error: err.message || "Gagal menghubungkan ke Midtrans" });
    }
  });

  // 14. Simulate payment success (Sandbox / Local Dev Testing)
  router.post("/simulate-payment-success", async (req, res) => {
    const { orderId, paymentType, transactionId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Order ID is required." });

    let midtransStatus: any = null;
    try {
      midtransStatus = await getMidtransStatus(orderId);
    } catch (e) {}

    const actualPaymentType = paymentType || midtransStatus?.payment_type || "Midtrans Snap";

    try {
      const reconResult = await processMidtransOrderStatus(orderId, {
        order_id: orderId,
        transaction_status: "settlement",
        payment_type: actualPaymentType,
        settlement_time: new Date().toISOString(),
        transaction_id: transactionId || midtransStatus?.transaction_id || `sim-${Date.now()}`
      });

      res.json({ success: true, message: "Pembayaran berhasil disimulasikan sebagai lunas.", reconResult });
    } catch (e) {
      const err = e as Error;
      res.status(500).json({ error: "Gagal mensimulasikan pembayaran: " + err.message });
    }
  });

  // 15. Midtrans Webhook (Direct HTTP POST callback from Midtrans)
  router.post("/midtrans-webhook", async (req, res) => {
    const webhookData = req.body;
    const { order_id, transaction_status, payment_type, gross_amount, transaction_id } = webhookData;
    console.log("[Midtrans Webhook Callback]:", { order_id, transaction_status, payment_type, gross_amount, transaction_id });

    if (!order_id) {
      return res.status(400).json({ status: "error", message: "Order ID missing" });
    }

    try {
      const result = await processMidtransOrderStatus(order_id, webhookData);
      res.json({ status: "ok", actionTaken: result.actionTaken, detail: result.detailMessage });
    } catch (e) {
      const err = e as Error;
      console.error("[Midtrans Webhook Error]:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // 16. Verify single order directly
  router.post("/verify-midtrans-order", async (req, res) => {
    const { orderId } = req.body;
    if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
      return res.status(400).json({ error: "Order ID atau nomor referensi wajib diisi." });
    }
    const cleanOrderId = orderId.trim();

    try {
      const midtransStatus = await getMidtransStatus(cleanOrderId);
      if (!midtransStatus) {
        const localSpp = sppBills.find(b => b.orderId === cleanOrderId || b.id === cleanOrderId);
        const localMisc = miscBills.find(b => b.orderId === cleanOrderId || b.id === cleanOrderId);
        const localSavings = savingsTransactions.find(t => t.orderId === cleanOrderId || t.id === cleanOrderId);
        if (localSpp || localMisc || localSavings) {
          return res.json({ success: true, message: "Data transaksi ditemukan di sistem internal sekolah.", item: localSpp || localMisc || localSavings });
        }
        return res.status(404).json({ error: `Order ID '${cleanOrderId}' tidak ditemukan di Gateway Midtrans maupun database lokal.` });
      }

      const ts = midtransStatus.transaction_status;
      const isSettled = ts === "settlement" || ts === "capture";
      if (!isSettled) {
        return res.status(400).json({
          error: `Transaksi ditemukan di Midtrans tetapi status saat ini adalah '${(ts || 'unknown').toUpperCase()}'. Hanya transaksi dengan status SETTLEMENT/CAPTURE yang dapat diverifikasi sebagai LUNAS.`,
          midtransStatus
        });
      }

      const reconResult = await processMidtransOrderStatus(cleanOrderId, midtransStatus);
      return res.json({
        success: true,
        type: reconResult.actionTaken ? "reconciled" : "midtrans_only",
        message: `BERHASIL! ${reconResult.detailMessage || "Transaksi terverifikasi LUNAS di Midtrans."}`,
        midtransStatus,
        reconResult
      });
    } catch (e) {
      const err = e as Error;
      console.error("Error verifying midtrans order:", err);
      res.status(500).json({ error: "Gagal memproses verifikasi order: " + err.message });
    }
  });

  // 17. Bulk Midtrans Report Upload & Reconciliation Endpoint
  router.post("/verify-midtrans-bulk-report", async (req, res) => {
    try {
      const { items = [] } = req.body;
      const parsedItems: any[] = Array.isArray(items) ? items : [];

      if (parsedItems.length === 0) {
        return res.status(400).json({ error: "Tidak ada data transaksi yang terbaca dari file report." });
      }

      let reconciledCount = 0;
      let alreadyPaidCount = 0;
      let notFoundCount = 0;
      let pendingCount = 0;
      let failedCount = 0;
      let totalAmountReconciled = 0;
      let stateChanged = false;

      const results: {
        orderId: string;
        transactionId?: string;
        studentName: string;
        studentNis: string;
        studentClass?: string;
        category: string;
        amount: number;
        reportStatus: string;
        reportPaymentType: string;
        reportTime: string;
        reconciliationStatus: 'reconciled' | 'already_paid' | 'not_found' | 'report_pending' | 'report_failed';
        message: string;
      }[] = [];

      for (const item of parsedItems) {
        const cleanOrderId = String(item.orderId || item.order_id || item["Order ID"] || "").trim();
        const cleanTxId = String(item.transactionId || item.transaction_id || item["Transaction ID"] || "").trim();
        
        if (!cleanOrderId && !cleanTxId) continue;

        const amountVal = Number(item.grossAmount || item.amount || item.gross_amount || 0);
        const rawStatus = String(item.status || item.transaction_status || "settlement").toLowerCase().trim();
        const actualPaymentType = item.paymentType ? (item.paymentType.toLowerCase().includes("midtrans") ? item.paymentType : `Midtrans (${item.paymentType})`) : "Midtrans Online";
        const reportTime = item.settlementTime || item.transactionTime || new Date().toISOString();
        const resolvedPaidAt = parseMidtransTime(reportTime);
        const customerEmail = String(item.customerEmail || item.customer_email || "").trim().toLowerCase();
        const rawNis = String(item.studentNis || item.nis || "").trim();
        const rawName = String(item.customerName || item.studentName || item.name || "").trim().toLowerCase();
        const rawDesc = String(item.description || item.itemName || item.item_name || item.keterangan || item.notes || item.rincian || "").trim();
        const explicitMonth = item.month || item.bulan || item.periode;
        const explicitYear = item.year ? Number(item.year) : undefined;

        // Extract month & year from combined text
        const extracted = extractMonthAndYear(`${cleanOrderId} ${rawDesc} ${explicitMonth || ""}`);
        const rowMonth = extracted.month || (explicitMonth ? MONTH_LOOKUP[String(explicitMonth).toLowerCase().trim()] : undefined);
        const rowYear = extracted.year || explicitYear;

        // 1. Identify Student
        const emailNis = customerEmail.includes("@") ? customerEmail.split("@")[0].replace(/\D/g, "") : "";
        let targetStudent = students.find(s =>
          (rawNis && String(s.nis).trim() === rawNis) ||
          (rawNis && s.id === `std-${rawNis}`) ||
          (emailNis && String(s.nis).trim() === emailNis) ||
          (customerEmail && s.email && s.email.toLowerCase().trim() === customerEmail) ||
          (rawName && s.name && s.name.toLowerCase().trim() === rawName)
        );

        if (!targetStudent && cleanOrderId) {
          const parts = cleanOrderId.split("-");
          for (const p of parts) {
            if (/^\d{3,12}$/.test(p)) {
              const matched = students.find(s => String(s.nis).trim() === p || s.id === `std-${p}`);
              if (matched) {
                targetStudent = matched;
                break;
              }
            }
          }
        }

        const isSettled = rawStatus.includes("settlement") || rawStatus.includes("capture") || rawStatus.includes("success") || rawStatus.includes("lunas") || rawStatus.includes("paid") || rawStatus.includes("settled");
        const isPending = rawStatus.includes("pending") || rawStatus.includes("challenge");
        const isFailed = rawStatus.includes("expire") || rawStatus.includes("cancel") || rawStatus.includes("deny") || rawStatus.includes("failure") || rawStatus.includes("gagal") || rawStatus.includes("batal");

        // 2. Handle Non-Settled Statuses
        if (!isSettled) {
          if (isPending) {
            pendingCount++;
            results.push({
              orderId: cleanOrderId || cleanTxId,
              transactionId: cleanTxId,
              studentName: targetStudent?.name || item.customerName || "-",
              studentNis: targetStudent?.nis || item.studentNis || "-",
              studentClass: targetStudent?.class || "-",
              category: rowMonth ? `SPP ${rowMonth} ${rowYear || ''}` : "Transaksi Online",
              amount: amountVal,
              reportStatus: rawStatus || "pending",
              reportPaymentType: actualPaymentType,
              reportTime,
              reconciliationStatus: "report_pending",
              message: "Status di report Midtrans masih PENDING (Menunggu pembayaran dari wali murid)."
            });
          } else {
            failedCount++;
            results.push({
              orderId: cleanOrderId || cleanTxId,
              transactionId: cleanTxId,
              studentName: targetStudent?.name || item.customerName || "-",
              studentNis: targetStudent?.nis || item.studentNis || "-",
              studentClass: targetStudent?.class || "-",
              category: rowMonth ? `SPP ${rowMonth} ${rowYear || ''}` : "Transaksi Online",
              amount: amountVal,
              reportStatus: rawStatus || "failed",
              reportPaymentType: actualPaymentType,
              reportTime,
              reconciliationStatus: "report_failed",
              message: `Status di report Midtrans: ${rawStatus.toUpperCase()} (Transaksi dibatalkan/kadaluarsa).`
            });
          }
          continue;
        }

        // 3. Handle Settled Statuses

        const isExplicitMisc = isExplicitNonSpp(cleanOrderId, rawDesc, miscBills);
        const isExplicitSav = isExplicitSavings(cleanOrderId, rawDesc);
        const isExplicitSp = isExplicitSpmb(cleanOrderId, rawDesc);
        const isExplicitCt = isExplicitCart(cleanOrderId, rawDesc);
        const isExplicitSppBill = isExplicitSpp(cleanOrderId, rawDesc);

        // ----------------------------------------------------
        // 1. SPMB (PENERIMAAN MURID BARU) TRANSACTIONS
        // ----------------------------------------------------
        if (isExplicitSp || cleanOrderId.startsWith("SPMB-") || cleanOrderId.startsWith("PPDB-")) {
          const isTokenPayment = cleanOrderId.includes("TOKEN") || rawDesc.toLowerCase().includes("token") || cleanOrderId.startsWith("SPMB-TOKEN-");
          const isReregPayment = cleanOrderId.includes("REREG") || rawDesc.toLowerCase().includes("daftar ulang") || cleanOrderId.startsWith("SPMB-REREG-");

          // Find candidate in spmbCandidates
          let matchedCandidate = spmbCandidates.find(c =>
            c.tokenPaymentOrderId === cleanOrderId ||
            c.reRegistrationOrderId === cleanOrderId ||
            (c.registrationNo && cleanOrderId.includes(c.registrationNo)) ||
            (c.nisn && (cleanOrderId.includes(c.nisn) || rawNis === c.nisn)) ||
            (c.phone && (cleanOrderId.includes(c.phone) || item.customerPhone === c.phone)) ||
            (rawName && c.fullName && c.fullName.toLowerCase().trim() === rawName)
          );

          if (isTokenPayment) {
            const tokenAmt = amountVal || matchedCandidate?.tokenAmount || 50000;
            if (matchedCandidate) {
              if (matchedCandidate.tokenPaymentStatus === "paid") {
                alreadyPaidCount++;
                results.push({
                  orderId: cleanOrderId,
                  transactionId: cleanTxId,
                  studentName: matchedCandidate.fullName,
                  studentNis: matchedCandidate.nisn || matchedCandidate.registrationNo || "-",
                  studentClass: "Calon Siswa SPMB",
                  category: "Token Pendaftaran SPMB",
                  amount: tokenAmt,
                  reportStatus: rawStatus,
                  reportPaymentType: actualPaymentType,
                  reportTime: matchedCandidate.tokenPaidAt || resolvedPaidAt,
                  reconciliationStatus: "already_paid",
                  message: `SUDAH LUNAS: Token Pendaftaran SPMB a.n ${matchedCandidate.fullName} (${matchedCandidate.registrationNo}) sebelumnya sudah tercatat LUNAS.`
                });
              } else {
                matchedCandidate.tokenPaymentStatus = "paid";
                matchedCandidate.tokenPaymentOrderId = cleanOrderId;
                matchedCandidate.tokenPaidAt = resolvedPaidAt;
                matchedCandidate.tokenPaymentMethod = actualPaymentType;
                matchedCandidate.tokenAmount = tokenAmt;

                reconciledCount++;
                totalAmountReconciled += tokenAmt;
                stateChanged = true;

                recordOrUpdateMidtransTransaction({
                  orderId: cleanOrderId,
                  transactionId: cleanTxId,
                  billType: "spmb_token",
                  grossAmount: tokenAmt,
                  studentName: matchedCandidate.fullName,
                  studentNis: matchedCandidate.nisn || matchedCandidate.registrationNo,
                  description: `Token Formulir SPMB (${matchedCandidate.registrationNo})`,
                  transactionStatus: "settlement",
                  paymentType: actualPaymentType,
                  settlementTime: resolvedPaidAt
                });

                results.push({
                  orderId: cleanOrderId,
                  transactionId: cleanTxId,
                  studentName: matchedCandidate.fullName,
                  studentNis: matchedCandidate.nisn || matchedCandidate.registrationNo || "-",
                  studentClass: "Calon Siswa SPMB",
                  category: "Token Pendaftaran SPMB",
                  amount: tokenAmt,
                  reportStatus: rawStatus,
                  reportPaymentType: actualPaymentType,
                  reportTime: resolvedPaidAt,
                  reconciliationStatus: "reconciled",
                  message: `BERHASIL DILUNASI! Token formulir SPMB a.n ${matchedCandidate.fullName} (${matchedCandidate.registrationNo}) terverifikasi LUNAS.`
                });
              }
            } else {
              // Unregistered SPMB Candidate token purchase
              reconciledCount++;
              totalAmountReconciled += tokenAmt;
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                billType: "spmb_token",
                grossAmount: tokenAmt,
                studentName: item.customerName || "Calon Siswa",
                description: `Token Formulir SPMB`,
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: item.customerName || "Calon Siswa Baru",
                studentNis: "-",
                studentClass: "Calon Siswa SPMB",
                category: "Token Pendaftaran SPMB",
                amount: tokenAmt,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: resolvedPaidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DIVERIFIKASI! Pembayaran Token SPMB sebesar Rp ${tokenAmt.toLocaleString("id-ID")} dicatat.`
              });
            }
            continue;
          }

          if (isReregPayment && matchedCandidate) {
            const reregAmt = amountVal || matchedCandidate.reRegistrationAmount || 0;
            if (matchedCandidate.reRegistrationStatus === "paid") {
              alreadyPaidCount++;
              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: matchedCandidate.fullName,
                studentNis: matchedCandidate.nisn || matchedCandidate.registrationNo || "-",
                studentClass: "Calon Siswa SPMB",
                category: "Daftar Ulang SPMB",
                amount: reregAmt,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: matchedCandidate.reRegistrationPaidAt || resolvedPaidAt,
                reconciliationStatus: "already_paid",
                message: `SUDAH LUNAS: Daftar Ulang SPMB a.n ${matchedCandidate.fullName} sebelumnya sudah tercatat LUNAS.`
              });
            } else {
              matchedCandidate.reRegistrationStatus = "paid";
              matchedCandidate.reRegistrationOrderId = cleanOrderId;
              matchedCandidate.reRegistrationPaidAt = resolvedPaidAt;
              matchedCandidate.reRegistrationPaymentMethod = actualPaymentType;
              matchedCandidate.reRegistrationAmount = reregAmt;

              reconciledCount++;
              totalAmountReconciled += reregAmt;
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                billType: "spmb_reregistration",
                grossAmount: reregAmt,
                studentName: matchedCandidate.fullName,
                studentNis: matchedCandidate.nisn || matchedCandidate.registrationNo,
                description: `Daftar Ulang SPMB (${matchedCandidate.registrationNo})`,
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: matchedCandidate.fullName,
                studentNis: matchedCandidate.nisn || matchedCandidate.registrationNo || "-",
                studentClass: "Calon Siswa SPMB",
                category: "Daftar Ulang SPMB",
                amount: reregAmt,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: resolvedPaidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Biaya Daftar Ulang SPMB a.n ${matchedCandidate.fullName} terverifikasi LUNAS.`
              });
            }
            continue;
          }
        }

        // ----------------------------------------------------
        // 2. MULTI-BILL CART (CART-...)
        // ----------------------------------------------------
        if (isExplicitCt || cleanOrderId.startsWith("CART-") || cleanOrderId.includes("CART-")) {
          const matchedSpp = sppBills.filter(b => b.orderId === cleanOrderId);
          const matchedMisc = miscBills.filter(m => m.orderId === cleanOrderId);
          const matchedSavings = savingsTransactions.filter(t => t.orderId === cleanOrderId);

          if (matchedSpp.length > 0 || matchedMisc.length > 0 || matchedSavings.length > 0) {
            let cartSettledCount = 0;
            let cartTotalAmt = 0;

            matchedSpp.forEach(b => {
              if (b.status !== "paid") {
                b.status = "paid";
                b.paidAt = resolvedPaidAt;
                b.paymentMethod = actualPaymentType;
                if (cleanTxId) b.transactionId = cleanTxId;
                cartSettledCount++;
                cartTotalAmt += b.amount;
              }
            });

            matchedMisc.forEach(m => {
              if (m.status !== "paid") {
                m.status = "paid";
                m.paidAt = resolvedPaidAt;
                m.paymentMethod = actualPaymentType;
                if (cleanTxId) m.transactionId = cleanTxId;
                cartSettledCount++;
                cartTotalAmt += m.amount;
              }
            });

            matchedSavings.forEach(t => {
              if (t.status !== "success") {
                t.status = "success";
                t.paymentMethod = actualPaymentType;
                if (cleanTxId) t.transactionId = cleanTxId;
                const std = students.find(s => s.id === t.studentId);
                if (std) {
                  std.savingsBalance = (Number(std.savingsBalance) || 0) + Number(t.amount);
                  AUTHORITATIVE_SAVINGS_MAP[std.id] = std.savingsBalance;
                }
                cartSettledCount++;
                cartTotalAmt += t.amount;
              }
            });

            if (cartSettledCount > 0) {
              reconciledCount++;
              totalAmountReconciled += (cartTotalAmt || amountVal);
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                billType: "cart",
                grossAmount: amountVal || cartTotalAmt,
                studentName: targetStudent?.name,
                studentNis: targetStudent?.nis,
                description: `Keranjang Multi-Tagihan`,
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: targetStudent?.name || "Siswa",
                studentNis: targetStudent?.nis || "-",
                studentClass: targetStudent?.class || "-",
                category: "Paket Pembayaran (Multi-Bill Cart)",
                amount: amountVal || cartTotalAmt,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: resolvedPaidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Paket tagihan (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) terverifikasi LUNAS.`
              });
            } else {
              alreadyPaidCount++;
              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: targetStudent?.name || "Siswa",
                studentNis: targetStudent?.nis || "-",
                studentClass: targetStudent?.class || "-",
                category: "Paket Pembayaran (Multi-Bill Cart)",
                amount: amountVal,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: resolvedPaidAt,
                reconciliationStatus: "already_paid",
                message: `SUDAH LUNAS: Seluruh tagihan pada paket ini sebelumnya sudah berstatus LUNAS.`
              });
            }
            continue;
          } else if (targetStudent && amountVal > 0) {
            // Cart order without pre-tagged items -> Smart Auto-Allocate to student's unpaid bills / tabungan
            const alloc = autoAllocateStudentPayment(
              targetStudent,
              amountVal,
              cleanOrderId,
              cleanTxId,
              actualPaymentType,
              resolvedPaidAt
            );

            reconciledCount++;
            totalAmountReconciled += amountVal;
            stateChanged = true;

            recordOrUpdateMidtransTransaction({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              billType: "cart",
              grossAmount: amountVal,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              description: alloc.category,
              transactionStatus: "settlement",
              paymentType: actualPaymentType,
              settlementTime: resolvedPaidAt
            });

            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              studentClass: targetStudent.class || "-",
              category: alloc.category,
              amount: amountVal,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: resolvedPaidAt,
              reconciliationStatus: "reconciled",
              message: alloc.message
            });
            continue;
          }
        }

        // ----------------------------------------------------
        // 3. SAVINGS DEPOSITS (SAV- / TABUNGAN)
        // ----------------------------------------------------
        if (isExplicitSav || cleanOrderId.startsWith("SAV-") || cleanOrderId.startsWith("TAB-")) {
          let savingsTx = savingsTransactions.find(t => t.orderId === cleanOrderId || (cleanTxId && t.transactionId === cleanTxId) || t.id === cleanOrderId);
          if (!savingsTx && targetStudent) {
            savingsTx = savingsTransactions.find(t => t.studentId === targetStudent.id && t.status === "pending");
          }

          if (savingsTx) {
            const student = students.find(s => s.id === savingsTx.studentId) || targetStudent;

            if (savingsTx.status === "success") {
              alreadyPaidCount++;
              results.push({
                orderId: savingsTx.orderId || cleanOrderId,
                transactionId: cleanTxId || savingsTx.transactionId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: "Setoran Tabungan",
                amount: savingsTx.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime,
                reconciliationStatus: "already_paid",
                message: `SUDAH LUNAS: Setoran Tabungan a.n ${student?.name || 'Siswa'} sudah dikonfirmasi LUNAS.`
              });
            } else {
              savingsTx.status = "success";
              savingsTx.paymentMethod = actualPaymentType;
              savingsTx.orderId = cleanOrderId;
              if (cleanTxId) savingsTx.transactionId = cleanTxId;

              if (student) {
                student.savingsBalance = (Number(student.savingsBalance) || 0) + Number(savingsTx.amount);
                AUTHORITATIVE_SAVINGS_MAP[student.id] = student.savingsBalance;
              }

              reconciledCount++;
              totalAmountReconciled += savingsTx.amount;
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId || `SAV-${Date.now()}`,
                transactionId: cleanTxId,
                billType: "savings",
                grossAmount: savingsTx.amount,
                studentName: student?.name,
                studentNis: student?.nis,
                description: "Setoran Tabungan",
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: savingsTx.orderId || cleanOrderId,
                transactionId: cleanTxId || savingsTx.transactionId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: "Setoran Tabungan",
                amount: savingsTx.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: savingsTx.createdAt || resolvedPaidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Setoran Tabungan Rp ${savingsTx.amount.toLocaleString("id-ID")} a.n ${student?.name || 'Siswa'} berhasil ditambahkan ke saldo tabungan.`
              });
            }
            continue;
          }

          // If no existing transaction record but targetStudent identified:
          if (targetStudent && amountVal > 0) {
            const newSavingsTx: SavingsTransaction = {
              id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              studentId: targetStudent.id,
              type: "deposit",
              amount: amountVal,
              status: "success",
              createdAt: resolvedPaidAt,
              paymentMethod: actualPaymentType,
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              notes: `Setoran Tabungan (Midtrans Report Import)`
            };
            savingsTransactions.unshift(newSavingsTx);
            targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + amountVal;
            AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;

            reconciledCount++;
            totalAmountReconciled += amountVal;
            stateChanged = true;

            recordOrUpdateMidtransTransaction({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              billType: "savings",
              grossAmount: amountVal,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              description: "Setoran Tabungan",
              transactionStatus: "settlement",
              paymentType: actualPaymentType,
              settlementTime: resolvedPaidAt
            });

            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              studentClass: targetStudent.class,
              category: "Setoran Tabungan",
              amount: amountVal,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: resolvedPaidAt,
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Setoran Tabungan Rp ${amountVal.toLocaleString("id-ID")} a.n ${targetStudent.name} (NIS: ${targetStudent.nis}) berhasil ditambahkan ke saldo tabungan.`
            });
            continue;
          }
        }

        // ----------------------------------------------------
        // 4. NON-SPP (MISC / LAIN-LAIN) BILLS
        // ----------------------------------------------------
        let miscBill = findMiscBillMatching(cleanOrderId, miscBills, targetStudent?.id, { description: rawDesc, amount: amountVal }) ||
                       (cleanTxId ? findMiscBillMatching(cleanTxId, miscBills, targetStudent?.id, { description: rawDesc, amount: amountVal }) : undefined);

        if (miscBill || isExplicitMisc || cleanOrderId.startsWith("MISC-") || cleanOrderId.startsWith("M-") || cleanOrderId.startsWith("MB-") || cleanOrderId.startsWith("NONSPP-") || cleanOrderId.startsWith("LAIN-")) {
          // If not matched by exact ID, find student's unpaid misc bill matching title or amount
          if (!miscBill && targetStudent) {
            miscBill = miscBills.find(b =>
              b.studentId === targetStudent!.id &&
              (b.status === "pending" || b.status === "unpaid") &&
              (amountVal === 0 || b.amount === amountVal || (rawDesc && b.title.toLowerCase().includes(rawDesc.toLowerCase())))
            );
          }

          if (miscBill) {
            const student = students.find(s => s.id === miscBill.studentId) || targetStudent;

            if (miscBill.status === "paid") {
              alreadyPaidCount++;
              results.push({
                orderId: miscBill.orderId || cleanOrderId,
                transactionId: cleanTxId || miscBill.transactionId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: miscBill.title,
                amount: miscBill.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime,
                reconciliationStatus: "already_paid",
                message: `SUDAH LUNAS: Tagihan Non-SPP "${miscBill.title}" a.n ${student?.name || 'Siswa'} sebelumnya sudah tercatat LUNAS.`
              });
            } else {
              miscBill.status = "paid";
              miscBill.paidAt = resolvedPaidAt;
              miscBill.paymentMethod = actualPaymentType;
              miscBill.orderId = cleanOrderId || miscBill.orderId;
              if (cleanTxId) miscBill.transactionId = cleanTxId;

              reconciledCount++;
              totalAmountReconciled += miscBill.amount;
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId || `MISC-${Date.now()}`,
                transactionId: cleanTxId,
                billType: "misc",
                grossAmount: miscBill.amount,
                studentName: student?.name,
                studentNis: student?.nis,
                description: miscBill.title,
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: miscBill.orderId || cleanOrderId,
                transactionId: cleanTxId || miscBill.transactionId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: miscBill.title,
                amount: miscBill.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: miscBill.paidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Tagihan Non-SPP "${miscBill.title}" a.n ${student?.name || 'Siswa'} terverifikasi LUNAS.`
              });
            }
            continue;
          }

          // If explicitly Non-SPP but no specific misc bill record was found:
          if (isExplicitMisc || cleanOrderId.startsWith("MISC-")) {
            const billTitle = rawDesc || "Tagihan Non-SPP Lain-lain";
            const actualAmt = amountVal || 0;

            reconciledCount++;
            totalAmountReconciled += actualAmt;
            stateChanged = true;

            recordOrUpdateMidtransTransaction({
              orderId: cleanOrderId || `MISC-${Date.now()}`,
              transactionId: cleanTxId,
              billType: "misc",
              grossAmount: actualAmt,
              studentName: targetStudent?.name,
              studentNis: targetStudent?.nis,
              description: billTitle,
              transactionStatus: "settlement",
              paymentType: actualPaymentType,
              settlementTime: resolvedPaidAt
            });

            results.push({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              studentName: targetStudent?.name || item.customerName || "Siswa",
              studentNis: targetStudent?.nis || item.studentNis || "-",
              studentClass: targetStudent?.class || "-",
              category: billTitle,
              amount: actualAmt,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: resolvedPaidAt,
              reconciliationStatus: "reconciled",
              message: `BERHASIL DILUNASI! Pembayaran Tagihan Non-SPP "${billTitle}" a.n ${targetStudent?.name || 'Siswa'} terverifikasi.`
            });
            continue;
          }
        }

        // ----------------------------------------------------
        // 5. SPP BILLS (STRICTLY GUARDED FROM NON-SPP)
        // ----------------------------------------------------
        if (!isExplicitMisc && !isExplicitSav && !isExplicitSp && !isExplicitCt) {
          let sppBill = findSppBillMatching(cleanOrderId, sppBills, targetStudent?.id, { description: rawDesc, month: rowMonth, year: rowYear, miscBillsList: miscBills }) ||
                        (cleanTxId ? findSppBillMatching(cleanTxId, sppBills, targetStudent?.id, { description: rawDesc, month: rowMonth, year: rowYear, miscBillsList: miscBills }) : undefined);

          if (!sppBill && (cleanOrderId.startsWith("SPP-") || cleanOrderId.includes("SPP-"))) {
            const middle = cleanOrderId.includes("SPP-") ? cleanOrderId.split("SPP-")[1] : cleanOrderId;
            const lastHyphenIndex = middle.lastIndexOf("-");
            const billIdPart = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
            sppBill = findSppBillMatching(billIdPart, sppBills, targetStudent?.id, { description: rawDesc, month: rowMonth, year: rowYear, miscBillsList: miscBills });
          }

          // If target student is known and rowMonth was detected, search specifically for that month's bill
          if (!sppBill && targetStudent && rowMonth) {
            sppBill = sppBills.find(b =>
              b.studentId === targetStudent!.id &&
              b.month.toLowerCase() === rowMonth.toLowerCase() &&
              (!rowYear || b.year === rowYear)
            ) || sppBills.find(b =>
              b.studentId === targetStudent!.id &&
              b.month.toLowerCase() === rowMonth.toLowerCase()
            );
          }

          if (sppBill) {
            const student = students.find(s => s.id === sppBill.studentId) || targetStudent;

            if (sppBill.status === "paid") {
              alreadyPaidCount++;
              results.push({
                orderId: sppBill.orderId || cleanOrderId,
                transactionId: cleanTxId || sppBill.transactionId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: `SPP ${sppBill.month} ${sppBill.year}`,
                amount: sppBill.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime,
                reconciliationStatus: "already_paid",
                message: `SUDAH LUNAS: Tagihan SPP ${sppBill.month} ${sppBill.year} a.n ${student?.name || 'Siswa'} sebelumnya sudah tercatat LUNAS.`
              });
            } else {
              sppBill.status = "paid";
              sppBill.paidAt = resolvedPaidAt;
              sppBill.paymentMethod = actualPaymentType;
              sppBill.orderId = cleanOrderId || sppBill.orderId;
              if (cleanTxId) sppBill.transactionId = cleanTxId;

              reconciledCount++;
              totalAmountReconciled += sppBill.amount;
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId || `SPP-${Date.now()}`,
                transactionId: cleanTxId,
                billType: "spp",
                grossAmount: sppBill.amount,
                studentName: student?.name,
                studentNis: student?.nis,
                description: `SPP ${sppBill.month} ${sppBill.year}`,
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: sppBill.orderId || cleanOrderId,
                transactionId: cleanTxId || sppBill.transactionId,
                studentName: student?.name || "Siswa",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: `SPP ${sppBill.month} ${sppBill.year}`,
                amount: sppBill.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: sppBill.paidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Tagihan SPP ${sppBill.month} ${sppBill.year} a.n ${student?.name || 'Siswa'} terverifikasi LUNAS.`
              });
            }
            continue;
          }

          // Fallback: If no explicit month but student is known AND order is explicitly marked SPP:
          if (targetStudent && (isExplicitSppBill || cleanOrderId.startsWith("SPP-") || rawDesc.toLowerCase().includes("spp"))) {
            const studentUnpaidBills = sppBills
              .filter(b => b.studentId === targetStudent!.id && (b.status === "pending" || b.status === "unpaid") && (amountVal === 0 || b.amount === amountVal))
              .sort((a, b) => {
                const yearDiff = (a.year || 2026) - (b.year || 2026);
                if (yearDiff !== 0) return yearDiff;
                const idxA = ACADEMIC_MONTHS.indexOf(a.month);
                const idxB = ACADEMIC_MONTHS.indexOf(b.month);
                return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
              });

            const fallbackSpp = studentUnpaidBills[0];
            if (fallbackSpp) {
              fallbackSpp.status = "paid";
              fallbackSpp.paidAt = resolvedPaidAt;
              fallbackSpp.paymentMethod = actualPaymentType;
              fallbackSpp.orderId = cleanOrderId || fallbackSpp.orderId;
              if (cleanTxId) fallbackSpp.transactionId = cleanTxId;

              reconciledCount++;
              totalAmountReconciled += fallbackSpp.amount;
              stateChanged = true;

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId || `SPP-${Date.now()}`,
                transactionId: cleanTxId,
                billType: "spp",
                grossAmount: fallbackSpp.amount,
                studentName: targetStudent.name,
                studentNis: targetStudent.nis,
                description: `SPP ${fallbackSpp.month} ${fallbackSpp.year}`,
                transactionStatus: "settlement",
                paymentType: actualPaymentType,
                settlementTime: resolvedPaidAt
              });

              results.push({
                orderId: cleanOrderId || fallbackSpp.orderId || "-",
                transactionId: cleanTxId,
                studentName: targetStudent.name,
                studentNis: targetStudent.nis,
                studentClass: targetStudent.class,
                category: `SPP ${fallbackSpp.month} ${fallbackSpp.year}`,
                amount: fallbackSpp.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: resolvedPaidAt,
                reconciliationStatus: "reconciled",
                message: `BERHASIL DILUNASI! Dialokasikan ke tagihan SPP berjalan tertua: SPP ${fallbackSpp.month} ${fallbackSpp.year} a.n ${targetStudent.name}.`
              });
              continue;
            }
          }
        }

        // ----------------------------------------------------
        // 6. UNMATCHED / AMBIGUOUS SETTLEMENT -> SMART AUTO-ALLOCATION
        // ----------------------------------------------------
        if (targetStudent && amountVal > 0) {
          const alloc = autoAllocateStudentPayment(
            targetStudent,
            amountVal,
            cleanOrderId || `MT-${Date.now()}`,
            cleanTxId,
            actualPaymentType,
            resolvedPaidAt
          );

          reconciledCount++;
          totalAmountReconciled += amountVal;
          stateChanged = true;

          recordOrUpdateMidtransTransaction({
            orderId: cleanOrderId || `MT-${Date.now()}`,
            transactionId: cleanTxId,
            billType: alloc.paidSppCount > 0 ? "spp" : (alloc.paidMiscCount > 0 ? "misc" : "savings"),
            grossAmount: amountVal,
            studentName: targetStudent.name,
            studentNis: targetStudent.nis,
            description: alloc.category,
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });

          results.push({
            orderId: cleanOrderId || cleanTxId || `MID-${Date.now()}`,
            transactionId: cleanTxId,
            studentName: targetStudent.name,
            studentNis: targetStudent.nis,
            studentClass: targetStudent.class || "-",
            category: alloc.category,
            amount: amountVal,
            reportStatus: rawStatus,
            reportPaymentType: actualPaymentType,
            reportTime: resolvedPaidAt,
            reconciliationStatus: "reconciled",
            message: alloc.message
          });
          continue;
        }

        // Only true unmatched if no target student could be resolved:
        notFoundCount++;
        recordOrUpdateMidtransTransaction({
          orderId: cleanOrderId || `MT-${Date.now()}`,
          transactionId: cleanTxId,
          billType: "other",
          grossAmount: amountVal,
          studentName: targetStudent?.name || item.customerName || "Umum / Belum Teridentifikasi",
          studentNis: targetStudent?.nis || item.studentNis || "-",
          description: rawDesc || "Transaksi Midtrans Report (Tanpa Tagihan)",
          transactionStatus: "settlement",
          paymentType: actualPaymentType,
          settlementTime: resolvedPaidAt
        });

        results.push({
          orderId: cleanOrderId || cleanTxId || `MID-${Date.now()}`,
          transactionId: cleanTxId,
          studentName: targetStudent?.name || item.customerName || "Wali Siswa / Umum (NIS Belum Cocok)",
          studentNis: targetStudent?.nis || item.studentNis || "-",
          studentClass: targetStudent?.class || "-",
          category: rawDesc ? `Lainnya: ${rawDesc}` : "Transaksi Midtrans (Tanpa Tagihan Terkait)",
          amount: amountVal,
          reportStatus: rawStatus,
          reportPaymentType: actualPaymentType,
          reportTime,
          reconciliationStatus: "not_found",
          message: `Transaksi settlement valid sebesar Rp ${amountVal.toLocaleString("id-ID")}, namun tidak ada tagihan lokal yang cocok dengan NIS/Order ID ini.`
        });
      }

      if (stateChanged) {
        saveState();
        if (reconciledCount > 0) {
          broadcastNotification({
            id: `notif-rep-${Date.now()}`,
            title: "Rekonsiliasi File Report Selesai ✅",
            message: `Berhasil merekonsiliasi & melunasi ${reconciledCount} tagihan dengan total Rp ${totalAmountReconciled.toLocaleString("id-ID")}.`,
            type: "success",
            createdAt: new Date().toISOString()
          });
        }
      }

      return res.json({
        success: true,
        summary: {
          totalRows: parsedItems.length,
          reconciledCount,
          alreadyPaidCount,
          notFoundCount,
          pendingCount,
          failedCount,
          totalAmountReconciled
        },
        results
      });
    } catch (e) {
      const err = e as Error;
      console.error("Error processing bulk Midtrans report verification:", err);
      return res.status(500).json({ error: "Terjadi kesalahan internal saat memproses file report: " + err.message });
    }
  });

  // 18. Manual Reconcile Midtrans Endpoint (Admin Direct Pairing)
  router.post("/manual-reconcile-midtrans", async (req, res) => {
    try {
      const {
        orderId,
        transactionId,
        amount,
        studentId,
        studentNis,
        allocationType = "auto_spp", // 'auto_spp' | 'savings' | 'specific_bill' | 'treasurer_kas'
        specificBillId,
        specificBillType, // 'spp' | 'misc'
        paymentType = "Midtrans (Manual Reconciled)",
        settlementTime,
        notes
      } = req.body;

      const cleanOrderId = String(orderId || "").trim() || `MT-MANUAL-${Date.now()}`;
      const cleanTxId = transactionId ? String(transactionId).trim() : undefined;
      const amountVal = Number(amount) || 0;
      const resolvedPaidAt = parseMidtransTime(settlementTime || new Date().toISOString());

      let targetStudent = students.find(s => 
        (studentId && s.id === studentId) || 
        (studentNis && (String(s.nis).trim() === String(studentNis).trim() || s.id === `std-${studentNis}`))
      );

      if (!targetStudent && cleanOrderId) {
        const parts = cleanOrderId.split("-");
        for (const p of parts) {
          if (/^\d{3,12}$/.test(p)) {
            const matched = students.find(s => String(s.nis).trim() === p || s.id === `std-${p}`);
            if (matched) {
              targetStudent = matched;
              break;
            }
          }
        }
      }

      // Handle allocation based on type
      if (allocationType === "treasurer_kas" || (!targetStudent && allocationType !== "specific_bill")) {
        // Record directly into Kas BKU Bendahara (Kas Masuk)
        const newKas: TreasurerTransaction = {
          id: `trx-kas-${Date.now()}`,
          type: "incoming",
          category: notes || "Penerimaan Midtrans Online (Penyesuaian Manual)",
          amount: amountVal,
          description: `Rekonsiliasi Manual Order Midtrans: ${cleanOrderId} ${cleanTxId ? `(TxID: ${cleanTxId})` : ""}`,
          date: resolvedPaidAt.substring(0, 10),
          source: "custom",
          studentName: targetStudent?.name || "Wali Murid / Umum",
          studentId: targetStudent?.id,
          nis: targetStudent?.nis,
          createdBy: "Bendahara (Manual Reconcile)",
          paymentMethod: "bank",
          orderId: cleanOrderId,
          transactionId: cleanTxId
        };
        treasurerTransactions.unshift(newKas);

        recordOrUpdateMidtransTransaction({
          orderId: cleanOrderId,
          transactionId: cleanTxId,
          billType: "other",
          grossAmount: amountVal,
          studentName: targetStudent?.name,
          studentNis: targetStudent?.nis,
          description: newKas.description,
          transactionStatus: "settlement",
          paymentType,
          settlementTime: resolvedPaidAt
        });

        saveState();

        return res.json({
          success: true,
          message: `Transaksi Rp ${amountVal.toLocaleString("id-ID")} berhasil dicatat langsung ke Kas Umum (BKU) Bendahara.`,
          allocationType: "treasurer_kas"
        });
      }

      if (!targetStudent) {
        return res.status(400).json({ error: "Siswa penerima alokasi tidak ditemukan." });
      }

      if (allocationType === "savings") {
        // Force allocate 100% to student's savings account
        const newSavingsTx: SavingsTransaction = {
          id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId: targetStudent.id,
          studentNis: targetStudent.nis,
          type: "deposit",
          amount: amountVal,
          status: "success",
          createdAt: resolvedPaidAt,
          paymentMethod: paymentType,
          orderId: cleanOrderId,
          transactionId: cleanTxId,
          notes: notes || `Setoran Tabungan Manual Reconcile (${cleanOrderId})`
        };
        savingsTransactions.unshift(newSavingsTx);
        targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + amountVal;
        AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;

        recordOrUpdateMidtransTransaction({
          orderId: cleanOrderId,
          transactionId: cleanTxId,
          billType: "savings",
          grossAmount: amountVal,
          studentName: targetStudent.name,
          studentNis: targetStudent.nis,
          description: "Setoran Tabungan (Manual Reconcile)",
          transactionStatus: "settlement",
          paymentType,
          settlementTime: resolvedPaidAt
        });

        saveState();

        return res.json({
          success: true,
          message: `Berhasil menambahkan Rp ${amountVal.toLocaleString("id-ID")} ke Saldo Tabungan a.n ${targetStudent.name} (NIS: ${targetStudent.nis}).`,
          allocationType: "savings",
          newBalance: targetStudent.savingsBalance
        });
      }

      if (allocationType === "specific_bill" && specificBillId) {
        if (specificBillType === "spp") {
          const bill = sppBills.find(b => b.id === specificBillId);
          if (bill) {
            bill.status = "paid";
            bill.paidAt = resolvedPaidAt;
            bill.paymentMethod = paymentType;
            bill.orderId = cleanOrderId;
            if (cleanTxId) bill.transactionId = cleanTxId;

            recordOrUpdateMidtransTransaction({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              billType: "spp",
              grossAmount: bill.amount,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              description: `SPP ${bill.month} ${bill.year}`,
              transactionStatus: "settlement",
              paymentType,
              settlementTime: resolvedPaidAt
            });

            saveState();

            return res.json({
              success: true,
              message: `Tagihan SPP ${bill.month} ${bill.year} a.n ${targetStudent.name} berhasil dilunasi.`,
              allocationType: "specific_bill"
            });
          }
        } else {
          const mBill = miscBills.find(m => m.id === specificBillId);
          if (mBill) {
            mBill.status = "paid";
            mBill.paidAt = resolvedPaidAt;
            mBill.paymentMethod = paymentType;
            mBill.orderId = cleanOrderId;
            if (cleanTxId) mBill.transactionId = cleanTxId;

            recordOrUpdateMidtransTransaction({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              billType: "misc",
              grossAmount: mBill.amount,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              description: mBill.title,
              transactionStatus: "settlement",
              paymentType,
              settlementTime: resolvedPaidAt
            });

            saveState();

            return res.json({
              success: true,
              message: `Tagihan Non-SPP "${mBill.title}" a.n ${targetStudent.name} berhasil dilunasi.`,
              allocationType: "specific_bill"
            });
          }
        }
      }

      // Default: auto_spp (Smart Allocation)
      const allocResult = autoAllocateStudentPayment(
        targetStudent,
        amountVal,
        cleanOrderId,
        cleanTxId,
        paymentType,
        resolvedPaidAt,
        { notes }
      );

      recordOrUpdateMidtransTransaction({
        orderId: cleanOrderId,
        transactionId: cleanTxId,
        billType: allocResult.paidSppCount > 0 ? "spp" : (allocResult.paidMiscCount > 0 ? "misc" : "savings"),
        grossAmount: amountVal,
        studentName: targetStudent.name,
        studentNis: targetStudent.nis,
        description: allocResult.category,
        transactionStatus: "settlement",
        paymentType,
        settlementTime: resolvedPaidAt
      });

      saveState();

      return res.json({
        success: true,
        message: allocResult.message,
        allocationType: "auto_spp",
        allocResult
      });
    } catch (err: any) {
      console.error("Manual reconcile midtrans error:", err);
      res.status(500).json({ error: "Gagal merekonsiliasi manual: " + (err.message || String(err)) });
    }
  });

  // 19. Search Students with Unpaid Bills for Reconcile Pairing
  router.get("/search-student-for-reconcile", (req, res) => {
    const q = String(req.query.q || "").toLowerCase().trim();
    if (!q) {
      return res.json({ students: [] });
    }

    const matched = students
      .filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.nis && String(s.nis).includes(q)) || 
        (s.class && s.class.toLowerCase().includes(q))
      )
      .slice(0, 12)
      .map(s => {
        const studentUnpaidSpp = sppBills.filter(b => b.studentId === s.id && (b.status === "unpaid" || b.status === "pending"));
        const studentUnpaidMisc = miscBills.filter(m => m.studentId === s.id && (m.status === "unpaid" || m.status === "pending"));
        return {
          id: s.id,
          name: s.name,
          nis: s.nis,
          class: s.class,
          savingsBalance: Number(s.savingsBalance) || 0,
          unpaidSppCount: studentUnpaidSpp.length,
          unpaidSppTotal: studentUnpaidSpp.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
          unpaidSppBills: studentUnpaidSpp.map(b => ({ id: b.id, month: b.month, year: b.year, amount: b.amount })),
          unpaidMiscCount: studentUnpaidMisc.length,
          unpaidMiscTotal: studentUnpaidMisc.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
          unpaidMiscBills: studentUnpaidMisc.map(m => ({ id: m.id, title: m.title, amount: m.amount }))
        };
      });

    res.json({ students: matched });
  });

  return router;
}
