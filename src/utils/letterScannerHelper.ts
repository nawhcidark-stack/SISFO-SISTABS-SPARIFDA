import Tesseract from "tesseract.js";

export interface ExtractedLetterData {
  type: "masuk" | "keluar";
  letterNumber: string;
  letterDate: string;
  sender: string;
  recipient: string;
  subject: string;
  category: string;
  attachmentCount: string;
  signatory: string;
  summary: string;
  dispositionTo: string;
  rawText?: string;
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: "01",
  jan: "01",
  februari: "02",
  pebruari: "02",
  feb: "02",
  maret: "03",
  mar: "03",
  april: "04",
  apr: "04",
  mei: "05",
  juni: "06",
  jun: "06",
  juli: "07",
  jul: "07",
  agustus: "08",
  ags: "08",
  agu: "08",
  september: "09",
  sep: "09",
  sept: "09",
  oktober: "10",
  okt: "10",
  november: "11",
  nopember: "11",
  nov: "11",
  nop: "11",
  desember: "12",
  des: "12"
};

function normalizeOcrDigits(s: string): string {
  return s
    .replace(/\b([lI])(\d)\b/g, "1$2")
    .replace(/\b(\d)([O])\b/g, "$10")
    .replace(/\b2[O0]2(\d)\b/g, "202$1");
}

export function parseIndonesianDateToIso(text: string, fallbackIso: string): string {
  const clean = normalizeOcrDigits(text.replace(/\s+/g, " "));

  // 1. Format: [Kota], 17 November 2026 atau 17 November 2026
  const monthNamesPattern = Object.keys(INDONESIAN_MONTHS).join("|");
  const regexIndo = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNamesPattern})[a-z]*\\s+(20\\d{2})\\b`,
    "gi"
  );
  const matches = Array.from(clean.matchAll(regexIndo));
  if (matches.length > 0) {
    const m = matches[0];
    const day = String(parseInt(m[1], 10)).padStart(2, "0");
    const monthKey = m[2].toLowerCase();
    const month = INDONESIAN_MONTHS[monthKey] || "01";
    const year = m[3];
    if (Number(year) >= 2000 && Number(year) <= 2100 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 2. Format: DD-MM-YYYY atau DD/MM/YYYY
  const regexNum = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/;
  const mNum = clean.match(regexNum);
  if (mNum) {
    const day = String(parseInt(mNum[1], 10)).padStart(2, "0");
    const month = String(parseInt(mNum[2], 10)).padStart(2, "0");
    const year = mNum[3];
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  return fallbackIso;
}

export function parseIndonesianOfficialLetterText(
  rawText: string,
  schoolName = "SMP Ma'arif NU Pandaan",
  preferredType: "masuk" | "keluar" = "masuk"
): ExtractedLetterData {
  const todayIso = new Date().toISOString().split("T")[0];
  const normalizedRaw = normalizeOcrDigits(rawText || "");
  const lines = normalizedRaw
    .split(/\r?\n/)
    .map(l => l.replace(/[|_~`]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(l => l.length >= 2);

  const fullText = lines.join("\n");

  // 1. Ekstrak Nomor Surat (tahan terhadap typo OCR seperti N0mor, Nom0r, Nomer, No.)
  let letterNumber = "";
  for (const line of lines) {
    const m = line.match(
      /(?:n[o0]m[o0e]r|no\.?|n[o0]m[o0e]r\s+surat)\s*[:;=\-\.]+\s*([A-Za-z0-9\.\-\/,\s]{3,70})/i
    );
    if (m && m[1]) {
      const candidate = m[1]
        .split(
          /\s{2,}|\b(?:pandaan|pasuruan|surabaya|malang|sidoarjo|jakarta|tanggal|lampiran|perihal|kepada)\b/i
        )[0]
        .trim();
      if (candidate.length >= 2) {
        letterNumber = candidate;
        break;
      }
    }
  }
  if (!letterNumber) {
    const slashMatch = fullText.match(
      /\b([0-9A-Za-z\.\-]{1,12}\s*\/\s*[A-Za-z0-9\.\-]{1,20}\s*\/\s*[A-Za-z0-9\.\-\/]{2,35})\b/
    );
    if (slashMatch) {
      letterNumber = slashMatch[1].replace(/\s+/g, "");
    }
  }

  // 2. Ekstrak Lampiran
  let attachmentCount = "-";
  for (const line of lines) {
    const m = line.match(/(?:lamp[i1l]ran|lamp\.?)\s*[:;=\-\.]+\s*([^\n\r]{1,45})/i);
    if (m && m[1]) {
      const cleaned = m[1].split(/\s{2,}|\b(?:perihal|hal|kepada)\b/i)[0].trim();
      if (cleaned) {
        attachmentCount = cleaned;
        break;
      }
    }
  }

  // 3. Ekstrak Perihal / Hal (tahan terhadap typo OCR seperti Perlhal, Per1hal, HaI)
  let subject = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/(?:per[i1l]hal|h[a4][l1i])\s*[:;=\-\.]+\s*(.+)/i);
    if (m && m[1]) {
      let subj = m[1].split(/\s{2,}|\b(?:kepada|yth)\b/i)[0].trim();
      if (
        i + 1 < lines.length &&
        lines[i + 1].length < 65 &&
        !/^(?:kepada|yth|di\b|assalamu|dengan\s+hormat|nomor|lampiran|bismillah)/i.test(lines[i + 1])
      ) {
        subj = `${subj} ${lines[i + 1]}`.trim();
      }
      subject = subj.replace(/^[:;\-\.\s]+/, "").trim();
      break;
    }
  }
  if (!subject) {
    for (const line of lines) {
      const mTitle = line.match(
        /^(SURAT\s+(?:KETERANGAN|TUGAS|EDARAN|KEPUTUSAN|PENGANTAR|PERMOHONAN|UNDANGAN|PEMBERITAHUAN|REKOMENDASI|PERINGATAN|KUASA).*|UNDANGAN.*|PEMBERITAHUAN.*|PENGUMUMAN.*)$/i
      );
      if (mTitle) {
        subject = mTitle[1].trim();
        break;
      }
    }
  }

  // 4. Ekstrak Tanggal Surat
  const letterDate = parseIndonesianDateToIso(fullText, todayIso);

  // 5. Ekstrak Kop Surat / Instansi Pengirim
  let sender = "";
  const headerLines: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i];
    if (
      /^(?:n[o0]m[o0e]r|no\.?\s*[:;=\-]|lamp[i1l]ran|per[i1l]hal|hal\s*[:;=\-]|kepada|yth|assalamu|dengan\s+hormat|surat\s+)/i.test(
        l
      )
    ) {
      break;
    }
    if (
      /\b(?:jl\.|jalan|telp|telepon|hp\.|wa\.|email|e-mail|website|http|www\.|kode\s*pos|npsn|nss|terakreditasi)\b/i.test(
        l
      )
    ) {
      continue;
    }
    if (l.length >= 4 && !/^\d+$/.test(l)) {
      headerLines.push(l);
    }
  }
  if (headerLines.length > 0) {
    sender = headerLines.slice(0, 2).join(" - ");
  }

  // 6. Ekstrak Penerima / Tujuan (Kepada Yth...)
  let recipient = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const mInline = l.match(/(?:kepada\s+yth\.?|kepada|yth\.?|yang\s+terhormat)\s*[:;\-\.]?\s*(.*)/i);
    if (mInline) {
      const candidateParts: string[] = [];
      const firstPart = (mInline[1] || "").trim().replace(/^yth\.?\s*[:;\-\.]?\s*/i, "");
      if (firstPart && !/^(?:di\b|tempat\b)/i.test(firstPart)) {
        candidateParts.push(firstPart);
      }
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const nextL = lines[j];
        if (
          /^(?:di\b|di\s*[\-\s]*tempat|tempat$|assalamu|bismillah|dengan\s+hormat|sehubungan|menindaklanjuti|bersama\s+ini|mengharap)/i.test(
            nextL
          )
        ) {
          break;
        }
        candidateParts.push(nextL.replace(/^yth\.?\s*[:;\-\.]?\s*/i, ""));
      }
      recipient = candidateParts.join(" ").replace(/\s+/g, " ").trim();
      if (recipient) break;
    }
  }

  // 7. Ekstrak Detail Acara / Jadwal (Hari, Tanggal, Waktu, Tempat, Acara) & Ringkasan Isi
  const detailItems: string[] = [];
  for (const line of lines) {
    const mDetail = line.match(
      /^(hari\s*\/?\s*tanggal|hari|tanggal|waktu|pukul|jam|tempat|lokasi|acara|agenda|keperluan)\s*[:;=\-]\s*(.+)/i
    );
    if (mDetail && mDetail[2]) {
      const label = mDetail[1].trim();
      const val = mDetail[2].trim();
      detailItems.push(`${label}: ${val}`);
    }
  }

  const bodyLines: string[] = [];
  let inBody = false;
  for (const line of lines) {
    if (
      /^(?:dengan\s+hormat|assalamu|sehubungan\s+dengan|menindaklanjuti|berdasarkan|bersama\s+ini|diberitahukan|mengharap|kami\s+sampaikan)/i.test(
        line
      )
    ) {
      inBody = true;
    }
    if (
      inBody &&
      /^(?:demikian\s+surat|demikian\s+undangan|demikian\s+pemberitahuan|atas\s+perhatian|wassalamu|hormat\s+kami|mengetahui|kepala\s+|ketua\s+|sekretaris|nip\.|tembusan)/i.test(
        line
      )
    ) {
      break;
    }
    if (inBody && !/^(?:dengan\s+hormat|assalamu)/i.test(line)) {
      if (
        !/^(?:hari\s*\/?\s*tanggal|hari|tanggal|waktu|pukul|jam|tempat|lokasi|acara|agenda|keperluan)\s*[:;=\-]/i.test(
          line
        )
      ) {
        bodyLines.push(line);
      }
    }
  }

  let summary = "";
  if (bodyLines.length > 0) {
    summary = bodyLines.slice(0, 3).join(" ");
  }
  if (detailItems.length > 0) {
    summary = [summary, detailItems.join(" | ")].filter(Boolean).join(" — ");
  }
  if (!summary && lines.length > 2) {
    summary = lines
      .slice(Math.min(2, lines.length - 1), Math.min(8, lines.length))
      .join(" ")
      .slice(0, 320);
  }

  // 8. Ekstrak Penandatangan (di bagian bawah surat)
  let signatory = "";
  const bottomLines = lines.slice(Math.max(0, lines.length - 10));
  for (let i = 0; i < bottomLines.length; i++) {
    const l = bottomLines[i];
    if (
      /\b(?:S\.Pd|M\.Pd|S\.Ag|M\.Ag|S\.Si|M\.Si|S\.Kom|S\.Sos|S\.H|M\.H|S\.E|M\.M|Drs\.|Dra\.|Ir\.|Dr\.|H\.|Hj\.|KH\.)/i.test(
        l
      ) &&
      !/^(?:kepada|yth)/i.test(l)
    ) {
      signatory = l.replace(/^[\(\[\s]+|[\)\]\s]+$/g, "");
      break;
    }
  }
  if (!signatory) {
    for (let i = 0; i < bottomLines.length; i++) {
      const l = bottomLines[i];
      if (/^(?:kepala|ketua|sekretaris|direktur|camat|lurah|komite|koordinator)\b/i.test(l)) {
        const nextLine = bottomLines[i + 1] || "";
        signatory = nextLine && !/^nip/i.test(nextLine) ? `${nextLine} (${l})` : l;
        break;
      }
    }
  }

  // 9. Tentukan Jenis Surat (Masuk / Keluar)
  let detectedType: "masuk" | "keluar" = preferredType;
  const normSchool = schoolName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normSender = sender.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normSender && (normSender.includes("maarifnupandaan") || (normSchool && normSender.includes(normSchool)))) {
    detectedType = "keluar";
  } else if (sender && !normSender.includes("maarifnupandaan")) {
    detectedType = "masuk";
  }

  // 10. Klasifikasi / Kategori Otomatis
  const combinedLower = `${subject} ${summary} ${fullText}`.toLowerCase();
  let category = "Biasa";
  if (combinedLower.includes("undangan") || combinedLower.includes("menghadiri") || combinedLower.includes("rapat")) {
    category = "Undangan";
  } else if (combinedLower.includes("edaran") || combinedLower.includes("libur")) {
    category = "Edaran";
  } else if (combinedLower.includes("permohonan") || combinedLower.includes("izin") || combinedLower.includes("bantuan")) {
    category = "Permohonan";
  } else if (combinedLower.includes("pemberitahuan") || combinedLower.includes("informasi") || combinedLower.includes("jadwal")) {
    category = "Pemberitahuan";
  } else if (combinedLower.includes("keputusan") || combinedLower.includes("surat tugas") || combinedLower.includes("penugasan")) {
    category = "SK / Tugas";
  } else if (combinedLower.includes("penting") || combinedLower.includes("segera")) {
    category = "Penting";
  }

  // 11. Saran Disposisi
  let dispositionTo = "Kepala Sekolah / Tata Usaha";
  if (category === "Undangan") {
    dispositionTo = "Kepala Sekolah / Waka Terkait (Untuk Dihadiri)";
  } else if (category === "Edaran" || category === "Pemberitahuan") {
    dispositionTo = "Waka Kurikulum / Waka Kesiswaan (Untuk Diumumkan)";
  } else if (combinedLower.includes("keuangan") || combinedLower.includes("bos") || combinedLower.includes("dana")) {
    dispositionTo = "Bendahara Sekolah";
  } else if (combinedLower.includes("siswa") || combinedLower.includes("lomba") || combinedLower.includes("kesiswaan")) {
    dispositionTo = "Waka Kesiswaan / Guru BK";
  }

  if (!subject) {
    subject = category !== "Biasa" ? `Surat ${category}${sender ? ` dari ${sender}` : ""}` : "Surat Masuk / Keluar";
  }
  if (!sender) {
    sender = detectedType === "keluar" ? schoolName : "Instansi Pengirim Surat";
  }
  if (!recipient) {
    recipient = detectedType === "masuk" ? `Kepala ${schoolName}` : "Penerima Surat";
  }

  return {
    type: detectedType,
    letterNumber: letterNumber || "-",
    letterDate,
    sender,
    recipient,
    subject,
    category,
    attachmentCount,
    signatory,
    summary,
    dispositionTo,
    rawText
  };
}

/**
 * Menjalankan OCR langsung di browser menggunakan Tesseract.js (Indonesian + English)
 * dengan prapemrosesan kontras dokumen agar teks surat fisik terbaca tajam.
 * Gambar hanya diproses di memori dan langsung dibuang.
 */
export async function scanLetterImageClientSideOcr(
  imageDataUrl: string,
  schoolName = "SMP Ma'arif NU Pandaan",
  preferredType: "masuk" | "keluar" = "masuk",
  onProgress?: (statusText: string) => void
): Promise<ExtractedLetterData> {
  onProgress?.("Mempertajam kontras foto surat...");

  const enhancedDataUrl = await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.filter = "grayscale(100%) contrast(145%) brightness(105%)";
      ctx.drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", 0.88);
      canvas.width = 0;
      canvas.height = 0;
      resolve(out);
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });

  onProgress?.("Menyiapkan mesin pembaca surat otomatis (OCR)...");

  const result = await Tesseract.recognize(enhancedDataUrl, "ind+eng", {
    logger: (m: any) => {
      if (m?.status === "recognizing text" && typeof m?.progress === "number") {
        const pct = Math.round(m.progress * 100);
        onProgress?.(`Membaca informasi pada surat... ${pct}%`);
      } else if (m?.status === "loading language traineddata") {
        onProgress?.("Memuat kamus Bahasa Indonesia untuk pembacaan surat...");
      }
    }
  });

  const rawText = result?.data?.text || "";
  return parseIndonesianOfficialLetterText(rawText, schoolName, preferredType);
}
