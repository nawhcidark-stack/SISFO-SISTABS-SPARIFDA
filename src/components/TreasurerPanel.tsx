import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Trash2, Edit3, TrendingUp, TrendingDown, RefreshCw, 
  LogOut, DollarSign, Calendar, Tag, FileText, Search, Printer, 
  Download, Building2, CheckCircle2, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, Wallet, UserCheck, Percent, HelpCircle, Eye, Key,
  LayoutGrid, Home, Smartphone, Apple
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { SchoolIdentity, TreasurerTransaction, TeacherSalary, SalaryConfig, HomeroomTeacher, SubjectTeacher } from '../types';

interface TreasurerPanelProps {
  schoolIdentity: SchoolIdentity;
  homerooms?: HomeroomTeacher[];
  subjectTeachers?: SubjectTeacher[];
  onLogout: () => void;
}

export default function TreasurerPanel({ 
  schoolIdentity, 
  homerooms = [], 
  subjectTeachers = [], 
  onLogout 
}: TreasurerPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kas_ledger' | 'password' | 'gaji_guru'>('dashboard');
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
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          return typeof first === 'string' ? first : first.name;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return 'Operasional';
  });
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [isCustomRecipient, setIsCustomRecipient] = useState(false);
  const [formFundingSource, setFormFundingSource] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Filter configurations
  const [term, setTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'spp' | 'savings' | 'custom'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | string>('all');

  // --- STATE PENGGAJIAN GURU ---
  const [salaries, setSalaries] = useState<TeacherSalary[]>([]);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig | null>(null);
  const [salaryMonth, setSalaryMonth] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [isGeneratingGaji, setIsGeneratingGaji] = useState(false);
  const [gajiSearch, setGajiSearch] = useState('');
  const [gajiTypeFilter, setGajiTypeFilter] = useState<'all' | 'homeroom' | 'subject_teacher'>('all');
  const [gajiStatusFilter, setGajiStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEditPayModal, setShowEditPayModal] = useState(false);
  const [editingGaji, setEditingGaji] = useState<TeacherSalary | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptGaji, setReceiptGaji] = useState<TeacherSalary | null>(null);

  // Edit salary form fields
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editHomeroomAllowance, setEditHomeroomAllowance] = useState('');
  const [editTunjanganMasaKerja, setEditTunjanganMasaKerja] = useState('');
  const [editVakasi, setEditVakasi] = useState('');
  const [editPotonganDanaSosial, setEditPotonganDanaSosial] = useState('');
  const [editPotonganAbsen, setEditPotonganAbsen] = useState('');
  const [editPotonganLain, setEditPotonganLain] = useState('');
  const [editOtherAllowance, setEditOtherAllowance] = useState('');
  const [editDeductions, setEditDeductions] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Config salary form fields
  const [cfgBaseSalaryHomeroom, setCfgBaseSalaryHomeroom] = useState('');
  const [cfgBaseSalarySubject, setCfgBaseSalarySubject] = useState('');
  const [cfgHomeroomAllowanceRate, setCfgHomeroomAllowanceRate] = useState('');
  const [cfgJournalRate, setCfgJournalRate] = useState('');
  const [cfgDefaultTunjanganMasaKerja, setCfgDefaultTunjanganMasaKerja] = useState('');
  const [cfgDefaultPotonganDanaSosial, setCfgDefaultPotonganDanaSosial] = useState('');

  const filteredSalaries = useMemo(() => {
    return salaries.filter(s => {
      if (s.month !== salaryMonth) return false;
      if (gajiSearch && !s.teacherName.toLowerCase().includes(gajiSearch.toLowerCase())) return false;
      if (gajiTypeFilter !== 'all' && s.teacherType !== gajiTypeFilter) return false;
      if (gajiStatusFilter !== 'all' && s.status !== gajiStatusFilter) return false;
      return true;
    });
  }, [salaries, salaryMonth, gajiSearch, gajiTypeFilter, gajiStatusFilter]);

  const statsGaji = useMemo(() => {
    let paidSum = 0;
    let unpaidSum = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    salaries.forEach(s => {
      if (s.month === salaryMonth) {
        if (s.status === 'paid') {
          paidSum += s.totalAmount;
          paidCount++;
        } else {
          unpaidSum += s.totalAmount;
          unpaidCount++;
        }
      }
    });
    return { paidSum, unpaidSum, paidCount, unpaidCount, totalCount: paidCount + unpaidCount };
  }, [salaries, salaryMonth]);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Invoice state to print
  const [activePrintTransaction, setActivePrintTransaction] = useState<TreasurerTransaction | null>(null);
  const [receiptPrintFormat, setReceiptPrintFormat] = useState<'standard' | 'thermal'>('standard');

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
  interface BudgetCategory {
    name: string;
    type: 'incoming' | 'outgoing' | 'both';
  }

  const [categories, setCategories] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem('treasurer_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(c => {
            if (typeof c === 'string') {
              let type: 'incoming' | 'outgoing' | 'both' = 'both';
              const nameLower = c.toLowerCase();
              if (nameLower.includes('gaji') || nameLower.includes('operasional') || nameLower.includes('pembangunan') || nameLower.includes('ujian')) {
                type = 'outgoing';
              } else if (nameLower.includes('utama')) {
                type = 'both';
              }
              return { name: c, type };
            }
            const obj = c as any;
            const name = obj.name || '';
            let type = obj.type;
            if (!type || !['incoming', 'outgoing', 'both'].includes(type)) {
              type = 'both';
              const nameLower = name.toLowerCase();
              if (nameLower.includes('gaji') || nameLower.includes('operasional') || nameLower.includes('pembangunan') || nameLower.includes('ujian')) {
                type = 'outgoing';
              }
            }
            return { name, type };
          });
        }
      } catch (e) {
        console.error("Gagal parse kategori disimpan: ", e);
      }
    }
    return [
      { name: 'Operasional', type: 'outgoing' },
      { name: 'Gaji Guru', type: 'outgoing' },
      { name: 'Pembangunan', type: 'outgoing' },
      { name: 'Ujian', type: 'outgoing' },
      { name: 'Utama', type: 'both' }
    ];
  });

  useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.name === formCategory)) {
      setFormCategory(categories[0].name);
    }
  }, [categories, formCategory]);

  const [showManageBudgetPos, setShowManageBudgetPos] = useState(false);
  const [newBudgetCatInput, setNewBudgetCatInput] = useState('');
  const [newBudgetCatType, setNewBudgetCatType] = useState<'incoming' | 'outgoing' | 'both'>('both');
  const [budgetCatMessage, setBudgetCatMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Budget Transfer states
  const [transferSource, setTransferSource] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

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
    if (isReserved || categories.some(c => c.name.toLowerCase() === clean.toLowerCase())) {
      showBudgetMsg('error', 'Kategori POS BUDGET tersebut sudah terdaftar.');
      return;
    }
    const updated: BudgetCategory[] = [...categories, { name: clean, type: newBudgetCatType }];
    setCategories(updated);
    localStorage.setItem('treasurer_categories', JSON.stringify(updated));
    setNewBudgetCatInput('');
    setNewBudgetCatType('both');
    showBudgetMsg('success', `Sukses mendaftarkan POS BUDGET baru: ${clean} (${newBudgetCatType === 'incoming' ? 'Pemasukan' : newBudgetCatType === 'outgoing' ? 'Pengeluaran' : 'Umum/Keduanya'})`);
  };

  const handleDeleteBudgetCategory = async (catName: string) => {
    if (categories.length <= 1) {
      showBudgetMsg('error', 'Harus menyisakan minimal satu kategori POS BUDGET.');
      return;
    }
    if (catName.toLowerCase() === 'utama') {
      showBudgetMsg('error', 'Kategori POS "Utama" tidak boleh dihapus karena merupakan lokasi penampungan dana default.');
      return;
    }

    const confirmMessage = `Apakah Anda yakin ingin menghapus POS BUDGET "${catName}"?\n\nPERINGATAN: Semua riwayat transaksi dan saldo dana di dalam pos ini akan otomatis dipindahkan ke POS "Utama". Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMessage)) return;

    const updated = categories.filter(c => c.name !== catName);
    if (!updated.some(c => c.name.toLowerCase() === 'utama')) {
      updated.push({ name: 'Utama', type: 'both' });
    }

    setCategories(updated);
    localStorage.setItem('treasurer_categories', JSON.stringify(updated));

    const affectedTxs = transactions.filter(t => t.category === catName && t.source === 'custom');
    if (affectedTxs.length > 0) {
      showBudgetMsg('success', `Memindahkan ${affectedTxs.length} transaksi terkait ke POS "Utama"...`);
      try {
        await Promise.all(affectedTxs.map(async (t) => {
          await fetch(`/api/treasurer/transactions/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...t,
              category: 'Utama'
            })
          });
        }));
        await fetchTransactions();
      } catch (err) {
        console.error("Gagal menyinkronkan pemindahan pos: ", err);
      }
    }

    showBudgetMsg('success', `Sukses menghapus POS BUDGET "${catName}" dan memindahkan seluruh saldo dananya ke POS "Utama".`);
  };

  const handleTransferBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSource || !transferTarget || !transferAmount || !transferDescription) {
      setTransferMessage({ type: 'error', text: 'Mohon lengkapi seluruh field formulir transfer dana.' });
      return;
    }
    if (transferSource === transferTarget) {
      setTransferMessage({ type: 'error', text: 'POS sumber dan POS tujuan tidak boleh sama.' });
      return;
    }
    const amt = Number(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferMessage({ type: 'error', text: 'Jumlah dana transfer harus lebih besar dari Rp 0.' });
      return;
    }

    setIsTransferring(true);
    setTransferMessage(null);

    try {
      const res = await fetch('/api/treasurer/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCategory: transferSource,
          targetCategory: transferTarget,
          amount: amt,
          description: transferDescription,
          date: transferDate
        })
      });

      if (res.ok) {
        setTransferMessage({
          type: 'success',
          text: `🎉 Berhasil memindahkan Rp ${amt.toLocaleString('id-ID')} dari POS "${transferSource}" ke POS "${transferTarget}" secara aman!`
        });
        setTransferAmount('');
        setTransferDescription('');
        await fetchTransactions();
      } else {
        const d = await res.json();
        setTransferMessage({ type: 'error', text: d.error || 'Gagal memproses pemindahan dana.' });
      }
    } catch (err) {
      setTransferMessage({ type: 'error', text: 'Hubungan komunikasi dengan server terganggu.' });
    } finally {
      setIsTransferring(false);
    }
  };

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryInput, setEditCategoryInput] = useState('');
  const [editCategoryType, setEditCategoryType] = useState<'incoming' | 'outgoing' | 'both'>('both');

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

    if (clean.toLowerCase() !== editingCategory.toLowerCase() && categories.some(c => c.name.toLowerCase() === clean.toLowerCase())) {
      showBudgetMsg('error', 'Kategori POS BUDGET tersebut sudah terdaftar.');
      return;
    }

    const updated = categories.map(c => c.name === editingCategory ? { name: clean, type: editCategoryType } : c);
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
    showBudgetMsg('success', `Sukses mengubah "${editingCategory}" menjadi "${clean}" (${editCategoryType === 'incoming' ? 'Pemasukan' : editCategoryType === 'outgoing' ? 'Pengeluaran' : 'Umum/Keduanya'})`);
  };


  useEffect(() => {
    fetchTransactions();
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    try {
      const sRes = await fetch('/api/treasurer/salaries');
      if (sRes.ok) {
        const sData = await sRes.json();
        setSalaries(sData);
      }
      const cRes = await fetch('/api/treasurer/salary-config');
      if (cRes.ok) {
        const cData = await cRes.json();
        setSalaryConfig(cData);
        setCfgBaseSalaryHomeroom(String(cData.baseSalaryHomeroom || ''));
        setCfgBaseSalarySubject(String(cData.baseSalarySubject || ''));
        setCfgHomeroomAllowanceRate(String(cData.homeroomAllowanceRate || ''));
        setCfgJournalRate(String(cData.journalRate || ''));
        setCfgDefaultTunjanganMasaKerja(String(cData.defaultTunjanganMasaKerja || ''));
        setCfgDefaultPotonganDanaSosial(String(cData.defaultPotonganDanaSosial || ''));
      }
    } catch (e) {
      console.error("Gagal memuat data keuangan gaji: ", e);
    }
  };

  const handleGenerateGaji = async () => {
    setIsGeneratingGaji(true);
    try {
      const res = await fetch('/api/treasurer/salaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: salaryMonth })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Berhasil menjumlahkan dan menghasilkan berkas penggajian.');
        await fetchSalaries();
      } else {
        alert(data.error || 'Gagal menghasilkan data gaji.');
      }
    } catch (e) {
      console.error(e);
      alert('Terganggu koneksi jaringan dalam menjalankan generate.');
    } finally {
      setIsGeneratingGaji(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/treasurer/salary-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSalaryHomeroom: Number(cfgBaseSalaryHomeroom),
          baseSalarySubject: Number(cfgBaseSalarySubject),
          homeroomAllowanceRate: Number(cfgHomeroomAllowanceRate),
          journalRate: Number(cfgJournalRate),
          defaultTunjanganMasaKerja: Number(cfgDefaultTunjanganMasaKerja),
          defaultPotonganDanaSosial: Number(cfgDefaultPotonganDanaSosial)
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Konfigurasi tarif gaji pokok & insentif berhasil diperbarui.');
        setSalaryConfig(data.salaryConfig);
        setShowConfigModal(false);
      } else {
        alert(data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch (e) {
      console.error(e);
      alert('Terganggu koneksi dalam menyimpan konfigurasi.');
    }
  };

  const handlePayGaji = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin memproses pembayaran gaji ini? Tindakan ini akan mencatat mutasi pengeluaran kas otomatis di Buku Kas.')) {
      return;
    }
    try {
      const res = await fetch(`/api/treasurer/salaries/${id}/pay`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert('Pembayaran gaji sukses diproses dan mutasi pengeluaran didaftarkan.');
        await fetchSalaries();
        await fetchTransactions(); // Refresh cash ledger too!
      } else {
        alert(data.error || 'Gagal memproses pembayaran.');
      }
    } catch (e) {
      console.error(e);
      alert('Terganggu koneksi.');
    }
  };

  const handleUpdateGaji = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGaji) return;
    try {
      const res = await fetch(`/api/treasurer/salaries/${editingGaji.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSalary: Number(editBaseSalary),
          homeroomAllowance: Number(editHomeroomAllowance),
          tunjanganMasaKerja: Number(editTunjanganMasaKerja),
          vakasi: Number(editVakasi),
          potonganDanaSosial: Number(editPotonganDanaSosial),
          potonganAbsen: Number(editPotonganAbsen),
          potonganLain: Number(editPotonganLain),
          otherAllowance: Number(editOtherAllowance),
          deductions: Number(editDeductions),
          notes: editNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Data penyesuaian gaji berhasil diubah.');
        setShowEditPayModal(false);
        setEditingGaji(null);
        await fetchSalaries();
      } else {
        alert(data.error || 'Gagal mengubah data gaji.');
      }
    } catch (e) {
      console.error(e);
      alert('Terganggu koneksi.');
    }
  };

  const handleDeleteGaji = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus draf gaji ini?')) {
      return;
    }
    try {
      const res = await fetch(`/api/treasurer/salaries/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        alert('Data gaji berhasil dihapus.');
        await fetchSalaries();
      } else {
        alert(data.error || 'Gagal menghapus data.');
      }
    } catch (e) {
      console.error(e);
      alert('Terganggu koneksi.');
    }
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/treasurer/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);

        // Auto-detect any missing category in existing transactions and add it to the active POS categories list
        if (Array.isArray(data)) {
          const fetchedCategories = new Set<string>();
          data.forEach((tx: any) => {
            if (tx.category && typeof tx.category === 'string') {
              const trimmed = tx.category.trim();
              if (trimmed && !['SPP', 'Tabungan'].includes(trimmed)) {
                fetchedCategories.add(trimmed);
              }
            }
          });

          if (fetchedCategories.size > 0) {
            setCategories(prev => {
              const currentNames = new Set(prev.map(c => c.name.toLowerCase()));
              const newlyDetected: BudgetCategory[] = [];
              fetchedCategories.forEach((catName: string) => {
                if (!currentNames.has(catName.toLowerCase())) {
                  const sameCatTxs = data.filter((tx: any) => tx.category === catName);
                  const hasIncoming = sameCatTxs.some((tx: any) => tx.type === 'incoming');
                  const hasOutgoing = sameCatTxs.some((tx: any) => tx.type === 'outgoing');
                  let type: 'incoming' | 'outgoing' | 'both' = 'both';
                  if (hasIncoming && !hasOutgoing) {
                    type = 'incoming';
                  } else if (hasOutgoing && !hasIncoming) {
                    type = 'outgoing';
                  }
                  newlyDetected.push({ name: catName, type });
                }
              });

              if (newlyDetected.length > 0) {
                const updated = [...prev, ...newlyDetected];
                localStorage.setItem('treasurer_categories', JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        }
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
    setFormCategory(categories[0]?.name || 'Operasional');
    setFormAmount('');
    setFormDescription('');
    setFormRecipientName('');
    setIsCustomRecipient(false);
    setFormFundingSource('');
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
    setFormRecipientName(tx.recipientName || '');
    
    const isTeacher = (homerooms || []).some(h => h.name === tx.recipientName) || (subjectTeachers || []).some(st => st.name === tx.recipientName);
    setIsCustomRecipient(!isTeacher && !!tx.recipientName);

    setFormFundingSource(tx.fundingSource || '');
    setFormDate(tx.date);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0 || !formDescription.trim()) {
      alert('Harap isi jumlah dan deskripsi dengan benar.');
      return;
    }

    if (formType === 'outgoing' && !formRecipientName.trim()) {
      alert('Harap isi nama penerima dana untuk transaksi pengeluaran.');
      return;
    }

    setIsSubmitting(true);
    const bodyArgs = {
      type: formType,
      category: formCategory,
      amount: Number(formAmount),
      description: formDescription,
      date: formDate,
      recipientName: formType === 'outgoing' ? formRecipientName : '',
      fundingSource: formType === 'incoming' ? formFundingSource : ''
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
        const data = await res.json();
        setShowFormModal(false);
        fetchTransactions();
        if (data.transaction) {
          setActivePrintTransaction(data.transaction);
        }
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
    const allUniqueCategories = Array.from(new Set(['SPP', 'Tabungan', ...categories.map(c => c.name)]));
    
    allUniqueCategories.forEach(c => {
      balances[c] = { incoming: 0, outgoing: 0, balance: 0 };
    });

    transactions.forEach(t => {
      const cat = t.category || 'Utama';
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
      const matchStartDate = !filterStartDate || t.date >= filterStartDate;
      const matchEndDate = !filterEndDate || t.date <= filterEndDate;

      return matchTerm && matchType && matchSource && matchCategory && matchStartDate && matchEndDate;
    });
  }, [transactions, term, filterType, filterSource, filterCategory, filterStartDate, filterEndDate]);

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

  // Derived filtered metrics for printing target category/POS reports
  const filteredMetrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'incoming') {
        totalInflow += t.amount;
      } else {
        totalOutflow += t.amount;
      }
    });

    return {
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow
    };
  }, [filteredTransactions]);

  // Print summary document function
  const handlePrintLedger = () => {
    window.print();
  };

  const handleDownloadExcelLedger = () => {
    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();
    const catStr = filterCategory === 'all' ? 'SEMUA KATEGORI POS' : filterCategory.toUpperCase();
    const sourceStr = filterSource === 'all' ? 'SEMUA SUMBER' : filterSource.toUpperCase();
    const typeStr = filterType === 'all' ? 'SEMUA ARUS KAS' : filterType === 'incoming' ? 'DEBIT (UANG MASUK)' : 'KREDIT (UANG KELUAR)';
    const dateRangeStr = filterStartDate || filterEndDate ? `Periode: ${filterStartDate || 'Awal'} s/d ${filterEndDate || 'Akhir'}` : 'Semua Periode';
    
    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Buku Kas Global</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<style>
  table { border-collapse: collapse; }
  .table-header { background-color: #4f46e5; color: white; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; }
  td { border: 1px solid #cbd5e1; padding: 6px; font-size: 10pt; }
  .title { font-size: 14pt; font-weight: bold; text-align: center; }
  .subtitle { font-size: 11pt; font-weight: bold; text-align: center; color: #475569; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .bg-gray { background-color: #f1f5f9; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="7" class="title">BUKU KAS BESAR GLOBAL TERPADU</td></tr>
    <tr><td colspan="7" class="subtitle">${schoolNameUpper} - PORTAL BK & KEUANGAN</td></tr>
    <tr><td colspan="7" style="text-align: center; font-style: italic; color: #64748b;">Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}</td></tr>
    <tr><td colspan="7" style="text-align: center; font-weight: bold;">Kategori Pos: ${catStr} | Sumber: ${sourceStr} | Arus Kas: ${typeStr}</td></tr>
    <tr><td colspan="7" style="text-align: center; font-weight: bold; color: #dc2626;">${dateRangeStr}</td></tr>
    <tr></tr>
    <tr class="bg-gray">
      <td colspan="3" class="font-bold">TOTAL DEBIT (+)</td>
      <td colspan="4" class="font-bold text-right" style="color: #047857;">Rp ${filteredMetrics.totalInflow.toLocaleString('id-ID')}</td>
    </tr>
    <tr class="bg-gray">
      <td colspan="3" class="font-bold">TOTAL KREDIT (-)</td>
      <td colspan="4" class="font-bold text-right" style="color: #be123c;">Rp ${filteredMetrics.totalOutflow.toLocaleString('id-ID')}</td>
    </tr>
    <tr class="bg-gray">
      <td colspan="3" class="font-bold">SALDO NETO</td>
      <td colspan="4" class="font-bold text-right" style="color: #1d4ed8;">Rp ${filteredMetrics.netBalance.toLocaleString('id-ID')}</td>
    </tr>
    <tr></tr>
    <tr>
      <td class="table-header" style="width: 50px;">No</td>
      <td class="table-header" style="width: 100px;">Tanggal</td>
      <td class="table-header" style="width: 300px;">Deskripsi Transaksi</td>
      <td class="table-header" style="width: 150px;">Kategori / Pos</td>
      <td class="table-header" style="width: 120px;">Sumber Pos</td>
      <td class="table-header" style="width: 130px; text-align: right;">Debit (+)</td>
      <td class="table-header" style="width: 130px; text-align: right;">Kredit (-)</td>
    </tr>
`;

    filteredTransactions.forEach((tx, idx) => {
      const srcDisplay = tx.source === 'spp' ? 'SPP (Sistem)' : tx.source === 'savings' ? 'Tabungan' : 'Manual (Bendahara)';
      const debitVal = tx.type === 'incoming' ? tx.amount : 0;
      const kreditVal = tx.type === 'outgoing' ? tx.amount : 0;
      
      let descWord = tx.description;
      if (tx.studentName) {
        descWord += ` (Siswa: ${tx.studentName} - NIS: ${tx.nis})`;
      }
      if (tx.recipientName) {
        descWord += ` (Penerima: ${tx.recipientName})`;
      }
      if (tx.fundingSource) {
        descWord += ` (Sumber Dana: ${tx.fundingSource})`;
      }

      excelHtml += `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="text-align: center;">${tx.date}</td>
      <td>${descWord}</td>
      <td style="text-align: center; text-transform: uppercase;">${tx.category}</td>
      <td style="text-align: center;">${srcDisplay}</td>
      <td class="text-right" style="color: #047857;">${debitVal ? 'Rp ' + debitVal.toLocaleString('id-ID') : '-'}</td>
      <td class="text-right" style="color: #be123c;">${kreditVal ? 'Rp ' + kreditVal.toLocaleString('id-ID') : '-'}</td>
    </tr>
`;
    });

    excelHtml += `
    <tr></tr>
    <tr>
      <td colspan="3" style="text-align: center; border: none;">
        <br/>Mengetahui,<br/>Kepala Sekolah<br/><br/><br/><br/>
        <b>${schoolIdentity.principal || '-'}</b>
      </td>
      <td colspan="1" style="border: none;"></td>
      <td colspan="3" style="text-align: center; border: none;">
        <br/>Pandaan, ${new Date().toLocaleDateString('id-ID')}<br/>Bendahara Kas Sekolah<br/><br/><br/><br/>
        <b>${schoolIdentity.treasurer || '-'}</b>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const catNameFilename = filterCategory === 'all' ? 'GLOBAL' : filterCategory.toUpperCase().replace(/\s+/g, '_');
    const dateSuffix = filterStartDate || filterEndDate ? `_PERIOD_${filterStartDate || 'AWAL'}_TO_${filterEndDate || 'AKHIR'}` : `_${new Date().toISOString().split('T')[0]}`;
    link.download = `BUKU_KAS_${catNameFilename}${dateSuffix}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="treasurer-panel-root" className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
          {/* Printable Area 1: Ledger/Buku Kas - Only active when not printing an individual receipt */}
      {!activePrintTransaction && (
        <div id="print-report-section" className="hidden print:block bg-white p-8 text-black text-xs leading-relaxed">
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
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID')} {filterStartDate || filterEndDate ? `| Periode: ${filterStartDate || 'Awal'} s/d ${filterEndDate || 'Akhir'}` : ''} | POS Kategori: {filterCategory === 'all' ? 'SEMUA POS KATEGORI' : filterCategory.toUpperCase()} | Sumber: {filterSource === 'all' ? 'Semua Sumber' : filterSource.toUpperCase()} ({filterType === 'all' ? 'Semua Arus Kas' : filterType === 'incoming' ? 'Hanya Pemasukan' : 'Hanya Pengeluaran'})
            </p>
          </div>

          {/* Printable summary card */}
          <div className="grid grid-cols-3 gap-2 border p-3 rounded-lg bg-slate-50 mb-6 font-semibold">
            <div>
              <div className="text-slate-500 text-[9px] uppercase">TOTAL PEMASUKAN (DEBIT)</div>
              <div className="text-xs font-bold text-emerald-800">Rp {filteredMetrics.totalInflow.toLocaleString('id-ID')}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[9px] uppercase">TOTAL PENGELUARAN (KREDIT)</div>
              <div className="text-xs font-bold text-rose-800">Rp {filteredMetrics.totalOutflow.toLocaleString('id-ID')}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[9px] uppercase">SALDO KAS NETO BERJALAN</div>
              <div className="text-xs font-extrabold text-blue-800">Rp {filteredMetrics.netBalance.toLocaleString('id-ID')}</div>
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
                    {tx.recipientName && (
                      <div className="text-[9px] text-indigo-600 font-extrabold">Penerima: {tx.recipientName}</div>
                    )}
                    {tx.fundingSource && (
                      <div className="text-[9px] text-emerald-800 font-extrabold">Sumber Dana: {tx.fundingSource}</div>
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
              <p className="text-[9px] text-slate-500 font-medium">SMP Ma'arif NU Pandaan</p>
            </div>
          </div>
        </div>
      )}

      {/* Printable Area 2: Receipt/Kuitansi - Managed inside the modal directly to prevent styling mismatch */}

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
              {schoolIdentity.treasurerSkUrl && (
                <a
                  href={schoolIdentity.treasurerSkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-990/30 hover:bg-emerald-950/65 text-emerald-300 border border-emerald-800 hover:border-emerald-600 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  <Download size={13} />
                  <span>Unduh SK</span>
                </a>
              )}
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

        {/* Unduh Aplikasi Mobile Banner */}
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Aplikasi Mobile Resmi Portal Sekolah</h4>
                <p className="text-[10px] text-slate-500 leading-normal">Unduh aplikasi mobile resmi sekolah untuk mengakses sistem keuangan & akademik sekolah langsung dari smartphone Anda.</p>
              </div>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <a
                href={schoolIdentity?.apkUrl || "#"}
                target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!schoolIdentity?.apkUrl) {
                    e.preventDefault();
                    alert("Link unduhan Android belum diatur oleh Administrator.");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none group ${
                  schoolIdentity?.apkUrl 
                    ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800 border-emerald-250 shadow-3xs" 
                    : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                }`}
              >
                <Smartphone size={14} className={`${schoolIdentity?.apkUrl ? "text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)] group-hover:scale-110" : "text-emerald-300/60"} transition-transform stroke-[2.5]`} />
                <span>Android APK</span>
              </a>
              <a
                href={schoolIdentity?.iosUrl || "#"}
                target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!schoolIdentity?.iosUrl) {
                    e.preventDefault();
                    alert("Link unduhan iOS belum diatur oleh Administrator.");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none group ${
                  schoolIdentity?.iosUrl 
                    ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-800 border-sky-250 shadow-3xs" 
                    : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                }`}
              >
                <Apple size={14} className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`} />
                <span>iOS Apple</span>
              </a>
            </div>
          </div>
        </div>

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
            <button
              type="button"
              onClick={() => setActiveTab('gaji_guru')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'gaji_guru'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              💵 Gaji Guru
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
                title="Cetak Buku Kas / Simpan PDF Sesuai Hasil Filter Kategori/Pos Saat Ini"
              >
                <Printer size={13} />
                <span>Cetak Buku Kas ({filterCategory === 'all' ? 'Global' : filterCategory})</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcelLedger}
                className="p-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs font-display"
                title="Ekspor Buku Kas Sesuai Hasil Filter Kategori/Pos ke Spreadsheet Excel"
              >
                <Download size={13} className="text-emerald-700" />
                <span>Unduh Excel ({filterCategory === 'all' ? 'Global' : filterCategory})</span>
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kas Operasional Utama</span>
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

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Form to add */}
                  <form onSubmit={handleAddBudgetCategory} className="md:col-span-5 flex flex-col gap-3 p-4 bg-slate-150/40 border border-slate-200 rounded-2xl">
                    <h5 className="text-[11px] font-black text-slate-750 uppercase tracking-wide">🆕 Daftarkan POS Baru</h5>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama POS BUDGET Baru</label>
                      <input
                        type="text"
                        placeholder="Contoh: Dana BOS, Kegiatan Siswa..."
                        value={newBudgetCatInput}
                        onChange={(e) => setNewBudgetCatInput(e.target.value)}
                        className="w-full mt-1 p-2 bg-white text-xs border border-slate-250 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Penentuan Aliran Kas POS</label>
                      <select
                        value={newBudgetCatType}
                        onChange={(e) => setNewBudgetCatType(e.target.value as 'incoming' | 'outgoing' | 'both')}
                        className="w-full mt-1 p-2 bg-white text-xs border border-slate-250 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="both">Keduanya / Umum (Pemasukan &amp; Pengeluaran)</option>
                        <option value="incoming">Hanya Pemasukan / Penerimaan Dana (+)</option>
                        <option value="outgoing">Hanya Pengeluaran / Penyaluran Dana (-)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs transition-all text-center"
                    >
                      Daftarkan POS BUDGET
                    </button>
                  </form>

                  {/* Registered List */}
                  <div className="md:col-span-7">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Kategori POS Aktif saat ini</label>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl font-bold text-[11px] select-none border border-slate-300 flex items-center gap-1.5 shadow-3xs">
                        <span>🔒 SPP (Sistem)</span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded text-[8px] font-black">Pemasukan</span>
                      </span>
                      <span className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl font-bold text-[11px] select-none border border-slate-300 flex items-center gap-1.5 shadow-3xs">
                        <span>🔒 Tabungan (Sistem)</span>
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded text-[8px] font-black">Umum</span>
                      </span>
                      {categories.map((cat) => {
                        if (editingCategory === cat.name) {
                          return (
                            <form 
                              key={cat.name} 
                              onSubmit={handleEditBudgetCategory} 
                              className="w-full max-w-xs flex flex-col gap-2 p-3.5 bg-slate-100 border border-slate-350 rounded-2xl text-[11px] font-extrabold text-slate-800 shadow-xs animate-fade-in text-left"
                            >
                              <div className="text-slate-800 font-extrabold text-[10px] border-b pb-1 border-slate-200">
                                ⚙️ Ubah POS BUDGET
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-450 block mb-0.5 uppercase tracking-wide">Nama POS</label>
                                <input
                                  type="text"
                                  value={editCategoryInput}
                                  onChange={(e) => setEditCategoryInput(e.target.value)}
                                  className="w-full p-1.5 bg-white text-[11px] font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
                                  autoFocus
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-450 block mb-0.5 uppercase tracking-wide">Tipe Aliran</label>
                                <select
                                  value={editCategoryType}
                                  onChange={(e) => setEditCategoryType(e.target.value as 'incoming' | 'outgoing' | 'both')}
                                  className="w-full p-1.5 bg-white text-[11px] font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
                                >
                                  <option value="both">Keduanya (Pemasukan &amp; Pengeluaran)</option>
                                  <option value="incoming">Hanya Pemasukan (+)</option>
                                  <option value="outgoing">Hanya Pengeluaran (-)</option>
                                </select>
                              </div>
                              <div className="flex gap-1.5 justify-end mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(null);
                                    setEditCategoryInput('');
                                  }}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-250 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                                >
                                  Batal
                                </button>
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                                >
                                  Simpan
                                </button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div key={cat.name} className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100/55 border border-slate-200 rounded-xl text-[11px] font-extrabold text-slate-800 shadow-3xs transition-all animate-fade-in">
                            <span className="flex items-center gap-1.5">
                              <span>{cat.name}</span>
                              {cat.type === 'incoming' && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded text-[8.5px] font-black">Pemasukan</span>
                              )}
                              {cat.type === 'outgoing' && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1 py-0.2 rounded text-[8.5px] font-black">Pengeluaran</span>
                              )}
                              {cat.type === 'both' && (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded text-[8.5px] font-black">Umum</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat.name);
                                setEditCategoryInput(cat.name);
                                setEditCategoryType(cat.type);
                              }}
                              className="p-0.5 hover:bg-indigo-100 hover:text-indigo-600 rounded text-slate-400 font-bold cursor-pointer transition-all inline-flex items-center justify-center ml-1"
                              title={`Ubah Nama & Tipe ${cat.name}`}
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBudgetCategory(cat.name)}
                              className="p-0.5 hover:bg-rose-100 hover:text-rose-600 rounded text-slate-400 font-black cursor-pointer leading-none text-xs ml-0.5"
                              title={`Hapus Pos ${cat.name}`}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Horizontal rule splitter */}
                <hr className="my-5 border-slate-205" />

                {/* Transfer Form block */}
                <div>
                  <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    💸 Pindahkan Dana Antar POS BUDGET
                  </h4>
                  <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed mb-4">
                    Pindahkan anggaran saldo netto dari satu POS (sumber) ke POS lainnya (tujuan) secara langsung. Sistem akan mendebit POS sumber dan mengkredit POS tujuan secara otomatis dan tercatat aman di riwayat buku kas.
                  </p>

                  {transferMessage && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4 ${
                      transferMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 animate-fade-in' : 'bg-rose-50 text-rose-800 border border-rose-200 animate-fade-in'
                    }`}>
                      {transferMessage.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-rose-600" />}
                      <span>{transferMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleTransferBudget} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-white p-4 border border-slate-200 rounded-2xl text-left shadow-2xs">
                    {/* Source POS */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">POS Angg. Sumber</label>
                      <select
                        required
                        value={transferSource}
                        onChange={(e) => setTransferSource(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-bold text-slate-850 text-xs cursor-pointer"
                      >
                        <option value="">-- Pilih POS Sumber --</option>
                         {categories.map(c => (
                          <option key={`src-${c.name}`} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Target POS */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">POS Angg. Tujuan</label>
                      <select
                        required
                        value={transferTarget}
                        onChange={(e) => setTransferTarget(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-bold text-slate-850 text-xs cursor-pointer"
                      >
                        <option value="">-- Pilih POS Tujuan --</option>
                        {categories.filter(c => c.name !== transferSource).map(c => (
                          <option key={`tgt-${c.name}`} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Jumlah Pindahan (Rp)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Contoh: 50000"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 text-xs border border-slate-200 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800"
                      />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Keterangan / Memo</label>
                      <input
                        type="text"
                        required
                        placeholder="Keterangan alokasi..."
                        value={transferDescription}
                        onChange={(e) => setTransferDescription(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 text-xs border border-slate-200 rounded-xl focus:border-slate-800 focus:outline-none font-bold text-slate-800"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isTransferring}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer transition-all inline-flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10"
                    >
                      <span>🔄</span>
                      <span>{isTransferring ? 'Memproses...' : 'Kirim Dana'}</span>
                    </button>
                  </form>
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
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Date Filters Row */}
              <div className="flex flex-wrap items-center gap-3 p-3 bg-indigo-50/45 rounded-xl border border-indigo-100 mt-1">
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5 pl-1 shrink-0">
                  <Calendar size={13} className="text-indigo-650" /> Filter Rentang Tanggal:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="text-xs font-bold p-1.5 border border-slate-250 rounded-lg bg-white text-slate-700 outline-none w-[130px]"
                    title="Tanggal Mulai"
                  />
                  <span className="text-slate-400 text-xs font-semibold">s/d</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="text-xs font-bold p-1.5 border border-slate-250 rounded-lg bg-white text-slate-700 outline-none w-[130px]"
                    title="Tanggal Selesai"
                  />
                </div>
                {(filterStartDate || filterEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-extrabold uppercase hover:underline ml-auto cursor-pointer"
                  >
                    Hapus Filter Tanggal ×
                  </button>
                )}
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
                            {tx.recipientName && (
                              <div className="text-[10px] text-amber-700 font-extrabold mt-0.5 inline-flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <UserCheck size={9} />
                                <span>Penerima: {tx.recipientName}</span>
                              </div>
                            )}
                            {tx.fundingSource && (
                              <div className="text-[10px] text-emerald-800 font-extrabold mt-0.5 inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <DollarSign size={9} />
                                <span>Sumber Dana: {tx.fundingSource}</span>
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
                                  onClick={() => setActivePrintTransaction(tx)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg cursor-pointer transition-all"
                                  title="Cetak Kuitansi / Nota Resmi"
                                >
                                  <Printer size={13} />
                                </button>
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

          {/* ================= TAB 4: TEACHER PAYROLL SYSTEM ================= */}
          {activeTab === 'gaji_guru' && (
            <div className="flex flex-col gap-6 text-slate-800 text-left bg-transparent animate-none">
              
              {/* Header Info */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">💵 Sistem Penggajian Guru (Payroll)</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manajemen penggajian terpadu Guru Mata Pelajaran (berdasarkan pencantuman teaching journal) dan Wali Kelas yang terhubung langsung ke Buku Kas Pengeluaran.
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCfgBaseSalaryHomeroom(String(salaryConfig?.baseSalaryHomeroom || '1500000'));
                      setCfgBaseSalarySubject(String(salaryConfig?.baseSalarySubject || '1200000'));
                      setCfgHomeroomAllowanceRate(String(salaryConfig?.homeroomAllowanceRate || '500000'));
                      setCfgJournalRate(String(salaryConfig?.journalRate || '50000'));
                      setShowConfigModal(true);
                    }}
                    className="flex-1 md:flex-initial p-2.5 px-4 bg-white border border-slate-250 hover:bg-slate-100 text-slate-750 font-semibold rounded-xl text-xs font-sans inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <span>⚙️ Atur Tarif Standar</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-3xl flex flex-col justify-between shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">TOTAL DRAF GAJI</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <h3 className="font-extrabold text-base tracking-tight font-mono">{statsGaji.totalCount}</h3>
                    <span className="text-[9px] text-slate-400">gTT/PTT</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">Total draf gaji bulan {salaryMonth}</p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-3xl flex flex-col justify-between shadow-2xs">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">TOTAL SUDAH DIBAYAR</span>
                  <div className="mt-2.5 flex items-baseline gap-1 text-emerald-850">
                    <h3 className="font-extrabold text-sm md:text-base tracking-tight font-mono">Rp {statsGaji.paidSum.toLocaleString('id-ID')}</h3>
                  </div>
                  <p className="text-[10px] text-emerald-650 font-bold mt-1 leading-tight">{statsGaji.paidCount} data telah ditransfer/dicairkan</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-150 rounded-3xl flex flex-col justify-between shadow-2xs">
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">TOTAL BELUM DIBAYAR</span>
                  <div className="mt-2.5 flex items-baseline gap-1 text-amber-850">
                    <h3 className="font-extrabold text-sm md:text-base tracking-tight font-mono">Rp {statsGaji.unpaidSum.toLocaleString('id-ID')}</h3>
                  </div>
                  <p className="text-[10px] text-amber-655 font-bold mt-1 leading-tight">{statsGaji.unpaidCount} data draf gaji berstatus antrean</p>
                </div>

                <div className="p-4 bg-sky-50 border border-sky-150 rounded-3xl flex flex-col justify-between shadow-2xs">
                  <span className="text-[9px] font-bold text-sky-605 uppercase tracking-wider">HARGA JASA JURNAL</span>
                  <div className="mt-2.5 flex items-baseline gap-1 text-sky-850">
                    <h3 className="font-extrabold text-sm md:text-base tracking-tight font-mono">Rp {(salaryConfig?.journalRate || 50000).toLocaleString('id-ID')}</h3>
                  </div>
                  <p className="text-[10px] text-sky-650 font-bold mt-1 leading-tight">Insentif per mengajar (teaching journal)</p>
                </div>
              </div>

              {/* Generator & Filtering Bar */}
              <div className="p-5 bg-white border border-slate-200 rounded-3xl flex flex-col gap-4 shadow-3xs text-left">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-3 justify-between pb-3 border-b border-slate-100">
                  <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">PILIH BULAN PENGGAJIAN</label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="month"
                        value={salaryMonth}
                        onChange={(e) => setSalaryMonth(e.target.value)}
                        className="p-2.5 border border-slate-250 rounded-xl focus:border-slate-800 focus:outline-none text-xs font-bold font-mono text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateGaji}
                        disabled={isGeneratingGaji}
                        className="p-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        {isGeneratingGaji ? 'Memproses...' : '📥 Generate Gaji Bulanan'}
                      </button>
                    </div>
                  </div>

                  <div className="text-slate-500 text-[10.5px] leading-relaxed max-w-md md:text-right">
                    Sistem otomatis mendaftar wali kelas dan menghitung teaching journal guru mapel selama periode yang ditentukan untuk menerbitkan draf penggajian.
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Cari Nama Guru</label>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Nama guru..."
                        value={gajiSearch}
                        onChange={(e) => setGajiSearch(e.target.value)}
                        className="w-full p-2.5 pl-8 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50/50 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Peran Guru</label>
                    <select
                      value={gajiTypeFilter}
                      onChange={(e) => setGajiTypeFilter(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white text-xs font-bold text-slate-705"
                    >
                      <option value="all">Semua Guru (Wali &amp; Mapel)</option>
                      <option value="homeroom">Wali Kelas</option>
                      <option value="subject_teacher">Guru Mapel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Status Pencairan</label>
                    <select
                      value={gajiStatusFilter}
                      onChange={(e) => setGajiStatusFilter(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white text-xs font-bold text-slate-705"
                    >
                      <option value="all">Semua Status</option>
                      <option value="paid">Paid (Sudah Ditransfer)</option>
                      <option value="unpaid">Unpaid (Antrean / Draf)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                    <span>🧾 Daftar Gaji Guru</span>
                    <span className="p-1 px-2.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-mono font-black">{filteredSalaries.length} Records</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold font-mono">Periode Bulan: {salaryMonth}</span>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 text-[9px] font-bold uppercase tracking-wider select-none">
                        <th className="p-3.5 pl-5">NAMA GURU</th>
                        <th className="p-3.5">PERAN</th>
                        <th className="p-3.5 text-right">GAJI POKOK</th>
                        <th className="p-3.5 text-right">TUNJANGAN</th>
                        <th className="p-3.5 text-center">JURNAL (MAPEL)</th>
                        <th className="p-3.5 text-right">POTONGAN</th>
                        <th className="p-3.5 text-right">NET DITERIMA</th>
                        <th className="p-3.5 text-center">STATUS</th>
                        <th className="p-3.5 pr-5 text-center">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-semibold text-slate-705">
                      {filteredSalaries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-slate-400">
                             Tidak ada draf penggajian ditemukan untuk kriteria filter bulan ini. Silakan klik <strong>Generate Gaji Bulanan</strong> di atas untuk kalkulasi berkas perdana.
                          </td>
                        </tr>
                      ) : (
                        filteredSalaries.map((s) => {
                          const totalTunjangan = s.homeroomAllowance + s.otherAllowance;
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3.5 pl-5 font-black text-slate-900">{s.teacherName}</td>
                              <td className="p-3.5">
                                {s.teacherType === 'homeroom' ? (
                                  <span className="p-1 px-2 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold">Wali Kelas</span>
                                ) : (
                                  <span className="p-1 px-2 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-bold">Guru Mapel</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right font-mono text-slate-900">Rp {s.baseSalary.toLocaleString('id-ID')}</td>
                              <td className="p-3.5 text-right font-mono text-slate-650">
                                {totalTunjangan > 0 ? `Rp ${totalTunjangan.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="p-3.5 text-center">
                                {s.teacherType === 'subject_teacher' ? (
                                  <span className="text-[11px]" title={`Mengajar: ${s.journalCount} jurnal @ Rp ${s.journalRate.toLocaleString('id-ID')}`}>
                                    <strong className="font-mono text-indigo-650">{s.journalCount}</strong> <span className="text-slate-400">× Rp {s.journalRate.toLocaleString('id-ID')}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-350">-</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right font-mono text-rose-600">
                                {s.deductions > 0 ? `Rp ${s.deductions.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="p-3.5 text-right font-black font-mono text-slate-900 bg-indigo-50/20">
                                Rp {s.totalAmount.toLocaleString('id-ID')}
                              </td>
                              <td className="p-3.5 text-center">
                                {s.status === 'paid' ? (
                                  <span className="p-1 px-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-extrabold inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    <span>PAID</span>
                                  </span>
                                ) : (
                                  <span className="p-1 px-2.5 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-extrabold inline-flex items-center gap-1 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    <span>UNPAID</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 pr-5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {s.status === 'unpaid' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handlePayGaji(s.id)}
                                        className="p-1 px-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                                        title="Bayarkan Gaji"
                                      >
                                        💸 Bayar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingGaji(s);
                                          setEditBaseSalary(String(s.baseSalary));
                                          setEditHomeroomAllowance(String(s.homeroomAllowance));
                                          setEditTunjanganMasaKerja(String(s.tunjanganMasaKerja || 0));
                                          setEditVakasi(String(s.vakasi || (s.journalCount * s.journalRate)));
                                          setEditPotonganDanaSosial(String(s.potonganDanaSosial || 0));
                                          setEditPotonganAbsen(String(s.potonganAbsen || 0));
                                          setEditPotonganLain(String(s.potonganLain || 0));
                                          setEditOtherAllowance(String(s.otherAllowance));
                                          setEditDeductions(String(s.deductions));
                                          setEditNotes(s.notes || '');
                                          setShowEditPayModal(true);
                                        }}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                                        title="Sesuaikan/Penyesuaian"
                                      >
                                        <Edit3 size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGaji(s.id)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReceiptGaji(s);
                                        setShowReceiptModal(true);
                                      }}
                                      className="p-1 px-2.5 bg-indigo-50 border border-indigo-150 text-indigo-650 hover:bg-indigo-100 rounded-lg text-[9.5px] font-bold cursor-pointer transition-all flex items-center gap-1"
                                      title="Cetak Slip Gaji Resmi"
                                    >
                                      <Printer size={11} className="stroke-[2.5]" />
                                      <span>Slip Gaji</span>
                                    </button>
                                  )}
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
                    setActiveTab('gaji_guru');
                    setShowMoreMenu(false);
                  }}
                  className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                >
                  <span className="p-2 w-fit bg-emerald-50 rounded-xl text-emerald-600 text-lg">💵</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Gaji Guru (Payroll)</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Kelola dan bayarkan gaji guru mapel &amp; wali kelas</p>
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

              {/* Quick access to download Mobile Apps in the bottom sheet menu */}
              <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  📲 Unduh Aplikasi Mobile Resmi
                </span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Gunakan aplikasi mobile resmi untuk kemudahan akses monitor kas tabungan, rekonsiliasi SPP, &amp; data lembaga langsung lewat HP.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <a
                    href={schoolIdentity?.apkUrl || "#"}
                    target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.apkUrl) {
                        e.preventDefault();
                        alert("Link unduhan Android belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.apkUrl 
                        ? "bg-emerald-50 hover:bg-emerald-105 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Smartphone size={13} className={schoolIdentity?.apkUrl ? "text-emerald-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">Android APK</span>
                  </a>

                  <a
                    href={schoolIdentity?.iosUrl || "#"}
                    target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!schoolIdentity?.iosUrl) {
                        e.preventDefault();
                        alert("Link unduhan iOS belum diatur oleh Administrator.");
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none group font-extrabold ${
                      schoolIdentity?.iosUrl 
                        ? "bg-sky-50 hover:bg-sky-105 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs" 
                        : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                    }`}
                  >
                    <Apple size={13} className={schoolIdentity?.iosUrl ? "text-sky-600 group-hover:scale-110 transition-transform" : "text-slate-350"} />
                    <span className="text-[10px]">iOS Apple</span>
                  </a>
                </div>
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
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    KATEGORI POS BUDGET ({formType === 'incoming' ? 'MASUK' : 'KELUAR'})
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 text-xs focus:outline-none focus:border-slate-800 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        📊 {c.name} ({c.type === 'both' ? 'Umum' : c.type === 'incoming' ? 'Pemasukan saja' : 'Pengeluaran saja'})
                      </option>
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

                {/* 5.1. Sumber Dana (Penerimaan/Pemasukan Only) */}
                {formType === 'incoming' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-1"
                  >
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SUMBER DANA PENERIMAAN</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contoh: Dana BOS, Komite/SPP, Yayasan, Donatur, Koperasi..."
                        value={formFundingSource}
                        onChange={(e) => setFormFundingSource(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <DollarSign size={14} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Dana BOS', 'Iuran SPP / Komite', 'Yayasan', 'Donasi / Hibah', 'Hasil Kantin / Usaha'].map((srcOption) => (
                        <button
                          key={srcOption}
                          type="button"
                          onClick={() => setFormFundingSource(srcOption)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                            formFundingSource === srcOption 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {srcOption}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 5.5. Nama Penerima Dana (Pengeluaran Only) */}
                {formType === 'outgoing' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">NAMA PENERIMA DANA (PENANGGUNG JAWAB)</label>
                      <label className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 cursor-pointer hover:bg-indigo-100/60 select-none transition-all">
                        <input
                          type="checkbox"
                          checked={isCustomRecipient}
                          onChange={(e) => {
                            setIsCustomRecipient(e.target.checked);
                            if (!e.target.checked) {
                              setFormRecipientName('');
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-550 w-3 h-3"
                        />
                        <span>Nama Custom</span>
                      </label>
                    </div>

                    <div className="relative">
                      {isCustomRecipient ? (
                        <>
                          <input
                            type="text"
                            required={formType === 'outgoing'}
                            placeholder="Ketik nama penerima custom..."
                            value={formRecipientName}
                            onChange={(e) => setFormRecipientName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <UserCheck size={14} />
                          </div>
                        </>
                      ) : (
                        <>
                          <select
                            required={formType === 'outgoing'}
                            value={formRecipientName}
                            onChange={(e) => setFormRecipientName(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold bg-white cursor-pointer focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 appearance-none"
                          >
                            <option value="">-- Pilih Guru / Wali Kelas / Staf --</option>
                            {homerooms.length > 0 && (
                              <optgroup label="Wali Kelas">
                                {homerooms.map((hr) => (
                                  <option key={hr.id} value={hr.name}>
                                    {hr.name} (Wali Kelas {hr.className})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {subjectTeachers.length > 0 && (
                              <optgroup label="Guru Mata Pelajaran">
                                {subjectTeachers.map((st) => (
                                  <option key={st.id} value={st.name}>
                                    {st.name} (Guru {st.subject})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <UserCheck size={14} />
                          </div>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[8px]">
                            ▼
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-left w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6 border flex flex-col gap-4 font-semibold text-xs text-slate-800"
            >
              
              {/* Format Selection Switcher */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl no-print text-[11px] font-bold text-slate-650 w-full justify-center">
                <button
                  type="button"
                  onClick={() => setReceiptPrintFormat('standard')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${receiptPrintFormat === 'standard' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Format Standar (A4/Kuitansi)
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPrintFormat('thermal')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${receiptPrintFormat === 'thermal' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Format Thermal (Roll Kasir)
                </button>
              </div>

              {/* Receipt Wrapper div with print-receipt-section id */}
              <div 
                id="print-receipt-section"
                className={receiptPrintFormat === 'thermal'
                  ? "bg-white text-slate-900 p-2 font-mono flex flex-col gap-2.5 text-[10px] leading-tight text-center relative print-thermal w-full max-w-[76mm] mx-auto border-none select-all"
                  : "bg-white text-left w-full flex flex-col gap-4 font-semibold text-xs text-slate-800"
                }
              >
                {receiptPrintFormat === 'thermal' ? (
                  /* THERMAL SYSTEM FOR TREASURER TRANSACTIONS */
                  <div className="flex flex-col gap-2.5 text-slate-900 font-mono text-left select-all">
                    {/* Small Header */}
                    <div className="text-center font-black uppercase text-xs tracking-wider border-b border-dashed border-slate-900 pb-2.5">
                      <span className="block text-sm font-extrabold">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                      <span className="block text-[8px] font-normal normal-case leading-none mt-1">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</span>
                      <span className="block text-[7.5px] font-normal mt-0.5">{schoolIdentity?.address || "Pasuruan, Jawa Timur"}</span>
                    </div>

                    <div className="text-center font-mono font-bold uppercase text-[9px] py-1 border-b border-dashed border-slate-900">
                      <span>* {activePrintTransaction.type === 'incoming' ? 'BUKTI PENERIMAAN' : 'BUKTI PENGELUARAN'} *</span>
                      <p className="text-[8px] font-mono normal-case tracking-tight mt-0.5">REF: {activePrintTransaction.id.toUpperCase()}</p>
                      <p className="text-[8.5px] font-normal normal-case mt-0.5">Tgl: {activePrintTransaction.date}</p>
                    </div>

                    {/* Transaction Details */}
                    <div className="flex flex-col gap-0.5 text-[8.5px] pb-1.5 border-b border-dashed border-slate-900 uppercase">
                      <div className="flex justify-between">
                        <span>Kategori Pos:</span>
                        <span className="font-bold">{activePrintTransaction.category}</span>
                      </div>
                      {activePrintTransaction.studentName && (
                        <div className="flex justify-between">
                          <span>Siswa:</span>
                          <span className="font-bold">{activePrintTransaction.studentName}</span>
                        </div>
                      )}
                      {activePrintTransaction.nis && (
                        <div className="flex justify-between">
                          <span>NIS:</span>
                          <span className="font-mono">{activePrintTransaction.nis}</span>
                        </div>
                      )}
                      {activePrintTransaction.recipientName && (
                        <div className="flex justify-between">
                          <span>Penerima Dana:</span>
                          <span className="font-bold text-rose-700">{activePrintTransaction.recipientName}</span>
                        </div>
                      )}
                      {activePrintTransaction.fundingSource && (
                        <div className="flex justify-between">
                          <span>Sumber Dana:</span>
                          <span className="font-bold text-emerald-800">{activePrintTransaction.fundingSource}</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 mt-1 normal-case text-slate-650 font-normal">
                        <span>Rincian/Keterangan:</span>
                        <p className="font-bold uppercase text-slate-900 text-[8.5px]">{activePrintTransaction.description}</p>
                      </div>
                    </div>

                    {/* Numeric price summary */}
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase py-1 border-b border-dashed border-slate-900">
                      <span>Jumlah Dana:</span>
                      <span className="font-mono text-xs">Rp {activePrintTransaction.amount.toLocaleString('id-ID')}</span>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 text-[8px] text-center uppercase gap-2 pt-2">
                      <div className="flex flex-col justify-between h-[45px]">
                        <span>Kepala Sekolah</span>
                        <div className="h-4"></div>
                        <span className="font-bold border-t border-slate-900 pt-0.5 truncate">({schoolIdentity.principal.substring(0, 12)})</span>
                      </div>
                      <div className="flex flex-col justify-between h-[45px]">
                        <span>{activePrintTransaction.type === 'incoming' ? 'Teller / Penerima' : 'Ybs / Penerima Dana'}</span>
                        <div className="h-4"></div>
                        <span className="font-bold border-t border-slate-900 pt-0.5">({schoolIdentity.treasurer.substring(0, 12)})</span>
                      </div>
                    </div>

                    <div className="text-center text-[7px] leading-none tracking-tight mt-4 text-slate-550 border-t border-dotted border-slate-900 pt-2 uppercase">
                      *** TERIMA KASIH ***
                      <p className="mt-1 font-mono text-[6.5px] tracking-widest text-[6px]">SMP Ma'arif NU Pandaan</p>
                    </div>
                  </div>
                ) : (
                  /* STANDARD LAYOUT */
                  <>
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
                      <div className="text-right text-[9px] font-bold text-slate-400">
                        {activePrintTransaction.type === 'incoming' ? 'BUKTI PENERIMAAN' : 'BUKTI PENGELUARAN'}
                      </div>
                    </div>

                    {/* Card Contents */}
                    <div className="text-center py-2 bg-slate-50 rounded-lg">
                      <h4 className="text-[10px] text-slate-400 uppercase tracking-widest leading-none font-bold">
                        {activePrintTransaction.type === 'incoming' ? 'KUITANSI PENERIMAAN' : 'NOTA PENGELUARAN BENDAHARA'}
                      </h4>
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
                        {activePrintTransaction.type === 'incoming' ? 'DEBIT (Uang Masuk / Pembayaran)' : 'KREDIT (Uang Keluar / Pengeluaran)'}
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

                      {activePrintTransaction.recipientName && (
                        <>
                          <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Penerima Dana:</span>
                          <span className="col-span-8 font-bold text-rose-700">
                            {activePrintTransaction.recipientName}
                          </span>
                        </>
                      )}
                      
                      {activePrintTransaction.fundingSource && (
                        <>
                          <span className="col-span-4 text-slate-400 font-semibold uppercase text-[9px]">Sumber Dana Penerimaan:</span>
                          <span className="col-span-8 font-bold text-emerald-800">
                            {activePrintTransaction.fundingSource}
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
                    <div className="grid grid-cols-2 mt-3 text-[10px] text-center gap-4">
                      <div>
                        <p>Mengetahui,</p>
                        <p className="font-extrabold mt-1 text-slate-400 uppercase text-[8px]">Kepala Sekolah</p>
                        <div className="h-12 flex items-center justify-center relative my-1">
                          {schoolIdentity.principalSignature && (
                            <img 
                              src={schoolIdentity.principalSignature} 
                              className="h-12 object-contain z-10" 
                              alt="Ttd Kepala Sekolah" 
                              referrerPolicy="no-referrer" 
                            />
                          )}
                          {schoolIdentity.schoolStamp && (
                            <img 
                              src={schoolIdentity.schoolStamp} 
                              className="h-12 object-contain absolute opacity-85 mix-blend-multiply scale-110 -translate-x-10 rotate-3 z-0" 
                              alt="Stempel Sekolah" 
                              referrerPolicy="no-referrer" 
                            />
                          )}
                          {!schoolIdentity.principalSignature && !schoolIdentity.schoolStamp && (
                            <div className="h-12"></div>
                          )}
                        </div>
                        <p className="underline underline-offset-1 font-extrabold font-display leading-none">{schoolIdentity.principal}</p>
                      </div>

                      {activePrintTransaction.type === 'outgoing' && activePrintTransaction.recipientName ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p>Penerima Dana,</p>
                            <p className="font-extrabold mt-1 text-slate-400 uppercase text-[8px]">Ybs. Penerima</p>
                            <div className="h-10 flex items-center justify-center">
                              <div className="w-12 border-b border-dashed border-slate-300 pt-8"></div>
                            </div>
                            <p className="underline underline-offset-1 font-extrabold font-display leading-none uppercase text-rose-700 truncate">{activePrintTransaction.recipientName}</p>
                          </div>
                          <div>
                            <p>Bendahara,</p>
                            <p className="font-extrabold mt-1 text-slate-400 uppercase text-[8px]">Kas Keluar</p>
                            <div className="h-10 flex items-center justify-center">
                              {schoolIdentity.treasurerSignature && <img src={schoolIdentity.treasurerSignature} className="h-9 object-contain" alt="Stamp" referrerPolicy="no-referrer" />}
                            </div>
                            <p className="underline underline-offset-1 font-extrabold font-display leading-none">{schoolIdentity.treasurer}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p>{activePrintTransaction.type === 'incoming' ? 'Teller Kas Penerima,' : 'Bendahara Keuangan / Pengeluaran,'}</p>
                          <p className="font-extrabold mt-1 text-slate-400 uppercase text-[8px]">Bendahara</p>
                          <div className="h-10 flex items-center justify-center">
                            {schoolIdentity.treasurerSignature && <img src={schoolIdentity.treasurerSignature} className="h-9 object-contain" alt="Stamp" referrerPolicy="no-referrer" />}
                          </div>
                          <p className="underline underline-offset-1 font-extrabold font-display leading-none">{schoolIdentity.treasurer}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Close Button */}
              <div className="flex gap-2 mt-4 no-print">
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
                    className="flex-1 py-1.5 border border-slate-205 hover:bg-slate-50 text-slate-700 rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPwd}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    {isChangingPwd ? 'Menyimpan...' : 'Simpan Sandi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Global Standard Tariff Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border text-left border-slate-250 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚙️</span>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-tight text-white">Tarif Standar Penggajian</h3>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mt-0.5">Konfigurasi Finansial</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer transition-all text-base"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="p-6 flex flex-col gap-4 text-xs font-semibold">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">GAJI POKOK WALI KELAS (BULANAN)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 1500000"
                    value={cfgBaseSalaryHomeroom}
                    onChange={(e) => setCfgBaseSalaryHomeroom(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                  />
                  <p className="text-[9.5px] text-slate-500 font-normal mt-1 leading-tight">Gaji pokok dasar guru berstatus wali kelas.</p>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">GAJI POKOK GURU MAPEL (BULANAN)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 1200000"
                    value={cfgBaseSalarySubject}
                    onChange={(e) => setCfgBaseSalarySubject(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                  />
                  <p className="text-[9.5px] text-slate-500 font-normal mt-1 leading-tight">Gaji pokok dasar guru pengajar (bukan wali kelas).</p>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">TUNJANGAN JABATAN WALI KELAS</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 500000"
                    value={cfgHomeroomAllowanceRate}
                    onChange={(e) => setCfgHomeroomAllowanceRate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                  />
                  <p className="text-[9.5px] text-slate-500 font-normal mt-1 leading-tight">Insentif bulanan tambahan kualifikasi wali kelas.</p>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">JASA GURU MAPEL PER JURNAL (MENGAJAR)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 50000"
                    value={cfgJournalRate}
                    onChange={(e) => setCfgJournalRate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                  />
                  <p className="text-[9.5px] text-slate-500 font-normal mt-1 leading-tight">Tarif yang dikalikan dengan jumlah teaching journal guru mapel.</p>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">TUNJANGAN MASA KERJA STANDAR (BULANAN)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 150000"
                    value={cfgDefaultTunjanganMasaKerja}
                    onChange={(e) => setCfgDefaultTunjanganMasaKerja(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                  />
                  <p className="text-[9.5px] text-slate-500 font-normal mt-1 leading-tight">Nilai bawaan tunjangan pengabdian masa kerja guru.</p>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">POTONGAN DANA SOSIAL STANDAR (BULANAN)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 20000"
                    value={cfgDefaultPotonganDanaSosial}
                    onChange={(e) => setCfgDefaultPotonganDanaSosial(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold text-slate-800"
                  />
                  <p className="text-[9.5px] text-slate-500 font-normal mt-1 leading-tight">Nilai bawaan potongan kas iuran sosial kemanusiaan.</p>
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-slate-905 hover:bg-slate-950 text-white rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    Simpan Tarif
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Individual Salary Adjustment Modal */}
      <AnimatePresence>
        {showEditPayModal && editingGaji && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs print:hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border text-left border-slate-250 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-1.5 bg-indigo-950 rounded-lg text-indigo-400">✏️</span>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-tight text-white">Sesuaikan Nominal Gaji</h3>
                    <p className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider leading-none mt-0.5">{editingGaji.teacherName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPayModal(false);
                    setEditingGaji(null);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleUpdateGaji} className="p-6 flex flex-col gap-4 text-xs font-semibold bg-white max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 border-b border-dashed border-slate-200 pb-1 text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                    💰 Rincian Pendapatan &amp; Penerimaan
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">GAJI POKOK (RP)</label>
                    <input
                      type="number"
                      required
                      value={editBaseSalary}
                      onChange={(e) => setEditBaseSalary(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">TUNJ. JABATAN (RP)</label>
                    <input
                      type="number"
                      required
                      value={editHomeroomAllowance}
                      onChange={(e) => setEditHomeroomAllowance(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                      disabled={editingGaji.teacherType !== 'homeroom'}
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">TUNJ. MASA KERJA (RP)</label>
                    <input
                      type="number"
                      required
                      value={editTunjanganMasaKerja}
                      onChange={(e) => setEditTunjanganMasaKerja(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">VAKASI (RP)</label>
                    <input
                      type="number"
                      required
                      value={editVakasi}
                      onChange={(e) => setEditVakasi(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">INSENTIF LAIN (RP)</label>
                    <input
                      type="number"
                      required
                      value={editOtherAllowance}
                      onChange={(e) => setEditOtherAllowance(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-slate-800"
                    />
                  </div>

                  <div className="col-span-2 border-b border-dashed border-slate-200 pb-1 mt-2 text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                    💸 Rincian Pemotongan Gaji
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">DANA SOSIAL (RP)</label>
                    <input
                      type="number"
                      required
                      value={editPotonganDanaSosial}
                      onChange={(e) => setEditPotonganDanaSosial(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">KETIDAKHADIRAN (RP)</label>
                    <input
                      type="number"
                      required
                      value={editPotonganAbsen}
                      onChange={(e) => setEditPotonganAbsen(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">POTONGAN LAIN (RP)</label>
                    <input
                      type="number"
                      required
                      value={editPotonganLain}
                      onChange={(e) => setEditPotonganLain(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">ADMIN/KOMITE LAIN (RP)</label>
                    <input
                      type="number"
                      required
                      value={editDeductions}
                      onChange={(e) => setEditDeductions(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs text-rose-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1 tracking-wider">CATATAN PENYESUAIAN</label>
                  <textarea
                    placeholder="Alasan penyesuaian nominal, misal: Bonus Hari Raya, Potongan BPJS Ketenagakerjaan..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 h-16 resize-none focus:outline-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditPayModal(false);
                      setEditingGaji(null);
                    }}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold cursor-pointer transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all text-center shadow-xs"
                  >
                    Simpan Penyesuaian
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Official Teacher Salary Slip Print Representation Overlay */}
      <AnimatePresence>
        {showReceiptModal && receiptGaji && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs print:p-0 print:bg-white print:backdrop-blur-none transition-all">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border text-left border-slate-250 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none"
            >
              {/* Header inside overlay modal, hidden on print */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-1.5 bg-slate-850 rounded-lg text-slate-355">📄</span>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-tight text-white">Slip Gaji Resmi Guru</h3>
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none mt-0.5">Preview &amp; Cetak Berkas</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setReceiptGaji(null);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all text-base leading-none"
                >
                  &times;
                </button>
              </div>

              {/* Action controller bar - Hidden during print */}
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
                <span className="text-[10px] text-slate-500 font-bold">Tekan tombol cetak untuk mencatat fisik kuitansi</span>
                <button
                  type="button"
                  onClick={() => {
                    const style = document.createElement('style');
                    style.id = 'salary-print-style';
                    style.innerHTML = `@media print {
                      body * { visibility: hidden; }
                      #print-salary-slip, #print-salary-slip * { visibility: visible; }
                      #print-salary-slip { position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 0 !important; margin: 0 !important; }
                    }`;
                    document.head.appendChild(style);
                    window.print();
                    setTimeout(() => {
                      const element = document.getElementById('salary-print-style');
                      if (element) element.remove();
                    }, 500);
                  }}
                  className="p-1.5 px-3 bg-indigo-650 hover:bg-indigo-755 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer size={12} />
                  <span>Cetak Slip Gaji</span>
                </button>
              </div>

              {/* Exact printable segment using CSS print utility */}
              <div id="print-salary-slip" className="p-8 bg-white text-slate-900 font-sans leading-relaxed select-all">
                
                {/* Letterhead */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3.5 mb-5 select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center font-extrabold tracking-tighter text-[11px] uppercase">
                      <span>MA'ARIF</span>
                      <span className="text-[7.5px] font-bold -mt-1 text-yellow-350">NU</span>
                    </div>
                    <div>
                      <h2 className="text-xs uppercase md:text-sm font-black tracking-tight text-slate-955">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</h2>
                      <p className="text-[9.5px] font-bold text-slate-500 leading-tight">{schoolIdentity?.subheading || "Lembaga Pendidikan Maarif Nahdlatul Ulama"}</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">{schoolIdentity?.address || "Jl. Pandaan Pasuruan Jawa Timur"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="p-1 px-2.5 bg-slate-900 text-white font-mono font-black text-[8px] tracking-widest rounded-md uppercase">SLIP GAJI RESMI</span>
                    <p className="text-[9.5px] text-slate-500 font-bold font-mono mt-2">Bulan: {receiptGaji.month}</p>
                  </div>
                </div>

                {/* Sub Metadata Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-semibold text-slate-705 mb-5 ">
                  <div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Penerima Gaji:</span>
                      <span className="font-extrabold text-slate-900">{receiptGaji.teacherName}</span>
                    </div>
                    <div className="flex justify-between py-1 mt-1 border-b border-slate-100">
                      <span className="text-slate-400">Tipe/Peran Guru:</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {receiptGaji.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                      <span className="text-slate-400">ID Berkas:</span>
                      <span className="font-bold text-slate-700">{receiptGaji.id.substring(0, 10).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between py-1 mt-1 border-b border-slate-100 font-mono">
                      <span className="text-slate-400">Tanggal Bayar:</span>
                      <span className="font-bold text-emerald-800">{receiptGaji.paidAt ? receiptGaji.paidAt.substring(0, 10) : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Main Ledger Calculations */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5 text-[11px] font-semibold">
                  <div className="bg-slate-50 p-2.5 border-b border-slate-200 font-black text-slate-850 uppercase tracking-wider text-[9px]">
                    RINCIAN PENDAPATAN & potongan
                  </div>

                  {/* Lines */}
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between p-3 bg-white">
                      <div>
                        <span>Gaji Pokok Dasar</span>
                        <p className="text-[9.5px] text-slate-400 font-normal">Sesuai status {receiptGaji.teacherType === 'homeroom' ? 'Wali Kelas' : 'Guru Mapel'}</p>
                      </div>
                      <span className="font-bold font-mono text-slate-900">Rp {receiptGaji.baseSalary.toLocaleString('id-ID')}</span>
                    </div>

                    {receiptGaji.homeroomAllowance > 0 && (
                      <div className="flex justify-between p-3 bg-white">
                        <div>
                          <span>Tunjangan Tugas Tambahan Wali Kelas</span>
                          <p className="text-[9.5px] text-slate-400 font-normal">Tunjangan intensif jabatan</p>
                        </div>
                        <span className="font-bold font-mono text-slate-900">Rp {receiptGaji.homeroomAllowance.toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {(receiptGaji.tunjanganMasaKerja || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-white">
                        <div>
                          <span>Tunjangan Masa Kerja</span>
                          <p className="text-[9.5px] text-slate-400 font-normal">Tunjangan pengabdian masa kerja mengajar</p>
                        </div>
                        <span className="font-bold font-mono text-slate-900">Rp {(receiptGaji.tunjanganMasaKerja || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {(receiptGaji.vakasi || (receiptGaji.journalCount * receiptGaji.journalRate)) > 0 && (
                      <div className="flex justify-between p-3 bg-white">
                        <div>
                          <span>Vakasi (Jasa Jam Mengajar Jurnal)</span>
                          <p className="text-[9.5px] text-slate-400 font-normal">
                             Total {receiptGaji.journalCount} laporan teaching journal × Rp {(receiptGaji.journalRate || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <span className="font-bold font-mono text-slate-900">Rp {(receiptGaji.vakasi || (receiptGaji.journalCount * receiptGaji.journalRate)).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {receiptGaji.otherAllowance > 0 && (
                      <div className="flex justify-between p-3 bg-white">
                        <div>
                          <span>Insentif / Penyesuaian Lain</span>
                          <p className="text-[9.5px] text-slate-400 font-normal">Uang saku / insentif khusus kebijakan lembaga</p>
                        </div>
                        <span className="font-bold font-mono text-slate-900 flex items-center gap-1">
                          <span>Rp {receiptGaji.otherAllowance.toLocaleString('id-ID')}</span>
                        </span>
                      </div>
                    )}

                    {(receiptGaji.potonganDanaSosial || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-rose-50/10">
                        <div>
                          <span className="text-rose-900">Potongan Dana Sosial</span>
                          <p className="text-[9.5px] text-rose-505 font-normal">Iuran sosial wajib rutin bulanan</p>
                        </div>
                        <span className="font-bold font-mono text-rose-605">- Rp {(receiptGaji.potonganDanaSosial || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {(receiptGaji.potonganAbsen || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-rose-50/10">
                        <div>
                          <span className="text-rose-900">Potongan Ketidakhadiran</span>
                          <p className="text-[9.5px] text-rose-505 font-normal">Pinalti denda ketidakhadiran/absen</p>
                        </div>
                        <span className="font-bold font-mono text-rose-605">- Rp {(receiptGaji.potonganAbsen || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {(receiptGaji.potonganLain || 0) > 0 && (
                      <div className="flex justify-between p-3 bg-rose-50/10">
                        <div>
                          <span className="text-rose-900">Potongan Lain-lain</span>
                          <p className="text-[9.5px] text-rose-505 font-normal">Pemotongan kredit koperasi / simpan pinjam / denda lain</p>
                        </div>
                        <span className="font-bold font-mono text-rose-605">- Rp {(receiptGaji.potonganLain || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {receiptGaji.deductions > 0 && (
                      <div className="flex justify-between p-3 bg-rose-50/10">
                        <div>
                          <span className="text-rose-900">Potongan Administrasi Umum</span>
                          <p className="text-[9.5px] text-rose-505 font-normal">{receiptGaji.notes || 'Potongan iuran komite / simpanan wajib'}</p>
                        </div>
                        <span className="font-bold font-mono text-rose-605">- Rp {receiptGaji.deductions.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  {/* Net Amount Bar */}
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center text-xs font-black">
                    <span className="uppercase tracking-widest text-[10px]">TOTAL NET GAJI DITERIMA (NETO)</span>
                    <span className="text-sm font-mono tracking-tight font-black">Rp {receiptGaji.totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {receiptGaji.notes && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[10.5px] font-medium text-slate-650 leading-normal mb-8">
                     <strong>Catatan Gaji:</strong> {receiptGaji.notes}
                  </div>
                )}

                {/* Bottom Signatures */}
                <div className="grid grid-cols-2 text-center text-[11px] font-semibold text-slate-705 mt-10">
                  <div>
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] font-bold">Penerima Gaji (Guru)</p>
                    <div className="h-16"></div>
                    <p className="font-black text-slate-905 border-b border-dashed border-slate-300 w-32 mx-auto pb-1">{receiptGaji.teacherName}</p>
                    <p className="text-[9.5px] text-slate-400 leading-none mt-1">Guru {receiptGaji.teacherType === 'homeroom' ? 'Wali' : 'Mapel'}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 uppercase tracking-widest text-[8px] font-bold">Petugas Bendahara</p>
                    <div className="h-16 flex items-center justify-center font-serif text-[10px] text-slate-400 italic">
                      <span>Tercairkan Sistem</span>
                    </div>
                    <p className="font-black text-slate-905 border-b border-dashed border-slate-300 w-32 mx-auto pb-1">Uliyah Fitriyani, S.Pd</p>
                    <p className="text-[9.5px] text-slate-400 leading-none mt-1">Staf Keuangan Lembaga</p>
                  </div>
                </div>

                {/* Footer Legal */}
                <div className="text-center text-[8px] text-slate-350 tracking-widest uppercase mt-12 pt-4 border-t border-slate-105 select-none">
                  Bukti pembayaran sah secara komparatif sistem informasi keuangan Ma'arif NU
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
