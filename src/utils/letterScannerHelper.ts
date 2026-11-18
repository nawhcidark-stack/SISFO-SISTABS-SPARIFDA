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

function cleanOcrLineNoise(line: string): string {
  return line
    .replace(/[‘’`]/g, "'")
    .replace(/[|_~©®™€£¥«»“”"]+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s+[a-z]{1,2}\s*;?\s*$/i, match => {
      // Hapus artefak OCR 1-2 huruf acak di ujung baris seperti " i ;" atau " hy" kecuali singkatan sah (WIB, NU, RI, SD, MI, TU)
      const trimmed = match.trim().replace(/;$/, "").trim();
      if (/^(?:vb|wb|nu|ri|sd|mi|tu|id|pd|ag|si|mm|sh|mh|se)$/i.test(trimmed)) {
        return match;
      }
      return "";
    })
    .replace(/(\b(?:sekolah|siswa|murid|rapat|pandaan|ganjil|genap))\s+\d\s*$/i, "$1")
    .replace(/-Ny[2?7]/gi, "-Nya")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mencari Tanggal Surat yang sebenarnya:
 * Prioritas 1: Tanggal yang didahului nama kota/tempat (contoh: "Pandaan, 21 Oktober 2026")
 * Prioritas 2: Tanggal yang TIDAK berada pada baris "Tanggal :" (jadwal acara) atau potongan bukti kehadiran / watermark HP
 */
export function extractOfficialLetterDateIso(lines: string[], fallbackIso: string): string {
  const monthNamesPattern = Object.keys(INDONESIAN_MONTHS).join("|");
  const cityDateRegex = new RegExp(
    `([A-Za-z]{3,20})\\s*,\\s*(\\d{1,2})\\s+(${monthNamesPattern})[a-z]*\\s+(20\\d{2})`,
    "i"
  );
  const anyIndoDateRegex = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthNamesPattern})[a-z]*\\s+(20\\d{2})\\b`,
    "i"
  );

  // 1. Cari baris yang memiliki pola "Kota, DD Bulan YYYY" (tanggal penerbitan surat resmi)
  for (const line of lines) {
    const norm = normalizeOcrDigits(line);
    const mCity = norm.match(cityDateRegex);
    if (mCity) {
      const day = String(parseInt(mCity[2], 10)).padStart(2, "0");
      const month = INDONESIAN_MONTHS[mCity[3].toLowerCase()] || "01";
      const year = mCity[4];
      return `${year}-${month}-${day}`;
    }
  }

  // 2. Cari tanggal Indonesia pada baris yang BUKAN jadwal acara ("Tanggal : ...") atau "Telah hadir..."
  for (const line of lines) {
    if (/^(?:hari|tanggal|tgl|waktu|pukul|acara|telah\s+hadir)\b/i.test(line)) {
      continue;
    }
    const norm = normalizeOcrDigits(line);
    const mDate = norm.match(anyIndoDateRegex);
    if (mDate) {
      const day = String(parseInt(mDate[1], 10)).padStart(2, "0");
      const month = INDONESIAN_MONTHS[mDate[2].toLowerCase()] || "01";
      const year = mDate[3];
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Fallback: tanggal Indonesia mana pun di dalam surat (sebelum watermark kamera)
  for (const line of lines) {
    const norm = normalizeOcrDigits(line);
    const mDate = norm.match(anyIndoDateRegex);
    if (mDate) {
      const day = String(parseInt(mDate[1], 10)).padStart(2, "0");
      const month = INDONESIAN_MONTHS[mDate[2].toLowerCase()] || "01";
      const year = mDate[3];
      return `${year}-${month}-${day}`;
    }
  }

  return fallbackIso;
}

export function parseIndonesianOfficialLetterText(
  rawText: string,
  schoolName = "SMP Ma'arif NU Pandaan",
  preferredType: "masuk" | "keluar" = "masuk",
  principalName = "H. Lasudi, S.Pd."
): ExtractedLetterData {
  const todayIso = new Date().toISOString().split("T")[0];
  const normalizedRaw = normalizeOcrDigits(rawText || "");

  // Pisahkan per baris dan potong bagian kupon/potongan bukti kehadiran & watermark HP di bagian bawah
  const rawLines = normalizedRaw
    .split(/\r?\n/)
    .map(l => cleanOcrLineNoise(l))
    .filter(l => l.length >= 2);

  // Cari batas akhir surat resmi (sebelum "Potong disini", "BUKTI KEHADIRAN", atau Watermark HP seperti "POCO M6 Pro")
  let cutoffIdx = rawLines.length;
  let extraClassHint = "";
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    const classHintMatch = l.match(/\bKelas\s*[:;\-]?\s*([789][A-G]?)\b/i);
    if (classHintMatch && !extraClassHint) {
      extraClassHint = classHintMatch[1];
    }
    if (
      /potong\s+disin|bukti\s+kehadiran|telah\s+hadir\s+mengikuti|\b(?:poco|redmi|xiaomi|samsung|galaxy|oppo|vivo|realme|iphone)\b/i.test(
        l
      )
    ) {
      if (cutoffIdx === rawLines.length) {
        cutoffIdx = i;
      }
    }
  }

  const lines = rawLines.slice(0, cutoffIdx);
  const fullText = lines.join("\n");

  // ==========================================================================
  // 1. EKSTRAK NOMOR SURAT (Mendukung ada/tanpa titik dua ":" dan spasi OCR)
  // ==========================================================================
  let letterNumber = "";
  let nomorLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(
      /^(?:n[o0]m[o0e]r|no\.?|n[o0]m[o0e]r\s+surat)\s*[:;=\-\.]?\s*([0-9A-Za-z][^\n\r]{3,75})/i
    );
    if (m && m[1]) {
      nomorLineIdx = i;
      let candidate = m[1]
        .split(
          /\s{2,}|\b(?:pandaan|pasuruan|surabaya|malang|sidoarjo|jakarta|tanggal|lampiran|perihal|hal|kepada)\b/i
        )[0]
        .trim();
      // Jika di dalam nomor surat ada spasi akibat OCR seperti "SMP Mrf/0/X/2026", rapatkan kembali menjadi "SMP.Mrf/O/X/2026"
      if (candidate.includes("/")) {
        candidate = candidate
          .replace(/SMP\s+Mrf/gi, "SMP.Mrf")
          .replace(/\/105\.28\.080\//g, "/I05.28.080/")
          .replace(/\/SMP\.Mrf\/0\//gi, "/SMP.Mrf/O/")
          .replace(/\s*\/\s*/g, "/")
          .replace(/\s+/g, ".");
      }
      if (candidate.length >= 3) {
        letterNumber = candidate;
        break;
      }
    }
  }

  if (!letterNumber) {
    for (let i = 0; i < lines.length; i++) {
      const slashMatch = lines[i].match(
        /\b([0-9]{1,5}\s*\/\s*[A-Za-z0-9\.\-\s]{2,25}\s*\/\s*[A-Za-z0-9\.\-\/]{2,35})\b/
      );
      if (slashMatch) {
        nomorLineIdx = i;
        letterNumber = slashMatch[1]
          .replace(/SMP\s+Mrf/gi, "SMP.Mrf")
          .replace(/\/105\.28\.080\//g, "/I05.28.080/")
          .replace(/\/SMP\.Mrf\/0\//gi, "/SMP.Mrf/O/")
          .replace(/\s*\/\s*/g, "/")
          .replace(/\s+/g, ".");
        break;
      }
    }
  }

  // ==========================================================================
  // 2. EKSTRAK LAMPIRAN
  // ==========================================================================
  let attachmentCount = "-";
  let lampiranLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(?:lamp[i1l]ran|lamp\.?)\s*[:;=\-\.]?\s*([^\n\r]{1,45})/i);
    if (m && m[1]) {
      lampiranLineIdx = i;
      const cleaned = m[1].split(/\s{2,}|\b(?:perihal|hal|kepada)\b/i)[0].trim();
      if (cleaned) {
        attachmentCount = cleaned;
        break;
      }
    }
  }

  // ==========================================================================
  // 3. EKSTRAK PERIHAL / HAL SURAT
  // ==========================================================================
  let subject = "";
  let subjectLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(?:per[i1l]hal|h[a4][l1i])\s*[:;=\-\.]?\s*(.+)/i);
    if (m && m[1]) {
      subjectLineIdx = i;
      let subj = m[1].split(/\s{2,}|\b(?:kepada|yth)\b/i)[0].trim();
      subject = subj.replace(/^[:;\-\.\s]+/, "").trim();
      break;
    }
  }

  // Jika label "Hal :" terbaca rusak oleh OCR (contoh: "(EL Undangan Rapat") tepat di bawah baris Nomor/Lampiran:
  if (!subject && nomorLineIdx !== -1) {
    const searchStart = lampiranLineIdx !== -1 ? lampiranLineIdx + 1 : nomorLineIdx + 1;
    for (let i = searchStart; i <= Math.min(searchStart + 2, lines.length - 1); i++) {
      const l = lines[i];
      if (/^(?:kepada|yth|bapak|ibu|sdr|di\b|assalamu|dengan\s+hormat)/i.test(l)) {
        break;
      }
      // Bersihkan prefix 1-4 karakter rusak di awal baris (seperti "(EL " atau "el ")
      const cleanedSubj = l
        .replace(/^[\(\[\{]?[A-Za-z0-9]{1,3}[\)\]\}:;\.\-]?\s+(?=[A-Z])/, "")
        .replace(/^[:;\-\.\s]+/, "")
        .trim();
      if (cleanedSubj.length >= 4) {
        subject = cleanedSubj;
        subjectLineIdx = i;
        break;
      }
    }
  }

  if (!subject) {
    for (const line of lines) {
      const mTitle = line.match(
        /\b(SURAT\s+(?:KETERANGAN|TUGAS|EDARAN|KEPUTUSAN|PENGANTAR|PERMOHONAN|UNDANGAN|PEMBERITAHUAN|REKOMENDASI|PERINGATAN|KUASA)[^\n\r]*|UNDANGAN\s+RAPAT[^\n\r]*|UNDANGAN[^\n\r]*|PEMBERITAHUAN[^\n\r]*|PENGUMUMAN[^\n\r]*)/i
      );
      if (mTitle) {
        subject = mTitle[1].trim();
        break;
      }
    }
  }

  // ==========================================================================
  // 4. EKSTRAK TANGGAL SURAT RESMI
  // ==========================================================================
  const letterDate = extractOfficialLetterDateIso(lines, todayIso);

  // ==========================================================================
  // 5. EKSTRAK KOP SURAT / INSTANSI PENGIRIM (Saring artefak logo di bagian atas)
  // ==========================================================================
  let sender = "";
  const headerBlockEnd = nomorLineIdx !== -1 ? nomorLineIdx : Math.min(lines.length, 8);
  const headerSlice = lines.slice(0, headerBlockEnd);
  const headerTextJoined = headerSlice.join(" ");

  if (
    /ma\s*'?arif\s+nu\s+pandaan|20519113|smpmaarifpdn/i.test(headerTextJoined) ||
    /ma\s*'?arif\s+nu\s+pandaan|20519113|smpmaarifpdn/i.test(fullText.slice(0, 350))
  ) {
    sender = schoolName;
  } else {
    const validHeaderLines: string[] = [];
    for (const l of headerSlice) {
      if (
        /\b(?:jl\.|jalan|alamat|telp|telepon|hp\.|wa\.|email|e-mail|website|http|www\.|kode\s*pos|npsn|nss|terakreditasi)\b/i.test(
          l
        )
      ) {
        continue;
      }
      // Hanya ambil baris kop yang mengandung kata kunci instansi/lembaga atau huruf kapital yang bersih
      const cleanedKop = l
        .replace(/^[^A-Za-z]+/, "")
        .replace(/\s+\d+$/, "")
        .trim();
      if (
        /\b(?:PEMERINTAH|DINAS|KEMENTERIAN|YAYASAN|LEMBAGA|SMP|SMA|SMK|MTS|MA|SD|MI|KECAMATAN|KELURAHAN|DESA|PANITIA|KOMITE|PUSKESMAS|UPTD|BADAN|KANTOR|PCNU|MWC|SEKOLAH|MADRASAH|PONDOK|PESANTREN)\b/i.test(
          cleanedKop
        )
      ) {
        validHeaderLines.push(cleanedKop);
      }
    }
    if (validHeaderLines.length > 0) {
      sender = Array.from(new Set(validHeaderLines)).slice(0, 2).join(" - ");
    }
  }

  // ==========================================================================
  // 6. EKSTRAK TUJUAN / PENERIMA SURAT (Yth. / Kepada / Bapak/Ibu...)
  // ==========================================================================
  let recipient = "";
  const searchRecipientStart =
    subjectLineIdx !== -1
      ? subjectLineIdx + 1
      : nomorLineIdx !== -1
      ? nomorLineIdx + 1
      : 0;

  for (let i = searchRecipientStart; i < Math.min(searchRecipientStart + 8, lines.length); i++) {
    const l = lines[i];
    if (/^(?:assalamu|bismillah|dengan\s+hormat|puji\s+dan|sehubungan)/i.test(l)) {
      break;
    }

    // Cek apakah baris ini mengandung "Kepada", "Yth", atau sapaan penerima seperti "Bapak / Ibu..." / "Kepala..."
    const mRec =
      l.match(/^(?:kepada\s+yth\.?|kepada|yth\.?|yang\s+terhormat)\s*[:;\-\.]?\s*(.*)/i) ||
      l.match(/^(?:[a-z]{1,3}\s+)?((?:bapak\s*\/?\s*ibu|bapak|ibu|sdr\/i|saudara|kepala|ketua|dewan\s+guru|wali\s+murid|orang\s+tua|seluruh)\b.*)/i);

    if (mRec) {
      let recText = (mRec[1] || "").trim();
      if (!recText && i + 1 < lines.length) {
        recText = lines[i + 1].trim();
      }
      // Jika tertulis "Wali Murid Kelas" dan angka kelas terpotong di baris itu tetapi ada di petunjuk kelas ("Kelas : 7"), lengkapi
      if (/wali\s+murid\s+kelas$/i.test(recText) && extraClassHint) {
        recText = `${recText} ${extraClassHint}`;
      }
      // Cek apakah ada tambahan lokasi tujuan setelah "di"
      if (i + 2 < lines.length && /^di$/i.test(lines[i + 1])) {
        const locLine = lines[i + 2].trim();
        if (locLine && !/^(?:tempat|assalamu|dengan\s+hormat)/i.test(locLine)) {
          recText = `${recText} (${locLine})`;
        }
      }
      recipient = recText;
      break;
    }
  }

  // ==========================================================================
  // 7. EKSTRAK JADWAL / DETAIL ACARA & RINGKASAN ISI POKOK SURAT
  // ==========================================================================
  let hariVal = "";
  let tanggalAcaraVal = "";
  let pukulVal = "";
  let tempatVal = "";
  const acaraItems: string[] = [];
  const mainParagraphs: string[] = [];

  let inBody = false;
  let inAcaraList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      /^(?:assalamu|dengan\s+hormat|puji\s+dan\s+sanjung|sehubungan\s+dengan|menindaklanjuti|berdasarkan|bersama\s+ini|diberitahukan|mengharap)/i.test(
        line
      )
    ) {
      inBody = true;
    }

    if (
      inBody &&
      /^(?:demikian\s+undangan|demikian\s+surat|demikian\s+pemberitahuan|atas\s+perhatian|atas\s+kehadiran|wassalamu|hormat\s+kami|mengetahui|kepala\s+sekolah|tindasan|tembusan)/i.test(
        line
      )
    ) {
      inAcaraList = false;
      break;
    }

    if (!inBody) continue;

    // Abaikan salam pembuka dan puji syukur standar agar ringkasan langsung fokus ke pokok surat
    if (
      /^(?:assalamu|dengan\s+hormat|puji\s+dan\s+sanjung|senantiasa\s+diberikan)/i.test(line)
    ) {
      continue;
    }

    const mHari = line.match(/^hari\s*[:;=\-\.]+\s*(.+)/i);
    if (mHari) {
      hariVal = mHari[1].trim();
      inAcaraList = false;
      continue;
    }

    const mTgl = line.match(/^tanggal\s*[:;=\-\.]+\s*(.+)/i);
    if (mTgl) {
      tanggalAcaraVal = mTgl[1].trim();
      inAcaraList = false;
      continue;
    }

    const mHariTgl = line.match(/^hari\s*\/\s*tanggal\s*[:;=\-\.]+\s*(.+)/i);
    if (mHariTgl) {
      tanggalAcaraVal = mHariTgl[1].trim();
      inAcaraList = false;
      continue;
    }

    const mPukul = line.match(/^(?:pukul|waktu|jam)\s*[:;=\-\.]+\s*(.+)/i);
    if (mPukul) {
      pukulVal = mPukul[1].trim();
      inAcaraList = false;
      continue;
    }

    const mTempat = line.match(/^(?:tempat|lokasi)\s*[:;=\-\.]+\s*(.+)/i);
    if (mTempat) {
      tempatVal = mTempat[1].trim();
      inAcaraList = false;
      continue;
    }

    const mAcara = line.match(/^(?:acara|agenda|keperluan)\s*[:;=\-\.]+\s*(.+)/i);
    if (mAcara) {
      acaraItems.push(mAcara[1].trim());
      inAcaraList = true;
      continue;
    }

    if (inAcaraList) {
      acaraItems.push(line);
      continue;
    }

    mainParagraphs.push(line);
  }

  const scheduleParts: string[] = [];
  if (hariVal && tanggalAcaraVal) {
    scheduleParts.push(`Hari/Tgl: ${hariVal}, ${tanggalAcaraVal}`);
  } else if (tanggalAcaraVal) {
    scheduleParts.push(`Tanggal: ${tanggalAcaraVal}`);
  } else if (hariVal) {
    scheduleParts.push(`Hari: ${hariVal}`);
  }
  if (pukulVal) scheduleParts.push(`Pukul: ${pukulVal}`);
  if (tempatVal) scheduleParts.push(`Tempat: ${tempatVal}`);
  if (acaraItems.length > 0) {
    scheduleParts.push(`Acara: ${acaraItems.join(" ")}`);
  }

  const cleanIntro = mainParagraphs
    .join(" ")
    .replace(/\s+pada\s*[:;\.]?\s*$/i, "")
    .trim();

  let summary = "";
  if (cleanIntro && scheduleParts.length > 0) {
    summary = `${cleanIntro}. Pelaksanaan — ${scheduleParts.join(" | ")}`;
  } else if (scheduleParts.length > 0) {
    summary = scheduleParts.join(" | ");
  } else if (cleanIntro) {
    summary = cleanIntro;
  }

  // ==========================================================================
  // 8. EKSTRAK PENANDATANGAN SURAT
  // ==========================================================================
  let signatory = "";
  const isFromOurSchool =
    sender.toLowerCase().includes("ma'arif nu pandaan") ||
    sender.toLowerCase().includes("maarif nu pandaan");

  for (let i = Math.max(0, lines.length - 12); i < lines.length; i++) {
    const l = lines[i];
    if (/^(?:tindasan|tembusan)/i.test(l)) break;

    if (
      /\b(?:S\.Pd|M\.Pd|S\.Ag|M\.Ag|S\.Si|M\.Si|S\.Kom|S\.Sos|S\.H|M\.H|S\.E|M\.M|Drs\.|Dra\.|Ir\.|Dr\.|KH\.|Lasudi)\b/i.test(
        l
      ) &&
      !/^(?:kepada|yth|bapak|ibu)/i.test(l)
    ) {
      // Jika surat dari sekolah sendiri dan tanda tangan tumpang tindih dengan nama Kepala Sekolah (misal "H. of S.Pd")
      if (isFromOurSchool && /^H\.\s*[a-z]{1,4}\s*S\.Pd/i.test(l)) {
        signatory = `${principalName} (Kepala Sekolah)`;
      } else {
        signatory = l;
      }
      break;
    }
  }

  if (!signatory && isFromOurSchool && /kepala\s+sekolah/i.test(fullText)) {
    signatory = `${principalName} (Kepala Sekolah)`;
  }

  // ==========================================================================
  // 9. TENTUKAN JENIS SURAT (MASUK / KELUAR), KATEGORI & DISPOSISI
  // ==========================================================================
  const detectedType: "masuk" | "keluar" = isFromOurSchool ? "keluar" : preferredType;

  const combinedLower = `${subject} ${summary}`.toLowerCase();
  let category = "Biasa";
  if (combinedLower.includes("undangan") || combinedLower.includes("rapat") || combinedLower.includes("kehadiran")) {
    category = "Undangan";
  } else if (combinedLower.includes("edaran") || combinedLower.includes("libur")) {
    category = "Edaran";
  } else if (combinedLower.includes("permohonan") || combinedLower.includes("izin")) {
    category = "Permohonan";
  } else if (combinedLower.includes("pemberitahuan") || combinedLower.includes("jadwal")) {
    category = "Pemberitahuan";
  } else if (combinedLower.includes("keputusan") || combinedLower.includes("surat tugas")) {
    category = "SK / Tugas";
  }

  // Ekstrak Tindasan / Tembusan jika ada
  let dispositionTo = "";
  for (let i = 0; i < lines.length; i++) {
    if (/^(?:tindasan|tembusan)\s*[:;=\-\.]?/i.test(lines[i])) {
      const tembusanItems: string[] = [];
      for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
        if (lines[j].length > 2) {
          tembusanItems.push(lines[j].replace(/^\d+[\.\)]\s*/, ""));
        }
      }
      if (tembusanItems.length > 0) {
        dispositionTo = `Tindasan: ${tembusanItems.join(", ")}`;
      }
      break;
    }
  }

  if (!dispositionTo) {
    if (detectedType === "keluar") {
      dispositionTo = `Distribusi kepada ${recipient || "Penerima Surat"}`;
    } else if (category === "Undangan") {
      dispositionTo = "Kepala Sekolah / Waka Terkait (Untuk Dihadiri)";
    } else {
      dispositionTo = "Kepala Sekolah / Tata Usaha";
    }
  }

  return {
    type: detectedType,
    letterNumber: letterNumber || "-",
    letterDate,
    sender: sender || (detectedType === "keluar" ? schoolName : "Instansi Pengirim"),
    recipient: recipient || (detectedType === "masuk" ? `Kepala ${schoolName}` : "Penerima Surat"),
    subject: subject || (category === "Undangan" ? "Undangan Rapat" : "Surat Resmi"),
    category,
    attachmentCount,
    signatory,
    summary,
    dispositionTo,
    rawText: lines.join("\n")
  };
}

/**
 * Mengekstrak gambar JPEG yang tertanam di dalam file PDF hasil foto/scan (misal WhatsApp PDF)
 * secara langsung di memori tanpa menyimpan file.
 */
export function extractEmbeddedJpegFromPdfArrayBuffer(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  let start = -1;
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let end = -1;
  for (let i = bytes.length - 2; i > start; i--) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
      end = i + 2;
      break;
    }
  }
  if (end === -1) return null;

  const jpgSlice = bytes.subarray(start, end);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < jpgSlice.length; i += chunkSize) {
    const chunk = jpgSlice.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

/**
 * Menjalankan OCR langsung di browser menggunakan Tesseract.js (Indonesian + English).
 * Gambar hanya diproses di memori dan langsung dibuang.
 */
export async function scanLetterImageClientSideOcr(
  imageDataUrl: string,
  schoolName = "SMP Ma'arif NU Pandaan",
  preferredType: "masuk" | "keluar" = "masuk",
  onProgress?: (statusText: string) => void,
  principalName = "H. Lasudi, S.Pd."
): Promise<ExtractedLetterData> {
  onProgress?.("Menyiapkan pembacaan teks surat otomatis (OCR)...");

  const result = await Tesseract.recognize(imageDataUrl, "ind+eng", {
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
  return parseIndonesianOfficialLetterText(rawText, schoolName, preferredType, principalName);
}
