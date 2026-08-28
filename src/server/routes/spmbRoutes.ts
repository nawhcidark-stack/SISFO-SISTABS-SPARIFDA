import { Router } from "express";
import multer from "multer";
import { SpmbCandidate, SpmbConfig, Student, RealtimeNotification, MidtransConfig } from "../../types";

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

export interface SpmbRouterDeps {
  spmbConfig: SpmbConfig;
  spmbCandidates: SpmbCandidate[];
  students: Student[];
  whatsappConfig: any;
  midtransConfig: MidtransConfig;
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
    saveState, 
    broadcastNotification, 
    sendWhatsappNotification, 
    checkAndAutoTransferExpiredCandidates,
    recordOrUpdateMidtransTransaction
  } = deps;

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
      res.json({ success: true, message: "Konfigurasi SPMB berhasil diperbarui.", config: spmbConfig });
    } catch (err: any) {
      console.error("Error updating SPMB config:", err);
      res.status(500).json({ error: "Gagal memperbarui konfigurasi SPMB: " + err.message });
    }
  });

  // 3. Get All Candidates (Admin)
  router.get("/candidates", (req, res) => {
    // Jalankan pemeriksaan otomatisasi pengalihan sesi bagi calon yang melewati batas akhir
    checkAndAutoTransferExpiredCandidates();
    // Only return registered candidates who have completed or waived token payment
    const validCandidates = spmbCandidates.filter(c => c.tokenPaid || c.tokenPaymentStatus === 'paid' || c.tokenPaymentStatus === 'waived');
    res.json(validCandidates);
  });

  // 4. Check Candidate Status by NISN (Automatically delete/deny if token is unpaid)
  router.get("/candidate/:nisn", (req, res) => {
    // Jalankan pemeriksaan otomatisasi pengalihan sesi
    checkAndAutoTransferExpiredCandidates();

    const rawNisn = (req.params.nisn || "").trim();
    if (!rawNisn) {
      return res.status(400).json({ error: "NISN wajib diisi." });
    }

    const candidateIdx = spmbCandidates.findIndex(c => (c.nisn || "").trim() === rawNisn || (c.registrationNumber || "").trim().toLowerCase() === rawNisn.toLowerCase());
    if (candidateIdx === -1) {
      return res.status(404).json({ error: `Calon murid dengan NISN/Nomor Pendaftaran '${rawNisn}' tidak ditemukan.` });
    }

    const candidate = spmbCandidates[candidateIdx];
    // Jika belum membayar token, otomatis data tidak tersimpan / dihapus dari sistem
    if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== 'paid' && candidate.tokenPaymentStatus !== 'waived') {
      spmbCandidates.splice(candidateIdx, 1);
      saveState();
      return res.status(404).json({ error: `Calon murid belum menyelesaikan pembayaran token. Data pendaftaran tidak tersimpan, silakan input formulir pendaftaran ulang.` });
    }

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
          spmbCandidates.splice(index, 1);
          saveState();
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

      const isMaarif = schoolOriginType === 'maarif_jogosari' || 
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
      if (isMaarif) {
        if (spmbConfig.maarifBuildingDiscountType === 'percent') {
          maarifBuildingDiscount = Math.round(buildingFee * ((spmbConfig.maarifBuildingDiscount || 0) / 100));
        } else {
          maarifBuildingDiscount = spmbConfig.maarifBuildingDiscount || 0;
        }
      }

      let maarifUniformDiscount = 0;
      if (isMaarif) {
        if (spmbConfig.maarifUniformDiscountType === 'percent') {
          maarifUniformDiscount = Math.round(uniformTotal * ((spmbConfig.maarifUniformDiscount || 0) / 100));
        } else {
          maarifUniformDiscount = spmbConfig.maarifUniformDiscount || 0;
        }
      }

      const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
      const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);
      const netUniformTotal = Math.max(0, uniformTotal - maarifUniformDiscount);
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
        existingCandidate.schoolOriginType = schoolOriginType || (isMaarif ? 'maarif_jogosari' : 'other');
        existingCandidate.registrationType = registrationType || existingCandidate.registrationType || 'online_individual';
        existingCandidate.email = email || existingCandidate.email;
        existingCandidate.tokenFee = tokenFee;
        existingCandidate.tokenAmount = tokenFee;
        existingCandidate.tokenOrderId = orderId;
        existingCandidate.tokenPaymentOrderId = orderId;
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
          birthPlace: req.body.birthPlace || "",
          birthDate: req.body.birthDate || "",
          phone: cleanPhone,
          schoolOrigin: effectiveSchoolOrigin,
          schoolOriginType: schoolOriginType || (isMaarif ? 'maarif_jogosari' : 'other'),
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
          tokenPaymentStatus: "unpaid",
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

  // 6. Verify or Simulate Token Payment Success
  router.post("/verify-token-payment", async (req, res) => {
    try {
      const { orderId, nisn, paymentMethod } = req.body;
      if (!orderId && !nisn) {
        return res.status(400).json({ error: "Order ID atau NISN wajib disertakan." });
      }

      const candidate = spmbCandidates.find(c => 
        (orderId && (c.tokenOrderId === orderId || c.tokenPaymentOrderId === orderId)) ||
        (nisn && (c.nisn || "").trim() === (nisn || "").trim())
      );

      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      candidate.tokenPaid = true;
      candidate.tokenPaymentStatus = "paid";
      candidate.tokenPaidAt = new Date().toISOString();
      candidate.tokenPaymentMethod = paymentMethod || "Midtrans Snap Online";
      candidate.status = "registered";
      candidate.updatedAt = new Date().toISOString();

      saveState();

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
          `Pembayaran formulir/token pendaftaran sebesar *Rp ${(candidate.tokenFee || candidate.tokenAmount || 50000).toLocaleString("id-ID")}* telah BERHASIL diverifikasi.\n\n` +
          `• No. Pendaftaran: *${candidate.registrationNumber || candidate.registrationNo || candidate.nisn}*\n` +
          `• Sesi: *${candidate.sessionName || "SPMB"}*\n` +
          `• Status: *TERDAFTAR (Silakan Lanjut Isi Buku Induk)*\n\n` +
          `Silakan buka portal SPMB untuk melanjutkan pengisian data lengkap buku induk dan pembayaran daftar ulang seragam.\n\n` +
          `-- PANITIA SPMB SMP MAARIF NU PANDAAN --`;
        sendWhatsappNotification(targetPhone, waMsg).catch(e => console.error("Error sending SPMB token WA:", e));
      }

      res.json({
        success: true,
        message: "Pembayaran token pendaftaran berhasil dikonfirmasi.",
        candidate
      });
    } catch (err: any) {
      console.error("Error in verify-token-payment:", err);
      res.status(500).json({ error: "Gagal memverifikasi pembayaran token: " + err.message });
    }
  });

  // 7. Save Complete Form (Format Buku Induk Siswa)
  router.post("/save-full-form", (req, res) => {
    try {
      const { nisn, fullFormData, formData, uniformSizes } = req.body;
      if (!nisn) {
        return res.status(400).json({ error: "NISN wajib disertakan." });
      }

      const candidate = spmbCandidates.find(c => (c.nisn || "").trim() === (nisn || "").trim());
      if (!candidate) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      if (!candidate.tokenPaid && candidate.tokenPaymentStatus !== "paid") {
        return res.status(400).json({ error: "Token pendaftaran belum dibayar. Mohon selesaikan pembayaran token terlebih dahulu." });
      }

      const incomingData = fullFormData || formData || {};
      if (incomingData.fullName) {
        incomingData.fullName = String(incomingData.fullName).trim().toUpperCase();
      }

      Object.assign(candidate, incomingData);
      if (candidate.fullName) {
        candidate.fullName = String(candidate.fullName).trim().toUpperCase();
      }
      candidate.isFormCompleted = true;
      candidate.formCompletedAt = new Date().toISOString();
      candidate.fullFormData = { ...(candidate.fullFormData || {}), ...incomingData };
      if (uniformSizes) {
        candidate.uniformSizes = { ...(candidate.uniformSizes || {}), ...uniformSizes };
      }
      
      candidate.status = "form_submitted";
      candidate.updatedAt = new Date().toISOString();

      saveState();

      res.json({
        success: true,
        message: "Data formulir buku induk calon murid berhasil disimpan.",
        candidate
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

      const isMaarif = candidate.schoolOriginType === 'maarif_jogosari' || 
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
      if (isMaarif) {
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
      if (isMaarif) {
        if (spmbConfig.maarifUniformDiscountType === 'percent') {
          maarifUniformDiscount = Math.round(rawUniformTotal * ((spmbConfig.maarifUniformDiscount || 0) / 100));
        } else {
          maarifUniformDiscount = spmbConfig.maarifUniformDiscount || 0;
        }
      }
      const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount);

      const defaultTotal = netBuildingFee + julySppFee + baseAdmFee + netUniformTotal;
      const totalAmount = customAmount ? Number(customAmount) : defaultTotal;

      const orderId = `SPMB-REREG-${candidate.nisn}-${Date.now()}`;
      candidate.reRegistrationOrderId = orderId;
      candidate.reRegistrationFee = totalAmount;
      candidate.reRegistrationAmount = totalAmount;
      candidate.uniformCost = netUniformTotal;
      if (selectedUniforms) candidate.selectedUniforms = selectedUniforms;
      if (uniformSizes) candidate.uniformSizes = uniformSizes;
      candidate.updatedAt = new Date().toISOString();

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

        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: totalAmount
          },
          customer_details: {
            first_name: candidate.fullName,
            email: candidate.email || `spmb.${candidate.nisn}@smpmaarifnu.sch.id`,
            phone: candidate.parentPhone || candidate.phone
          },
          item_details: [
            {
              id: "BUILDING-FEE",
              price: buildingFee,
              quantity: 1,
              name: "Uang Gedung / Infaq Pembangunan"
            },
            ...(buildingWaveDiscount > 0 ? [{
              id: "DISC-BUILDING-WAVE",
              price: -buildingWaveDiscount,
              quantity: 1,
              name: `Diskon Uang Gedung (${discountPercent}% - ${selectedSession?.name || "Sesi"})`
            }] : []),
            ...(maarifBuildingDiscount > 0 ? [{
              id: "DISC-BUILDING-MAARIF",
              price: -maarifBuildingDiscount,
              quantity: 1,
              name: "Diskon Gedung Khusus SD Maarif Jogosari"
            }] : []),
            {
              id: "SPP-JULY",
              price: julySppFee,
              quantity: 1,
              name: "SPP Bulan Juli 2027"
            },
            ...(baseAdmFee > 0 ? [{
              id: "REREG-BASE",
              price: baseAdmFee,
              quantity: 1,
              name: "Biaya Administrasi"
            }] : []),
            ...eligibleUniforms.map(u => ({
              id: u.id,
              price: u.price,
              quantity: 1,
              name: u.name.slice(0, 50)
            })),
            ...(maarifUniformDiscount > 0 ? [{
              id: "DISC-UNIFORM-MAARIF",
              price: -maarifUniformDiscount,
              quantity: 1,
              name: "Diskon Seragam Khusus SD Maarif Jogosari"
            }] : [])
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

  // 10. Upload Registration Documents
  router.post("/upload-documents", (req, res) => {
    try {
      const { nisn, documents } = req.body;
      if (!nisn || !documents) {
        return res.status(400).json({ error: "NISN dan data berkas wajib disertakan." });
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
        return res.status(400).json({ error: "Tahap 2 belum selesai: Lengkapi dan simpan Data Lengkap Siswa terlebih dahulu sebelum mengunggah berkas." });
      }

      candidate.documents = { ...(candidate.documents || {}), ...documents };
      candidate.documentsUploaded = true;
      candidate.documentsUploadedAt = new Date().toISOString();
      if (candidate.reRegistrationPaid || candidate.reRegistrationStatus === "paid") {
        candidate.status = "accepted";
      } else {
        candidate.status = "documents_verified";
      }
      candidate.updatedAt = new Date().toISOString();

      saveState();

      res.json({
        success: true,
        message: "Berkas pendaftaran berhasil disimpan. Calon murid resmi diterima!",
        candidate
      });
    } catch (err: any) {
      console.error("Error in upload-documents:", err);
      res.status(500).json({ error: "Gagal mengunggah berkas: " + err.message });
    }
  });

  // 11. Admin Update Status or Notes
  router.post("/update-status", (req, res) => {
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
          phone: candidate.phone || candidate.fatherPhone || candidate.motherPhone || "",
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
  router.delete("/candidate/:id", (req, res) => {
    try {
      const id = req.params.id;
      const idx = spmbCandidates.findIndex(c => c.id === id || c.nisn === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Data calon murid tidak ditemukan." });
      }

      spmbCandidates.splice(idx, 1);
      saveState();

      res.json({ success: true, message: "Data calon murid berhasil dihapus." });
    } catch (err: any) {
      console.error("Error deleting candidate:", err);
      res.status(500).json({ error: "Gagal menghapus data calon murid: " + err.message });
    }
  });


  return router;
}

export default createSpmbRouter;
