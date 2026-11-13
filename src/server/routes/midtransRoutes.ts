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
  SpmbCandidate,
  VoidedPaymentRecord
} from "../../types";
import { AUTHORITATIVE_SAVINGS_MAP } from "../../savings_map";
import { getConfigFromMysql } from "../mysqlService";

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
  voidedPayments?: VoidedPaymentRecord[];
  saveState: (skipRemoteSync?: boolean) => void;
  broadcastNotification: (notif: RealtimeNotification) => void;
  sendWhatsappNotification: (to: string, msg: string) => Promise<any>;
  saveConfigToMysql: (configId: string, data: any) => Promise<boolean>;
  persistEntity?: (type: string, data: any) => Promise<any>;
  persistEntities?: (type: string, items: any[]) => Promise<any>;
}

// ---------------- Helper Functions ----------------

export function formatMidtransPaymentMethod(raw?: string): string {
  if (!raw) return "Midtrans (QRIS)";
  let s = String(raw).trim();
  if (!s) return "Midtrans (QRIS)";
  
  // Recursively unwrap any duplicate or nested "Midtrans (...)", "Midtrans ...", etc.
  while (/^midtrans\s*\(?/i.test(s)) {
    s = s.replace(/^midtrans\s*\(?/i, "").replace(/\)$/, "").trim();
  }
  s = s.replace(/^\((.*)\)$/, "$1").trim();

  const lower = s.toLowerCase();
  if (!s || !lower) return "Midtrans (QRIS)";
  if (lower === "qris" || lower === "midtrans qris") return "Midtrans (QRIS)";
  if (lower === "gopay" || lower === "go-pay") return "Midtrans (GoPay)";
  if (lower === "shopeepay") return "Midtrans (ShopeePay)";
  if (lower === "bank_transfer") return "Midtrans (Bank Transfer)";
  if (lower.includes("bca")) return "Midtrans (BCA VA)";
  if (lower.includes("mandiri") || lower === "echannel") return "Midtrans (Mandiri VA)";
  if (lower.includes("bri")) return "Midtrans (BRI VA)";
  if (lower.includes("bni")) return "Midtrans (BNI VA)";
  if (lower.includes("permata")) return "Midtrans (Permata VA)";
  if (lower.includes("cimb")) return "Midtrans (CIMB VA)";
  if (lower === "credit_card") return "Midtrans (Kartu Kredit)";
  if (lower === "snap" || lower === "online") return "Midtrans (QRIS)";
  if (lower === "reconciled" || lower === "manual reconciled") return "Midtrans (Rekonsiliasi)";
  
  return `Midtrans (${s.toUpperCase()})`;
}

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

  // 0. Check YYYYMM or YYYY-MM or YYYY_MM format (e.g. 202410, 202607, 2025-11, 2026_08)
  const yyyyMmRegex = /(?:^|[-_ \/\.,])(20\d{2})[-_ \/\.]?(0[1-9]|1[0-2])(?:[-_ \/\.,]|$)/;
  const match0 = clean.match(yyyyMmRegex);
  if (match0) {
    const rawYear = parseInt(match0[1], 10);
    const num = match0[2];
    const numMap: { [k: string]: string } = {
      "01": "Januari", "02": "Februari", "03": "Maret", "04": "April", "05": "Mei", "06": "Juni",
      "07": "Juli", "08": "Agustus", "09": "September", "10": "Oktober", "11": "November", "12": "Desember"
    };
    const month = numMap[num];
    if (month) return { month, year: rawYear };
  }

  // 1. Check for full or short month name combined with 2 or 4 digit year (e.g. Agu26, Ags26, Agustus2026, Agu2026, Jul26, Juli2026, Sep26, Okt26, Nov26, Des26, Jan27, Feb27)
  const monthYearCombinedRegex = /(?:^|[-_ \/\.,])(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Ags|Aug|Agt|Sep|Sept|Okt|Oct|Nov|Des|Dec)[-_ \/\.]?(\d{2,4})(?:[-_ \/\.,]|$)/i;
  const match1 = clean.match(monthYearCombinedRegex);
  if (match1) {
    const rawMonth = match1[1].toLowerCase();
    const rawYear = match1[2];
    const month = MONTH_LOOKUP[rawMonth];
    let year: number | undefined = undefined;
    if (rawYear.length === 2) {
      year = 2000 + parseInt(rawYear, 10);
    } else if (rawYear.length === 4) {
      year = parseInt(rawYear, 10);
    }
    if (month) return { month, year };
  }

  // 2. Check full or short month name anywhere in string
  const monthNameRegex = /(?:^|[-_ \/\.,\b])(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|January|February|March|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Ags|Aug|Agt|Sep|Sept|Okt|Oct|Nov|Des|Dec)(?:[-_ \/\.,\b]|$)/i;
  const match2 = clean.match(monthNameRegex);
  let detectedMonth: string | undefined = undefined;
  if (match2) {
    detectedMonth = MONTH_LOOKUP[match2[1].toLowerCase()];
  }

  // Check 4-digit year (2020 - 2035) or 2-digit year preceded by keyword
  const yearMatch = clean.match(/\b(202[0-9]|203[0-9])\b/) || clean.match(/(?:tahun|thn|year|yr)[-_: ]*(\d{2,4})/i) || clean.match(/[-_](202\d|203\d)[-_]/);
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
  extraHints?: { description?: string; amount?: number; studentsList?: Student[] }
): MiscBill | undefined {
  if (!idOrOrderId && !extraHints?.description && !targetStudentId) return undefined;
  const cleanKey = (idOrOrderId || "").trim();

  // Guard: NEVER match as Non-SPP if the order is explicitly SPP, Savings, or SPMB
  if (isExplicitSpp(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitSavings(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitSpmb(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitCart(cleanKey, extraHints?.description)) return undefined;

  // 1. Direct exact match by orderId, id, or transactionId
  if (cleanKey) {
    const directMatch = miscBillsList.find(m =>
      !m.isVoidedByAdmin && (
        m.orderId === cleanKey ||
        m.id === cleanKey ||
        m.transactionId === cleanKey ||
        m.id === cleanKey + "-unpaid" ||
        m.id.replace("-unpaid", "") === cleanKey.replace("-unpaid", "")
      )
    );
    if (directMatch) return directMatch;
  }

  // 2. Direct match with trailing timestamp/random suffix stripped
  if (cleanKey) {
    const cleanWithoutSuffix = cleanKey.replace(/-\d{4,6}$/, "");
    const suffixMatch = miscBillsList.find(m =>
      !m.isVoidedByAdmin && (
        m.id === cleanWithoutSuffix ||
        m.id === cleanWithoutSuffix + "-unpaid" ||
        m.orderId === cleanWithoutSuffix
      )
    );
    if (suffixMatch) return suffixMatch;
  }

  // 3. Shortened ID prefix matching (e.g. M-1010-01 matching misc-bill-std-1010-01)
  if (cleanKey) {
    const withoutPrefix = cleanKey.replace(/^MISC-/, "").replace(/^M-/, "").replace(/^MB-/, "");
    const matchShort = miscBillsList.find(m =>
      !m.isVoidedByAdmin && (
        m.id.includes(withoutPrefix) ||
        (m.orderId && m.orderId.includes(withoutPrefix))
      )
    );
    if (matchShort) return matchShort;
  }

  // 4. Resolve effective student ID
  let effectiveStudentId = targetStudentId;
  const studentsList = extraHints?.studentsList || [];
  if (!effectiveStudentId && cleanKey) {
    const tokens = cleanKey.replace(/^MISC-/i, "").split(/[-_]/);
    for (const token of tokens) {
      const cleanToken = token.trim();
      if (/^\d{3,12}$/.test(cleanToken)) {
        const found = studentsList.find(s => String(s.nis).trim() === cleanToken || s.id === cleanToken || s.id === `std-${cleanToken}`);
        if (found) {
          effectiveStudentId = found.id;
          break;
        }
      } else if (cleanToken.startsWith("std-")) {
        const found = studentsList.find(s => s.id === cleanToken || s.id === `std-${cleanToken}`);
        if (found) {
          effectiveStudentId = found.id;
          break;
        }
      }
    }
  }

  // 5. Match by target student + title keywords in description
  if (effectiveStudentId) {
    const studentMiscBills = miscBillsList.filter(m => m.studentId === effectiveStudentId);
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

  // 6. Global title matching across all misc bills if description contains unique title
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
  extraHints?: { description?: string; month?: string; year?: number; amount?: number; miscBillsList?: MiscBill[]; studentsList?: Student[] }
): SppBill | undefined {
  if (!idOrOrderId && !extraHints?.description && !extraHints?.month) return undefined;
  const cleanKey = (idOrOrderId || "").trim();

  // Guard: NEVER match as SPP if the order or description is explicitly Non-SPP, Savings, SPMB, or Cart
  if (isExplicitNonSpp(cleanKey, extraHints?.description, extraHints?.miscBillsList)) return undefined;
  if (isExplicitSavings(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitSpmb(cleanKey, extraHints?.description)) return undefined;
  if (isExplicitCart(cleanKey, extraHints?.description)) return undefined;

  // 1. Direct exact match by orderId, id, or transactionId (case-insensitive)
  if (cleanKey) {
    const cleanLower = cleanKey.toLowerCase();
    const directMatch = sppBillsList.find(b => 
      (b.orderId && b.orderId.toLowerCase() === cleanLower) || 
      (b.id && b.id.toLowerCase() === cleanLower) || 
      (b.transactionId && b.transactionId.toLowerCase() === cleanLower) ||
      (b.id && b.id.toLowerCase() === cleanLower + "-unpaid") ||
      (b.id && b.id.toLowerCase().replace("-unpaid", "") === cleanLower.replace("-unpaid", ""))
    );
    if (directMatch) return directMatch;
  }

  // 2. Direct match by stripping trailing 4-digit timestamp or random suffix
  if (cleanKey) {
    const cleanWithoutSuffix = cleanKey.replace(/-\d{4,6}$/, "").toLowerCase();
    const suffixMatch = sppBillsList.find(b =>
      (b.id && b.id.toLowerCase() === cleanWithoutSuffix) ||
      (b.id && b.id.toLowerCase() === cleanWithoutSuffix + "-unpaid") ||
      (b.orderId && b.orderId.toLowerCase() === cleanWithoutSuffix)
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

  // 5. Student resolution: either provided or extracted from cleanKey
  let effectiveStudentId = targetStudentId;
  const studentsList = extraHints?.studentsList || [];

  if (!effectiveStudentId && cleanKey) {
    const tokens = cleanKey.replace(/^SPP-/i, "").split(/[-_]/);
    for (const token of tokens) {
      const cleanToken = token.trim().toLowerCase();
      if (cleanToken.length >= 2) {
        const found = studentsList.find(s => 
          String(s.nis).trim().toLowerCase() === cleanToken || 
          s.id.toLowerCase() === cleanToken || 
          s.id.toLowerCase() === `std-${cleanToken}`
        );
        if (found) {
          effectiveStudentId = found.id;
          break;
        }
      }
    }
    // Also check if whole cleanKey without SPP prefix is a student NIS
    if (!effectiveStudentId) {
      const core = cleanKey.replace(/^SPP-/i, "").trim().toLowerCase();
      const found = studentsList.find(s => 
        String(s.nis).trim().toLowerCase() === core || 
        s.id.toLowerCase() === core || 
        s.id.toLowerCase() === `std-${core}`
      );
      if (found) effectiveStudentId = found.id;
    }
  }

  // 6. Match by Target Student ID + Detected Month (+ Year)
  if (effectiveStudentId) {
    if (detectedMonth) {
      // If year is detected, first try matching exact month AND year
      if (detectedYear) {
        const exactYearMatch = sppBillsList.find(b => 
          b.studentId === effectiveStudentId && 
          b.month.toLowerCase() === detectedMonth!.toLowerCase() && 
          b.year === detectedYear
        );
        if (exactYearMatch) return exactYearMatch;
      }

      // Fallback match by exact month for this student (regardless of year)
      const monthMatch = sppBillsList.find(b => 
        b.studentId === effectiveStudentId && 
        b.month.toLowerCase() === detectedMonth!.toLowerCase()
      );
      if (monthMatch) return monthMatch;
    }

    // If cleanKey explicitly targets SPP (e.g. SPP-13011-...) but no month matched or month is not recognized,
    // match by amount if specified, or match the oldest unpaid / pending SPP bill for this student
    if (cleanKey.toUpperCase().startsWith("SPP-") || cleanKey.toUpperCase().includes("SPP") || (extraHints?.description && extraHints.description.toLowerCase().includes("spp"))) {
      const studentUnpaidBills = sppBillsList
        .filter(b => b.studentId === effectiveStudentId && (b.status === "pending" || b.status === "unpaid"))
        .sort((a, b) => {
          const yearDiff = (a.year || 2026) - (b.year || 2026);
          if (yearDiff !== 0) return yearDiff;
          const idxA = ACADEMIC_MONTHS.indexOf(a.month);
          const idxB = ACADEMIC_MONTHS.indexOf(b.month);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
      if (extraHints?.amount && extraHints.amount > 0) {
        const amountMatch = studentUnpaidBills.find(b => b.amount === extraHints.amount || b.amount === (extraHints.amount! - 4000));
        if (amountMatch) return amountMatch;
      }
      if (studentUnpaidBills.length > 0) return studentUnpaidBills[0];
    }
  }

  // 7. If cleanKey contains student NIS and month name/code, check legacy partial match
  if (cleanKey && cleanKey.startsWith("SPP-")) {
    const withoutPrefix = cleanKey.slice(4);
    const lastHyphen = withoutPrefix.lastIndexOf("-");
    const extractedBillId = lastHyphen === -1 ? withoutPrefix : withoutPrefix.slice(0, lastHyphen);
    
    let bill = sppBillsList.find(b => b.id === extractedBillId || b.id === `bill-std-${extractedBillId}`);
    if (bill) return bill;
  }

  // 8. Match by bill ID substring (e.g. bill-std-...)
  if (cleanKey.includes("bill-std-")) {
    const billMatch = sppBillsList.find(b => cleanKey.includes(b.id) || b.id.includes(cleanKey.replace(/-unpaid$/, "")));
    if (billMatch) return billMatch;
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

export function isBankTransferPaymentMethod(rawPaymentType?: string): boolean {
  if (!rawPaymentType) return false;
  const lower = String(rawPaymentType).toLowerCase();
  return (
    lower.includes("bank") ||
    lower.includes("va") ||
    lower.includes("virtual") ||
    lower.includes("echannel") ||
    lower.includes("mandiri") ||
    lower.includes("bca") ||
    lower.includes("bni") ||
    lower.includes("bri") ||
    lower.includes("permata") ||
    lower.includes("cimb") ||
    lower.includes("bsi") ||
    lower.includes("danamon") ||
    lower.includes("transfer")
  );
}

/**
 * Menghitung nominal bersih (pokok) setoran tabungan siswa agar biaya admin bank/Midtrans
 * (misal Rp 4.000, Rp 4.440, Rp 4.500, Rp 2.500, dll) TIDAK ikut masuk ke dalam saldo tabungan siswa.
 */
export function resolveNetSavingsDepositAmount(
  grossAmount: number,
  options?: {
    paymentType?: string;
    configuredAdminFee?: number;
    explicitAdminFee?: number;
    explicitAdminFeeProvided?: boolean;
    explicitNetAmount?: number;
    reportFee?: number;
    existingPrincipalAmount?: number;
  }
): { netAmount: number; adminFeeDeducted: number } {
  const gross = Math.max(0, Math.round(Number(grossAmount) || 0));
  if (gross <= 0) {
    return { netAmount: 0, adminFeeDeducted: 0 };
  }

  // 1. Jika Admin menentukan potongan biaya admin secara eksplisit di form Rekonsiliasi Manual
  if (
    options?.explicitAdminFeeProvided &&
    typeof options.explicitAdminFee === "number" &&
    !isNaN(options.explicitAdminFee) &&
    options.explicitAdminFee >= 0
  ) {
    const fee = Math.round(options.explicitAdminFee);
    if (fee > 0 && gross > fee) {
      return { netAmount: gross - fee, adminFeeDeducted: fee };
    }
    if (fee === 0) {
      return { netAmount: gross, adminFeeDeducted: 0 };
    }
  }

  // 2. Jika terdapat nominal bersih eksplisit dari report (dan kelipatan 5.000)
  if (
    typeof options?.explicitNetAmount === "number" &&
    !isNaN(options.explicitNetAmount) &&
    options.explicitNetAmount >= 10000 &&
    options.explicitNetAmount < gross &&
    gross - options.explicitNetAmount <= 15000 &&
    Math.round(options.explicitNetAmount) % 5000 === 0
  ) {
    const net = Math.round(options.explicitNetAmount);
    return { netAmount: net, adminFeeDeducted: gross - net };
  }

  // 3. Jika ada transaksi pending tabungan sebelumnya dengan nominal pokok bersih (kelipatan Rp 5.000)
  if (
    typeof options?.existingPrincipalAmount === "number" &&
    !isNaN(options.existingPrincipalAmount) &&
    options.existingPrincipalAmount >= 10000
  ) {
    const principal = Math.round(options.existingPrincipalAmount);
    if (principal % 5000 === 0 && gross >= principal && gross - principal <= 15000) {
      return { netAmount: principal, adminFeeDeducted: gross - principal };
    }
  }

  // 4. Jika kolom biaya admin di file CSV/Excel report tersedia
  if (
    typeof options?.reportFee === "number" &&
    !isNaN(options.reportFee) &&
    options.reportFee > 0 &&
    options.reportFee <= 15000
  ) {
    const fee = Math.round(options.reportFee);
    if (gross - fee >= 10000 && (gross - fee) % 5000 === 0) {
      return { netAmount: gross - fee, adminFeeDeducted: fee };
    }
  }

  // 5. Deteksi otomatis biaya admin bank (VA / Transfer Bank) pada gross_amount
  // Setor tabungan siswa minimal Rp 10.000 dan kelipatan Rp 5.000 / Rp 10.000.
  // Apabila terdapat tambahan biaya admin bank (misal Rp 4.000, Rp 4.440 PPN, Rp 4.400, Rp 4.500, Rp 2.500, Rp 3.000, Rp 3.500, Rp 5.500, Rp 6.500),
  // maka kelebihan biaya admin tersebut dipisahkan agar tidak masuk ke saldo tabungan siswa.
  if (gross > 10000) {
    const rem10k = gross % 10000;
    const rem5k = gross % 5000;

    if (rem10k > 5000 && rem10k <= 7500 && gross - rem10k >= 10000) {
      return { netAmount: gross - rem10k, adminFeeDeducted: rem10k };
    }

    if (rem5k > 0 && gross - rem5k >= 10000) {
      return { netAmount: gross - rem5k, adminFeeDeducted: rem5k };
    }

    const configuredFee = Math.round(Number(options?.configuredAdminFee) || 0);
    if (
      rem10k === 5000 &&
      isBankTransferPaymentMethod(options?.paymentType) &&
      configuredFee === 5000 &&
      gross - 5000 >= 10000
    ) {
      return { netAmount: gross - 5000, adminFeeDeducted: 5000 };
    }
  }

  return { netAmount: gross, adminFeeDeducted: 0 };
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
    voidedPayments = [],
    saveState,
    broadcastNotification,
    sendWhatsappNotification,
    saveConfigToMysql,
    persistEntity,
    persistEntities
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
      if (persistEntity) {
        persistEntity("midtrans", existing).catch(() => {});
      }
    } else {
      const newRecord: MidtransTransactionRecord = {
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
      };
      midtransTransactions.unshift(newRecord);
      if (persistEntity) {
        persistEntity("midtrans", newRecord).catch(() => {});
      }
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
    const serverKey = (midtransConfig.serverKey || process.env.MIDTRANS_SERVER_KEY || "").trim();
    if (!serverKey || !orderId) return null;
    const cleanId = String(orderId).trim().replace(/^#+/, "").replace(/^["']|["']$/g, "").trim();
    if (!cleanId) return null;
    const authHeader = Buffer.from(`${serverKey}:`).toString("base64");
    
    const primaryUrl = midtransConfig.isProduction
      ? `https://api.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`
      : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`;
    const fallbackUrl = midtransConfig.isProduction
      ? `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`
      : `https://api.midtrans.com/v2/${encodeURIComponent(cleanId)}/status`;

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

  // Strict Allocation Engine: Allocates payment strictly according to the designated bill.
  // No cross-allocation / spillover of excess funds to unrelated bills (SPP pays SPP only, Non-SPP pays Non-SPP only).
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
      preferredMonth?: string;
      preferredYear?: number;
      description?: string;
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
    affectedSppBills: SppBill[];
    affectedMiscBills: MiscBill[];
    affectedSavingsTxs: SavingsTransaction[];
  } {
    let remainingAmount = amountVal;
    let paidSppCount = 0;
    let paidMiscCount = 0;
    let savingsDeposited = 0;
    const itemsDetail: string[] = [];
    const affectedSppBills: SppBill[] = [];
    const affectedMiscBills: MiscBill[] = [];
    const affectedSavingsTxs: SavingsTransaction[] = [];

    // Guard 1: If this orderId or transactionId has already paid bills for this student, DO NOT divert to other bills!
    const cleanOrdLower = (orderId || "").trim().toLowerCase();
    const cleanTxLower = (transactionId || "").trim().toLowerCase();
    const alreadyPaidSppForThisOrder = sppBills.filter(
      b => (b.studentId === targetStudent.id || (targetStudent.nis && b.studentId === targetStudent.nis) || (targetStudent.nis && b.studentId === `std-${targetStudent.nis}`)) &&
           b.status === "paid" &&
           ((cleanOrdLower && b.orderId && b.orderId.toLowerCase() === cleanOrdLower) ||
            (cleanTxLower && b.transactionId && b.transactionId.toLowerCase() === cleanTxLower))
    );
    if (alreadyPaidSppForThisOrder.length > 0) {
      return {
        reconciled: false,
        amountReconciled: 0,
        paidSppCount: 0,
        paidMiscCount: 0,
        savingsDeposited: 0,
        category: alreadyPaidSppForThisOrder.map(b => `SPP ${b.month} ${b.year}`).join(", "),
        itemsDetail: alreadyPaidSppForThisOrder.map(b => `SPP ${b.month} ${b.year} (Sudah Lunas)`),
        message: `Tagihan (${alreadyPaidSppForThisOrder.map(b => b.month + ' ' + b.year).join(', ')}) sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan berikutnya.`,
        affectedSppBills: [],
        affectedMiscBills: [],
        affectedSavingsTxs: []
      };
    }

    // Guard 2: Check if the order/notes/description contains a specific month that is ALREADY paid for this student
    const extractedMonth = extractMonthAndYear(`${orderId} ${options?.notes || ""} ${options?.description || ""} ${options?.preferredMonth || ""}`);
    let targetMonthName = options?.preferredMonth || extractedMonth.month;
    let targetYearNum = options?.preferredYear || extractedMonth.year;

    // If month not specified in text, check timestamp in orderId or paidAt
    if (!targetMonthName) {
      let candidateTimestamp: number | undefined;
      const trailingNumberMatch = orderId.match(/-(\d{10,13})$/);
      if (trailingNumberMatch) {
        const num = Number(trailingNumberMatch[1]);
        if (!isNaN(num) && num > 1600000000000 && num < 2500000000000) {
          candidateTimestamp = num;
        }
      }
      if (!candidateTimestamp && paidAt) {
        const parsedTime = Date.parse(paidAt);
        if (!isNaN(parsedTime)) candidateTimestamp = parsedTime;
      }

      if (candidateTimestamp) {
        const dateObj = new Date(candidateTimestamp);
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const txMonthName = monthNames[dateObj.getMonth()];
        const txYearNum = dateObj.getFullYear();

        const studentBills = sppBills.filter(
          b => (b.studentId === targetStudent.id || (targetStudent.nis && b.studentId === targetStudent.nis) || (targetStudent.nis && b.studentId === `std-${targetStudent.nis}`))
        );
        const thisMonthBill = studentBills.find(
          b => b.month.toLowerCase() === txMonthName.toLowerCase() && b.year === txYearNum
        );

        if (thisMonthBill) {
          // If the bill for the transaction month is ALREADY PAID, do NOT divert to next months!
          if (thisMonthBill.status === "paid") {
            return {
              reconciled: false,
              amountReconciled: 0,
              paidSppCount: 0,
              paidMiscCount: 0,
              savingsDeposited: 0,
              category: `SPP ${thisMonthBill.month} ${thisMonthBill.year}`,
              itemsDetail: [`SPP ${thisMonthBill.month} ${thisMonthBill.year} (Sudah Lunas)`],
              message: `Tagihan SPP ${thisMonthBill.month} ${thisMonthBill.year} sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan berikutnya.`,
              affectedSppBills: [],
              affectedMiscBills: [],
              affectedSavingsTxs: []
            };
          } else {
            // Target THIS exact month bill
            targetMonthName = thisMonthBill.month;
            targetYearNum = thisMonthBill.year;
          }
        }
      }
    }

    if (targetMonthName) {
      const targetMonthBill = sppBills.find(
        b => (b.studentId === targetStudent.id || (targetStudent.nis && b.studentId === targetStudent.nis) || (targetStudent.nis && b.studentId === `std-${targetStudent.nis}`)) &&
             b.month.toLowerCase() === targetMonthName!.toLowerCase() &&
             (!targetYearNum || b.year === targetYearNum)
      );

      // If the targeted month is ALREADY PAID, do NOT divert to other months!
      if (targetMonthBill && targetMonthBill.status === "paid") {
        return {
          reconciled: false,
          amountReconciled: 0,
          paidSppCount: 0,
          paidMiscCount: 0,
          savingsDeposited: 0,
          category: `SPP ${targetMonthBill.month} ${targetMonthBill.year}`,
          itemsDetail: [`SPP ${targetMonthBill.month} ${targetMonthBill.year} (Sudah Lunas)`],
          message: `Tagihan SPP ${targetMonthBill.month} ${targetMonthBill.year} sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan berikutnya.`,
          affectedSppBills: [],
          affectedMiscBills: [],
          affectedSavingsTxs: []
        };
      }

      // If the targeted month exists and is unpaid, prioritize paying THIS exact month!
      if (targetMonthBill && (targetMonthBill.status === "unpaid" || targetMonthBill.status === "pending") && remainingAmount >= targetMonthBill.amount) {
        targetMonthBill.status = "paid";
        targetMonthBill.paidAt = paidAt;
        targetMonthBill.paymentMethod = paymentType;
        targetMonthBill.orderId = orderId;
        if (transactionId) targetMonthBill.transactionId = transactionId;
        targetMonthBill.isVoidedByAdmin = false;
        delete targetMonthBill.voidedAt;
        delete targetMonthBill.voidReason;

        // Clean up voided registry for this bill so background sync never reverts it
        const vpIdx = voidedPayments.findIndex(v => v.billId === targetMonthBill.id);
        if (vpIdx !== -1) {
          voidedPayments.splice(vpIdx, 1);
        }

        remainingAmount -= targetMonthBill.amount;
        paidSppCount++;
        itemsDetail.push(`SPP ${targetMonthBill.month} ${targetMonthBill.year}`);
        affectedSppBills.push(targetMonthBill);

        // DO NOT divert remaining amount to next months if a specific month was explicitly targeted!
        const categoryName = `SPP ${targetMonthBill.month} ${targetMonthBill.year}`;
        return {
          reconciled: true,
          amountReconciled: targetMonthBill.amount,
          paidSppCount: 1,
          paidMiscCount: 0,
          savingsDeposited: 0,
          category: categoryName,
          itemsDetail,
          message: `BERHASIL DILUNASI! Tagihan SPP ${targetMonthBill.month} ${targetMonthBill.year} a.n ${targetStudent.name} berhasil dilunasi.`,
          affectedSppBills,
          affectedMiscBills,
          affectedSavingsTxs
        };
      }
    }

    const isExplicitMisc = options?.preferredCategory === "misc" || 
      orderId.toUpperCase().startsWith("MISC-") || 
      orderId.toUpperCase().startsWith("NONSPP-") || 
      orderId.toUpperCase().startsWith("LAIN-");

    const isExplicitSavOrder = options?.preferredCategory === "savings" || 
      isExplicitSavings(orderId, `${options?.description || ""} ${options?.notes || ""}`) ||
      savingsTransactions.some(t => (orderId && t.orderId === orderId) || (transactionId && t.transactionId === transactionId));

    // 1. Non-SPP (Misc) Allocation
    if (isExplicitMisc) {
      const unpaidMisc = miscBills.filter(
        m => (m.studentId === targetStudent.id || (targetStudent.nis && m.studentId === targetStudent.nis) || (targetStudent.nis && m.studentId === `std-${targetStudent.nis}`)) && (m.status === "unpaid" || m.status === "pending")
      );
      const exactMisc = unpaidMisc.find(m => m.amount === amountVal) || unpaidMisc[0];
      if (exactMisc && remainingAmount >= exactMisc.amount) {
        exactMisc.status = "paid";
        exactMisc.paidAt = paidAt;
        exactMisc.paymentMethod = paymentType;
        exactMisc.orderId = orderId;
        if (transactionId) exactMisc.transactionId = transactionId;
        exactMisc.isVoidedByAdmin = false;
        delete exactMisc.voidedAt;
        delete exactMisc.voidReason;

        remainingAmount -= exactMisc.amount;
        paidMiscCount++;
        itemsDetail.push(`Non-SPP: ${exactMisc.title}`);
        affectedMiscBills.push(exactMisc);
      }
    }
    // 2. Savings Explicit Allocation (Pastikan Biaya Admin Bank tidak ikut masuk ke saldo tabungan siswa)
    else if (isExplicitSavOrder) {
      const existingSavTx = savingsTransactions.find(
        t => (orderId && t.orderId === orderId) || (transactionId && t.transactionId === transactionId)
      );
      const { netAmount: netSavingsAmt, adminFeeDeducted } = resolveNetSavingsDepositAmount(amountVal, {
        paymentType,
        configuredAdminFee: midtransConfig.adminFee,
        existingPrincipalAmount: existingSavTx?.amount
      });

      if (existingSavTx && existingSavTx.status !== "success") {
        existingSavTx.amount = netSavingsAmt;
        existingSavTx.status = "success";
        existingSavTx.paymentMethod = paymentType;
        existingSavTx.orderId = orderId;
        if (transactionId) existingSavTx.transactionId = transactionId;
        if (adminFeeDeducted > 0 && (!existingSavTx.notes || !existingSavTx.notes.includes("Biaya Admin"))) {
          existingSavTx.notes = `${existingSavTx.notes || `Setoran Tabungan Midtrans (${orderId})`} [Pokok: Rp ${netSavingsAmt.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`;
        }
        targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + netSavingsAmt;
        AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;
        savingsDeposited = netSavingsAmt;
        remainingAmount = 0;
        itemsDetail.push(`Saldo Tabungan (Rp ${netSavingsAmt.toLocaleString("id-ID")})`);
        affectedSavingsTxs.push(existingSavTx);
      } else {
        const newSavingsTx: SavingsTransaction = {
          id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId: targetStudent.id,
          studentNis: targetStudent.nis,
          type: "deposit",
          amount: netSavingsAmt,
          status: "success",
          createdAt: paidAt,
          paymentMethod: paymentType,
          orderId: orderId,
          transactionId: transactionId,
          notes: adminFeeDeducted > 0
            ? `${options?.notes || `Setoran Tabungan Midtrans (${orderId})`} [Pokok: Rp ${netSavingsAmt.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`
            : (options?.notes || `Setoran Tabungan Midtrans (${orderId})`)
        };
        savingsTransactions.unshift(newSavingsTx);
        targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + netSavingsAmt;
        AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;
        savingsDeposited = netSavingsAmt;
        remainingAmount = 0;
        itemsDetail.push(`Saldo Tabungan (Rp ${netSavingsAmt.toLocaleString("id-ID")})`);
        affectedSavingsTxs.push(newSavingsTx);
      }
    }
    // 3. SPP Allocation: Chronological across unpaid SPP bills
    else {
      const unpaidSpp = sppBills
        .filter(b => (b.studentId === targetStudent.id || (targetStudent.nis && b.studentId === targetStudent.nis) || (targetStudent.nis && b.studentId === `std-${targetStudent.nis}`)) && (b.status === "unpaid" || b.status === "pending"))
        .sort((a, b) => {
          const yearDiff = (a.year || 2026) - (b.year || 2026);
          if (yearDiff !== 0) return yearDiff;
          const idxA = ACADEMIC_MONTHS.indexOf(a.month);
          const idxB = ACADEMIC_MONTHS.indexOf(b.month);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

      // Check if student has no unpaid SPP but has an exact matching Non-SPP bill
      const unpaidMisc = miscBills.filter(
        m => (m.studentId === targetStudent.id || (targetStudent.nis && m.studentId === targetStudent.nis) || (targetStudent.nis && m.studentId === `std-${targetStudent.nis}`)) && (m.status === "unpaid" || m.status === "pending")
      );
      const exactMisc = unpaidMisc.find(m => m.amount === amountVal);

      if (unpaidSpp.length === 0 && exactMisc) {
        exactMisc.status = "paid";
        exactMisc.paidAt = paidAt;
        exactMisc.paymentMethod = paymentType;
        exactMisc.orderId = orderId;
        if (transactionId) exactMisc.transactionId = transactionId;
        exactMisc.isVoidedByAdmin = false;
        delete exactMisc.voidedAt;
        delete exactMisc.voidReason;

        remainingAmount -= exactMisc.amount;
        paidMiscCount++;
        itemsDetail.push(`Non-SPP: ${exactMisc.title}`);
        affectedMiscBills.push(exactMisc);
      } else {
        // Pay unpaid SPP bills that fit the exact bill amounts
        for (const b of unpaidSpp) {
          if (remainingAmount >= b.amount && b.amount > 0) {
            b.status = "paid";
            b.paidAt = paidAt;
            b.paymentMethod = paymentType;
            b.orderId = orderId;
            if (transactionId) b.transactionId = transactionId;
            b.isVoidedByAdmin = false;
            delete b.voidedAt;
            delete b.voidReason;

            // Clean up voided registry for this bill so background sync never reverts it
            const vpIdx = voidedPayments.findIndex(v => v.billId === b.id);
            if (vpIdx !== -1) {
              voidedPayments.splice(vpIdx, 1);
            }

            remainingAmount -= b.amount;
            paidSppCount++;
            itemsDetail.push(`SPP ${b.month} ${b.year}`);
            affectedSppBills.push(b);
          }
        }
      }
    }

    const isActuallyReconciled = paidSppCount > 0 || paidMiscCount > 0 || savingsDeposited > 0;

    const categoryName = itemsDetail.length > 0
      ? (paidSppCount > 0 && paidMiscCount === 0 && savingsDeposited === 0 
          ? (paidSppCount === 1 ? itemsDetail[0] : `SPP (${paidSppCount} Bulan)`)
          : (paidMiscCount > 0 && paidSppCount === 0 && savingsDeposited === 0
              ? itemsDetail[0]
              : (savingsDeposited > 0 && paidSppCount === 0 && paidMiscCount === 0
                  ? "Setoran Tabungan Siswa"
                  : `Paket Pembayaran (${itemsDetail.length} Item)`)))
      : "Pembayaran Midtrans Terverifikasi";

    const amountReconciled = amountVal - remainingAmount;

    return {
      reconciled: isActuallyReconciled,
      amountReconciled: amountReconciled > 0 ? amountReconciled : amountVal,
      paidSppCount,
      paidMiscCount,
      savingsDeposited,
      category: categoryName,
      itemsDetail,
      message: isActuallyReconciled
        ? `BERHASIL DILUNASI! Pembayaran sesuai tagihan: ${itemsDetail.join(" + ")} a.n ${targetStudent.name} (${targetStudent.class || targetStudent.nis}).`
        : `Tagihan untuk siswa ${targetStudent.name} sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan berikutnya.`,
      affectedSppBills,
      affectedMiscBills,
      affectedSavingsTxs
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
      const existingRecord = midtransTransactions.find(t => t.orderId === cleanOrderId || (t.transactionId && t.transactionId === cleanOrderId));
      if (existingRecord && (existingRecord.transactionStatus === "settlement" || existingRecord.transactionStatus === "capture")) {
        statusData = {
          order_id: existingRecord.orderId,
          transaction_id: existingRecord.transactionId || cleanOrderId,
          transaction_status: existingRecord.transactionStatus,
          payment_type: existingRecord.paymentType || "Midtrans Snap",
          settlement_time: existingRecord.settlementTime || existingRecord.updatedAt || new Date().toISOString(),
          gross_amount: existingRecord.grossAmount
        };
      } else {
        return { status: "not_found", actionTaken: false, detailMessage: `Order ID ${cleanOrderId} tidak ditemukan di Gateway Midtrans`, midtransStatus: null };
      }
    }

    const ts = statusData.transaction_status || "";
    const isSettled = ts === "settlement" || ts === "capture";
    const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";
    const paymentType = statusData.payment_type || "Online Gateway";
    const actualPaymentType = formatMidtransPaymentMethod(paymentType);
    const midtransTime = statusData.settlement_time || statusData.transaction_time || "";
    const resolvedPaidAt = parseMidtransTime(midtransTime);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanOrderId);
    const targetOrderId = (isUuid && statusData.order_id) ? statusData.order_id : (statusData.order_id || cleanOrderId);
    const targetTransactionId = statusData.transaction_id || (isUuid ? cleanOrderId : "");
    const upperTargetOrderId = targetOrderId.toUpperCase();
    const upperCleanOrderId = cleanOrderId.toUpperCase();

    let actionTaken = false;
    let detailMessage = "";

    // 1. SPP BILLS
    if (upperTargetOrderId.startsWith("SPP-") || upperCleanOrderId.startsWith("SPP-")) {
      const activeOrderId = upperTargetOrderId.startsWith("SPP-") ? targetOrderId : cleanOrderId;
      const bill = findSppBillMatching(activeOrderId, sppBills, undefined, { studentsList: students, miscBillsList: miscBills }) || 
                   findSppBillMatching(cleanOrderId, sppBills, undefined, { studentsList: students, miscBillsList: miscBills });
      if (bill) {
        if (bill.isVoidedByAdmin || voidedPayments.some(v => v.billId === bill.id || (bill.orderId && v.orderId === bill.orderId))) {
          return { status: "settled", actionTaken: false, detailMessage: `Tagihan SPP ${bill.month} ${bill.year} telah dibatalkan / dikoreksi oleh Admin dan tidak boleh diubah otomatis menjadi Lunas.`, midtransStatus: statusData };
        }
        if (isSettled) {
          if (bill.status !== "paid") {
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

            // Automatically record in Kas BKU Bendahara if not already recorded
            const existingKas = treasurerTransactions.find(t => (t.orderId && t.orderId === targetOrderId) || (targetTransactionId && t.transactionId === targetTransactionId));
            if (!existingKas) {
              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: "incoming",
                category: `SPP ${bill.month} ${bill.year}`,
                amount: Number(bill.amount) || 0,
                description: `Pembayaran Online Midtrans: SPP ${bill.month} ${bill.year} (${student?.name || "Siswa"}) [Order: ${targetOrderId}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "spp",
                studentName: student?.name,
                studentId: student?.id,
                nis: student?.nis,
                createdBy: "Midtrans Gateway (Online)",
                paymentMethod: "bank",
                orderId: targetOrderId,
                transactionId: targetTransactionId,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              if (persistEntity) {
                await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting SPP Kas:", err));
              }
            }

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

            if (persistEntity) {
              await persistEntity("sppBills", bill).catch(err => console.error("Error persisting settled SPP to MySQL:", err));
            }

            detailMessage = `Tagihan SPP ${bill.month} ${bill.year} (${student?.name || "Siswa"}) berhasil di-settle LUNAS.`;
          } else {
            actionTaken = true;
            const student = students.find(s => s.id === bill.studentId);
            detailMessage = `Tagihan SPP ${bill.month} ${bill.year} (${student?.name || "Siswa"}) sudah berstatus LUNAS.`;
          }
        } else if (isExpired && bill.status === "pending") {
          bill.status = "unpaid";
          bill.orderId = undefined;
          actionTaken = true;
          if (persistEntity) {
            await persistEntity("sppBills", bill).catch(err => console.error("Error persisting reset SPP to MySQL:", err));
          }
          detailMessage = `Tagihan SPP ${bill.month} ${bill.year} direset menjadi belum bayar karena expired/cancel.`;
        }
      }
    }

    // 2. MISC BILLS
    else if (upperTargetOrderId.startsWith("MISC-") || upperCleanOrderId.startsWith("MISC-")) {
      const activeOrderId = upperTargetOrderId.startsWith("MISC-") ? targetOrderId : cleanOrderId;
      const bill = findMiscBillMatching(activeOrderId, miscBills, undefined, { studentsList: students }) ||
                   findMiscBillMatching(cleanOrderId, miscBills, undefined, { studentsList: students }) ||
                   miscBills.find(m => m.orderId === activeOrderId || m.orderId === cleanOrderId || m.id === cleanOrderId);
      if (bill) {
        if (bill.isVoidedByAdmin || voidedPayments.some(v => v.billId === bill.id || (bill.orderId && v.orderId === bill.orderId))) {
          return { status: "settled", actionTaken: false, detailMessage: `Tagihan Non-SPP "${bill.title}" telah dibatalkan / dikoreksi oleh Admin dan tidak boleh diubah otomatis menjadi Lunas.`, midtransStatus: statusData };
        }
        if (isSettled) {
          if (bill.status !== "paid") {
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

            // Record in Kas BKU Bendahara if not already recorded
            const existingKas = treasurerTransactions.find(t => (t.orderId && t.orderId === targetOrderId) || (targetTransactionId && t.transactionId === targetTransactionId));
            if (!existingKas) {
              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: "incoming",
                category: bill.title || "Tagihan Non-SPP",
                amount: Number(bill.amount) || 0,
                description: `Pembayaran Online Midtrans: ${bill.title} (${student?.name || "Siswa"}) [Order: ${targetOrderId}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "custom",
                studentName: student?.name,
                studentId: student?.id,
                nis: student?.nis,
                createdBy: "Midtrans Gateway (Online)",
                paymentMethod: "bank",
                orderId: targetOrderId,
                transactionId: targetTransactionId,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              if (persistEntity) {
                await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting Misc Kas:", err));
              }
            }

            if (persistEntity) {
              await persistEntity("miscBills", bill).catch(err => console.error("Error persisting settled Misc to MySQL:", err));
            }

            detailMessage = `Tagihan Non-SPP "${bill.title}" berhasil di-settle LUNAS.`;
          } else {
            actionTaken = true;
            detailMessage = `Tagihan Non-SPP "${bill.title}" sudah berstatus LUNAS.`;
          }
        } else if (isExpired && bill.status === "pending") {
          bill.status = "unpaid";
          bill.orderId = undefined;
          actionTaken = true;
          if (persistEntity) {
            await persistEntity("miscBills", bill).catch(err => console.error("Error persisting reset Misc to MySQL:", err));
          }
          detailMessage = `Tagihan Non-SPP "${bill.title}" direset menjadi belum bayar karena expired.`;
        }
      }
    }

    // 3. SAVINGS DEPOSITS
    else if (upperTargetOrderId.startsWith("SAV-") || upperCleanOrderId.startsWith("SAV-")) {
      const activeOrderId = upperTargetOrderId.startsWith("SAV-") ? targetOrderId : cleanOrderId;
      const trans = savingsTransactions.find(t => t.orderId === activeOrderId || t.orderId === cleanOrderId || t.id === cleanOrderId);
      if (trans) {
        if (trans.isVoidedByAdmin || voidedPayments.some(v => v.billId === trans.id || (trans.orderId && v.orderId === trans.orderId))) {
          return { status: "settled", actionTaken: false, detailMessage: `Transaksi setoran tabungan ini telah dibatalkan / dikoreksi oleh Admin dan tidak boleh dipulihkan otomatis.`, midtransStatus: statusData };
        }
        if (isSettled && trans.status !== "success") {
          const { netAmount: cleanSavAmount } = resolveNetSavingsDepositAmount(Number(trans.amount) || 0, {
            paymentType: actualPaymentType,
            configuredAdminFee: midtransConfig.adminFee
          });
          trans.amount = cleanSavAmount;
          trans.status = "success";
          trans.paymentMethod = actualPaymentType;
          if (targetTransactionId) trans.transactionId = targetTransactionId;
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

          if (persistEntity) {
            await persistEntity("savingsTransactions", trans).catch(err => console.error("Error persisting settled Savings tx to MySQL:", err));
            if (student) {
              await persistEntity("students", student).catch(err => console.error("Error persisting student savings balance to MySQL:", err));
            }
          }

          detailMessage = `Setoran tabungan sebesar Rp ${trans.amount.toLocaleString("id-ID")} berhasil masuk ke saldo siswa.`;
        } else if (isExpired && trans.status === "pending") {
          trans.status = "failed";
          actionTaken = true;
          if (persistEntity) {
            await persistEntity("savingsTransactions", trans).catch(err => console.error("Error persisting expired Savings tx to MySQL:", err));
          }
          detailMessage = `Setoran tabungan dibatalkan karena expired.`;
        }
      }
    }

    // 4. MULTI-BILL CART
    else if (upperTargetOrderId.startsWith("CART-") || upperCleanOrderId.startsWith("CART-") || upperTargetOrderId.startsWith("COLLECTIVE-CART-") || upperCleanOrderId.startsWith("COLLECTIVE-CART-")) {
      const activeOrderId = (upperTargetOrderId.startsWith("CART-") || upperTargetOrderId.startsWith("COLLECTIVE-CART-")) ? targetOrderId : cleanOrderId;
      const matchedSpp = sppBills.filter(b => (b.orderId === activeOrderId || b.orderId === cleanOrderId));
      const matchedMisc = miscBills.filter(m => (m.orderId === activeOrderId || m.orderId === cleanOrderId));
      const matchedSavings = savingsTransactions.filter(t => (t.orderId === activeOrderId || t.orderId === cleanOrderId));

      if (matchedSpp.length > 0 || matchedMisc.length > 0 || matchedSavings.length > 0) {
        if (isSettled) {
          const hadUnpaidSpp = matchedSpp.some(b => b.status !== "paid");
          const hadUnpaidMisc = matchedMisc.some(m => m.status !== "paid");
          const hadUnpaidSavings = matchedSavings.some(t => t.status !== "success");
          const anyItemUpdated = hadUnpaidSpp || hadUnpaidMisc || hadUnpaidSavings;

          actionTaken = true;

          matchedSpp.forEach(b => {
            if (b.status !== "paid") {
              b.status = "paid";
              b.paidAt = resolvedPaidAt;
              b.paymentMethod = actualPaymentType;
              if (targetTransactionId) b.transactionId = targetTransactionId;
              b.isVoidedByAdmin = false;
              delete b.voidedAt;
              delete b.voidReason;
            }
          });
          matchedMisc.forEach(m => {
            if (m.status !== "paid") {
              m.status = "paid";
              m.paidAt = resolvedPaidAt;
              m.paymentMethod = actualPaymentType;
              if (targetTransactionId) m.transactionId = targetTransactionId;
              m.isVoidedByAdmin = false;
              delete m.voidedAt;
              delete m.voidReason;
            }
          });
          matchedSavings.forEach(t => {
            if (t.status !== "success") {
              const { netAmount: cleanSavAmount } = resolveNetSavingsDepositAmount(Number(t.amount) || 0, {
                paymentType: actualPaymentType,
                configuredAdminFee: midtransConfig.adminFee
              });
              t.amount = cleanSavAmount;
              t.status = "success";
              t.paymentMethod = actualPaymentType;
              if (targetTransactionId) t.transactionId = targetTransactionId;
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

          if (!anyItemUpdated) {
            detailMessage = `Paket tagihan keranjang (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) a.n ${student?.name || "Siswa"} sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan/tagihan lain.`;
          } else {
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

            if (persistEntities) {
              if (matchedSpp.length > 0) await persistEntities("sppBills", matchedSpp).catch(err => console.error("Error persisting cart SPP to MySQL:", err));
              if (matchedMisc.length > 0) await persistEntities("miscBills", matchedMisc).catch(err => console.error("Error persisting cart Misc to MySQL:", err));
              if (matchedSavings.length > 0) await persistEntities("savingsTransactions", matchedSavings).catch(err => console.error("Error persisting cart Savings to MySQL:", err));
            }
            if (persistEntity && student) {
              await persistEntity("students", student).catch(err => console.error("Error persisting cart student balance to MySQL:", err));
            }

            detailMessage = `Keranjang pembayaran (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) berhasil di-settle LUNAS.`;
          }
        } else if (isExpired) {
          matchedSpp.forEach(b => { if (b.status === "pending") { b.status = "unpaid"; b.orderId = undefined; actionTaken = true; } });
          matchedMisc.forEach(m => { if (m.status === "pending") { m.status = "unpaid"; m.orderId = undefined; actionTaken = true; } });
          matchedSavings.forEach(t => { if (t.status === "pending") { t.status = "failed"; actionTaken = true; } });
          if (persistEntities) {
            if (matchedSpp.length > 0) await persistEntities("sppBills", matchedSpp).catch(err => console.error("Error persisting expired cart SPP to MySQL:", err));
            if (matchedMisc.length > 0) await persistEntities("miscBills", matchedMisc).catch(err => console.error("Error persisting expired cart Misc to MySQL:", err));
            if (matchedSavings.length > 0) await persistEntities("savingsTransactions", matchedSavings).catch(err => console.error("Error persisting expired cart Savings to MySQL:", err));
          }
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
          // Check if this student already had bills paid with this orderId or transactionId
          const alreadyPaidCartBills = sppBills.filter(b => 
            (b.studentId === targetStudent!.id || (targetStudent!.nis && b.studentId === targetStudent!.nis) || (targetStudent!.nis && b.studentId === `std-${targetStudent!.nis}`)) &&
            b.status === "paid" &&
            ((activeOrderId && b.orderId && b.orderId.toLowerCase() === activeOrderId.toLowerCase()) ||
             (targetTransactionId && b.transactionId && b.transactionId.toLowerCase() === targetTransactionId.toLowerCase()))
          );
          if (alreadyPaidCartBills.length > 0) {
            actionTaken = true;
            detailMessage = `Tagihan (${alreadyPaidCartBills.map(b => `SPP ${b.month} ${b.year}`).join(", ")}) a.n ${targetStudent.name} sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan berikutnya.`;
          } else {
            const grossAmt = statusData.gross_amount ? Number(statusData.gross_amount) : 0;
            const extractedM = extractMonthAndYear(`${activeOrderId}`);
            const alloc = autoAllocateStudentPayment(targetStudent, grossAmt, activeOrderId, targetTransactionId, actualPaymentType, resolvedPaidAt, {
              preferredMonth: extractedM.month,
              preferredYear: extractedM.year
            });
            if (alloc.reconciled) {
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

              // Record in Kas BKU Bendahara if not already recorded
              const existingKas = treasurerTransactions.find(t => (t.orderId && t.orderId === activeOrderId) || (targetTransactionId && t.transactionId === targetTransactionId));
              if (!existingKas && grossAmt > 0) {
                const newKas: TreasurerTransaction = {
                  id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: "incoming",
                  category: alloc.category,
                  amount: grossAmt,
                  description: `Pembayaran Online Midtrans: ${alloc.category} (${targetStudent.name}) [Order: ${activeOrderId}]`,
                  date: resolvedPaidAt.substring(0, 10),
                  source: alloc.paidSppCount > 0 ? "spp" : (alloc.paidMiscCount > 0 ? "custom" : "savings"),
                  studentName: targetStudent.name,
                  studentId: targetStudent.id,
                  nis: targetStudent.nis,
                  createdBy: "Midtrans Gateway (Online)",
                  paymentMethod: "bank",
                  orderId: activeOrderId,
                  transactionId: targetTransactionId,
                  fundingSource: "Kas Bank/Midtrans"
                };
                treasurerTransactions.unshift(newKas);
                if (persistEntity) {
                  await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting cart Kas:", err));
                }
              }

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

              if (persistEntities) {
                if (alloc.affectedSppBills.length > 0) {
                  await persistEntities("sppBills", alloc.affectedSppBills).catch(err => console.error("Error persisting cart SPP to MySQL:", err));
                }
                if (alloc.affectedMiscBills.length > 0) {
                  await persistEntities("miscBills", alloc.affectedMiscBills).catch(err => console.error("Error persisting cart Misc to MySQL:", err));
                }
                if (alloc.affectedSavingsTxs.length > 0) {
                  await persistEntities("savingsTransactions", alloc.affectedSavingsTxs).catch(err => console.error("Error persisting cart Savings to MySQL:", err));
                }
              }
              if (persistEntity && targetStudent) {
                await persistEntity("students", targetStudent).catch(err => console.error("Error persisting cart student balance to MySQL:", err));
              }

              detailMessage = alloc.message;
            } else {
              actionTaken = true;
              detailMessage = alloc.message || `Tagihan untuk siswa ${targetStudent.name} sebelumnya sudah berstatus LUNAS. Pembayaran tidak dialihkan ke bulan berikutnya.`;
            }
          }
        }
      }
    }

    // 5. SPMB TRANSACTIONS (TOKEN & DAFTAR ULANG)
    else if (upperTargetOrderId.startsWith("SPMB-") || upperCleanOrderId.startsWith("SPMB-")) {
      const activeOrderId = upperTargetOrderId.startsWith("SPMB-") ? targetOrderId : cleanOrderId;
      const isToken = activeOrderId.toUpperCase().startsWith("SPMB-TOKEN-");
      const isRereg = activeOrderId.toUpperCase().startsWith("SPMB-REREG-");

      const candidate = spmbCandidates.find(c => 
        c.tokenPaymentOrderId === activeOrderId || 
        c.reRegistrationOrderId === activeOrderId ||
        c.tokenPaymentOrderId === cleanOrderId ||
        c.reRegistrationOrderId === cleanOrderId
      );

      if (candidate) {
        if (isToken) {
          if (isSettled) {
            candidate.tokenPaid = true;
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
          } else if (ts === "pending") {
            candidate.tokenPaid = false;
            candidate.tokenPaymentStatus = "pending";
            if (statusData.expiry_time) candidate.tokenExpiryTime = statusData.expiry_time;
            if (statusData.va_numbers) candidate.tokenVaNumbers = statusData.va_numbers;
            if (statusData.payment_type) candidate.tokenPaymentType = statusData.payment_type;
            actionTaken = true;
            detailMessage = `Pembayaran token SPMB a.n ${candidate.fullName} masih berstatus PENDING di Midtrans (Batas waktu: ${statusData.expiry_time || '24 jam'}).`;
          } else if (isExpired) {
            candidate.tokenSnapExpired = true;
            candidate.tokenPaymentStatus = "pending";
            candidate.snapExpiredAt = new Date().toISOString();

            const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const y = threeDaysLater.getFullYear();
            const mo = String(threeDaysLater.getMonth() + 1).padStart(2, '0');
            const da = String(threeDaysLater.getDate()).padStart(2, '0');
            const ho = String(threeDaysLater.getHours()).padStart(2, '0');
            const mi = String(threeDaysLater.getMinutes()).padStart(2, '0');
            const se = String(threeDaysLater.getSeconds()).padStart(2, '0');
            const expiryStr = `${y}-${mo}-${da} ${ho}:${mi}:${se}`;

            if (!candidate.tokenExpiryTime || new Date(candidate.tokenExpiryTime.replace(" ", "T")).getTime() < threeDaysLater.getTime()) {
              candidate.tokenExpiryTime = expiryStr;
            }
            candidate.cashPaymentDeadline = candidate.tokenExpiryTime;
            candidate.updatedAt = new Date().toISOString();
            saveState();
            try {
              const { directSaveEntityToMysql } = require("../mysqlService");
              directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
            } catch (_) {}
            actionTaken = true;
            detailMessage = `Pembayaran token SPMB a.n ${candidate.fullName} telah expired di Midtrans. Masa tenggang diperpanjang 3 hari untuk opsi Bayar Tunai di Sekolah (s.d. ${candidate.tokenExpiryTime} WIB).`;
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
        if (actionTaken && persistEntity) {
          persistEntity("spmbCandidates", candidate).catch(err => console.error("Error persisting SPMB candidate to MySQL:", err));
        }
      }
    }

    // 6. UNIVERSAL FALLBACK FOR ARBITRARY ORDER IDS (Manual Verifications, Simulators, Reconciliations)
    if (!actionTaken && isSettled) {
      // A. Direct check across SPP
      let fallbackBill = findSppBillMatching(targetOrderId, sppBills, undefined, { studentsList: students, miscBillsList: miscBills }) ||
                         findSppBillMatching(cleanOrderId, sppBills, undefined, { studentsList: students, miscBillsList: miscBills }) ||
                         (targetTransactionId ? sppBills.find(b => b.transactionId === targetTransactionId) : undefined);

      if (fallbackBill) {
        if (fallbackBill.status !== "paid") {
          fallbackBill.status = "paid";
          fallbackBill.paidAt = resolvedPaidAt;
          fallbackBill.paymentMethod = actualPaymentType;
          fallbackBill.orderId = targetOrderId;
          if (targetTransactionId) fallbackBill.transactionId = targetTransactionId;
          actionTaken = true;

          const student = students.find(s => s.id === fallbackBill.studentId);
          recordOrUpdateMidtransTransaction({
            orderId: targetOrderId,
            transactionId: targetTransactionId,
            billType: "spp",
            grossAmount: fallbackBill.amount,
            studentName: student?.name,
            studentNis: student?.nis,
            description: `SPP ${fallbackBill.month} ${fallbackBill.year}`,
            transactionStatus: "settlement",
            paymentType: actualPaymentType,
            settlementTime: resolvedPaidAt
          });

          if (persistEntity) {
            persistEntity("sppBills", fallbackBill).catch(err => console.error("Error persisting settled fallback SPP:", err));
          }

          const existingKas = treasurerTransactions.find(t => (t.orderId && t.orderId === targetOrderId) || (targetTransactionId && t.transactionId === targetTransactionId));
          if (!existingKas) {
            const newKas: TreasurerTransaction = {
              id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: "incoming",
              category: `SPP ${fallbackBill.month} ${fallbackBill.year}`,
              amount: Number(fallbackBill.amount) || 0,
              description: `Pembayaran Online Midtrans: SPP ${fallbackBill.month} ${fallbackBill.year} (${student?.name || "Siswa"}) [Order: ${targetOrderId}]`,
              date: resolvedPaidAt.substring(0, 10),
              source: "spp",
              studentName: student?.name,
              studentId: student?.id,
              nis: student?.nis,
              createdBy: "Midtrans Gateway (Online)",
              paymentMethod: "bank",
              orderId: targetOrderId,
              transactionId: targetTransactionId,
              fundingSource: "Kas Bank/Midtrans"
            };
            treasurerTransactions.unshift(newKas);
            if (persistEntity) {
              persistEntity("treasurerTransactions", newKas).catch(() => {});
            }
          }
          detailMessage = `Tagihan SPP ${fallbackBill.month} ${fallbackBill.year} (${student?.name || "Siswa"}) berhasil di-settle LUNAS.`;
        } else {
          actionTaken = true;
          const student = students.find(s => s.id === fallbackBill.studentId);
          detailMessage = `Tagihan SPP ${fallbackBill.month} ${fallbackBill.year} (${student?.name || "Siswa"}) sudah berstatus LUNAS.`;
        }
      }

      // B. Direct check across Non-SPP (Misc)
      if (!actionTaken) {
        let fallbackMisc = findMiscBillMatching(targetOrderId, miscBills, undefined, { studentsList: students }) ||
                           findMiscBillMatching(cleanOrderId, miscBills, undefined, { studentsList: students }) ||
                           (targetTransactionId ? miscBills.find(b => b.transactionId === targetTransactionId) : undefined);

        if (fallbackMisc) {
          if (fallbackMisc.status !== "paid") {
            fallbackMisc.status = "paid";
            fallbackMisc.paidAt = resolvedPaidAt;
            fallbackMisc.paymentMethod = actualPaymentType;
            fallbackMisc.orderId = targetOrderId;
            if (targetTransactionId) fallbackMisc.transactionId = targetTransactionId;
            actionTaken = true;

            const student = students.find(s => s.id === fallbackMisc.studentId);
            recordOrUpdateMidtransTransaction({
              orderId: targetOrderId,
              transactionId: targetTransactionId,
              billType: "misc",
              grossAmount: fallbackMisc.amount,
              studentName: student?.name,
              studentNis: student?.nis,
              description: fallbackMisc.title,
              transactionStatus: "settlement",
              paymentType: actualPaymentType,
              settlementTime: resolvedPaidAt
            });

            if (persistEntity) {
              persistEntity("miscBills", fallbackMisc).catch(err => console.error("Error persisting settled fallback Misc:", err));
            }
            detailMessage = `Tagihan Non-SPP "${fallbackMisc.title}" berhasil di-settle LUNAS.`;
          } else {
            actionTaken = true;
            detailMessage = `Tagihan Non-SPP "${fallbackMisc.title}" sudah berstatus LUNAS.`;
          }
        }
      }

      // C. Fallback: Identify student from customer details or Order ID tokens and auto-allocate
      if (!actionTaken) {
        let targetStudent: Student | undefined;
        const custEmail = statusData.customer_details?.email || "";
        const custName = statusData.customer_details?.first_name || "";
        const custPhone = statusData.customer_details?.phone || "";

        if (custPhone) {
          const cleanPhone = custPhone.replace(/\D/g, "");
          if (cleanPhone.length >= 8) {
            targetStudent = students.find(s => s.phone && s.phone.replace(/\D/g, "").includes(cleanPhone));
          }
        }
        if (!targetStudent && custEmail && custEmail.includes("@")) {
          targetStudent = students.find(s => s.email && s.email.toLowerCase().trim() === custEmail.toLowerCase().trim());
        }
        if (!targetStudent && custName && custName.length >= 3) {
          targetStudent = students.find(s => s.name.toLowerCase().trim() === custName.toLowerCase().trim());
        }

        if (!targetStudent) {
          const tokens = (targetOrderId + " " + cleanOrderId).split(/[-_\s]/);
          for (const token of tokens) {
            const cleanT = token.trim();
            if (/^\d{3,12}$/.test(cleanT)) {
              const matched = students.find(s => String(s.nis).trim() === cleanT || s.id === cleanT || s.id === `std-${cleanT}`);
              if (matched) {
                targetStudent = matched;
                break;
              }
            }
          }
        }

        if (targetStudent) {
          const grossAmt = statusData.gross_amount ? Number(statusData.gross_amount) : 0;
          const alloc = autoAllocateStudentPayment(targetStudent, grossAmt, targetOrderId, targetTransactionId, actualPaymentType, resolvedPaidAt);
          if (alloc.reconciled) {
            actionTaken = true;
            detailMessage = alloc.message;

            const existingKas = treasurerTransactions.find(t => (t.orderId && t.orderId === targetOrderId) || (targetTransactionId && t.transactionId === targetTransactionId));
            if (!existingKas && grossAmt > 0) {
              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: "incoming",
                category: alloc.category,
                amount: grossAmt,
                description: `Pembayaran Online Midtrans: ${alloc.category} (${targetStudent.name}) [Order: ${targetOrderId}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: alloc.paidSppCount > 0 ? "spp" : (alloc.paidMiscCount > 0 ? "custom" : "savings"),
                studentName: targetStudent.name,
                studentId: targetStudent.id,
                nis: targetStudent.nis,
                createdBy: "Midtrans Gateway (Online)",
                paymentMethod: "bank",
                orderId: targetOrderId,
                transactionId: targetTransactionId,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              if (persistEntity) {
                await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting fallback Kas to MySQL:", err));
              }
            }

            if (persistEntities) {
              if (alloc.affectedSppBills.length > 0) {
                await persistEntities("sppBills", alloc.affectedSppBills).catch(err => console.error("Error persisting fallback SPP to MySQL:", err));
              }
              if (alloc.affectedMiscBills.length > 0) {
                await persistEntities("miscBills", alloc.affectedMiscBills).catch(err => console.error("Error persisting fallback Misc to MySQL:", err));
              }
              if (alloc.affectedSavingsTxs.length > 0) {
                await persistEntities("savingsTransactions", alloc.affectedSavingsTxs).catch(err => console.error("Error persisting fallback Savings to MySQL:", err));
              }
            }
            if (persistEntity) {
              await persistEntity("students", targetStudent).catch(err => console.error("Error persisting fallback student balance to MySQL:", err));
            }
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
    return {
      scannedCount: 0,
      reconciledCount: 0,
      expiredCount: 0,
      details: ["Rekonsiliasi otomatis Midtrans dinonaktifkan sesuai kebijakan Admin. Seluruh rekonsiliasi dilakukan secara manual."],
      totalAutoReconciledLifetime: midtransAutoPollerStats.totalAutoReconciledLifetime
    };
  }

  // =========================================================================
  // API ROUTE DEFINITIONS
  // =========================================================================

  // 1. Get Midtrans visual details (safely masks server key)
  router.get("/midtrans-config", async (req, res) => {
    try {
      const mysqlCfg = await getConfigFromMysql("midtransConfig");
      if (mysqlCfg && typeof mysqlCfg === "object") {
        Object.assign(midtransConfig, mysqlCfg);
      }
    } catch (_) {}
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
      res.json({
        success: true,
        message: "Rekonsiliasi otomatis Midtrans dinonaktifkan sesuai kebijakan Admin. Seluruh penyelarasan pembayaran dilakukan secara manual melalui modul Rekonsiliasi Manual.",
        scannedCount: 0,
        reconciledCount: 0,
        expiredCount: 0
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
      res.json({
        success: true,
        scannedCount: 0,
        reconciledCount: 0,
        expiredCount: 0,
        message: "Rekonsiliasi otomatis Midtrans dinonaktifkan. Seluruh rekonsiliasi dilakukan secara manual melalui modul Rekonsiliasi Manual / Pembayaran."
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // 9. Verify pending orders for a specific student or system-wide
  interface StudentRetryState {
    studentId: string;
    currentOrderId?: string;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt: string;
    pendingOrderIds: string[];
    resolvedOrderIds: string[];
    isExhausted: boolean;
    status: "idle" | "retrying" | "settled" | "pending";
    lastMessage: string;
  }

  const studentRetryMap = new Map<string, StudentRetryState>();

  function getStudentPendingMidtransOrders(studentId: string, specificOrderId?: string): string[] {
    const orderIds = new Set<string>();
    if (specificOrderId && typeof specificOrderId === "string" && specificOrderId.trim()) {
      orderIds.add(specificOrderId.trim());
    }

    sppBills.filter(b => b.studentId === studentId && (b.status === "pending" || b.status === "unpaid") && b.orderId)
      .forEach(b => orderIds.add(b.orderId!));

    miscBills.filter(b => b.studentId === studentId && b.status !== "paid" && b.orderId)
      .forEach(b => orderIds.add(b.orderId!));

    savingsTransactions.filter(t => t.studentId === studentId && t.status === "pending" && t.orderId)
      .forEach(t => orderIds.add(t.orderId!));

    return Array.from(orderIds);
  }

  async function executeStudentAutoReconcileRetry(studentId: string, specificOrderId?: string) {
    const pendingOrders = getStudentPendingMidtransOrders(studentId, specificOrderId);

    let state = studentRetryMap.get(studentId);
    if (!state || (specificOrderId && state.currentOrderId && specificOrderId !== state.currentOrderId)) {
      state = {
        studentId,
        currentOrderId: specificOrderId,
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: new Date().toISOString(),
        pendingOrderIds: pendingOrders,
        resolvedOrderIds: [],
        isExhausted: false,
        status: "idle",
        lastMessage: ""
      };
      studentRetryMap.set(studentId, state);
    }

    if (pendingOrders.length === 0) {
      state.status = "settled";
      state.pendingOrderIds = [];
      state.lastMessage = "Semua tagihan dan setoran tabungan siswa telah lunas / masuk saldo.";
      return {
        success: true,
        reconciled: true,
        attempt: state.attempts,
        maxAttempts: 3,
        resolvedCount: state.resolvedOrderIds.length,
        newlyResolvedCount: 0,
        pendingOrders: [],
        resolvedOrders: state.resolvedOrderIds,
        isExhausted: state.isExhausted,
        message: state.lastMessage
      };
    }

    // STRICT 3x POLICY:
    // Jika jatah 3x percobaan rekonsiliasi habis maka tidak ada percobaan lagi.
    // Percobaan berikutnya baru aktif jika ada transaksi baru.
    if (state.attempts >= 3 || state.isExhausted) {
      state.isExhausted = true;
      state.status = "pending";
      state.lastMessage = "Jatah 3x percobaan rekonsiliasi habis. Percobaan selanjutnya pada transaksi berikutnya.";
      return {
        success: true,
        reconciled: false,
        attempt: state.attempts,
        maxAttempts: 3,
        resolvedCount: state.resolvedOrderIds.length,
        newlyResolvedCount: 0,
        pendingOrders,
        resolvedOrders: state.resolvedOrderIds,
        isExhausted: true,
        message: state.lastMessage
      };
    }

    state.attempts += 1;
    state.lastAttemptAt = new Date().toISOString();
    state.status = "retrying";

    let newlyResolvedCount = 0;
    for (const ordId of pendingOrders) {
      try {
        const result = await processMidtransOrderStatus(ordId);
        if (result.actionTaken || result.status === "settled") {
          newlyResolvedCount++;
          if (!state.resolvedOrderIds.includes(ordId)) {
            state.resolvedOrderIds.push(ordId);
          }
        }
      } catch (err) {
        console.error(`[Auto-Reconcile Order ${ordId}]:`, err);
      }
    }

    const remainingPending = getStudentPendingMidtransOrders(studentId);
    state.pendingOrderIds = remainingPending;

    if (remainingPending.length === 0) {
      state.status = "settled";
      state.isExhausted = false;
      state.lastMessage = `Rekonsiliasi otomatis latar belakang berhasil pada percobaan ke-${state.attempts}/3. Transaksi lunas / saldo masuk.`;
      saveState();

      broadcastNotification({
        id: `auto-recon-${Date.now()}`,
        title: "Pembayaran Terverifikasi Lunas ✅",
        message: `Status transaksi Midtrans siswa berhasil diverifikasi otomatis di latar belakang.`,
        type: "success",
        createdAt: new Date().toISOString()
      });
    } else if (state.attempts >= 3) {
      state.status = "pending";
      state.isExhausted = true;
      state.lastMessage = `Jatah 3x percobaan rekonsiliasi otomatis habis. Percobaan selanjutnya pada transaksi berikutnya.`;
    } else {
      state.status = "retrying";
      state.isExhausted = false;
      state.lastMessage = `Percobaan rekonsiliasi latar belakang ke-${state.attempts} dari 3 telah dijalankan.`;
    }

    studentRetryMap.set(studentId, state);

    return {
      success: true,
      reconciled: remainingPending.length === 0,
      attempt: state.attempts,
      maxAttempts: 3,
      resolvedCount: state.resolvedOrderIds.length,
      newlyResolvedCount,
      pendingOrders: remainingPending,
      resolvedOrders: state.resolvedOrderIds,
      isExhausted: state.isExhausted,
      message: state.lastMessage
    };
  }

  function scheduleStudentAutoReconcileQueue(studentId: string, orderId: string) {
    if (!studentId || !orderId) return;

    // Reset attempt counter ONLY upon creating a new transaction (orderId)
    studentRetryMap.set(studentId, {
      studentId,
      currentOrderId: orderId,
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: new Date().toISOString(),
      pendingOrderIds: [orderId],
      resolvedOrderIds: [],
      isExhausted: false,
      status: "retrying",
      lastMessage: `Memulai rekonsiliasi otomatis latar belakang untuk order ${orderId}...`
    });

    // Attempt 1: ~4s
    setTimeout(async () => {
      try {
        const st = studentRetryMap.get(studentId);
        if (st && !st.isExhausted && st.currentOrderId === orderId && st.attempts < 1) {
          await executeStudentAutoReconcileRetry(studentId, orderId);
        }
      } catch (e) {
        console.error(`[STUDENT AUTO-RETRY BACKGROUND] Error Percobaan 1 ${studentId}:`, e);
      }
    }, 4000);

    // Attempt 2: ~12s
    setTimeout(async () => {
      try {
        const st = studentRetryMap.get(studentId);
        if (st && !st.isExhausted && st.currentOrderId === orderId && st.attempts < 2) {
          await executeStudentAutoReconcileRetry(studentId, orderId);
        }
      } catch (e) {
        console.error(`[STUDENT AUTO-RETRY BACKGROUND] Error Percobaan 2 ${studentId}:`, e);
      }
    }, 12000);

    // Attempt 3: ~24s
    setTimeout(async () => {
      try {
        const st = studentRetryMap.get(studentId);
        if (st && !st.isExhausted && st.currentOrderId === orderId && st.attempts < 3) {
          await executeStudentAutoReconcileRetry(studentId, orderId);
        }
      } catch (e) {
        console.error(`[STUDENT AUTO-RETRY BACKGROUND] Error Percobaan 3 ${studentId}:`, e);
      }
    }, 24000);
  }

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

  // Dedicated Student Automatic Reconcile Retry Endpoint (Strict 3x background retry policy)
  router.post("/student/auto-reconcile-retry", async (req, res) => {
    try {
      const { studentId, orderId } = req.body;
      if (!studentId) {
        return res.status(400).json({ error: "studentId is required" });
      }

      const result = await executeStudentAutoReconcileRetry(studentId, orderId);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // Get current student reconciliation status (internal status)
  router.get("/student/reconciliation-status/:studentId", (req, res) => {
    try {
      const { studentId } = req.params;
      const pendingOrders = getStudentPendingMidtransOrders(studentId);
      const state = studentRetryMap.get(studentId);

      res.json({
        success: true,
        studentId,
        hasPending: pendingOrders.length > 0,
        pendingOrders,
        attempt: state?.attempts || 0,
        maxAttempts: 3,
        isExhausted: state?.isExhausted || false,
        status: pendingOrders.length === 0 ? "settled" : (state?.status || "pending"),
        lastAttemptAt: state?.lastAttemptAt || null,
        lastMessage: state?.lastMessage || (pendingOrders.length === 0 ? "Tidak ada transaksi pending" : "Menunggu verifikasi")
      });
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
    scheduleStudentAutoReconcileQueue(student.id, orderId);

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
    const createdCartSavings: SavingsTransaction[] = [];
    selectedSavings.forEach(s => {
      const trans: SavingsTransaction = {
        id: `sav-cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: s.studentId || student!.id,
        studentNis: student!.nis,
        type: "deposit",
        amount: s.amount,
        status: "pending",
        createdAt: new Date().toISOString(),
        orderId
      };
      savingsTransactions.unshift(trans);
      createdCartSavings.push(trans);
    });

    saveState();
    if (persistEntities) {
      if (selectedSpp.length > 0) persistEntities("sppBills", selectedSpp).catch(() => {});
      if (selectedMisc.length > 0) persistEntities("miscBills", selectedMisc).catch(() => {});
      if (createdCartSavings.length > 0) persistEntities("savingsTransactions", createdCartSavings).catch(() => {});
    }
    if (student && student.id) {
      scheduleStudentAutoReconcileQueue(student.id, orderId);
    }

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
    scheduleStudentAutoReconcileQueue(student.id, orderId);

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
      studentNis: student.nis,
      type: "deposit",
      amount: valAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
      orderId
    };
    savingsTransactions.unshift(trans);
    saveState();
    if (persistEntity) {
      persistEntity("savingsTransactions", trans).catch(() => {});
    }
    scheduleStudentAutoReconcileQueue(studentId, orderId);

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

  // 13b. Cancel Online Savings Deposit (Batalkan Setoran Tabungan Online yang masih Pending)
  router.post(["/cancel-savings-deposit", "/student/cancel-savings-deposit"], async (req, res) => {
    try {
      const { transactionId, orderId, studentId } = req.body;
      if (!transactionId && !orderId) {
        return res.status(400).json({ error: "ID Transaksi atau Order ID harus disertakan untuk membatalkan transaksi." });
      }

      // Find the savings transaction
      const transIndex = savingsTransactions.findIndex(t => 
        (transactionId && t.id === transactionId) ||
        (orderId && t.orderId === orderId)
      );

      if (transIndex === -1) {
        return res.status(404).json({ error: "Transaksi setoran tabungan tidak ditemukan." });
      }

      const tx = savingsTransactions[transIndex];

      if (tx.status === "success") {
        return res.status(400).json({ error: "Transaksi tabungan yang telah berhasil/lunas tidak dapat dibatalkan melalui fitur ini." });
      }

      // Mark status as failed / cancelled
      tx.status = "failed";
      tx.isVoidedByAdmin = true;
      tx.voidedAt = new Date().toISOString();
      tx.voidReason = "Dibatalkan oleh Pengguna / Admin";
      tx.notes = tx.notes ? `${tx.notes.replace(/\s*\(Dibatalkan\)/g, '')} (Dibatalkan)` : "Setoran Tabungan Online (Dibatalkan)";

      // Also update record in midtransTransactions if tracked
      const activeOrderId = tx.orderId || orderId;
      if (activeOrderId) {
        const mtTx = midtransTransactions.find(m => m.orderId === activeOrderId);
        if (mtTx && (mtTx.transactionStatus === "pending" || !mtTx.transactionStatus)) {
          mtTx.transactionStatus = "cancel";
          (mtTx as any).isVoidedByAdmin = true;
          mtTx.description = `${(mtTx.description || 'Setoran Tabungan').replace(/\s*\(Dibatalkan\)/g, '')} (Dibatalkan)`;
        }
      }

      if (voidedPayments) {
        const voidRecord: VoidedPaymentRecord = {
          id: `void-sav-${Date.now()}-${tx.id.slice(-6)}`,
          billId: tx.id,
          orderId: activeOrderId || undefined,
          studentId: tx.studentId,
          billType: "savings",
          period: "Setoran Tabungan Online",
          amount: tx.amount,
          voidReason: "Dibatalkan oleh Pengguna / Admin",
          voidedAt: new Date().toISOString()
        };
        voidedPayments.unshift(voidRecord);
        if (persistEntity) persistEntity("voidedPayments", voidRecord).catch(() => {});
      }

      if (persistEntity) {
        persistEntity("savingsTransactions", tx).catch(() => {});
      }

      saveState();

      return res.json({
        success: true,
        message: "Setoran tabungan online berhasil dibatalkan.",
        transactionId: tx.id,
        orderId: tx.orderId,
        status: "failed"
      });
    } catch (err: any) {
      console.error("Cancel savings deposit error:", err);
      return res.status(500).json({ error: err?.message || "Gagal membatalkan transaksi setoran tabungan." });
    }
  });

  // 14. Simulate payment success (Sandbox / Local Dev Testing)
  router.post("/simulate-payment-success", async (req, res) => {
    const { orderId, paymentType, transactionId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Order ID is required." });
    const cleanOrderId = String(orderId).trim().replace(/^#+/, "").replace(/^["']|["']$/g, "").trim();

    let midtransStatus: any = null;
    try {
      midtransStatus = await getMidtransStatus(cleanOrderId);
    } catch (e) {}

    const realOrderId = midtransStatus?.order_id || cleanOrderId;
    const realTxId = transactionId || midtransStatus?.transaction_id || `sim-${Date.now()}`;
    const actualPaymentType = formatMidtransPaymentMethod(paymentType || midtransStatus?.payment_type);

    // In production mode, NEVER allow simulation to mark bills settled if transaction doesn't exist in Midtrans
    if (midtransConfig?.isProduction) {
      if (!midtransStatus || midtransStatus.status_code === '404' || !midtransStatus.transaction_status) {
        return res.status(400).json({
          error: `Mode produksi aktif: Order ${cleanOrderId} tidak ditemukan di Gateway Midtrans dan tidak boleh disimulasikan lunas tanpa konfirmasi pembayaran riil dari wali murid.`
        });
      }
      if (midtransStatus.transaction_status !== 'settlement' && midtransStatus.transaction_status !== 'capture') {
        return res.status(400).json({
          error: `Status transaksi ${cleanOrderId} di Midtrans adalah ${midtransStatus.transaction_status || 'PENDING'} (belum diselesaikan oleh wali murid).`
        });
      }
    }

    // Jika ada status riil dari gateway Midtrans, gunakan status sebenarnya (jangan paksa settlement jika pending/expired)
    const effectiveStatus = (midtransStatus && midtransStatus.transaction_status)
      ? String(midtransStatus.transaction_status).toLowerCase()
      : "settlement";

    try {
      const reconResult = await processMidtransOrderStatus(realOrderId, {
        order_id: realOrderId,
        transaction_status: effectiveStatus,
        payment_type: actualPaymentType,
        settlement_time: new Date().toISOString(),
        transaction_id: realTxId,
        gross_amount: midtransStatus?.gross_amount,
        expiry_time: midtransStatus?.expiry_time,
        va_numbers: midtransStatus?.va_numbers
      });

      if (!reconResult.actionTaken) {
        return res.status(400).json({
          error: reconResult.detailMessage || `Transaksi ${realOrderId} tidak dapat dicocokkan otomatis ke tagihan internal sekolah.`,
          reconResult
        });
      }

      res.json({
        success: true,
        message: reconResult.detailMessage || "Pembayaran berhasil diproses sesuai status Midtrans.",
        reconResult
      });
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
      // 1. Catat di riwayat transaksi Midtrans
      recordOrUpdateMidtransTransaction({
        orderId: order_id,
        transactionId: transaction_id,
        billType: String(order_id).startsWith("SPMB-") ? "spmb_token" : "other",
        grossAmount: Number(gross_amount) || 0,
        transactionStatus: transaction_status,
        paymentType: formatMidtransPaymentMethod(payment_type),
        settlementTime: webhookData.settlement_time || webhookData.transaction_time || new Date().toISOString(),
        description: `Callback Midtrans [${order_id}] - Status: ${transaction_status}`
      });

      // 2. Jika transaksi SPMB Token, sinkronkan langsung status calon murid baru
      let spmbActionTaken = false;
      if (String(order_id).toUpperCase().startsWith("SPMB-TOKEN-")) {
        const candIdx = spmbCandidates.findIndex(c => 
          c.tokenPaymentOrderId === order_id || 
          c.tokenOrderId === order_id || 
          String(order_id).includes(c.nisn)
        );
        if (candIdx !== -1) {
          const candidate = spmbCandidates[candIdx];
          const ts = String(transaction_status || "").toLowerCase();
          const isSettled = ts === "settlement" || ts === "capture";
          const isPending = ts === "pending";
          const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";

          if (isSettled) {
            candidate.tokenPaid = true;
            candidate.tokenPaymentStatus = "paid";
            candidate.tokenPaidAt = webhookData.settlement_time || webhookData.transaction_time || new Date().toISOString();
            candidate.tokenPaymentMethod = formatMidtransPaymentMethod(payment_type);
            candidate.status = "registered";
            candidate.updatedAt = new Date().toISOString();
            saveState();
            if (persistEntity) persistEntity("spmbCandidates", candidate).catch(() => {});
            spmbActionTaken = true;
          } else if (isPending) {
            candidate.tokenPaid = false;
            candidate.tokenPaymentStatus = "pending";
            if (webhookData.expiry_time) candidate.tokenExpiryTime = webhookData.expiry_time;
            if (webhookData.va_numbers) candidate.tokenVaNumbers = webhookData.va_numbers;
            if (payment_type) candidate.tokenPaymentType = payment_type;
            candidate.tokenPaymentMethod = formatMidtransPaymentMethod(payment_type);
            candidate.updatedAt = new Date().toISOString();
            saveState();
            if (persistEntity) persistEntity("spmbCandidates", candidate).catch(() => {});
            spmbActionTaken = true;
          } else if (isExpired) {
            candidate.tokenSnapExpired = true;
            candidate.tokenPaymentStatus = "pending";
            candidate.snapExpiredAt = new Date().toISOString();

            const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const y = threeDaysLater.getFullYear();
            const mo = String(threeDaysLater.getMonth() + 1).padStart(2, '0');
            const da = String(threeDaysLater.getDate()).padStart(2, '0');
            const ho = String(threeDaysLater.getHours()).padStart(2, '0');
            const mi = String(threeDaysLater.getMinutes()).padStart(2, '0');
            const se = String(threeDaysLater.getSeconds()).padStart(2, '0');
            const expiryStr = `${y}-${mo}-${da} ${ho}:${mi}:${se}`;

            if (!candidate.tokenExpiryTime || new Date(candidate.tokenExpiryTime.replace(" ", "T")).getTime() < threeDaysLater.getTime()) {
              candidate.tokenExpiryTime = expiryStr;
            }
            candidate.cashPaymentDeadline = candidate.tokenExpiryTime;
            candidate.updatedAt = new Date().toISOString();
            saveState();
            if (persistEntity) persistEntity("spmbCandidates", candidate).catch(() => {});
            spmbActionTaken = true;
          }
        }
      }

      res.json({
        status: "ok",
        actionTaken: spmbActionTaken,
        message: spmbActionTaken 
          ? `Callback Midtrans untuk Token SPMB [${order_id}] berhasil diproses (Status: ${transaction_status}).`
          : "Callback Midtrans diterima dan dicatat dalam riwayat transaksi. Rekonsiliasi otomatis dinonaktifkan untuk tagihan internal sekolah."
      });
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
    const cleanOrderId = orderId.trim().replace(/^#+/, "").replace(/^["']|["']$/g, "").trim();

    try {
      const midtransStatus = await getMidtransStatus(cleanOrderId);
      if (!midtransStatus) {
        const localSpp = sppBills.find(b => b.orderId === cleanOrderId || b.id === cleanOrderId);
        const localMisc = miscBills.find(b => b.orderId === cleanOrderId || b.id === cleanOrderId);
        const localSavings = savingsTransactions.find(t => t.orderId === cleanOrderId || t.id === cleanOrderId);
        if (localSpp || localMisc || localSavings) {
          return res.json({
            success: true,
            type: "local_only",
            message: "Data transaksi ditemukan di sistem internal sekolah.",
            item: localSpp || localMisc || localSavings
          });
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
        message: reconResult.actionTaken
          ? `BERHASIL! ${reconResult.detailMessage || "Status pembayaran tagihan telah diperbarui menjadi LUNAS."}`
          : `PERINGATAN: Transaksi sukses di Midtrans (Settlement), namun belum berhasil dicocokkan otomatis. Silakan gunakan fitur Rekonsiliasi Satuan untuk memasangkan manual.`,
        midtransStatus,
        reconResult
      });
    } catch (e) {
      const err = e as Error;
      console.error("Error verifying midtrans order:", err);
      res.status(500).json({ error: "Gagal memproses verifikasi order: " + err.message });
    }
  });

  // 16B. Comprehensive Single Midtrans Check & Reconciliation Endpoint
  router.post("/midtrans/single-check-and-reconcile", async (req, res) => {
    try {
      const {
        query,
        autoReconcile = false,
        forceReconcileLocal = false,
        allocationOverride
      } = req.body;

      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ error: "Order ID, Transaction ID Midtrans (UUID), atau NIS Siswa wajib diisi." });
      }

      const cleanQuery = query.trim().replace(/^#+/, "").replace(/^["']|["']$/g, "").trim();

      // Case A: Manual pairing override requested directly through this endpoint
      if (allocationOverride) {
        const {
          studentId,
          studentNis,
          allocationType = "auto_spp",
          specificBillId,
          specificBillType,
          paymentType = "Midtrans (Single Manual Reconciled)",
          settlementTime,
          notes,
          amount,
          adminFee: overrideAdminFee,
          orderId = cleanQuery,
          transactionId
        } = allocationOverride;

        const effectiveOrderId = String(orderId || cleanQuery).trim();
        const effectiveAmount = Number(amount) || 0;
        const resolvedPaidAt = parseMidtransTime(settlementTime || new Date().toISOString());

        let targetStudent = students.find(s =>
          (studentId && (s.id === studentId || String(s.nis).trim() === String(studentId).trim())) ||
          (studentNis && (String(s.nis).trim() === String(studentNis).trim() || s.id === `std-${studentNis}` || s.id === studentNis))
        );

        if (allocationType === "treasurer_kas" || (!targetStudent && allocationType !== "specific_bill")) {
          const newKas: TreasurerTransaction = {
            id: `trx-kas-${Date.now()}`,
            type: "incoming",
            category: notes || "Penerimaan Midtrans Online (Single Reconcile)",
            amount: effectiveAmount,
            description: `Rekonsiliasi Manual Order Midtrans: ${effectiveOrderId} ${transactionId ? `(TxID: ${transactionId})` : ""}`,
            date: resolvedPaidAt.substring(0, 10),
            source: "custom",
            studentName: targetStudent?.name || "Wali Murid / Umum",
            studentId: targetStudent?.id,
            nis: targetStudent?.nis,
            createdBy: "Admin (Single Reconcile)",
            paymentMethod: "bank",
            orderId: effectiveOrderId,
            transactionId: transactionId ? String(transactionId).trim() : undefined
          };
          treasurerTransactions.unshift(newKas);

          recordOrUpdateMidtransTransaction({
            orderId: effectiveOrderId,
            transactionId: transactionId ? String(transactionId).trim() : undefined,
            billType: "other",
            grossAmount: effectiveAmount,
            studentName: targetStudent?.name,
            studentNis: targetStudent?.nis,
            description: newKas.description,
            transactionStatus: "settlement",
            paymentType,
            settlementTime: resolvedPaidAt
          });

          saveState();
          if (persistEntity) {
            persistEntity("treasurerTransactions", newKas).catch(() => {});
          }

          return res.json({
            success: true,
            actionTaken: true,
            message: `Transaksi Rp ${effectiveAmount.toLocaleString("id-ID")} berhasil dicatat langsung ke Kas Umum (BKU) Bendahara.`,
            allocationType: "treasurer_kas"
          });
        }

        if (!targetStudent) {
          return res.status(400).json({ error: "Siswa untuk alokasi pembayaran tidak ditemukan." });
        }

        if (allocationType === "savings") {
          const cleanTxIdStr = transactionId ? String(transactionId).trim() : undefined;
          let existingSavTx = savingsTransactions.find(
            t =>
              (effectiveOrderId && t.orderId === effectiveOrderId) ||
              (cleanTxIdStr && t.transactionId === cleanTxIdStr) ||
              t.id === effectiveOrderId
          );
          if (!existingSavTx) {
            existingSavTx = savingsTransactions.find(
              t => t.studentId === targetStudent!.id && t.status === "pending"
            );
          }

          const { netAmount: netSavingsAmount, adminFeeDeducted } = resolveNetSavingsDepositAmount(effectiveAmount, {
            paymentType,
            configuredAdminFee: midtransConfig.adminFee,
            explicitAdminFee: overrideAdminFee !== undefined && overrideAdminFee !== null && overrideAdminFee !== "" ? Number(overrideAdminFee) : undefined,
            explicitAdminFeeProvided: overrideAdminFee !== undefined && overrideAdminFee !== null && overrideAdminFee !== "",
            existingPrincipalAmount: existingSavTx?.amount
          });

          let savedTx: SavingsTransaction;
          if (existingSavTx && existingSavTx.status !== "success") {
            existingSavTx.amount = netSavingsAmount;
            existingSavTx.status = "success";
            existingSavTx.paymentMethod = paymentType;
            existingSavTx.orderId = effectiveOrderId;
            if (cleanTxIdStr) existingSavTx.transactionId = cleanTxIdStr;
            existingSavTx.notes = adminFeeDeducted > 0
              ? `${notes || existingSavTx.notes || `Setoran Tabungan Single Reconcile (${effectiveOrderId})`} [Pokok: Rp ${netSavingsAmount.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`
              : (notes || existingSavTx.notes || `Setoran Tabungan Single Reconcile (${effectiveOrderId})`);
            savedTx = existingSavTx;
          } else {
            savedTx = {
              id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              studentId: targetStudent.id,
              studentNis: targetStudent.nis,
              type: "deposit",
              amount: netSavingsAmount,
              status: "success",
              createdAt: resolvedPaidAt,
              paymentMethod: paymentType,
              orderId: effectiveOrderId,
              transactionId: cleanTxIdStr,
              notes: adminFeeDeducted > 0
                ? `${notes || `Setoran Tabungan Single Reconcile (${effectiveOrderId})`} [Pokok: Rp ${netSavingsAmount.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`
                : (notes || `Setoran Tabungan Single Reconcile (${effectiveOrderId})`)
            };
            savingsTransactions.unshift(savedTx);
          }

          targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + netSavingsAmount;
          AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;

          recordOrUpdateMidtransTransaction({
            orderId: effectiveOrderId,
            transactionId: cleanTxIdStr,
            billType: "savings",
            grossAmount: netSavingsAmount,
            studentName: targetStudent.name,
            studentNis: targetStudent.nis,
            description: adminFeeDeducted > 0
              ? `Setoran Tabungan (Pokok Rp ${netSavingsAmount.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})`
              : "Setoran Tabungan (Single Reconcile)",
            transactionStatus: "settlement",
            paymentType,
            settlementTime: resolvedPaidAt
          });

          saveState();
          if (persistEntity) {
            await persistEntity("savingsTransactions", savedTx).catch(e => console.error("Error saving savings tx to MySQL:", e));
            await persistEntity("students", targetStudent).catch(e => console.error("Error saving student to MySQL:", e));
          }

          return res.json({
            success: true,
            actionTaken: true,
            message: adminFeeDeducted > 0
              ? `Berhasil menambahkan Rp ${netSavingsAmount.toLocaleString("id-ID")} ke Saldo Tabungan a.n ${targetStudent.name} (NIS: ${targetStudent.nis}). Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} otomatis dipisahkan dan tidak masuk saldo.`
              : `Berhasil menambahkan Rp ${netSavingsAmount.toLocaleString("id-ID")} ke Saldo Tabungan a.n ${targetStudent.name} (NIS: ${targetStudent.nis}).`,
            allocationType: "savings",
            netSavingsAmount,
            adminFeeDeducted,
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
              bill.orderId = effectiveOrderId;
              if (transactionId) bill.transactionId = String(transactionId).trim();
              bill.isVoidedByAdmin = false;
              delete bill.voidedAt;
              delete bill.voidReason;
              const vpIdx = voidedPayments.findIndex(v => v.billId === bill.id);
              if (vpIdx !== -1) voidedPayments.splice(vpIdx, 1);

              recordOrUpdateMidtransTransaction({
                orderId: effectiveOrderId,
                transactionId: transactionId ? String(transactionId).trim() : undefined,
                billType: "spp",
                grossAmount: bill.amount,
                studentName: targetStudent.name,
                studentNis: targetStudent.nis,
                description: `SPP ${bill.month} ${bill.year}`,
                transactionStatus: "settlement",
                paymentType,
                settlementTime: resolvedPaidAt
              });

              // Record in Kas BKU Bendahara
              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: "incoming",
                category: `SPP ${bill.month} ${bill.year}`,
                amount: Number(bill.amount) || 0,
                description: `Pembayaran Online Midtrans: SPP ${bill.month} ${bill.year} (${targetStudent.name}) [Order: ${effectiveOrderId}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "spp",
                studentName: targetStudent.name,
                studentId: targetStudent.id,
                nis: targetStudent.nis,
                createdBy: "Admin (Single Reconcile)",
                paymentMethod: "bank",
                orderId: effectiveOrderId,
                transactionId: transactionId ? String(transactionId).trim() : undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);

              saveState();
              if (persistEntity) {
                await persistEntity("sppBills", bill).catch(e => console.error("Error persisting SPP bill to MySQL:", e));
                await persistEntity("treasurerTransactions", newKas).catch(e => console.error("Error persisting SPP Kas to MySQL:", e));
              }

              return res.json({
                success: true,
                actionTaken: true,
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
              mBill.orderId = effectiveOrderId;
              if (transactionId) mBill.transactionId = String(transactionId).trim();
              mBill.isVoidedByAdmin = false;
              delete mBill.voidedAt;
              delete mBill.voidReason;
              const vpIdx = voidedPayments.findIndex(v => v.billId === mBill.id);
              if (vpIdx !== -1) voidedPayments.splice(vpIdx, 1);

              recordOrUpdateMidtransTransaction({
                orderId: effectiveOrderId,
                transactionId: transactionId ? String(transactionId).trim() : undefined,
                billType: "misc",
                grossAmount: mBill.amount,
                studentName: targetStudent.name,
                studentNis: targetStudent.nis,
                description: mBill.title,
                transactionStatus: "settlement",
                paymentType,
                settlementTime: resolvedPaidAt
              });

              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: "incoming",
                category: mBill.title || "Tagihan Non-SPP",
                amount: Number(mBill.amount) || 0,
                description: `Pembayaran Online Midtrans: ${mBill.title} (${targetStudent.name}) [Order: ${effectiveOrderId}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "custom",
                studentName: targetStudent.name,
                studentId: targetStudent.id,
                nis: targetStudent.nis,
                createdBy: "Admin (Single Reconcile)",
                paymentMethod: "bank",
                orderId: effectiveOrderId,
                transactionId: transactionId ? String(transactionId).trim() : undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);

              saveState();
              if (persistEntity) {
                await persistEntity("miscBills", mBill).catch(e => console.error("Error persisting Misc bill to MySQL:", e));
                await persistEntity("treasurerTransactions", newKas).catch(e => console.error("Error persisting Misc Kas to MySQL:", e));
              }

              return res.json({
                success: true,
                actionTaken: true,
                message: `Tagihan Non-SPP "${mBill.title}" a.n ${targetStudent.name} berhasil dilunasi.`,
                allocationType: "specific_bill"
              });
            }
          }
        }

        // Default: auto_spp (Smart Allocation)
        const allocResult = autoAllocateStudentPayment(
          targetStudent,
          effectiveAmount,
          effectiveOrderId,
          transactionId ? String(transactionId).trim() : undefined,
          paymentType,
          resolvedPaidAt,
          { notes }
        );

        recordOrUpdateMidtransTransaction({
          orderId: effectiveOrderId,
          transactionId: transactionId ? String(transactionId).trim() : undefined,
          billType: allocResult.paidSppCount > 0 ? "spp" : (allocResult.paidMiscCount > 0 ? "misc" : "savings"),
          grossAmount: effectiveAmount,
          studentName: targetStudent.name,
          studentNis: targetStudent.nis,
          description: allocResult.category,
          transactionStatus: "settlement",
          paymentType,
          settlementTime: resolvedPaidAt
        });

        // Record incoming Kas BKU for any paid SPP/Misc bills
        const kasItemsToPersist: TreasurerTransaction[] = [];
        for (const spp of allocResult.affectedSppBills) {
          const newKas: TreasurerTransaction = {
            id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: `SPP ${spp.month} ${spp.year}`,
            amount: Number(spp.amount) || 0,
            description: `Pembayaran Online Midtrans: SPP ${spp.month} ${spp.year} (${targetStudent.name}) [Order: ${effectiveOrderId}]`,
            date: resolvedPaidAt.substring(0, 10),
            source: "spp",
            studentName: targetStudent.name,
            studentId: targetStudent.id,
            nis: targetStudent.nis,
            createdBy: "Admin (Single Reconcile)",
            paymentMethod: "bank",
            orderId: effectiveOrderId,
            transactionId: transactionId ? String(transactionId).trim() : undefined,
            fundingSource: "Kas Bank/Midtrans"
          };
          treasurerTransactions.unshift(newKas);
          kasItemsToPersist.push(newKas);
        }
        for (const misc of allocResult.affectedMiscBills) {
          const newKas: TreasurerTransaction = {
            id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: misc.title || "Tagihan Non-SPP",
            amount: Number(misc.amount) || 0,
            description: `Pembayaran Online Midtrans: ${misc.title} (${targetStudent.name}) [Order: ${effectiveOrderId}]`,
            date: resolvedPaidAt.substring(0, 10),
            source: "custom",
            studentName: targetStudent.name,
            studentId: targetStudent.id,
            nis: targetStudent.nis,
            createdBy: "Admin (Single Reconcile)",
            paymentMethod: "bank",
            orderId: effectiveOrderId,
            transactionId: transactionId ? String(transactionId).trim() : undefined,
            fundingSource: "Kas Bank/Midtrans"
          };
          treasurerTransactions.unshift(newKas);
          kasItemsToPersist.push(newKas);
        }

        saveState();
        if (persistEntities) {
          const sppToSave = allocResult.affectedSppBills.length > 0
            ? allocResult.affectedSppBills
            : sppBills.filter(b => b.orderId === effectiveOrderId);
          if (sppToSave.length > 0) {
            await persistEntities("sppBills", sppToSave).catch(e => console.error("Error persisting SPP bills batch:", e));
          }

          const miscToSave = allocResult.affectedMiscBills.length > 0
            ? allocResult.affectedMiscBills
            : miscBills.filter(m => m.orderId === effectiveOrderId);
          if (miscToSave.length > 0) {
            await persistEntities("miscBills", miscToSave).catch(e => console.error("Error persisting Misc bills batch:", e));
          }

          const savToSave = allocResult.affectedSavingsTxs.length > 0
            ? allocResult.affectedSavingsTxs
            : savingsTransactions.filter(s => s.orderId === effectiveOrderId);
          if (savToSave.length > 0) {
            await persistEntities("savingsTransactions", savToSave).catch(e => console.error("Error persisting Savings batch:", e));
          }

          if (kasItemsToPersist.length > 0) {
            await persistEntities("treasurerTransactions", kasItemsToPersist).catch(e => console.error("Error persisting Kas batch:", e));
          }
        }
        if (persistEntity) {
          await persistEntity("students", targetStudent).catch(e => console.error("Error persisting student balance:", e));
        }

        return res.json({
          success: true,
          actionTaken: true,
          message: allocResult.message,
          allocationType: "auto_spp",
          allocResult
        });
      }

      // Step 1: Query Gateway Midtrans API
      let midtransStatus: any = null;
      let midtransFetchError: string | null = null;
      try {
        midtransStatus = await getMidtransStatus(cleanQuery);
      } catch (err: any) {
        midtransFetchError = err?.message || "Gagal menghubungi Gateway Midtrans";
      }

      // Step 2: Search local system for matching records
      const cleanLower = cleanQuery.toLowerCase();
      let localMatchedSpp = sppBills.find(b => 
        (b.orderId && b.orderId.toLowerCase() === cleanLower) ||
        (b.id && b.id.toLowerCase() === cleanLower) ||
        (b.transactionId && b.transactionId.toLowerCase() === cleanLower) ||
        (b.id && b.id.toLowerCase() === cleanLower + "-unpaid")
      );
      let localMatchedMisc = miscBills.find(m =>
        (m.orderId && m.orderId.toLowerCase() === cleanLower) ||
        (m.id && m.id.toLowerCase() === cleanLower) ||
        (m.transactionId && m.transactionId.toLowerCase() === cleanLower)
      );
      const localMatchedSavings = savingsTransactions.find(t =>
        (t.orderId && t.orderId.toLowerCase() === cleanLower) ||
        (t.id && t.id.toLowerCase() === cleanLower) ||
        (t.transactionId && t.transactionId.toLowerCase() === cleanLower)
      );
      const localMatchedMidtransTx = midtransTransactions.find(t =>
        (t.orderId && t.orderId.toLowerCase() === cleanLower) ||
        (t.transactionId && t.transactionId.toLowerCase() === cleanLower)
      );
      const localMatchedStudentByNis = students.find(s =>
        String(s.nis).trim().toLowerCase() === cleanLower ||
        s.id.toLowerCase() === cleanLower ||
        s.id.toLowerCase() === `std-${cleanLower}`
      );

      // Resolve candidate student
      let candidateStudent: Student | undefined = localMatchedStudentByNis;
      if (!candidateStudent && localMatchedSpp) candidateStudent = students.find(s => s.id === localMatchedSpp.studentId);
      if (!candidateStudent && localMatchedMisc) candidateStudent = students.find(s => s.id === localMatchedMisc.studentId);
      if (!candidateStudent && localMatchedSavings) candidateStudent = students.find(s => s.id === localMatchedSavings.studentId);
      if (!candidateStudent && localMatchedMidtransTx?.studentNis) {
        candidateStudent = students.find(s => String(s.nis).trim() === String(localMatchedMidtransTx.studentNis).trim());
      }

      // If student not found locally, try extracting from Midtrans customer details or order tokens
      if (!candidateStudent && midtransStatus) {
        const custEmail = midtransStatus.customer_details?.email || "";
        const custName = midtransStatus.customer_details?.first_name || "";
        const custPhone = midtransStatus.customer_details?.phone || "";
        const targetOrderId = midtransStatus.order_id || cleanQuery;

        if (custPhone) {
          const cleanP = custPhone.replace(/\D/g, "");
          if (cleanP.length >= 8) {
            candidateStudent = students.find(s => s.phone && s.phone.replace(/\D/g, "").includes(cleanP));
          }
        }
        if (!candidateStudent && custEmail && custEmail.includes("@")) {
          candidateStudent = students.find(s => s.email && s.email.toLowerCase().trim() === custEmail.toLowerCase().trim());
        }
        if (!candidateStudent && custName && custName.length >= 3) {
          candidateStudent = students.find(s => s.name.toLowerCase().trim() === custName.toLowerCase().trim());
        }
        if (!candidateStudent) {
          const tokens = (targetOrderId + " " + cleanQuery).replace(/^SPP-|^MISC-|^SAV-|^CART-/i, "").split(/[-_\s]/);
          for (const token of tokens) {
            const cleanT = token.trim().toLowerCase();
            if (cleanT.length >= 2) {
              const matched = students.find(s => String(s.nis).trim().toLowerCase() === cleanT || s.id.toLowerCase() === cleanT || s.id.toLowerCase() === `std-${cleanT}`);
              if (matched) {
                candidateStudent = matched;
                break;
              }
            }
          }
        }
      }

      // Check student's unpaid bills for pairing assistance (sorted chronologically)
      const studentUnpaidSpp = candidateStudent
        ? sppBills
            .filter(b => b.studentId === candidateStudent!.id && (b.status === "unpaid" || b.status === "pending"))
            .sort((a, b) => {
              const yearDiff = (a.year || 2026) - (b.year || 2026);
              if (yearDiff !== 0) return yearDiff;
              const idxA = ACADEMIC_MONTHS.indexOf(a.month);
              const idxB = ACADEMIC_MONTHS.indexOf(b.month);
              return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
            })
        : [];
      const studentUnpaidMisc = candidateStudent
        ? miscBills.filter(m => m.studentId === candidateStudent!.id && (m.status === "unpaid" || m.status === "pending"))
        : [];

      // Determine Midtrans settlement status
      const ts = midtransStatus?.transaction_status || "";
      const isSettledInMidtrans = ts === "settlement" || ts === "capture";
      const isPendingInMidtrans = ts === "pending";
      const isExpiredInMidtrans = ts === "expire" || ts === "cancel" || ts === "deny";

      // Check whether internal bill is already paid
      let isAlreadyPaidInLocal = 
        (localMatchedSpp && localMatchedSpp.status === "paid") ||
        (localMatchedMisc && localMatchedMisc.status === "paid") ||
        (localMatchedSavings && localMatchedSavings.status === "success") ||
        false;

      if (!isAlreadyPaidInLocal && candidateStudent && midtransStatus) {
        const trailingNumberMatch = cleanQuery.match(/-(\d{10,13})$/);
        const txTime = midtransStatus.settlement_time || midtransStatus.transaction_time || "";
        let candidateTs: number | undefined;
        if (trailingNumberMatch) {
          const num = Number(trailingNumberMatch[1]);
          if (!isNaN(num) && num > 1600000000000 && num < 2500000000000) candidateTs = num;
        }
        if (!candidateTs && txTime) {
          const p = Date.parse(txTime);
          if (!isNaN(p)) candidateTs = p;
        }
        if (candidateTs) {
          const dObj = new Date(candidateTs);
          const mNames = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
          ];
          const mName = mNames[dObj.getMonth()];
          const yNum = dObj.getFullYear();
          const stdBills = sppBills.filter(b => b.studentId === candidateStudent!.id);
          const thisBill = stdBills.find(b => b.month.toLowerCase() === mName.toLowerCase() && b.year === yNum);
          if (thisBill && thisBill.status === "paid") {
            isAlreadyPaidInLocal = true;
            if (!localMatchedSpp) {
              localMatchedSpp = thisBill;
            }
          }
        }
      }

      // Normalized Midtrans status payload for frontend
      const normalizedMidtransData = midtransStatus ? {
        orderId: midtransStatus.order_id || cleanQuery,
        transactionId: midtransStatus.transaction_id || "",
        grossAmount: Number(midtransStatus.gross_amount) || 0,
        paymentType: midtransStatus.payment_type || "Online Gateway",
        transactionStatus: midtransStatus.transaction_status,
        transactionTime: midtransStatus.transaction_time || "",
        settlementTime: midtransStatus.settlement_time || "",
        fraudStatus: midtransStatus.fraud_status || "accept",
        customerDetails: midtransStatus.customer_details || null,
        isSettled: isSettledInMidtrans,
        isPending: isPendingInMidtrans,
        isExpired: isExpiredInMidtrans
      } : null;

      // Handle Case B: Force Reconcile against Local Pending Bill (when Gateway status 404 or dev/offline)
      if (forceReconcileLocal) {
        if (localMatchedSpp && localMatchedSpp.status !== "paid") {
          localMatchedSpp.isVoidedByAdmin = false;
          delete localMatchedSpp.voidedAt;
          delete localMatchedSpp.voidReason;
          const vpIdx = voidedPayments.findIndex(v => v.billId === localMatchedSpp.id);
          if (vpIdx !== -1) voidedPayments.splice(vpIdx, 1);

          localMatchedSpp.status = "paid";
          localMatchedSpp.paidAt = new Date().toISOString();
          localMatchedSpp.paymentMethod = "Midtrans (Paksa Rekonsiliasi Internal)";
          localMatchedSpp.orderId = cleanQuery;

          recordOrUpdateMidtransTransaction({
            orderId: cleanQuery,
            billType: "spp",
            grossAmount: localMatchedSpp.amount,
            studentName: candidateStudent?.name,
            studentNis: candidateStudent?.nis,
            description: `SPP ${localMatchedSpp.month} ${localMatchedSpp.year}`,
            transactionStatus: "settlement",
            paymentType: "Midtrans (Paksa Rekonsiliasi)",
            settlementTime: new Date().toISOString()
          });

          const newKas: TreasurerTransaction = {
            id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: `SPP ${localMatchedSpp.month} ${localMatchedSpp.year}`,
            amount: Number(localMatchedSpp.amount) || 0,
            description: `Pembayaran Online Midtrans: SPP ${localMatchedSpp.month} ${localMatchedSpp.year} (${candidateStudent?.name || "Siswa"}) [Order: ${cleanQuery}]`,
            date: new Date().toISOString().substring(0, 10),
            source: "spp",
            studentName: candidateStudent?.name,
            studentId: candidateStudent?.id,
            nis: candidateStudent?.nis,
            createdBy: "Admin (Paksa Rekonsiliasi)",
            paymentMethod: "bank",
            orderId: cleanQuery,
            fundingSource: "Kas Bank/Midtrans"
          };
          treasurerTransactions.unshift(newKas);

          saveState();
          if (persistEntity) {
            await persistEntity("sppBills", localMatchedSpp).catch(e => console.error("Error saving force local SPP to MySQL:", e));
            await persistEntity("treasurerTransactions", newKas).catch(e => console.error("Error saving force local SPP Kas to MySQL:", e));
          }

          return res.json({
            success: true,
            actionTaken: true,
            message: `Tagihan SPP ${localMatchedSpp.month} ${localMatchedSpp.year} a.n ${candidateStudent?.name || "Siswa"} berhasil dipaksa LUNAS secara internal.`,
            midtransData: normalizedMidtransData,
            matchedStudent: candidateStudent ? { id: candidateStudent.id, name: candidateStudent.name, nis: candidateStudent.nis, class: candidateStudent.class } : null
          });
        }

        if (localMatchedMisc && localMatchedMisc.status !== "paid") {
          localMatchedMisc.isVoidedByAdmin = false;
          delete localMatchedMisc.voidedAt;
          delete localMatchedMisc.voidReason;
          const vpIdx = voidedPayments.findIndex(v => v.billId === localMatchedMisc.id);
          if (vpIdx !== -1) voidedPayments.splice(vpIdx, 1);

          localMatchedMisc.status = "paid";
          localMatchedMisc.paidAt = new Date().toISOString();
          localMatchedMisc.paymentMethod = "Midtrans (Paksa Rekonsiliasi Internal)";
          localMatchedMisc.orderId = cleanQuery;

          recordOrUpdateMidtransTransaction({
            orderId: cleanQuery,
            billType: "misc",
            grossAmount: localMatchedMisc.amount,
            studentName: candidateStudent?.name,
            studentNis: candidateStudent?.nis,
            description: localMatchedMisc.title,
            transactionStatus: "settlement",
            paymentType: "Midtrans (Paksa Rekonsiliasi)",
            settlementTime: new Date().toISOString()
          });

          const newKas: TreasurerTransaction = {
            id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: localMatchedMisc.title || "Tagihan Non-SPP",
            amount: Number(localMatchedMisc.amount) || 0,
            description: `Pembayaran Online Midtrans: ${localMatchedMisc.title} (${candidateStudent?.name || "Siswa"}) [Order: ${cleanQuery}]`,
            date: new Date().toISOString().substring(0, 10),
            source: "custom",
            studentName: candidateStudent?.name,
            studentId: candidateStudent?.id,
            nis: candidateStudent?.nis,
            createdBy: "Admin (Paksa Rekonsiliasi)",
            paymentMethod: "bank",
            orderId: cleanQuery,
            fundingSource: "Kas Bank/Midtrans"
          };
          treasurerTransactions.unshift(newKas);

          saveState();
          if (persistEntity) {
            await persistEntity("miscBills", localMatchedMisc).catch(e => console.error("Error saving force local Misc to MySQL:", e));
            await persistEntity("treasurerTransactions", newKas).catch(e => console.error("Error saving force local Misc Kas to MySQL:", e));
          }

          return res.json({
            success: true,
            actionTaken: true,
            message: `Tagihan Non-SPP "${localMatchedMisc.title}" a.n ${candidateStudent?.name || "Siswa"} berhasil dipaksa LUNAS secara internal.`,
            midtransData: normalizedMidtransData,
            matchedStudent: candidateStudent ? { id: candidateStudent.id, name: candidateStudent.name, nis: candidateStudent.nis, class: candidateStudent.class } : null
          });
        }
      }

      // Case C: Auto-reconciliation requested and transaction is settled
      if (autoReconcile && isSettledInMidtrans) {
        const effectiveOrderId = midtransStatus.order_id || cleanQuery;
        const reconResult = await processMidtransOrderStatus(effectiveOrderId, midtransStatus);

        return res.json({
          success: true,
          actionTaken: reconResult.actionTaken,
          needsPairing: !reconResult.actionTaken,
          message: reconResult.actionTaken
            ? `BERHASIL! ${reconResult.detailMessage || "Status pembayaran tagihan telah diselaraskan menjadi LUNAS."}`
            : `Transaksi berstatus SETTLEMENT di Midtrans, namun tagihan internal belum berhasil dipasangkan otomatis. Silakan gunakan panel pemasangan manual di bawah.`,
          midtransData: normalizedMidtransData,
          matchedStudent: candidateStudent ? {
            id: candidateStudent.id,
            name: candidateStudent.name,
            nis: candidateStudent.nis,
            class: candidateStudent.class,
            phone: candidateStudent.phone,
            savingsBalance: candidateStudent.savingsBalance
          } : null,
          unpaidBills: {
            spp: studentUnpaidSpp.map(b => ({ id: b.id, month: b.month, year: b.year, amount: b.amount })),
            misc: studentUnpaidMisc.map(m => ({ id: m.id, title: m.title, amount: m.amount }))
          },
          reconResult
        });
      }

      // Case D: Diagnostic / Preview check response
      return res.json({
        success: true,
        isCheckOnly: true,
        foundInMidtrans: !!midtransStatus,
        midtransData: normalizedMidtransData,
        foundInLocal: !!(localMatchedSpp || localMatchedMisc || localMatchedSavings || localMatchedMidtransTx || localMatchedStudentByNis),
        localMatchedItem: localMatchedSpp ? {
          type: "spp",
          title: `SPP ${localMatchedSpp.month} ${localMatchedSpp.year}`,
          amount: localMatchedSpp.amount,
          status: localMatchedSpp.status,
          orderId: localMatchedSpp.orderId,
          transactionId: localMatchedSpp.transactionId
        } : (localMatchedMisc ? {
          type: "misc",
          title: localMatchedMisc.title,
          amount: localMatchedMisc.amount,
          status: localMatchedMisc.status,
          orderId: localMatchedMisc.orderId,
          transactionId: localMatchedMisc.transactionId
        } : (localMatchedSavings ? {
          type: "savings",
          title: "Setoran Tabungan",
          amount: localMatchedSavings.amount,
          status: localMatchedSavings.status,
          orderId: localMatchedSavings.orderId,
          transactionId: localMatchedSavings.transactionId
        } : null)),
        matchedStudent: candidateStudent ? {
          id: candidateStudent.id,
          name: candidateStudent.name,
          nis: candidateStudent.nis,
          class: candidateStudent.class,
          phone: candidateStudent.phone,
          savingsBalance: candidateStudent.savingsBalance
        } : null,
        unpaidBills: {
          spp: studentUnpaidSpp.map(b => ({ id: b.id, month: b.month, year: b.year, amount: b.amount })),
          misc: studentUnpaidMisc.map(m => ({ id: m.id, title: m.title, amount: m.amount }))
        },
        isAlreadyPaidInLocal,
        canAutoReconcile: isSettledInMidtrans && !isAlreadyPaidInLocal,
        message: midtransStatus
          ? (isSettledInMidtrans 
              ? (isAlreadyPaidInLocal ? "Transaksi LUNAS di Midtrans dan SUDAH LUNAS di database sekolah." : "Transaksi LUNAS di Midtrans. Siap direkonsiliasikan ke database sekolah.")
              : (isPendingInMidtrans ? "Transaksi masih PENDING di Midtrans (menunggu pembayaran oleh wali murid)." : `Status transaksi di Midtrans: ${ts.toUpperCase()}`))
          : (localMatchedSpp || localMatchedMisc || localMatchedSavings 
              ? "Transaksi tidak tercatat di Gateway Midtrans, namun ada di database lokal sekolah."
              : "Transaksi tidak ditemukan di Gateway Midtrans maupun database lokal sekolah.")
      });
    } catch (err: any) {
      console.error("Single check and reconcile error:", err);
      res.status(500).json({ error: "Gagal memproses pemeriksaan rekonsiliasi: " + (err.message || String(err)) });
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
      let voidedByAdminCount = 0;
      let pendingCount = 0;
      let failedCount = 0;
      let totalAmountReconciled = 0;
      let stateChanged = false;

      const touchedSppMap = new Map<string, SppBill>();
      const touchedMiscMap = new Map<string, MiscBill>();
      const touchedSavingsMap = new Map<string, SavingsTransaction>();
      const touchedStudentsMap = new Map<string, Student>();
      const newKasTransactions: TreasurerTransaction[] = [];

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
        reconciliationStatus: 'reconciled' | 'already_paid' | 'not_found' | 'report_pending' | 'report_failed' | 'voided_by_admin';
        message: string;
      }[] = [];

      for (const item of parsedItems) {
        const cleanOrderId = String(item.orderId || item.order_id || item["Order ID"] || "").trim();
        const cleanTxId = String(item.transactionId || item.transaction_id || item["Transaction ID"] || "").trim();
        
        if (!cleanOrderId && !cleanTxId) continue;

        const amountVal = Number(item.grossAmount || item.amount || item.gross_amount || 0);
        const itemReportFee = Number(item.adminFee || item.admin_fee || item.fee || item.transaction_fee || item.biaya_admin || 0);
        const itemNetAmount = Number(item.netAmount || item.net_amount || item.nett_amount || 0);
        const rawStatus = String(item.status || item.transaction_status || "settlement").toLowerCase().trim();
        const rawPaymentTypeStr = String(item.paymentType || item.payment_type || item["Payment Type"] || item["Channel"] || "").trim();
        const actualPaymentType = rawPaymentTypeStr
          ? (rawPaymentTypeStr.toLowerCase().includes("midtrans") ? rawPaymentTypeStr : formatMidtransPaymentMethod(rawPaymentTypeStr))
          : "Midtrans Online";
        const reportTime = item.settlementTime || item.settlement_time || item.transactionTime || item.transaction_time || new Date().toISOString();
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

                if (persistEntity) {
                  persistEntity("spmbCandidates", matchedCandidate).catch(() => {});
                }

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

              if (persistEntity) {
                persistEntity("spmbCandidates", matchedCandidate).catch(() => {});
              }

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
              if (b.status !== "paid" && !b.isVoidedByAdmin && !voidedPayments.some(v => v.billId === b.id)) {
                b.status = "paid";
                b.paidAt = resolvedPaidAt;
                b.paymentMethod = actualPaymentType;
                if (cleanTxId) b.transactionId = cleanTxId;
                cartSettledCount++;
                cartTotalAmt += b.amount;
              }
            });

            matchedMisc.forEach(m => {
              if (m.status !== "paid" && !m.isVoidedByAdmin && !voidedPayments.some(v => v.billId === m.id)) {
                m.status = "paid";
                m.paidAt = resolvedPaidAt;
                m.paymentMethod = actualPaymentType;
                if (cleanTxId) m.transactionId = cleanTxId;
                cartSettledCount++;
                cartTotalAmt += m.amount;
              }
            });

            matchedSavings.forEach(t => {
              if (t.status !== "success" && !t.isVoidedByAdmin && !voidedPayments.some(v => v.billId === t.id)) {
                const { netAmount: cleanSavAmt } = resolveNetSavingsDepositAmount(Number(t.amount) || 0, {
                  paymentType: actualPaymentType,
                  configuredAdminFee: midtransConfig.adminFee,
                  reportFee: itemReportFee > 0 ? itemReportFee : undefined
                });
                t.amount = cleanSavAmt;
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

              matchedSpp.forEach(b => touchedSppMap.set(b.id, b));
              matchedMisc.forEach(m => touchedMiscMap.set(m.id, m));
              matchedSavings.forEach(t => touchedSavingsMap.set(t.id, t));
              const primaryStd = students.find(s => s.id === (matchedSpp[0]?.studentId || matchedMisc[0]?.studentId || matchedSavings[0]?.studentId)) || targetStudent;
              if (primaryStd) touchedStudentsMap.set(primaryStd.id, primaryStd);

              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
                type: "incoming",
                category: "Paket Pembayaran (Multi-Bill Cart)",
                amount: amountVal || cartTotalAmt,
                description: `Pembayaran Online Midtrans: Keranjang Multi-Tagihan (${primaryStd?.name || "Siswa"}) [Order: ${cleanOrderId}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "custom",
                studentName: primaryStd?.name,
                studentId: primaryStd?.id,
                nis: primaryStd?.nis,
                createdBy: "Admin (Midtrans Bulk Report)",
                paymentMethod: "bank",
                orderId: cleanOrderId,
                transactionId: cleanTxId || undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              newKasTransactions.push(newKas);

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
              resolvedPaidAt,
              { description: rawDesc }
            );

            if (!alloc.reconciled) {
              alreadyPaidCount++;
              results.push({
                orderId: cleanOrderId,
                transactionId: cleanTxId,
                studentName: targetStudent?.name || "Siswa",
                studentNis: targetStudent?.nis || "-",
                studentClass: targetStudent?.class || "-",
                category: alloc.category,
                amount: amountVal,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime: resolvedPaidAt,
                reconciliationStatus: "already_paid",
                message: alloc.message
              });
              continue;
            }

            reconciledCount++;
            totalAmountReconciled += amountVal;
            stateChanged = true;

            alloc.affectedSppBills.forEach(b => touchedSppMap.set(b.id, b));
            alloc.affectedMiscBills.forEach(m => touchedMiscMap.set(m.id, m));
            alloc.affectedSavingsTxs.forEach(t => touchedSavingsMap.set(t.id, t));
            touchedStudentsMap.set(targetStudent.id, targetStudent);

            const newKas: TreasurerTransaction = {
              id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
              type: "incoming",
              category: alloc.category,
              amount: amountVal,
              description: `Pembayaran Online Midtrans: ${alloc.category} (${targetStudent.name}) [Order: ${cleanOrderId}]`,
              date: resolvedPaidAt.substring(0, 10),
              source: alloc.paidSppCount > 0 ? "spp" : (alloc.paidMiscCount > 0 ? "custom" : "savings"),
              studentName: targetStudent.name,
              studentId: targetStudent.id,
              nis: targetStudent.nis,
              createdBy: "Admin (Midtrans Bulk Report)",
              paymentMethod: "bank",
              orderId: cleanOrderId,
              transactionId: cleanTxId || undefined,
              fundingSource: "Kas Bank/Midtrans"
            };
            treasurerTransactions.unshift(newKas);
            newKasTransactions.push(newKas);

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
            } else if (savingsTx.isVoidedByAdmin || voidedPayments.some(v => v.billId === savingsTx.id)) {
              voidedByAdminCount++;
              results.push({
                orderId: cleanOrderId || cleanTxId,
                transactionId: cleanTxId,
                studentName: student?.name || "-",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: "Setoran Tabungan",
                amount: savingsTx.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime,
                reconciliationStatus: "voided_by_admin",
                message: `DIBATALKAN ADMIN: Transaksi setoran tabungan a.n ${student?.name || 'Siswa'} telah dibatalkan / dikoreksi oleh Admin sekolah.`
              });
            } else {
              // Pastikan biaya admin bank dari gross_amount tidak ikut masuk ke saldo tabungan siswa
              const grossCandidate = amountVal > 0 ? amountVal : Number(savingsTx.amount) || 0;
              const { netAmount: netSavingsAmt, adminFeeDeducted } = resolveNetSavingsDepositAmount(grossCandidate, {
                paymentType: actualPaymentType,
                configuredAdminFee: midtransConfig.adminFee,
                reportFee: itemReportFee > 0 ? itemReportFee : undefined,
                explicitNetAmount: itemNetAmount > 0 ? itemNetAmount : undefined,
                existingPrincipalAmount: Number(savingsTx.amount) || undefined
              });

              savingsTx.amount = netSavingsAmt;
              savingsTx.status = "success";
              savingsTx.paymentMethod = actualPaymentType;
              savingsTx.orderId = cleanOrderId;
              if (cleanTxId) savingsTx.transactionId = cleanTxId;
              if (adminFeeDeducted > 0 && (!savingsTx.notes || !savingsTx.notes.includes("Biaya Admin"))) {
                savingsTx.notes = `${savingsTx.notes || "Setoran Tabungan (Midtrans Report)"} [Pokok: Rp ${netSavingsAmt.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`;
              }

              if (student) {
                student.savingsBalance = (Number(student.savingsBalance) || 0) + Number(savingsTx.amount);
                AUTHORITATIVE_SAVINGS_MAP[student.id] = student.savingsBalance;
                touchedStudentsMap.set(student.id, student);
              }
              touchedSavingsMap.set(savingsTx.id, savingsTx);

              reconciledCount++;
              totalAmountReconciled += savingsTx.amount;
              stateChanged = true;

              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
                type: "incoming",
                category: "Setoran Tabungan",
                amount: savingsTx.amount,
                description: `Setoran Tabungan Midtrans Online (${student?.name || "Siswa"}) [Order: ${cleanOrderId}]${adminFeeDeducted > 0 ? ` (Pokok Rp ${savingsTx.amount.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})` : ""}`,
                date: resolvedPaidAt.substring(0, 10),
                source: "savings",
                studentName: student?.name,
                studentId: student?.id,
                nis: student?.nis,
                createdBy: "Admin (Midtrans Bulk Report)",
                paymentMethod: "bank",
                orderId: cleanOrderId,
                transactionId: cleanTxId || undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              newKasTransactions.push(newKas);

              recordOrUpdateMidtransTransaction({
                orderId: cleanOrderId || `SAV-${Date.now()}`,
                transactionId: cleanTxId,
                billType: "savings",
                grossAmount: savingsTx.amount,
                studentName: student?.name,
                studentNis: student?.nis,
                description: adminFeeDeducted > 0
                  ? `Setoran Tabungan (Pokok Rp ${savingsTx.amount.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})`
                  : "Setoran Tabungan",
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
                message: adminFeeDeducted > 0
                  ? `BERHASIL DILUNASI! Setoran Tabungan Rp ${savingsTx.amount.toLocaleString("id-ID")} a.n ${student?.name || 'Siswa'} berhasil ditambahkan ke saldo tabungan (Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak ikut masuk ke saldo).`
                  : `BERHASIL DILUNASI! Setoran Tabungan Rp ${savingsTx.amount.toLocaleString("id-ID")} a.n ${student?.name || 'Siswa'} berhasil ditambahkan ke saldo tabungan.`
              });
            }
            continue;
          }

          // If no existing transaction record but targetStudent identified:
          if (targetStudent && amountVal > 0) {
            const { netAmount: netSavingsAmt, adminFeeDeducted } = resolveNetSavingsDepositAmount(amountVal, {
              paymentType: actualPaymentType,
              configuredAdminFee: midtransConfig.adminFee,
              reportFee: itemReportFee > 0 ? itemReportFee : undefined,
              explicitNetAmount: itemNetAmount > 0 ? itemNetAmount : undefined
            });

            const newSavingsTx: SavingsTransaction = {
              id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              studentId: targetStudent.id,
              studentNis: targetStudent.nis,
              type: "deposit",
              amount: netSavingsAmt,
              status: "success",
              createdAt: resolvedPaidAt,
              paymentMethod: actualPaymentType,
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              notes: adminFeeDeducted > 0
                ? `Setoran Tabungan (Midtrans Report Import) [Pokok: Rp ${netSavingsAmt.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`
                : `Setoran Tabungan (Midtrans Report Import)`
            };
            savingsTransactions.unshift(newSavingsTx);
            targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + netSavingsAmt;
            AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;
            touchedSavingsMap.set(newSavingsTx.id, newSavingsTx);
            touchedStudentsMap.set(targetStudent.id, targetStudent);

            reconciledCount++;
            totalAmountReconciled += netSavingsAmt;
            stateChanged = true;

            const newKas: TreasurerTransaction = {
              id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
              type: "incoming",
              category: "Setoran Tabungan",
              amount: netSavingsAmt,
              description: `Setoran Tabungan Midtrans Online (${targetStudent.name}) [Order: ${cleanOrderId}]${adminFeeDeducted > 0 ? ` (Pokok Rp ${netSavingsAmt.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})` : ""}`,
              date: resolvedPaidAt.substring(0, 10),
              source: "savings",
              studentName: targetStudent.name,
              studentId: targetStudent.id,
              nis: targetStudent.nis,
              createdBy: "Admin (Midtrans Bulk Report)",
              paymentMethod: "bank",
              orderId: cleanOrderId,
              transactionId: cleanTxId || undefined,
              fundingSource: "Kas Bank/Midtrans"
            };
            treasurerTransactions.unshift(newKas);
            newKasTransactions.push(newKas);

            recordOrUpdateMidtransTransaction({
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              billType: "savings",
              grossAmount: netSavingsAmt,
              studentName: targetStudent.name,
              studentNis: targetStudent.nis,
              description: adminFeeDeducted > 0
                ? `Setoran Tabungan (Pokok Rp ${netSavingsAmt.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})`
                : "Setoran Tabungan",
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
              amount: netSavingsAmt,
              reportStatus: rawStatus,
              reportPaymentType: actualPaymentType,
              reportTime: resolvedPaidAt,
              reconciliationStatus: "reconciled",
              message: adminFeeDeducted > 0
                ? `BERHASIL DILUNASI! Setoran Tabungan Rp ${netSavingsAmt.toLocaleString("id-ID")} a.n ${targetStudent.name} (NIS: ${targetStudent.nis}) berhasil ditambahkan ke saldo tabungan (Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak ikut masuk ke saldo).`
                : `BERHASIL DILUNASI! Setoran Tabungan Rp ${netSavingsAmt.toLocaleString("id-ID")} a.n ${targetStudent.name} (NIS: ${targetStudent.nis}) berhasil ditambahkan ke saldo tabungan.`
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
            } else if (miscBill.isVoidedByAdmin || voidedPayments.some(v => v.billId === miscBill.id)) {
              voidedByAdminCount++;
              results.push({
                orderId: cleanOrderId || cleanTxId,
                transactionId: cleanTxId,
                studentName: student?.name || "-",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: miscBill.title,
                amount: miscBill.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime,
                reconciliationStatus: "voided_by_admin",
                message: `DIBATALKAN ADMIN: Tagihan Non-SPP "${miscBill.title}" a.n ${student?.name || 'Siswa'} telah dibatalkan / dikoreksi oleh Admin sekolah.`
              });
            } else {
              miscBill.status = "paid";
              miscBill.paidAt = resolvedPaidAt;
              miscBill.paymentMethod = actualPaymentType;
              miscBill.orderId = cleanOrderId || miscBill.orderId;
              if (cleanTxId) miscBill.transactionId = cleanTxId;

              touchedMiscMap.set(miscBill.id, miscBill);

              reconciledCount++;
              totalAmountReconciled += miscBill.amount;
              stateChanged = true;

              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
                type: "incoming",
                category: miscBill.title || "Tagihan Non-SPP",
                amount: Number(miscBill.amount) || 0,
                description: `Pembayaran Online Midtrans: ${miscBill.title} (${student?.name || "Siswa"}) [Order: ${cleanOrderId || miscBill.orderId || "-"}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "custom",
                studentName: student?.name,
                studentId: student?.id,
                nis: student?.nis,
                createdBy: "Admin (Midtrans Bulk Report)",
                paymentMethod: "bank",
                orderId: cleanOrderId || miscBill.orderId || undefined,
                transactionId: cleanTxId || undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              newKasTransactions.push(newKas);

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
          let sppBill = findSppBillMatching(cleanOrderId, sppBills, targetStudent?.id, { description: rawDesc, month: rowMonth, year: rowYear, miscBillsList: miscBills, studentsList: students }) ||
                        (cleanTxId ? findSppBillMatching(cleanTxId, sppBills, targetStudent?.id, { description: rawDesc, month: rowMonth, year: rowYear, miscBillsList: miscBills, studentsList: students }) : undefined);

          if (!sppBill && (cleanOrderId.startsWith("SPP-") || cleanOrderId.includes("SPP-"))) {
            const middle = cleanOrderId.includes("SPP-") ? cleanOrderId.split("SPP-")[1] : cleanOrderId;
            const lastHyphenIndex = middle.lastIndexOf("-");
            const billIdPart = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
            sppBill = findSppBillMatching(billIdPart, sppBills, targetStudent?.id, { description: rawDesc, month: rowMonth, year: rowYear, miscBillsList: miscBills, studentsList: students });
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
            } else if (sppBill.isVoidedByAdmin || voidedPayments.some(v => v.billId === sppBill.id)) {
              voidedByAdminCount++;
              results.push({
                orderId: cleanOrderId || cleanTxId,
                transactionId: cleanTxId,
                studentName: student?.name || "-",
                studentNis: student?.nis || "-",
                studentClass: student?.class || "-",
                category: `SPP ${sppBill.month} ${sppBill.year}`,
                amount: sppBill.amount,
                reportStatus: rawStatus,
                reportPaymentType: actualPaymentType,
                reportTime,
                reconciliationStatus: "voided_by_admin",
                message: `DIBATALKAN ADMIN: Tagihan SPP ${sppBill.month} ${sppBill.year} a.n ${student?.name || 'Siswa'} telah dibatalkan / dikoreksi oleh Admin sekolah.`
              });
            } else {
              sppBill.status = "paid";
              sppBill.paidAt = resolvedPaidAt;
              sppBill.paymentMethod = actualPaymentType;
              sppBill.orderId = cleanOrderId || sppBill.orderId;
              if (cleanTxId) sppBill.transactionId = cleanTxId;

              touchedSppMap.set(sppBill.id, sppBill);

              reconciledCount++;
              totalAmountReconciled += sppBill.amount;
              stateChanged = true;

              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
                type: "incoming",
                category: `SPP ${sppBill.month} ${sppBill.year}`,
                amount: Number(sppBill.amount) || 0,
                description: `Pembayaran Online Midtrans: SPP ${sppBill.month} ${sppBill.year} (${student?.name || "Siswa"}) [Order: ${cleanOrderId || sppBill.orderId || "-"}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "spp",
                studentName: student?.name,
                studentId: student?.id,
                nis: student?.nis,
                createdBy: "Admin (Midtrans Bulk Report)",
                paymentMethod: "bank",
                orderId: cleanOrderId || sppBill.orderId || undefined,
                transactionId: cleanTxId || undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              newKasTransactions.push(newKas);

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

              touchedSppMap.set(fallbackSpp.id, fallbackSpp);

              reconciledCount++;
              totalAmountReconciled += fallbackSpp.amount;
              stateChanged = true;

              const newKas: TreasurerTransaction = {
                id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
                type: "incoming",
                category: `SPP ${fallbackSpp.month} ${fallbackSpp.year}`,
                amount: Number(fallbackSpp.amount) || 0,
                description: `Pembayaran Online Midtrans: SPP ${fallbackSpp.month} ${fallbackSpp.year} (${targetStudent.name}) [Order: ${cleanOrderId || fallbackSpp.orderId || "-"}]`,
                date: resolvedPaidAt.substring(0, 10),
                source: "spp",
                studentName: targetStudent.name,
                studentId: targetStudent.id,
                nis: targetStudent.nis,
                createdBy: "Admin (Midtrans Bulk Report)",
                paymentMethod: "bank",
                orderId: cleanOrderId || fallbackSpp.orderId || undefined,
                transactionId: cleanTxId || undefined,
                fundingSource: "Kas Bank/Midtrans"
              };
              treasurerTransactions.unshift(newKas);
              newKasTransactions.push(newKas);

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
            resolvedPaidAt,
            { description: rawDesc }
          );

          const effectiveAllocAmt = alloc.amountReconciled > 0 ? alloc.amountReconciled : (alloc.savingsDeposited > 0 ? alloc.savingsDeposited : amountVal);

          alloc.affectedSppBills.forEach(b => touchedSppMap.set(b.id, b));
          alloc.affectedMiscBills.forEach(m => touchedMiscMap.set(m.id, m));
          alloc.affectedSavingsTxs.forEach(t => touchedSavingsMap.set(t.id, t));
          touchedStudentsMap.set(targetStudent.id, targetStudent);

          reconciledCount++;
          totalAmountReconciled += effectiveAllocAmt;
          stateChanged = true;

          const newKas: TreasurerTransaction = {
            id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${reconciledCount}`,
            type: "incoming",
            category: alloc.category,
            amount: effectiveAllocAmt,
            description: `Pembayaran Online Midtrans: ${alloc.category} (${targetStudent.name}) [Order: ${cleanOrderId || `MT-${Date.now()}`}]`,
            date: resolvedPaidAt.substring(0, 10),
            source: alloc.paidSppCount > 0 ? "spp" : (alloc.paidMiscCount > 0 ? "custom" : "savings"),
            studentName: targetStudent.name,
            studentId: targetStudent.id,
            nis: targetStudent.nis,
            createdBy: "Admin (Midtrans Bulk Report)",
            paymentMethod: "bank",
            orderId: cleanOrderId || undefined,
            transactionId: cleanTxId || undefined,
            fundingSource: "Kas Bank/Midtrans"
          };
          treasurerTransactions.unshift(newKas);
          newKasTransactions.push(newKas);

          recordOrUpdateMidtransTransaction({
            orderId: cleanOrderId || `MT-${Date.now()}`,
            transactionId: cleanTxId,
            billType: alloc.paidSppCount > 0 ? "spp" : (alloc.paidMiscCount > 0 ? "misc" : "savings"),
            grossAmount: effectiveAllocAmt,
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
            amount: effectiveAllocAmt,
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

        if (persistEntities) {
          try {
            const sppList = Array.from(touchedSppMap.values());
            if (sppList.length > 0) {
              await persistEntities("sppBills", sppList);
            }
            const miscList = Array.from(touchedMiscMap.values());
            if (miscList.length > 0) {
              await persistEntities("miscBills", miscList);
            }
            const savList = Array.from(touchedSavingsMap.values());
            if (savList.length > 0) {
              await persistEntities("savingsTransactions", savList);
            }
            const stdList = Array.from(touchedStudentsMap.values());
            if (stdList.length > 0) {
              await persistEntities("students", stdList);
            }
            if (newKasTransactions.length > 0) {
              await persistEntities("treasurerTransactions", newKasTransactions);
            }
          } catch (dbErr: any) {
            console.error("[Midtrans Bulk Report] Error saving to MySQL:", dbErr?.message || dbErr);
          }
        }

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
          voidedByAdminCount,
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
        adminFee: manualAdminFee,
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
        if (persistEntity) {
          await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting Kas to MySQL:", err));
        }

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
        // Pastikan biaya admin bank tidak ikut masuk ke dalam saldo tabungan siswa
        let existingSavTx = savingsTransactions.find(
          t =>
            (cleanOrderId && t.orderId === cleanOrderId) ||
            (cleanTxId && t.transactionId === cleanTxId) ||
            t.id === cleanOrderId
        );
        if (!existingSavTx) {
          existingSavTx = savingsTransactions.find(
            t => t.studentId === targetStudent!.id && t.status === "pending"
          );
        }

        const { netAmount: netSavingsAmount, adminFeeDeducted } = resolveNetSavingsDepositAmount(amountVal, {
          paymentType,
          configuredAdminFee: midtransConfig.adminFee,
          explicitAdminFee: manualAdminFee !== undefined && manualAdminFee !== null && manualAdminFee !== "" ? Number(manualAdminFee) : undefined,
          explicitAdminFeeProvided: manualAdminFee !== undefined && manualAdminFee !== null && manualAdminFee !== "",
          existingPrincipalAmount: existingSavTx?.amount
        });

        let savedTx: SavingsTransaction;
        if (existingSavTx && existingSavTx.status !== "success") {
          existingSavTx.amount = netSavingsAmount;
          existingSavTx.status = "success";
          existingSavTx.paymentMethod = paymentType;
          existingSavTx.orderId = cleanOrderId;
          if (cleanTxId) existingSavTx.transactionId = cleanTxId;
          existingSavTx.notes = adminFeeDeducted > 0
            ? `${notes || existingSavTx.notes || `Setoran Tabungan Manual Reconcile (${cleanOrderId})`} [Pokok: Rp ${netSavingsAmount.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`
            : (notes || existingSavTx.notes || `Setoran Tabungan Manual Reconcile (${cleanOrderId})`);
          savedTx = existingSavTx;
        } else {
          savedTx = {
            id: `sav-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            studentId: targetStudent.id,
            studentNis: targetStudent.nis,
            type: "deposit",
            amount: netSavingsAmount,
            status: "success",
            createdAt: resolvedPaidAt,
            paymentMethod: paymentType,
            orderId: cleanOrderId,
            transactionId: cleanTxId,
            notes: adminFeeDeducted > 0
              ? `${notes || `Setoran Tabungan Manual Reconcile (${cleanOrderId})`} [Pokok: Rp ${netSavingsAmount.toLocaleString("id-ID")}, Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} tidak masuk saldo]`
              : (notes || `Setoran Tabungan Manual Reconcile (${cleanOrderId})`)
          };
          savingsTransactions.unshift(savedTx);
        }

        targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + netSavingsAmount;
        AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;

        const existingKas = treasurerTransactions.find(
          t => (cleanOrderId && t.orderId === cleanOrderId) || (cleanTxId && t.transactionId === cleanTxId)
        );
        let newKas: TreasurerTransaction | undefined;
        if (!existingKas && netSavingsAmount > 0) {
          newKas = {
            id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: "Setoran Tabungan",
            amount: netSavingsAmount,
            description: `Setoran Tabungan Midtrans (Manual Reconcile - ${targetStudent.name}) [Order: ${cleanOrderId}]${adminFeeDeducted > 0 ? ` (Pokok Rp ${netSavingsAmount.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})` : ""}`,
            date: resolvedPaidAt.substring(0, 10),
            source: "savings",
            studentName: targetStudent.name,
            studentId: targetStudent.id,
            nis: targetStudent.nis,
            createdBy: "Bendahara (Manual Reconcile)",
            paymentMethod: "bank",
            orderId: cleanOrderId,
            transactionId: cleanTxId,
            fundingSource: "Kas Bank/Midtrans"
          };
          treasurerTransactions.unshift(newKas);
        }

        recordOrUpdateMidtransTransaction({
          orderId: cleanOrderId,
          transactionId: cleanTxId,
          billType: "savings",
          grossAmount: netSavingsAmount,
          studentName: targetStudent.name,
          studentNis: targetStudent.nis,
          description: adminFeeDeducted > 0
            ? `Setoran Tabungan (Pokok Rp ${netSavingsAmount.toLocaleString("id-ID")}, Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")})`
            : "Setoran Tabungan (Manual Reconcile)",
          transactionStatus: "settlement",
          paymentType,
          settlementTime: resolvedPaidAt
        });

        saveState();
        if (persistEntity) {
          await persistEntity("savingsTransactions", savedTx).catch(err => console.error("Error persisting savings to MySQL:", err));
          await persistEntity("students", targetStudent).catch(err => console.error("Error persisting student balance to MySQL:", err));
          if (newKas) {
            await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting savings kas to MySQL:", err));
          }
        }

        return res.json({
          success: true,
          message: adminFeeDeducted > 0
            ? `Berhasil menambahkan Rp ${netSavingsAmount.toLocaleString("id-ID")} ke Saldo Tabungan a.n ${targetStudent.name} (NIS: ${targetStudent.nis}). Biaya Admin Bank Rp ${adminFeeDeducted.toLocaleString("id-ID")} otomatis dipisahkan dan tidak masuk ke saldo tabungan.`
            : `Berhasil menambahkan Rp ${netSavingsAmount.toLocaleString("id-ID")} ke Saldo Tabungan a.n ${targetStudent.name} (NIS: ${targetStudent.nis}).`,
          allocationType: "savings",
          netSavingsAmount,
          adminFeeDeducted,
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
            bill.isVoidedByAdmin = false;
            delete bill.voidedAt;
            delete bill.voidReason;

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

            const newKas: TreasurerTransaction = {
              id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: "incoming",
              category: `SPP ${bill.month} ${bill.year}`,
              amount: Number(bill.amount) || 0,
              description: `Pembayaran Online Midtrans: SPP ${bill.month} ${bill.year} (${targetStudent.name}) [Order: ${cleanOrderId}]`,
              date: resolvedPaidAt.substring(0, 10),
              source: "spp",
              studentName: targetStudent.name,
              studentId: targetStudent.id,
              nis: targetStudent.nis,
              createdBy: "Bendahara (Manual Reconcile)",
              paymentMethod: "bank",
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              fundingSource: "Kas Bank/Midtrans"
            };
            treasurerTransactions.unshift(newKas);

            saveState();
            if (persistEntity) {
              await persistEntity("sppBills", bill).catch(err => console.error("Error persisting SPP to MySQL:", err));
              await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting SPP Kas to MySQL:", err));
            }

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
            mBill.isVoidedByAdmin = false;
            delete mBill.voidedAt;
            delete mBill.voidReason;

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

            const newKas: TreasurerTransaction = {
              id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: "incoming",
              category: mBill.title || "Tagihan Non-SPP",
              amount: Number(mBill.amount) || 0,
              description: `Pembayaran Online Midtrans: ${mBill.title} (${targetStudent.name}) [Order: ${cleanOrderId}]`,
              date: resolvedPaidAt.substring(0, 10),
              source: "custom",
              studentName: targetStudent.name,
              studentId: targetStudent.id,
              nis: targetStudent.nis,
              createdBy: "Bendahara (Manual Reconcile)",
              paymentMethod: "bank",
              orderId: cleanOrderId,
              transactionId: cleanTxId,
              fundingSource: "Kas Bank/Midtrans"
            };
            treasurerTransactions.unshift(newKas);

            saveState();
            if (persistEntity) {
              await persistEntity("miscBills", mBill).catch(err => console.error("Error persisting Misc to MySQL:", err));
              await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting Misc Kas to MySQL:", err));
            }

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

      const newKas: TreasurerTransaction = {
        id: `trx-kas-mt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "incoming",
        category: allocResult.category,
        amount: amountVal,
        description: `Pembayaran Online Midtrans: ${allocResult.category} (${targetStudent.name}) [Order: ${cleanOrderId}]`,
        date: resolvedPaidAt.substring(0, 10),
        source: allocResult.paidSppCount > 0 ? "spp" : (allocResult.paidMiscCount > 0 ? "custom" : "savings"),
        studentName: targetStudent.name,
        studentId: targetStudent.id,
        nis: targetStudent.nis,
        createdBy: "Bendahara (Manual Reconcile)",
        paymentMethod: "bank",
        orderId: cleanOrderId,
        transactionId: cleanTxId,
        fundingSource: "Kas Bank/Midtrans"
      };
      treasurerTransactions.unshift(newKas);

      saveState();
      if (persistEntities) {
        if (allocResult.affectedSppBills.length > 0) {
          await persistEntities("sppBills", allocResult.affectedSppBills).catch(err => console.error("Error persisting auto SPP to MySQL:", err));
        }
        if (allocResult.affectedMiscBills.length > 0) {
          await persistEntities("miscBills", allocResult.affectedMiscBills).catch(err => console.error("Error persisting auto Misc to MySQL:", err));
        }
        if (allocResult.affectedSavingsTxs.length > 0) {
          await persistEntities("savingsTransactions", allocResult.affectedSavingsTxs).catch(err => console.error("Error persisting auto Savings to MySQL:", err));
        }
      }
      if (persistEntity) {
        await persistEntity("students", targetStudent).catch(err => console.error("Error persisting student balance to MySQL:", err));
        await persistEntity("treasurerTransactions", newKas).catch(err => console.error("Error persisting Kas to MySQL:", err));
      }

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
        const studentUnpaidSpp = sppBills
          .filter(b => b.studentId === s.id && (b.status === "unpaid" || b.status === "pending"))
          .sort((a, b) => {
            const yearDiff = (a.year || 2026) - (b.year || 2026);
            if (yearDiff !== 0) return yearDiff;
            const idxA = ACADEMIC_MONTHS.indexOf(a.month);
            const idxB = ACADEMIC_MONTHS.indexOf(b.month);
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });
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

  // 20. Admin Single Bill Reconcile Endpoint
  router.post("/admin/reconcile-bill", async (req, res) => {
    try {
      const { billId, billType = "spp", studentId } = req.body;
      if (!billId) {
        return res.status(400).json({ error: "billId wajib disertakan." });
      }

      if (billType === "savings") {
        const savingsTx = savingsTransactions.find(t => t.id === billId);
        if (!savingsTx) {
          return res.status(404).json({ error: "Transaksi tabungan tidak ditemukan dalam database." });
        }

        const targetStudent = students.find(s =>
          s.id === savingsTx.studentId ||
          (savingsTx.studentId && s.nis === savingsTx.studentId) ||
          (studentId && (s.id === studentId || s.nis === studentId))
        );

        if (savingsTx.status === "success") {
          return res.json({
            success: true,
            settled: true,
            alreadyPaid: true,
            status: "success",
            message: `Setoran tabungan sebesar Rp ${Number(savingsTx.amount || 0).toLocaleString("id-ID")} sudah berhasil masuk ke saldo siswa.`,
            bill: savingsTx
          });
        }

        let orderId = savingsTx.orderId;
        if (!orderId && targetStudent) {
          const candTx = midtransTransactions.find(t =>
            (t.studentNis && String(t.studentNis).trim() === String(targetStudent.nis).trim()) &&
            (t.transactionStatus === "pending" || t.transactionStatus === "settlement") &&
            (t.billType === "savings" || (t.orderId && (t.orderId.startsWith("SAV-") || t.orderId.startsWith("CART-") || t.orderId.startsWith("COLLECTIVE-CART-"))))
          );
          if (candTx) {
            orderId = candTx.orderId;
            savingsTx.orderId = orderId;
          }
        }

        if (!orderId) {
          return res.json({
            success: true,
            settled: false,
            status: savingsTx.status || "pending",
            message: `Transaksi tabungan ini belum memiliki referensi Order ID Midtrans.`,
            bill: savingsTx
          });
        }

        const midtransStatus = await getMidtransStatus(orderId);
        let rawStatus = midtransStatus?.transaction_status ? String(midtransStatus.transaction_status).toLowerCase() : null;

        if (!rawStatus) {
          const localRec = midtransTransactions.find(t => t.orderId === orderId);
          if (localRec) rawStatus = String(localRec.transactionStatus).toLowerCase();
        }

        if (!rawStatus) {
          return res.json({
            success: true,
            settled: false,
            status: savingsTx.status,
            orderId,
            message: `Order ID ${orderId} belum tercatat di Gateway Midtrans.`,
            bill: savingsTx
          });
        }

        const isSettled = rawStatus === "settlement" || rawStatus === "capture" || rawStatus === "success";
        const isPending = rawStatus === "pending" || rawStatus === "challenge";
        const isExpired = rawStatus === "expire" || rawStatus === "cancel" || rawStatus === "deny" || rawStatus === "failure";

        if (isSettled) {
          const reconResult = await processMidtransOrderStatus(orderId, midtransStatus);
          const updatedTx = savingsTransactions.find(t => t.id === savingsTx.id) || savingsTx;
          if (updatedTx.status !== "success" && !updatedTx.isVoidedByAdmin) {
            updatedTx.status = "success";
            if (targetStudent) {
              targetStudent.savingsBalance = (Number(targetStudent.savingsBalance) || 0) + Number(updatedTx.amount || 0);
              AUTHORITATIVE_SAVINGS_MAP[targetStudent.id] = targetStudent.savingsBalance;
            }
            if (persistEntity) {
              await persistEntity("savingsTransactions", updatedTx).catch(err => console.error("Error persisting settled Savings tx to MySQL:", err));
              if (targetStudent) {
                await persistEntity("students", targetStudent).catch(err => console.error("Error persisting student savings balance to MySQL:", err));
              }
            }
            saveState();
          }

          return res.json({
            success: true,
            settled: true,
            actionTaken: reconResult.actionTaken || true,
            status: "success",
            orderId,
            message: `BERHASIL! Setoran tabungan sebesar Rp ${Number(updatedTx.amount || 0).toLocaleString("id-ID")} terverifikasi LUNAS di Midtrans dan telah masuk ke saldo tabungan siswa.`,
            bill: updatedTx,
            reconResult
          });
        }

        if (isPending) {
          savingsTx.status = "pending";
          saveState();
          return res.json({
            success: true,
            settled: false,
            status: "pending",
            orderId,
            message: `Status setoran tabungan di Midtrans: PENDING (Menunggu pembayaran diselesaikan oleh siswa/wali murid).`,
            bill: savingsTx
          });
        }

        if (isExpired) {
          savingsTx.status = "failed";
          if (persistEntity) {
            await persistEntity("savingsTransactions", savingsTx).catch(err => console.error("Error persisting expired Savings tx to MySQL:", err));
          }
          saveState();
          return res.json({
            success: true,
            settled: false,
            status: "failed",
            orderId,
            message: `Status pembayaran di Midtrans: ${rawStatus.toUpperCase()} (Kadaluarsa/Dibatalkan). Setoran tabungan telah dibatalkan.`,
            bill: savingsTx
          });
        }

        return res.json({
          success: true,
          settled: false,
          status: savingsTx.status,
          orderId,
          message: `Status transaksi tabungan di Midtrans: ${rawStatus.toUpperCase()}.`,
          bill: savingsTx
        });
      }

      let sppBill = sppBills.find(b => b.id === billId);
      let miscBill = miscBills.find(m => m.id === billId);

      const targetBill = (billType === "misc" && miscBill) ? miscBill : (sppBill || miscBill);
      if (!targetBill) {
        return res.status(404).json({ error: "Tagihan tidak ditemukan dalam database." });
      }

      const effectiveBillType: "spp" | "misc" = targetBill === miscBill ? "misc" : "spp";
      const targetStudent = students.find(s => 
        s.id === targetBill.studentId || 
        (targetBill.studentId && s.nis === targetBill.studentId) ||
        (studentId && (s.id === studentId || s.nis === studentId))
      );

      // If already paid
      if (targetBill.status === "paid") {
        return res.json({
          success: true,
          settled: true,
          alreadyPaid: true,
          status: "paid",
          message: `Tagihan ${effectiveBillType === 'spp' ? `SPP ${(targetBill as SppBill).month} ${(targetBill as SppBill).year}` : (targetBill as MiscBill).title} sudah LUNAS di database sekolah.`,
          bill: targetBill
        });
      }

      // Resolve orderId
      let orderId = targetBill.orderId;
      if (!orderId && targetStudent) {
        const candTx = midtransTransactions.find(t => 
          (t.studentNis && String(t.studentNis).trim() === String(targetStudent.nis).trim()) &&
          (t.transactionStatus === "pending" || t.transactionStatus === "settlement") &&
          (effectiveBillType === "spp" && sppBill ? (t.description && t.description.toLowerCase().includes(sppBill.month.toLowerCase())) : true)
        );
        if (candTx) {
          orderId = candTx.orderId;
          targetBill.orderId = orderId;
        }
      }

      if (!orderId) {
        return res.json({
          success: true,
          settled: false,
          status: targetBill.status || "unpaid",
          message: `Tagihan ${effectiveBillType === 'spp' ? `SPP ${(targetBill as SppBill).month} ${(targetBill as SppBill).year}` : (targetBill as MiscBill).title} belum memiliki referensi transaksi online Midtrans.`,
          bill: targetBill
        });
      }

      // Query Midtrans Gateway status
      const midtransStatus = await getMidtransStatus(orderId);
      let rawStatus = midtransStatus?.transaction_status ? String(midtransStatus.transaction_status).toLowerCase() : null;

      if (!rawStatus) {
        const localRec = midtransTransactions.find(t => t.orderId === orderId);
        if (localRec) rawStatus = String(localRec.transactionStatus).toLowerCase();
      }

      if (!rawStatus) {
        return res.json({
          success: true,
          settled: false,
          status: targetBill.status,
          orderId,
          message: `Order ID ${orderId} belum tercatat di Gateway Midtrans.`,
          bill: targetBill
        });
      }

      const isSettled = rawStatus === "settlement" || rawStatus === "capture" || rawStatus === "success";
      const isPending = rawStatus === "pending" || rawStatus === "challenge";
      const isExpired = rawStatus === "expire" || rawStatus === "cancel" || rawStatus === "deny" || rawStatus === "failure";

      if (isSettled) {
        const reconResult = await processMidtransOrderStatus(orderId, midtransStatus);
        const updatedBill = effectiveBillType === "spp" ? sppBills.find(b => b.id === targetBill.id) : miscBills.find(m => m.id === targetBill.id);

        return res.json({
          success: true,
          settled: true,
          actionTaken: reconResult.actionTaken,
          status: "paid",
          orderId,
          message: reconResult.actionTaken
            ? `BERHASIL! Pembayaran tagihan terverifikasi LUNAS di Midtrans dan telah direkonsiliasikan ke database.`
            : (reconResult.detailMessage || "Status pembayaran terverifikasi Lunas di Midtrans."),
          bill: updatedBill || targetBill,
          reconResult
        });
      }

      if (isPending) {
        targetBill.status = "pending";
        saveState();
        return res.json({
          success: true,
          settled: false,
          status: "pending",
          orderId,
          message: `Status pembayaran di Midtrans: PENDING (Menunggu pembayaran diselesaikan oleh siswa/wali murid).`,
          bill: targetBill
        });
      }

      if (isExpired) {
        targetBill.status = "unpaid";
        saveState();
        return res.json({
          success: true,
          settled: false,
          status: "unpaid",
          orderId,
          message: `Status pembayaran di Midtrans: ${rawStatus.toUpperCase()} (Kadaluarsa/Dibatalkan). Tagihan telah dikembalikan ke status BELUM LUNAS.`,
          bill: targetBill
        });
      }

      return res.json({
        success: true,
        settled: false,
        status: targetBill.status,
        orderId,
        message: `Status transaksi di Midtrans: ${rawStatus.toUpperCase()}.`,
        bill: targetBill
      });
    } catch (err: any) {
      console.error("Admin reconcile bill error:", err);
      res.status(500).json({ error: "Gagal memproses pemeriksaan rekonsiliasi tagihan: " + (err.message || String(err)) });
    }
  });

  return router;
}
