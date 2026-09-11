import { GoogleGenAI } from "@google/genai";
import { SpmbConfig } from "../types";

export interface SpmbAiChatMessage {
  role: "user" | "model";
  text: string;
}

export interface SpmbAiContext {
  spmbConfig: SpmbConfig;
  schoolIdentity?: any;
}

// Lazy-initialized GoogleGenAI client (only when needed)
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}

/**
 * Builds dynamic system instructions using live school identity and SPMB config
 */
function buildSystemInstruction(context: SpmbAiContext): string {
  const { spmbConfig, schoolIdentity } = context;

  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const address = schoolIdentity?.address || "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur";
  const phone = schoolIdentity?.phone || "(0343) 631234";
  const principal = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";
  const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
  const contactPhone = spmbConfig.contactPhone || phone || "0812-3456-7890";

  const sessionsText = (spmbConfig.sessions || []).map((s, idx) => {
    const status = s.isActive ? "DIBUKA (Aktif)" : "Belum Aktif / Ditutup";
    const discount = s.discountPercent ? `${s.discountPercent}%` : s.discountAmount ? `Rp ${s.discountAmount.toLocaleString("id-ID")}` : "Tidak ada potongan";
    return `- Sesi ${idx + 1}: ${s.name} (${s.startDate} s.d. ${s.endDate}) | Kuota: ${s.quota} murid | Status: ${status} | Diskon Uang Gedung: ${discount} | Keterangan: ${s.description}`;
  }).join("\n");

  const uniformList = (spmbConfig.uniformItems || []).map(u => 
    `- ${u.name} (Rp ${u.price.toLocaleString("id-ID")}) [${u.gender === "both" ? "Putra & Putri" : u.gender === "male" ? "Khusus Putra" : "Khusus Putri"}]`
  ).join("\n");

  const tokenFee = spmbConfig.registrationTokenFee || 50000;
  const buildingFee = spmbConfig.buildingFee || 1500000;
  const julySpp = spmbConfig.julySppFee || 200000;

  const maarifDiscountText = `Diskon Khusus Siswa Asal SD MAARIF JOGOSARI:
- Uang Gedung: Tambahan potongan ${spmbConfig.maarifBuildingDiscountType === 'percent' ? `${spmbConfig.maarifBuildingDiscount}%` : `Rp ${(spmbConfig.maarifBuildingDiscount || 250000).toLocaleString('id-ID')}`}
- Seragam & Perlengkapan: Tambahan potongan ${spmbConfig.maarifUniformDiscountType === 'percent' ? `${spmbConfig.maarifUniformDiscount}%` : `Rp ${(spmbConfig.maarifUniformDiscount || 100000).toLocaleString('id-ID')}`}`;

  return `Anda adalah "Asisten AI SMP Ma'arif NU Pandaan" yang ramah, sopan, santun islami, berpengetahuan lengkap, dan sangat membantu calon wali murid serta siswa baru dalam proses Penerimaan Murid Baru (SPMB) Tahun Ajaran 2027/2028.

IDENTITAS LEMBAGA & SEKOLAH:
- Nama Sekolah: ${schoolName}
- Naungan: Lembaga Pendidikan Ma'arif Nahdlatul Ulama (LP Ma'arif NU) Cabang Pasuruan
- Status Akreditasi: ${accreditation}
- Alamat Kampus: ${address}
- Kepala Sekolah: ${principal}
- Kontak WhatsApp Panitia SPMB: ${contactPhone}
- Visi & Karakter: Sekolah Ramah Anak Berkarakter Ahlussunnah wal Jama'ah (Aswaja) An-Nahdliyah, Unggul Prestasi Akademik & Non-Akademik, Berwawasan Teknologi Modern.
- Fasilitas: Laboratorium Komputer Modern Ber-AC (Computer-Based Test / CBT), Masjid/Musholla As-Salam, Perpustakaan Lengkap, Laboratorium IPA, Lapangan Futsal & Olahraga, Ruang Kelas Representatif, WiFi Area.
- Program Unggulan:
  1. Tahfidz Al-Qur'an (Juz 'Amma & Surat Pilihan) dengan pembimbing bersanad
  2. Kurikulum Merdeka Terintegrasi Muatan Aswaja & Nilai Kepesantrenan
  3. Digital Literacy & Pengenalan Teknologi Informasi
  4. Pembiasaan Amaliyah Aswaja: Sholat Dhuha bersama, Sholat Dhuhur Berjamaah, Istighotsah, Rotibul Haddad, dan Tahlil.
- Ekstrakurikuler:
  Pramuka Ma'arif NU, Pagar Nusa (Pencak Silat NU), IPNU-IPPNU (Organisasi Kesiswaan), Hadrah/Rebana Al-Banjari, Drumband Gema Ma'arif, Futsal, Bola Voli, Seni Baca Al-Qur'an (Qiro'ah), Kaligrafi, dan English Club.

INFORMASI LENGKAP SPMB TA 2027/2028:
- Pendaftaran Online: Dilakukan melalui Landing Page Resmi SPMB SMP Ma'arif NU Pandaan.
- 3 Jalur/Sesi Pendaftaran:
${sessionsText}

RINCIAN BIAYA SPMB:
1. Token Pendaftaran Awal: Rp ${tokenFee.toLocaleString("id-ID")} (Dibayarkan sekali di awal melalui Midtrans online untuk aktivasi data akun dan pengisian biodata lengkap).
2. Infaq Uang Gedung: Standar Rp ${buildingFee.toLocaleString("id-ID")} (Bisa dipotong diskon sesi: Inden diskon 50%, Gelombang 1 diskon 25%).
3. SPP Bulan Pertama (Juli 2027): Rp ${julySpp.toLocaleString("id-ID")}.
4. Seragam & Atribut Sekolah Lengkap:
${uniformList}

${maarifDiscountText}

ALUR 5 LANGKAH PENDAFTARAN SPMB (SANGAT MUDAH & CEPAT):
1. Langkah 1 (Isi Data Awal): Calon murid/wali murid mengisi identitas singkat di halaman pendaftaran (Nama Lengkap, NISN, NIK, No WhatsApp, Asal SD/MI, dan pilih Jalur Sesi).
2. Langkah 2 (Bayar Token): Membayar token Rp 50.000 via Gateway Midtrans (dapat menggunakan QRIS, GoPay, ShopeePay, Transfer Virtual Account BCA/BRI/BNI/Mandiri).
3. Langkah 3 (Lengkapi Biodata): Buka tab "Cek Status" menggunakan NISN, lalu lengkapi Formulir Biodata Detail Siswa dan Orang Tua/Wali.
4. Langkah 4 (Unggah Berkas): Unggah foto/scan Akte Kelahiran, Kartu Keluarga (KK), Pas Foto Siswa 3x4, dan KTP Orang Tua (sistem otomatis mengompresi gambar).
5. Langkah 5 (Daftar Ulang & Tanda Terima): Pilih ukuran seragam (S, M, L, XL, XXL, atau Custom), selesaikan pembayaran daftar ulang, dan unduh/cetak Kuitansi Resmi serta Kartu Pendaftaran yang dilengkapi QR Code.

PANDUAN MENJAWAB:
- Jawab dengan bahasa Indonesia yang santun, hangat, profesional, dan bernuansa islami (misal mengawali dengan salam islami jika baru menyapa).
- Jelaskan rincian angka biaya dan jadwal secara akurat sesuai data di atas.
- Jika ditanya tentang cara daftar atau cek status, arahkan ke tab navigasi yang tersedia di halaman: "Daftar Sekarang" atau "Cek Status (NISN)".
- Format jawaban dengan rapi menggunakan bullet points atau numbering agar mudah dibaca oleh wali murid lewat smartphone.
- Jika ada hal teknis khusus yang membutuhkan verifikasi berkas langsung, sampaikan bahwa panitia SPMB siap membantu melalui WhatsApp ${contactPhone} atau di sekretariat sekolah.`;
}

/**
 * Intelligent Knowledge Base Fallback Engine
 * Provides accurate answers when Gemini API key is unavailable, depleted, or has network issues.
 */
export function generateKnowledgeBaseReply(
  userQuery: string,
  context: SpmbAiContext
): { reply: string; matchedCategory: string } {
  const query = userQuery.toLowerCase().trim();
  const { spmbConfig, schoolIdentity } = context;

  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const address = schoolIdentity?.address || "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur";
  const phone = schoolIdentity?.phone || spmbConfig.contactPhone || "(0343) 631234 / 0812-3456-7890";
  const principal = schoolIdentity?.principal || "H. Ahmad Fuad, S.Pd, M.PdI";
  const tokenFee = (spmbConfig.registrationTokenFee || 50000).toLocaleString("id-ID");
  const buildingFee = (spmbConfig.buildingFee || 1500000).toLocaleString("id-ID");
  const julySpp = (spmbConfig.julySppFee || 200000).toLocaleString("id-ID");

  // 1. Salam / Greetings
  if (/^(halo|hai|assalamu|assalamualaikum|pagi|siang|sore|malam|permisi|tes|ping)/i.test(query)) {
    return {
      matchedCategory: "greetings",
      reply: `**Wa'alaikumussalam Warahmatullahi Wabarakatuh!** 🌿\n\nSelamat datang di Layanan Informasi SPMB **${schoolName}** Tahun Ajaran 2027/2028.\n\nSaya siap membantu Bapak/Ibu dan calon siswa mengenai:\n- 📅 **Jadwal & Jalur Pendaftaran** (Inden, Gelombang 1, Gelombang 2)\n- 💰 **Rincian Biaya & Simulasi Diskon** (Uang Gedung, SPP, Seragam)\n- 🌟 **Diskon Khusus Alumni SD Ma'arif Jogosari**\n- 📝 **Alur 5 Langkah Pendaftaran Online**\n- 📄 **Syarat & Dokumen yang Diperlukan**\n- 🏫 **Profil Sekolah, Fasilitas, & Program Unggulan**\n\nAda informasi tertentu yang ingin ditanyakan? Silakan ketik pertanyaan Anda!`
    };
  }

  // 2. Jalur / Sesi Pendaftaran & Jadwal
  if (/(jalur|sesi|jadwal|gelombang|kapan dibuka|kapan ditutup|kuota|inden)/i.test(query)) {
    const sessionDetails = (spmbConfig.sessions || []).map((s, idx) => {
      const disc = s.discountPercent ? `Diskon Uang Gedung ${s.discountPercent}%` : s.discountAmount ? `Diskon Rp ${s.discountAmount.toLocaleString("id-ID")}` : "Biaya Reguler";
      return `**${idx + 1}. ${s.name}**\n   - Periode: ${s.startDate} s.d. ${s.endDate}\n   - Kuota: **${s.quota} Murid**\n   - Keuntungan: ${disc}\n   - Status: ${s.isActive ? "✅ Sedang Dibuka" : "⏳ Belum Dibuka"}`;
    }).join("\n\n");

    return {
      matchedCategory: "sessions",
      reply: `Penerimaan Peserta Didik Baru (SPMB) 2027/2028 di **${schoolName}** terbagi dalam 3 jalur pendaftaran:\n\n${sessionDetails}\n\n💡 **Saran Terbaik:** Daftarkan putra/putri Anda melalui **Jalur Inden** untuk mengamankan kuota kelas dan menikmati diskon uang gedung 50% serta prioritas pemesanan ukuran seragam!`
    };
  }

  // 3. Rincian Biaya & Diskon
  if (/(biaya|bayar|tarif|uang gedung|infaq|spp|harga|ongkos|murah|diskon|potongan)/i.test(query)) {
    return {
      matchedCategory: "fees",
      reply: `Berikut adalah transparansi rincian biaya pendaftaran SPMB 2027/2028 di **${schoolName}**:\n\n1. **Token Registrasi Awal:** **Rp ${tokenFee}**\n   *(Dibayar sekali di awal secara online via Midtrans untuk aktivasi berkas pendaftaran)*.\n\n2. **Infaq Uang Gedung:** Standar **Rp ${buildingFee}**\n   - Jalur Inden: **Diskon 50%** (Cukup bayar Rp 750.000)\n   - Gelombang 1: **Diskon 25%** (Cukup bayar Rp 1.125.000)\n   - Gelombang 2: Rp 1.500.000 (Normal)\n\n3. **SPP Bulan Juli 2027:** **Rp ${julySpp}** *(Bulan pertama tahun ajaran baru)*.\n\n4. **Paket Seragam & Atribut Lengkap:**\n   - Putra: **Rp 490.000** (Olahraga, Batik NU, Atribut, Hasduk, Topi, Kaos Kaki, Sabuk NU)\n   - Putri: **Rp 555.000** (Sama dengan putra + Jilbab Sekolah NU)\n\n🌟 **Diskon Spesial SD Maarif Jogosari:** Tambahan potongan Uang Gedung Rp 250.000 dan Seragam Rp 100.000!`
    };
  }

  // 4. SD Maarif Jogosari (Diskon Khusus Alumni)
  if (/(jogosari|sd maarif|alumni|khusus)/i.test(query)) {
    return {
      matchedCategory: "jogosari_discount",
      reply: `**Istimewa untuk Lulusan SD Ma'arif Jogosari Pandaan!** 🌟\n\nSebagai bagian dari satu payung LP Ma'arif NU, calon siswa lulusan **SD Ma'arif Jogosari** berhak mendapatkan potongan ganda saat mendaftar di ${schoolName}:\n\n1. **Tambahan Diskon Uang Gedung:** Potongan **Rp 250.000** (Dapat digabung dengan diskon Sesi Inden 50% atau Gelombang 1 25%).\n2. **Tambahan Diskon Seragam:** Potongan **Rp 100.000** dari total paket seragam resmi.\n3. **Bebas Tes Penjajakan:** Prioritas penempatan kelas unggulan dan pemilihan ukuran seragam terlebih dahulu.\n\nCara klaim: Cukup pilih asal sekolah **SD MAARIF JOGOSARI** saat mengisi formulir pendaftaran awal!`
    };
  }

  // 5. Alur & Cara Pendaftaran
  if (/(cara daftar|alur|langkah|tahap|proses pendaftaran|bagaimana cara|tutorial)/i.test(query)) {
    return {
      matchedCategory: "registration_flow",
      reply: `Pendaftaran SPMB di **${schoolName}** sangat praktis melalui **5 Langkah Online**:\n\n1. **Isi Formulir Awal:** Buka menu *"Daftar Sekarang"*, masukkan Nama, NISN, NIK, No WA, Asal Sekolah, dan pilih Jalur Sesi.\n2. **Bayar Token Rp ${tokenFee}:** Bayar via Midtrans Snap (QRIS, VA Bank BRI/BCA/BNI/Mandiri, atau e-Wallet).\n3. **Lengkapi Biodata:** Masuk ke tab *"Cek Status"* dengan NISN Anda, lalu lengkapi biodata detail siswa dan data orang tua/wali.\n4. **Upload Berkas Persyaratan:** Unggah foto Akte Kelahiran, KK, Pas Foto Siswa 3x4, dan KTP Orang Tua.\n5. **Daftar Ulang & Cetak Tanda Terima:** Pilih ukuran seragam (S/M/L/XL/XXL), selesaikan pembayaran daftar ulang, dan cetak Bukti Kuitansi Tanda Terima Resmi ber-KOP dan QR Code.`
    };
  }

  // 6. Syarat & Berkas Pendaftaran
  if (/(syarat|berkas|dokumen|persyaratan|akte|kk|ktp|foto|skl|ijazah)/i.test(query)) {
    return {
      matchedCategory: "requirements",
      reply: `Berikut berkas dan persyaratan pendaftaran murid baru di **${schoolName}**:\n\n📋 **Syarat Umum:**\n- Lulusan SD/MI atau sederajat.\n- Berusia maksimal 15 tahun pada tahun ajaran 2027/2028.\n- Memiliki Nomor Induk Siswa Nasional (NISN).\n\n📁 **Berkas yang Diunggah (Foto/Scan HP):**\n1. **Akte Kelahiran** calon siswa (Wajib)\n2. **Kartu Keluarga (KK)** (Wajib)\n3. **Pas Foto 3x4** berwarna berseragam SD/MI (Wajib)\n4. **KTP Orang Tua/Wali** (Ayah dan Ibu)\n5. *Opsional:* Kartu Indonesia Pintar (KIP) atau bukti prestasi jika memiliki.\n\n*Catatan: Sistem otomatis menyesuaikan resolusi foto sehingga proses upload sangat cepat dan tidak memakan kuota internet besar.*`
    };
  }

  // 7. Seragam & Ukuran
  if (/(seragam|baju|ukuran|size|batik|olahraga|hasduk|jilbab|atribut)/i.test(query)) {
    return {
      matchedCategory: "uniforms",
      reply: `**Informasi Seragam & Perlengkapan Sekolah:** 👕\n\nPaket seragam resmi yang disediakan sekolah meliputi:\n- Setelan Seragam Olahraga Lengkap (Atasan & Celana Trening)\n- Baju Batik Resmi Ma'arif NU\n- Bedge, Lokasi, & Atribut Lengkap Sekolah\n- Hasduk Pramuka & Ring Pramuka\n- Topi Upacara Sekolah\n- Kaos Kaki Sekolah (3 Pasang)\n- Ikat Pinggang / Gesper Logo NU\n- Jilbab / Kerudung Khusus Siswa Putri\n\n📏 **Pilihan Ukuran:**\nTersedia pilihan ukuran **S, M, L, XL, XXL**, serta ukuran **Khusus (Custom)** jika ada permintaan spesifik. Ukuran seragam dapat dipilih langsung di Portal SPMB saat tahap daftar ulang.`
    };
  }

  // 8. Pembayaran & Midtrans
  if (/(midtrans|qris|transfer|virtual account|rekening|metode pembayaran|cara bayar|bca|bri|mandiri|shopeepay|gopay)/i.test(query)) {
    return {
      matchedCategory: "payment_methods",
      reply: `Sistem SPMB **${schoolName}** terintegrasi dengan **Midtrans Payment Gateway Resmi** sehingga pembayaran dapat dilakukan secara langsung, aman, dan otomatis terverifikasi 24/7:\n\n💳 **Metode Pembayaran yang Didukung:**\n- **QRIS:** GoPay, OVO, ShopeePay, Dana, LinkAja, BCA Mobile, Livin, BRImo, dll.\n- **Virtual Account (VA):** Bank BRI, BCA, BNI, Mandiri, Permata.\n- **Loket Sekolah:** Bisa juga melakukan pembayaran tunai langsung di kantor TU/Bendahara Sekolah pada jam kerja (Senin - Sabtu, 07.30 - 13.00 WIB).\n\nSetelah pembayaran berhasil di Midtrans, sistem akan seketika menerbitkan Kuitansi Tanda Terima Resmi ber-QR Code.`
    };
  }

  // 9. Profil Sekolah, Visi, Fasilitas, & Program Unggulan
  if (/(profil|fasilitas|ekstrakurikuler|ekskul|visi|misi|akreditasi|tahfidz|aswaja|keunggulan|alamat|lokasi|dimana|kepala sekolah)/i.test(query)) {
    return {
      matchedCategory: "school_profile",
      reply: `🏫 **Tentang ${schoolName}:**\n- **Akreditasi:** ${schoolIdentity?.accreditation || "Terakreditasi A (Unggul)"}\n- **Kepala Sekolah:** ${principal}\n- **Alamat:** ${address}\n- **Kontak/WA:** ${phone}\n\n🌟 **Program Unggulan:**\n- **Tahfidz Al-Qur'an:** Bimbingan tahfidz terarah untuk Juz 'Amma dan Juz pilihan.\n- **Kurikulum Merdeka + Aswaja:** Memadukan sains, teknologi, dan akhlakul karimah Ahlussunnah wal Jama'ah.\n- **Digital Literacy:** Pembelajaran berbasis komputer dan lab CBT modern.\n- **Pembiasaan Ibadah:** Sholat Dhuha, Dhuhur Berjamaah, Istighotsah, Rotibul Haddad.\n\n🏆 **Ekstrakurikuler:** Pramuka Ma'arif, Pagar Nusa (Pencak Silat), Hadrah Banjari, Drumband, Futsal, Voli, Kaligrafi, IPNU/IPPNU, dan English Club.\n\n🏢 **Fasilitas:** Lab Komputer Ber-AC, Musholla Representatif, Perpustakaan Digital, Lab IPA, Lapangan Olahraga, Ruang Kelas Sejuk, dan Free WiFi Kampus.`
    };
  }

  // 10. Cek Status / Lupa NISN / Cetak Bukti
  if (/(cek status|status pendaftaran|cetak|kuitansi|tanda terima|kartu|nisn|lupa)/i.test(query)) {
    return {
      matchedCategory: "check_status",
      reply: `🔍 **Cara Mengecek Status & Mencetak Bukti Pendaftaran:**\n\n1. Klik tab **"Cek Status (NISN)"** pada menu bagian atas landing page SPMB.\n2. Masukkan **NISN** calon siswa yang didaftarkan.\n3. Klik tombol **"Cari Data Calon Murid"**.\n4. Anda akan langsung melihat status pendaftaran, biodata, status verifikasi berkas, dan bukti pembayaran.\n5. Jika sudah melunasi token atau daftar ulang, klik tombol **"Cetak Tanda Terima Resmi"** atau **"Cetak Kartu Bukti Pendaftaran"** untuk mengunduh kuitansi resmi ber-KOP sekolah dan ber-QR Code.`
    };
  }

  // Default fallback answer
  return {
    matchedCategory: "general_fallback",
    reply: `Terima kasih atas pertanyaannya! 😊\n\nSebagai Asisten AI **${schoolName}**, saya dapat memberikan informasi lengkap mengenai:\n- 📅 **Jadwal & Kuota Sesi Pendaftaran 2027/2028** (Inden diskon 50%, Gelombang 1 diskon 25%)\n- 💰 **Rincian Biaya Pendaftaran, Uang Gedung, & SPP**\n- 🌟 **Diskon Khusus Alumni SD Ma'arif Jogosari**\n- 📝 **Panduan 5 Langkah Pendaftaran Online**\n- 📁 **Syarat Berkas (Akte, KK, Pas Foto 3x4)**\n- 🏫 **Profil Sekolah, Fasilitas, & Program Tahfidz**\n\nUntuk bantuan langsung oleh Panitia SPMB, Bapak/Ibu juga dapat menghubungi WhatsApp di **${phone}** atau hadir di kantor sekretariat ${schoolName} (${address}).\n\nApakah ada rincian biaya atau langkah pendaftaran yang ingin dijelaskan lebih mendalam?`
  };
}

/**
 * Main Controller: Sends query to Gemini 3.8 Flash server-side.
 * If external API errors occur (e.g. 429 quota exhausted), smoothly falls back to the internal Knowledge Engine.
 */
export async function askSpmbAiAssistant(
  userQuery: string,
  history: SpmbAiChatMessage[] = [],
  context: SpmbAiContext
): Promise<{ reply: string; source: "gemini" | "knowledge_base"; category?: string }> {
  const cleanQuery = userQuery.trim();
  if (!cleanQuery) {
    return {
      reply: "Silakan masukkan pertanyaan seputar SMP Ma'arif NU Pandaan atau SPMB 2027/2028.",
      source: "knowledge_base"
    };
  }

  const ai = getGeminiClient();

  // If Gemini client is available, attempt to query Gemini 3.8 Flash
  if (ai) {
    try {
      const systemInstruction = buildSystemInstruction(context);

      // Build conversation contents preserving previous turns
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // Include recent history (limit to last 6 messages to keep context focused)
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      }

      // Add current user prompt
      contents.push({
        role: "user",
        parts: [{ text: cleanQuery }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const geminiText = response.text?.trim();
      if (geminiText) {
        return {
          reply: geminiText,
          source: "gemini"
        };
      }
    } catch (err: any) {
      console.warn("Gemini API call returned error, using smart SPMB Knowledge Base fallback:", err?.message || err);
      // Gracefully continue to knowledge base fallback
    }
  }

  // Graceful fallback to rich built-in knowledge base
  const kbResult = generateKnowledgeBaseReply(cleanQuery, context);
  return {
    reply: kbResult.reply,
    source: "knowledge_base",
    category: kbResult.matchedCategory
  };
}
