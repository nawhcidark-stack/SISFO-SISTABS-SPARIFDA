import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Sparkles,
  Link2,
  Wallet,
  Landmark,
  UserCheck,
  ChevronRight,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText
} from "lucide-react";

export interface SingleMidtransReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  onSuccessReconciliation?: () => void;
}

export const SingleMidtransReconcileModal: React.FC<SingleMidtransReconcileModalProps> = ({
  isOpen,
  onClose,
  initialOrderId = "",
  onSuccessReconciliation
}) => {
  const [queryInput, setQueryInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Result state from /api/midtrans/single-check-and-reconcile
  const [checkResult, setCheckResult] = useState<any | null>(null);

  // Manual pairing state for unmatched or custom transactions
  const [isManualPairingOpen, setIsManualPairingOpen] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [pairingAllocationType, setPairingAllocationType] = useState<
    "auto_spp" | "savings" | "specific_bill" | "treasurer_kas"
  >("auto_spp");
  const [selectedSpecificBill, setSelectedSpecificBill] = useState<{
    id: string;
    type: "spp" | "misc";
    label: string;
    amount: number;
  } | null>(null);
  const [pairingNotes, setPairingNotes] = useState<string>("");
  const [isPairingSubmitting, setIsPairingSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (initialOrderId) {
        setQueryInput(initialOrderId.trim());
        handleCheckStatus(initialOrderId.trim(), false);
      }
    } else {
      // Reset state on close
      setQueryInput("");
      setCheckResult(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsManualPairingOpen(false);
      setSelectedStudent(null);
      setSelectedSpecificBill(null);
    }
  }, [isOpen, initialOrderId]);

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Perform status inspection or auto-reconciliation
  const handleCheckStatus = async (overrideQuery?: string, autoReconcileMode = false) => {
    const q = (overrideQuery || queryInput).trim();
    if (!q) {
      setErrorMsg("Masukkan Order ID, ID Transaksi Midtrans (UUID), atau NIS Siswa.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsManualPairingOpen(false);
    setSelectedStudent(null);

    try {
      const res = await fetch("/api/midtrans/single-check-and-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          autoReconcile: autoReconcileMode
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Gagal memeriksa status transaksi di Midtrans.");
        setCheckResult(null);
      } else {
        setCheckResult(data);
        if (data.actionTaken) {
          setSuccessMsg(data.message || "Transaksi berhasil direkonsiliasi dan berstatus LUNAS!");
          if (onSuccessReconciliation) {
            onSuccessReconciliation();
          }
        } else if (data.needsPairing) {
          setIsManualPairingOpen(true);
        }
      }
    } catch (err: any) {
      console.error("Check status error:", err);
      setErrorMsg("Terjadi kesalahan koneksi saat menghubungi server atau Gateway Midtrans.");
    } finally {
      setIsLoading(false);
    }
  };

  // Execute direct settlement reconciliation for matched transaction
  const handleExecuteReconcile = async () => {
    if (!queryInput.trim()) return;
    setIsReconciling(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/midtrans/single-check-and-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryInput.trim(),
          autoReconcile: true
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Gagal merekonsiliasi transaksi.");
      } else {
        setCheckResult(data);
        if (data.actionTaken) {
          setSuccessMsg(data.message || "Transaksi berhasil direkonsiliasi secara penuh!");
          if (onSuccessReconciliation) {
            onSuccessReconciliation();
          }
        } else if (data.needsPairing) {
          setIsManualPairingOpen(true);
          setErrorMsg(data.message || "Silakan tentukan alokasi pembayaran untuk menyelesaikan rekonsiliasi.");
        }
      }
    } catch (err: any) {
      console.error("Reconcile error:", err);
      setErrorMsg("Terjadi kesalahan jaringan saat merekonsiliasi transaksi.");
    } finally {
      setIsReconciling(false);
    }
  };

  // Execute forced internal reconciliation (when Midtrans Gateway 404/offline, but local pending bill exists)
  const handleForceLocalReconcile = async () => {
    if (!queryInput.trim()) return;
    setIsReconciling(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/midtrans/single-check-and-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryInput.trim(),
          forceReconcileLocal: true
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Gagal memproses rekonsiliasi lokal.");
      } else {
        setCheckResult((prev: any) => ({ ...prev, ...data, isAlreadyPaidInLocal: true }));
        setSuccessMsg(data.message || "Transaksi berhasil dipaksa lunas secara internal!");
        if (onSuccessReconciliation) {
          onSuccessReconciliation();
        }
      }
    } catch (err: any) {
      console.error("Force local reconcile error:", err);
      setErrorMsg("Terjadi kesalahan saat memproses rekonsiliasi lokal.");
    } finally {
      setIsReconciling(false);
    }
  };

  // Live student search for manual pairing
  useEffect(() => {
    if (!studentSearchQuery.trim()) {
      setStudentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudent(true);
      try {
        const res = await fetch(`/api/search-student-for-reconcile?q=${encodeURIComponent(studentSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setStudentSearchResults(data.students || []);
        }
      } catch (e) {
        console.error("Search student error:", e);
      } finally {
        setIsSearchingStudent(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

  // Submit manual pairing
  const handleConfirmManualPairing = async () => {
    if (!selectedStudent && pairingAllocationType !== "treasurer_kas") {
      setErrorMsg("Pilih siswa terlebih dahulu untuk mengalokasikan pembayaran.");
      return;
    }
    if (pairingAllocationType === "specific_bill" && !selectedSpecificBill) {
      setErrorMsg("Pilih tagihan spesifik yang ingin dilunasi.");
      return;
    }

    setIsPairingSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const mt = checkResult?.midtransData;
    const grossAmt = mt?.grossAmount || 0;
    const orderIdToPair = mt?.orderId || queryInput.trim();
    const txIdToPair = mt?.transactionId;

    try {
      const payload = {
        query: orderIdToPair,
        allocationOverride: {
          orderId: orderIdToPair,
          transactionId: txIdToPair,
          amount: grossAmt,
          studentId: selectedStudent?.id,
          studentNis: selectedStudent?.nis,
          allocationType: pairingAllocationType,
          specificBillId: selectedSpecificBill?.id,
          specificBillType: selectedSpecificBill?.type,
          paymentType: mt?.paymentType ? `Midtrans (${mt.paymentType})` : "Midtrans Online (Manual Reconciled)",
          settlementTime: mt?.settlementTime || new Date().toISOString(),
          notes: pairingNotes || `Rekonsiliasi Manual Satuan (${orderIdToPair})`
        }
      };

      const res = await fetch("/api/midtrans/single-check-and-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Gagal menyimpan rekonsiliasi manual.");
      } else {
        setSuccessMsg(data.message || "Rekonsiliasi manual berhasil diselesaikan!");
        setIsManualPairingOpen(false);
        // Refresh status
        handleCheckStatus(orderIdToPair, false);
        if (onSuccessReconciliation) {
          onSuccessReconciliation();
        }
      }
    } catch (err: any) {
      console.error("Manual pairing submit error:", err);
      setErrorMsg("Gagal menghubungi server saat menyimpan rekonsiliasi.");
    } finally {
      setIsPairingSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const mt = checkResult?.midtransData;
  const isSettled = mt?.isSettled;
  const isPending = mt?.isPending;
  const isExpired = mt?.isExpired;
  const foundInMidtrans = checkResult?.foundInMidtrans;
  const isAlreadyPaid = checkResult?.isAlreadyPaidInLocal;
  const matchedStudent = checkResult?.matchedStudent;
  const localItem = checkResult?.localMatchedItem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
              <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                  Rekonsiliasi Transaksi Midtrans Satuan
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Single Gateway
                </span>
              </div>
              <p className="text-slate-400 text-[11px] m-0 mt-0.5">
                Verifikasi real-time via Midtrans API & pelunasan otomatis database internal sekolah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs text-slate-700">
          {/* Search Input Box */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Masukkan No. Order ID atau Transaction ID Midtrans (UUID):</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setQueryInput(text.trim());
                  } catch (e) {}
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                <span>Paste dari Clipboard</span>
              </button>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. SPP-13011-202607-1234 atau 8f7b7cb2-641e-453f-b3b3-8fa90f135b3e"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCheckStatus(queryInput, false);
                    }
                  }}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 pr-9"
                />
                {queryInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueryInput("");
                      setCheckResult(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCheckStatus(queryInput, false)}
                  disabled={isLoading || !queryInput.trim()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                  title="Periksa rincian status di Midtrans dan database tanpa mengubah data"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Search className="w-4 h-4 text-indigo-300" />
                  )}
                  <span>Cek Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCheckStatus(queryInput, true)}
                  disabled={isLoading || isReconciling || !queryInput.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-100 shrink-0"
                  title="Periksa dan langsung lunaskan jika transaksi berstatus settlement di Midtrans"
                >
                  {isReconciling ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Zap className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Sinkronkan Lunas</span>
                </button>
              </div>
            </div>

            {/* Quick helper badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
              <span>Tips Pencarian:</span>
              <button
                type="button"
                onClick={() => setQueryInput("SPP-")}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                SPP-...
              </button>
              <button
                type="button"
                onClick={() => setQueryInput("CART-")}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                CART-...
              </button>
              <button
                type="button"
                onClick={() => setQueryInput("MISC-")}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                MISC-...
              </button>
              <button
                type="button"
                onClick={() => setQueryInput("SAV-")}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                SAV-...
              </button>
              <span className="text-slate-400">Atau tempel UUID 36-digit dari Dashboard Midtrans MAP.</span>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5 animate-fade-in shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Pemberitahuan:</span>
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5 animate-fade-in shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Sukses Rekonsiliasi:</span>
                <span className="leading-relaxed font-medium">{successMsg}</span>
              </div>
            </div>
          )}

          {/* Inspection Details Card */}
          {checkResult && (
            <div className="flex flex-col gap-3 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl animate-fade-in">
              {/* Status Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                    Status Gateway Midtrans:
                  </span>
                  {foundInMidtrans ? (
                    isSettled ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        SETTLEMENT (LUNAS)
                      </span>
                    ) : isPending ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        PENDING (MENUNGGU BAYAR)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {mt?.transactionStatus?.toUpperCase() || "BATAL / EXPIRED"}
                      </span>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-slate-500" />
                      TIDAK TERCATAT DI GATEWAY MIDTRANS
                    </span>
                  )}
                </div>

                {/* Status Sistem Sekolah */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500">Status Sekolah:</span>
                  {isAlreadyPaid ? (
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      SUDAH LUNAS ✅
                    </span>
                  ) : (
                    <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      BELUM LUNAS ⏳
                    </span>
                  )}
                </div>
              </div>

              {/* Transaction Key Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                {/* Left Column: Midtrans Info */}
                <div className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Order ID Midtrans</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(mt?.orderId || queryInput, "orderId")}
                      className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-[10px]"
                    >
                      {copiedField === "orderId" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span className="font-mono">{copiedField === "orderId" ? "Tersalin" : "Salin"}</span>
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-800 break-all select-all">
                    {mt?.orderId || queryInput}
                  </span>

                  {mt?.transactionId && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Transaction ID (UUID)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(mt.transactionId, "txId")}
                          className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-[10px]"
                        >
                          {copiedField === "txId" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span className="font-mono">{copiedField === "txId" ? "Tersalin" : "Salin"}</span>
                        </button>
                      </div>
                      <span className="font-mono text-[10px] text-slate-600 break-all select-all">
                        {mt.transactionId}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <span className="block text-slate-500 text-[10px]">Nominal Midtrans</span>
                      <span className="font-black text-indigo-700 text-sm">
                        {mt?.grossAmount ? `Rp ${mt.grossAmount.toLocaleString("id-ID")}` : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px]">Metode Pembayaran</span>
                      <span className="font-bold text-slate-800 uppercase">
                        {mt?.paymentType || "-"}
                      </span>
                    </div>
                  </div>

                  {mt?.settlementTime && (
                    <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <span>Waktu Settlement: </span>
                      <strong className="text-slate-700">{new Date(mt.settlementTime).toLocaleString("id-ID")}</strong>
                    </div>
                  )}
                </div>

                {/* Right Column: Matched Student & School Record */}
                <div className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px] pb-1.5 border-b border-slate-100">
                    Kaitan Data Siswa & Tagihan
                  </span>

                  {matchedStudent ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0">
                          {matchedStudent.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-black text-slate-800 block text-xs">
                            {matchedStudent.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            NIS: <strong className="font-mono text-slate-700">{matchedStudent.nis}</strong> | Kelas:{" "}
                            <strong className="text-slate-700">{matchedStudent.class || "-"}</strong>
                          </span>
                        </div>
                      </div>

                      {localItem && (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 block">{localItem.title}</span>
                            <span className="text-slate-500 text-[10px]">
                              Nominal: Rp {localItem.amount?.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                              localItem.status === "paid" || localItem.status === "success"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {localItem.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                      <AlertCircle className="w-6 h-6 mb-1 text-slate-300" />
                      <span className="font-medium text-[11px]">Belum terhubung ke data siswa tertentu</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Format Order ID tidak memuat NIS siswa atau merupakan transaksi eksternal
                      </span>
                    </div>
                  )}

                  {/* Customer details from Midtrans if available */}
                  {mt?.customerDetails && (mt.customerDetails.first_name || mt.customerDetails.phone || mt.customerDetails.email) && (
                    <div className="mt-auto pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex flex-col gap-0.5">
                      <span className="font-bold text-slate-600">Info Pembayar (Midtrans):</span>
                      <span>
                        {mt.customerDetails.first_name} {mt.customerDetails.last_name || ""}
                        {mt.customerDetails.phone ? ` • ${mt.customerDetails.phone}` : ""}
                        {mt.customerDetails.email ? ` • ${mt.customerDetails.email}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Area */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
                <div className="text-[11px] text-slate-500">
                  {isSettled ? (
                    isAlreadyPaid ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Transaksi sudah tercatat Lunas di database sekolah.
                      </span>
                    ) : (
                      <span className="text-indigo-700 font-semibold flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        Dana settlement siap diselaraskan ke database sekolah.
                      </span>
                    )
                  ) : foundInMidtrans ? (
                    <span className="text-amber-700 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Transaksi belum settlement di Midtrans (status: {mt?.transactionStatus}).
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Jika transaksi ini valid, gunakan tombol rekonsiliasi paksa atau pasangkan manual.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* If settled in Midtrans and not yet paid locally */}
                  {isSettled && !isAlreadyPaid && (
                    <button
                      type="button"
                      onClick={handleExecuteReconcile}
                      disabled={isReconciling}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-100"
                    >
                      {isReconciling ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                      )}
                      <span>Eksekusi Rekonsiliasi Otomatis</span>
                    </button>
                  )}

                  {/* If not found in Gateway but local pending exists */}
                  {!foundInMidtrans && localItem && localItem.status !== "paid" && (
                    <button
                      type="button"
                      onClick={handleForceLocalReconcile}
                      disabled={isReconciling}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Zap className="w-4 h-4 text-amber-200" />
                      <span>Paksa Rekonsiliasi Lokal</span>
                    </button>
                  )}

                  {/* Manual Pairing Button */}
                  <button
                    type="button"
                    onClick={() => setIsManualPairingOpen(!isManualPairingOpen)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isManualPairingOpen ? "Tutup Pemasangan" : "Pasangkan Manual"}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Manual Pairing Panel */}
              {isManualPairingOpen && (
                <div className="mt-3 p-4 bg-white rounded-xl border border-indigo-200 shadow-sm flex flex-col gap-3.5 animate-fade-in text-xs">
                  <div className="flex items-start gap-2.5 pb-2.5 border-b border-indigo-100">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs">
                        Pemasangan Manual &amp; Penentuan Alokasi Dana
                      </h5>
                      <p className="text-slate-500 text-[11px] m-0 mt-0.5">
                        Tentukan siswa penerima atau alokasikan langsung ke Kas Umum (BKU) jika transaksi ini tidak dapat dikenali secara otomatis.
                      </p>
                    </div>
                  </div>

                  {/* Step 1: Search & Select Student */}
                  {pairingAllocationType !== "treasurer_kas" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-bold text-slate-700 text-[11px]">
                        1. Cari &amp; Pilih Siswa (Nama / NIS):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ketik nama siswa atau NIS..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {isSearchingStudent && (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-2.5" />
                        )}

                        {/* Search dropdown results */}
                        {studentSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto flex flex-col">
                            {studentSearchResults.map((std) => (
                              <button
                                key={std.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(std);
                                  setStudentSearchQuery("");
                                  setStudentSearchResults([]);
                                }}
                                className="px-3.5 py-2 text-left hover:bg-indigo-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between text-xs cursor-pointer"
                              >
                                <div>
                                  <span className="font-bold text-slate-800 block">{std.name}</span>
                                  <span className="text-[10px] text-slate-500">
                                    NIS: {std.nis} | Kelas: {std.class || "-"} | Belum Bayar: {std.unpaidSppCount} SPP
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Display Selected Student */}
                      {selectedStudent && (
                        <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            <div>
                              <span className="font-extrabold text-slate-800 text-xs block">
                                {selectedStudent.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                NIS: {selectedStudent.nis} | Kelas: {selectedStudent.class || "-"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(null);
                              setSelectedSpecificBill(null);
                            }}
                            className="text-[10px] text-rose-600 font-bold hover:underline"
                          >
                            Ganti Siswa
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Choose Allocation Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-bold text-slate-700 text-[11px]">
                      2. Tentukan Alokasi Dana Pembayaran:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          pairingAllocationType === "auto_spp"
                            ? "bg-indigo-50/80 border-indigo-400 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="allocation"
                          checked={pairingAllocationType === "auto_spp"}
                          onChange={() => setPairingAllocationType("auto_spp")}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-extrabold block text-xs">🎓 Lunasi SPP Tertua</span>
                          <span className="text-[10px] text-slate-500">
                            Secara otomatis melunasi tagihan SPP siswa yang belum terbayar.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          pairingAllocationType === "savings"
                            ? "bg-indigo-50/80 border-indigo-400 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="allocation"
                          checked={pairingAllocationType === "savings"}
                          onChange={() => setPairingAllocationType("savings")}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-extrabold block text-xs">💰 Saldo Tabungan Siswa</span>
                          <span className="text-[10px] text-slate-500">
                            Masukkan nominal ini ke saldo rekening tabungan siswa.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          pairingAllocationType === "specific_bill"
                            ? "bg-indigo-50/80 border-indigo-400 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="allocation"
                          checked={pairingAllocationType === "specific_bill"}
                          onChange={() => setPairingAllocationType("specific_bill")}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-extrabold block text-xs">📄 Pilih Tagihan Tertentu</span>
                          <span className="text-[10px] text-slate-500">
                            Pilih tagihan SPP bulan tertentu atau tagihan Non-SPP siswa ini.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          pairingAllocationType === "treasurer_kas"
                            ? "bg-indigo-50/80 border-indigo-400 text-indigo-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="allocation"
                          checked={pairingAllocationType === "treasurer_kas"}
                          onChange={() => setPairingAllocationType("treasurer_kas")}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-extrabold block text-xs">🏛️ Kas Umum (BKU) Bendahara</span>
                          <span className="text-[10px] text-slate-500">
                            Catat sebagai kas masuk lembaga umum tanpa menargetkan siswa.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Step 2b: Dropdown for Specific Bill if selected */}
                  {pairingAllocationType === "specific_bill" && selectedStudent && (
                    <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Pilih Tagihan Spesifik Siswa:
                      </label>
                      <select
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                        value={selectedSpecificBill ? `${selectedSpecificBill.type}:${selectedSpecificBill.id}` : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setSelectedSpecificBill(null);
                            return;
                          }
                          const [type, id] = val.split(":");
                          if (type === "spp") {
                            const b = selectedStudent.unpaidSppBills?.find((x: any) => x.id === id);
                            if (b) {
                              setSelectedSpecificBill({
                                id: b.id,
                                type: "spp",
                                label: `SPP ${b.month} ${b.year}`,
                                amount: b.amount
                              });
                            }
                          } else {
                            const m = selectedStudent.unpaidMiscBills?.find((x: any) => x.id === id);
                            if (m) {
                              setSelectedSpecificBill({
                                id: m.id,
                                type: "misc",
                                label: m.title,
                                amount: m.amount
                              });
                            }
                          }
                        }}
                      >
                        <option value="">-- Pilih Tagihan Belum Lunas --</option>
                        {selectedStudent.unpaidSppBills && selectedStudent.unpaidSppBills.length > 0 && (
                          <optgroup label="Tagihan SPP">
                            {selectedStudent.unpaidSppBills.map((b: any) => (
                              <option key={b.id} value={`spp:${b.id}`}>
                                SPP {b.month} {b.year} - Rp {b.amount?.toLocaleString("id-ID")}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {selectedStudent.unpaidMiscBills && selectedStudent.unpaidMiscBills.length > 0 && (
                          <optgroup label="Tagihan Non-SPP (Lainnya)">
                            {selectedStudent.unpaidMiscBills.map((m: any) => (
                              <option key={m.id} value={`misc:${m.id}`}>
                                {m.title} - Rp {m.amount?.toLocaleString("id-ID")}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-slate-700 text-[10px] uppercase">Catatan Rekonsiliasi (Opsional):</label>
                    <input
                      type="text"
                      placeholder="e.g. Pembayaran wali murid a.n Ibu Siti via QRIS"
                      value={pairingNotes}
                      onChange={(e) => setPairingNotes(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsManualPairingOpen(false)}
                      className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmManualPairing}
                      disabled={isPairingSubmitting}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-100"
                    >
                      {isPairingSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Check className="w-4 h-4 text-white" />
                      )}
                      <span>Konfirmasi &amp; Rekonsiliasi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-slate-500 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Gateway Engine Aktif</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default SingleMidtransReconcileModal;
