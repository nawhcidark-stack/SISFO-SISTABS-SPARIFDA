import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Search,
  Printer,
  Download,
  FileText,
  FileCode,
  Sparkles,
  ArrowRight,
  Filter,
  Link2,
  UserCheck,
  Wallet,
  Landmark,
  ChevronRight,
  Loader2,
  Check
} from "lucide-react";
import * as XLSX from "xlsx";

export interface MidtransBulkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReconciliation?: () => void;
}

export interface ReconcileResultItem {
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
}

export interface ReconcileSummary {
  totalRows: number;
  reconciledCount: number;
  alreadyPaidCount: number;
  notFoundCount: number;
  pendingCount: number;
  failedCount: number;
  totalAmountReconciled: number;
}

interface StudentSearchResult {
  id: string;
  name: string;
  nis: string;
  class?: string;
  savingsBalance: number;
  unpaidSppCount: number;
  unpaidSppTotal: number;
  unpaidSppBills: { id: string; month: string; year: number; amount: number }[];
  unpaidMiscCount: number;
  unpaidMiscTotal: number;
  unpaidMiscBills: { id: string; title: string; amount: number }[];
}

export const MidtransBulkReportModal: React.FC<MidtransBulkReportModalProps> = ({
  isOpen,
  onClose,
  onSuccessReconciliation
}) => {
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Results State
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [results, setResults] = useState<ReconcileResultItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pairing Modal State
  const [pairingItem, setPairingItem] = useState<ReconcileResultItem | null>(null);
  const [pairingSearchQuery, setPairingSearchQuery] = useState<string>('');
  const [searchedStudents, setSearchedStudents] = useState<StudentSearchResult[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [pairingAllocationType, setPairingAllocationType] = useState<'auto_spp' | 'savings' | 'treasurer_kas' | 'specific_bill'>('auto_spp');
  const [selectedSpecificBill, setSelectedSpecificBill] = useState<{ id: string; type: 'spp' | 'misc'; title: string } | null>(null);
  const [isPairingSubmitting, setIsPairingSubmitting] = useState<boolean>(false);
  const [pairingSuccessMsg, setPairingSuccessMsg] = useState<string | null>(null);

  // Auto-reconcile all state
  const [isAutoReconcilingAll, setIsAutoReconcilingAll] = useState<boolean>(false);
  const [autoReconcileMessage, setAutoReconcileMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Function to process raw row objects into normalized fields
  const normalizeRowsFromData = (dataArray: any[]): any[] => {
    if (!dataArray || dataArray.length === 0) return [];
    
    // If it's a 2D array (sheet_to_json with header: 1)
    if (Array.isArray(dataArray[0])) {
      const headers = (dataArray[0] as any[]).map(h => String(h || '').trim().toLowerCase());
      
      let orderIdIdx = headers.findIndex(h => h.includes("order_id") || h.includes("order id") || h.includes("orderid") || h.includes("no. order") || h.includes("ref") || h.includes("no order"));
      let txIdIdx = headers.findIndex(h => h.includes("transaction_id") || h.includes("transaction id") || h.includes("trans_id") || h.includes("id transaksi") || h.includes("tx id") || h.includes("tx_id"));
      let statusIdx = headers.findIndex(h => h.includes("status") || h.includes("transaction_status") || h.includes("state"));
      let amountIdx = headers.findIndex(h => h.includes("amount") || h.includes("gross") || h.includes("total") || h.includes("nominal") || h.includes("jumlah"));
      let paymentIdx = headers.findIndex(h => h.includes("payment") || h.includes("channel") || h.includes("metode"));
      let timeIdx = headers.findIndex(h => h.includes("time") || h.includes("date") || h.includes("tanggal") || h.includes("waktu") || h.includes("settlement"));
      let emailIdx = headers.findIndex(h => h.includes("email") || h.includes("e-mail") || h.includes("mail") || h.includes("customer"));
      let nameIdx = headers.findIndex(h => h.includes("customer_name") || h.includes("customer name") || h.includes("nama") || h.includes("siswa") || h.includes("pembayar"));
      let nisIdx = headers.findIndex(h => h.includes("nis") || h.includes("nisn") || h.includes("no_induk") || h.includes("no induk"));
      let descIdx = headers.findIndex(h => h.includes("description") || h.includes("keterangan") || h.includes("deskripsi") || h.includes("item") || h.includes("item_name") || h.includes("items") || h.includes("notes") || h.includes("rincian") || h.includes("detail"));
      let monthIdx = headers.findIndex(h => h.includes("bulan") || h.includes("month") || h.includes("periode"));
      let yearIdx = headers.findIndex(h => h.includes("tahun") || h.includes("year"));

      if (orderIdIdx === -1 && txIdIdx !== -1) orderIdIdx = txIdIdx;
      if (orderIdIdx === -1) orderIdIdx = 0; // fallback first column

      const items: any[] = [];
      for (let i = 1; i < dataArray.length; i++) {
        const row = dataArray[i];
        if (!row || row.length === 0) continue;
        const orderId = String(row[orderIdIdx] || '').trim();
        const transactionId = txIdIdx !== -1 && row[txIdIdx] ? String(row[txIdIdx]).trim() : undefined;
        if ((orderId && orderId.length >= 2 && !orderId.toLowerCase().includes("order_id")) || transactionId) {
          items.push({
            orderId: orderId || transactionId || "",
            transactionId,
            status: statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : "settlement",
            gross_amount: amountIdx !== -1 && row[amountIdx] ? row[amountIdx] : undefined,
            payment_type: paymentIdx !== -1 && row[paymentIdx] ? String(row[paymentIdx]).trim() : undefined,
            settlement_time: timeIdx !== -1 && row[timeIdx] ? String(row[timeIdx]).trim() : undefined,
            customer_email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined,
            customerName: nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : undefined,
            studentNis: nisIdx !== -1 && row[nisIdx] ? String(row[nisIdx]).trim() : undefined,
            description: descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : undefined,
            month: monthIdx !== -1 && row[monthIdx] ? String(row[monthIdx]).trim() : undefined,
            year: yearIdx !== -1 && row[yearIdx] ? Number(row[yearIdx]) : undefined
          });
        }
      }
      return items;
    }

    // If it's an array of objects (JSON or XLSX sheet_to_json with objects)
    return dataArray.map(obj => {
      const keys = Object.keys(obj);
      const findKey = (candidates: string[]) => {
        const found = keys.find(k => {
          const lower = k.toLowerCase();
          return candidates.some(c => lower.includes(c));
        });
        return found ? obj[found] : undefined;
      };

      const orderId = findKey(["order_id", "order id", "orderid", "no. order", "ref", "no order", "id"]);
      const transactionId = findKey(["transaction_id", "transaction id", "trans_id", "id transaksi", "tx id", "tx_id"]);
      const status = findKey(["status", "transaction_status", "state"]) || "settlement";
      const gross_amount = findKey(["amount", "gross", "total", "nominal", "jumlah"]);
      const payment_type = findKey(["payment", "channel", "metode"]);
      const settlement_time = findKey(["time", "date", "tanggal", "waktu", "settlement"]);
      const customer_email = findKey(["email", "e-mail", "mail"]);
      const customerName = findKey(["customer_name", "customer name", "nama", "siswa", "pembayar"]);
      const studentNis = findKey(["nis", "nisn", "no_induk", "no induk"]);
      const description = findKey(["description", "keterangan", "deskripsi", "item", "item_name", "items", "notes", "rincian", "detail"]);
      const month = findKey(["bulan", "month", "periode"]);
      const year = findKey(["tahun", "year"]);

      return {
        orderId: orderId ? String(orderId).trim() : (transactionId ? String(transactionId).trim() : ""),
        transactionId: transactionId ? String(transactionId).trim() : undefined,
        status: String(status).trim(),
        gross_amount,
        payment_type: payment_type ? String(payment_type).trim() : undefined,
        settlement_time: settlement_time ? String(settlement_time).trim() : undefined,
        customer_email: customer_email ? String(customer_email).trim() : undefined,
        customerName: customerName ? String(customerName).trim() : undefined,
        studentNis: studentNis ? String(studentNis).trim() : undefined,
        description: description ? String(description).trim() : undefined,
        month: month ? String(month).trim() : undefined,
        year: year ? Number(year) : undefined
      };
    }).filter(item => Boolean(item.orderId || item.transactionId));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);
    setIsParsing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    const isBinary = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (isBinary) {
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const rows = normalizeRowsFromData(jsonSheet);
          if (rows.length === 0) {
            setErrorMessage("File terbaca, namun tidak ditemukan baris transaksi yang valid dengan kolom Order ID.");
          } else {
            setParsedRows(rows);
          }
        } else {
          const text = String(data);
          const workbook = XLSX.read(text, { type: "string" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const rows = normalizeRowsFromData(jsonSheet);
          if (rows.length === 0) {
            setErrorMessage("File CSV terbaca, namun tidak ditemukan data Order ID yang cocok.");
          } else {
            setParsedRows(rows);
          }
        }
      } catch (err: any) {
        console.error("Parse error:", err);
        setErrorMessage("Gagal membaca file: format file tidak didukung atau rusak.");
      } finally {
        setIsParsing(false);
      }
    };

    if (isBinary) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleParseTextManual = () => {
    if (!rawTextInput.trim()) {
      setErrorMessage("Silakan tempel teks CSV atau daftar Order ID terlebih dahulu.");
      return;
    }
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const workbook = XLSX.read(rawTextInput, { type: "string" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const rows = normalizeRowsFromData(jsonSheet);

      if (rows.length > 0) {
        setParsedRows(rows);
        setFileName("Pasted_Text_Data.csv");
      } else {
        // Fallback: parse lines directly as order IDs
        const lines = rawTextInput.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 3);
        const manualRows = lines.map(line => {
          const parts = line.split(/[,\t;]/).map(p => p.trim());
          return {
            orderId: parts[0],
            gross_amount: parts[1] ? Number(parts[1].replace(/[^0-9]/g, '')) : undefined,
            status: "settlement"
          };
        });
        if (manualRows.length > 0) {
          setParsedRows(manualRows);
          setFileName("Pasted_Order_List.txt");
        } else {
          setErrorMessage("Tidak ada Order ID valid yang dapat diuraikan dari teks.");
        }
      }
    } catch (err: any) {
      setErrorMessage("Gagal menguraikan teks input.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmitReconciliation = async () => {
    if (parsedRows.length === 0) {
      setErrorMessage("Belum ada baris transaksi yang diuraikan untuk diverifikasi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/verify-midtrans-bulk-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedRows })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSummary(data.summary);
        setResults(data.results || []);
        if (onSuccessReconciliation) {
          onSuccessReconciliation();
        }
      } else {
        setErrorMessage(data.error || "Gagal memproses rekonsiliasi bulk report.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Gagal terhubung ke server untuk rekonsiliasi bulk report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetModal = () => {
    setParsedRows([]);
    setFileName('');
    setRawTextInput('');
    setSummary(null);
    setResults([]);
    setErrorMessage(null);
    setStatusFilter('all');
    setSearchQuery('');
    setPairingItem(null);
    setSelectedStudent(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Search students for manual pairing
  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchedStudents([]);
      return;
    }
    setIsSearchingStudents(true);
    try {
      const res = await fetch(`/api/search-student-for-reconcile?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data && Array.isArray(data.students)) {
        setSearchedStudents(data.students);
      } else {
        setSearchedStudents([]);
      }
    } catch (e) {
      console.error("Failed to search students:", e);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  // Open Pairing Modal for an item
  const handleOpenPairingModal = (item: ReconcileResultItem) => {
    setPairingItem(item);
    setSelectedStudent(null);
    setSelectedSpecificBill(null);
    setPairingAllocationType('auto_spp');
    setPairingSuccessMsg(null);

    // Extract query hint from item
    let queryHint = "";
    if (item.studentNis && item.studentNis !== "-") {
      queryHint = item.studentNis;
    } else if (item.studentName && !item.studentName.includes("Wali") && !item.studentName.includes("Umum")) {
      queryHint = item.studentName;
    } else {
      // Extract numbers from order ID (e.g. CART-13134-...)
      const parts = item.orderId.split("-");
      for (const p of parts) {
        if (/^\d{3,10}$/.test(p)) {
          queryHint = p;
          break;
        }
      }
    }

    setPairingSearchQuery(queryHint);
    if (queryHint) {
      searchStudents(queryHint);
    } else {
      setSearchedStudents([]);
    }
  };

  // Submit Single Manual Pairing
  const handleSubmitPairing = async () => {
    if (!pairingItem) return;
    if (pairingAllocationType !== 'treasurer_kas' && !selectedStudent) {
      setErrorMessage("Silakan pilih siswa penerima alokasi pembayaran terlebih dahulu.");
      return;
    }

    setIsPairingSubmitting(true);
    try {
      const payload = {
        orderId: pairingItem.orderId,
        transactionId: pairingItem.transactionId,
        amount: pairingItem.amount,
        studentId: selectedStudent?.id,
        studentNis: selectedStudent?.nis,
        allocationType: pairingAllocationType,
        specificBillId: selectedSpecificBill?.id,
        specificBillType: selectedSpecificBill?.type,
        paymentType: pairingItem.reportPaymentType || "Midtrans Online (Manual Reconciled)",
        settlementTime: pairingItem.reportTime,
        notes: `Rekonsiliasi Manual (${pairingItem.orderId})`
      };

      const res = await fetch("/api/manual-reconcile-midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Update local results state
        setResults(prev => prev.map(r => {
          if (r.orderId === pairingItem.orderId) {
            return {
              ...r,
              studentName: selectedStudent?.name || (pairingAllocationType === 'treasurer_kas' ? "Kas Umum (BKU)" : r.studentName),
              studentNis: selectedStudent?.nis || r.studentNis,
              studentClass: selectedStudent?.class || r.studentClass,
              category: data.allocResult?.category || (pairingAllocationType === 'savings' ? "Setoran Tabungan" : (pairingAllocationType === 'treasurer_kas' ? "Penerimaan Kas Umum" : r.category)),
              reconciliationStatus: 'reconciled',
              message: data.message || "BERHASIL DILUNASI! Berhasil direkonsiliasi secara manual."
            };
          }
          return r;
        }));

        // Update summary
        if (summary) {
          setSummary({
            ...summary,
            reconciledCount: summary.reconciledCount + 1,
            notFoundCount: Math.max(0, summary.notFoundCount - 1),
            totalAmountReconciled: summary.totalAmountReconciled + pairingItem.amount
          });
        }

        if (onSuccessReconciliation) {
          onSuccessReconciliation();
        }

        setPairingSuccessMsg(data.message || "Berhasil merekonsiliasi transaksi!");
        setTimeout(() => {
          setPairingItem(null);
          setPairingSuccessMsg(null);
        }, 1200);
      } else {
        setErrorMessage(data.error || "Gagal merekonsiliasi manual.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage("Gagal terhubung ke server.");
    } finally {
      setIsPairingSubmitting(false);
    }
  };

  // Quick One-Click Auto Allocate for a specific row
  const handleQuickAutoAllocate = async (item: ReconcileResultItem) => {
    setIsPairingSubmitting(true);
    try {
      const payload = {
        orderId: item.orderId,
        transactionId: item.transactionId,
        amount: item.amount,
        studentNis: item.studentNis && item.studentNis !== "-" ? item.studentNis : undefined,
        allocationType: 'auto_spp',
        paymentType: item.reportPaymentType || "Midtrans Online",
        settlementTime: item.reportTime
      };

      const res = await fetch("/api/manual-reconcile-midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResults(prev => prev.map(r => {
          if (r.orderId === item.orderId) {
            return {
              ...r,
              studentName: data.allocResult?.category ? (r.studentName) : r.studentName,
              category: data.allocResult?.category || "SPP / Tabungan Siswa",
              reconciliationStatus: 'reconciled',
              message: data.message || "BERHASIL DILUNASI! Otomatis dialokasikan ke tagihan siswa."
            };
          }
          return r;
        }));

        if (summary) {
          setSummary({
            ...summary,
            reconciledCount: summary.reconciledCount + 1,
            notFoundCount: Math.max(0, summary.notFoundCount - 1),
            totalAmountReconciled: summary.totalAmountReconciled + item.amount
          });
        }

        if (onSuccessReconciliation) {
          onSuccessReconciliation();
        }
      } else {
        handleOpenPairingModal(item);
      }
    } catch (e) {
      handleOpenPairingModal(item);
    } finally {
      setIsPairingSubmitting(false);
    }
  };

  // Auto Reconcile All Unmatched with detectable NIS
  const handleAutoReconcileAllUnmatched = async () => {
    const unmatchedItems = results.filter(r => r.reconciliationStatus === 'not_found');
    if (unmatchedItems.length === 0) return;

    setIsAutoReconcilingAll(true);
    setAutoReconcileMessage("Memproses rekonsiliasi otomatis semua order...");

    let successCount = 0;
    let addedAmount = 0;

    for (const item of unmatchedItems) {
      try {
        const payload = {
          orderId: item.orderId,
          transactionId: item.transactionId,
          amount: item.amount,
          studentNis: item.studentNis && item.studentNis !== "-" ? item.studentNis : undefined,
          allocationType: 'auto_spp',
          paymentType: item.reportPaymentType || "Midtrans Online",
          settlementTime: item.reportTime
        };

        const res = await fetch("/api/manual-reconcile-midtrans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
          addedAmount += item.amount;
          setResults(prev => prev.map(r => {
            if (r.orderId === item.orderId) {
              return {
                ...r,
                category: data.allocResult?.category || "SPP / Tabungan Siswa",
                reconciliationStatus: 'reconciled',
                message: data.message || "BERHASIL DILUNASI! Otomatis dialokasikan ke tagihan siswa."
              };
            }
            return r;
          }));
        }
      } catch (e) {}
    }

    if (summary) {
      setSummary({
        ...summary,
        reconciledCount: summary.reconciledCount + successCount,
        notFoundCount: Math.max(0, summary.notFoundCount - successCount),
        totalAmountReconciled: summary.totalAmountReconciled + addedAmount
      });
    }

    if (onSuccessReconciliation) {
      onSuccessReconciliation();
    }

    setAutoReconcileMessage(`Selesai! Berhasil merekonsiliasi ${successCount} dari ${unmatchedItems.length} order.`);
    setTimeout(() => {
      setAutoReconcileMessage(null);
      setIsAutoReconcilingAll(false);
    }, 3000);
  };

  // Filtered Results
  const filteredResults = results.filter(item => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'reconciled' && item.reconciliationStatus === 'reconciled') ||
      (statusFilter === 'already_paid' && item.reconciliationStatus === 'already_paid') ||
      (statusFilter === 'not_found' && item.reconciliationStatus === 'not_found') ||
      (statusFilter === 'pending_or_failed' && (item.reconciliationStatus === 'report_pending' || item.reconciliationStatus === 'report_failed'));

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.orderId.toLowerCase().includes(query) ||
      (item.transactionId && item.transactionId.toLowerCase().includes(query)) ||
      item.studentName.toLowerCase().includes(query) ||
      item.studentNis.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.message.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const handleDownloadCsvResult = () => {
    if (results.length === 0) return;
    const csvRows = [
      ["Order ID", "Transaction ID", "Nama Siswa", "NIS", "Kelas", "Kategori/Tagihan", "Nominal (Rp)", "Status Report", "Hasil Rekonsiliasi", "Keterangan"].join(",")
    ];

    results.forEach(item => {
      const row = [
        `"${item.orderId}"`,
        `"${item.transactionId || ''}"`,
        `"${item.studentName}"`,
        `"${item.studentNis}"`,
        `"${item.studentClass || '-'}"`,
        `"${item.category}"`,
        item.amount,
        `"${item.reportStatus}"`,
        `"${item.reconciliationStatus}"`,
        `"${item.message.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekonsiliasi_Midtrans_Report_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                Bulk Cek &amp; Rekonsiliasi Transaksi Midtrans
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 text-[10px] rounded-full border border-indigo-400/30 font-semibold uppercase">
                  Smart Reconcile
                </span>
              </h3>
              <p className="text-slate-300 text-xs mt-0.5 font-medium">
                Verifikasi massal file report Midtrans MAP (.csv, .xlsx) dengan pencocokan otomatis &amp; manual alokasi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step 1: Upload / Input Form */}
          {!summary ? (
            <div className="space-y-5">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      inputMode === 'file'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <UploadCloud size={16} />
                    <span>Upload File Report (.csv, .xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      inputMode === 'text'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <FileText size={16} />
                    <span>Tempel Teks CSV / Order ID</span>
                  </button>
                </div>
                <a
                  href="https://dashboard.midtrans.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 underline decoration-indigo-300 underline-offset-4"
                >
                  <span>Buka Dashboard Midtrans MAP</span>
                  <ArrowRight size={13} />
                </a>
              </div>

              {/* Mode 1: File Upload */}
              {inputMode === 'file' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 transition-all rounded-3xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-3 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls, .txt, .tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="p-4 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                      <UploadCloud size={32} />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-800">
                        Klik untuk memilih file atau seret file report ke sini
                      </p>
                      <p className="text-slate-500 text-xs mt-1 font-medium">
                        Mendukung format <strong className="text-slate-700">.XLSX, .XLS, .CSV, .TXT</strong> dari Midtrans MAP
                      </p>
                    </div>
                    {fileName && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold border border-emerald-200 mt-2">
                        <FileSpreadsheet size={15} />
                        <span>{fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Text Paste */}
              {inputMode === 'text' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Tempel Data CSV / Baris Order ID dari Midtrans
                  </label>
                  <textarea
                    rows={6}
                    value={rawTextInput}
                    onChange={(e) => setRawTextInput(e.target.value)}
                    placeholder="order_id,gross_amount,transaction_status&#10;CART-13134-1788267652826,400000,settlement&#10;CART-13326-1788256208221,200000,settlement"
                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseTextManual}
                      disabled={isParsing || !rawTextInput.trim()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      <FileCode size={15} />
                      <span>Uraikan Teks</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold animate-shake">
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Preview Rows & Submit Action */}
              {parsedRows.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-xl text-xs font-extrabold border border-indigo-200">
                        {parsedRows.length} Transaksi Terbaca
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Siap diproses dan dicocokkan dengan database sekolah.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmitReconciliation}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Memproses Rekonsiliasi...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} className="text-indigo-200" />
                          <span>Mulai Rekonsiliasi Massal</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">#</th>
                          <th className="px-3.5 py-2.5">Order ID</th>
                          <th className="px-3.5 py-2.5">Status</th>
                          <th className="px-3.5 py-2.5">Nominal (Rp)</th>
                          <th className="px-3.5 py-2.5">Keterangan / NIS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {parsedRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3.5 py-2 font-mono font-bold text-indigo-900">{row.orderId}</td>
                            <td className="px-3.5 py-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                                {row.status || "settlement"}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 font-black text-slate-900">
                              {row.gross_amount ? `Rp ${Number(row.gross_amount).toLocaleString("id-ID")}` : "-"}
                            </td>
                            <td className="px-3.5 py-2 text-slate-500">
                              {row.customerName || row.studentNis || row.description || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 10 && (
                    <p className="text-center text-xs text-slate-400 font-medium">
                      Menampilkan 10 dari {parsedRows.length} baris preview.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Results Dashboard */
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">Berhasil Dilunasi</span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {summary.reconciledCount} <span className="text-xs font-bold text-emerald-700">Order</span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-800 mt-1">
                    Rp {summary.totalAmountReconciled.toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">Sudah Lunas Sejak Awal</span>
                    <CheckCircle2 size={16} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-950">
                    {summary.alreadyPaidCount} <span className="text-xs font-bold text-blue-700">Order</span>
                  </div>
                  <div className="text-[11px] font-semibold text-blue-700 mt-1">
                    Data sinkron di database
                  </div>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">Belum Terhubung</span>
                    <HelpCircle size={16} className="text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-950">
                    {summary.notFoundCount} <span className="text-xs font-bold text-amber-700">Order</span>
                  </div>
                  <div className="text-[11px] font-semibold text-amber-700 mt-1">
                    Hanya ada di Midtrans Report
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-slate-700 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">Pending / Gagal</span>
                    <Clock size={16} className="text-slate-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {summary.pendingCount + summary.failedCount} <span className="text-xs font-bold text-slate-600">Order</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    Belum/Batal dibayar
                  </div>
                </div>
              </div>

              {/* Unmatched Helper Banner if any order is not_found */}
              {summary.notFoundCount > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-300/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">
                        Terdapat {summary.notFoundCount} Transaksi dengan Status "Ref Tidak Cocok"
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                        Uang sudah valid masuk ke rekening Midtrans. Anda dapat memasangkannya langsung ke tagihan SPP, Tabungan siswa, atau Kas Umum BKU.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoReconcileAllUnmatched}
                    disabled={isAutoReconcilingAll}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAutoReconcilingAll ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>⚡ Rekonsiliasi Otomatis Semua Unmatched</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {autoReconcileMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600" />
                  <span>{autoReconcileMessage}</span>
                </div>
              )}

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({results.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('reconciled')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      statusFilter === 'reconciled'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Berhasil Direkonsiliasi ({summary.reconciledCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('already_paid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      statusFilter === 'already_paid'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    Sudah Lunas ({summary.alreadyPaidCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('not_found')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      statusFilter === 'not_found'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Belum Terhubung ({summary.notFoundCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Siswa / Order ID..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Results Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3">Order ID / Ref</th>
                      <th className="px-3.5 py-3">Nama Siswa / NIS</th>
                      <th className="px-3.5 py-3">Kategori Tagihan</th>
                      <th className="px-3.5 py-3">Nominal</th>
                      <th className="px-3.5 py-3">Metode &amp; Status</th>
                      <th className="px-3.5 py-3">Hasil Rekonsiliasi &amp; Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Tidak ada data transaksi yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
                            <span className="font-bold text-indigo-900 block">{item.orderId}</span>
                            {item.transactionId && (
                              <span className="text-[10px] text-slate-500 block">TxID: {item.transactionId}</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 block">{item.studentName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              NIS: {item.studentNis} {item.studentClass ? `(${item.studentClass})` : ''}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-800">
                            {item.category}
                          </td>
                          <td className="px-3.5 py-2.5 font-black text-slate-900 whitespace-nowrap">
                            Rp {item.amount.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200">
                              {item.reportStatus}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">
                              {item.reportPaymentType}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            {item.reconciliationStatus === 'reconciled' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-black border border-emerald-300">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span>BERHASIL DILUNASI</span>
                              </span>
                            )}
                            {item.reconciliationStatus === 'already_paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-xl text-[11px] font-black border border-blue-300">
                                <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                                <span>SUDAH LUNAS SEBELUMNYA</span>
                              </span>
                            )}
                            {item.reconciliationStatus === 'not_found' && (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black border border-amber-300">
                                  <AlertCircle size={12} className="text-amber-600 shrink-0" />
                                  <span>REF BELUM TERHUBUNG</span>
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAutoAllocate(item)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  >
                                    <Sparkles size={11} />
                                    <span>Auto-Alokasikan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPairingModal(item)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-300"
                                  >
                                    <Link2 size={11} />
                                    <span>Pasangkan Manual</span>
                                  </button>
                                </div>
                              </div>
                            )}
                            {item.reconciliationStatus === 'report_pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-extrabold">
                                <Clock size={13} className="text-slate-500 shrink-0" />
                                <span>REPORT PENDING</span>
                              </span>
                            )}
                            {item.reconciliationStatus === 'report_failed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-xl text-[11px] font-extrabold">
                                <AlertCircle size={13} className="text-rose-600 shrink-0" />
                                <span>REPORT GAGAL</span>
                              </span>
                            )}
                            <p className="text-[10px] text-slate-500 mt-1 leading-snug font-medium">
                              {item.message}
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-extrabold cursor-pointer transition-all"
                >
                  Upload File Lain
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsvResult}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    <span>Download Hasil CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs"
                  >
                    Selesai &amp; Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUB-MODAL: QUICK MANUAL PAIRING / ALLOCATION DRAWER */}
        {/* ---------------------------------------------------- */}
        {pairingItem && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
              
              {/* Drawer Header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                    <Link2 size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">Pasangkan Transaksi Midtrans</h4>
                    <p className="text-[11px] text-slate-300">Alokasikan nominal pembayaran ke tagihan atau tabungan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPairingItem(null)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                
                {/* Selected Order Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Order ID:</span>
                    <span className="font-mono font-bold text-indigo-900">{pairingItem.orderId}</span>
                  </div>
                  {pairingItem.transactionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500">TxID:</span>
                      <span className="font-mono text-slate-700">{pairingItem.transactionId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500">Nominal Lunas:</span>
                    <span className="font-black text-sm text-emerald-700">
                      Rp {pairingItem.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {pairingSuccessMsg ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                    <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                    <p className="font-black text-emerald-900">{pairingSuccessMsg}</p>
                  </div>
                ) : (
                  <>
                    {/* Step 1: Select Target Student */}
                    <div className="space-y-2">
                      <label className="font-extrabold text-slate-800 flex items-center justify-between">
                        <span>1. Cari &amp; Pilih Siswa Penerima</span>
                        {selectedStudent && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={12} /> Siswa Terpilih
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={pairingSearchQuery}
                          onChange={(e) => {
                            setPairingSearchQuery(e.target.value);
                            searchStudents(e.target.value);
                          }}
                          placeholder="Ketik NIS, Nama Siswa, atau Kelas..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Search Results List */}
                      {isSearchingStudents ? (
                        <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <span>Mencari siswa...</span>
                        </div>
                      ) : searchedStudents.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100">
                          {searchedStudents.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudent(s);
                                setPairingSearchQuery(`${s.name} (${s.nis})`);
                              }}
                              className={`w-full p-2.5 text-left flex items-center justify-between hover:bg-indigo-50 transition-colors cursor-pointer ${
                                selectedStudent?.id === s.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : ''
                              }`}
                            >
                              <div>
                                <span className="font-extrabold text-slate-900 block">{s.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  NIS: {s.nis} | Kelas: {s.class || "-"}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-amber-700 block">
                                  {s.unpaidSppCount} SPP Belum Lunas
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">
                                  Saldo Tab: Rp {s.savingsBalance.toLocaleString("id-ID")}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Step 2: Choose Allocation Type */}
                    <div className="space-y-2 pt-1">
                      <label className="font-extrabold text-slate-800 block">
                        2. Pilih Metode Alokasi Pembayaran
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {/* Option 1: Auto Allocate to SPP */}
                        <label
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            pairingAllocationType === 'auto_spp'
                              ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="allocType"
                            checked={pairingAllocationType === 'auto_spp'}
                            onChange={() => setPairingAllocationType('auto_spp')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              <Sparkles size={14} className="text-indigo-600" />
                              <span>Otomatis Lunasi SPP Tertunggak Siswa (Rekomendasi)</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Sistem otomatis melunasi bulan SPP tertua. Jika ada sisa lebih, otomatis masuk saldo Tabungan siswa.
                            </p>
                          </div>
                        </label>

                        {/* Option 2: Direct to Savings Balance */}
                        <label
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            pairingAllocationType === 'savings'
                              ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="allocType"
                            checked={pairingAllocationType === 'savings'}
                            onChange={() => setPairingAllocationType('savings')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              <Wallet size={14} className="text-emerald-600" />
                              <span>Setorkan Penuh ke Saldo Tabungan Siswa</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Seluruh nominal Rp {pairingItem.amount.toLocaleString("id-ID")} akan masuk sebagai saldo tabungan siswa.
                            </p>
                          </div>
                        </label>

                        {/* Option 3: Record to Treasurer BKU */}
                        <label
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            pairingAllocationType === 'treasurer_kas'
                              ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="allocType"
                            checked={pairingAllocationType === 'treasurer_kas'}
                            onChange={() => setPairingAllocationType('treasurer_kas')}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              <Landmark size={14} className="text-blue-600" />
                              <span>Catat sebagai Kas Masuk Umum Bendahara (BKU)</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Dicatat langsung sebagai penerimaan kas umum sekolah tanpa memotong tagihan spesifik siswa.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer Actions */}
              {!pairingSuccessMsg && (
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPairingItem(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitPairing}
                    disabled={isPairingSubmitting || (pairingAllocationType !== 'treasurer_kas' && !selectedStudent)}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isPairingSubmitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Menyimpan Alokasi...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>Konfirmasi &amp; Lunasi Transaksi</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
