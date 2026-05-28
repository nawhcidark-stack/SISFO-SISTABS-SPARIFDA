import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Trash2, Edit3, TrendingUp, TrendingDown, RefreshCw, 
  LogOut, DollarSign, Calendar, Tag, FileText, Search, Printer, 
  Download, Building2, CheckCircle2, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, Wallet, UserCheck, Percent, HelpCircle, Eye, Key,
  LayoutGrid, Home
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { SchoolIdentity, TreasurerTransaction } from '../types';

interface TreasurerPanelProps {
  schoolIdentity: SchoolIdentity;
  onLogout: () => void;
}

export default function TreasurerPanel({ schoolIdentity, onLogout }: TreasurerPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kas_ledger' | 'password'>('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [transactions, setTransactions] = useState<TreasurerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal configurations
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TreasurerTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formType, setFormType] = useState<'incoming' | 'outgoing'>('incoming');
  const [formCategory, setFormCategory] = useState(() => {
    const saved = localStorage.getItem('treasurer_categories');
    const parsed = saved ? JSON.parse(saved) : ['Operasional', 'Gaji Guru', 'Pembangunan', 'Ujian', 'Lainnya'];
    return parsed[0] || 'Operasional';
  });
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Filter configurations
  const [term, setTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'spp' | 'savings' | 'custom'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | string>('all');
  
  // Invoice state to print
  const [activePrintTransaction, setActivePrintTransaction] = useState<TreasurerTransaction | null>(null);

  // Password alteration states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 5) {
      setPwdError('Kata sandi baru minimal 5 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Konfirmasi kata sandi baru tidak sesuai.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await fetch('/api/treasurer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword: newPassword.trim() })
      });
      if (res.ok) {
        setPwdSuccess('Kata sandi Bendahara berhasil diubah!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwdSuccess(null);
        }, 1500);
      } else {
        const data = await res.json();
        setPwdError(data.error || 'Gagal mengubah kata sandi.');
      }
    } catch {
      setPwdError('Gangguan jaringan atau server.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  // Custom expandable Budget Categories (POS BUDGET) saved in localStorage
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('treasurer_categories');
    return saved ? JSON.parse(saved) : ['Operasional', 'Gaji Guru', 'Pembangunan', 'Ujian', 'Lainnya'];
  });
  const [showManageBudgetPos, setShowManageBudgetPos] = useState(false);
  const [newBudgetCatInput, setNewBudgetCatInput] = useState('');
  const [budgetCatMessage, setBudgetCatMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showBudgetMsg = (type: 'success' | 'error', text: string) => {
    setBudgetCatMessage({ type, text });
    setTimeout(() => {
      setBudgetCatMessage(null);
    }, 3500);
  };

  const handleAddBudgetCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetCatInput.trim()) return;
    const clean = newBudgetCatInput.trim();
    
    // Check duplication across categories + system ones
    const isReserved = ['spp', 'tabungan'].includes(clean.toLowerCase());
    if (isReserved || categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      showBudgetMsg('error', 'Kategori POS BUDGET tersebut sudah terdaftar.');
      return;
    }
    const updated = [...categories, clean];
    setCategories(updated);
    localStorage.setItem('treasurer_categories', JSON.stringify(updated));
    setNewBudgetCatInput('');
    showBudgetMsg('success', `Sukses mendaftarkan POS BUDGET baru: ${clean}`);
  };

  const handleDeleteBudgetCategory = async (cat: string) => {
    if (categories.length <= 1) {
      showBudgetMsg('error', 'Harus menyisakan minimal satu kategori POS BUDGET.');
      return;
    }
    if (cat.toLowerCase() === 'lainnya') {
      showBudgetMsg('error', 'Kategori POS "Lainnya" tidak boleh dihapus karena merupakan lokasi penampungan dana default.');
      return;
    }

    const confirmMessage = `Apakah Anda yakin ingin menghapus POS BUDGET "${cat}"?\n\nPERINGATAN: Semua riwayat transaksi dan saldo dana di dalam pos ini akan otomatis dipindahkan ke POS "Lainnya". Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMessage)) return;

    const updated = categories.filter(c => c !== cat);
    if (!updated.some(c => c.toLowerCase() === 'lainnya')) {
      updated.push('Lainnya');
    }

    setCategories(updated);
    localStorage.setItem('treasurer_categories', JSON.stringify(updated));

    const affectedTxs = transactions.filter(t => t.category === cat && t.source === 'custom');
    if (affectedTxs.length > 0) {
      showBudgetMsg('success', `Memindahkan ${affectedTxs.length} transaksi terkait ke POS "Lainnya"...`);
      try {
        await Promise.all(affectedTxs.map(async (t) => {
          await fetch(`/api/treasurer/transactions/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...t,
              category: 'Lainnya'
			})
          });
        }));
        await fetchTransactions();
      } catch (err) {
        console.error("Gagal menyinkronkan pemindahan pos: ", err);
      }
    }

    showBudgetMsg('success', `Sukses menghapus POS BUDGET "${cat}" dan memindahkan seluruh saldo dananya ke POS "Lainnya".`);
  };

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryInput, setEditCategoryInput] = useState('');

  const handleEditBudgetCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const clean = editCategoryInput.trim();
    if (!clean) {
      showBudgetMsg('error', 'Nama kategori tidak boleh kosong.');
      return;
    }
    
    const isReserved = ['spp', 'tabungan'].includes(clean.toLowerCase());
    if (isReserved) {
      showBudgetMsg('error', 'Kategori SPP dan Tabungan dilindungi oleh sistem.');
      return;
    }

    if (clean.toLowerCase() !== editingCategory.toLowerCase() && categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      showBudgetMsg('error', 'Kategori POS BUDGET tersebut sudah terdaftar.');
      return;
    }

    const updated = categories.map(c => c === editingCategory ? clean : c);
    setCategories(updated);
    localStorage.setItem('treasurer_categories', JSON.stringify(updated));

    const affectedTxs = transactions.filter(t => t.category === editingCategory && t.source === 'custom');
    if (affectedTxs.length > 0) {
      showBudgetMsg('success', `Memperbarui ${affectedTxs.length} riwayat transaksi terkait pos...`);
      try {
        await Promise.all(affectedTxs.map(async (t) => {
          await fetch(`/api/treasurer/transactions/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...t,
              category: clean
            })
          });
        }));
        await fetchTransactions();
      } catch (err) {
        console.error("Gagal menyinkronkan transaksi terpilih: ", err);
      }
    }

    setEditingCategory(null);
    setEditCategoryInput('');
    showBudgetMsg('success', `Sukses mengubah "${editingCategory}" menjadi "${clean}"`);
  };


  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/treasurer/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      } else {
        setErrorMsg('Gagal memuat pembukuan bendahara.');
      }
    } catch (e) {
      setErrorMsg('Gagal menghubungi server pembukuan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setFormType('incoming');
    setFormCategory(categories[0] || 'Operasional');
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date().toISOString().substring(0, 10));
    setShowFormModal(true);
  };

  const handleOpenEditModal = (tx: TreasurerTransaction) => {
    if (tx.source !== 'custom') return; // Cannot edit dynamic system entries
    setEditingTransaction(tx);
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormAmount(tx.amount.toString());
    setFormDescription(tx.description);
    setFormDate(tx.date);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0 || !formDescription.trim()) {
      alert('Harap isi jumlah dan deskripsi dengan benar.');
      return;
    }

    setIsSubmitting(true);
    const bodyArgs = {
      type: formType,
      category: formCategory,
      amount: Number(formAmount),
      description: formDescription,
      date: formDate
    };

    try {
      let res;
      if (editingTransaction) {
        // Edit manual
        res = await fetch(`/api/treasurer/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyArgs)
        });
      } else {
        // Create manual
        res = await fetch('/api/treasurer/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyArgs)
        });
      }

      if (res.ok) {
        setShowFormModal(false);
        fetchTransactions();
      } else {
        const err = await res.json();
        alert(err.error || 'Aksi gagal dieksekusi.');
      }
    } catch (error) {
      alert('Kegagalan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi pembukuan ini?')) return;
    try {
      const res = await fetch(`/api/treasurer/transactions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTransactions();
      } else {
        alert('Gagal menghapus transaksi.');
      }
    } catch {
      alert('Koneksi terputus.');
    }
  };

  // Derived dashboard metrics (integrated computations)
  const metrics = useMemo(() => {
    let totalSpp = 0;
    let totalSavingsDeposit = 0;
    let totalSavingsWithdrawal = 0;
    let totalCustomIncoming = 0;
    let totalCustomOutgoing = 0;

    transactions.forEach(t => {
      if (t.source === 'spp') {
        totalSpp += t.amount;
      } else if (t.source === 'savings') {
        if (t.type === 'incoming') totalSavingsDeposit += t.amount;
        else totalSavingsWithdrawal += t.amount;
      } else {
        if (t.type === 'incoming') totalCustomIncoming += t.amount;
        else totalCustomOutgoing += t.amount;
      }
    });

    const totalInflow = totalSpp + totalSavingsDeposit + totalCustomIncoming;
    const totalOutflow = totalSavingsWithdrawal + totalCustomOutgoing;
    const netBalance = totalInflow - totalOutflow;

    return {
      totalSpp,
      totalSavingsDeposit,
      totalSavingsWithdrawal,
      netSavings: totalSavingsDeposit - totalSavingsWithdrawal,
      totalCustomIncoming,
      totalCustomOutgoing,
      totalInflow,
      totalOutflow,
      netBalance
    };
  }, [transactions]);

  // Derived budget balance metrics per Category (POS BUDGET)
  const budgetPosBalances = useMemo(() => {
    const balances: Record<string, { incoming: number; outgoing: number; balance: number }> = {};
    
    // Explicit list of all categories including SPP and Tabungan so they are all represented nicely in the overview
    const allUniqueCategories = Array.from(new Set(['SPP', 'Tabungan', ...categories]));
    
    allUniqueCategories.forEach(c => {
      balances[c] = { incoming: 0, outgoing: 0, balance: 0 };
    });

    transactions.forEach(t => {
      const cat = t.category || 'Lainnya';
      if (!balances[cat]) {
        balances[cat] = { incoming: 0, outgoing: 0, balance: 0 };
      }
      if (t.type === 'incoming') {
        balances[cat].incoming += t.amount;
        balances[cat].balance += t.amount;
      } else {
        balances[cat].outgoing += t.amount;
        balances[cat].balance -= t.amount;
      }
    });

    return Object.entries(balances).map(([name, val]) => ({
      name,
      ...val
    }));
  }, [categories, transactions]);

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchTerm = 
        t.description.toLowerCase().includes(term.toLowerCase()) ||
        (t.studentName && t.studentName.toLowerCase().includes(term.toLowerCase())) ||
        (t.nis && t.nis.includes(term)) ||
        t.category.toLowerCase().includes(term.toLowerCase());

      const matchType = filterType === 'all' || t.type === filterType;
      const matchSource = filterSource === 'all' || t.source === filterSource;
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;

      return matchTerm && matchType && matchSource && matchCategory;
    });
  }, [transactions, term, filterType, filterSource, filterCategory]);

  // Chart data formatting: Category distribution
  const chartCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'outgoing') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Chart data formatting: Monthly trend
  const chartTrendData = useMemo(() => {
    const monthlyMap: Record<string, { month: string, incoming: number, outgoing: number }> = {};
    
    // Sort transactions by date ascending first
    const sorted = [...transactions].reverse();
    
    sorted.forEach(t => {
      // Get key as YYYY-MM
      const dateObj = new Date(t.date);
      const year = dateObj.getFullYear() || 2026;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      const monthName = monthNames[dateObj.getMonth()] || "Mei";
      const key = `${year} ${monthName}`;
      
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, incoming: 0, outgoing: 0 };
      }
      
      if (t.type === 'incoming') {
        monthlyMap[key].incoming += t.amount;
      } else {
        monthlyMap[key].outgoing += t.amount;
      }
    });
    
    return Object.values(monthlyMap).slice(-6); // get last 6 active months
  }, [transactions]);

  const COLORS = ['#e11d48', '#d97706', '#2563eb', '#059669', '#7c3aed', '#db2777', '#4b5563'];

  // Print summary document function
  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div id="treasurer-panel-root" className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      
      {/* Printable Area 1: Ledger/Buku Kas - Only active when not printing an individual receipt */}
      <div id={activePrintTransaction ? undefined : "print-report-section"} className="hidden print:block bg-white p-8 text-black text-xs leading-relaxed">
        {/* Letterhead */}
        <div className="flex items-center justify-between border-b-2 border-double border-slate-900 pb-4 mb-6">
          <div className="w-16 h-16 flex items-center justify-center bg-slate-100 rounded border">
            {schoolIdentity.logo ? (
              <img src={schoolIdentity.logo} className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-extrabold text-[10px] text-slate-400">LOGO LP</span>
            )}
          </div>
          <div className="flex-1 text-center px-4">
            <h2 className="text-sm font-extrabold tracking-tight uppercase">{schoolIdentity.subheading}</h2>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">{schoolIdentity.name}</h1>
            <p className="text-[10px] text-slate-500 font-semibold">{schoolIdentity.address} | Telp: {schoolIdentity.phone}</p>
            <span className="text-[9px] px-2 py-0.5 rounded border bg-slate-50 font-bold tracking-wider uppercase mt-1 inline-block">{schoolIdentity.accreditation}</span>
          </div>
          <div className="w-16 h-16 flex items-center justify-center bg-slate-100 rounded border">
            {schoolIdentity.logo2 ? (
              <img src={schoolIdentity.logo2} className="w-full h-full object-contain" alt="Logo 2" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-extrabold text-[10px] text-slate-400">LOGO NU</span>
            )}
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-sm font-bold uppercase decoration-solid underline">LAPORAN BUKU KAS BESAR TERPADU</h2>
          <p className="text-[10px] text-slate-500 mt-1 font-semibold">
            Tanggal Cetak: {new Date().toLocaleDateString('id-ID')} | Filter: {filterSource === 'all' ? 'Semua Sumber' : filterSource.toUpperCase()} ({filterType === 'all' ? 'Semua Arus Kas' : filterType === 'incoming' ? 'Hanya Pemasukan' : 'Hanya Pengeluaran'})
          </p>
        </div>

        {/* Printable summary card */}
        <div className="grid grid-cols-3 gap-2 border p-3 rounded-lg bg-slate-50 mb-6 font-semibold">
          <div>
            <div className="text-slate-500 text-[9px] uppercase">TOTAL PEMASUKAN</div>
            <div className="text-xs font-bold text-emerald-800">Rp {metrics.totalInflow.toLocaleString('id-ID')}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[9px] uppercase">TOTAL PENGELUARAN</div>
            <div className="text-xs font-bold text-rose-800">Rp {metrics.totalOutflow.toLocaleString('id-ID')}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[9px] uppercase">SALDO KAS NETO</div>
            <div className="text-xs font-extrabold text-blue-800">Rp {metrics.netBalance.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Books Table */}
        <table className="w-full border-collapse border border-slate-300 text-[10px] text-left">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <th className="border border-slate-300 p-2">Tgl</th>
              <th className="border border-slate-300 p-2">Deskripsi Transaksi Pokok</th>
              <th className="border border-slate-300 p-2">Sumber / Pos</th>
              <th className="border border-slate-300 p-2 text-right">Debit (+)</th>
              <th className="border border-slate-300 p-2 text-right">Kredit (-)</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-250 hover:bg-slate-50">
                <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">{tx.date}</td>
                <td className="border border-slate-300 p-2">
                  <div className="font-bold">{tx.description}</div>
                  {tx.studentName && (
                    <div className="text-[9px] text-slate-500 font-semibold">Siswa: {tx.studentName} ({tx.nis})</div>
                  )}
                </td>
                <td className="border border-slate-300 p-2 font-bold uppercase">{tx.source === 'spp' ? 'SPP (Sistem)' : tx.source === 'savings' ? 'Tabungan' : `Manual (${tx.category})`}</td>
                <td className="border border-slate-300 p-2 text-right font-mono text-emerald-700 font-bold">
                  {tx.type === 'incoming' ? `Rp ${tx.amount.toLocaleString('id-ID')}` : '-'}
                </td>
                <td className="border border-slate-300 p-2 text-right font-mono text-rose-700 font-bold">
                  {tx.type === 'outgoing' ? `Rp ${tx.amount.toLocaleString('id-ID')}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footers for signature */}
        <div className="mt-12 grid grid-cols-2 text-center text-[10px]">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold mt-2">Kepala Sekolah</p>
            <div className="h-16 flex items-center justify-center">
              {/* Stamp removed per request */}
            </div>
            <p className="font-bold text-slate-900 underline decoration-solid">{schoolIdentity.principal}</p>
            <p className="text-[9px] text-slate-500">NIP. -</p>
          </div>
          <div>
            <p>Pandaan, {new Date().toLocaleDateString('id-ID')}</p>
            <p className="font-bold mt-2">Bendahara Keuangan / Kas</p>
            <div className="h-16 flex items-center justify-center">
              {schoolIdentity.treasurerSignature && (
                <img src={schoolIdentity.treasurerSignature} className="h-14 object-contain" alt="Signature" referrerPolicy="no-referrer" />
              )}
            </div>
            <p className="font-bold text-slate-900 underline decoration-solid">{schoolIdentity.treasurer}</p>
            <p className="text-[9px] text-slate-500 font-medium">SMP Ma\'arif NU Pandaan</p>
          </div>
        </div>
      </div>

      {/* Printable Area 2: Receipt/Kuitansi - Only active when printing an individual receipt */}
      {activePrintTransaction && (
        <div id="print-receipt-section" className="hidden print:block bg-white p-8 text-black text-xs leading-relaxed max-w-xl mx-auto border border-slate-300 rounded-xl my-4">
          {/* Receipt Letterhead */}
          <div className="flex items-center gap-3 border-b-2 border-double border-slate-300 pb-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded border">
              {schoolIdentity.logo ? (
                <img src={schoolIdentity.logo} className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
              ) : (
                <BookOpen size={16} className="text-emerald-700" />
              )}
            </div>
            <div className="flex-1 leading-tight">
              <h3 className="text-xs font-extrabold uppercase">{schoolIdentity.name}</h3>
              <p className="text-[9px] text-slate-500 font-semibold">{schoolIdentity.subheading} &bull; {schoolIdentity.address}</p>
            </div>
            <div className="text-right text-[9px] font-bold text-slate-400">
              KUITANSI BENDAHARA ASLI
            </div>
          </div>

          <div className="text-center py-2 bg-slate-50 border rounded-lg mb-4">
            <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">BUKTI TRANSAKSI KAS</h4>
            <div className="text-xs font-mono text-slate-900 font-bold">
              ID REF: {activePrintTransaction.id.toUpperCase()}
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[10px] text-left mb-6">
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-bold text-slate-500 uppercase bg-slate-50/50 w-1/3 border border-slate-300">Tanggal</td>
                <td className="p-2 font-mono border border-slate-300">{activePrintTransaction.date}</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-bold text-slate-500 uppercase bg-slate-50/50 border border-slate-300">Jenis Transaksi</td>
                <td className="p-2 font-bold border border-slate-300">
                  {activePrintTransaction.type === 'incoming' ? 'MASUK / DEBET' : 'KELUAR / KREDIT'}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-bold text-slate-500 uppercase bg-slate-50/50 border border-slate-300">Kategori / Pos</td>
                <td className="p-2 font-bold text-indigo-750 uppercase border border-slate-300">{activePrintTransaction.category}</td>
              </tr>
              <tr className="border-b">
                <td className="p-2 font-bold text-slate-500 uppercase bg-slate-50/50 border border-slate-300">Keterangan</td>
                <td className="p-2 font-bold border border-slate-300">{activePrintTransaction.description}</td>
              </tr>
              {activePrintTransaction.studentName && (
                <tr className="border-b">
                  <td className="p-2 font-bold text-slate-500 uppercase bg-slate-50/50 border border-slate-300">Siswa Terkait</td>
                  <td className="p-2 font-bold border border-slate-300">
                    {activePrintTransaction.studentName} (NIS: {activePrintTransaction.nis || '-'})
                  </td>
                </tr>
              )}
              <tr>
                <td className="p-3 font-bold bg-slate-100/50 text-[11px] border border-slate-300">Jumlah Dana (Rupiah)</td>
                <td className="p-3 font-black text-sm text-emerald-800 font-mono bg-slate-100/50 border border-slate-300">
                  Rp {activePrintTransaction.amount.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className="mt-8 grid grid-cols-2 text-center text-[10px]">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold mt-1 text-slate-400 uppercase text-[8px]">Kepala Sekolah</p>
              <div className="h-12 flex items-center justify-center">
                {/* Stamp removed per request */}
              </div>
              <p className="font-bold text-slate-900 underline">{schoolIdentity.principal}</p>
            </div>
            <div>
              <p>Penerima / Teller,</p>
              <p className="font-bold mt-1 text-slate-400 uppercase text-[8px]">Bendahara</p>
              <div className="h-12 flex items-center justify-center">
                {schoolIdentity.treasurerSignature && <img src={schoolIdentity.treasurerSignature} className="h-10 object-contain" alt="Signature" referrerPolicy="no-referrer" />}
              </div>
              <p className="font-bold text-slate-900 underline">{schoolIdentity.treasurer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Screen Interactive Panel (Hidden on Print layout) */}
      <div className="print:hidden">
        
        {/* Header Block with Slate Theme */}
        <header className="bg-slate-900 border-b border-slate-800 text-white py-6 shadow-md transition-all">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1 px-2 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center shadow-lg border border-slate-350 min-h-[50px] min-w-[50px]">
                {schoolIdentity.logo ? (
                  <img src={schoolIdentity.logo} className="h-10 w-10 object-contain" alt="Logo" referrerPolicy="no-referrer" />
                ) : (
                  <BookOpen size={24} className="text-emerald-700 stroke-[2.5]" />
                )}
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 font-extrabold text-[9px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Portal Bendahara Keuangan
                </span>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-100">{schoolIdentity.name}</h1>
                <p className="text-xs text-slate-400 font-semibold">{schoolIdentity.subheading} &bull; {schoolIdentity.address}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] block font-bold text-slate-400 uppercase">AKSES AKTIF: BENDAHARA</span>
                <span className="text-xs font-bold text-slate-200">{schoolIdentity.treasurer}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                <Key size={13} />
                <span>Ubah Sandi</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-900/30 hover:bg-rose-900/60 text-rose-300 border border-rose-800 hover:border-rose-600 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                <LogOut size={13} />
                <span>Keluar Portal</span>
              </button>
            </div>
          </div>
        </header>

        {/* Navigation Subtabs (Desktop: flex, Mobile: hidden) */}
        <div className="max-w-7xl mx-auto px-4 mt-6 hidden md:flex">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1 select-none">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ikhtisar Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kas_ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'kas_ledger'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Buku Kas Terpadu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ubah Sandi Akun
            </button>
          </div>
        </div>

        {/* Summary bento-grid of cards */}
        <main className="max-w-7xl mx-auto px-4 mt-8 flex flex-col gap-6 pb-24">
          
          {activeTab === 'dashboard' && (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Ikhtisar & Pembukuan Kas Sekolah</h2>
              <p className="text-xs text-slate-500">Rekapitulasi otomatis iuran SPP, mutasi Tabungan Siswa, serta pencatatan pendapatan & pengeluaran taktis sekolah.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fetchTransactions}
                className="p-2.5 px-3 bg-white border border-slate-250 hover:bg-slate-100 rounded-xl text-xs font-bold font-mono text-slate-700 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Refresh Data Kas"
              >
                <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                <span>Refresh Data</span>
              </button>
              
              <button
                type="button"
                onClick={handlePrintLedger}
                className="p-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs font-display"
              >
                <Printer size={13} />
                <span>Cetak Buku Kas</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="p-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 transition-all font-display"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Tambah Transaksi Baru</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bento Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Main cash balance */}
            <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Buku Kas Sekolah</span>
                <span className="p-1 px-1.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-lg text-[9px] font-bold tracking-wider uppercase">Lembaga Terpadu</span>
              </div>
              <div className="my-3">
                <span className="text-xs text-slate-500 font-bold block">Net Cash Balance</span>
                <span className="text-2xl font-black text-yellow-300 font-mono">Rp {metrics.netBalance.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-850 pt-2.5 mt-1.5">
                <Wallet size={12} className="text-emerald-400" />
                <span>Total Modal & Kas Terkumpul</span>
              </div>
            </div>

            {/* Card 2: Total auto integrated SPP Payment */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pemasukan SPP Otomatis</span>
                <span className="p-1 px-1.5 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-bold tracking-wider uppercase">Teller & Online</span>
              </div>
              <div className="my-3">
                <span className="text-xs text-slate-500 font-bold block">Tagihan SPP Lunas</span>
                <span className="text-xl font-extrabold text-blue-700 font-mono">Rp {metrics.totalSpp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-100 pt-2.5 mt-1.5 font-semibold">
                <ArrowUpRight size={12} className="text-blue-500" />
                <span>Sistem Realtime Terintegrasi</span>
              </div>
            </div>

            {/* Card 3: Tabungan mutasi integration */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mutasi Tabungan Siswa</span>
                <span className="p-1 px-1.5 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-bold tracking-wider uppercase">Saldo Titipan</span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400 font-bold block">Tabungan Neto</span>
                  <span className="text-base font-extrabold text-slate-700 font-mono">Rp {metrics.netSavings.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>S: <b className="text-emerald-600 font-bold">+{metrics.totalSavingsDeposit.toLocaleString('id-ID')}</b></span>
                  <span>T: <b className="text-rose-600 font-bold">-{metrics.totalSavingsWithdrawal.toLocaleString('id-ID')}</b></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-100 pt-2.5 mt-1.5 font-semibold">
                <ArrowDownRight size={12} className="text-amber-500" />
                <span>Deposit & Tarik Otomatis</span>
              </div>
            </div>

            {/* Card 4: Other tactical cashbook items */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kas Operasional Lainnya</span>
                <span className="p-1 px-1.5 bg-purple-50 text-purple-700 rounded-lg text-[9px] font-bold tracking-wider uppercase">Pencatatan Manual</span>
              </div>
              <div className="my-3">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-slate-400 font-semibold">Pemasukan:</span>
                  <span className="text-xs font-mono text-emerald-600 font-bold">+{metrics.totalCustomIncoming.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 font-semibold">Pengeluaran:</span>
                  <span className="text-xs font-mono text-rose-600 font-bold">-{metrics.totalCustomOutgoing.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-100 pt-2.5 mt-1.5 font-semibold">
                <Tag size={12} className="text-purple-500" />
                <span>Dana BOS, Gaji, Renovasi, dll</span>
              </div>
            </div>

          </div>

          {/* ================= SECTION: NERACA SALDO PER POS BUDGET ================= */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>💼</span> Neraca Saldo per POS BUDGET (Pos Anggaran)
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Pemantauan otomatis limit kuota dan akumulasi sisa kas di masing-masing pos keuangan.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageBudgetPos(!showManageBudgetPos)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-slate-250 font-display"
              >
                <span>🛠️</span> {showManageBudgetPos ? 'Sembunyikan Pengelola' : 'Kelola Kategori POS BUDGET'}
              </button>
            </div>

            {/* Expander: Management of POS BUDGET Categories */}
            {showManageBudgetPos && (
              <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl animate-fade-in text-left">
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider mb-2">📋 Tambah & Kelola POS BUDGET Utama</h4>
                <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed mb-4">
                  Kategori POS BUDGET yang didaftarkan di bawah ini akan muncul sebagai opsi ketika Bendahara merekam kuitansi transaksi keuangan baru secara manual. Pos bawaan sistem seperti <b>SPP</b> dan <b>Tabungan</b> dikelola oleh mutasi otomatis.
                </p>

                {budgetCatMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4 ${
                    budgetCatMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {budgetCatMessage.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-rose-600" />}
                    <span>{budgetCatMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Form to add */}
                  <form onSubmit={handleAddBudgetCategory} className="md:col-span-4 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nama POS BUDGET Baru</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: Dana BOS, Kegiatan Siswa..."
                        value={newBudgetCatInput}
                        onChange={(e) => setNewBudgetCatInput(e.target.value)}
                        className="flex-1 p-2 bg-white text-xs border border-slate-250 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all whitespace-nowrap"
                      >
                        Daftarkan
                      </button>
                    </div>
                  </form>

                  {/* Registered List */}
                  <div className="md:col-span-8">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Kategori POS Aktif saat ini</label>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl font-bold text-[11px] select-none border border-slate-300">
                        🔒 SPP (Sistem)
                      </span>
                      <span className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl font-bold text-[11px] select-none border border-slate-300">
                        🔒 Tabungan (Sistem)
                      </span>
                      {categories.map((cat) => {
                        if (editingCategory === cat) {
                          return (
                            <form 
                              key={cat} 
                              onSubmit={handleEditBudgetCategory} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-slate-800 rounded-xl text-[11px] font-extrabold text-slate-800 shadow-3xs"
                            >
                              <input
                                type="text"
                                value={editCategoryInput}
                                onChange={(e) => setEditCategoryInput(e.target.value)}
                                className="w-24 p-0.5 bg-slate-50 text-[11px] font-bold text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-bold"
                                autoFocus
                                required
                              />
                              <button
                                type="submit"
                                className="px-1.5 py-0.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] rounded cursor-pointer leading-none"
                                title="Simpan"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(null);
                                  setEditCategoryInput('');
                                }}
                                className="px-1.5 py-0.5 bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded cursor-pointer leading-none"
                                title="Batal"
                              >
                                &times;
                              </button>
                            </form>
                          );
                        }

                        return (
                          <div key={cat} className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100/55 border border-slate-200 rounded-xl text-[11px] font-extrabold text-slate-800 shadow-3xs transition-all">
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditCategoryInput(cat);
                              }}
                              className="p-0.5 hover:bg-indigo-100 hover:text-indigo-600 rounded text-slate-400 font-bold cursor-pointer transition-all inline-flex items-center justify-center"
                              title={`Ubah Nama Seluruh ${cat}`}
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBudgetCategory(cat)}
                              className="p-0.5 hover:bg-rose-100 hover:text-rose-600 rounded text-slate-400 font-black cursor-pointer leading-none text-xs"
                              title={`Hapus Pos ${cat}`}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List/Grid of balances for each POS BUDGET */}
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6 gap-3.5 mt-2">
              {budgetPosBalances.map((pos) => {
                const isPositive = pos.balance > 0;
                const isNegative = pos.balance < 0;
                
                let badgeClass = "bg-slate-100 text-slate-750 border-slate-250";
                if (isPositive) badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-250";
                else if (isNegative) badgeClass = "bg-rose-50 text-rose-800 border-rose-250";

                return (
                  <div
                    key={pos.name}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <span className="text-[10.5px] font-black text-slate-900 uppercase truncate" title={pos.name}>
                          📊 {pos.name}
                        </span>
                        {pos.name === 'SPP' || pos.name === 'Tabungan' ? (
                          <span className="text-[8.5px] font-mono text-indigo-650 bg-indigo-50 font-black px-1.5 py-0.5 rounded border border-indigo-100">AUTO</span>
                        ) : null}
                      </div>

                      {/* Small stats of Debit/Kredit flow in this single pos */}
                      <div className="flex flex-col gap-0.5 text-[9.5px] text-slate-500 text-left mb-2 leading-none">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-400">Debit (+):</span>
                          <span className="text-emerald-600 font-bold">Rp {pos.incoming.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-400">Kredit (-):</span>
                          <span className="text-rose-600 font-bold">Rp {pos.outgoing.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sisa Saldo Badge */}
                    <div className={`mt-2 p-2 pt-2.5 ${badgeClass} text-center rounded-xl border`}>
                      <span className="text-[8px] font-bold uppercase tracking-wider block text-slate-400 leading-none mb-1">SALDO NETO</span>
                      <span className="text-xs font-black font-mono">
                        {pos.balance < 0 ? '-' : ''}Rp {Math.abs(pos.balance).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Monthly inflow & outflow trend */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Grafik Arus Kas Bulanan Terintegrasi</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Membandingkan total uang masuk vs keluar beberapa bulan terakhir secara dinamis.</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-150">Garis Tren Arus Kas</span>
              </div>
              <div className="h-64 mt-4 w-full">
                {chartTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(v) => `Rp ${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString('id-ID')}`} />
                      <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`} contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '10px', fontSize: '11px', border: 'none' }} labelStyle={{ fontWeight: 'bold', color: '#34d399' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      <Bar name="Aliran Masuk (+)" dataKey="incoming" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar name="Aliran Keluar (-)" dataKey="outgoing" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">Tidak ada data arus kas untuk ditampilkan dalam grafik.</div>
                )}
              </div>
            </div>

            {/* Cost breakdown PieChart */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-sm text-slate-900">Alokasi Pengeluaran Sekolah</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Persentase porsi alokasi pengeluaran kas berdasarkan kategori.</p>
                </div>
                <div className="h-44 flex items-center justify-center relative my-3">
                  {chartCategoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartCategoryData}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`} contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">Belum ada rincian pengeluaran taktis.</div>
                  )}
                  {chartCategoryData.length > 0 && (
                    <div className="absolute text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Total Belanja</span>
                      <span className="text-xs font-black text-rose-600 font-mono">Rp {metrics.totalOutflow.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Categorical labels */}
              <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-[10px]">
                {chartCategoryData.map((item, index) => {
                  const percentage = ((item.value / (metrics.totalOutflow || 1)) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-900">{percentage}% <span className="text-slate-400">({(item.value / 1000).toFixed(0)}k)</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

          {/* ================= TAB 2: INLINE BUKU KAS LEDGER ================= */}
          {activeTab === 'kas_ledger' && (
            <>
              {/* Ledger Management Spreadsheet / Table list */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs mt-6 flex flex-col">
            
            {/* Header controls */}
            <div className="p-6 border-b border-slate-150 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Buku Kas Pembukuan Terpadu</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Sistem ini memadukan iuran SPP siswa, simpanan/tarikan Tabungan, dan belanja operasional secara real-time.</p>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-400 text-right">
                  Ditemukan: <span className="text-indigo-600 font-extrabold">{filteredTransactions.length}</span> dari {transactions.length} total transaksi
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2">
                
                {/* Search Bar */}
                <div className="md:col-span-5 relative">
                  <input
                    type="text"
                    placeholder="Cari deskripsi, nama siswa, NIS, atau kategori..."
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-slate-50/50 text-slate-800"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={14} />
                  </div>
                </div>

                {/* Filter Cashflow Type */}
                <div className="md:col-span-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  >
                    <option value="all">Semua Arus Kas</option>
                    <option value="incoming">Debit (Uang Masuk)</option>
                    <option value="outgoing">Kredit (Uang Keluar)</option>
                  </select>
                </div>

                {/* Filter Core Source */}
                <div className="md:col-span-2">
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  >
                    <option value="all">Semua Sumber</option>
                    <option value="spp">Sistem (SPP)</option>
                    <option value="savings">Sistem (Tabungan)</option>
                    <option value="custom">Manual (Bendahara)</option>
                  </select>
                </div>

                {/* Filter custom categories */}
                <div className="md:col-span-3">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                  >
                    <option value="all">Semua Kategori Pos</option>
                    <option value="SPP">SPP</option>
                    <option value="Tabungan">Tabungan</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-6">Tanggal</th>
                    <th className="py-3.5 px-4">Sumber Pos</th>
                    <th className="py-3.5 px-4">Deskripsi Transaksi Pokok</th>
                    <th className="py-3.5 px-4 text-center">Tipe Kas</th>
                    <th className="py-3.5 px-4 text-right">Jumlah (Nominal)</th>
                    <th className="py-3.5 px-6 text-center">Modul / Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2 font-semibold">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Sedang memproses & sinkronisasi data pembukuan...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <AlertTriangle size={24} className="text-amber-500 mb-1" />
                          <p className="font-bold text-slate-700">Tidak ada data transaksi ditemukan</p>
                          <p className="text-[11px] text-slate-500">Coba hapus saringan pencarian Anda untuk melihat semua data lama.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isIncoming = tx.type === 'incoming';
                      
                      return (
                        <tr key={tx.id} className="hover:bg-slate-100/50 transition-colors">
                          
                          {/* 1. Date */}
                          <td className="py-3 px-6 font-mono font-bold text-slate-500 whitespace-nowrap">
                            {tx.date}
                          </td>

                          {/* 2. Source Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.source === 'spp' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-blue-50 text-blue-700 border border-blue-150">
                                <CheckCircle2 size={11} /> SPP LUNAS
                              </span>
                            ) : tx.source === 'savings' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-amber-50 text-amber-700 border border-amber-150">
                                <Wallet size={11} /> TABUNGAN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-150">
                                <Plus size={11} /> {tx.category}
                              </span>
                            )}
                          </td>

                          {/* 3. Description & Student Info */}
                          <td className="py-3 px-4 max-w-xs md:max-w-md">
                            <div className="font-black text-slate-800 leading-tight">
                              {tx.description}
                            </div>
                            {tx.studentName && (
                              <div className="text-[10px] text-indigo-600 font-bold mt-0.5 inline-flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded">
                                <UserCheck size={9} />
                                <span>{tx.studentName} (NIS: {tx.nis || '-'})</span>
                              </div>
                            )}
                          </td>

                          {/* 4. Type (Debit/Kredit) */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isIncoming ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                                Debit (+)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md bg-rose-100 text-rose-800 uppercase tracking-wide">
                                Kredit (-)
                              </span>
                            )}
                          </td>

                          {/* 5. Amount */}
                          <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap text-xs ${isIncoming ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isIncoming ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                          </td>

                          {/* 6. Action buttons / Operator */}
                          <td className="py-3 px-6 whitespace-nowrap text-slate-500 font-semibold text-center">
                            {tx.source === 'custom' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(tx)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg cursor-pointer transition-all"
                                  title="Ubah transaksi ini"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-all"
                                  title="Hapus transaksi ini"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="text-[10px] text-slate-400 font-mono italic">Sistem Auto</span>
                                <button
                                  type="button"
                                  onClick={() => setActivePrintTransaction(tx)}
                                  className="px-2 py-0.5 rounded border border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50/80 text-indigo-700 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                  title="Cetak Kuitansi Resmi"
                                >
                                  <Printer size={10} />
                                  <span>Cetak Kuitansi</span>
                                </button>
                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

          {/* ================= TAB 3: PASSWORD AND SECURITY SETTINGS ================= */}
          {activeTab === 'password' && (
            <div className="max-w-md mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-2">
              <div className="p-5 bg-slate-900 border-b border-slate-800 text-white flex items-center gap-2.5">
                <span className="p-2 bg-slate-800 rounded-xl text-slate-350">🔑</span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100 leading-tight">Ubah Kata Sandi Bendahara</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold font-mono">Keamanan Akun Keuangan</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="p-6 flex flex-col gap-4.5 font-semibold text-xs text-slate-705 text-left bg-white leading-relaxed">
                {pwdError && (
                  <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center gap-2 font-black">
                    <AlertTriangle size={15} />
                    <span>{pwdError}</span>
                  </div>
                )}
                
                {pwdSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center gap-2 font-black">
                    <CheckCircle2 size={15} />
                    <span>{pwdSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">KATA SANDI LAMA</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan sandi lama bendahara"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-slate-850 focus:outline-none bg-slate-50/50 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">KATA SANDI BARU</label>
                  <input
                    type="password"
                    required
                    placeholder="Sandi baru minimal 5 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-slate-850 focus:outline-none bg-slate-50/50 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">KONFIRMASI SANDI BARU</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan ulang sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-slate-850 focus:outline-none bg-slate-50/50 text-slate-800 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="w-full mt-2 py-3 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold font-sans tracking-wide cursor-pointer transition-all text-center shadow-lg shadow-indigo-500/10"
                >
                  {isChangingPwd ? 'Menyimpan Perubahan...' : 'Simpan Sandi Baru'}
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16 no-print select-none">
        {/* Menu 1 (Home - paling kiri) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all animate-none"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Home size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'dashboard' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Home</span>
        </button>

        {/* Menu 2 (Buku Kas) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('kas_ledger');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all animate-none"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'kas_ledger' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <BookOpen size={20} className={activeTab === 'kas_ledger' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'kas_ledger' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Buku Kas</span>
        </button>

        {/* Menu 3 (Kelola Sandi) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all animate-none"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'password' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Key size={20} className={activeTab === 'password' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'password' ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Sandi</span>
        </button>

        {/* Menu 4 (Lainnya - 4 kotak, paling kanan) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all animate-none"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${showMoreMenu ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={showMoreMenu ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${showMoreMenu ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
        </button>
      </div>

      {/* Slide-over menu bottom sheet overlay for "Lainnya" */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Lainnya</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Bendahara</h4>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    fetchTransactions();
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-600 text-lg">🔄</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Sinkronisasi Kas</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Ulang muat mutasi tabungan &amp; rekapitulasi SPP terintegrasi</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handlePrintLedger();
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-600 text-lg">🖨️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Cetak Laporan</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Ekspor cetakan Buku Kas Besar Resmi lembaga</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-rose-100 bg-rose-50/30 hover:bg-rose-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-rose-100 rounded-xl text-rose-600 text-lg">🚪</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-rose-800">Keluar Sesi</h5>
                    <p className="text-[10px] text-rose-500 mt-0.5 leading-tight">Keluar aman dari portal utama bendahara sekolah</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Model 1: Add/Edit Manual Books Transaction Popup Form */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border text-left border-slate-250 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight">
                      {editingTransaction ? 'Ubah Transaksi Kas' : 'Pencatatan Buku Kas Baru'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Operator Bendahara Sekolah</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4 font-semibold text-xs">
                
                {/* 1. Cashflow Flow direction Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ARUS KEUANGAN (TIPE)</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('incoming')}
                      className={`py-2 text-center font-extrabold rounded-lg cursor-pointer transition-all ${formType === 'incoming' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      Pemasukan (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('outgoing')}
                      className={`py-2 text-center font-extrabold rounded-lg cursor-pointer transition-all ${formType === 'outgoing' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                      Pengeluaran (-)
                    </button>
                  </div>
                </div>

                {/* 2. Category Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">KATEGORI POS BUDGET</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Date Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TANGGAL TRANSAKSI</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono font-bold"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Calendar size={14} />
                    </div>
                  </div>
                </div>

                {/* 4. Numeric Nominal / Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NOMINAL (RUPIAH)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={100}
                      placeholder="Masukkan nominal uang (cth: 50000)"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 bg-slate-50 border-r pr-1.5 py-0.5">
                      Rp
                    </div>
                  </div>
                </div>

                {/* 5. String Description */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">DESKRIPSI LENGKAP KETERANGAN</label>
                  <textarea
                    required
                    placeholder="Tulis rincian penggunaan / sumber dana secara detail..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold"
                  />
                </div>

                {/* Trigger Buttons */}
                <div className="flex gap-2.5 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-center rounded-xl cursor-pointer"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-center rounded-xl cursor-pointer shadow-indigo-100 shadow-md"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Visual Printable Kuitansi (Invoice receipt) Modal for the Teller systems */}
      <AnimatePresence>
        {activePrintTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-left w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 border flex flex-col gap-4 font-semibold text-xs text-slate-800"
            >
              {/* Receipt Kop */}
              <div className="flex items-center gap-3 border-b-2 border-double border-slate-300 pb-3">
                <div className="p-1 px-1.5 bg-slate-100 text-slate-900 rounded font-bold flex items-center justify-center">
                  {schoolIdentity.logo ? (
                    <img src={schoolIdentity.logo} className="h-8 w-8 object-contain" alt="Logo" referrerPolicy="no-referrer" />
                  ) : (
                    <BookOpen size={16} />
                  )}
                </div>
                <div className="flex-1 leading-tight">
                  <h3 className="text-xs font-extrabold uppercase">{schoolIdentity.name}</h3>
                  <p className="text-[9px] text-slate-500 font-medium">{schoolIdentity.subheading}</p>
                </div>
                <div className="text-right text-[9px] text-slate-400">
                  KUITANSI ASLI
                </div>
              </div>

              {/* Card Contents */}
              <div className="text-center py-2 bg-slate-50 rounded-lg">
                <h4 className="text-[10px] text-slate-400 uppercase tracking-widest leading-none font-bold">KUITANSI BENDAHARA RESMI</h4>
                <div className="text-xs font-mono text-slate-900 border-b border-dashed w-fit mx-auto px-4 py-1 font-bold">
                  REF: {activePrintTransaction.id.toUpperCase()}
                </div>
              </div>

              {/* Details table mapping */}
              <div className="grid grid-cols-12 gap-y-2 border border-slate-150 p-4 rounded-xl text-xs bg-slate-50/50">
                <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Tanggal Transaksi:</span>
                <span className="col-span-8 font-mono font-bold text-slate-800">{activePrintTransaction.date}</span>

                <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Jenis Mutasi:</span>
                <span className="col-span-8 font-bold text-slate-800">
                  {activePrintTransaction.type === 'incoming' ? 'DEBIT (Uang Masuk / Pembayaran)' : 'KREDIT (Uang Keluar / Tarikan)'}
                </span>

                <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Kategori Pos:</span>
                <span className="col-span-8 font-bold uppercase text-indigo-700">{activePrintTransaction.category}</span>

                <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Rincian Keterangan:</span>
                <span className="col-span-8 font-black text-slate-900 leading-tight">{activePrintTransaction.description}</span>

                {activePrintTransaction.studentName && (
                  <>
                    <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Atas Nama Siswa:</span>
                    <span className="col-span-8 font-bold text-slate-800">
                      {activePrintTransaction.studentName} (NIS: {activePrintTransaction.nis || '-'})
                    </span>
                  </>
                )}

                <span className="col-span-12 border-t border-slate-150 my-1"></span>

                <span className="col-span-4 text-slate-400 font-extrabold uppercase text-[9px] self-center">Jumlah Dana:</span>
                <span className="col-span-8 font-black text-sm text-emerald-800 font-mono">
                  Rp {activePrintTransaction.amount.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Signatures */}
              <div className="flex items-center justify-between mt-3 text-[10px] text-center">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-extrabold mt-1 text-slate-400 uppercase text-[8px]">Kepala Sekolah</p>
                  <div className="h-10 flex items-center justify-center">
                    {/* Stamp removed per request */}
                  </div>
                  <p className="underline underline-offset-1 font-extrabold font-display leading-none">{schoolIdentity.principal}</p>
                </div>

                <div>
                  <p>Teller Kas Penerima,</p>
                  <p className="font-extrabold mt-1 text-slate-400 uppercase text-[8px]">Bendahara</p>
                  <div className="h-10 flex items-center justify-center">
                    {schoolIdentity.treasurerSignature && <img src={schoolIdentity.treasurerSignature} className="h-9 object-contain" alt="Stamp" referrerPolicy="no-referrer" />}
                  </div>
                  <p className="underline underline-offset-1 font-extrabold font-display leading-none">{schoolIdentity.treasurer}</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer size={13} />
                  <span>Cetak Langsung</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePrintTransaction(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer text-center"
                >
                  Tutup Tampilan
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border text-left border-slate-250 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                    <Key size={14} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-tight">Ubah Sandi Bendahara</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Keamanan Akun</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all text-xs"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="p-5 flex flex-col gap-3.5 text-xs font-semibold">
                {pwdError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl text-[11px] font-bold">
                    {pwdError}
                  </div>
                )}
                
                {pwdSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-[11px] font-bold">
                    {pwdSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">KATA SANDI SEBELUMNYA</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan sandi saat ini"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">KATA SANDI BARU</label>
                  <input
                    type="password"
                    required
                    maxLength={32}
                    placeholder="Minimal 5 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">KONFIRMASI SANDI BARU</label>
                  <input
                    type="password"
                    required
                    placeholder="Ulangi sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPwd}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    {isChangingPwd ? 'Menyimpan...' : 'Simpan Sandi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
