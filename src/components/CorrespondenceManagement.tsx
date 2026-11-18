import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Camera,
  FileSpreadsheet,
  Printer,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Upload,
  Sparkles,
  Calendar,
  Check,
  SwitchCamera,
  Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { CorrespondenceRecord, SchoolIdentity } from "../types";
import {
  scanLetterImageClientSideOcr,
  parseIndonesianOfficialLetterText,
  extractEmbeddedJpegFromPdfArrayBuffer,
  ExtractedLetterData
} from "../utils/letterScannerHelper";

interface CorrespondenceManagementProps {
  schoolIdentity?: SchoolIdentity;
}

const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const LETTER_CATEGORIES = [
  "Undangan",
  "Edaran",
  "Permohonan",
  "Pemberitahuan",
  "SK / Tugas",
  "Penting",
  "Rahasia",
  "Biasa"
];

const LETTER_STATUSES_MASUK = [
  "Diterima",
  "Didisposisikan",
  "Ditindaklanjuti",
  "Selesai / Arsip"
];

const LETTER_STATUSES_KELUAR = [
  "Draft",
  "Terkirim",
  "Selesai / Arsip"
];

export default function CorrespondenceManagement({
  schoolIdentity
}: CorrespondenceManagementProps) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const schoolName = schoolIdentity?.name || "SMP Ma'arif NU Pandaan";
  const principalName = schoolIdentity?.principal || "H. Lasudi, S.Pd.";

  const [records, setRecords] = useState<CorrespondenceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanProgressText, setScanProgressText] = useState<string>("");
  const [lastScannedSummary, setLastScannedSummary] = useState<ExtractedLetterData | null>(null);
  const [showRawScannedText, setShowRawScannedText] = useState<boolean>(false);
  const [manualRawTextToParse, setManualRawTextToParse] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Filter & Tab states
  const [activeFilterType, setActiveFilterType] = useState<"all" | "masuk" | "keluar">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Form Modal / Panel state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<"masuk" | "keluar">("masuk");
  const [agendaNumber, setAgendaNumber] = useState<string>("");
  const [letterNumber, setLetterNumber] = useState<string>("");
  const [letterDate, setLetterDate] = useState<string>(todayStr);
  const [receivedOrSentDate, setReceivedOrSentDate] = useState<string>(todayStr);
  const [sender, setSender] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [category, setCategory] = useState<string>("Undangan");
  const [attachmentCount, setAttachmentCount] = useState<string>("-");
  const [signatory, setSignatory] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [dispositionTo, setDispositionTo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<string>("Diterima");

  // Camera Scanner states (Image is NEVER stored in DB or state after extraction)
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileGalleryInputRef = useRef<HTMLInputElement | null>(null);

  // PDF Report Preview & Disposition Print Modal state
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState<boolean>(false);
  const [detailModalRecord, setDetailModalRecord] = useState<CorrespondenceRecord | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(prev => (prev?.message === message ? null : prev));
    }, 7000);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/correspondence");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecords(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch correspondence logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    return () => {
      stopCameraStream();
    };
  }, []);

  // Pastikan stream kamera selalu terhubung ke elemen <video> saat isCameraOpen aktif
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen]);

  // Generate automatic Agenda Number based on type & current year
  const generateNextAgendaNumber = (targetType: "masuk" | "keluar", dateRef?: string) => {
    const d = dateRef ? new Date(dateRef) : new Date();
    const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const monthIdx = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
    const romanMonth = ROMAN_MONTHS[monthIdx] || "I";
    const sameTypeAndYearCount = records.filter(r => {
      const rYear = (r.receivedOrSentDate || r.letterDate || "").slice(0, 4);
      return r.type === targetType && rYear === String(year);
    }).length;
    const nextNum = String(sameTypeAndYearCount + 1).padStart(3, "0");
    const code = targetType === "masuk" ? "SM" : "SK";
    return `${nextNum}/${code}/SMP-MNU/${romanMonth}/${year}`;
  };

  const resetForm = (defaultType: "masuk" | "keluar" = "masuk") => {
    setEditingId(null);
    setLastScannedSummary(null);
    setShowRawScannedText(false);
    setManualRawTextToParse("");
    setType(defaultType);
    setAgendaNumber(generateNextAgendaNumber(defaultType, todayStr));
    setLetterNumber("");
    setLetterDate(todayStr);
    setReceivedOrSentDate(todayStr);
    setSender(defaultType === "keluar" ? schoolName : "");
    setRecipient(defaultType === "masuk" ? `Kepala ${schoolName}` : "");
    setSubject("");
    setCategory("Undangan");
    setAttachmentCount("-");
    setSignatory(defaultType === "keluar" ? (schoolIdentity?.principal || "") : "");
    setSummary("");
    setDispositionTo("");
    setNotes("");
    setStatus(defaultType === "masuk" ? "Diterima" : "Terkirim");
  };

  const handleOpenNewForm = (targetType: "masuk" | "keluar", openScannerImmediately = false) => {
    resetForm(targetType);
    setIsFormOpen(true);
    if (openScannerImmediately) {
      setTimeout(() => {
        startCameraStream("environment");
      }, 150);
    }
  };

  const handleOpenEditForm = (rec: CorrespondenceRecord) => {
    setEditingId(rec.id);
    setLastScannedSummary(null);
    setType(rec.type);
    setAgendaNumber(rec.agendaNumber || "");
    setLetterNumber(rec.letterNumber || "");
    setLetterDate(rec.letterDate || todayStr);
    setReceivedOrSentDate(rec.receivedOrSentDate || todayStr);
    setSender(rec.sender || "");
    setRecipient(rec.recipient || "");
    setSubject(rec.subject || "");
    setCategory(rec.category || "Biasa");
    setAttachmentCount(rec.attachmentCount || "-");
    setSignatory(rec.signatory || "");
    setSummary(rec.summary || "");
    setDispositionTo(rec.dispositionTo || "");
    setNotes(rec.notes || "");
    setStatus(rec.status || (rec.type === "masuk" ? "Diterima" : "Terkirim"));
    setIsFormOpen(true);
  };

  // ============================================================================
  // CAMERA STREAM & AUTO-FILL SCANNER (GAMBAR TIDAK DISIMPAN)
  // ============================================================================
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const startCameraStream = async (facing: "environment" | "user" = cameraFacingMode) => {
    setCameraError(null);
    stopCameraStream();
    setIsCameraOpen(true);
    setCameraFacingMode(facing);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Browser ini tidak mendukung akses pratinjau kamera langsung. Silakan klik tombol 'Potret Kamera HP Langsung' di bawah."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera stream fallback:", err);
      setCameraError(
        "Izin pratinjau kamera belum aktif di frame ini. Silakan klik tombol 'Potret Kamera HP Langsung' untuk memotret surat menggunakan aplikasi kamera bawaan HP Anda."
      );
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    startCameraStream(nextFacing);
  };

  const applyExtractedDataToForm = (ext: ExtractedLetterData) => {
    const detectedType: "masuk" | "keluar" = ext.type === "keluar" ? "keluar" : "masuk";
    setType(detectedType);
    if (!editingId) {
      setAgendaNumber(generateNextAgendaNumber(detectedType, ext.letterDate || todayStr));
    }
    if (ext.letterNumber) setLetterNumber(ext.letterNumber);
    if (ext.letterDate) setLetterDate(ext.letterDate);
    if (ext.sender) setSender(ext.sender);
    if (ext.recipient) setRecipient(ext.recipient);
    if (ext.subject) setSubject(ext.subject);
    if (ext.category) setCategory(ext.category);
    if (ext.attachmentCount) setAttachmentCount(ext.attachmentCount);
    if (ext.signatory) setSignatory(ext.signatory);
    if (ext.summary) setSummary(ext.summary);
    if (ext.dispositionTo) setDispositionTo(ext.dispositionTo);
    setStatus(detectedType === "masuk" ? "Diterima" : "Terkirim");
    setLastScannedSummary(ext);
    if (ext.rawText) {
      setManualRawTextToParse(ext.rawText);
    }
    if (!isFormOpen) {
      setIsFormOpen(true);
    }
  };

  const processScannedImageBase64 = async (dataUrl: string, mimeType = "image/jpeg") => {
    setScanning(true);
    setScanProgressText("Memulai pemindaian surat otomatis...");
    try {
      let extractedResult: ExtractedLetterData | null = null;

      try {
        extractedResult = await scanLetterImageClientSideOcr(
          dataUrl,
          schoolName,
          type,
          statusMsg => setScanProgressText(statusMsg),
          principalName
        );
      } catch (clientErr) {
        console.warn("Fallback server scan:", clientErr);
        setScanProgressText("Menghubungi pemindai surat otomatis server...");
        const r = await fetch("/api/correspondence/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: dataUrl,
            mimeType,
            preferredType: type
          })
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.success && j?.extracted) {
            extractedResult = j.extracted as ExtractedLetterData;
          }
        }
      }

      if (!extractedResult) {
        throw new Error("Tidak dapat membaca teks pada foto surat. Pastikan foto surat cukup terang dan tidak buram.");
      }

      applyExtractedDataToForm(extractedResult);

      showToast(
        "success",
        "Pemindaian surat berhasil! Data surat otomatis terisi secara terstruktur ke formulir dan gambar surat telah dihapus (tidak disimpan)."
      );
    } catch (err: any) {
      console.error("[Scan Correspondence Error]:", err);
      showToast("error", err?.message || "Gagal memindai surat. Pastikan tulisan pada surat terlihat jelas.");
    } finally {
      setScanning(false);
      setScanProgressText("");
    }
  };

  const handleCaptureFromLiveVideo = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      showToast("error", "Kamera belum siap menangkap gambar. Silakan tunggu 1 detik atau gunakan tombol 'Potret Kamera HP Langsung'.");
      return;
    }

    const maxDim = 1800;
    let w = video.videoWidth;
    let h = video.videoHeight;
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
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const tempBase64 = canvas.toDataURL("image/jpeg", 0.9);

    // Matikan kamera & bersihkan canvas segera (Gambar tidak disimpan)
    stopCameraStream();
    canvas.width = 0;
    canvas.height = 0;

    await processScannedImageBase64(tempBase64, "image/jpeg");
  };

  const handleFileOrNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    stopCameraStream();
    if (!isFormOpen) {
      resetForm(activeFilterType === "keluar" ? "keluar" : "masuk");
      setIsFormOpen(true);
    }
    setScanning(true);
    setScanProgressText("Memproses tangkapan foto surat...");

    try {
      const isPdfFile =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdfFile) {
        const arrayBuf = await file.arrayBuffer();
        const extractedJpegUrl = extractEmbeddedJpegFromPdfArrayBuffer(arrayBuf);
        if (!extractedJpegUrl) {
          throw new Error(
            "File PDF ini tidak memiliki gambar hasil foto/scan di dalamnya. Silakan gunakan foto surat (JPG/PNG) atau kamera HP langsung."
          );
        }
        await processScannedImageBase64(extractedJpegUrl, "image/jpeg");
        return;
      }

      const tempDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 2000;
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
              resolve(String(reader.result));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.92);
            canvas.width = 0;
            canvas.height = 0;
            resolve(compressed);
          };
          img.onerror = () => reject(new Error("Gagal memuat gambar surat."));
          img.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
        reader.readAsDataURL(file);
      });

      await processScannedImageBase64(tempDataUrl, "image/jpeg");
    } catch (err: any) {
      setScanning(false);
      setScanProgressText("");
      showToast("error", err?.message || "Gagal memproses foto surat.");
    }
  };

  const handleReparseManualText = () => {
    if (!manualRawTextToParse.trim()) return;
    const parsed = parseIndonesianOfficialLetterText(
      manualRawTextToParse,
      schoolName,
      type,
      principalName
    );
    applyExtractedDataToForm(parsed);
    showToast("success", "Data kolom surat berhasil diperbarui dari teks surat!");
  };

  // ============================================================================
  // SIMPAN & HAPUS DATA SURAT (KE MYSQL TANPA GAMBAR)
  // ============================================================================
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() && !letterNumber.trim()) {
      showToast("error", "Nomor Surat atau Perihal Surat wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        type,
        agendaNumber: agendaNumber.trim() || generateNextAgendaNumber(type, receivedOrSentDate || letterDate),
        letterNumber: letterNumber.trim() || "-",
        letterDate: letterDate || todayStr,
        receivedOrSentDate: receivedOrSentDate || letterDate || todayStr,
        sender: sender.trim() || "-",
        recipient: recipient.trim() || "-",
        subject: subject.trim() || "-",
        category: category || "Biasa",
        attachmentCount: attachmentCount.trim() || "-",
        signatory: signatory.trim(),
        summary: summary.trim(),
        dispositionTo: dispositionTo.trim(),
        notes: notes.trim(),
        status: status || (type === "masuk" ? "Diterima" : "Terkirim")
      };

      const res = await fetch("/api/correspondence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan data surat.");
      }

      if (data.item) {
        setRecords(prev => {
          const idx = prev.findIndex(r => r.id === data.item.id);
          if (idx > -1) {
            const copy = [...prev];
            copy[idx] = data.item;
            return copy;
          }
          return [data.item, ...prev];
        });
      } else {
        await fetchRecords();
      }

      setIsFormOpen(false);
      resetForm(type);
      showToast("success", data.message || "Data surat berhasil disimpan ke database MySQL.");
    } catch (err: any) {
      showToast("error", err?.message || "Gagal menyimpan data surat.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (rec: CorrespondenceRecord) => {
    if (!window.confirm(`Hapus pencatatan surat "${rec.subject}" (No: ${rec.letterNumber}) dari Buku Agenda?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/correspondence/${rec.id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== rec.id));
        showToast("success", "Data surat berhasil dihapus.");
      } else {
        showToast("error", "Gagal menghapus data surat.");
      }
    } catch {
      showToast("error", "Gagal menghubungi server saat menghapus surat.");
    }
  };

  // ============================================================================
  // FILTERING & STATISTIK
  // ============================================================================
  const availableYears = useMemo(() => {
    const years = new Set<string>([String(new Date().getFullYear())]);
    records.forEach(r => {
      const y = (r.receivedOrSentDate || r.letterDate || "").slice(0, 4);
      if (/^\d{4}$/.test(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (activeFilterType !== "all" && r.type !== activeFilterType) return false;
      if (filterCategory !== "all" && r.category !== filterCategory) return false;

      const dateRef = r.receivedOrSentDate || r.letterDate || "";
      if (filterYear !== "all" && !dateRef.startsWith(filterYear)) return false;
      if (filterMonth !== "all") {
        const m = dateRef.slice(5, 7);
        if (m !== filterMonth) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          r.agendaNumber,
          r.letterNumber,
          r.sender,
          r.recipient,
          r.subject,
          r.summary,
          r.signatory,
          r.dispositionTo,
          r.category
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [records, activeFilterType, filterCategory, filterYear, filterMonth, searchQuery]);

  const stats = useMemo(() => {
    const currentMonthPrefix = todayStr.slice(0, 7);
    const totalMasuk = records.filter(r => r.type === "masuk").length;
    const totalKeluar = records.filter(r => r.type === "keluar").length;
    const thisMonthCount = records.filter(r =>
      (r.receivedOrSentDate || r.letterDate || "").startsWith(currentMonthPrefix)
    ).length;
    return {
      total: records.length,
      masuk: totalMasuk,
      keluar: totalKeluar,
      thisMonth: thisMonthCount
    };
  }, [records, todayStr]);

  // ============================================================================
  // CETAK LAPORAN EXCEL (.XLSX) & PDF (BUKU AGENDA SURAT MASUK & KELUAR)
  // ============================================================================
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      showToast("info", "Tidak ada data surat untuk diekspor ke Excel.");
      return;
    }

    const wb = XLSX.utils.book_new();

    const buildSheetRows = (list: CorrespondenceRecord[]) => {
      const header = [
        "No",
        "Jenis Surat",
        "No. Agenda",
        "Nomor Surat",
        "Tanggal Surat",
        "Tgl Diterima / Dikirim",
        "Pengirim / Asal Surat",
        "Tujuan / Penerima Surat",
        "Perihal / Hal Surat",
        "Klasifikasi / Sifat",
        "Lampiran",
        "Penandatangan",
        "Ringkasan Isi Surat",
        "Disposisi / Tindak Lanjut",
        "Status"
      ];
      const rows: any[][] = [header];
      list.forEach((r, idx) => {
        rows.push([
          idx + 1,
          r.type === "masuk" ? "SURAT MASUK" : "SURAT KELUAR",
          r.agendaNumber || "-",
          r.letterNumber || "-",
          r.letterDate || "-",
          r.receivedOrSentDate || "-",
          r.sender || "-",
          r.recipient || "-",
          r.subject || "-",
          r.category || "Biasa",
          r.attachmentCount || "-",
          r.signatory || "-",
          r.summary || "-",
          r.dispositionTo || "-",
          r.status || "-"
        ]);
      });
      return rows;
    };

    const colWidths = [
      { wch: 5 },
      { wch: 15 },
      { wch: 24 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
      { wch: 28 },
      { wch: 36 },
      { wch: 16 },
      { wch: 12 },
      { wch: 24 },
      { wch: 45 },
      { wch: 28 },
      { wch: 16 }
    ];

    const wsAll = XLSX.utils.aoa_to_sheet(buildSheetRows(filteredRecords));
    wsAll["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, wsAll, "Rekap Agenda Surat");

    const masukList = filteredRecords.filter(r => r.type === "masuk");
    if (masukList.length > 0) {
      const wsMasuk = XLSX.utils.aoa_to_sheet(buildSheetRows(masukList));
      wsMasuk["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsMasuk, "Surat Masuk");
    }

    const keluarList = filteredRecords.filter(r => r.type === "keluar");
    if (keluarList.length > 0) {
      const wsKeluar = XLSX.utils.aoa_to_sheet(buildSheetRows(keluarList));
      wsKeluar["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsKeluar, "Surat Keluar");
    }

    const fileName = `LAPORAN_BUKU_AGENDA_SURAT_${todayStr}.xlsx`;

    try {
      const rawBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const zip = await JSZip.loadAsync(rawBuffer);

      const customStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

      zip.file("xl/styles.xml", customStylesXml);

      const sheetFiles = Object.keys(zip.files).filter(p => /^xl\/worksheets\/sheet\d+\.xml$/.test(p));
      for (const sf of sheetFiles) {
        const f = zip.file(sf);
        if (!f) continue;
        let xml = await f.async("string");
        xml = xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (_m, rStr, attrs, inner) => {
          const rNum = parseInt(rStr, 10);
          const sIdx = rNum === 1 ? "1" : "0";
          const ht = rNum === 1 ? ` ht="26" customHeight="1"` : "";
          return `<row r="${rNum}"${ht}${attrs}>${inner.replace(/<c r="([A-Z]+\d+)"/g, `<c r="$1" s="${sIdx}"`)}</row>`;
        });
        zip.file(sf, xml);
      }

      const blob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      showToast("success", "Laporan Excel (.xlsx) berhasil diunduh.");
    } catch {
      XLSX.writeFile(wb, fileName);
    }
  };

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const handlePrintPdfReport = () => {
    setIsPdfPreviewOpen(true);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      {/* Hidden File Inputs for Phone Camera & File Gallery */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileOrNativeCameraCapture}
        className="hidden"
      />
      <input
        ref={fileGalleryInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        onChange={handleFileOrNativeCameraCapture}
        className="hidden"
      />

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm print:hidden ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-indigo-50 border-indigo-200 text-indigo-900"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-extrabold">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Buku Agenda Surat Masuk &amp; Surat Keluar
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center gap-1">
                  <Sparkles size={11} /> Pemindai Kamera HP Otomatis
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pindai surat fisik menggunakan <strong>Kamera HP</strong> — Nomor Surat, Tanggal, Pengirim, Tujuan, Perihal, dan Ringkasan Isi otomatis terisi.{" "}
                <strong className="text-slate-700">Gambar surat tidak disimpan</strong> demi menghemat penyimpanan server &amp; database.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={scanning}
              onClick={() => {
                resetForm(activeFilterType === "keluar" ? "keluar" : "masuk");
                setIsFormOpen(true);
                nativeCameraInputRef.current?.click();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {scanning ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
              <span>Pindai Surat (Kamera HP)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewForm("masuk", false)}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Catat Surat Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewForm("keluar", false)}
              className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Catat Surat Keluar</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Cetak Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdfReport}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={14} />
              <span>Cetak Laporan PDF</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Total Agenda Surat
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Tersimpan di MySQL</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                Surat Masuk (SM)
              </div>
              <div className="text-2xl font-black text-indigo-950 mt-0.5">{stats.masuk}</div>
              <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">Dokumen Diterima</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <ArrowDownLeft size={18} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Surat Keluar (SK)
              </div>
              <div className="text-2xl font-black text-amber-950 mt-0.5">{stats.keluar}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Dokumen Diterbitkan</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Bulan Ini
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-0.5">{stats.thisMonth}</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Tanpa Simpan Gambar</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================
          MODAL / PANEL FORM PENCATATAN & PEMINDAI KAMERA HP OTOMATIS
          ============================================================================ */}
      {isFormOpen && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-md space-y-5 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingId ? "✏️ Edit Data Buku Agenda Surat" : "📝 Pencatatan Surat Baru & Pemindai Otomatis"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  🔒 Gambar Surat Tidak Disimpan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Gunakan tombol <strong>Potret Kamera HP</strong> di bawah untuk memotret surat fisik agar seluruh kolom terisi otomatis, atau ketik manual.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                setIsFormOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 self-end sm:self-center cursor-pointer"
            >
              <X size={14} /> Tutup Form
            </button>
          </div>

          {/* Bar Pemindai Kamera HP Otomatis */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Camera size={15} className="text-emerald-600" />
                  <span>Pemindai Surat Otomatis via Kamera HP (Auto-Fill Data Surat)</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Foto lembaran surat dengan jelas. Sistem otomatis membaca <strong>Kop/Pengirim, Nomor Surat, Tanggal, Perihal, Tujuan, Penandatangan, &amp; Isi Pokok</strong> lalu menghapus gambar dari memori.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Camera size={14} />
                  <span>Potret Kamera HP (Autofokus)</span>
                </button>

                {!isCameraOpen ? (
                  <button
                    type="button"
                    disabled={scanning}
                    onClick={() => startCameraStream("environment")}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Camera size={14} />
                    <span>Kamera Live di Layar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <X size={14} />
                    <span>Tutup Kamera Live</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => fileGalleryInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload size={14} />
                  <span>Pilih Foto Surat</span>
                </button>
              </div>
            </div>

            {/* Indikator Loading Pemindaian Otomatis */}
            {scanning && (
              <div className="p-4 rounded-xl bg-white border border-emerald-300 flex flex-col sm:flex-row items-center justify-center gap-3 text-emerald-900 font-extrabold text-xs shadow-2xs">
                <Loader2 size={20} className="animate-spin text-emerald-600 shrink-0" />
                <div className="text-center sm:text-left">
                  <div>{scanProgressText || "Sedang membaca & mengekstrak informasi surat secara otomatis..."}</div>
                  <div className="text-[10.5px] font-semibold text-slate-500 mt-0.5">
                    Mohon tunggu beberapa detik • Gambar surat tidak disimpan di server maupun database.
                  </div>
                </div>
              </div>
            )}

            {/* Hasil Pemindaian Terakhir */}
            {!scanning && lastScannedSummary && (
              <div className="p-3.5 rounded-xl bg-white border border-emerald-300 flex flex-col gap-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-900">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Data Surat Berhasil Dipindai &amp; Diisi Otomatis ke Kolom di Bawah!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRawScannedText(prev => !prev)}
                    className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    {showRawScannedText ? "Sembunyikan Teks Terbaca" : "Lihat / Edit Teks Terbaca dari Surat"}
                  </button>
                </div>

                {showRawScannedText && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-[10px] font-black uppercase text-slate-500">
                      Teks Hasil Bacaan Surat (Dapat Diedit Lalu Klik "Terapkan Ulang ke Kolom"):
                    </label>
                    <textarea
                      rows={5}
                      value={manualRawTextToParse}
                      onChange={e => setManualRawTextToParse(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-800 bg-slate-50"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleReparseManualText}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold cursor-pointer"
                      >
                        Terapkan Ulang Teks ke Kolom Formulir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Camera Viewfinder */}
            {isCameraOpen && (
              <div className="bg-slate-950 rounded-2xl p-3 flex flex-col items-center gap-3 border border-slate-800">
                {cameraError ? (
                  <div className="p-4 text-center text-amber-300 text-xs font-bold space-y-2">
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={14} /> Buka Kamera HP Native Sekarang
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative w-full max-w-xl aspect-[3/4] sm:aspect-video bg-black rounded-xl overflow-hidden border border-emerald-500/40">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-4 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-end justify-center pb-2">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 text-emerald-300 text-[10px] font-bold">
                          Posisikan lembaran surat di dalam bingkai ini
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <SwitchCamera size={14} />
                        <span>Balik Kamera</span>
                      </button>

                      <button
                        type="button"
                        disabled={scanning}
                        onClick={handleCaptureFromLiveVideo}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Camera size={15} />
                        <span>Jepret &amp; Isi Data Surat Otomatis</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Form Input Data Surat */}
          <form onSubmit={handleSaveRecord} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Jenis Surat */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Jenis Pencatatan Surat *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType("masuk");
                    if (!editingId) {
                      setAgendaNumber(generateNextAgendaNumber("masuk", receivedOrSentDate || letterDate));
                      setStatus("Diterima");
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                    type === "masuk"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <ArrowDownLeft size={14} /> Surat Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType("keluar");
                    if (!editingId) {
                      setAgendaNumber(generateNextAgendaNumber("keluar", receivedOrSentDate || letterDate));
                      setStatus("Terkirim");
                      if (!sender) setSender(schoolName);
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                    type === "keluar"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <ArrowUpRight size={14} /> Surat Keluar
                </button>
              </div>
            </div>

            {/* Nomor Agenda */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Nomor Agenda Buku Surat
              </label>
              <input
                type="text"
                value={agendaNumber}
                onChange={e => setAgendaNumber(e.target.value)}
                placeholder="Otomatis: 001/SM/SMP-MNU/XI/2026"
                className="border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Nomor Surat */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Nomor Surat (Sesuai Dokumen) *
              </label>
              <input
                type="text"
                value={letterNumber}
                onChange={e => setLetterNumber(e.target.value)}
                placeholder="Contoh: 005/128/424.071/2026"
                required
                className="border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tanggal Surat */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Tanggal Surat *
              </label>
              <input
                type="date"
                value={letterDate}
                onChange={e => setLetterDate(e.target.value)}
                required
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tanggal Diterima / Dikirim */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                {type === "masuk" ? "Tanggal Diterima di Sekolah *" : "Tanggal Dikirim / Diterbitkan *"}
              </label>
              <input
                type="date"
                value={receivedOrSentDate}
                onChange={e => setReceivedOrSentDate(e.target.value)}
                required
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Sifat / Klasifikasi Surat */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Klasifikasi / Sifat Surat
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LETTER_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Pengirim */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Pengirim / Instansi Asal Surat *
              </label>
              <input
                type="text"
                value={sender}
                onChange={e => setSender(e.target.value)}
                placeholder="Contoh: Dinas Pendidikan dan Kebudayaan / LP Ma'arif NU"
                required
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Penerima / Tujuan */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Tujuan / Penerima Surat *
              </label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="Contoh: Kepala SMP Ma'arif NU Pandaan / Wali Murid"
                required
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Lampiran & Status */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-black uppercase text-slate-600">
                  Lampiran
                </label>
                <input
                  type="text"
                  value={attachmentCount}
                  onChange={e => setAttachmentCount(e.target.value)}
                  placeholder="- / 1 Berkas"
                  className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-black uppercase text-slate-600">
                  Status Surat
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(type === "masuk" ? LETTER_STATUSES_MASUK : LETTER_STATUSES_KELUAR).map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Perihal Surat */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Perihal / Pokok Surat *
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Contoh: Undangan Rapat Koordinasi Kepala Sekolah..."
                required
                className="border border-slate-300 rounded-xl px-3 py-2 font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Penandatangan Surat */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Pejabat / Pihak Penandatangan
              </label>
              <input
                type="text"
                value={signatory}
                onChange={e => setSignatory(e.target.value)}
                placeholder="Nama & Jabatan Penandatangan"
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Ringkasan Isi Surat */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                Ringkasan Isi Pokok Surat (Terisi Otomatis Saat Scan)
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="Ringkasan isi surat, jadwal kegiatan, tempat, atau poin penting..."
                className="border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Disposisi / Tindak Lanjut */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black uppercase text-slate-600">
                {type === "masuk" ? "Disposisi / Diteruskan Kepada" : "Catatan Distribusi / Tembusan"}
              </label>
              <input
                type="text"
                value={dispositionTo}
                onChange={e => setDispositionTo(e.target.value)}
                placeholder="Contoh: Waka Kurikulum / Bendahara / Arsip TU"
                className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-3 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setIsFormOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{editingId ? "Simpan Perubahan Surat" : "Simpan ke Buku Agenda (MySQL)"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================================
          FILTER & TABEL BUKU AGENDA SURAT MASUK & KELUAR
          ============================================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 pb-3 border-b border-slate-100">
          {/* Sub-Tab Jenis Surat */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFilterType("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                activeFilterType === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Semua Surat ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterType("masuk")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeFilterType === "masuk"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
              }`}
            >
              <ArrowDownLeft size={13} /> Surat Masuk ({stats.masuk})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterType("keluar")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeFilterType === "keluar"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <ArrowUpRight size={13} /> Surat Keluar ({stats.keluar})
            </button>
          </div>

          {/* Search & Period Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari No. Surat, Pengirim, Perihal..."
                className="w-full pl-8 pr-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="border border-slate-250 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="all">Semua Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>

            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="border border-slate-250 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map(y => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-250 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="all">Semua Kategori</option>
              {LETTER_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchRecords}
              title="Muat ulang data dari MySQL"
              className="p-2 rounded-xl border border-slate-250 hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-700">
                <th className="py-3 px-3 font-black w-10">No</th>
                <th className="py-3 px-3 font-black">Jenis &amp; No. Agenda</th>
                <th className="py-3 px-3 font-black">Nomor &amp; Tgl Surat</th>
                <th className="py-3 px-3 font-black">Pengirim &amp; Tujuan</th>
                <th className="py-3 px-3 font-black">Perihal &amp; Ringkasan Isi Surat</th>
                <th className="py-3 px-3 font-black text-center">Klasifikasi</th>
                <th className="py-3 px-3 font-black">Disposisi / Status</th>
                <th className="py-3 px-3 font-black text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-bold">
                      <Loader2 size={16} className="animate-spin text-indigo-600" />
                      <span>Memuat Buku Agenda Surat dari MySQL...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    Belum ada data surat tercatat pada filter ini. Klik tombol <strong>Pindai Surat (Kamera HP)</strong> di atas untuk memindai surat secara otomatis.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const isMasuk = rec.type === "masuk";
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 align-top bg-white">
                      <td className="py-3.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isMasuk
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-250"
                              : "bg-amber-100 text-amber-900 border border-amber-250"
                          }`}
                        >
                          {isMasuk ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                          {isMasuk ? "Surat Masuk" : "Surat Keluar"}
                        </span>
                        <div className="font-mono text-[11px] font-bold text-slate-700 mt-1">
                          {rec.agendaNumber || "-"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isMasuk ? "Diterima:" : "Dikirim:"} {rec.receivedOrSentDate || "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono font-extrabold text-slate-900">{rec.letterNumber || "-"}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tgl Surat: <span className="font-semibold text-slate-700">{rec.letterDate || "-"}</span>
                        </div>
                        {rec.attachmentCount && rec.attachmentCount !== "-" && (
                          <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                            📎 Lampiran: {rec.attachmentCount}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Dari / Pengirim:</div>
                        <div className="font-extrabold text-slate-900">{rec.sender || "-"}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Kepada / Tujuan:</div>
                        <div className="font-semibold text-slate-700">{rec.recipient || "-"}</div>
                      </td>
                      <td className="py-3.5 px-3 max-w-md">
                        <div className="font-extrabold text-slate-900 text-xs">{rec.subject || "-"}</div>
                        {rec.summary && (
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-3">
                            {rec.summary}
                          </p>
                        )}
                        {rec.signatory && (
                          <div className="text-[10px] text-slate-500 font-semibold mt-1">
                            ✍️ Penandatangan: {rec.signatory}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-[10.5px]">
                          {rec.category || "Biasa"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                          {rec.status || "Tercatat"}
                        </span>
                        {rec.dispositionTo && (
                          <div className="text-[11px] text-slate-700 font-semibold mt-1">
                            📌 {rec.dispositionTo}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailModalRecord(rec)}
                            title="Lihat Detail / Cetak Disposisi"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(rec)}
                            title="Edit Data Surat"
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec)}
                            title="Hapus Data Surat"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================================
          MODAL DETAIL SURAT & CETAK LEMBAR DISPOSISI (PDF)
          ============================================================================ */}
      {detailModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                <span>Detail Pencatatan &amp; Lembar Disposisi Surat</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerBrowserPrint}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} /> Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalRecord(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Area Cetak Lembar Disposisi */}
            <div className="border border-slate-300 rounded-xl p-5 space-y-4 text-xs text-slate-900">
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <div className="text-sm font-black uppercase">
                  {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">
                  {schoolIdentity?.address || "Jl. Raya By Pass Pandaan, Pasuruan"}
                </div>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                  {detailModalRecord.type === "masuk"
                    ? "LEMBAR AGENDA & DISPOSISI SURAT MASUK"
                    : "LEMBAR AGENDA SURAT KELUAR"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-500 font-bold">Nomor Agenda:</span>
                  <div className="font-mono font-black text-slate-900">{detailModalRecord.agendaNumber || "-"}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Sifat / Klasifikasi:</span>
                  <div className="font-black text-slate-900">{detailModalRecord.category || "Biasa"}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Nomor Surat:</span>
                  <div className="font-mono font-black text-slate-900">{detailModalRecord.letterNumber || "-"}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Tanggal Surat:</span>
                  <div className="font-bold text-slate-900">{formatDateIndo(detailModalRecord.letterDate)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Pengirim / Asal Surat:</span>
                  <div className="font-black text-slate-900">{detailModalRecord.sender || "-"}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Tujuan / Penerima:</span>
                  <div className="font-bold text-slate-900">{detailModalRecord.recipient || "-"}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 font-bold">Perihal Pokok Surat:</span>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{detailModalRecord.subject}</div>
                </div>
                {detailModalRecord.summary && (
                  <div>
                    <span className="text-slate-500 font-bold">Ringkasan Isi Surat:</span>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 mt-0.5 leading-relaxed">
                      {detailModalRecord.summary}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 font-bold">Disposisi / Tindak Lanjut:</span>
                    <div className="font-bold text-slate-900 mt-0.5">{detailModalRecord.dispositionTo || "-"}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Penandatangan Surat:</span>
                    <div className="font-bold text-slate-900 mt-0.5">{detailModalRecord.signatory || "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL CETAK LAPORAN PDF BUKU AGENDA SURAT MASUK & KELUAR
          ============================================================================ */}
      {isPdfPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex flex-col items-center justify-start p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-5 sm:p-8 shadow-2xl space-y-6">
            {/* Action Bar (Disembunyikan saat Print / Save PDF) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 print:hidden">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Printer size={18} className="text-indigo-600" />
                  <span>Pratinjau Cetak Laporan PDF — Buku Agenda Surat Masuk &amp; Keluar</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Klik tombol <strong>Cetak / Simpan PDF</strong> lalu pilih <strong>"Save as PDF" (Simpan sebagai PDF)</strong> atau printer Anda.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} /> Unduh Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={triggerBrowserPrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer size={14} /> Cetak / Simpan PDF Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="correspondence-pdf-print-area" className="text-slate-900 space-y-5">
              {/* Kop Surat Sekolah */}
              <div className="flex items-center justify-between border-b-4 border-double border-slate-900 pb-4 gap-4">
                {schoolIdentity?.logo && (
                  <img
                    src={schoolIdentity.logo}
                    alt="Logo Sekolah"
                    className="w-16 h-16 object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="text-center flex-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-700">
                    {schoolIdentity?.subheading || "LEMBAGA PENDIDIKAN MA'ARIF NU"}
                  </div>
                  <div className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-950">
                    {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600">
                    {schoolIdentity?.address || "Jl. Raya By Pass Pandaan, Kab. Pasuruan"} • Telp:{" "}
                    {schoolIdentity?.phone || "-"}
                  </div>
                </div>
                {schoolIdentity?.logo2 && (
                  <img
                    src={schoolIdentity.logo2}
                    alt="Logo 2"
                    className="w-16 h-16 object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Judul Laporan */}
              <div className="text-center space-y-1">
                <h4 className="text-sm sm:text-base font-black uppercase underline tracking-wide">
                  LAPORAN BUKU AGENDA{" "}
                  {activeFilterType === "masuk"
                    ? "SURAT MASUK"
                    : activeFilterType === "keluar"
                    ? "SURAT KELUAR"
                    : "SURAT MASUK DAN SURAT KELUAR"}
                </h4>
                <p className="text-[11px] font-semibold text-slate-600">
                  Dicetak Tanggal: {formatDateIndo(todayStr)} • Total Data: {filteredRecords.length} Surat (Surat Masuk:{" "}
                  {filteredRecords.filter(r => r.type === "masuk").length}, Surat Keluar:{" "}
                  {filteredRecords.filter(r => r.type === "keluar").length})
                </p>
              </div>

              {/* Tabel Laporan PDF */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[10px]">
                      <th className="border border-slate-800 py-2 px-2 text-center w-8">No</th>
                      <th className="border border-slate-800 py-2 px-2 text-center w-20">Jenis</th>
                      <th className="border border-slate-800 py-2 px-2">No. Agenda</th>
                      <th className="border border-slate-800 py-2 px-2">Nomor &amp; Tgl Surat</th>
                      <th className="border border-slate-800 py-2 px-2">Tgl Terima/Kirim</th>
                      <th className="border border-slate-800 py-2 px-2">Pengirim / Asal</th>
                      <th className="border border-slate-800 py-2 px-2">Tujuan / Penerima</th>
                      <th className="border border-slate-800 py-2 px-2">Perihal &amp; Ringkasan Isi</th>
                      <th className="border border-slate-800 py-2 px-2">Disposisi / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => (
                      <tr key={r.id} className="align-top">
                        <td className="border border-slate-800 py-1.5 px-2 text-center font-mono">{i + 1}</td>
                        <td className="border border-slate-800 py-1.5 px-2 text-center font-bold uppercase">
                          {r.type === "masuk" ? "Masuk" : "Keluar"}
                        </td>
                        <td className="border border-slate-800 py-1.5 px-2 font-mono">{r.agendaNumber || "-"}</td>
                        <td className="border border-slate-800 py-1.5 px-2">
                          <div className="font-mono font-bold">{r.letterNumber || "-"}</div>
                          <div className="text-[10px] text-slate-600">{r.letterDate || "-"}</div>
                        </td>
                        <td className="border border-slate-800 py-1.5 px-2 text-center">
                          {r.receivedOrSentDate || "-"}
                        </td>
                        <td className="border border-slate-800 py-1.5 px-2 font-semibold">{r.sender || "-"}</td>
                        <td className="border border-slate-800 py-1.5 px-2">{r.recipient || "-"}</td>
                        <td className="border border-slate-800 py-1.5 px-2">
                          <div className="font-bold">{r.subject || "-"}</div>
                          {r.summary && <div className="text-[10px] text-slate-700 mt-0.5">{r.summary}</div>}
                        </td>
                        <td className="border border-slate-800 py-1.5 px-2">
                          <div className="font-bold">{r.status || "-"}</div>
                          {r.dispositionTo && <div className="text-[10px]">{r.dispositionTo}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan Kepala Sekolah & Administrasi */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
                <div className="text-center space-y-14">
                  <div>
                    <div>Mengetahui,</div>
                    <div className="font-bold">Kepala {schoolIdentity?.name || "SMP Ma'arif NU Pandaan"}</div>
                  </div>
                  <div>
                    <div className="font-black underline">
                      {schoolIdentity?.principal || "Kepala Sekolah"}
                    </div>
                    {schoolIdentity?.principalNip && (
                      <div className="text-[11px]">NIP/NUPTK: {schoolIdentity.principalNip}</div>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-14">
                  <div>
                    <div>Pandaan, {formatDateIndo(todayStr)}</div>
                    <div className="font-bold">Petugas Administrasi / Tata Usaha</div>
                  </div>
                  <div>
                    <div className="font-black underline">
                      {schoolIdentity?.treasurer || " Bagian Tata Usaha / Administrasi "}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
