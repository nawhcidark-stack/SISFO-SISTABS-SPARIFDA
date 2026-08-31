import { Router } from "express";
import { 
  Student, 
  SppBill, 
  MiscBill, 
  SavingsTransaction, 
  TreasurerTransaction, 
  RealtimeNotification, 
  MidtransConfig, 
  MidtransTransactionRecord 
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
  saveState: (skipRemoteSync?: boolean) => void;
  broadcastNotification: (notif: RealtimeNotification) => void;
  sendWhatsappNotification: (to: string, msg: string) => Promise<any>;
  saveConfigToMysql: (configId: string, data: any) => Promise<boolean>;
}

// ---------------- Helper Functions ----------------

export function decompressBillIdForMidtrans(id: string): string {
  if (!id) return id;
  if (id.startsWith("B-")) {
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

export function findSppBillMatching(idOrOrderId: string, sppBillsList: SppBill[], targetStudentId?: string): SppBill | undefined {
  if (!idOrOrderId) return undefined;
  const cleanKey = idOrOrderId.trim();
  let bill = sppBillsList.find(b => b.orderId === cleanKey || b.id === cleanKey || b.transactionId === cleanKey);
  if (bill) return bill;

  if (cleanKey.startsWith("SPP-")) {
    const withoutPrefix = cleanKey.slice(4);
    const lastHyphen = withoutPrefix.lastIndexOf("-");
    const extractedBillId = lastHyphen === -1 ? withoutPrefix : withoutPrefix.slice(0, lastHyphen);
    
    bill = sppBillsList.find(b => b.id === extractedBillId || b.id === `bill-std-${extractedBillId}`);
    if (bill) return bill;

    const decompressed = decompressBillIdForMidtrans(extractedBillId);
    bill = sppBillsList.find(b => b.id === decompressed);
    if (bill) return bill;
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
          treasurerTransactions.unshift({
            id: `tx-midtrans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: "SPP Siswa",
            amount: bill.amount,
            description: `Pembayaran Online SPP ${bill.month} ${bill.year} - ${student?.name || "Siswa"} (NIS: ${student?.nis || "-"})`,
            date: resolvedPaidAt.substring(0, 10),
            source: "spp",
            paymentMethod: "bank",
            fundingSource: "Mandiri",
            createdBy: "Midtrans Online Gateway",
            noBukti: targetOrderId
          });

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
          treasurerTransactions.unshift({
            id: `tx-midtrans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "incoming",
            category: "Tagihan Non-SPP",
            amount: bill.amount,
            description: `Pembayaran Online ${bill.title} - ${student?.name || "Siswa"} (NIS: ${student?.nis || "-"})`,
            date: resolvedPaidAt.substring(0, 10),
            source: "custom",
            paymentMethod: "bank",
            fundingSource: "Mandiri",
            createdBy: "Midtrans Online Gateway",
            noBukti: targetOrderId
          });

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
    else if (targetOrderId.startsWith("CART-") || cleanOrderId.startsWith("CART-")) {
      const activeOrderId = targetOrderId.startsWith("CART-") ? targetOrderId : cleanOrderId;
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
          detailMessage = `Keranjang pembayaran (${matchedSpp.length} SPP, ${matchedMisc.length} Non-SPP, ${matchedSavings.length} Tabungan) berhasil di-settle LUNAS.`;
        } else if (isExpired) {
          matchedSpp.forEach(b => { if (b.status === "pending") { b.status = "unpaid"; b.orderId = undefined; actionTaken = true; } });
          matchedMisc.forEach(m => { if (m.status === "pending") { m.status = "unpaid"; m.orderId = undefined; actionTaken = true; } });
          matchedSavings.forEach(t => { if (t.status === "pending") { t.status = "failed"; actionTaken = true; } });
          detailMessage = `Keranjang pembayaran direset karena expired/cancel.`;
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

      res.json({ token: data.token, redirect_url: data.redirect_url, orderId });
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

    const allSppIds = [
      ...(Array.isArray(sppBillIds) ? sppBillIds : []),
      ...(Array.isArray(billIds) ? billIds.filter((id: string) => typeof id === "string" && !id.startsWith("misc-") && !id.startsWith("sav-") && !id.startsWith("cart-savings-") && !id.startsWith("savings-deposit-")) : [])
    ];
    const allMiscIds = [
      ...(Array.isArray(miscBillIds) ? miscBillIds : []),
      ...(Array.isArray(billIds) ? billIds.filter((id: string) => typeof id === "string" && (id.startsWith("misc-") || miscBills.some(m => m.id === id))) : [])
    ];

    const selectedSpp = sppBills.filter(b => allSppIds.includes(b.id));
    const selectedMisc = miscBills.filter(b => allMiscIds.includes(b.id));
    const selectedSavings: { studentId?: string; amount: number; notes?: string }[] = [];

    if (Array.isArray(savingsDeposits) && savingsDeposits.length > 0) {
      savingsDeposits.forEach((sav: any) => {
        const val = Number(sav.amount || sav);
        if (!isNaN(val) && val > 0) {
          selectedSavings.push({ studentId: sav.studentId || reqStudentId, amount: val, notes: sav.notes || "Setoran Tabungan Siswa" });
        }
      });
    }

    if (selectedSpp.length === 0 && selectedMisc.length === 0 && selectedSavings.length === 0) {
      return res.status(400).json({ error: "Tidak ada tagihan atau setoran tabungan yang dipilih." });
    }

    const studentId = reqStudentId || selectedSpp[0]?.studentId || selectedMisc[0]?.studentId || selectedSavings[0]?.studentId;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan." });
    }

    const totalAmount = selectedSpp.reduce((sum, b) => sum + b.amount, 0) +
                        selectedMisc.reduce((sum, m) => sum + m.amount, 0) +
                        selectedSavings.reduce((sum, s) => sum + s.amount, 0);

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
        studentId: s.studentId || student.id,
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
        isMock: true
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
      selectedSavings.forEach(s => {
        itemDetails.push({ id: `SAV-${Date.now()}`.slice(0, 45), price: s.amount, quantity: 1, name: "Setoran Tabungan".slice(0, 45) });
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
        description: `Paket Pembayaran (${selectedSpp.length} SPP, ${selectedMisc.length} Non-SPP)`,
        transactionStatus: "pending",
        paymentType: "Midtrans Snap Cart"
      });

      res.json({ token: data.token, redirect_url: data.redirect_url, orderId });
    } catch (err: any) {
      console.error("Midtrans Cart API Error:", err);
      res.status(500).json({ error: err.message || "Gagal menghubungkan ke Midtrans" });
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

      res.json({ token: data.token, redirect_url: data.redirect_url, orderId });
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
        isMock: true
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

      res.json({ token: data.token, redirect_url: data.redirect_url, orderId });
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
      let parsedCount = 0;
      let reconciledCount = 0;

      for (const it of items) {
        const orderId = it.orderId || it.order_id || it["Order ID"];
        if (orderId) {
          parsedCount++;
          const result = await processMidtransOrderStatus(orderId);
          if (result.actionTaken && result.status === "settled") {
            reconciledCount++;
          }
        }
      }

      res.json({
        success: true,
        message: `Rekonsiliasi batch selesai. Diproses ${parsedCount} order, ${reconciledCount} tagihan berhasil dilunaskan.`,
        parsedCount,
        reconciledCount
      });
    } catch (e) {
      const err = e as Error;
      res.status(500).json({ error: "Gagal memproses rekonsiliasi batch: " + err.message });
    }
  });

  return router;
}
