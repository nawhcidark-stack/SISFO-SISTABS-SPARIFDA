import React, { useState, useRef } from "react";
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
  Filter
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
            grossAmount: amountIdx !== -1 && row[amountIdx] ? Number(String(row[amountIdx]).replace(/[^0-9.]/g, '')) || 0 : 0,
            paymentType: paymentIdx !== -1 && row[paymentIdx] ? String(row[paymentIdx]).trim() : "Midtrans Gateway",
            transactionTime: timeIdx !== -1 && row[timeIdx] ? String(row[timeIdx]).trim() : "",
            customerEmail: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : "",
            customerName: nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "",
            studentNis: nisIdx !== -1 && row[nisIdx] ? String(row[nisIdx]).trim() : "",
            description: descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : "",
            month: monthIdx !== -1 && row[monthIdx] ? String(row[monthIdx]).trim() : "",
            year: yearIdx !== -1 && row[yearIdx] ? String(row[yearIdx]).trim() : ""
          });
        }
      }
      return items;
    }

    // If array of objects (sheet_to_json with headers)
    return dataArray.map(obj => {
      const keys = Object.keys(obj);
      const findValue = (keywords: string[]) => {
        const matchedKey = keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
        return matchedKey ? obj[matchedKey] : undefined;
      };

      const orderIdVal = findValue(["order_id", "order id", "orderid", "no. order", "ref", "no order"]) || obj[keys[0]];
      const txIdVal = findValue(["transaction_id", "transaction id", "trans_id", "id transaksi", "tx_id", "tx id"]);
      const statusVal = findValue(["status", "transaction_status", "state"]) || "settlement";
      const amountVal = findValue(["gross_amount", "amount", "gross", "total", "nominal", "jumlah"]) || 0;
      const paymentVal = findValue(["payment_type", "payment", "channel", "metode"]) || "Midtrans Gateway";
      const timeVal = findValue(["settlement_time", "transaction_time", "time", "date", "tanggal", "waktu"]) || "";
      const emailVal = findValue(["email", "e-mail", "mail", "customer_email", "customer email"]);
      const nameVal = findValue(["customer_name", "customer name", "nama", "siswa", "pembayar", "name"]);
      const nisVal = findValue(["nis", "nisn", "no_induk", "no induk"]);
      const descVal = findValue(["description", "keterangan", "deskripsi", "item", "item_name", "items", "notes", "rincian", "detail"]);
      const monthVal = findValue(["bulan", "month", "periode"]);
      const yearVal = findValue(["tahun", "year"]);

      const cleanOrderId = String(orderIdVal || '').trim();
      const cleanTxId = txIdVal ? String(txIdVal).trim() : undefined;
      return {
        orderId: cleanOrderId || cleanTxId || '',
        transactionId: cleanTxId,
        status: String(statusVal || 'settlement').trim(),
        grossAmount: typeof amountVal === 'number' ? amountVal : Number(String(amountVal).replace(/[^0-9.]/g, '')) || 0,
        paymentType: String(paymentVal || 'Midtrans Gateway').trim(),
        transactionTime: String(timeVal || '').trim(),
        customerEmail: emailVal ? String(emailVal).trim() : "",
        customerName: nameVal ? String(nameVal).trim() : "",
        studentNis: nisVal ? String(nisVal).trim() : "",
        description: descVal ? String(descVal).trim() : "",
        month: monthVal ? String(monthVal).trim() : "",
        year: yearVal ? String(yearVal).trim() : ""
      };
    }).filter(item => (item.orderId && item.orderId.length >= 2 && !item.orderId.toLowerCase().includes("order_id")) || item.transactionId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setIsParsing(true);

    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.tsv')) {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const workbook = XLSX.read(text, { type: 'string' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const items = normalizeRowsFromData(rawData);
          setParsedRows(items);
          if (items.length === 0) {
            setErrorMessage("Tidak ada kolom Order ID yang valid ditemukan dalam file.");
          }
        } catch (err: any) {
          console.error(err);
          setErrorMessage("Gagal membaca file CSV/TXT. Pastikan format file sesuai.");
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const items = normalizeRowsFromData(rawData);
          setParsedRows(items);
          if (items.length === 0) {
            setErrorMessage("Tidak ada data transaksi yang terbaca di file Excel ini.");
          }
        } catch (err: any) {
          console.error(err);
          setErrorMessage("Gagal memproses file Excel (.xlsx / .xls).");
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleTextParse = () => {
    if (!rawTextInput.trim()) {
      setErrorMessage("Masukkan atau tempel teks/CSV terlebih dahulu.");
      return;
    }
    setErrorMessage(null);
    try {
      const workbook = XLSX.read(rawTextInput, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const items = normalizeRowsFromData(rawData);
      setParsedRows(items);
      if (items.length === 0) {
        setErrorMessage("Tidak ada Order ID yang terbaca dari teks yang Anda tempelkan.");
      }
    } catch (e: any) {
      setErrorMessage("Format teks tidak dapat diproses sebagai CSV.");
    }
  };

  const handleSubmitReconciliation = async () => {
    if (parsedRows.length === 0) {
      setErrorMessage("Belum ada data transaksi yang siap direkonsiliasi.");
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  const handlePrintReport = () => {
    window.print();
  };

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
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
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
                  Upload File Report
                </span>
              </h3>
              <p className="text-slate-300 text-xs mt-0.5 font-medium">
                Verifikasi massal status transaksi dari dashboard Midtrans MAP (.csv, .xlsx, .xls)
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
          {/* Step 1: Upload / Input Form (If no summary result yet) */}
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

              {/* Mode 2: Direct Text Input */}
              {inputMode === 'text' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Tempelkan isi CSV atau daftar Order ID beserta statusnya:
                  </label>
                  <textarea
                    rows={6}
                    value={rawTextInput}
                    onChange={(e) => setRawTextInput(e.target.value)}
                    placeholder={`Contoh isi CSV:\norder_id,status,gross_amount,payment_type\nSPP-B-S-12345,settlement,150000,qris\nMISC-M-S-67890,settlement,350000,gopay`}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleTextParse}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-extrabold hover:bg-indigo-700 cursor-pointer transition-all shadow-xs"
                    >
                      Proses Teks CSV
                    </button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Gagal Memproses File / Teks</span>
                    <p className="mt-0.5 text-slate-600 font-medium">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-xl text-xs font-black border border-indigo-200">
                        {parsedRows.length} Transaksi Terbaca
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">
                        Siap untuk diverifikasi dan disinkronkan ke database
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetModal}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      Batal / Reset File
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">No</th>
                          <th className="px-3.5 py-2.5">Order ID / Ref</th>
                          <th className="px-3.5 py-2.5">Status Report</th>
                          <th className="px-3.5 py-2.5">Metode Bayar</th>
                          <th className="px-3.5 py-2.5">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {parsedRows.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="px-3.5 py-2 font-mono text-[11px]">
                              <span className="font-bold text-indigo-900 block">{row.orderId}</span>
                              {row.transactionId && (
                                <span className="text-[10px] text-slate-500 block">TxID: {row.transactionId}</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                (row.status || '').toLowerCase().includes('settlement') || (row.status || '').toLowerCase().includes('capture') || (row.status || '').toLowerCase().includes('lunas')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : (row.status || '').toLowerCase().includes('pending')
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {row.status || 'settlement'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-slate-600">{row.paymentType || 'Midtrans'}</td>
                            <td className="px-3.5 py-2 font-bold text-slate-900">
                              Rp {(row.grossAmount || 0).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 50 && (
                      <div className="p-2 bg-slate-50 text-center text-slate-500 text-[11px] font-bold border-t border-slate-200">
                        Menampilkan 50 dari {parsedRows.length} transaksi...
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitReconciliation}
                      disabled={isSubmitting}
                      className={`px-6 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                        isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Merekonsiliasi Data Massal...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Jalankan Rekonsiliasi Bulk ({parsedRows.length} Order)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Interactive Reconciliation Results Dashboard */
            <div className="space-y-5">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">Baru Direkonsiliasi</span>
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
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">Ref Tidak Cocok</span>
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
                    Tidak Ditemukan ({summary.notFoundCount})
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
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3">Order ID / Ref</th>
                      <th className="px-3.5 py-3">Nama Siswa / NIS</th>
                      <th className="px-3.5 py-3">Kategori Tagihan</th>
                      <th className="px-3.5 py-3">Nominal</th>
                      <th className="px-3.5 py-3">Metode &amp; Status Report</th>
                      <th className="px-3.5 py-3">Hasil Rekonsiliasi Internal</th>
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-xl text-[11px] font-extrabold border border-amber-300">
                                <AlertCircle size={13} className="text-amber-600 shrink-0" />
                                <span>REF TIDAK DITEMUKAN</span>
                              </span>
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
      </div>
    </div>
  );
};
