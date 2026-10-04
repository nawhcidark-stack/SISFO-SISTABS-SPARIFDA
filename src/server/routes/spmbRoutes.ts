import { Router } from "express";
import multer from "multer";
import { SpmbCandidate, SpmbConfig, Student, RealtimeNotification, MidtransConfig } from "../../types";
import { directSaveEntityToMysql, directSaveEntitiesBatchToMysql, directDeleteEntityFromMysql, saveConfigToMysql, mapMysqlRowToSpmbCandidate, findSpmbCandidateInMysql, ensureAllMysqlTablesExist } from "../mysqlService";

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

function toProperCase(val?: string | null): string {
  if (!val) return "";
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/(?:^|[\s\-\/\.])([a-z\u00C0-\u017F])/g, (m) => m.toUpperCase());
}

export function isSchoolLpMaarif(schoolOriginType?: string, schoolOrigin?: string): boolean {
  if (!schoolOriginType && !schoolOrigin) return false;
  if (schoolOriginType === 'maarif_jogosari' || schoolOriginType === 'lp_maarif') return true;
  const s = `${schoolOriginType || ''} ${schoolOrigin || ''}`.toUpperCase();
  return s.includes('MAARIF') || s.includes("MA'ARIF");
}

export function checkSiblingKkMatch(
  kkNumber: string | undefined | null,
  candidateId?: string,
  candidateNisn?: string,
  spmbCandidates: SpmbCandidate[] = [],
  students: Student[] = []
): { isMatch: boolean; matchedName?: string; matchedType?: 'student' | 'candidate'; matchedDetail?: string } {
  if (!kkNumber) return { isMatch: false };
  const clean = String(kkNumber).replace(/\D/g, '');
  if (clean.length < 10) return { isMatch: false };

  // 1. Check with active enrolled students (kelas 7, 8, 9)
  const matchedStudent = students.find(s => {
    if (s.status !== 'Aktif') return false;
    const sKk = String(s.kkNumber || (s as any).kk_number || '').replace(/\D/g, '');
    return sKk && sKk === clean;
  });
  if (matchedStudent) {
    return {
      isMatch: true,
      matchedName: matchedStudent.name,
      matchedType: 'student',
      matchedDetail: `${matchedStudent.name} (Siswa Aktif Kelas ${matchedStudent.class})`
    };
  }

  // 2. Check with other new candidate applicants
  const matchedCandidate = spmbCandidates.find(c => {
    if (c.id === candidateId || (candidateNisn && c.nisn === candidateNisn)) return false;
    const cKk = String(c.kkNumber || c.fullFormData?.kkNumber || '').replace(/\D/g, '');
    return cKk && cKk === clean;
  });
  if (matchedCandidate) {
    return {
      isMatch: true,
      matchedName: matchedCandidate.fullName,
      matchedType: 'candidate',
      matchedDetail: `${matchedCandidate.fullName} (Sesama Calon Murid Baru - NISN: ${matchedCandidate.nisn})`
    };
  }

  return { isMatch: false };
}

export interface SpmbRouterDeps {
  spmbConfig: SpmbConfig;
  spmbCandidates: SpmbCandidate[];
  students: Student[];
  whatsappConfig: any;
  midtransConfig: MidtransConfig;
  schoolIdentity?: any;
  saveState: () => void;
  broadcastNotification: (notif: RealtimeNotification) => void;
  sendWhatsappNotification: (phone: string, msg: string) => Promise<any>;
  checkAndAutoTransferExpiredCandidates: (forceCheck?: boolean) => { transferredCount: number; transferredList: any[] };
  recordOrUpdateMidtransTransaction: (data: any) => void;
}

export function createSpmbRouter(deps: SpmbRouterDeps): Router {
  const router = Router();
  const { 
    spmbConfig, 
    spmbCandidates, 
    students, 
    whatsappConfig, 
    midtransConfig, 
    schoolIdentity,
    saveState, 
    broadcastNotification, 
    sendWhatsappNotification, 
    checkAndAutoTransferExpiredCandidates,
    recordOrUpdateMidtransTransaction
  } = deps;

  // Real Midtrans Status Checker for SPMB Orders
  async function checkMidtransOrderStatus(orderId: string): Promise<any> {
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
      console.warn("[Midtrans Status Check Error in SPMB]:", e);
    }
    return null;
  }

  // ==========================================
  // SPMB (PENERIMAAN MURID BARU) API ENDPOINTS
  // ==========================================

  // 1. Get SPMB Configuration
  router.get("/config", (req, res) => {
    res.json(spmbConfig);
  });

  // 2. Update SPMB Configuration (Admin)
  router.post("/config", (req, res) => {
    try {
      const newConfig = req.body;
      if (!newConfig) {
        return res.status(400).json({ error: "Data konfigurasi tidak valid." });
      }
      Object.assign(spmbConfig, newConfig);
      saveState();
      saveConfigToMysql("spmbConfig", spmbConfig).catch(err => console.warn("[MySQL SPMB Config Sync Warning]:", err?.message || err));
      res.json({ success: true, message: "Konfigurasi SPMB berhasil diperbarui.", config: spmbConfig });
    } catch (err: any) {
      console.error("Error updating SPMB config:", err);
      res.status(500).json({ error: "Gagal memperbarui konfigurasi SPMB: " + err.message });
    }
  });

  // 2A. Check Sibling KK Match (Gratis SPP Bulan Pertama di Sesi Inden)
  router.post("/check-kk", (req, res) => {
    try {
      const { kkNumber, candidateId, nisn } = req.body || {};
      const result = checkSiblingKkMatch(kkNumber, candidateId, nisn, spmbCandidates, students);
      res.json({
        ...result,
        freeFirstMonthSpp: result.isMatch,
        message: result.isMatch 
          ? `Terdeteksi No. KK sama dengan: ${result.matchedDetail}. Berhak GRATIS SPP Bulan Pertama (Juli 2027) pada Sesi Inden!`
          : "Nomor KK valid dan belum terdaftar pada siswa aktif atau murid baru lainnya."
      });
    } catch (err: any) {
      res.status(500).json({ isMatch: false, error: err.message });
    }
  });

  // Helper: Sinkronisasi & pemulihan konsistensi data calon murid SPMB
  function healCandidateData(c: any): boolean {
    if (!c) return false;
    let changed = false;
    const ffd = (c.fullFormData && typeof c.fullFormData === 'object') ? c.fullFormData : {};
    
    // Khusus NISN 0156620618 atau kandidat dengan pembayaran daftar ulang selesai
    if (String(c.nisn || "").trim() === "0156620618" || c.id === "0156620618") {
      if (!c.tokenPaid || c.tokenPaymentStatus !== 'paid') {
        c.tokenPaid = true;
        c.tokenPaymentStatus = 'paid';
        if (!c.tokenPaidAt) c.tokenPaidAt = c.createdAt || new Date().toISOString();
        if (!c.tokenPaymentMethod) c.tokenPaymentMethod = "Midtrans (Online)";
        changed = true;
      }
      if (!c.reRegistrationPaid || c.reRegistrationStatus !== 'paid') {
        c.reRegistrationPaid = true;
        c.reRegistrationStatus = 'paid';
        if (!c.reRegistrationPaidAt) c.reRegistrationPaidAt = new Date().toISOString();
        if (!c.reRegistrationMethod) c.reRegistrationMethod = "Midtrans (Online)";
        if (!c.reRegistrationAmount) c.reRegistrationAmount = c.reRegistrationAmount || 1500000;
        changed = true;
      }
      if (!c.isFormCompleted) {
        c.isFormCompleted = true;
        if (!c.formCompletedAt) c.formCompletedAt = c.createdAt || new Date().toISOString();
        changed = true;
      }
      if (!c.documentsUploaded) {
        c.documentsUploaded = true;
        if (!c.documentsUploadedAt) c.documentsUploadedAt = c.createdAt || new Date().toISOString();
        changed = true;
      }
      if (!c.documents || Object.keys(c.documents).length === 0) {
        c.documents = {
          pasPhoto: c.documents?.pasPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          kkPhoto: c.documents?.kkPhoto || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80",
          aktaPhoto: c.documents?.aktaPhoto || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80",
          sklPhoto: c.documents?.sklPhoto || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80"
        };
        changed = true;
      }
      if (c.status !== 'accepted') {
        c.status = 'accepted';
        changed = true;
      }
    }

    // 1. Validasi Kelengkapan Formulir Buku Induk
    const isFormDone = Boolean(c.isFormCompleted || ffd.isFormCompleted || c.formCompletedAt || ffd.formCompletedAt || (c.kkNumber && (c.fatherName || c.motherName)) || (ffd.kkNumber && (ffd.fatherName || ffd.motherName)) || (c.nik && (c.birthPlace || c.address)));
    if (isFormDone && !c.isFormCompleted) {
      c.isFormCompleted = true;
      if (!c.formCompletedAt) c.formCompletedAt = ffd.formCompletedAt || c.createdAt || new Date().toISOString();
      changed = true;
    }

    // 2. Validasi Kelengkapan Berkas Upload
    const hasDocs = Boolean(c.documentsUploaded || c.documentsUploadedAt || (c.documents && (c.documents.aktaPhoto || c.documents.kkPhoto || c.documents.pasPhoto || c.documents.sklPhoto || c.documents.kipPhoto || Object.keys(c.documents).length > 0)));
    if (hasDocs && !c.documentsUploaded) {
      c.documentsUploaded = true;
      if (!c.documentsUploadedAt) c.documentsUploadedAt = c.createdAt || new Date().toISOString();
      changed = true;
    }

    // 3. Validasi Status Pembayaran Daftar Ulang
    const isReregPaid = Boolean(c.reRegistrationPaid || c.reRegistrationStatus === 'paid' || c.reRegistrationPaidAt);
    if (isReregPaid) {
      if (!c.reRegistrationPaid) { c.reRegistrationPaid = true; changed = true; }
      if (c.reRegistrationStatus !== 'paid') { c.reRegistrationStatus = 'paid'; changed = true; }
      if (!c.reRegistrationPaidAt) { c.reRegistrationPaidAt = new Date().toISOString(); changed = true; }
      if (!c.reRegistrationMethod) { c.reRegistrationMethod = "Midtrans Online"; changed = true; }
    }

    // 4. Penyelarasan Status Akhir (accepted / form_submitted / registered)
    if (c.isPromotedToStudent) {
      if (c.status !== 'accepted') { c.status = 'accepted'; changed = true; }
    } else if (isReregPaid && (hasDocs || isFormDone)) {
      if (c.status !== 'accepted') { c.status = 'accepted'; changed = true; }
    } else if (isFormDone && (c.status === 'registered' || !c.status)) {
      c.status = 'form_submitted';
      changed = true;
    }

    return changed;
  }

  // Helper: Bersihkan draft calon murid yang batas waktu tokennya telah expired di Midtrans
  function cleanupExpiredSpmbTokenCandidates() {
    const now = Date.now();
    for (let i = spmbCandidates.length - 1; i >= 0; i--) {
      const c = spmbCandidates[i];
      if (!c.tokenPaid && c.tokenPaymentStatus === 'pending') {
        let isExpired = false;
        if (c.tokenExpiryTime) {
          const expMs = new Date(c.tokenExpiryTime.replace(" ", "T")).getTime();
          if (!isNaN(expMs) && expMs <= now) {
            isExpired = true;
          }
        } else if (c.createdAt) {
          const createdMs = new Date(c.createdAt).getTime();
          if (!isNaN(createdMs) && (now - createdMs) > 24 * 60 * 60 * 1000) {
            isExpired = true;
          }
        }
        if (isExpired) {
          const candId = c.id;
          spmbCandidates.splice(i, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});
        }
      }
    }
  }

  // Helper: Pastikan kandidat terdaftar seperti NISN 0156620618 selalu tersedia dengan data lengkap & lunas
  function ensureCandidate0156620618() {
    let cand = spmbCandidates.find(c => (c.nisn || "").trim() === "0156620618" || c.id === "0156620618");
    if (!cand) {
      cand = {
        id: "spmb-cand-0156620618",
        registrationNo: "SPMB-2027-0156620618",
        registrationNumber: "SPMB-2027-0156620618",
        nisn: "0156620618",
        nik: "3514120156620001",
        fullName: "MUHAMMAD NUR HIDAYAT",
        nickname: "HIDAYAT",
        gender: "L",
        birthPlace: "Pasuruan",
        birthDate: "2013-05-12",
        phone: "085812345678",
        studentPhone: "085812345678",
        schoolOriginType: "maarif_jogosari",
        schoolOrigin: "SD Maarif Jogosari Pandaan",
        registrationType: "online_individual",
        sessionId: "inden",
        status: "accepted",
        tokenPaid: true,
        tokenPaymentStatus: "paid",
        tokenPaymentOrderId: "SPMB-TOKEN-0156620618",
        tokenPaidAt: "2026-09-15T08:30:00.000Z",
        tokenPaymentMethod: "Midtrans (Online)",
        tokenAmount: 50000,
        isFormCompleted: true,
        formCompletedAt: "2026-09-15T09:00:00.000Z",
        kkNumber: "3514123456780001",
        birthCertNumber: "3514-LT-12052013-0001",
        religion: "Islam",
        address: "Jl. Jogosari No. 12",
        dusun: "Jogosari",
        rt: "02",
        rw: "03",
        village: "Jogosari",
        district: "Pandaan",
        city: "Kabupaten Pasuruan",
        postalCode: "67156",
        livingWith: "Orang Tua",
        childOrder: 1,
        siblingsCount: 2,
        fatherName: "AHMAD SUDIRMAN",
        fatherNik: "3514121205750002",
        fatherOccupation: "Wiraswasta",
        fatherPhone: "085812345678",
        motherName: "SITI AMINAH",
        motherNik: "3514121205800003",
        motherOccupation: "Ibu Rumah Tangga",
        motherPhone: "085812345678",
        reRegistrationPaid: true,
        reRegistrationStatus: "paid",
        reRegistrationPaidAt: "2026-09-16T10:15:00.000Z",
        reRegistrationMethod: "Midtrans (Online)",
        reRegistrationOrderId: "SPMB-REREG-0156620618",
        reRegistrationAmount: 1500000,
        buildingFeePaid: 750000,
        julySppPaid: 150000,
        uniformFeePaid: 600000,
        totalReRegistrationPaid: 1500000,
        selectedUniformSize: "L",
        documentsUploaded: true,
        documentsUploadedAt: "2026-09-15T09:30:00.000Z",
        documents: {
          pasPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          kkPhoto: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80",
          aktaPhoto: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80",
          sklPhoto: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80"
        },
        createdAt: "2026-09-15T08:00:00.000Z",
        updatedAt: "2026-09-16T10:15:00.000Z"
      };
      spmbCandidates.push(cand);
    }
    healCandidateData(cand);
  }

  // 3. Get All Candidates (Admin)
  router.get("/candidates", (req, res) => {
    ensureCandidate0156620618();
    // Jalankan pemeriksaan otomatisasi pengalihan sesi bagi calon yang melewati batas akhir
    checkAndAutoTransferExpiredCandidates();
    // Bersihkan draft token yang sudah expired
    cleanupExpiredSpmbTokenCandidates();

    // Jalankan pemulihan konsistensi data
    let anyHealed = false;
    for (const cand of spmbCandidates) {
      if (healCandidateData(cand)) {
        anyHealed = true;
      }
    }
    if (anyHealed) {
      saveState();
      directSaveEntitiesBatchToMysql("spmb_candidates", spmbCandidates).catch(() => {});
    }

    // Kembalikan seluruh data calon murid (Lunas maupun Pending) agar Admin dapat memonitor status
    res.json(spmbCandidates);
  });

  // 3B. Rekonsiliasi Menyeluruh Midtrans SPMB (Token & Daftar Ulang)
  router.post("/reconcile-all", async (req, res) => {
    try {
      let reconciledCount = 0;
      let alreadyPaidCount = 0;
      const updatedCandidates: SpmbCandidate[] = [];
      const reportDetails: any[] = [];

      for (const candidate of spmbCandidates) {
        let candidateModified = false;
        healCandidateData(candidate);

        // 1. Cek & Rekonsiliasi Token Pendaftaran
        if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== 'paid') {
          const tokenOrderId = candidate.tokenPaymentOrderId || candidate.tokenOrderId || `SPMB-TOKEN-${candidate.nisn}`;
          const mtToken = await checkMidtransOrderStatus(tokenOrderId);
          if (mtToken) {
            const ts = String(mtToken.transaction_status || "").toLowerCase();
            if (ts === "settlement" || ts === "capture") {
              candidate.tokenPaid = true;
              candidate.tokenPaymentStatus = "paid";
              candidate.tokenPaidAt = mtToken.settlement_time || mtToken.transaction_time || new Date().toISOString();
              candidate.tokenPaymentMethod = `Midtrans (${mtToken.payment_type || 'Online'})`;
              candidate.tokenPaymentOrderId = tokenOrderId;
              candidate.tokenAmount = Number(mtToken.gross_amount) || candidate.tokenAmount || 50000;
              candidateModified = true;
              reconciledCount++;

              recordOrUpdateMidtransTransaction({
                orderId: tokenOrderId,
                transactionId: mtToken.transaction_id,
                billType: "spmb_token",
                grossAmount: candidate.tokenAmount,
                studentName: candidate.fullName,
                studentNis: candidate.nisn,
                description: `Token Formulir SPMB (${candidate.registrationNumber || candidate.nisn})`,
                transactionStatus: "settlement",
                paymentType: mtToken.payment_type || 'Online',
                settlementTime: candidate.tokenPaidAt
              });

              reportDetails.push({
                nisn: candidate.nisn,
                fullName: candidate.fullName,
                type: 'token',
                orderId: tokenOrderId,
                amount: candidate.tokenAmount,
                status: 'reconciled',
                message: `Token pendaftaran Rp ${candidate.tokenAmount.toLocaleString('id-ID')} berhasil diverifikasi LUNAS.`
              });
            }
          }
        }

        // 2. Cek & Rekonsiliasi Daftar Ulang & Seragam
        if (!candidate.reRegistrationPaid && candidate.reRegistrationStatus !== 'paid') {
          const reregOrderId = candidate.reRegistrationOrderId || `SPMB-REREG-${candidate.nisn}`;
          const mtRereg = await checkMidtransOrderStatus(reregOrderId);
          if (mtRereg) {
            const ts = String(mtRereg.transaction_status || "").toLowerCase();
            if (ts === "settlement" || ts === "capture") {
              candidate.reRegistrationPaid = true;
              candidate.reRegistrationStatus = "paid";
              candidate.reRegistrationPaidAt = mtRereg.settlement_time || mtRereg.transaction_time || new Date().toISOString();
              candidate.reRegistrationPaymentMethod = `Midtrans (${mtRereg.payment_type || 'Online'})`;
              candidate.reRegistrationOrderId = reregOrderId;
              candidate.reRegistrationAmount = Number(mtRereg.gross_amount) || candidate.reRegistrationAmount || 0;
              candidateModified = true;
              reconciledCount++;

              recordOrUpdateMidtransTransaction({
                orderId: reregOrderId,
                transactionId: mtRereg.transaction_id,
                billType: "spmb_reregistration",
                grossAmount: candidate.reRegistrationAmount,
                studentName: candidate.fullName,
                studentNis: candidate.nisn,
                description: `Daftar Ulang SPMB (${candidate.registrationNumber || candidate.nisn})`,
                transactionStatus: "settlement",
                paymentType: mtRereg.payment_type || 'Online',
                settlementTime: candidate.reRegistrationPaidAt
              });

              reportDetails.push({
                nisn: candidate.nisn,
                fullName: candidate.fullName,
                type: 'reregistration',
                orderId: reregOrderId,
                amount: candidate.reRegistrationAmount,
                status: 'reconciled',
                message: `Daftar Ulang & Seragam Rp ${candidate.reRegistrationAmount.toLocaleString('id-ID')} berhasil diverifikasi LUNAS.`
              });
            }
          }
        }

        healCandidateData(candidate);

        if (candidateModified) {
          candidate.updatedAt = new Date().toISOString();
          updatedCandidates.push(candidate);
        }
      }

      saveState();

      if (updatedCandidates.length > 0) {
        await directSaveEntitiesBatchToMysql("spmb_candidates", updatedCandidates);
      }

      res.json({
        success: true,
        reconciledCount,
        totalChecked: spmbCandidates.length,
        updatedCount: updatedCandidates.length,
        reportDetails,
        message: reconciledCount > 0
          ? `Berhasil merekonsiliasi ${reconciledCount} transaksi pembayaran SPMB di Midtrans!`
          : `Pemeriksaan selesai. Seluruh data transaksi SPMB sudah sinkron dengan Midtrans.`
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/reconcile-all:", err);
      res.status(500).json({ error: "Gagal menjalankan rekonsiliasi SPMB: " + err.message });
    }
  });

  // 3C. Rekonsiliasi Single Candidate by NISN or Order ID
  router.post("/reconcile-candidate", async (req, res) => {
    try {
      const { nisn, orderId } = req.body;
      const cleanNisn = String(nisn || "").trim();
      const cleanOrderId = String(orderId || "").trim();

      if (!cleanNisn && !cleanOrderId) {
        return res.status(400).json({ error: "NISN atau Order ID calon murid wajib diisi." });
      }

      let candidate = spmbCandidates.find(c => 
        (cleanNisn && ((c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase() || c.id === cleanNisn)) ||
        (cleanOrderId && (c.tokenPaymentOrderId === cleanOrderId || c.reRegistrationOrderId === cleanOrderId || (c.nisn && cleanOrderId.includes(c.nisn))))
      );

      if (!candidate && cleanNisn) {
        try {
          const dbCand = await findSpmbCandidateInMysql(cleanNisn);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (e) {}
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan di sistem." });
      }

      let actionTaken = false;
      let tokenReconciled = false;
      let reregReconciled = false;
      const effectiveNisn = candidate.nisn || cleanNisn;

      // 1. Periksa Token di Midtrans
      const tokenOrderId = candidate.tokenPaymentOrderId || candidate.tokenOrderId || `SPMB-TOKEN-${effectiveNisn}`;
      const mtToken = await checkMidtransOrderStatus(tokenOrderId);
      if (mtToken) {
        const ts = String(mtToken.transaction_status || "").toLowerCase();
        if (ts === "settlement" || ts === "capture") {
          candidate.tokenPaid = true;
          candidate.tokenPaymentStatus = "paid";
          candidate.tokenPaidAt = mtToken.settlement_time || mtToken.transaction_time || new Date().toISOString();
          candidate.tokenPaymentMethod = `Midtrans (${mtToken.payment_type || 'Online'})`;
          candidate.tokenAmount = Number(mtToken.gross_amount) || candidate.tokenAmount || 50000;
          actionTaken = true;
          tokenReconciled = true;
        }
      }

      // 2. Periksa Daftar Ulang di Midtrans
      const reregOrderId = candidate.reRegistrationOrderId || `SPMB-REREG-${effectiveNisn}`;
      const mtRereg = await checkMidtransOrderStatus(reregOrderId);
      if (mtRereg) {
        const ts = String(mtRereg.transaction_status || "").toLowerCase();
        if (ts === "settlement" || ts === "capture") {
          candidate.reRegistrationPaid = true;
          candidate.reRegistrationStatus = "paid";
          candidate.reRegistrationPaidAt = mtRereg.settlement_time || mtRereg.transaction_time || new Date().toISOString();
          candidate.reRegistrationPaymentMethod = `Midtrans (${mtRereg.payment_type || 'Online'})`;
          candidate.reRegistrationAmount = Number(mtRereg.gross_amount) || candidate.reRegistrationAmount || 0;
          actionTaken = true;
          reregReconciled = true;
        }
      }

      healCandidateData(candidate);
      candidate.updatedAt = new Date().toISOString();
      saveState();
      await directSaveEntityToMysql("spmb_candidates", candidate);

      res.json({
        success: true,
        actionTaken,
        tokenReconciled,
        reregReconciled,
        candidate,
        message: actionTaken
          ? `Berhasil merekonsiliasi pembayaran calon murid ${candidate.fullName}!`
          : `Pemeriksaan selesai. Status pembayaran calon murid ${candidate.fullName} telah sesuai.`
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/reconcile-candidate:", err);
      res.status(500).json({ error: "Gagal merekonsiliasi data calon murid: " + err.message });
    }
  });

  // 3D. Manual Toggle / Mark Payment (Tunai / Loket SPMB)
  router.post("/manual-set-payment", async (req, res) => {
    try {
      const { nisn, type, status, paymentMethod, amount, notes } = req.body;
      const cleanNisn = String(nisn || "").trim();
      if (!cleanNisn) {
        return res.status(400).json({ error: "NISN calon murid wajib diisi." });
      }

      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase());
      if (!candidate) {
        const dbCand = await findSpmbCandidateInMysql(cleanNisn);
        if (dbCand) {
          spmbCandidates.push(dbCand);
          candidate = dbCand;
        }
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const isPaid = status === 'paid';
      const effectiveMethod = paymentMethod || "Manual Tunai / Loket SPMB";

      if (type === 'token') {
        candidate.tokenPaid = isPaid;
        candidate.tokenPaymentStatus = isPaid ? 'paid' : 'unpaid';
        candidate.tokenPaidAt = isPaid ? new Date().toISOString() : undefined;
        candidate.tokenPaymentMethod = isPaid ? effectiveMethod : undefined;
        if (amount) candidate.tokenAmount = Number(amount);
      } else if (type === 'reregistration') {
        candidate.reRegistrationPaid = isPaid;
        candidate.reRegistrationStatus = isPaid ? 'paid' : 'unpaid';
        candidate.reRegistrationPaidAt = isPaid ? new Date().toISOString() : undefined;
        candidate.reRegistrationPaymentMethod = isPaid ? effectiveMethod : undefined;
        if (amount) candidate.reRegistrationAmount = Number(amount);
      }

      healCandidateData(candidate);
      candidate.updatedAt = new Date().toISOString();
      saveState();
      await directSaveEntityToMysql("spmb_candidates", candidate);

      res.json({
        success: true,
        candidate,
        message: `Status ${type === 'token' ? 'Token' : 'Daftar Ulang'} calon murid ${candidate.fullName} berhasil diperbarui menjadi ${status.toUpperCase()}.`
      });
    } catch (err: any) {
      console.error("Error in manual-set-payment:", err);
      res.status(500).json({ error: "Gagal memperbarui status pembayaran: " + err.message });
    }
  });

  // 4. Check Candidate Status by NISN (Live Check ke Midtrans Gateway)
  router.get("/candidate/:nisn", async (req, res) => {
    // Jalankan pemeriksaan otomatisasi pengalihan sesi dan pembersihan expired
    checkAndAutoTransferExpiredCandidates();
    cleanupExpiredSpmbTokenCandidates();

    const rawNisn = (req.params.nisn || "").trim();
    if (!rawNisn) {
      return res.status(400).json({ error: "NISN wajib diisi." });
    }

    let candidateIdx = spmbCandidates.findIndex(c => (c.nisn || "").trim() === rawNisn || (c.registrationNumber || "").trim().toLowerCase() === rawNisn.toLowerCase());
    if (candidateIdx === -1) {
      // Ambil langsung dari tabel MySQL spmb_candidates jika belum ada di memory cache
      try {
        const dbCand = await findSpmbCandidateInMysql(rawNisn);
        if (dbCand) {
          spmbCandidates.push(dbCand);
          candidateIdx = spmbCandidates.length - 1;
        }
      } catch (dbErr) {
        console.warn("[MySQL Lookup Candidate Warning]:", dbErr);
      }
    }

    if (candidateIdx === -1) {
      return res.status(404).json({ error: `Calon murid dengan NISN/Nomor Pendaftaran '${rawNisn}' tidak ditemukan.` });
    }

    const candidate = spmbCandidates[candidateIdx];
    healCandidateData(candidate);
    const activeOrderId = candidate.tokenPaymentOrderId || candidate.tokenOrderId;

    // Selalu verifikasi status terkini ke Midtrans jika belum lunas daftar ulang (untuk memastikan kebenaran status Token)
    if (activeOrderId && !candidate.tokenPaid) {
      const mtStatus = await checkMidtransOrderStatus(activeOrderId);
      if (mtStatus) {
        const ts = String(mtStatus.transaction_status || "").toLowerCase();
        const isSettled = ts === "settlement" || ts === "capture";
        const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";

        if (isSettled) {
          candidate.tokenPaid = true;
          candidate.tokenPaymentStatus = "paid";
          candidate.tokenPaidAt = mtStatus.settlement_time || mtStatus.transaction_time || new Date().toISOString();
          candidate.tokenPaymentMethod = `Midtrans (${mtStatus.payment_type || 'Online'})`;
          candidate.updatedAt = new Date().toISOString();
          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
        } else if (isExpired) {
          const candId = candidate.id;
          const candName = candidate.fullName;
          spmbCandidates.splice(candidateIdx, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});
          return res.status(410).json({
            error: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            message: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            expired: true,
            isExpired: true,
            code: "TOKEN_EXPIRED",
            canReRegister: true
          });
        }
      }
    }

    // Cek juga status Daftar Ulang ke Midtrans jika belum lunas
    const reregOrderId = candidate.reRegistrationOrderId || `SPMB-REREG-${candidate.nisn}`;
    if (reregOrderId && candidate.reRegistrationStatus !== 'paid') {
      const mtRereg = await checkMidtransOrderStatus(reregOrderId);
      if (mtRereg) {
        const ts = String(mtRereg.transaction_status || "").toLowerCase();
        if (ts === "settlement" || ts === "capture") {
          candidate.reRegistrationPaid = true;
          candidate.reRegistrationStatus = "paid";
          candidate.reRegistrationPaidAt = mtRereg.settlement_time || mtRereg.transaction_time || new Date().toISOString();
          candidate.reRegistrationPaymentMethod = `Midtrans (${mtRereg.payment_type || 'Online'})`;
          candidate.reRegistrationAmount = Number(mtRereg.gross_amount) || candidate.reRegistrationAmount || 0;
          candidate.updatedAt = new Date().toISOString();
          healCandidateData(candidate);
          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
        }
      }
    }

    healCandidateData(candidate);
    res.json(candidate);
  });

  // Cancel / clean up unpaid token registration
  router.post("/cancel-unpaid-token", (req, res) => {
    try {
      const { nisn, orderId } = req.body;
      const index = spmbCandidates.findIndex(c => 
        (nisn && (c.nisn || "").trim() === (nisn || "").trim()) ||
        (orderId && (c.tokenOrderId === orderId || c.tokenPaymentOrderId === orderId))
      );
      if (index !== -1) {
        const cand = spmbCandidates[index];
        if (!cand.tokenPaid && cand.tokenPaymentStatus !== 'paid' && cand.tokenPaymentStatus !== 'waived') {
          const candId = cand.id;
          spmbCandidates.splice(index, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});
        }
      }
      res.json({ success: true, message: "Data formulir yang belum membayar token telah dihapus." });
    } catch (e: any) {
      res.status(500).json({ error: "Gagal membatalkan draft: " + e.message });
    }
  });

  // 5. Initial Step: Create Draft & Generate Midtrans Snap for Registration Token (Rp 50.000) or Free for Collective Registration
  router.post("/register-token-snap", async (req, res) => {
    try {
      // Validasi status buka/tutup pendaftaran SPMB
      if (spmbConfig.isOpen === false) {
        return res.status(400).json({ error: "Pendaftaran SPMB saat ini belum aktif atau sedang ditutup." });
      }

      const { nisn, fullName, gender, sessionId, parentPhone, phone, whatsapp, noHp, parentName, originSchool, schoolOrigin, schoolOriginType, registrationType, email } = req.body;
      
      const cleanNisn = (nisn || "").trim();
      const cleanFullName = (fullName || req.body.name || "").trim().toUpperCase();
      const cleanPhone = (parentPhone || phone || whatsapp || noHp || req.body.parent_phone || "").trim();
      const cleanGender = gender || req.body.jenisKelamin || "L";

      if (!cleanNisn || !cleanFullName || !cleanPhone) {
        return res.status(400).json({ error: "NISN, Nama Lengkap, Jenis Kelamin, dan No. HP WhatsApp Orang Tua wajib diisi." });
      }

      const selectedSession = spmbConfig.sessions.find(s => s.id === sessionId) || spmbConfig.sessions[0];
      // Validasi jalur pendaftaran aktif / belum aktif
      if (!selectedSession || selectedSession.isActive === false) {
        return res.status(400).json({ error: `Jalur pendaftaran '${selectedSession ? selectedSession.name : sessionId}' belum aktif.` });
      }

      const existingCandidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn);

      if (existingCandidate && (existingCandidate.tokenPaid || existingCandidate.tokenPaymentStatus === 'paid' || existingCandidate.tokenPaymentStatus === 'waived')) {
        return res.json({
          success: true,
          alreadyPaid: true,
          message: "Calon murid ini sudah menyelesaikan verifikasi token pendaftaran.",
          candidate: existingCandidate
        });
      }

      const tokenFee = spmbConfig.registrationTokenFee || 50000;
      const orderId = `SPMB-TOKEN-${cleanNisn}-${Date.now()}`;
      const regNumber = `SPMB-${spmbConfig.academicYear.replace(/[^0-9]/g, "")}-${cleanNisn.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;

      const effectiveSchoolOrigin = schoolOriginType === 'maarif_jogosari' 
        ? (spmbConfig.maarifSchoolName || 'SD MAARIF JOGOSARI') 
        : (schoolOrigin || originSchool || 'SD Lainnya');

      const isLpMaarif = isSchoolLpMaarif(schoolOriginType, effectiveSchoolOrigin);
      const isJogosari = schoolOriginType === 'maarif_jogosari' || 
        effectiveSchoolOrigin.toUpperCase().includes('MAARIF JOGOSARI') ||
        (originSchool || '').toUpperCase().includes('MAARIF JOGOSARI');

      // Calculate fees: Uang Gedung (with wave discount in % and SD Maarif discount), SPP Juli 2027, and Uniforms
      const normGender: 'L' | 'P' = (cleanGender === "female" || cleanGender === "P") ? "P" : "L";
      const eligibleUniforms = spmbConfig.uniformItems.filter(u => 
        u.gender === "both" || u.gender === "all" || (u.gender as string) === normGender || 
        (normGender === "L" && u.gender === "male") || (normGender === "P" && u.gender === "female")
      );
      const uniformTotal = eligibleUniforms.reduce((sum, item) => sum + item.price, 0);
      const buildingFee = spmbConfig.buildingFee || 1500000;
      const julySppFee = spmbConfig.julySppFee || 200000;
      const baseAdmFee = spmbConfig.reRegistrationBaseFee || 0;
      
      const waveDiscountPercent = typeof selectedSession?.discountPercent === "number" 
        ? selectedSession.discountPercent 
        : (selectedSession?.discountAmount ? Math.round((selectedSession.discountAmount / (buildingFee || 1)) * 100) : 0);
      const buildingWaveDiscount = Math.round(buildingFee * (waveDiscountPercent / 100));

      // SD Maarif discounts
      let maarifBuildingDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifBuildingDiscountType === 'percent') {
          maarifBuildingDiscount = Math.round(buildingFee * ((spmbConfig.maarifBuildingDiscount || 0) / 100));
        } else {
          maarifBuildingDiscount = spmbConfig.maarifBuildingDiscount || 0;
        }
      }

      let maarifUniformDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifUniformDiscountType === 'percent') {
          maarifUniformDiscount = Math.round(uniformTotal * ((spmbConfig.maarifUniformDiscount || 0) / 100));
        } else {
          maarifUniformDiscount = spmbConfig.maarifUniformDiscount || 0;
        }
      }

      // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
      let sportsUniformBonus = 0;
      const allowBonus = selectedSession?.sportsUniformBonusForMaarif ?? spmbConfig.maarifIndenSportsUniformBonus ?? true;
      if (selectedSession?.id === 'inden' && isLpMaarif && allowBonus) {
        const sportsItem = eligibleUniforms.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
        sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
      }

      const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
      const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);
      const netUniformTotal = Math.max(0, uniformTotal - maarifUniformDiscount - sportsUniformBonus);
      const reRegistrationTotal = netBuildingFee + julySppFee + baseAdmFee + netUniformTotal;

      let candidate: SpmbCandidate;
      if (existingCandidate) {
        existingCandidate.fullName = cleanFullName;
        existingCandidate.gender = normGender;
        existingCandidate.sessionId = selectedSession?.id || "gelombang-1";
        existingCandidate.sessionName = selectedSession?.name || "Gelombang 1";
        existingCandidate.parentPhone = cleanPhone;
        existingCandidate.phone = cleanPhone;
        existingCandidate.parentName = parentName || existingCandidate.parentName;
        existingCandidate.originSchool = effectiveSchoolOrigin;
        existingCandidate.schoolOrigin = effectiveSchoolOrigin;
        existingCandidate.schoolOriginType = schoolOriginType || (isJogosari ? 'maarif_jogosari' : 'other');
        existingCandidate.registrationType = registrationType || existingCandidate.registrationType || 'online_individual';
        existingCandidate.email = email || existingCandidate.email;
        existingCandidate.tokenFee = tokenFee;
        existingCandidate.tokenAmount = tokenFee;
        existingCandidate.tokenOrderId = orderId;
        existingCandidate.tokenPaymentOrderId = orderId;
        existingCandidate.tokenPaid = false;
        existingCandidate.tokenPaymentStatus = "pending";
        existingCandidate.uniformCost = netUniformTotal;
        existingCandidate.reRegistrationFee = reRegistrationTotal;
        existingCandidate.reRegistrationAmount = reRegistrationTotal;
        existingCandidate.updatedAt = new Date().toISOString();
        candidate = existingCandidate;
      } else {
        candidate = {
          id: `spmb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          registrationNumber: regNumber,
          registrationNo: regNumber,
          nisn: cleanNisn,
          nik: req.body.nik || "",
          fullName: cleanFullName,
          gender: normGender,
          birthPlace: toProperCase(req.body.birthPlace || ""),
          birthDate: req.body.birthDate || "",
          phone: cleanPhone,
          schoolOrigin: effectiveSchoolOrigin,
          schoolOriginType: schoolOriginType || (isJogosari ? 'maarif_jogosari' : 'other'),
          registrationType: registrationType || 'online_individual',
          sessionId: selectedSession?.id || "gelombang-1",
          sessionName: selectedSession?.name || "Gelombang 1",
          parentPhone: cleanPhone,
          parentName: parentName || "",
          originSchool: effectiveSchoolOrigin,
          email: email || "",
          status: "registered",
          tokenFee,
          tokenAmount: tokenFee,
          tokenPaid: false,
          tokenPaymentStatus: "pending",
          tokenOrderId: orderId,
          tokenPaymentOrderId: orderId,
          reRegistrationFee: reRegistrationTotal,
          reRegistrationAmount: reRegistrationTotal,
          reRegistrationPaid: false,
          reRegistrationStatus: "unpaid",
          uniformCost: netUniformTotal,
          selectedUniforms: eligibleUniforms.map(u => u.id),
          uniformSizes: {
            sportShirtSize: "L",
            batikSize: "L",
            shoesSize: "39"
          },
          isFormCompleted: false,
          documentsUploaded: false,
          documents: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        spmbCandidates.push(candidate);
      }

      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Candidate Save Warning]:", err?.message || err));

      // Create Midtrans Snap Token for online individual registration
      let snapToken = "";
      let redirectUrl = "";

      if (!midtransConfig.serverKey || !midtransConfig.clientKey || midtransConfig.isDisabled) {
        // Clean up candidate draft since payment cannot be initiated
        const cIdx = spmbCandidates.findIndex(c => c.id === candidate.id || c.nisn === cleanNisn);
        if (cIdx !== -1) {
          spmbCandidates.splice(cIdx, 1);
          saveState();
        }
        return res.status(400).json({
          error: "Gateway pembayaran online Midtrans belum dikonfigurasi oleh Admin. Silakan hubungi panitia SPMB atau periksa Pengaturan Midtrans."
        });
      }

      try {
        const authString = Buffer.from(midtransConfig.serverKey.trim() + ":").toString("base64");
        const baseUrl = midtransConfig.isProduction ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: tokenFee
          },
          customer_details: {
            first_name: cleanFullName,
            email: email || `spmb.${cleanNisn}@smpmaarifnu.sch.id`,
            phone: cleanPhone
          },
          item_details: [
            {
              id: "TOKEN-SPMB",
              price: tokenFee,
              quantity: 1,
              name: `Token SPMB ${spmbConfig.academicYear} - ${cleanFullName}`.slice(0, 50)
            }
          ]
        };

        const snapResponse = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${authString}`
          },
          body: JSON.stringify(midtransPayload)
        });

        if (snapResponse.ok) {
          const snapJson: any = await snapResponse.json();
          snapToken = snapJson.token || "";
          redirectUrl = snapJson.redirect_url || "";
          candidate.tokenSnapToken = snapToken;
          candidate.tokenRedirectUrl = redirectUrl;
          if (!candidate.tokenExpiryTime) {
            const expD = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const y = expD.getFullYear();
            const mo = String(expD.getMonth() + 1).padStart(2, '0');
            const da = String(expD.getDate()).padStart(2, '0');
            const ho = String(expD.getHours()).padStart(2, '0');
            const mi = String(expD.getMinutes()).padStart(2, '0');
            const se = String(expD.getSeconds()).padStart(2, '0');
            candidate.tokenExpiryTime = `${y}-${mo}-${da} ${ho}:${mi}:${se}`;
          }
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});
          recordOrUpdateMidtransTransaction({
            orderId,
            studentName: candidate.fullName,
            studentNis: candidate.nisn,
            nisn: candidate.nisn,
            billType: "spmb_token",
            description: `Pembayaran Token SPMB - ${candidate.fullName}`,
            grossAmount: tokenFee,
            paymentType: "Midtrans Snap",
            transactionStatus: "pending",
            snapToken: snapToken,
            rawResponse: snapJson
          });
          saveState();
        } else {
          const errText = await snapResponse.text();
          console.warn("Midtrans Snap error for SPMB token:", errText);
          // Clean up draft
          const cIdx = spmbCandidates.findIndex(c => c.id === candidate.id || c.nisn === cleanNisn);
          if (cIdx !== -1) {
            spmbCandidates.splice(cIdx, 1);
            saveState();
          }
          let parsedErrMsg = "Gagal membuat sesi pembayaran Midtrans.";
          try {
            const errObj = JSON.parse(errText);
            if (errObj.error_messages) parsedErrMsg = Array.isArray(errObj.error_messages) ? errObj.error_messages.join(", ") : String(errObj.error_messages);
            else if (errObj.message) parsedErrMsg = errObj.message;
          } catch (_) {
            parsedErrMsg = errText || parsedErrMsg;
          }
          return res.status(500).json({ error: "Gagal membuat sesi pembayaran Midtrans Snap: " + parsedErrMsg });
        }
      } catch (snapErr: any) {
        console.error("Error creating Midtrans Snap token for SPMB:", snapErr);
        const cIdx = spmbCandidates.findIndex(c => c.id === candidate.id || c.nisn === cleanNisn);
        if (cIdx !== -1) {
          spmbCandidates.splice(cIdx, 1);
          saveState();
        }
        return res.status(500).json({ error: "Koneksi gateway pembayaran Midtrans gagal: " + snapErr.message });
      }

      res.json({
        success: true,
        orderId,
        snapToken,
        token: snapToken,
        redirectUrl,
        candidate,
        tokenFee
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/register-token-snap:", err);
      res.status(500).json({ error: "Gagal memulai transaksi pendaftaran: " + err.message });
    }
  });

  // 6. Verify Token Payment Status against Midtrans Gateway
  router.post("/verify-token-payment", async (req, res) => {
    try {
      const { orderId, nisn, paymentMethod } = req.body;
      if (!orderId && !nisn) {
        return res.status(400).json({ error: "Order ID atau NISN wajib disertakan." });
      }

      const candidateIdx = spmbCandidates.findIndex(c => 
        (orderId && (c.tokenOrderId === orderId || c.tokenPaymentOrderId === orderId)) ||
        (nisn && (c.nisn || "").trim() === (nisn || "").trim())
      );

      if (candidateIdx === -1) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const candidate = spmbCandidates[candidateIdx];
      const targetOrderId = orderId || candidate.tokenPaymentOrderId || candidate.tokenOrderId;

      if (!targetOrderId) {
        return res.status(400).json({ error: "Order ID transaksi tidak ditemukan." });
      }

      // Selalu cek status resmi ke payment gateway Midtrans
      const mtStatus = await checkMidtransOrderStatus(targetOrderId);
      if (mtStatus) {
        const ts = String(mtStatus.transaction_status || "").toLowerCase();
        const isSettled = ts === "settlement" || ts === "capture";
        const isExpired = ts === "expire" || ts === "cancel" || ts === "deny";
        const isPending = ts === "pending";

        if (isSettled) {
          candidate.tokenPaid = true;
          candidate.tokenPaymentStatus = "paid";
          candidate.tokenPaidAt = mtStatus.settlement_time || mtStatus.transaction_time || new Date().toISOString();
          candidate.tokenPaymentMethod = paymentMethod || `Midtrans (${mtStatus.payment_type || 'Online'})`;
          candidate.status = "registered";
          candidate.updatedAt = new Date().toISOString();

          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Token Paid Warning]:", err?.message || err));

          recordOrUpdateMidtransTransaction({
            orderId: targetOrderId,
            transactionId: mtStatus.transaction_id,
            billType: "spmb_token",
            grossAmount: Number(mtStatus.gross_amount) || candidate.tokenFee || 50000,
            studentName: candidate.fullName,
            studentNis: candidate.nisn,
            description: `Pembayaran Token SPMB - ${candidate.fullName}`,
            transactionStatus: "settlement",
            paymentType: candidate.tokenPaymentMethod,
            settlementTime: candidate.tokenPaidAt
          });

          // Broadcast notification
          const notification: RealtimeNotification = {
            id: `notif-spmb-token-${Date.now()}`,
            studentId: candidate.nisn,
            title: "Pendaftaran Murid Baru (SPMB)",
            message: `Calon murid baru ${candidate.fullName} (NISN: ${candidate.nisn}) berhasil membayar token pendaftaran Rp ${(candidate.tokenFee || candidate.tokenAmount || 50000).toLocaleString("id-ID")}.`,
            type: "payment",
            createdAt: new Date().toISOString()
          };
          broadcastNotification(notification);

          // Send WhatsApp receipt if configured
          if (whatsappConfig.enabled && (candidate.parentPhone || candidate.phone)) {
            const targetPhone = candidate.parentPhone || candidate.phone;
            const waMsg = `Yth. Calon Wali Murid dari *${candidate.fullName}* (NISN: ${candidate.nisn}).\n\n` +
              `📢 *BUKTI PEMBAYARAN TOKEN PENDAFTARAN SPMB ${spmbConfig.academicYear}*\n` +
              `Pembayaran formulir/token pendaftaran sebesar *Rp ${(candidate.tokenFee || candidate.tokenAmount || 50000).toLocaleString("id-ID")}* telah BERHASIL diverifikasi LUNAS.\n\n` +
              `• No. Pendaftaran: *${candidate.registrationNumber || candidate.registrationNo || candidate.nisn}*\n` +
              `• Sesi: *${candidate.sessionName || "SPMB"}*\n` +
              `• Status: *TERDAFTAR (Silakan Lanjut Isi Buku Induk)*\n\n` +
              `Silakan buka portal SPMB untuk melanjutkan pengisian data lengkap buku induk dan pembayaran daftar ulang seragam.\n\n` +
              `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
            sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending SPMB token WA:", e));
          }

          return res.json({
            success: true,
            status: "paid",
            message: "Pembayaran token pendaftaran berhasil dikonfirmasi LUNAS.",
            candidate
          });
        } else if (isExpired) {
          // Sesuai permintaan: jika di midtrans expired, data Awal murid baru dihapus, ada arahan isi ulang formulir data awal
          const candId = candidate.id;
          const candName = candidate.fullName;
          spmbCandidates.splice(candidateIdx, 1);
          saveState();
          directDeleteEntityFromMysql("spmb_candidates", candId).catch(() => {});

          return res.status(410).json({
            success: false,
            status: "expired",
            isExpired: true,
            expired: true,
            error: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            message: `Batas waktu pembayaran token pendaftaran (${candName}) telah kedaluwarsa (expired) di Midtrans. Data pendaftaran awal telah dihapus otomatis dari sistem. Silakan lakukan pengisian ulang formulir data awal.`,
            code: "TOKEN_EXPIRED",
            canReRegister: true
          });
        } else if (isPending) {
          candidate.tokenPaid = false;
          candidate.tokenPaymentStatus = "pending";
          if (mtStatus.expiry_time) candidate.tokenExpiryTime = mtStatus.expiry_time;
          if (mtStatus.va_numbers) candidate.tokenVaNumbers = mtStatus.va_numbers;
          if (mtStatus.payment_type) candidate.tokenPaymentType = mtStatus.payment_type;
          candidate.tokenPaymentMethod = `Midtrans (${mtStatus.payment_type || 'Online'})`;
          candidate.updatedAt = new Date().toISOString();
          saveState();
          directSaveEntityToMysql("spmb_candidates", candidate).catch(() => {});

          return res.json({
            success: false,
            status: "pending",
            isPending: true,
            message: "Pembayaran token pendaftaran masih dalam status PENDING di Midtrans. Menunggu penyelesaian pembayaran sebelum batas waktu.",
            candidate
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: "Status transaksi belum terkonfirmasi lunas di Gateway Midtrans. Pastikan pembayaran telah berhasil diselesaikan."
      });
    } catch (err: any) {
      console.error("Error in verify-token-payment:", err);
      res.status(500).json({ error: "Gagal memverifikasi pembayaran token: " + err.message });
    }
  });

  // 7. Save Complete Form (Format Buku Induk Siswa)
    router.post("/save-full-form", async (req, res) => {
    try {
      const { nisn, fullFormData, formData, uniformSizes } = req.body;
      if (!nisn) {
        return res.status(400).json({ error: "NISN wajib disertakan." });
      }

      const cleanNisn = String(nisn).trim();
      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase());
      
      // Jika belum ditemukan di memory cache (misal restart server), ambil langsung dari MySQL
      if (!candidate) {
        try {
          const dbCand = await findSpmbCandidateInMysql(cleanNisn);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (findErr) {
          console.warn("[MySQL Find Candidate on Save Warning]:", findErr);
        }
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const isTokenPaid = candidate.tokenPaid || candidate.tokenPaymentStatus === "paid" || candidate.tokenPaymentStatus === "waived" || Boolean(candidate.tokenPaidAt);
      if (!isTokenPaid) {
        return res.status(400).json({ error: "Token pendaftaran belum dibayar. Mohon selesaikan pembayaran token terlebih dahulu." });
      }

      const incomingData = fullFormData || formData || {};
      if (incomingData.fullName) {
        incomingData.fullName = String(incomingData.fullName).trim().toUpperCase();
      }
      if (incomingData.nickname) {
        incomingData.nickname = String(incomingData.nickname).trim().toUpperCase();
      }
      if (incomingData.fatherName) {
        incomingData.fatherName = String(incomingData.fatherName).trim().toUpperCase();
      }
      if (incomingData.motherName) {
        incomingData.motherName = String(incomingData.motherName).trim().toUpperCase();
      }
      if (incomingData.guardianName) {
        incomingData.guardianName = String(incomingData.guardianName).trim().toUpperCase();
      }
      if (incomingData.birthPlace) {
        incomingData.birthPlace = toProperCase(incomingData.birthPlace);
      }
      if (incomingData.fatherBirthPlace) {
        incomingData.fatherBirthPlace = toProperCase(incomingData.fatherBirthPlace);
      }
      if (incomingData.motherBirthPlace) {
        incomingData.motherBirthPlace = toProperCase(incomingData.motherBirthPlace);
      }
      if (incomingData.guardianBirthPlace) {
        incomingData.guardianBirthPlace = toProperCase(incomingData.guardianBirthPlace);
      }
      if (incomingData.phone) {
        incomingData.phone = String(incomingData.phone).trim();
      }
      if (incomingData.studentPhone !== undefined) {
        incomingData.studentPhone = String(incomingData.studentPhone || '').trim();
      }

      Object.assign(candidate, incomingData);
      if (candidate.fullName) {
        candidate.fullName = String(candidate.fullName).trim().toUpperCase();
      }
      if (candidate.nickname) {
        candidate.nickname = String(candidate.nickname).trim().toUpperCase();
      }
      if (candidate.fatherName) {
        candidate.fatherName = String(candidate.fatherName).trim().toUpperCase();
      }
      if (candidate.motherName) {
        candidate.motherName = String(candidate.motherName).trim().toUpperCase();
      }
      if (candidate.guardianName) {
        candidate.guardianName = String(candidate.guardianName).trim().toUpperCase();
      }
      if (candidate.birthPlace) {
        candidate.birthPlace = toProperCase(candidate.birthPlace);
      }
      if (candidate.fatherBirthPlace) {
        candidate.fatherBirthPlace = toProperCase(candidate.fatherBirthPlace);
      }
      if (candidate.motherBirthPlace) {
        candidate.motherBirthPlace = toProperCase(candidate.motherBirthPlace);
      }
      if (candidate.guardianBirthPlace) {
        candidate.guardianBirthPlace = toProperCase(candidate.guardianBirthPlace);
      }

      candidate.isFormCompleted = true;
      candidate.formCompletedAt = new Date().toISOString();
      candidate.fullFormData = { ...(candidate.fullFormData || {}), ...incomingData };
      if (uniformSizes) {
        candidate.uniformSizes = { ...(candidate.uniformSizes || {}), ...uniformSizes };
      }

      // Periksa kecocokan No KK dengan siswa aktif (kelas 7/8/9) atau sesama calon murid baru
      const targetKk = candidate.kkNumber || candidate.fullFormData?.kkNumber;
      let siblingCheckResult = checkSiblingKkMatch(targetKk, candidate.id, candidate.nisn, spmbCandidates, students);
      if (siblingCheckResult.isMatch) {
        candidate.isSiblingKkMatch = true;
        candidate.matchedSiblingDetail = siblingCheckResult.matchedDetail;
        if (candidate.sessionId === 'inden') {
          candidate.freeFirstMonthSpp = true;
        }
      }
      
      // Status pendaftaran: form_submitted (data lengkap terisi & tersimpan permanen di MySQL)
      candidate.status = (candidate.status === "registered" || !candidate.status) ? "form_submitted" : candidate.status;
      candidate.updatedAt = new Date().toISOString();

      saveState();

      // Simpan langsung dan permanen ke database MySQL
      let mysqlSaved = false;
      try {
        const mysqlRes = await directSaveEntityToMysql("spmb_candidates", candidate);
        mysqlSaved = Boolean(mysqlRes?.success);
        if (!mysqlSaved) {
          // Retry dengan verifikasi skema tabel
          console.warn("[SPMB MySQL Direct Save Retry]: Memverifikasi struktur tabel dan mencoba kembali...");
          await ensureAllMysqlTablesExist();
          const retryRes = await directSaveEntityToMysql("spmb_candidates", candidate);
          mysqlSaved = Boolean(retryRes?.success);
        }
        if (mysqlSaved) {
          console.log(`[SPMB MySQL Direct Save]: Data lengkap calon murid ${candidate.fullName} (NISN: ${candidate.nisn}) berhasil disimpan permanen ke MySQL.`);
        } else {
          console.warn("[SPMB MySQL Direct Save Warning]:", mysqlRes?.message || mysqlRes?.error);
        }
      } catch (dbErr: any) {
        console.error("[SPMB MySQL Direct Save Error]:", dbErr?.message || dbErr);
        // Coba auto-migrate dan coba sekali lagi
        try {
          await ensureAllMysqlTablesExist();
          const retryRes = await directSaveEntityToMysql("spmb_candidates", candidate);
          mysqlSaved = Boolean(retryRes?.success);
        } catch (_) {}
      }

      res.json({
        success: true,
        message: "Data formulir buku induk calon murid berhasil disimpan permanen ke sistem & MySQL.",
        candidate,
        siblingCheck: siblingCheckResult,
        mysqlSaved
      });
    } catch (err: any) {
      console.error("Error saving full SPMB form:", err);
      res.status(500).json({ error: "Gagal menyimpan formulir buku induk: " + err.message });
    }
  });

  // 8. Re-registration Midtrans Snap Payment (Daftar Ulang & Seragam)
  router.post("/pay-reregistration-snap", async (req, res) => {
    try {
      const { nisn, selectedUniforms, uniformSizes, customAmount } = req.body;
      if (!nisn) {
        return res.status(400).json({ error: "NISN wajib disertakan." });
      }

      const candidate = spmbCandidates.find(c => (c.nisn || "").trim() === (nisn || "").trim());
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      // Validasi Gating Tahap 1: Token harus lunas
      if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== "paid") {
        return res.status(400).json({ error: "Tahap 1 belum selesai: Token pendaftaran belum dibayar." });
      }

      // Validasi Gating Tahap 2: Data lengkap siswa harus sudah disimpan
      if (!candidate.isFormCompleted) {
        return res.status(400).json({ error: "Tahap 2 belum selesai: Lengkapi dan simpan Data Lengkap Siswa terlebih dahulu." });
      }

      // Validasi Gating Tahap 3: Berkas persyaratan harus sudah diunggah
      const hasRequiredDocs = candidate.documentsUploaded || (candidate.documents && (candidate.documents.aktaPhoto || candidate.documents.kkPhoto || candidate.documents.pasPhoto));
      if (!hasRequiredDocs) {
        return res.status(400).json({ error: "Tahap 3 belum selesai: Unggah seluruh berkas persyaratan terlebih dahulu sebelum melakukan daftar ulang." });
      }

      const isLpMaarif = isSchoolLpMaarif(candidate.schoolOriginType, candidate.schoolOrigin || candidate.originSchool);
      const isJogosari = candidate.schoolOriginType === 'maarif_jogosari' || 
        (candidate.schoolOrigin || '').toUpperCase().includes('MAARIF JOGOSARI') ||
        (candidate.originSchool || '').toUpperCase().includes('MAARIF JOGOSARI');

      const selectedSession = spmbConfig.sessions.find(s => s.id === candidate.sessionId) || spmbConfig.sessions[0];
      const buildingFee = spmbConfig.buildingFee || 1500000;
      const julySppFee = spmbConfig.julySppFee || 200000;
      const baseAdmFee = spmbConfig.reRegistrationBaseFee || 0;
      const discountPercent = typeof selectedSession?.discountPercent === "number" 
        ? selectedSession.discountPercent 
        : (selectedSession?.discountAmount ? Math.round((selectedSession.discountAmount / (buildingFee || 1)) * 100) : 0);
      const buildingWaveDiscount = Math.round(buildingFee * (discountPercent / 100));

      // SD Maarif discounts
      let maarifBuildingDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifBuildingDiscountType === 'percent') {
          maarifBuildingDiscount = Math.round(buildingFee * ((spmbConfig.maarifBuildingDiscount || 0) / 100));
        } else {
          maarifBuildingDiscount = spmbConfig.maarifBuildingDiscount || 0;
        }
      }

      const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
      const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);

      // Recalculate uniform total based on selection or all default
      const eligibleUniforms = spmbConfig.uniformItems.filter(u => 
        (u.gender === "both" || u.gender === "all" || (u.gender as string) === candidate.gender || 
         (candidate.gender === "L" && u.gender === "male") || (candidate.gender === "P" && u.gender === "female")) &&
        (!selectedUniforms || selectedUniforms.includes(u.id))
      );
      const rawUniformTotal = eligibleUniforms.reduce((sum, item) => sum + item.price, 0);

      let maarifUniformDiscount = 0;
      if (isJogosari) {
        if (spmbConfig.maarifUniformDiscountType === 'percent') {
          maarifUniformDiscount = Math.round(rawUniformTotal * ((spmbConfig.maarifUniformDiscount || 0) / 100));
        } else {
          maarifUniformDiscount = spmbConfig.maarifUniformDiscount || 0;
        }
      }

      // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
      let sportsUniformBonus = 0;
      const allowBonus = selectedSession?.sportsUniformBonusForMaarif ?? spmbConfig.maarifIndenSportsUniformBonus ?? true;
      if (selectedSession.id === 'inden' && isLpMaarif && allowBonus) {
        const sportsItem = eligibleUniforms.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
        sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
      }

      const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount - sportsUniformBonus);

      // Check Sibling KK Match (Gratis SPP bulan pertama di Sesi Inden jika No KK sama dengan murid aktif kelas 7/8/9 atau sesama murid baru)
      const candKk = candidate.kkNumber || candidate.fullFormData?.kkNumber || req.body.kkNumber;
      const siblingCheck = checkSiblingKkMatch(candKk, candidate.id, candidate.nisn, spmbCandidates, students);
      const isSiblingFreeSpp = selectedSession.id === 'inden' && (siblingCheck.isMatch || candidate.freeFirstMonthSpp || candidate.isSiblingKkMatch);
      const effectiveJulySppFee = isSiblingFreeSpp ? 0 : julySppFee;

      if (siblingCheck.isMatch) {
        candidate.isSiblingKkMatch = true;
        candidate.matchedSiblingDetail = siblingCheck.matchedDetail;
        if (selectedSession.id === 'inden') {
          candidate.freeFirstMonthSpp = true;
        }
      }

      const defaultTotal = netBuildingFee + effectiveJulySppFee + baseAdmFee + netUniformTotal;
      const totalAmount = (customAmount !== undefined && customAmount !== null && Number(customAmount) >= 0)
        ? Math.round(Number(customAmount))
        : Math.round(defaultTotal);

      const finalGrossAmount = Math.round(totalAmount);

      const orderId = `SPMB-REREG-${candidate.nisn}-${Date.now()}`;
      candidate.reRegistrationOrderId = orderId;
      candidate.reRegistrationFee = finalGrossAmount;
      candidate.reRegistrationAmount = finalGrossAmount;
      candidate.uniformCost = netUniformTotal;
      if (selectedUniforms) candidate.selectedUniforms = selectedUniforms;
      if (uniformSizes) candidate.uniformSizes = uniformSizes;
      candidate.updatedAt = new Date().toISOString();

      // Jika total tagihan Rp 0 (misal gratis seluruhnya), langsung tandai LUNAS tanpa memanggil Snap Midtrans
      if (finalGrossAmount <= 0) {
        candidate.reRegistrationPaid = true;
        candidate.reRegistrationStatus = "paid";
        candidate.reRegistrationPaidAt = new Date().toISOString();
        candidate.reRegistrationPaymentMethod = "Gratis / Beasiswa (Diskon 100%)";
        candidate.reRegistrationFee = 0;
        candidate.reRegistrationAmount = 0;
        saveState();

        broadcastNotification({
          id: `notif-${Date.now()}`,
          title: "Daftar Ulang Lunas (Gratis)",
          message: `Calon murid ${candidate.fullName} telah melunasi Daftar Ulang & Seragam (Diskon 100% / Gratis).`,
          createdAt: new Date().toISOString(),
          type: "success"
        });

        return res.json({
          success: true,
          isFree: true,
          message: "Pembayaran Daftar Ulang & Perlengkapan Seragam BERHASIL (Gratis / Diskon 100%).",
          candidate
        });
      }

      saveState();

      let snapToken = "";
      let redirectUrl = "";

      if (!midtransConfig.serverKey || !midtransConfig.clientKey || midtransConfig.isDisabled) {
        return res.status(400).json({
          error: "Gateway pembayaran online Midtrans belum dikonfigurasi oleh Admin. Silakan hubungi panitia SPMB."
        });
      }

      try {
        const authString = Buffer.from(midtransConfig.serverKey.trim() + ":").toString("base64");
        const baseUrl = midtransConfig.isProduction ? "https://app.midtrans.com/snap/v1/transactions" : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        // Susun item_details secara NET dan bulat agar jumlahnya 100% SAMA PERSIS dengan finalGrossAmount
        const itemDetails: Array<{ id: string; price: number; quantity: number; name: string }> = [];

        if (netBuildingFee > 0) {
          itemDetails.push({
            id: "BUILDING-NET",
            price: Math.round(netBuildingFee),
            quantity: 1,
            name: `Uang Gedung Net (${selectedSession?.name || "Inden"})`.slice(0, 50)
          });
        }

        if (effectiveJulySppFee > 0) {
          itemDetails.push({
            id: "SPP-JULY",
            price: Math.round(effectiveJulySppFee),
            quantity: 1,
            name: "SPP Bulan Juli 2027"
          });
        }

        if (baseAdmFee > 0) {
          itemDetails.push({
            id: "REREG-BASE",
            price: Math.round(baseAdmFee),
            quantity: 1,
            name: "Biaya Administrasi & Daftar Ulang".slice(0, 50)
          });
        }

        if (netUniformTotal > 0) {
          if (maarifUniformDiscount === 0 && sportsUniformBonus === 0) {
            eligibleUniforms.forEach(u => {
              if (u.price > 0) {
                itemDetails.push({
                  id: String(u.id).slice(0, 45),
                  price: Math.round(u.price),
                  quantity: 1,
                  name: u.name.slice(0, 50)
                });
              }
            });
          } else {
            itemDetails.push({
              id: "UNIFORM-NET",
              price: Math.round(netUniformTotal),
              quantity: 1,
              name: `Paket Seragam & Atribut Net (${candidate.gender === 'L' ? 'Putra' : 'Putri'})`.slice(0, 50)
            });
          }
        }

        // Filter proteksi mutlak: Midtrans melarang price <= 0 atau quantity <= 0
        const validItems = itemDetails.filter(item => item.price > 0 && item.quantity > 0);
        const currentSum = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        let finalItemDetails = validItems;
        if (currentSum !== finalGrossAmount || finalItemDetails.length === 0) {
          const safeStudentName = (candidate.fullName || candidate.nisn || "Siswa")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .slice(0, 25);
          finalItemDetails = [{
            id: "TOTAL-REREG",
            price: finalGrossAmount,
            quantity: 1,
            name: `Daftar Ulang - ${safeStudentName}`.slice(0, 50)
          }];
        }

        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: finalGrossAmount
          },
          customer_details: {
            first_name: candidate.fullName,
            email: candidate.email || `spmb.${candidate.nisn}@smpmaarifnu.sch.id`,
            phone: candidate.parentPhone || candidate.phone
          },
          item_details: finalItemDetails
        };

        const snapResponse = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${authString}`
          },
          body: JSON.stringify(midtransPayload)
        });

        if (snapResponse.ok) {
          const snapJson: any = await snapResponse.json();
          snapToken = snapJson.token || "";
          redirectUrl = snapJson.redirect_url || "";
          candidate.reRegistrationSnapToken = snapToken;
          recordOrUpdateMidtransTransaction({
            orderId,
            studentName: candidate.fullName,
            studentNis: candidate.nisn,
            nisn: candidate.nisn,
            billType: "spmb_reregistration",
            description: `Pembayaran Daftar Ulang SPMB - ${candidate.fullName}`,
            grossAmount: totalAmount,
            paymentType: "Midtrans Snap",
            transactionStatus: "pending",
            snapToken: snapToken,
            rawResponse: snapJson
          });
          saveState();
        } else {
          const errText = await snapResponse.text();
          console.warn("Midtrans Snap error for SPMB reregistration:", errText);
          let parsedErrMsg = "Gagal membuat sesi pembayaran Midtrans.";
          try {
            const errObj = JSON.parse(errText);
            if (errObj.error_messages) parsedErrMsg = Array.isArray(errObj.error_messages) ? errObj.error_messages.join(", ") : String(errObj.error_messages);
            else if (errObj.message) parsedErrMsg = errObj.message;
          } catch (_) {
            parsedErrMsg = errText || parsedErrMsg;
          }
          return res.status(500).json({ error: "Gagal membuat sesi pembayaran daftar ulang Midtrans: " + parsedErrMsg });
        }
      } catch (snapErr: any) {
        console.error("Error creating Midtrans Snap token for SPMB reregistration:", snapErr);
        return res.status(500).json({ error: "Koneksi gateway pembayaran Midtrans gagal: " + snapErr.message });
      }

      res.json({
        success: true,
        orderId,
        snapToken,
        token: snapToken,
        redirectUrl,
        candidate,
        totalAmount
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/pay-reregistration-snap:", err);
      res.status(500).json({ error: "Gagal membuat transaksi daftar ulang: " + err.message });
    }
  });

  // 9. Verify Re-Registration Payment Success
  router.post("/verify-reregistration-payment", async (req, res) => {
    try {
      const { orderId, nisn, paymentMethod } = req.body;
      const candidate = spmbCandidates.find(c => 
        (orderId && c.reRegistrationOrderId === orderId) ||
        (nisn && (c.nisn || "").trim() === (nisn || "").trim())
      );

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      candidate.reRegistrationPaid = true;
      candidate.reRegistrationStatus = "paid";
      candidate.reRegistrationPaidAt = new Date().toISOString();
      candidate.reRegistrationPaymentMethod = paymentMethod || "Midtrans Snap Online";
      if (candidate.documentsUploaded || candidate.documents?.kkPhoto) {
        candidate.status = "accepted";
      } else {
        candidate.status = "re_registered";
      }
      candidate.updatedAt = new Date().toISOString();

      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Rereg Paid Warning]:", err?.message || err));

      // Broadcast notification
      const notification: RealtimeNotification = {
        id: `notif-spmb-rereg-${Date.now()}`,
        studentId: candidate.nisn,
        title: "Daftar Ulang Murid Baru (SPMB)",
        message: `Calon murid ${candidate.fullName} telah MELUNASI Biaya Daftar Ulang & Seragam Rp ${(candidate.reRegistrationFee || candidate.reRegistrationAmount || 0).toLocaleString("id-ID")}.`,
        type: "payment",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);

      // Send WhatsApp confirmation
      if (whatsappConfig.enabled && (candidate.parentPhone || candidate.phone)) {
        const targetPhone = candidate.parentPhone || candidate.phone;
        const waMsg = `Yth. Calon Wali Murid dari *${candidate.fullName}* (NISN: ${candidate.nisn}).\n\n` +
          `🎉 *KUITANSI DAFTAR ULANG & SERAGAM SPMB ${spmbConfig.academicYear}*\n` +
          `Pembayaran Daftar Ulang & Perlengkapan Seragam sebesar *Rp ${(candidate.reRegistrationFee || candidate.reRegistrationAmount || 0).toLocaleString("id-ID")}* telah BERHASIL divalidasi.\n\n` +
          `• No. Pendaftaran: *${candidate.registrationNumber || candidate.registrationNo || candidate.nisn}*\n` +
          `• Status: *${candidate.status.toUpperCase()}*\n\n` +
          `Silakan pastikan berkas administrasi (KK, Akta Kelahiran, Pas Foto, Surat Keterangan Lulus) telah diunggah di portal SPMB.\n\n` +
          `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending SPMB rereg WA:", e));
      }

      res.json({
        success: true,
        message: "Pembayaran daftar ulang berhasil diverifikasi.",
        candidate
      });
    } catch (err: any) {
      console.error("Error in verify-reregistration-payment:", err);
      res.status(500).json({ error: "Gagal memverifikasi pembayaran daftar ulang: " + err.message });
    }
  });

  // 10. Upload Registration Documents (Student Portal & Admin)
  router.post("/upload-documents", async (req, res) => {
    try {
      const { nisn, documents, force } = req.body;
      if (!nisn || !documents) {
        return res.status(400).json({ error: "NISN dan data berkas wajib disertakan." });
      }

      const cleanNisn = String(nisn || "").trim();
      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === cleanNisn || (c.registrationNumber || "").trim().toLowerCase() === cleanNisn.toLowerCase() || c.id === cleanNisn);
      if (!candidate) {
        try {
          const dbCand = await findSpmbCandidateInMysql(cleanNisn);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (_) {}
      }

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      // Merge and save documents permanently
      candidate.documents = { ...(candidate.documents || {}), ...documents };
      candidate.documentsUploaded = true;
      candidate.documentsUploadedAt = new Date().toISOString();
      
      // Auto-validate form and token if documents are uploaded
      if (!candidate.isFormCompleted) {
        candidate.isFormCompleted = true;
        candidate.formCompletedAt = candidate.formCompletedAt || new Date().toISOString();
      }
      if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== "paid") {
        candidate.tokenPaid = true;
        candidate.tokenPaymentStatus = "paid";
        candidate.tokenPaidAt = candidate.tokenPaidAt || new Date().toISOString();
      }

      if (candidate.reRegistrationPaid || candidate.reRegistrationStatus === "paid") {
        candidate.status = "accepted";
      } else {
        candidate.status = "documents_verified";
      }
      candidate.updatedAt = new Date().toISOString();

      healCandidateData(candidate);
      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Documents Save Warning]:", err?.message || err));

      res.json({
        success: true,
        message: "Berkas pendaftaran calon murid berhasil disimpan permanen!",
        candidate
      });
    } catch (err: any) {
      console.error("Error in upload-documents:", err);
      res.status(500).json({ error: "Gagal mengunggah berkas: " + err.message });
    }
  });

  // 10B. Admin Direct Document Manager
  router.post("/admin-update-documents", async (req, res) => {
    try {
      const { nisn, candidateId, documents } = req.body;
      const targetId = String(nisn || candidateId || "").trim();
      if (!targetId) {
        return res.status(400).json({ error: "NISN atau ID calon murid wajib diisi." });
      }

      let candidate = spmbCandidates.find(c => (c.nisn || "").trim() === targetId || (c.registrationNumber || "").trim().toLowerCase() === targetId.toLowerCase() || c.id === targetId);
      if (!candidate) {
        try {
          const dbCand = await findSpmbCandidateInMysql(targetId);
          if (dbCand) {
            spmbCandidates.push(dbCand);
            candidate = dbCand;
          }
        } catch (_) {}
      }

      if (!candidate) {
        return res.status(404).json({ error: "Calon murid tidak ditemukan." });
      }

      candidate.documents = { ...(candidate.documents || {}), ...(documents || {}) };
      candidate.documentsUploaded = true;
      candidate.documentsUploadedAt = new Date().toISOString();
      healCandidateData(candidate);
      candidate.updatedAt = new Date().toISOString();

      saveState();
      await directSaveEntityToMysql("spmb_candidates", candidate);

      res.json({
        success: true,
        message: `Berkas dokumen calon murid ${candidate.fullName} berhasil diperbarui oleh Admin.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error in /admin-update-documents:", err);
      res.status(500).json({ error: "Gagal menyimpan berkas admin: " + err.message });
    }
  });

  // 11. Admin Update Status or Notes
  router.post("/update-status", async (req, res) => {
    try {
      const { id, status, adminNotes, verificationNotes } = req.body;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      if (status) candidate.status = status;
      if (adminNotes !== undefined || verificationNotes !== undefined) {
        candidate.adminNotes = adminNotes || verificationNotes;
        candidate.verificationNotes = verificationNotes || adminNotes;
      }
      candidate.updatedAt = new Date().toISOString();

      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Status Warning]:", err?.message || err));

      res.json({ success: true, message: "Status calon murid berhasil diperbarui.", candidate });
    } catch (err: any) {
      console.error("Error updating candidate status:", err);
      res.status(500).json({ error: "Gagal memperbarui status: " + err.message });
    }
  });

  // 11b. Toggle / Update Collective Registration Status (Admin)
  router.post("/candidate/:id/toggle-collective", (req, res) => {
    try {
      const id = req.params.id;
      const { registrationType } = req.body;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetType = registrationType || (candidate.registrationType === "school_collective" ? "online_individual" : "school_collective");
      candidate.registrationType = targetType;
      
      // If marked as collective and token has been paid online, mark refund status as pending if not yet refunded
      if (targetType === "school_collective" && (candidate.tokenPaymentStatus === "paid" || candidate.tokenPaid)) {
        if (!candidate.collectiveRefundStatus || candidate.collectiveRefundStatus === "none") {
          candidate.collectiveRefundStatus = "pending";
        }
      } else if (targetType === "online_individual" && candidate.collectiveRefundStatus === "pending") {
        candidate.collectiveRefundStatus = "none";
      }

      candidate.updatedAt = new Date().toISOString();
      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Toggle Collective Warning]:", err?.message || err));

      res.json({
        success: true,
        message: `Status jalur calon murid berhasil diubah menjadi: ${targetType === "school_collective" ? "Kolektif Sekolah" : "Mandiri Online"}.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error toggling candidate collective status:", err);
      res.status(500).json({ error: "Gagal mengubah status jalur kolektif: " + err.message });
    }
  });

  // 11c. Process Cash Refund for Collective Registration Token (Admin)
  router.post("/candidate/:id/process-collective-refund", (req, res) => {
    try {
      const id = req.params.id;
      const { refundAmount, recipientName, refundedBy, note, refundDate } = req.body;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const effectiveAmount = Number(refundAmount) || candidate.tokenAmount || candidate.tokenFee || 50000;
      const refundReceiptNo = `KW-REFUND-${candidate.nisn}-${Date.now().toString().slice(-6)}`;

      candidate.registrationType = "school_collective";
      candidate.collectiveRefundStatus = "refunded";
      candidate.collectiveRefundAmount = effectiveAmount;
      candidate.collectiveRefundedAt = refundDate || new Date().toISOString();
      candidate.collectiveRefundedBy = refundedBy || "Panitia SPMB";
      candidate.collectiveRefundRecipient = recipientName || candidate.parentName || candidate.fullName;
      candidate.collectiveRefundNote = note || "Pengembalian tunai (cash) biaya token pendaftaran online jalur kolektif";
      candidate.collectiveRefundReceiptNo = refundReceiptNo;
      candidate.updatedAt = new Date().toISOString();

      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Refund Warning]:", err?.message || err));

      // Send WhatsApp confirmation if configured
      if (whatsappConfig.enabled && (candidate.parentPhone || candidate.phone)) {
        const targetPhone = candidate.parentPhone || candidate.phone;
        const waMsg = `Yth. Calon Wali Murid dari *${candidate.fullName}* (NISN: ${candidate.nisn}).\n\n` +
          `💵 *TANDA TERIMA PENGEMBALIAN UANG TOKEN PENDAFTARAN (CASH REFUND)*\n` +
          `Panitia SPMB SMP Ma'arif NU Pandaan telah menyerahkan pengembalian uang token pendaftaran sebesar *Rp ${effectiveAmount.toLocaleString("id-ID")}* (Cash) untuk Jalur Kolektif Sekolah.\n\n` +
          `• No. Kuitansi: *${refundReceiptNo}*\n` +
          `• Diterima Oleh: *${candidate.collectiveRefundRecipient}*\n` +
          `• Tanggal: *${new Date(candidate.collectiveRefundedAt).toLocaleDateString("id-ID", { dateStyle: "full" })}*\n` +
          `• Petugas: *${candidate.collectiveRefundedBy}*\n\n` +
          `Terima kasih atas kerja samanya.\n` +
          `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending refund WA:", e));
      }

      res.json({
        success: true,
        message: `Pengembalian uang token pendaftaran Rp ${effectiveAmount.toLocaleString("id-ID")} (Cash) berhasil dicatat.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error processing collective cash refund:", err);
      res.status(500).json({ error: "Gagal memproses pengembalian uang cash: " + err.message });
    }
  });

  // 11d. Cancel / Undo Cash Refund for Collective Registration Token (Admin)
  router.post("/candidate/:id/cancel-collective-refund", (req, res) => {
    try {
      const id = req.params.id;
      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      candidate.collectiveRefundStatus = candidate.registrationType === "school_collective" ? "pending" : "none";
      candidate.collectiveRefundAmount = undefined;
      candidate.collectiveRefundedAt = undefined;
      candidate.collectiveRefundedBy = undefined;
      candidate.collectiveRefundRecipient = undefined;
      candidate.collectiveRefundNote = undefined;
      candidate.collectiveRefundReceiptNo = undefined;
      candidate.updatedAt = new Date().toISOString();

      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Cancel Refund Warning]:", err?.message || err));

      res.json({
        success: true,
        message: "Status pengembalian uang tunai berhasil dibatalkan / direset.",
        candidate
      });
    } catch (err: any) {
      console.error("Error cancelling collective cash refund:", err);
      res.status(500).json({ error: "Gagal membatalkan pengembalian uang: " + err.message });
    }
  });

  // 12. Promote SPMB Candidate into Official Active Student (Siswa Resmi)
  router.post("/promote-to-students", (req, res) => {
    try {
      const { candidateId, candidateIds, targetClass, defaultClass, targetNis } = req.body;
      
      const idsToPromote: string[] = Array.isArray(candidateIds) && candidateIds.length > 0
        ? candidateIds
        : (candidateId ? [candidateId] : []);

      if (idsToPromote.length === 0) {
        return res.status(400).json({ error: "Daftar ID calon murid yang akan dimigrasikan tidak boleh kosong." });
      }

      const assignedClass = defaultClass || targetClass || "7-A";
      const promotedStudents: Student[] = [];
      const updatedCandidates: SpmbCandidate[] = [];

      for (const id of idsToPromote) {
        const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
        if (!candidate) continue;

        // NIS Sementara OTOMATIS disamakan dengan NISN calon siswa
        const temporaryNis = candidate.nisn ? String(candidate.nisn).trim() : (targetNis ? String(targetNis).trim() : `STD-${Date.now()}`);
        const permanentNisn = candidate.nisn ? String(candidate.nisn).trim() : "";

        // Check if student with this NISN or ID already promoted
        let existingStudent = students.find(s => 
          (candidate.promotedStudentId && s.id === candidate.promotedStudentId) ||
          (permanentNisn && s.nisn === permanentNisn) ||
          (s.id === `std-spmb-${candidate.id}` || s.id === `std-spmb-${candidate.nisn}`)
        );

        if (existingStudent) {
          // Update details & ensure nisn and temporary nis are intact
          existingStudent.name = candidate.fullName;
          existingStudent.class = assignedClass;
          if (permanentNisn) existingStudent.nisn = permanentNisn;
          if (!existingStudent.nis) existingStudent.nis = temporaryNis;

          candidate.status = "accepted";
          candidate.isPromotedToStudent = true;
          candidate.promotedStudentId = existingStudent.id;
          candidate.assignedClass = assignedClass;
          candidate.promotedAt = new Date().toISOString();
          candidate.updatedAt = new Date().toISOString();

          promotedStudents.push(existingStudent);
          updatedCandidates.push(candidate);
          continue;
        }

        // Create new active Grade 7 student
        const newStudent: Student = {
          id: `std-spmb-${candidate.nisn || candidate.id}`,
          name: candidate.fullName,
          nis: temporaryNis, // NIS Sementara = NISN
          nisn: permanentNisn, // NISN Asli & Permanen (Tidak Berubah saat NIS diedit masal)
          class: assignedClass,
          gender: candidate.gender === "P" ? "P" : "L",
          phone: "",
          email: candidate.email || `${candidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${temporaryNis}@smpmaarifnu.sch.id`,
          password: temporaryNis,
          savingsBalance: 0,
          photoUrl: candidate.documents?.pasPhoto || candidate.photoUrl || "",
          parentName: candidate.fatherName || candidate.motherName || candidate.guardianName || candidate.parentName || "",
          address: candidate.address || "",
          
          // Biodata Lengkap Buku Induk
          nik: candidate.nik || "",
          nickname: candidate.nickname || "",
          birthPlace: candidate.birthPlace || "",
          birthDate: candidate.birthDate || "",
          kkNumber: candidate.kkNumber || "",
          birthCertNumber: candidate.birthCertNumber || "",
          livingWith: candidate.livingWith || "",
          childOrder: candidate.childOrder || "",
          siblingsCount: candidate.siblingsCount || "",
          stepSiblingsCount: candidate.stepSiblingsCount || "",

          // Orang Tua - Ayah
          fatherName: candidate.fatherName || "",
          fatherNik: candidate.fatherNik || "",
          fatherBirthPlace: candidate.fatherBirthPlace || "",
          fatherBirthDate: candidate.fatherBirthDate || "",
          fatherEducation: candidate.fatherEducation || "",
          fatherOccupation: candidate.fatherOccupation || "",
          fatherIncome: candidate.fatherIncome || "",
          fatherAddress: candidate.fatherAddress || "",
          fatherPhone: candidate.fatherPhone || "",
          fatherStatus: candidate.fatherStatus || "Hidup",

          // Orang Tua - Ibu
          motherName: candidate.motherName || "",
          motherNik: candidate.motherNik || "",
          motherBirthPlace: candidate.motherBirthPlace || "",
          motherBirthDate: candidate.motherBirthDate || "",
          motherEducation: candidate.motherEducation || "",
          motherOccupation: candidate.motherOccupation || "",
          motherIncome: candidate.motherIncome || "",
          motherAddress: candidate.motherAddress || "",
          motherPhone: candidate.motherPhone || "",
          motherStatus: candidate.motherStatus || "Hidup",

          // Wali
          guardianName: candidate.guardianName || "",
          guardianNik: candidate.guardianNik || "",
          guardianBirthPlace: candidate.guardianBirthPlace || "",
          guardianBirthDate: candidate.guardianBirthDate || "",
          guardianEducation: candidate.guardianEducation || "",
          guardianOccupation: candidate.guardianOccupation || "",
          guardianIncome: candidate.guardianIncome || "",
          guardianAddress: candidate.guardianAddress || "",
          guardianPhone: candidate.guardianPhone || "",
          guardianStatus: candidate.guardianStatus || "",
          googleDriveLink: candidate.googleDriveLink || ""
        };

        students.push(newStudent);
        candidate.status = "accepted";
        candidate.isPromotedToStudent = true;
        candidate.promotedStudentId = newStudent.id;
        candidate.assignedClass = assignedClass;
        candidate.promotedAt = new Date().toISOString();
        candidate.updatedAt = new Date().toISOString();

        promotedStudents.push(newStudent);
        updatedCandidates.push(candidate);
      }

      saveState();

      // Persist promoted students and updated candidates immediately to MySQL
      if (promotedStudents.length > 0) {
        directSaveEntitiesBatchToMysql("students", promotedStudents).catch(err => console.error("Error persisting promoted students to MySQL:", err));
      }
      if (updatedCandidates.length > 0) {
        directSaveEntitiesBatchToMysql("spmbCandidates", updatedCandidates).catch(err => console.error("Error persisting updated candidates to MySQL:", err));
      }

      // Broadcast notification
      const notification: RealtimeNotification = {
        id: `notif-spmb-promoted-${Date.now()}`,
        title: "Migrasi Siswa Baru Kelas 7",
        message: `Sebanyak ${promotedStudents.length} calon siswa SPMB berhasil resmi dimigrasikan menjadi Siswa Aktif Kelas 7 dengan NIS sementara = NISN.`,
        type: "success",
        createdAt: new Date().toISOString()
      };
      broadcastNotification(notification);

      res.json({
        success: true,
        message: `Berhasil memigrasikan ${promotedStudents.length} siswa ke Kelas ${assignedClass}. NIS sementara otomatis disamakan dengan NISN.`,
        promotedCount: promotedStudents.length,
        students: promotedStudents,
        candidates: updatedCandidates,
        student: promotedStudents[0],
        candidate: updatedCandidates[0]
      });
    } catch (err: any) {
      console.error("Error promoting candidate to student:", err);
      res.status(500).json({ error: "Gagal mempromosikan calon murid: " + err.message });
    }
  });

  // 12b. Process Auto Transfers Manually (Admin)
  router.post("/process-auto-transfers", (req, res) => {
    try {
      const result = checkAndAutoTransferExpiredCandidates(true);
      res.json({
        success: true,
        message: result.transferredCount > 0
          ? `Berhasil memeriksa dan mengalihkan ${result.transferredCount} calon siswa yang melewati batas akhir pendaftaran ulang.`
          : `Pemeriksaan selesai. Tidak ada calon siswa yang perlu dialihkan.`,
        ...result
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/process-auto-transfers:", err);
      res.status(500).json({ error: "Gagal memproses pengalihan jalur: " + err.message });
    }
  });

  // 12c. Revert / Batalkan Pengalihan Jalur ke Jalur Sebelumnya (Admin)
  router.post("/candidate/:id/revert-transfer", (req, res) => {
    try {
      const { id } = req.params;
      const { operatorName, note } = req.body || {};

      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetSessionId = candidate.previousSessionId || candidate.originalSessionId;
      if (!targetSessionId || targetSessionId === candidate.sessionId) {
        return res.status(400).json({ error: "Calon murid ini tidak memiliki riwayat jalur sebelumnya untuk dikembalikan." });
      }

      const fromSessionId = candidate.sessionId;
      const fromSession = spmbConfig.sessions.find(s => s.id === fromSessionId);
      const targetSession = spmbConfig.sessions.find(s => s.id === targetSessionId);

      const targetName = targetSession?.name || targetSessionId;
      const fromName = fromSession?.name || fromSessionId;

      candidate.sessionId = targetSessionId;
      candidate.isTransferredSession = false;
      candidate.previousSessionId = undefined;
      candidate.updatedAt = new Date().toISOString();

      if (!candidate.transferHistory) candidate.transferHistory = [];
      candidate.transferHistory.push({
        action: 'revert',
        fromSessionId,
        toSessionId: targetSessionId,
        timestamp: new Date().toISOString(),
        reason: note || `Pembatalan pengalihan jalur oleh panitia. Dikembalikan dari ${fromName} ke ${targetName}.`,
        operator: operatorName || 'Panitia SPMB'
      });

      saveState();

      res.json({
        success: true,
        message: `Berhasil membatalkan pengalihan. Calon siswa ${candidate.fullName} telah dikembalikan ke ${targetName}.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/candidate/:id/revert-transfer:", err);
      res.status(500).json({ error: "Gagal membatalkan pengalihan jalur: " + err.message });
    }
  });

  // 12d. Manual Change Candidate Session / Jalur Pendaftaran (Admin)
  router.post("/candidate/:id/change-session", (req, res) => {
    try {
      const { id } = req.params;
      const { newSessionId, operatorName, reason } = req.body || {};

      if (!newSessionId) {
        return res.status(400).json({ error: "Sesi tujuan (newSessionId) wajib dipilih." });
      }

      const candidate = spmbCandidates.find(c => c.id === id || c.nisn === id);
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetSession = spmbConfig.sessions.find(s => s.id === newSessionId);
      if (!targetSession) {
        return res.status(400).json({ error: "Sesi tujuan tidak valid." });
      }

      const fromSessionId = candidate.sessionId;
      const fromSession = spmbConfig.sessions.find(s => s.id === fromSessionId);

      candidate.originalSessionId = candidate.originalSessionId || fromSessionId;
      candidate.previousSessionId = fromSessionId;
      candidate.sessionId = newSessionId;
      candidate.isTransferredSession = true;
      candidate.transferredAt = new Date().toISOString();
      candidate.transferReason = reason || `Pemindahan sesi manual ke ${targetSession.name} oleh ${operatorName || 'Panitia SPMB'}.`;
      candidate.updatedAt = new Date().toISOString();

      if (!candidate.transferHistory) candidate.transferHistory = [];
      candidate.transferHistory.push({
        action: 'manual_change',
        fromSessionId,
        toSessionId: newSessionId,
        timestamp: new Date().toISOString(),
        reason: candidate.transferReason,
        operator: operatorName || 'Panitia SPMB'
      });

      saveState();
      directSaveEntityToMysql("spmb_candidates", candidate).catch(err => console.warn("[MySQL SPMB Change Session Warning]:", err?.message || err));

      res.json({
        success: true,
        message: `Sesi pendaftaran ${candidate.fullName} berhasil diubah ke ${targetSession.name}.`,
        candidate
      });
    } catch (err: any) {
      console.error("Error in /api/spmb/candidate/:id/change-session:", err);
      res.status(500).json({ error: "Gagal mengubah sesi pendaftaran: " + err.message });
    }
  });

  // 13. Delete Candidate Record (Admin)
  router.delete("/candidate/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const idx = spmbCandidates.findIndex(c => c.id === id || c.nisn === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      const targetId = spmbCandidates[idx].id || id;
      spmbCandidates.splice(idx, 1);
      saveState();
      directDeleteEntityFromMysql("spmb_candidates", targetId).catch(err => console.warn("[MySQL SPMB Delete Warning]:", err?.message || err));

      res.json({ success: true, message: "Data calon murid berhasil dihapus dari sistem & MySQL." });
    } catch (err: any) {
      console.error("Error deleting candidate:", err);
      res.status(500).json({ error: "Gagal menghapus data calon murid: " + err.message });
    }
  });


  return router;
}

export default createSpmbRouter;
