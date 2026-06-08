import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, ShoppingCart, Users2, Search, Plus, Edit2, Trash2, 
  Printer, CheckCircle2, AlertTriangle, HelpCircle, ArrowLeft, Loader2, LogOut, Check, X,
  Home, LayoutGrid, Key, Lock, Smartphone, Apple, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { SchoolIdentity, HomeroomTeacher, SubjectTeacher, SarprasItem, SarprasProposal, SarprasLoan } from '../types';

// Helper component for printing crisp QR codes
function QRCodeElement({ value, size = 100 }: { value: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    const qrLink = window.location.origin + "/?scan=" + encodeURIComponent(value);
    QRCode.toDataURL(qrLink, {
      margin: 1.5,
      width: size,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (active) setQrUrl(url);
      })
      .catch(err => {
        console.error('QR Code generation error:', err);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 w-fit mx-auto">
      {qrUrl ? (
        <img 
          src={qrUrl} 
          alt={value} 
          width={size} 
          height={size} 
          className="mx-auto block"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div style={{ width: size, height: size }} className="bg-slate-50 animate-pulse rounded-lg mx-auto" />
      )}
      <span className="text-[9.5px] font-mono font-extrabold tracking-wider text-slate-800 uppercase mt-0.5">{value}</span>
    </div>
  );
}

interface WakaSarprasPanelProps {
  schoolIdentity?: SchoolIdentity;
  onLogout: () => void;
  homerooms: HomeroomTeacher[];
  subjectTeachers: SubjectTeacher[];
}

export default function WakaSarprasPanel({ schoolIdentity, onLogout, homerooms, subjectTeachers }: WakaSarprasPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'katalog' | 'pengajuan' | 'peminjaman' | 'laporan'>('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Custom expandable Categories and Locations saved in localStorage
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('sarpras_categories');
    return saved ? JSON.parse(saved) : ['Elektronik / Multimedia', 'Mebel / Furniture', 'Olahraga', 'Kesenian', 'Alat Tulis / Buku', 'Laboratorium', 'Lainnya'];
  });

  const [locations, setLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('sarpras_locations');
    return saved ? JSON.parse(saved) : ['Gudang Utama', 'Laboratorium IPA', 'Laboratorium Komputer', 'Ruang Guru', 'Ruang Kelas 7-A', 'Ruang Kelas 8-A', 'Perpustakaan'];
  });

  // Dynamic input states for categories & locations forms
  const [showManageCatLoc, setShowManageCatLoc] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [newLocInput, setNewLocInput] = useState('');

  // Barcode Print Selection States
  const [selectedBarcodeItems, setSelectedBarcodeItems] = useState<string[]>([]);
  const [barcodePrintData, setBarcodePrintData] = useState<SarprasItem[] | null>(null);

  // Auto coding states
  const [autoCode, setAutoCode] = useState(true);

  // Data State
  const [items, setItems] = useState<SarprasItem[]>([]);
  const [proposals, setProposals] = useState<SarprasProposal[]>([]);
  const [loans, setLoans] = useState<SarprasLoan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Custom dialog confirmation state to bypass blocked window.confirm inside iframes
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Form States - Items
  const [itemForm, setItemForm] = useState<{
    id?: string;
    name: string;
    code: string;
    category: string;
    condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
    location: string;
    totalQty: number;
    price: number;
    purchaseYear: string;
  }>({
    name: '',
    code: '',
    category: 'Elektronik / Multimedia',
    condition: 'Baik',
    location: 'Gudang Utama',
    totalQty: 1,
    price: 0,
    purchaseYear: new Date().getFullYear().toString()
  });
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);

  // Form States - Proposals
  const [proposalForm, setProposalForm] = useState({
    id: '',
    itemName: '',
    qty: 1,
    estimatedPrice: 0,
    reason: '',
    photoUrl: ''
  });
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Form States - Loans
  const [loanForm, setLoanForm] = useState({
    itemId: '',
    borrowerId: '',
    borrowerName: '',
    qty: 1,
    loanDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [showLoanForm, setShowLoanForm] = useState(false);

  // Filters & Search States
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('Semua');
  const [itemConditionFilter, setItemConditionFilter] = useState('Semua');

  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('Semua');

  // Print Mode State
  const [printData, setPrintData] = useState<{
    title: string;
    headers: string[];
    rows: string[][];
    totals?: { label: string; value: string }[];
  } | null>(null);

  // Unified Teacher representation mapped from homerooms and subjectTeachers
  const teachersList = useMemo(() => {
    const arr: { id: string; name: string; detail: string }[] = [];
    homerooms.forEach(h => {
      arr.push({ id: h.id, name: h.name, detail: `Wali Kelas ${h.className}` });
    });
    subjectTeachers.forEach(s => {
      arr.push({ id: s.id, name: s.name, detail: `Guru Mapel ${s.subject}` });
    });
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }, [homerooms, subjectTeachers]);

  // Load all data
  const loadSarprasData = async () => {
    setIsLoading(true);
    try {
      const [rItems, rProposals, rLoans] = await Promise.all([
        fetch('/api/sarpras/items').then(r => r.json()),
        fetch('/api/sarpras/proposals').then(r => r.json()),
        fetch('/api/sarpras/loans').then(r => r.json())
      ]);
      setItems(Array.isArray(rItems) ? rItems : []);
      setProposals(Array.isArray(rProposals) ? rProposals : []);
      setLoans(Array.isArray(rLoans) ? rLoans : []);
    } catch (err) {
      console.error("Gagal menjaring data sarpras:", err);
      showMsg('error', 'Gagal memuat database sarpras.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSarprasData();
  }, []);

  // Automatic high-integrity code generation calculation helper
  const generateAutoCode = (cat: string, nameString: string) => {
    let abbr = "GEN";
    const cleanCat = String(cat || "").toLowerCase();
    if (cleanCat.includes("elektronik") || cleanCat.includes("multimedia")) abbr = "ELK";
    else if (cleanCat.includes("mebel") || cleanCat.includes("furniture")) abbr = "MBL";
    else if (cleanCat.includes("olahraga")) abbr = "OLR";
    else if (cleanCat.includes("kesenian")) abbr = "KSN";
    else if (cleanCat.includes("tulis") || cleanCat.includes("buku")) abbr = "ATB";
    else if (cleanCat.includes("lab") || cleanCat.includes("laboratorium")) abbr = "LAB";
    else {
      const filtered = cleanCat.replace(/[^a-z]/g, '').toUpperCase();
      abbr = filtered.substring(0, 3) || "GEN";
    }

    let seed = 0;
    if (nameString) {
      seed = nameString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    } else {
      seed = Math.floor(Math.random() * 90) + 10;
    }
    
    const yearMonth = new Date().toISOString().substring(2, 7).replace('-', ''); // e.g. "2605"
    const codeNum = (seed % 900) + 100; // deterministic 100-999
    return `INV/${abbr}/${yearMonth}/${codeNum}`;
  };

  // Re-generate code automatically on input or category shift if autoCode option is active
  useEffect(() => {
    if (autoCode && !isEditingItem) {
      const generated = generateAutoCode(itemForm.category, itemForm.name);
      setItemForm(prev => ({ ...prev, code: generated }));
    }
  }, [autoCode, itemForm.category, itemForm.name, isEditingItem]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword.trim()) {
      setPasswordError('Sandi lama wajib diisi.');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Sandi baru wajib diisi.');
      return;
    }
    if (newPassword.trim().length < 5) {
      setPasswordError('Sandi baru minimal 5 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Konfirmasi sandi baru tidak cocok.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/sarpras/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPassword.trim(), newPassword: newPassword.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess('🎉 Kata sandi berhasil diperbarui secara aman!');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 1500);
      } else {
        setPasswordError(data.error || 'Gagal mengubah kata sandi.');
      }
    } catch {
      setPasswordError('Gangguan komunikasi dengan server.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Categories submit & delete actions
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const clean = newCatInput.trim();
    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      showMsg('error', 'Kategori tersebut sudah terdaftar.');
      return;
    }
    const updated = [...categories, clean];
    setCategories(updated);
    localStorage.setItem('sarpras_categories', JSON.stringify(updated));
    setNewCatInput('');
    showMsg('success', `Sukses mendaftarkan kategori baru: ${clean}`);
  };

  const handleDeleteCategory = (cat: string) => {
    if (categories.length <= 1) {
      showMsg('error', 'Harus menyisakan minimal satu kategori utama.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Kategori',
      message: `Apakah Anda yakin ingin menghapus kategori "${cat}"?`,
      onConfirm: () => {
        const updated = categories.filter(c => c !== cat);
        setCategories(updated);
        localStorage.setItem('sarpras_categories', JSON.stringify(updated));
        showMsg('success', 'Kategori berhasil dihapus.');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Locations submit & delete actions
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocInput.trim()) return;
    const clean = newLocInput.trim();
    if (locations.some(l => l.toLowerCase() === clean.toLowerCase())) {
      showMsg('error', 'Lokasi tersebut sudah terdaftar.');
      return;
    }
    const updated = [...locations, clean];
    setLocations(updated);
    localStorage.setItem('sarpras_locations', JSON.stringify(updated));
    setNewLocInput('');
    showMsg('success', `Sukses mendaftarkan lokasi baru: ${clean}`);
  };

  const handleDeleteLocation = (loc: string) => {
    if (locations.length <= 1) {
      showMsg('error', 'Harus menyisakan minimal satu lokasi penyimpanan.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Lokasi Penyimpanan',
      message: `Apakah Anda yakin ingin menghapus lokasi penyimpanan "${loc}"?`,
      onConfirm: () => {
        const updated = locations.filter(l => l !== loc);
        setLocations(updated);
        localStorage.setItem('sarpras_locations', JSON.stringify(updated));
        showMsg('success', 'Lokasi penyimpanan berhasil dihapus.');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  // Item handler methods
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.code) {
      showMsg('error', 'Nama barang dan kode inventaris harus diisi.');
      return;
    }

    try {
      const res = await fetch('/api/sarpras/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm)
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.sarprasItems);
        showMsg('success', isEditingItem ? 'Informasi barang berhasil disunting.' : 'Barang inventaris sukses ditambahkan.');
        setItemForm({
          name: '',
          code: '',
          category: categories[0] || 'Elektronik / Multimedia',
          condition: 'Baik',
          location: locations[0] || 'Gudang Utama',
          totalQty: 1,
          price: 0,
          purchaseYear: new Date().getFullYear().toString()
        });
        setIsEditingItem(false);
        setShowItemForm(false);
      } else {
        showMsg('error', data.error || 'Gagal menyimpan barang.');
      }
    } catch (err) {
      showMsg('error', 'Kesalahan koneksi sever.');
    }
  };

  const handleEditItemClick = (it: SarprasItem) => {
    setItemForm({
      id: it.id,
      name: it.name,
      code: it.code,
      category: it.category,
      condition: it.condition,
      location: it.location,
      totalQty: it.totalQty,
      price: it.price || 0,
      purchaseYear: it.purchaseYear || new Date().getFullYear().toString()
    });
    setIsEditingItem(true);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Barang Inventaris',
      message: 'Apakah Anda yakin ingin menghapus barang inventaris ini? Tindakan ini akan menghapus aset secara permanen.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/sarpras/items/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            setItems(data.sarprasItems);
            showMsg('success', 'Barang berhasil dihapus dari inventaris.');
          } else {
            showMsg('error', data.error || 'Gagal menghapus barang.');
          }
        } catch (err) {
          showMsg('error', 'Kesalahan koneksi server.');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Proposal submit handler
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalForm.itemName || !proposalForm.qty || !proposalForm.estimatedPrice) {
      showMsg('error', 'Nama barang, jumlah unit, dan estimasi harga wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/sarpras/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalForm)
      });
      const data = await res.json();
      if (res.ok) {
        setProposals(data.sarprasProposals);
        showMsg('success', 'Proposal pembelian berhasil diajukan ke Kepala Sekolah.');
        setProposalForm({
          id: '',
          itemName: '',
          qty: 1,
          estimatedPrice: 0,
          reason: '',
          photoUrl: ''
        });
        setShowProposalForm(false);
      } else {
        showMsg('error', data.error || 'Gagal memproses proposal.');
      }
    } catch (err) {
      showMsg('error', 'Kesalahan jaringan server.');
    }
  };

  // Helper for uploading item photo
  const handleUploadPhoto = async (file: File) => {
    if (!file) return;
    
    // Check file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal adalah 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Tolong pilih file format gambar saja.');
      return;
    }

    setIsUploadingPhoto(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-file', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProposalForm(prev => ({ ...prev, photoUrl: data.url }));
        showMsg('success', 'Foto barang berhasil diunggah.');
      } else {
        setUploadError(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      setUploadError('Kesalahan jaringan saat mengunggah foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadPhoto(e.dataTransfer.files[0]);
    }
  };

  // Loan/Borrowing checker out handler
  const handleCheckoutLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.itemId || !loanForm.borrowerId || !loanForm.qty) {
      showMsg('error', 'Lengkapi seluruh formulir peminjaman.');
      return;
    }

    const t = teachersList.find(teacher => teacher.id === loanForm.borrowerId);
    if (!t) {
      showMsg('error', 'Pendidik tidak valid.');
      return;
    }

    try {
      const res = await fetch('/api/sarpras/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loanForm,
          borrowerName: t.name
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLoans(data.sarprasLoans);
        setItems(data.sarprasItems);
        showMsg('success', `Peminjaman barang berhasil dicatat atas nama ${t.name}.`);
        setLoanForm({
          itemId: '',
          borrowerId: '',
          borrowerName: '',
          qty: 1,
          loanDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setShowLoanForm(false);
      } else {
        showMsg('error', data.error || 'Gagal melakukan peminjaman.');
      }
    } catch (err) {
      showMsg('error', 'Kesalahan server.');
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Kembalikan Pinjaman',
      message: 'Apakah Anda yakin barang pinjaman ini sudah dikembalikan secara utuh?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/sarpras/loans/${loanId}/return`, {
            method: 'POST'
          });
          const data = await res.json();
          if (res.ok) {
            setLoans(data.sarprasLoans);
            setItems(data.sarprasItems);
            showMsg('success', 'Barang telah dikembalikan dan kuantitas tersedia disinkronkan kembali.');
          } else {
            showMsg('error', data.error || 'Gagal memperbarui status pengembalian.');
          }
        } catch (err) {
          showMsg('error', 'Gagal memproses pengembalian barang.');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Filter computations
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch = it.name.toLowerCase().includes(itemSearch.toLowerCase()) || it.code.toLowerCase().includes(itemSearch.toLowerCase());
      const matchCat = itemCategoryFilter === 'Semua' || it.category === itemCategoryFilter;
      const matchCond = itemConditionFilter === 'Semua' || it.condition === itemConditionFilter;
      return matchSearch && matchCat && matchCond;
    });
  }, [items, itemSearch, itemCategoryFilter, itemConditionFilter]);

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchSearch = l.itemName.toLowerCase().includes(loanSearch.toLowerCase()) || l.borrowerName.toLowerCase().includes(loanSearch.toLowerCase());
      const matchStatus = loanStatusFilter === 'Semua' || l.status === loanStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [loans, loanSearch, loanStatusFilter]);

  // Metric summaries
  const totalItemCount = useMemo(() => items.reduce((sum, i) => sum + i.totalQty, 0), [items]);
  const activeBorrowedCount = useMemo(() => loans.filter(l => l.status === 'dipinjam').reduce((sum, l) => sum + l.qty, 0), [loans]);
  
  const pendingProposalBudget = useMemo(() => {
    return proposals.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalPrice, 0);
  }, [proposals]);

  const approvedProposalBudget = useMemo(() => {
    return proposals.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.totalPrice, 0);
  }, [proposals]);

  // Printing engine
  const triggerPrintPreview = (title: string, headers: string[], rows: string[][], totals?: { label: string; value: string }[]) => {
    setPrintData({ title, headers, rows, totals });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Dynamic categories and locations are governed by the component states and localStorage


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans print:bg-white print:text-black">
      {/* Printable Area Overlay */}
      {printData && (
        <div id="print-report-section" className="hidden print:block absolute inset-0 bg-white p-8 overflow-visible z-50">
          <div className="flex flex-col gap-1 items-center border-b-4 border-double border-slate-800 pb-4 mb-6">
            <h1 className="text-xl font-extrabold uppercase tracking-wide text-center">
              {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
            </h1>
            <p className="text-[10px] text-center text-slate-600 font-medium italic">
              {schoolIdentity?.address || "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan"}
            </p>
            <p className="text-[10px] text-center text-slate-500 font-mono">
              Waka Sarana &amp; Prasarana - Laporan Resmi Sarpras Sekolah
            </p>
          </div>

          <h2 className="text-sm font-black uppercase text-center tracking-wide mb-6">
            {printData.title}
          </h2>

          <table className="w-full text-left text-[11px] border-collapse border border-slate-700">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-700">
                {printData.headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3 font-extrabold border-r border-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {printData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-300">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 border-r border-slate-300 font-mono text-[10.5px]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {printData.totals && (
            <div className="mt-4 flex flex-col items-end gap-1 font-mono text-[11px]">
              {printData.totals.map((t, idx) => (
                <div key={idx} className="flex gap-4">
                  <span className="font-bold text-slate-600">{t.label}:</span>
                  <span className="font-extrabold text-slate-950">{t.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-16 flex justify-between px-12 text-[11px]">
            <div className="text-center">
              <span className="block text-slate-500">Mengetahui,</span>
              <span className="block font-bold mt-16">{schoolIdentity?.principal || "H. Ahmad Fuad, M.PdI"}</span>
              <span className="block text-[9px] text-slate-400">Kepala Sekolah</span>
            </div>
            <div className="text-center">
              <span className="block text-slate-500">Pandaan, {new Date().toLocaleDateString('id-ID')}</span>
              <span className="block font-bold mt-16">Waka Sarana &amp; Prasarana</span>
              <span className="block text-[9px] text-slate-400">Unit Inventaris Sekolah</span>
            </div>
          </div>

          <button 
            onClick={() => setPrintData(null)}
            className="print:hidden fixed bottom-6 right-6 bg-slate-900 text-white font-bold py-2 px-4 rounded-xl shadow-lg border border-slate-700 hover:bg-slate-805 cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Kembali
          </button>
        </div>
      )}

      {/* Printable Barcode/QR Overlay / Preview Modal */}
      {barcodePrintData && (
        <div id="print-report-section" className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 flex flex-col gap-4 print:border-none print:shadow-none print:p-0 print:max-w-full">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <div className="text-left">
                <h3 className="font-extrabold text-slate-900 text-sm">🖨️ Pratinjau Label QR Code Inventaris</h3>
                <p className="text-xs text-slate-500">Jumlah label QR Code yang siap dicetak: {barcodePrintData.length} label.</p>
              </div>
              <button 
                onClick={() => setBarcodePrintData(null)}
                className="p-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-extrabold cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>

            <div className="p-4 bg-slate-100 rounded-xl max-h-[450px] overflow-y-auto print:bg-white print:max-h-full print:overflow-visible">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 print:p-2">
                {barcodePrintData.map((item) => (
                  <div 
                    key={item.id || item.code} 
                    className="border-2 border-slate-350 p-4 rounded-xl flex flex-col items-center justify-between text-center bg-white relative shadow-xs print:shadow-none print:border-slate-800 gap-1.5"
                    style={{ minHeight: '190px', breakInside: 'avoid' }}
                  >
                    {/* 1. Barcode / QR Code */}
                    <div className="select-none my-0.5">
                      <QRCodeElement value={item.code} />
                    </div>

                    {/* Nama Barang context */}
                    <div className="text-[10px] font-extrabold text-slate-700 uppercase tracking-tight truncate w-full leading-tight mt-1">
                      {item.name}
                    </div>
                    
                    {/* 2. School Identity */}
                    <div className="text-[9.5px] font-black tracking-normal text-slate-905 uppercase">
                      SMP MAARIF NU PANDAAN
                    </div>
                    
                    {/* 3. Lokasi Barang | Tahun Pembelian */}
                    <div className="text-[9px] font-bold tracking-wide text-indigo-700 w-full truncate border-t border-dashed border-slate-300 pt-1.5 uppercase font-mono mt-1">
                      {item.location || "Gudang Utama"} | {item.purchaseYear || "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4 print:hidden">
              <button
                onClick={() => setBarcodePrintData(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-805 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={13} /> Mulai Cetak Label QR Code ({barcodePrintData.length} Unit)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Layout Dashboard */}
      <div className="print:hidden">
        {/* Sub-Header / Identity Letterhead banner */}
        <header className="bg-slate-900 text-white relative shadow-md">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-900/30 to-indigo-900/30 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 relative flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-gradient-to-tr from-amber-500 to-indigo-600 p-3.5 rounded-2xl shadow-inner text-white ring-2 ring-indigo-300">
                <Package size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider font-mono">Vice Principal Desk</span>
                <h1 className="text-2xl font-black tracking-tight">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</h1>
                <p className="text-slate-300 text-xs font-semibold mt-0.5">
                  🛡️ Portal Administrasi Sarana, Prasarana &amp; Logistik Terintegrasi (Waka Sarpras)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {schoolIdentity?.sarprasSkUrl && (
                <a
                  href={schoolIdentity.sarprasSkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Download size={13} strokeWidth={2.5} /> Unduh SK
                </a>
              )}

              <button
                onClick={() => {
                  setPasswordError('');
                  setPasswordSuccess('');
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setShowPasswordModal(true);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Key size={13} strokeWidth={2.5} /> Ubah Sandi
              </button>

              <button
                onClick={onLogout}
                className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-300 font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <LogOut size={13} strokeWidth={2.5} /> Keluar Portal
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8">
          {/* Unduh Aplikasi Mobile Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Aplikasi Mobile Resmi Portal Sekolah</h4>
                <p className="text-[10px] text-slate-500 leading-normal">Unduh aplikasi mobile resmi sekolah untuk mengakses log sarpras, peminjaman & pengadaan langsung dari smartphone Anda.</p>
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
                    ? "bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-850 border-emerald-250 shadow-3xs" 
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
                    ? "bg-sky-50 hover:bg-sky-100 hover:border-sky-300 text-sky-850 border-sky-250 shadow-3xs" 
                    : "bg-slate-100 text-slate-400 border-slate-200 opacity-60"
                }`}
              >
                <Apple size={14} className={`${schoolIdentity?.iosUrl ? "text-sky-500 drop-shadow-[0_0_4px_rgba(14,165,233,0.4)] group-hover:scale-110" : "text-sky-300/60"} transition-transform stroke-[2.5]`} />
                <span>iOS Apple</span>
              </a>
            </div>
          </div>

          {/* Action Alerts messages */}
          {actionMessage && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-bold animate-fade-in ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {actionMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
              <span>{actionMessage.text}</span>
            </div>
          )}
           {/* Tab Button bar switchers */}
          <div className="hidden md:flex border-b border-slate-200 gap-2 mb-8 bg-white p-1.5 rounded-2xl border">
            {[
              { id: 'dashboard', label: '🏠 Beranda' },
              { id: 'katalog', label: '📦 Katalog Inventaris' },
              { id: 'peminjaman', label: '🤝 Peminjaman Barang' },
              { id: 'pengajuan', label: '🛒 Pengajuan Pembelian' },
              { id: 'laporan', label: '📊 Laporan & Cetak' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setShowItemForm(false);
                  setShowLoanForm(false);
                  setShowProposalForm(false);
                }}
                className={`py-3 px-5 rounded-xl font-bold font-display text-xs transition-all cursor-pointer flex-1 md:flex-initial ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 0: DASHBOARD HOME */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in flex flex-col gap-6 text-left">
              {/* Welcome / Instruction Hero */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden border border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-900/40 via-indigo-950/50 to-slate-950/60" />
                <div className="relative z-10 max-w-2xl">
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20 tracking-wider">Beranda Kerja</span>
                  <h2 className="text-xl md:text-2xl font-black mt-3 text-white leading-tight">Sistem Inventarisasi &amp; Pengadaan Digital</h2>
                  <p className="text-slate-300 text-xs md:text-sm mt-2 leading-relaxed">
                    Selamat datang di dashboard kerja Wakil Kepala Sekolah bidang Sarana &amp; Prasarana. Kelola pendataan sarana prasarana sekolah secara saksama, ajukan usulan pembelanjaan unit baru, koordinasikan peminjaman logistik guru, serta unduh rekapitulasi laporan berstempel resmi.
                  </p>
                  
                  {/* Quick Actions / Shortcuts */}
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('katalog');
                        setItemForm({ name: '', code: '', category: categories[0] || 'Elektronik / Multimedia', condition: 'Baik', location: locations[0] || 'Gudang Utama', totalQty: 1, price: 0, purchaseYear: new Date().getFullYear().toString() });
                        setIsEditingItem(false);
                        setShowItemForm(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      📦 Tambah Aset Baru
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('peminjaman');
                        setLoanForm({ itemId: '', borrowerId: '', borrowerName: '', qty: 1, loanDate: new Date().toISOString().split('T')[0], notes: '' });
                        setShowLoanForm(true);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[11px] rounded-xl border border-slate-700 transition-all cursor-pointer"
                    >
                      🤝 Catat Pinjaman
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('pengajuan');
                        setProposalForm({ id: '', itemName: '', qty: 1, estimatedPrice: 0, reason: '' });
                        setShowProposalForm(true);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      🛒 Ajukan Proposal Belanja
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid Row */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group" onClick={() => setActiveTab('katalog')}>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Aset Terkatalog</span>
                    <h3 className="text-3xl font-black text-slate-900 mt-2 font-mono">{items.length}</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Jenis barang inventaris sekolah.</p>
                  </div>
                  <div className="absolute right-4 bottom-4 text-indigo-100 pointer-events-none group-hover:scale-115 transition-transform duration-300">
                    <Package size={52} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Total Kuantitas</span>
                    <h3 className="text-3xl font-black text-emerald-700 mt-2 font-mono">{totalItemCount}</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Unit/barang fisik keseluruhan.</p>
                  </div>
                  <div className="absolute right-4 bottom-4 text-emerald-100 pointer-events-none">
                    <CheckCircle2 size={52} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group" onClick={() => setActiveTab('peminjaman')}>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Sedang Dipinjam</span>
                    <h3 className="text-3xl font-black text-amber-600 mt-2 font-mono">{activeBorrowedCount}</h3>
                    <p className="text-slate-500 text-[11px] mt-1">Unit dalam peminjaman aktif oleh guru.</p>
                  </div>
                  <div className="absolute right-4 bottom-4 text-amber-100 pointer-events-none group-hover:scale-115 transition-transform duration-300">
                    <Users2 size={52} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group" onClick={() => setActiveTab('pengajuan')}>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Belanja Sarpras Disetujui</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono font-sans">Rp {approvedProposalBudget.toLocaleString('id-ID')}</h3>
                    <p className="text-orange-550 text-[10px] font-bold mt-1">Pending: Rp {pendingProposalBudget.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="absolute right-4 bottom-4 text-orange-100 pointer-events-none group-hover:scale-115 transition-transform duration-300">
                    <ShoppingCart size={52} />
                  </div>
                </div>
              </section>

              {/* Overview Info / System Logs & Reminders */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">⚠️ Barang Rusak &amp; Perlu Perbaikan</h4>
                      <p className="text-slate-550 text-[11px] mt-0.5">Datar inventaris dengan kondisi Rusak Ringan atau Rusak Berat.</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold uppercase">
                      Kondisi Kritis
                    </span>
                  </div>
                  
                  {items.filter(i => i.condition !== 'Baik').length === 0 ? (
                    <div className="py-6 text-center text-slate-450 text-xs font-semibold">
                      🌱 Sip! Semua unit inventaris sekolah dalam keadaan baik saat ini.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                      {items.filter(i => i.condition !== 'Baik').map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-slate-50/70 border border-slate-150 p-3 rounded-xl hover:bg-slate-50 transition-all">
                          <div className="flex flex-col text-xs">
                            <span className="font-bold text-slate-800 leading-tight">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.code} • {item.location}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.condition === 'Rusak Berat' ? 'bg-red-50 text-red-600 border border-red-150' : 'bg-amber-50 text-amber-700 border border-amber-150'
                          }`}>
                            {item.condition}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">⚡ Status Ruang Penyimpanan</h4>
                    <p className="text-slate-550 text-[11px] mt-0.5 font-semibold">Pemetaan persebaran kuantitas barang.</p>
                  </div>
                  <div className="flex flex-col gap-3 h-[250px] overflow-y-auto pr-1">
                    {locations.map(loc => {
                      const locItems = items.filter(it => it.location === loc);
                      const totalLocQty = locItems.reduce((sum, it) => sum + it.totalQty, 0);
                      return (
                        <div key={loc} className="flex flex-col gap-1.5 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">{loc}</span>
                            <span className="font-mono text-[10.5px] font-bold text-indigo-650 bg-indigo-50 px-2 rounded-md">{totalLocQty} Unit</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.max(8, totalItemCount > 0 ? (totalLocQty / totalItemCount) * 100 : 0))}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ITEMS INVENTORY CATALOGUE */}
          {activeTab === 'katalog' && (
            <div className="animate-fade-in flex flex-col gap-6 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900">Manajemen Barang &amp; Sarana Inventaris</h2>
                  <p className="text-slate-500 text-xs">Simpan, sunting kondisi, dan catat status kuantitas aset inventaris sekolah.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => {
                      setShowManageCatLoc(!showManageCatLoc);
                      setShowItemForm(false);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs border border-slate-300 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    🛠️ Kelola Kategori &amp; Lokasi
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingItem(false);
                      setItemForm({
                        name: '',
                        code: '',
                        category: categories[0] || 'Elektronik / Multimedia',
                        condition: 'Baik',
                        location: locations[0] || 'Gudang Utama',
                        totalQty: 1
                      });
                      setShowItemForm(!showItemForm);
                      setShowManageCatLoc(false);
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus size={14} /> {showItemForm ? 'Batal Tambah' : 'Tambah Aset Baru'}
                  </button>
                </div>
              </div>

              {/* Collapsible Kategori & Lokasi Management Box */}
              {showManageCatLoc && (
                <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col gap-6 animate-fade-in relative">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-indigo-500 rounded-t-2xl" />
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                        📂 Master Kategori &amp; Lokasi Penyimpanan
                      </h3>
                      <p className="text-slate-400 text-[10.5px]">Tambahkan jenis kategori baru dan zonasi lokasi koordinasi sarpras sekolah.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowManageCatLoc(false)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-300">
                    {/* Part A: Kategori */}
                    <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 flex flex-col gap-4">
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">🆕 Form Penambahan Kategori</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Daftarkan kategori logistik asrama / sekolah baru.</p>
                      </div>
                      
                      <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input 
                          type="text"
                          value={newCatInput}
                          onChange={(e) => setNewCatInput(e.target.value)}
                          placeholder="Misal: Sarana Masjid, Sanitasi"
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-800 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-505"
                          required
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus size={11} strokeWidth={3} /> Tambah
                        </button>
                      </form>

                      <div>
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">Daftar Kategori Saat Ini</span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {categories.map((cat, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 text-slate-350 font-bold text-[10px] py-1 px-2.5 rounded-md flex items-center gap-2 group hover:border-slate-700">
                              <span>{cat}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="text-slate-500 hover:text-rose-400 font-extrabold transition-all cursor-pointer text-xs"
                                title="Hapus Kategori"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Part B: Lokasi */}
                    <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 flex flex-col gap-4">
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">📍 Form Penambahan Lokasi Barang</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Daftarkan lokasi penyimpanan ruang atau lorong sekolah.</p>
                      </div>

                      <form onSubmit={handleAddLocation} className="flex gap-2">
                        <input 
                          type="text"
                          value={newLocInput}
                          onChange={(e) => setNewLocInput(e.target.value)}
                          placeholder="Misal: Aula Lantai 2, Kantor TU"
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-800 rounded-lg bg-slate-900 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-505"
                          required
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus size={11} strokeWidth={3} /> Tambah
                        </button>
                      </form>

                      <div>
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">Daftar Lokasi (Akan Masuk Drop-down)</span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {locations.map((loc, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 text-slate-350 font-bold text-[10px] py-1 px-2.5 rounded-md flex items-center gap-2 group hover:border-slate-700">
                              <span>{loc}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLocation(loc)}
                                className="text-slate-500 hover:text-rose-400 font-extrabold transition-all cursor-pointer text-xs"
                                title="Hapus Lokasi"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Item Form */}
              {showItemForm && (
                <form onSubmit={handleSaveItem} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
                  <h3 className="font-extrabold text-sm text-slate-800">
                    {isEditingItem ? "📝 Sunting Detail Barang Inventaris" : "🆕 Masukkan Barang Inventaris Baru"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Barang / Aset</label>
                      <input 
                        type="text"
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        placeholder="Misal: Epson EB-X400, Meja Belajar Kayu, Laptop BK"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-sans focus:outline-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5 font-sans">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kode Inventaris</label>
                        {!isEditingItem && (
                          <label className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={autoCode} 
                              onChange={(e) => setAutoCode(e.target.checked)}
                              className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 scale-90"
                            />
                            Otomatis
                          </label>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={itemForm.code}
                        onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                        placeholder="INV/LAB-COMP/01"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-mono focus:outline-indigo-600 disabled:opacity-60 disabled:bg-slate-100"
                        disabled={autoCode && !isEditingItem}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
                      <select 
                        value={itemForm.category}
                        onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 font-sans focus:outline-indigo-600 cursor-pointer"
                      >
                        {categories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lokasi Fisik Barang</label>
                      <select 
                        value={itemForm.location}
                        onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 cursor-pointer"
                        required
                      >
                        <option value="">-- Pilih Lokasi --</option>
                        {locations.map((loc, idx) => (
                           <option key={idx} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Kuantitas Total Unit</label>
                      <input 
                        type="number"
                        min="1"
                        value={itemForm.totalQty}
                        onChange={(e) => setItemForm({ ...itemForm, totalQty: Number(e.target.value) || 1 })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 font-bold text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Nilai Estimasi (Rp)</label>
                      <input 
                        type="number"
                        min="0"
                        value={itemForm.price}
                        onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) || 0 })}
                        placeholder="Contoh: 5500000"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 font-bold text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tahun Pembelian</label>
                      <input 
                        type="text"
                        value={itemForm.purchaseYear}
                        onChange={(e) => setItemForm({ ...itemForm, purchaseYear: e.target.value })}
                        placeholder="Contoh: 2026"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 font-bold text-slate-800 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kondisi Fisik</label>
                      <select 
                        value={itemForm.condition}
                        onChange={(e) => setItemForm({ ...itemForm, condition: e.target.value as any })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 cursor-pointer font-bold text-slate-800"
                      >
                        <option value="Baik">Baik (Siap Pakai)</option>
                        <option value="Rusak Ringan">Rusak Ringan (Bisa Digunakan)</option>
                        <option value="Rusak Berat">Rusak Berat (Butuh Ganti/Servis)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowItemForm(false)}
                      className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-sm"
                    >
                      {isEditingItem ? 'Simpan Perubahan' : 'Daftarkan Barang'}
                    </button>
                  </div>
                </form>
              )}

              {/* Filters Panel & Listing Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Search box */}
                  <div className="relative md:col-span-2">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
                    <input 
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Cari berdasarkan nama aset atau kode inventaris..."
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-slate-905"
                    />
                  </div>

                  {/* Category dropdown */}
                  <div>
                    <select
                      value={itemCategoryFilter}
                      onChange={(e) => setItemCategoryFilter(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer text-slate-700"
                    >
                      <option value="Semua">Semua Kategori</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition selector filter */}
                  <div>
                    <select
                      value={itemConditionFilter}
                      onChange={(e) => setItemConditionFilter(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer text-slate-700"
                    >
                      <option value="Semua">Semua Kondisi</option>
                      <option value="Baik">Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
                </div>

                 {/* Bulk actions banner */}
                {selectedBarcodeItems.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex justify-between items-center animate-fade-in mb-4">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">Kolektif Cetak QR Code</span>
                      <p className="text-xs font-bold text-slate-700">{selectedBarcodeItems.length} barang siap dikompilasi ke lembar cetak QR Code.</p>
                    </div>
                    <div className="flex gap-2">
                       <button
                        type="button"
                        onClick={() => setSelectedBarcodeItems([])}
                        className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Atur Ulang / Kosongkan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const comps = items.filter(i => selectedBarcodeItems.includes(i.id));
                          setBarcodePrintData(comps);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <Printer size={12} /> Cetak Kolektif QR ({selectedBarcodeItems.length})
                      </button>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                    <Loader2 className="animate-spin text-slate-800" size={24} />
                    <span className="text-xs font-bold font-mono">Synchronizing master katalog...</span>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">🏜️</span>
                    <p className="text-xs font-bold">Tidak ada barang inventaris yang sesuai dengan filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="pb-3 px-2 text-center w-10">
                            <input 
                              type="checkbox" 
                              checked={filteredItems.length > 0 && filteredItems.every(i => selectedBarcodeItems.includes(i.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBarcodeItems(prev => {
                                    const addition = filteredItems.map(i => i.id).filter(id => !prev.includes(id));
                                    return [...prev, ...addition];
                                  });
                                } else {
                                  setSelectedBarcodeItems(prev => prev.filter(id => !filteredItems.some(f => f.id === id)));
                                }
                              }}
                              className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
                            />
                          </th>
                          <th className="pb-3 px-2">Info Barang</th>
                          <th className="pb-3 px-2">Kategori &amp; Lokasi</th>
                          <th className="pb-3 px-2">Kondisi</th>
                          <th className="pb-3 px-2 text-right">Nilai Estimasi Unit</th>
                          <th className="pb-3 px-2 text-center font-mono">Stok Tersedia</th>
                          <th className="pb-3 px-2 text-right">Opsi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((it) => {
                          const isWarning = it.availableQty === 0;
                          return (
                            <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-all">
                              <td className="py-4.5 px-2 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={selectedBarcodeItems.includes(it.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBarcodeItems(prev => [...prev, it.id]);
                                    } else {
                                      setSelectedBarcodeItems(prev => prev.filter(id => id !== it.id));
                                    }
                                  }}
                                  className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-4.5 px-2">
                                <div className="font-extrabold text-slate-800">{it.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                                  {it.code} <span className="text-indigo-650 font-sans font-black ml-1.5 px-1 bg-indigo-50 rounded">📅 Beli: {it.purchaseYear || "-"}</span>
                                </div>
                              </td>
                              <td className="py-4.5 px-2">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10px] text-slate-600 block w-fit mb-1">{it.category}</span>
                                <span className="text-[11px] text-slate-500 font-medium">📍 {it.location || "Gudang Utama"}</span>
                              </td>
                              <td className="py-4.5 px-2">
                                <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                  it.condition === 'Baik' 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                    : it.condition === 'Rusak Ringan'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-rose-50 text-rose-800 border border-rose-250'
                                }`}>
                                  {it.condition}
                                </span>
                              </td>
                              <td className="py-4.5 px-2 text-right">
                                <div className="font-mono text-xs font-black text-slate-900">
                                  Rp {(it.price || 0).toLocaleString('id-ID')}
                                </div>
                                <span className="text-[9.5px] text-slate-400 font-bold font-mono">
                                  Total: Rp {((it.price || 0) * (it.totalQty || 0)).toLocaleString('id-ID')}
                                </span>
                              </td>
                              <td className="py-4.5 px-2 text-center">
                                <div className={`font-mono text-base font-black ${isWarning ? 'text-rose-500' : 'text-slate-900'}`}>
                                  {it.availableQty} <span className="text-slate-400 text-xs font-bold font-sans">/ {it.totalQty}</span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-semibold block">{isWarning ? 'Kosong & Dipinjam' : 'Tersedia'}</span>
                              </td>
                              <td className="py-4.5 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5 font-sans">
                                  <button
                                    onClick={() => setBarcodePrintData([it])}
                                    className="p-2 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                                    title="Cetak QR Code Satuan"
                                  >
                                    <Printer size={12} className="text-slate-550" />
                                  </button>
                                  <button
                                    onClick={() => handleEditItemClick(it)}
                                    className="p-2 text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg cursor-pointer transition-all"
                                    title="Sunting"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(it.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg cursor-pointer transition-all"
                                    title="Hapus"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BORROWING GOODS (PEMINJAMAN BARANG) */}
          {activeTab === 'peminjaman' && (
            <div className="animate-fade-in flex flex-col gap-6 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900">Peminjaman Logistik &amp; Media Pembelajaran</h2>
                  <p className="text-slate-500 text-xs">Peminjam terhubung langsung ke akun guru untuk pemantauan agenda kelas.</p>
                </div>
                <button
                  onClick={() => setShowLoanForm(!showLoanForm)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> {showLoanForm ? 'Batal Form' : 'Catat Peminjaman Baru'}
                </button>
              </div>

              {/* Loan Checkout Form */}
              {showLoanForm && (
                <form onSubmit={handleCheckoutLoan} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
                  <h3 className="font-extrabold text-sm text-slate-800">
                    🤝 Formulir Kontrak Peminjaman Barang
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Item selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Aset Sekolah</label>
                      <select
                        value={loanForm.itemId}
                        onChange={(e) => setLoanForm({ ...loanForm, itemId: e.target.value })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 cursor-pointer text-slate-705"
                        required
                      >
                        <option value="">-- Hubungkan Aset --</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id} disabled={it.availableQty <= 0}>
                            {it.name} [Stok: {it.availableQty} unit available] ({it.condition})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Teacher accounts list dropdown link */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pendidik Peminjam (Link Akun)</label>
                      <select
                        value={loanForm.borrowerId}
                        onChange={(e) => setLoanForm({ ...loanForm, borrowerId: e.target.value })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 cursor-pointer text-slate-705"
                        required
                      >
                        <option value="">-- Hubungkan Guru Mapel / Wali --</option>
                        {teachersList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.detail})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Borrowed Quantity */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kuantitas Unit Dipinjam</label>
                      <input
                        type="number"
                        min="1"
                        value={loanForm.qty}
                        onChange={(e) => setLoanForm({ ...loanForm, qty: Number(e.target.value) || 1 })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Keluar Pinjaman</label>
                      <input
                        type="date"
                        value={loanForm.loanDate}
                        onChange={(e) => setLoanForm({ ...loanForm, loanDate: e.target.value })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi / Peruntukan</label>
                      <input
                        type="text"
                        value={loanForm.notes}
                        onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                        placeholder="Misal: Keperluan Praktik Listening kls 8-B, rapat wali murid"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLoanForm(false)}
                      className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-amber-550 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-sm"
                    >
                      Konfirmasikan Pinjaman
                    </button>
                  </div>
                </form>
              )}

              {/* Loan Logs table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  {/* Search bar */}
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
                    <input 
                      type="text"
                      value={loanSearch}
                      onChange={(e) => setLoanSearch(e.target.value)}
                      placeholder="Cari berdasarkan nama guru atau nama barang..."
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-slate-805"
                    />
                  </div>

                  {/* Status selector */}
                  <div className="w-full md:w-48">
                    <select
                      value={loanStatusFilter}
                      onChange={(e) => setLoanStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer text-slate-700"
                    >
                      <option value="Semua">Semua Status</option>
                      <option value="dipinjam">🚨 Aktif (Dipinjam)</option>
                      <option value="kembali">✅ Selesai (Kembali)</option>
                    </select>
                  </div>
                </div>

                {loans.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">🤝</span>
                    <p className="text-xs font-bold">Belum ada pencatatan peminjaman barang inventaris.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="pb-3 px-2">Guru Peminjam</th>
                          <th className="pb-3 px-2">Keterangan Barang</th>
                          <th className="pb-3 px-2">Tanggal Pinjam</th>
                          <th className="pb-3 px-2">Status</th>
                          <th className="pb-3 px-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLoans.map((l) => (
                          <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                            <td className="py-4.5 px-2">
                              <div className="font-extrabold text-slate-800">{l.borrowerName}</div>
                              <span className="text-[9.5px] text-indigo-600 font-bold block mt-0.5">
                                ID: {l.borrowerId}
                              </span>
                            </td>
                            <td className="py-4.5 px-2">
                              <div className="font-bold text-slate-700">{l.itemName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Jumlah: {l.qty} unit {l.notes ? `(${l.notes})` : ''}</div>
                            </td>
                            <td className="py-4.5 px-2">
                              <span className="text-slate-600 font-mono text-[10.5px] font-bold block">📅 {l.loanDate}</span>
                              {l.returnDate && (
                                <span className="text-[10px] font-medium text-emerald-600 block mt-0.5">Kembali: {l.returnDate}</span>
                              )}
                            </td>
                            <td className="py-4.5 px-2">
                              <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                l.status === 'dipinjam' 
                                  ? 'bg-rose-50 text-rose-800 border border-rose-205'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                              }`}>
                                {l.status === 'dipinjam' ? 'Dipinjam' : 'Dikembalikan'}
                              </span>
                            </td>
                            <td className="py-4.5 px-2 text-right">
                              {l.status === 'dipinjam' ? (
                                <button
                                  onClick={() => handleReturnLoan(l.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                                >
                                  <Check size={10} /> Konfirm Kembali
                                </button>
                              ) : (
                                <span className="text-slate-400 font-bold text-[10px] italic">Selesai</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROCUREMENT PROPOSALS (PENGAJUAN BELANJA) */}
          {activeTab === 'pengajuan' && (
            <div className="animate-fade-in flex flex-col gap-6 text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="font-extrabold text-lg text-slate-900">Pengajuan Procurement / Belanja Sarpras Berkala</h2>
                  <p className="text-slate-500 text-xs">Pencatatan nominal belanja terhubung dan termonitor langsung oleh Kepala Sekolah.</p>
                </div>
                <button
                  onClick={() => {
                    setProposalForm({
                      id: '',
                      itemName: '',
                      qty: 1,
                      estimatedPrice: 0,
                      reason: ''
                    });
                    setShowProposalForm(!showProposalForm);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> {showProposalForm ? 'Batal Ajukan' : 'Ajukan Procurement Baru'}
                </button>
              </div>

              {/* Procurement form */}
              {showProposalForm && (
                <form onSubmit={handleSaveProposal} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
                  <h3 className="font-extrabold text-sm text-slate-800">
                    🛒 Formulir Pengajuan Pembelian Baru
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Barang Kebutuhan</label>
                      <input
                        type="text"
                        value={proposalForm.itemName}
                        onChange={(e) => setProposalForm({ ...proposalForm, itemName: e.target.value })}
                        placeholder="Misal: 3 unit AC Sharp, Perbaikan Plafon R. Guru"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jumlah Kuantitas (Unit)</label>
                      <input
                        type="number"
                        min="1"
                        value={proposalForm.qty}
                        onChange={(e) => setProposalForm({ ...proposalForm, qty: Number(e.target.value) || 1 })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estimasi Harga Per Unit (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={proposalForm.estimatedPrice}
                        onChange={(e) => setProposalForm({ ...proposalForm, estimatedPrice: Number(e.target.value) || 0 })}
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estimasi Total Biaya</label>
                    <div className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-100 font-mono text-xs font-extrabold mt-1">
                      Rp {(proposalForm.qty * proposalForm.estimatedPrice).toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alasan Pembelian / Analisis Urgensi</label>
                    <textarea
                      value={proposalForm.reason}
                      onChange={(e) => setProposalForm({ ...proposalForm, reason: e.target.value })}
                      placeholder="Uraikan mengapa pengadaan barang ini mendesak..."
                      rows={2}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Foto Barang Pendukung (Optional)</label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                        dragActive ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      {proposalForm.photoUrl ? (
                        <div className="flex flex-col items-center gap-2 w-full">
                          <img 
                            src={proposalForm.photoUrl} 
                            alt="Foto barang pengajuan" 
                            className="max-h-40 rounded-lg object-contain shadow-sm border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setProposalForm(prev => ({ ...prev, photoUrl: '' }))}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Hapus Foto
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center p-2">
                          <Plus className="text-slate-400 mb-1.5" size={24} />
                          <p className="text-[11px] font-bold text-slate-700">Tarik dan lepas foto ke sini, atau klik untuk memilih</p>
                          <p className="text-[9px] text-slate-400 mt-1">Format: JPG, PNG, WEBP (Maksimal 5MB)</p>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadPhoto(e.target.files[0]);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploadingPhoto}
                          />
                        </div>
                      )}

                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-white/80 rounded-xl flex flex-col items-center justify-center gap-2">
                          <Loader2 className="animate-spin text-indigo-600" size={20} />
                          <span className="text-[10px] font-bold text-indigo-900 font-sans">Mengunggah foto...</span>
                        </div>
                      )}
                    </div>
                    {uploadError && <p className="text-[10px] font-bold text-rose-600 mt-1 italic font-sans">{uploadError}</p>}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowProposalForm(false)}
                      className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-sm"
                    >
                      Kirim Proposal Belanja
                    </button>
                  </div>
                </form>
              )}

              {/* Proposals log block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-505 to-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-800 mb-6 flex items-center gap-2">
                  📝 Riwayat &amp; Status Monitor Pengajuan Pembelian Sarpras
                </h3>

                {proposals.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-1">
                    <span className="text-3xl">📭</span>
                    <p className="text-xs font-bold">Belum ada riwayat pengajuan procurement.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {proposals.map((prop) => (
                      <div key={prop.id} className="border border-slate-150 rounded-xl p-5 hover:shadow-xs transition-all bg-slate-50/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[9px] font-bold">
                              No: {prop.id} &bull; Tgl: {prop.date}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 mt-1">{prop.itemName}</h4>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                              prop.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-850 border-emerald-200'
                                : prop.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-850 border-rose-200'
                                  : 'bg-amber-50 text-amber-850 border-amber-205'
                            }`}>
                              {prop.status === 'approved' ? '✅ Disetujui' : prop.status === 'rejected' ? '❌ Ditolak' : '⏳ Menunggu'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs">
                          <div>
                            <span className="text-slate-450 block font-semibold text-[9.5px] uppercase">Jumlah Unit:</span>
                            <span className="font-bold text-slate-700">{prop.qty} unit</span>
                          </div>
                          <div>
                            <span className="text-slate-450 block font-semibold text-[9.5px] uppercase">Estimasi Satuan:</span>
                            <span className="font-bold text-slate-700 font-mono">Rp {prop.estimatedPrice.toLocaleString('id-ID')}</span>
                          </div>
                          <div>
                            <span className="text-slate-450 block font-semibold text-[9.5px] uppercase">Nominal Total:</span>
                            <span className="font-black text-indigo-700 font-mono text-sm">Rp {prop.totalPrice.toLocaleString('id-ID')}</span>
                          </div>
                          <div>
                            <span className="text-slate-450 block font-semibold text-[9.5px] uppercase">Diusulkan Oleh:</span>
                            <span className="font-bold text-slate-700">{prop.proposedBy || 'Waka Sarpras'}</span>
                          </div>
                        </div>

                        <div className="mt-3 text-xs bg-white border border-slate-150 p-3 rounded-lg">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Alasan Peminjaman / Urgensi</span>
                          <p className="text-slate-600 leading-relaxed italic font-medium">"{prop.reason || "-"}"</p>
                        </div>

                        {prop.photoUrl && (
                          <div className="mt-3">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Foto Barang Pendukung</span>
                            <div className="rounded-xl overflow-hidden border border-slate-150 bg-slate-100 max-w-xs shadow-3xs cursor-pointer group relative">
                              <img 
                                src={prop.photoUrl} 
                                alt={prop.itemName} 
                                className="max-h-48 w-full object-cover group-hover:scale-101 transition-transform"
                                referrerPolicy="no-referrer"
                                onClick={() => {
                                  window.open(prop.photoUrl, '_blank');
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {prop.notes && (
                          <div className="mt-2.5 text-xs bg-amber-50 border border-amber-100 p-3 rounded-lg">
                            <span className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Catatan Kepala Sekolah ({schoolIdentity?.principal})</span>
                            <p className="text-amber-800 leading-relaxed font-bold italic">"{prop.notes}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS WITH HIGH GRAPHIC DESIGN PRINT LAYOUTS */}
          {activeTab === 'laporan' && (
            <div className="animate-fade-in flex flex-col gap-6 text-left">
              <div>
                <h2 className="font-extrabold text-lg text-slate-900">Rekapitulasi Pelaporan &amp; Cetak Berkas Sarpras</h2>
                <p className="text-slate-500 text-xs">Unduh atau cetak langsung laporan logistik resmi dalam layout kops surat sekolah yang sah.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Printable card 1 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                  <div>
                    <span className="text-[28px]">📜</span>
                    <h3 className="font-extrabold text-sm text-slate-800 mt-3">Laporan Aset Inventaris Sekolah</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Rekapitulasi lengkap seluruh daftar barang, jumlah total, ketersediaan, serta lokasi penyimpanan.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const headers = ["KODE", "NAMA BARANG", "TAHUN BELI", "KATEGORI", "LOKASI", "TOTAL", "TERSEDIA", "KONDISI"];
                      const rows = items.map(it => [
                        it.code,
                        it.name,
                        it.purchaseYear || "-",
                        it.category,
                        it.location,
                        `${it.totalQty} unit`,
                        `${it.availableQty} unit`,
                        it.condition
                      ]);
                      triggerPrintPreview("DAFTAR INVENTARIS BARANG DAN ASET SEKOLAH", headers, rows, [
                        { label: "Total Jumlah Macam Barang", value: `${items.length} Aset` },
                        { label: "Total Unit Secara Fisik", value: `${totalItemCount} Unit` }
                      ]);
                    }}
                    className="mt-6 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer size={13} /> Cetak Laporan Aset Master
                  </button>
                </div>

                {/* Printable card 2 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                  <div>
                    <span className="text-[28px]">🤝</span>
                    <h3 className="font-extrabold text-sm text-slate-800 mt-3">Laporan Aktivitas Peminjaman</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Pencatatan rincian peminjaman barang oleh para tenaga pendidik, baik yang aktif maupun riwayat pengembalian.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const headers = ["PEMINJAM", "NAMA BARANG", "JUMLAH", "TGL PINJAM", "TGL KEMBALI", "STATUS"];
                      const rows = loans.map(l => [
                        l.borrowerName,
                        l.itemName,
                        `${l.qty} unit`,
                        l.loanDate,
                        l.returnDate || "-",
                        l.status === 'dipinjam' ? 'Sedang Dipinjam' : 'Sudah Kembali'
                      ]);
                      triggerPrintPreview("LAPORAN AKTIVITAS DAN RIWAYAT PEMINJAMAN SARPRAS", headers, rows, [
                        { label: "Total Catatan Pinjaman", value: `${loans.length} Transaksi` },
                        { label: "Peminjaman Aktif Saat Ini", value: `${loans.filter(l => l.status === 'dipinjam').length} Pinjaman` }
                      ]);
                    }}
                    className="mt-6 w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer size={13} /> Cetak Laporan Peminjaman
                  </button>
                </div>

                {/* Printable card 3 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                  <div>
                    <span className="text-[28px]">🛒</span>
                    <h3 className="font-extrabold text-sm text-slate-800 mt-3">Laporan Sinking Budgets Belanja</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Daftar kalkulasi nominal anggaran pengeluaran belanja sarpras yang disetujui untuk pembiayaan instansi.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const headers = ["ID PROPOSAL", "KETERANGAN BELANJA", "JUMLAH", "ESTIMASI SATUAN", "TOTAL BIAYA", "TGL AJU", "STATUS"];
                      const rows = proposals.map(p => [
                        p.id,
                        p.itemName,
                        `${p.qty} unit`,
                        `Rp ${p.estimatedPrice.toLocaleString('id-ID')}`,
                        `Rp ${p.totalPrice.toLocaleString('id-ID')}`,
                        p.date,
                        p.status === 'approved' ? 'Disetujui' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'
                      ]);
                      triggerPrintPreview("LAPORAN ANGGARAN BELANJA DAN PROCUREMENT SARPRAS", headers, rows, [
                        { label: "Anggaran Disetujui Kepala Sekolah", value: `Rp ${approvedProposalBudget.toLocaleString('id-ID')}` },
                        { label: "Rancangan Anggaran Menunggu", value: `Rp ${pendingProposalBudget.toLocaleString('id-ID')}` }
                      ]);
                    }}
                    className="mt-6 w-full py-2 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer size={13} /> Cetak Laporan Belanja
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16 no-print select-none">
          {/* Menu 1 (Beranda - paling kiri) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setShowMoreMenu(false);
              setShowItemForm(false);
              setShowLoanForm(false);
              setShowProposalForm(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
              <Home size={20} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${activeTab === 'dashboard' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Beranda</span>
          </button>

          {/* Menu 2 (Katalog) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('katalog');
              setShowMoreMenu(false);
              setShowItemForm(false);
              setShowLoanForm(false);
              setShowProposalForm(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'katalog' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
              <Package size={20} className={activeTab === 'katalog' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${activeTab === 'katalog' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Katalog</span>
          </button>

          {/* Menu 3 (Peminjaman) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('peminjaman');
              setShowMoreMenu(false);
              setShowItemForm(false);
              setShowLoanForm(false);
              setShowProposalForm(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'peminjaman' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
              <Users2 size={20} className={activeTab === 'peminjaman' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${activeTab === 'peminjaman' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Pinjam</span>
          </button>

          {/* Menu 4 (Pengajuan) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pengajuan');
              setShowMoreMenu(false);
              setShowItemForm(false);
              setShowLoanForm(false);
              setShowProposalForm(false);
            }}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'pengajuan' ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
              <ShoppingCart size={20} className={activeTab === 'pengajuan' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${activeTab === 'pengajuan' ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Belanja</span>
          </button>

          {/* Menu 5 (Lainnya - Kotak Empat, Paling Kanan) */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(prev => !prev)}
            className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${showMoreMenu ? 'bg-indigo-50 text-indigo-650' : 'text-slate-400'}`}>
              <LayoutGrid size={20} className={showMoreMenu ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
            </div>
            <span className={`text-[9.5px] leading-none ${showMoreMenu ? 'text-indigo-650 font-bold' : 'text-slate-400 font-bold'}`}>Lainnya</span>
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
                className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10 no-print"
              >
                <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Pendukung</span>
                    <h4 className="text-slate-900 font-extrabold text-sm mt-0.5">Akses Tambahan Waka Sarpras</h4>
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
                      setActiveTab('laporan');
                      setShowMoreMenu(false);
                      setShowItemForm(false);
                      setShowLoanForm(false);
                      setShowProposalForm(false);
                    }}
                    className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                  >
                    <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">📊</span>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-800">Laporan &amp; Cetak</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Cetak draf log berkas inventarisasi</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('katalog');
                      setShowManageCatLoc(true);
                      setShowItemForm(false);
                      setShowMoreMenu(false);
                    }}
                    className="p-4 border border-slate-150 hover:bg-slate-50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all"
                  >
                    <span className="p-2 w-fit bg-indigo-50 rounded-xl text-indigo-650 text-lg">🛠️</span>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-800">Kelola Kategori &amp; Lokasi</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Pengaturan label &amp; ruang sarana</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onLogout();
                    }}
                    className="p-4 border border-red-100 hover:bg-red-50/50 rounded-2xl flex flex-col gap-2.5 text-left cursor-pointer transition-all col-span-2 sm:col-span-1"
                  >
                    <span className="p-2 w-fit bg-red-50 rounded-xl text-red-650 text-lg">🚪</span>
                    <div>
                      <h5 className="font-extrabold text-xs text-red-600">Keluar Portal</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Logout &amp; mengakhiri sesi kerja</p>
                    </div>
                  </button>
                </div>

                {/* Quick access to download Mobile Apps in the bottom sheet menu */}
                <div className="mt-3 border-t border-slate-100 pt-4 flex flex-col gap-2 shadow-3xs bg-slate-50/50 p-3 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    📲 Unduh Aplikasi Mobile Resmi
                  </span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Gunakan aplikasi mobile resmi untuk kemudahan akses monitor laporan logistik sarana prasarana &amp; data lembaga langsung lewat HP.
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

        {/* Non-blocking Elegant confirmation modal */}
        <AnimatePresence>
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-250 flex items-center justify-center p-4 no-print">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-slate-800">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h4 className="font-extrabold text-xs tracking-wider uppercase">{confirmDialog.title}</h4>
                </div>

                <div className="p-5.5 text-left text-xs font-semibold text-slate-600 leading-relaxed">
                  {confirmDialog.message}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-500 font-extrabold rounded-xl hover:bg-slate-150 cursor-pointer transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = confirmDialog.onConfirm();
                      if (res instanceof Promise) {
                        res.catch(err => console.error("Confirm callback error:", err));
                      }
                    }}
                    className="px-4 py-2 bg-rose-650 text-white font-extrabold rounded-xl hover:bg-rose-700 cursor-pointer transition-colors"
                  >
                    Konfirmasi
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Change Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 z-250 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs print:hidden">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border text-left border-slate-250 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
              >
                <div className="p-4 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
                      <Key size={14} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs tracking-tight">Ubah Sandi Waka Sarpras</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Keamanan Akun</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all text-sm font-bold"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="p-5 flex flex-col gap-3.5 text-xs font-semibold">
                  {passwordError && (
                    <div className="p-3 bg-rose-50 border border-rose-150 text-rose-850 rounded-xl text-[11px] font-bold">
                      {passwordError}
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-855 rounded-xl text-[11px] font-bold">
                      {passwordSuccess}
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
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
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
                      disabled={isChangingPassword}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold cursor-pointer transition-all text-center"
                    >
                      {isChangingPassword ? 'Menyimpan...' : 'Simpan Sandi'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
