import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Store,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Printer,
  FileSpreadsheet,
  Barcode,
  Package,
  TrendingUp,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wallet,
  CreditCard,
  X,
  PackagePlus,
  ShoppingBag,
  Receipt,
  User,
  Camera,
  CameraOff,
  Zap
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import {
  KoperasiProduct,
  KoperasiSaleTransaction,
  TreasurerTransaction,
  SchoolIdentity,
  Student,
  HomeroomTeacher,
  SubjectTeacher
} from '../types';
import {
  Code128BarcodeSvg,
  BarcodeLabelPrintModal,
  playScannerBeep,
  printKoperasiReceiptInstant,
  instantPrintHtmlDocument
} from '../utils/barcodeHelper';

interface KoperasiAdminPanelProps {
  schoolIdentity?: SchoolIdentity | null;
  students?: Student[];
  homerooms?: HomeroomTeacher[];
  subjectTeachers?: SubjectTeacher[];
  treasurerTransactions?: TreasurerTransaction[];
  onRefreshTreasurerTransactions?: () => void;
}

interface UnifiedTeacherBuyer {
  id: string;
  name: string;
  username: string;
  roleLabel: string;
  badgeText: string;
}

interface CartItem {
  product: KoperasiProduct;
  qty: number;
}

const CATEGORIES = [
  'Seragam',
  'Atribut',
  'Olahraga',
  'Kerudung & Jilbab',
  'Buku & LKS',
  'Alat Tulis',
  'Lainnya'
];

const ALL_CATEGORIES = ['Semua', ...CATEGORIES];
const SIZES = ['All Size', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '-'];
const UNITS = ['Pcs', 'Stel', 'Set', 'Paket', 'Potong', 'Pasang', 'Buku', 'Lembar', 'Lusin', 'Box'];

export const KoperasiAdminPanel: React.FC<KoperasiAdminPanelProps> = ({
  schoolIdentity,
  students = [],
  homerooms = [],
  subjectTeachers = [],
  treasurerTransactions = [],
  onRefreshTreasurerTransactions
}) => {
  // Default subTab is 'cashier' so Bendahara can immediately perform direct POS transactions in the panel
  const [subTab, setSubTab] = useState<'cashier' | 'inventory' | 'daily_report' | 'financial_report'>('cashier');
  const [products, setProducts] = useState<KoperasiProduct[]>([]);
  const [sales, setSales] = useState<KoperasiSaleTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fallbackHomerooms, setFallbackHomerooms] = useState<HomeroomTeacher[]>([]);
  const [fallbackSubjectTeachers, setFallbackSubjectTeachers] = useState<SubjectTeacher[]>([]);

  // Toast feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // =========================================================================
  // 1. STATE KASIR TRANSAKSI LANGSUNG (IN-PANEL POS CASHIER & BARCODE SCAN)
  // =========================================================================
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [posCategory, setPosCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [buyerType, setBuyerType] = useState<'student' | 'teacher' | 'general'>('student');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState<boolean>(false);
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<UnifiedTeacherBuyer | null>(null);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState<boolean>(false);
  const [generalBuyerName, setGeneralBuyerName] = useState<string>('');
  const [generalBuyerClass, setGeneralBuyerClass] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'kas' | 'bank'>('kas');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>('Bendahara / Kasir Koperasi');
  const [notes, setNotes] = useState<string>('');
  const [submittingSale, setSubmittingSale] = useState<boolean>(false);

  // Barcode Scanner States (USB Laser Gun + Camera Scanner)
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedInfo, setLastScannedInfo] = useState<{
    code: string;
    name: string;
    price: number;
    time: string;
  } | null>(null);

  // Receipt Print Modal State
  const [receiptSale, setReceiptSale] = useState<KoperasiSaleTransaction | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'thermal58' | 'thermal80' | 'a5'>('thermal80');
  const [autoPrintOnCheckout, setAutoPrintOnCheckout] = useState<boolean>(true);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestampRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const productsRef = useRef<KoperasiProduct[]>([]);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // =========================================================================
  // 2. STATE MASTER ATRIBUT (INPUT HARGA DASAR & HARGA JUAL) & RESTOCK
  // =========================================================================
  const [editingProduct, setEditingProduct] = useState<KoperasiProduct | null>(null);
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Atribut');
  const [formSize, setFormSize] = useState<string>('All Size');
  const [formUnit, setFormUnit] = useState<string>('Pcs');
  const [isCustomUnit, setIsCustomUnit] = useState<boolean>(false);
  const [formCustomUnit, setFormCustomUnit] = useState<string>('');
  const [formBasePrice, setFormBasePrice] = useState<string>('');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('50');
  const [formDescription, setFormDescription] = useState<string>('');
  const [savingProduct, setSavingProduct] = useState<boolean>(false);

  // Restock / Kulakan Modal
  const [restockProduct, setRestockProduct] = useState<KoperasiProduct | null>(null);
  const [restockQty, setRestockQty] = useState<string>('20');
  const [restockBasePrice, setRestockBasePrice] = useState<string>('');
  const [restockSellingPrice, setRestockSellingPrice] = useState<string>('');
  const [restockRecordExpense, setRestockRecordExpense] = useState<boolean>(true);
  const [restockPaymentMethod, setRestockPaymentMethod] = useState<'kas' | 'bank'>('kas');
  const [restockSupplier, setRestockSupplier] = useState<string>('');

  // Barcode Print Modal
  const [showBarcodeModal, setShowBarcodeModal] = useState<boolean>(false);
  const [barcodeProductId, setBarcodeProductId] = useState<string | null>(null);

  // Filters
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('Semua');

  const todayIso = new Date().toISOString().split('T')[0];
  const currentMonthIso = todayIso.slice(0, 7);

  // Daily Sales Filter
  const [dailyFilterMode, setDailyFilterMode] = useState<'single_day' | 'date_range' | 'all'>('single_day');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [startDate, setStartDate] = useState<string>(todayIso);
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [dailyPaymentFilter, setDailyPaymentFilter] = useState<'all' | 'kas' | 'bank'>('all');
  const [dailyCategoryFilter, setDailyCategoryFilter] = useState<string>('Semua');
  const [dailySizeFilter, setDailySizeFilter] = useState<string>('Semua');

  // Financial Report Filter
  const [financialMonth, setFinancialMonth] = useState<string>(currentMonthIso);
  const [financialAllPeriods, setFinancialAllPeriods] = useState<boolean>(false);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(prev => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const loadKoperasiData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/koperasi/products'),
        fetch('/api/koperasi/sales')
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) setProducts(pData);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData)) setSales(sData);
      }
      if (homerooms.length === 0 || subjectTeachers.length === 0) {
        const [hrRes, stRes] = await Promise.all([
          fetch('/api/homerooms'),
          fetch('/api/subject-teachers')
        ]);
        if (hrRes.ok) {
          const hrData = await hrRes.json();
          if (Array.isArray(hrData)) setFallbackHomerooms(hrData);
        }
        if (stRes.ok) {
          const stData = await stRes.json();
          if (Array.isArray(stData)) setFallbackSubjectTeachers(stData);
        }
      }
    } catch (e) {
      console.error('Error loading Koperasi data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKoperasiData();
  }, []);

  // =========================================================================
  // LOGIKA KASIR TRANSAKSI LANGSUNG & PEMINDAI BARCODE
  // =========================================================================
  const addToCart = useCallback(
    (product: KoperasiProduct, fromBarcode = false) => {
      if (product.stock <= 0) {
        playScannerBeep(false);
        showMessage('error', `Stok "${product.name} (${product.size})" sudah habis!`);
        return;
      }
      let addedSuccess = true;
      setCart(prev => {
        const idx = prev.findIndex(item => item.product.id === product.id);
        if (idx > -1) {
          const currentQty = prev[idx].qty;
          if (currentQty + 1 > product.stock) {
            addedSuccess = false;
            return prev;
          }
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: currentQty + 1 };
          return copy;
        }
        return [...prev, { product, qty: 1 }];
      });

      if (!addedSuccess) {
        playScannerBeep(false);
        showMessage('error', `Stok maksimum "${product.name}" hanya ${product.stock} ${product.unit}.`);
        return;
      }

      if (fromBarcode) {
        playScannerBeep(true);
        setLastScannedInfo({
          code: product.code,
          name: `${product.name}${product.size && product.size !== '-' ? ` (${product.size})` : ''}`,
          price: product.sellingPrice,
          time: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        });
        showMessage(
          'success',
          `[SCAN BARCODE] +1 ${product.name} (${product.size}) — Rp ${(product.sellingPrice || 0).toLocaleString('id-ID')} masuk keranjang kasir!`
        );
      }
    },
    [showMessage]
  );

  const handleProcessBarcodeScan = useCallback(
    (rawCode: string) => {
      const cleaned = String(rawCode || '').trim().toUpperCase();
      if (!cleaned) return false;

      const list = productsRef.current;
      let matched = list.find(
        p => p.isActive && (p.code.toUpperCase() === cleaned || p.id.toUpperCase() === cleaned)
      );
      if (!matched) {
        const normalizedScan = cleaned.replace(/[^A-Z0-9]/g, '');
        matched = list.find(
          p =>
            p.isActive &&
            p.code.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalizedScan
        );
      }

      if (matched) {
        addToCart(matched, true);
        return true;
      } else {
        playScannerBeep(false);
        showMessage('error', `Kode Barcode "${cleaned}" tidak ditemukan pada katalog atribut koperasi.`);
        return false;
      }
    },
    [addToCart, showMessage]
  );

  // Global USB / Bluetooth Laser Barcode Gun Listener when on 'cashier' tab
  useEffect(() => {
    if (subTab !== 'cashier') return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInputFocused) return;

      const now = Date.now();
      if (now - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          e.preventDefault();
          handleProcessBarcodeScan(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [subTab, handleProcessBarcodeScan]);

  // Camera Barcode Scanner Lifecycle (Html5Qrcode)
  useEffect(() => {
    if (!isCameraScannerOpen || subTab !== 'cashier') {
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
      return;
    }

    let isMounted = true;
    setCameraError(null);

    const startCamera = async () => {
      try {
        const scanner = new Html5Qrcode('bendahara-camera-barcode-reader');
        html5QrCodeRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 260, height: 120 }
          },
          decodedText => {
            if (!isMounted) return;
            const cleanCode = String(decodedText || '').trim().toUpperCase();
            if (!cleanCode) return;

            const now = Date.now();
            if (
              lastScanTimestampRef.current.code === cleanCode &&
              now - lastScanTimestampRef.current.time < 1400
            ) {
              return;
            }
            lastScanTimestampRef.current = { code: cleanCode, time: now };
            handleProcessBarcodeScan(cleanCode);
          },
          () => {}
        );
      } catch (_err) {
        if (isMounted) {
          setCameraError(
            'Kamera tidak dapat diakses. Pastikan izin kamera aktif atau gunakan kolom Scan Barcode USB/Manual.'
          );
        }
      }
    };

    const timer = setTimeout(startCamera, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [isCameraScannerOpen, subTab, handleProcessBarcodeScan]);

  const activePosProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive) return false;
      if (posCategory !== 'Semua' && p.category !== posCategory) return false;
      if (posSearchQuery.trim()) {
        const q = posSearchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.size.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, posCategory, posSearchQuery]);

  const allTeachers = useMemo<UnifiedTeacherBuyer[]>(() => {
    const hrList = homerooms.length > 0 ? homerooms : fallbackHomerooms;
    const stList = subjectTeachers.length > 0 ? subjectTeachers : fallbackSubjectTeachers;
    const map = new Map<string, UnifiedTeacherBuyer>();

    for (const hr of hrList) {
      if (!hr || !hr.name) continue;
      const key = hr.name.trim().toLowerCase();
      const subjPart = hr.subject ? ` • ${hr.subject}` : '';
      const roleLabel = hr.className ? `Wali Kelas ${hr.className}${subjPart}` : `Guru${subjPart}`;
      map.set(key, {
        id: hr.id || hr.username || key,
        name: hr.name.trim(),
        username: hr.username || '',
        roleLabel,
        badgeText: hr.className ? `Wali Kelas ${hr.className}` : 'Wali Kelas'
      });
    }

    for (const st of stList) {
      if (!st || !st.name) continue;
      const key = st.name.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        if (st.subject && !existing.roleLabel.toLowerCase().includes(st.subject.toLowerCase())) {
          existing.roleLabel = `${existing.roleLabel} • ${st.subject}`;
        }
      } else {
        const roleLabel = st.subject ? `Guru ${st.subject}` : 'Guru Mapel';
        map.set(key, {
          id: st.id || st.username || key,
          name: st.name.trim(),
          username: st.username || '',
          roleLabel,
          badgeText: st.subject ? `Guru ${st.subject}` : 'Guru Mapel'
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [homerooms, subjectTeachers, fallbackHomerooms, fallbackSubjectTeachers]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 12);
    const q = studentSearch.toLowerCase();
    return students
      .filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          String(s.nis).toLowerCase().includes(q) ||
          String(s.class || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [students, studentSearch]);

  const filteredTeachers = useMemo(() => {
    const queryText = (buyerType === 'teacher' ? teacherSearch : studentSearch).trim().toLowerCase();
    if (!queryText) return allTeachers.slice(0, 15);
    return allTeachers
      .filter(
        t =>
          t.name.toLowerCase().includes(queryText) ||
          t.roleLabel.toLowerCase().includes(queryText) ||
          t.username.toLowerCase().includes(queryText)
      )
      .slice(0, 15);
  }, [allTeachers, teacherSearch, studentSearch, buyerType]);

  const cartSummary = useMemo(() => {
    let totalQty = 0;
    let totalSelling = 0;
    let totalBase = 0;
    for (const item of cart) {
      totalQty += item.qty;
      totalSelling += item.qty * (item.product.sellingPrice || 0);
      totalBase += item.qty * (item.product.basePrice || 0);
    }
    return {
      totalQty,
      totalSelling,
      totalBase,
      totalProfit: totalSelling - totalBase
    };
  }, [cart]);

  const parsedCashReceived = useMemo(() => {
    if (paymentMethod === 'bank') return cartSummary.totalSelling;
    return Number(String(cashReceivedInput).replace(/[^0-9]/g, '')) || 0;
  }, [cashReceivedInput, paymentMethod, cartSummary.totalSelling]);

  const changeAmount = useMemo(() => {
    if (paymentMethod === 'bank') return 0;
    return Math.max(0, parsedCashReceived - cartSummary.totalSelling);
  }, [parsedCashReceived, cartSummary.totalSelling, paymentMethod]);

  const updateCartQty = (productId: string, newQty: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id !== productId) return item;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) {
            showMessage('error', `Stok "${item.product.name}" tersisa ${item.product.stock} ${item.product.unit}.`);
            return { ...item, qty: item.product.stock };
          }
          return { ...item, qty: newQty };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashReceivedInput('');
    setNotes('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showMessage('error', 'Pilih minimal 1 atribut sekolah ke dalam keranjang kasir.');
      return;
    }

    const buyerNameResolved =
      buyerType === 'student'
        ? selectedStudent?.name || studentSearch.trim() || 'Siswa SMP'
        : buyerType === 'teacher'
        ? selectedTeacher?.name || teacherSearch.trim() || 'Guru SMP'
        : generalBuyerName.trim() || 'Pembeli Umum / Siswa Baru';

    if (paymentMethod === 'kas' && parsedCashReceived < cartSummary.totalSelling) {
      showMessage(
        'error',
        `Nominal uang diterima (Rp ${parsedCashReceived.toLocaleString('id-ID')}) kurang dari total belanja (Rp ${cartSummary.totalSelling.toLocaleString('id-ID')}).`
      );
      return;
    }

    setSubmittingSale(true);
    try {
      const payload = {
        buyerType,
        studentId: buyerType === 'student' ? selectedStudent?.id : undefined,
        studentNis: buyerType === 'student' ? selectedStudent?.nis : undefined,
        studentName: buyerType === 'student' ? selectedStudent?.name : undefined,
        studentClass:
          buyerType === 'student'
            ? selectedStudent?.class
            : buyerType === 'general'
            ? generalBuyerClass.trim() || undefined
            : undefined,
        teacherId: buyerType === 'teacher' ? selectedTeacher?.id : undefined,
        teacherRole:
          buyerType === 'teacher'
            ? selectedTeacher?.roleLabel || 'Guru / Tendik'
            : undefined,
        buyerName: buyerNameResolved,
        items: cart.map(c => ({
          productId: c.product.id,
          productCode: c.product.code,
          productName: c.product.name,
          category: c.product.category,
          size: c.product.size,
          unit: c.product.unit,
          qty: c.qty,
          basePrice: c.product.basePrice,
          sellingPrice: c.product.sellingPrice
        })),
        paymentMethod,
        cashReceived: paymentMethod === 'bank' ? cartSummary.totalSelling : parsedCashReceived,
        notes,
        cashierName: cashierName.trim() || 'Bendahara Koperasi',
        date: todayIso
      };

      const res = await fetch('/api/koperasi/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Gagal memproses transaksi kasir.');
        return;
      }

      if (data.sale) {
        playScannerBeep(true);
        setReceiptSale(data.sale);
        if (autoPrintOnCheckout) {
          printKoperasiReceiptInstant(data.sale, {
            format: receiptFormat,
            schoolName: schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN",
            schoolAddress: schoolIdentity?.address || 'Jl. Raya Pandaan, Kab. Pasuruan, Jawa Timur'
          });
        }
        clearCart();
        setSelectedStudent(null);
        setStudentSearch('');
        setSelectedTeacher(null);
        setTeacherSearch('');
        setGeneralBuyerName('');
        setGeneralBuyerClass('');
        await loadKoperasiData();
        if (onRefreshTreasurerTransactions) onRefreshTreasurerTransactions();
        showMessage(
          'success',
          `Transaksi ${data.sale.invoiceNumber} berhasil! Keuangan (Rp ${data.sale.totalAmount.toLocaleString('id-ID')}) otomatis tercatat pada Pembukuan BKU Bendahara.`
        );
      }
    } catch (err: any) {
      showMessage('error', err?.message || 'Terjadi kesalahan jaringan saat memproses transaksi.');
    } finally {
      setSubmittingSale(false);
    }
  };

  // =========================================================================
  // LOGIKA CRUD MASTER ATRIBUT & RESTOCK
  // =========================================================================
  const availableUnits = useMemo(() => {
    const set = new Set<string>(UNITS);
    for (const p of products) {
      if (p.unit && p.unit.trim()) {
        set.add(p.unit.trim());
      }
    }
    return Array.from(set);
  }, [products]);

  const openAddProductForm = () => {
    setEditingProduct(null);
    const randomNum = String(products.length + 1).padStart(2, '0');
    setFormCode(`ATR-KOP-${randomNum}`);
    setFormName('');
    setFormCategory('Atribut');
    setFormSize('All Size');
    setFormUnit('Pcs');
    setIsCustomUnit(false);
    setFormCustomUnit('');
    setFormBasePrice('');
    setFormSellingPrice('');
    setFormStock('50');
    setFormDescription('');
    setShowProductForm(true);
  };

  const openEditProductForm = (prod: KoperasiProduct) => {
    setEditingProduct(prod);
    setFormCode(prod.code);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormSize(prod.size);
    const unitVal = (prod.unit || 'Pcs').trim();
    if (UNITS.includes(unitVal)) {
      setFormUnit(unitVal);
      setIsCustomUnit(false);
      setFormCustomUnit('');
    } else {
      setFormUnit(unitVal);
      setIsCustomUnit(true);
      setFormCustomUnit(unitVal);
    }
    setFormBasePrice(String(prod.basePrice || 0));
    setFormSellingPrice(String(prod.sellingPrice || 0));
    setFormStock(String(prod.stock || 0));
    setFormDescription(prod.description || '');
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showMessage('error', 'Nama atribut sekolah wajib diisi.');
      return;
    }

    const resolvedUnit = (isCustomUnit ? formCustomUnit : formUnit).trim();
    if (!resolvedUnit) {
      showMessage('error', 'Satuan barang wajib diisi atau dipilih.');
      return;
    }

    const parsedBase = Number(String(formBasePrice).replace(/[^0-9]/g, '')) || 0;
    const parsedSelling = Number(String(formSellingPrice).replace(/[^0-9]/g, '')) || 0;
    const parsedStock = Number(formStock) || 0;

    setSavingProduct(true);
    try {
      const url = editingProduct
        ? `/api/koperasi/products/${editingProduct.id}`
        : '/api/koperasi/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          category: formCategory,
          size: formSize,
          unit: resolvedUnit,
          basePrice: parsedBase,
          sellingPrice: parsedSelling,
          stock: parsedStock,
          description: formDescription.trim(),
          isActive: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Gagal menyimpan data atribut.');
        return;
      }

      showMessage(
        'success',
        editingProduct
          ? `Atribut "${formName}" berhasil diperbarui (Harga Dasar: Rp ${parsedBase.toLocaleString('id-ID')}, Harga Jual: Rp ${parsedSelling.toLocaleString('id-ID')}).`
          : `Atribut baru "${formName}" berhasil ditambahkan.`
      );
      setShowProductForm(false);
      await loadKoperasiData();
    } catch (err: any) {
      showMessage('error', err?.message || 'Gagal menyimpan produk.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (prod: KoperasiProduct) => {
    try {
      const res = await fetch(`/api/koperasi/products/${prod.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showMessage('success', `Atribut "${prod.name}" telah dihapus.`);
        await loadKoperasiData();
      }
    } catch (_err) {
      showMessage('error', 'Gagal menghapus atribut.');
    }
  };

  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const addStock = Number(restockQty) || 0;
    if (addStock <= 0) {
      showMessage('error', 'Jumlah penambahan stok harus lebih dari 0.');
      return;
    }

    try {
      const res = await fetch(`/api/koperasi/products/${restockProduct.id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addStock,
          newBasePrice: Number(String(restockBasePrice).replace(/[^0-9]/g, '')) || restockProduct.basePrice,
          newSellingPrice: Number(String(restockSellingPrice).replace(/[^0-9]/g, '')) || restockProduct.sellingPrice,
          recordAsExpense: restockRecordExpense,
          paymentMethod: restockPaymentMethod,
          supplierName: restockSupplier.trim(),
          date: todayIso
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Gagal menambah stok atribut.');
        return;
      }

      setRestockProduct(null);
      await loadKoperasiData();
      if (onRefreshTreasurerTransactions) onRefreshTreasurerTransactions();
      showMessage(
        'success',
        `Stok "${restockProduct.name}" berhasil ditambah +${addStock} ${restockProduct.unit}${
          restockRecordExpense ? ' dan pengeluaran belanja modal telah tercatat di Buku Kas Bendahara.' : '.'
        }`
      );
    } catch (err: any) {
      showMessage('error', err?.message || 'Gagal memproses penambahan stok.');
    }
  };

  const handleVoidSale = async (sale: KoperasiSaleTransaction) => {
    try {
      const res = await fetch(`/api/koperasi/sales/${sale.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showMessage(
          'success',
          `Transaksi ${sale.invoiceNumber} dibatalkan, stok dikembalikan, dan mutasi di Buku Kas Bendahara telah diperbarui.`
        );
        await loadKoperasiData();
        if (onRefreshTreasurerTransactions) onRefreshTreasurerTransactions();
      }
    } catch (_err) {
      showMessage('error', 'Gagal membatalkan transaksi penjualan.');
    }
  };

  // Filtered Products for Inventory Tab
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (inventoryCategory !== 'Semua' && p.category !== inventoryCategory) return false;
      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, inventoryCategory, inventorySearch]);

  // Inventory Summary
  const inventoryStats = useMemo(() => {
    let totalItems = 0;
    let totalBaseAsset = 0;
    let totalSellingAsset = 0;
    for (const p of products) {
      const st = Number(p.stock) || 0;
      totalItems += st;
      totalBaseAsset += st * (Number(p.basePrice) || 0);
      totalSellingAsset += st * (Number(p.sellingPrice) || 0);
    }
    return {
      productCount: products.length,
      totalItems,
      totalBaseAsset,
      totalSellingAsset,
      potentialProfit: totalSellingAsset - totalBaseAsset
    };
  }, [products]);

  const availableDailyCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    for (const s of sales) {
      for (const it of s.items || []) {
        if (it.category) set.add(it.category);
      }
    }
    return ['Semua', ...Array.from(set)];
  }, [products, sales]);

  const availableDailySizes = useMemo(() => {
    const set = new Set<string>(SIZES);
    for (const p of products) {
      if (p.size) set.add(p.size);
    }
    for (const s of sales) {
      for (const it of s.items || []) {
        if (it.size) set.add(it.size);
      }
    }
    return ['Semua', ...Array.from(set)];
  }, [products, sales]);

  // Filtered Daily Sales (supports date, payment method, category, and size filters)
  const filteredDailySales = useMemo(() => {
    const hasItemFilter = dailyCategoryFilter !== 'Semua' || dailySizeFilter !== 'Semua';
    const result: KoperasiSaleTransaction[] = [];

    for (const s of sales) {
      if (dailyPaymentFilter !== 'all' && s.paymentMethod !== dailyPaymentFilter) continue;
      if (dailyFilterMode === 'single_day' && s.date !== selectedDate) continue;
      if (dailyFilterMode === 'date_range' && (s.date < startDate || s.date > endDate)) continue;

      if (!hasItemFilter) {
        result.push(s);
        continue;
      }

      const matchedItems = (s.items || []).filter(it => {
        if (dailyCategoryFilter !== 'Semua' && it.category !== dailyCategoryFilter) return false;
        if (dailySizeFilter !== 'Semua' && it.size !== dailySizeFilter) return false;
        return true;
      });

      if (matchedItems.length === 0) continue;

      // Recalculate totals for the matched items when category/size filter is active
      let subQty = 0;
      let subBase = 0;
      let subSelling = 0;
      let subProfit = 0;
      for (const it of matchedItems) {
        const qty = Number(it.qty) || 0;
        const b = Number(it.subtotalBase) || qty * (Number(it.basePrice) || 0);
        const sel = Number(it.subtotalSelling) || qty * (Number(it.sellingPrice) || 0);
        subQty += qty;
        subBase += b;
        subSelling += sel;
        subProfit += sel - b;
      }

      result.push({
        ...s,
        items: matchedItems,
        totalQty: subQty,
        totalBaseAmount: subBase,
        totalAmount: subSelling,
        totalProfit: subProfit
      });
    }

    return result;
  }, [
    sales,
    dailyFilterMode,
    selectedDate,
    startDate,
    endDate,
    dailyPaymentFilter,
    dailyCategoryFilter,
    dailySizeFilter
  ]);

  const dailyReportMetrics = useMemo(() => {
    let totalQty = 0;
    let totalBase = 0;
    let totalSelling = 0;
    let totalProfit = 0;
    let totalKas = 0;
    let totalBank = 0;

    for (const s of filteredDailySales) {
      totalQty += Number(s.totalQty) || 0;
      totalBase += Number(s.totalBaseAmount) || 0;
      totalSelling += Number(s.totalAmount) || 0;
      totalProfit += Number(s.totalProfit) || 0;
      if (s.paymentMethod === 'bank') {
        totalBank += Number(s.totalAmount) || 0;
      } else {
        totalKas += Number(s.totalAmount) || 0;
      }
    }

    return {
      txCount: filteredDailySales.length,
      totalQty,
      totalBase,
      totalSelling,
      totalProfit,
      totalKas,
      totalBank
    };
  }, [filteredDailySales]);

  // Financial Report Calculations (Sales + Bookkeeping Integration)
  const financialSales = useMemo(() => {
    if (financialAllPeriods) return sales;
    return sales.filter(s => s.date.startsWith(financialMonth));
  }, [sales, financialMonth, financialAllPeriods]);

  const koperasiLedgerTransactions = useMemo(() => {
    return treasurerTransactions.filter(tx => {
      if (
        tx.id === 'tx-bnd-1793771771048' ||
        tx.noBukti === 'tx-bnd-1793771771048' ||
        tx.category === 'SPARIFDA MART'
      ) {
        return false;
      }
      const isKopCat =
        tx.category === 'Koperasi Sekolah' ||
        String(tx.id || '').startsWith('tx-kop-') ||
        (tx.description && tx.description.toLowerCase().includes('koperasi sekolah')) ||
        (tx.description && tx.description.toLowerCase().includes('kasir koperasi')) ||
        (tx.description && tx.description.toLowerCase().includes('kulakan koperasi'));
      if (!isKopCat) return false;
      if (!financialAllPeriods && !String(tx.date || '').startsWith(financialMonth)) {
        return false;
      }
      return true;
    });
  }, [treasurerTransactions, financialMonth, financialAllPeriods]);

  const financialSummary = useMemo(() => {
    let omzetSelling = 0;
    let hppBase = 0;
    let grossProfit = 0;
    let kasSales = 0;
    let bankSales = 0;

    for (const s of financialSales) {
      omzetSelling += Number(s.totalAmount) || 0;
      hppBase += Number(s.totalBaseAmount) || 0;
      grossProfit += Number(s.totalProfit) || 0;
      if (s.paymentMethod === 'bank') {
        bankSales += Number(s.totalAmount) || 0;
      } else {
        kasSales += Number(s.totalAmount) || 0;
      }
    }

    let bkuIncoming = 0;
    let bkuOutgoing = 0;
    for (const tx of koperasiLedgerTransactions) {
      if (tx.type === 'incoming') {
        bkuIncoming += Number(tx.amount) || 0;
      } else {
        bkuOutgoing += Number(tx.amount) || 0;
      }
    }

    return {
      omzetSelling,
      hppBase,
      grossProfit,
      kasSales,
      bankSales,
      bkuIncoming,
      bkuOutgoing,
      netCashBalance: bkuIncoming - bkuOutgoing,
      netOperatingProfit: grossProfit - bkuOutgoing
    };
  }, [financialSales, koperasiLedgerTransactions]);

  // Export Daily Sales to Excel
  const handleExportDailySalesExcel = () => {
    const rows: Record<string, string | number>[] = [];
    filteredDailySales.forEach((sale, idx) => {
      const itemsDetail = sale.items
        .map(it => `[${it.category}] ${it.productName} (Uk: ${it.size}) x${it.qty}`)
        .join('; ');
      const categoriesDetail = Array.from(new Set(sale.items.map(it => it.category))).join(', ');
      const sizesDetail = Array.from(new Set(sale.items.map(it => it.size))).join(', ');
      rows.push({
        No: idx + 1,
        'No. Nota / Struk': sale.invoiceNumber,
        Tanggal: sale.date,
        'Kategori Pembeli':
          sale.buyerType === 'teacher' ? 'Guru / Tendik' : sale.buyerType === 'student' ? 'Siswa' : 'Umum',
        'Nama Pembeli': sale.buyerName,
        'Kelas / Jabatan Guru':
          sale.buyerType === 'teacher' ? sale.teacherRole || 'Guru' : sale.studentClass || '-',
        NIS: sale.studentNis || '-',
        'Kategori Atribut': categoriesDetail,
        Ukuran: sizesDetail,
        'Rincian Atribut': itemsDetail,
        'Total Qty': sale.totalQty,
        'Total Harga Dasar / HPP (Rp)': sale.totalBaseAmount,
        'Total Harga Jual / Omzet (Rp)': sale.totalAmount,
        'Laba Bersih (Rp)': sale.totalProfit,
        'Metode Pembayaran': sale.paymentMethod === 'bank' ? 'Transfer / QRIS (Bank)' : 'Tunai (Kas)',
        'Petugas Kasir': sale.cashierName,
        'Status Pembukuan Bendahara': 'Tercatat Otomatis di BKU'
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan Harian');
    const periodLabel =
      dailyFilterMode === 'single_day'
        ? selectedDate
        : dailyFilterMode === 'date_range'
        ? `${startDate}_sd_${endDate}`
        : 'Semua_Periode';
    XLSX.writeFile(wb, `Laporan_Penjualan_Harian_Koperasi_${periodLabel}.xlsx`);
  };

  // Export Financial Report to Excel
  const handleExportFinancialExcel = () => {
    const summaryRows = [
      { Komponen: 'Total Omzet Penjualan Atribut (Harga Jual)', 'Nominal (Rp)': financialSummary.omzetSelling },
      { Komponen: 'Total Modal Pokok / HPP Atribut Terjual (Harga Dasar)', 'Nominal (Rp)': financialSummary.hppBase },
      { Komponen: 'Laba Kotor Penjualan Atribut (Harga Jual - Harga Dasar)', 'Nominal (Rp)': financialSummary.grossProfit },
      { Komponen: 'Penerimaan Tunai (Buku Pembantu Kas)', 'Nominal (Rp)': financialSummary.kasSales },
      { Komponen: 'Penerimaan Transfer/QRIS (Buku Pembantu Bank)', 'Nominal (Rp)': financialSummary.bankSales },
      { Komponen: 'Total Pemasukan Tercatat di BKU Bendahara (POS Koperasi)', 'Nominal (Rp)': financialSummary.bkuIncoming },
      { Komponen: 'Total Pengeluaran / Kulakan Stok Koperasi di BKU', 'Nominal (Rp)': financialSummary.bkuOutgoing },
      { Komponen: 'Saldo Kas Bersih Koperasi di BKU Bendahara', 'Nominal (Rp)': financialSummary.netCashBalance }
    ];

    const ledgerRows = koperasiLedgerTransactions.map((tx, idx) => ({
      No: idx + 1,
      Tanggal: tx.date,
      'No. Bukti': tx.noBukti || tx.id,
      'Jenis Mutasi': tx.type === 'incoming' ? 'Pemasukan (Kredit)' : 'Pengeluaran (Debit)',
      'Buku Kas': tx.paymentMethod === 'bank' ? 'Bank' : 'Kas Tunai',
      'Uraian Transaksi': tx.description,
      'Nominal (Rp)': tx.amount
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Ringkasan Keuangan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerRows), 'Mutasi BKU Koperasi');
    XLSX.writeFile(
      wb,
      `Laporan_Keuangan_Koperasi_${financialAllPeriods ? 'Semua_Periode' : financialMonth}.xlsx`
    );
  };

  const parsedFormBase = Number(String(formBasePrice).replace(/[^0-9]/g, '')) || 0;
  const parsedFormSelling = Number(String(formSellingPrice).replace(/[^0-9]/g, '')) || 0;
  const formUnitProfit = parsedFormSelling - parsedFormBase;

  const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
  const schoolAddress = schoolIdentity?.address || 'Jl. Raya Pandaan, Kab. Pasuruan, Jawa Timur';

  const handleInstantPrintDailyReport = () => {
    const periodText =
      dailyFilterMode === 'single_day'
        ? selectedDate
        : dailyFilterMode === 'date_range'
        ? `${startDate} s/d ${endDate}`
        : 'Semua Periode';
    const filterMeta = `Kategori: ${dailyCategoryFilter} • Ukuran: ${dailySizeFilter}`;

    const rowsHtml = filteredDailySales
      .map((sale, idx) => {
        const itemsText = sale.items
          .map(
            it =>
              `[${it.category}] ${it.productName} (Uk: ${it.size}) x${it.qty} [HPP: Rp ${(it.basePrice || 0).toLocaleString('id-ID')} -> Jual: Rp ${(it.sellingPrice || 0).toLocaleString('id-ID')}]`
          )
          .join('<br/>');
        const buyerSub =
          sale.buyerType === 'teacher'
            ? `<br/><small>${sale.teacherRole || 'Guru'}</small>`
            : sale.studentClass
            ? `<br/><small>Kelas ${sale.studentClass}</small>`
            : '';
        return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><strong>${sale.invoiceNumber}</strong></td>
          <td>${sale.date}</td>
          <td><strong>${sale.buyerName}</strong>${buyerSub}</td>
          <td>${itemsText}</td>
          <td style="text-align:center;">${sale.paymentMethod === 'bank' ? 'Bank/QRIS' : 'Kas Tunai'}</td>
          <td style="text-align:right;">Rp ${(sale.totalBaseAmount || 0).toLocaleString('id-ID')}</td>
          <td style="text-align:right;"><strong>Rp ${(sale.totalAmount || 0).toLocaleString('id-ID')}</strong></td>
          <td style="text-align:right;">+Rp ${(sale.totalProfit || 0).toLocaleString('id-ID')}</td>
        </tr>`;
      })
      .join('');

    const css = `
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
      .title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 5px 6px; font-size: 10.5px; vertical-align: top; }
      th { background: #f0f0f0; text-transform: uppercase; }
    `;

    const html = `
      <div class="header">
        <div class="title">LAPORAN PENJUALAN HARIAN KOPERASI SEKOLAH — ${schoolName}</div>
        <div>${schoolAddress}</div>
        <div style="margin-top:4px;font-weight:bold;">Periode: ${periodText} • ${filterMeta} • Total Nota: ${dailyReportMetrics.txCount} (${dailyReportMetrics.totalQty} Atribut)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:28px;">No</th>
            <th>No. Nota</th>
            <th>Tanggal</th>
            <th>Pembeli</th>
            <th>Rincian Atribut (Harga Dasar vs Harga Jual)</th>
            <th>Metode</th>
            <th>Total HPP</th>
            <th>Total Jual</th>
            <th>Laba</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="font-weight:bold;background:#f8f8f8;">
            <td colspan="6" style="text-align:right;">TOTAL AKUMULASI (${dailyReportMetrics.txCount} Transaksi / ${dailyReportMetrics.totalQty} Item):</td>
            <td style="text-align:right;">Rp ${dailyReportMetrics.totalBase.toLocaleString('id-ID')}</td>
            <td style="text-align:right;">Rp ${dailyReportMetrics.totalSelling.toLocaleString('id-ID')}</td>
            <td style="text-align:right;">+Rp ${dailyReportMetrics.totalProfit.toLocaleString('id-ID')}</td>
          </tr>
        </tfoot>
      </table>
    `;
    instantPrintHtmlDocument(html, css, `Laporan_Harian_Koperasi_${periodText}`);
  };

  const handleInstantPrintFinancialReport = () => {
    const periodLabel = financialAllPeriods ? 'Seluruh Periode' : financialMonth;
    const rowsHtml = koperasiLedgerTransactions
      .map(
        (tx, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${tx.date}</td>
          <td><strong>${tx.noBukti || tx.id}</strong></td>
          <td>${tx.category}</td>
          <td>${tx.description}</td>
          <td style="text-align:center;">${tx.paymentMethod === 'bank' ? 'Bank' : 'Kas Tunai'}</td>
          <td style="text-align:right;">${tx.type === 'incoming' ? `Rp ${(tx.amount || 0).toLocaleString('id-ID')}` : '-'}</td>
          <td style="text-align:right;">${tx.type === 'outgoing' ? `Rp ${(tx.amount || 0).toLocaleString('id-ID')}` : '-'}</td>
        </tr>`
      )
      .join('');

    const css = `
      @page { size: A4 portrait; margin: 10mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
      .title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
      .summary { display: table; width: 100%; border: 1px solid #000; margin-bottom: 10px; }
      .summary-cell { display: table-cell; width: 33.3%; padding: 6px 8px; border-right: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 5px 6px; font-size: 10px; vertical-align: top; }
      th { background: #f0f0f0; text-transform: uppercase; }
    `;

    const html = `
      <div class="header">
        <div class="title">LAPORAN KEUANGAN & BKU KOPERASI SEKOLAH — ${schoolName}</div>
        <div>${schoolAddress}</div>
        <div style="margin-top:4px;font-weight:bold;">Periode: ${periodLabel}</div>
      </div>
      <div class="summary">
        <div class="summary-cell">
          <div><strong>1. Laba Rugi Penjualan</strong></div>
          <div>Omzet Jual: Rp ${financialSummary.omzetSelling.toLocaleString('id-ID')}</div>
          <div>Modal HPP: Rp ${financialSummary.hppBase.toLocaleString('id-ID')}</div>
          <div><strong>Laba Kotor: Rp ${financialSummary.grossProfit.toLocaleString('id-ID')}</strong></div>
        </div>
        <div class="summary-cell">
          <div><strong>2. Posisi Kas vs Bank</strong></div>
          <div>Kas Tunai: Rp ${financialSummary.kasSales.toLocaleString('id-ID')}</div>
          <div>Bank/QRIS: Rp ${financialSummary.bankSales.toLocaleString('id-ID')}</div>
        </div>
        <div class="summary-cell" style="border-right:none;">
          <div><strong>3. Mutasi BKU Bendahara</strong></div>
          <div>Pemasukan BKU: +Rp ${financialSummary.bkuIncoming.toLocaleString('id-ID')}</div>
          <div>Pengeluaran BKU: -Rp ${financialSummary.bkuOutgoing.toLocaleString('id-ID')}</div>
          <div><strong>Saldo BKU: Rp ${financialSummary.netCashBalance.toLocaleString('id-ID')}</strong></div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:28px;">No</th>
            <th>Tanggal</th>
            <th>No. Bukti</th>
            <th>POS</th>
            <th>Uraian Pembukuan</th>
            <th>Buku Kas</th>
            <th>Pemasukan</th>
            <th>Pengeluaran</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    instantPrintHtmlDocument(html, css, `Laporan_Keuangan_Koperasi_${periodLabel}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner in Bendahara Panel */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
              KASIR &amp; KOPERASI BENDAHARA
            </span>
            <span className="text-xs text-emerald-200 font-semibold">
              • Transaksi Langsung &amp; Otomatis Tercatat pada Pembukuan BKU Bendahara
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Kasir Koperasi &amp; Penjualan Atribut Sekolah
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl">
            Lakukan transaksi penjualan atribut langsung dengan Scan Barcode &amp; Cetak Struk, kelola Harga Dasar (HPP) &amp; Harga Jual, serta pantau laporan penjualan harian &amp; keuangan yang otomatis tercatat di Buku Kas Terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setBarcodeProductId(null);
              setShowBarcodeModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black shadow-md transition cursor-pointer"
          >
            <Barcode className="w-4 h-4" />
            <span>Cetak Label Barcode Atribut</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-semibold print:hidden ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs inside Bendahara Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('cashier')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
              subTab === 'cashier'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>1. Kasir Transaksi Atribut (POS)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
              subTab === 'inventory'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Data Atribut, Harga Dasar &amp; Harga Jual ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('daily_report')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
              subTab === 'daily_report'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Laporan Penjualan Harian</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('financial_report')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
              subTab === 'financial_report'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>4. Laporan Keuangan &amp; BKU</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadKoperasiData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: KASIR TRANSAKSI LANGSUNG DI PANEL BENDAHARA (POS)        */}
      {/* =================================================================== */}
      {subTab === 'cashier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:hidden">
          {/* LEFT COLUMN (7/12 or 8/12): BARCODE SCANNER BAR + KATALOG ATRIBUT */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* PANEL PEMINDAI BARCODE CEPAT */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-emerald-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase text-white">
                        Pemindai Barcode Transaksi Cepat (Auto-Add Keranjang)
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-400/40 text-[10px] font-bold text-emerald-200">
                        Ready Scan
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80">
                      Tembak barcode atribut dengan Scanner Laser USB/Wireless, ketik kode lalu Enter, atau gunakan Kamera Pemindai.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow cursor-pointer ${
                      isCameraScannerOpen
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    }`}
                  >
                    {isCameraScannerOpen ? (
                      <>
                        <CameraOff className="w-4 h-4" />
                        <span>Tutup Kamera Scan</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Scan Kamera Barcode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (barcodeInput.trim()) {
                    handleProcessBarcodeScan(barcodeInput.trim());
                    setBarcodeInput('');
                  }
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value.toUpperCase())}
                    placeholder="Arahkan Scanner Barcode ke sini atau ketik kode (misal: ATR-SRG-01) lalu tekan Enter..."
                    className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950/90 border border-emerald-600/60 focus:border-amber-400 text-white placeholder-slate-400 text-xs sm:text-sm font-mono outline-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    + Tambah
                  </button>
                </div>

                {lastScannedInfo && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-900/70 border border-emerald-500/40 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-mono font-bold text-amber-300">
                        {lastScannedInfo.code}
                      </span>{' '}
                      <span className="font-semibold text-white">{lastScannedInfo.name}</span>{' '}
                      <span className="text-emerald-300">({lastScannedInfo.time})</span>
                    </div>
                  </div>
                )}
              </form>

              {isCameraScannerOpen && (
                <div className="bg-slate-950 rounded-xl p-3 border border-emerald-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-400" />
                      Arahkan Label Barcode Atribut ke Kotak Pemindai Kamera
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Otomatis masuk keranjang saat terbaca
                    </span>
                  </div>
                  {cameraError ? (
                    <div className="p-4 rounded-lg bg-rose-950/70 border border-rose-700 text-rose-200 text-xs">
                      {cameraError}
                    </div>
                  ) : (
                    <div
                      id="bendahara-camera-barcode-reader"
                      className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black min-h-[180px]"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Search & Category Filter Bar */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={posSearchQuery}
                  onChange={e => setPosSearchQuery(e.target.value)}
                  placeholder="Cari nama atribut sekolah, seragam, ukuran, atau kode barcode..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {ALL_CATEGORIES.map(cat => {
                  const isActive = posCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPosCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Cards Grid */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-sm font-semibold">Memuat daftar atribut koperasi sekolah...</p>
              </div>
            ) : activePosProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <Package className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                <p className="text-base font-bold text-slate-700">Tidak ada atribut ditemukan</p>
                <p className="text-xs text-slate-500 mt-1">
                  Silakan tambahkan atribut baru pada tab &ldquo;2. Data Atribut, Harga Dasar &amp; Harga Jual&rdquo;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {activePosProducts.map(product => {
                  const inCartItem = cart.find(c => c.product.id === product.id);
                  const outOfStock = product.stock <= 0;
                  const unitProfit = (product.sellingPrice || 0) - (product.basePrice || 0);
                  return (
                    <div
                      key={product.id}
                      onClick={() => !outOfStock && addToCart(product)}
                      className={`group bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between relative ${
                        outOfStock
                          ? 'border-slate-200 opacity-60 cursor-not-allowed'
                          : inCartItem
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md cursor-pointer'
                          : 'border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {inCartItem && (
                        <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow">
                          {inCartItem.qty}x di Keranjang
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px] font-bold flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-emerald-700" />
                            {product.code}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                              {product.category}
                            </span>
                            {product.size && product.size !== '-' && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-extrabold">
                                Uk: {product.size}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-emerald-800 transition-colors">
                          {product.name}
                        </h3>

                        {/* Mini Visual Barcode Strip on Card */}
                        <div className="mt-2 pt-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                          <div className="w-28">
                            <Code128BarcodeSvg value={product.code} height={18} showText={false} />
                          </div>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setBarcodeProductId(product.id);
                              setShowBarcodeModal(true);
                            }}
                            className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs cursor-pointer"
                            title="Cetak Stiker Barcode untuk Atribut Ini"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Label</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between gap-2">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            HPP: Rp {(product.basePrice || 0).toLocaleString('id-ID')} • Laba: +Rp{' '}
                            {unitProfit.toLocaleString('id-ID')}
                          </div>
                          <div className="text-base font-black text-emerald-700">
                            Rp {(product.sellingPrice || 0).toLocaleString('id-ID')}
                            <span className="text-xs font-normal text-slate-500">
                              {' '}
                              / {product.unit}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              outOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : product.stock <= 10
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {outOfStock ? 'Stok Habis' : `Stok: ${product.stock} ${product.unit}`}
                          </span>

                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={e => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              outOfStock
                                ? 'bg-slate-200 text-slate-400'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Pilih</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5/12 or 4/12): KERANJANG KASIR & PEMBAYARAN LANGSUNG */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden sticky top-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-black text-sm sm:text-base">KERANJANG TRANSAKSI KASIR</h2>
                  <p className="text-[11px] text-slate-400">
                    Otomatis tercatat di Buku Kas Terpadu (BKU)
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-300 hover:text-rose-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* 1. Data Pembeli (Siswa / Guru / Umum) */}
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Identitas Pembeli
                  </label>
                  <div className="flex rounded-lg bg-slate-200 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBuyerType('student')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        buyerType === 'student'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyerType('teacher')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        buyerType === 'teacher'
                          ? 'bg-white text-indigo-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Guru ({allTeachers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuyerType('general')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        buyerType === 'general'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Umum / Baru
                    </button>
                  </div>
                </div>

                {buyerType === 'student' ? (
                  <div className="relative">
                    {selectedStudent ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2">
                        <div>
                          <div className="text-xs font-extrabold text-emerald-950">
                            {selectedStudent.name}
                          </div>
                          <div className="text-[11px] text-emerald-700 font-medium">
                            NIS: {selectedStudent.nis} • Kelas {selectedStudent.class}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(null);
                            setStudentSearch('');
                          }}
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={studentSearch}
                            onFocus={() => setShowStudentDropdown(true)}
                            onChange={e => {
                              setStudentSearch(e.target.value);
                              setShowStudentDropdown(true);
                            }}
                            placeholder="Cari nama siswa, NIS, kelas (atau nama guru)..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm outline-none focus:border-emerald-600"
                          />
                        </div>
                        {showStudentDropdown &&
                          (filteredStudents.length > 0 ||
                            (studentSearch.trim().length >= 2 && filteredTeachers.length > 0)) && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                              {filteredStudents.map(st => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudent(st);
                                    setStudentSearch(st.name);
                                    setShowStudentDropdown(false);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 border-b border-slate-100 last:border-none flex items-center justify-between cursor-pointer"
                                >
                                  <div>
                                    <div className="text-xs font-bold text-slate-800">{st.name}</div>
                                    <div className="text-[11px] text-slate-500">NIS: {st.nis}</div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                                    Kelas {st.class}
                                  </span>
                                </button>
                              ))}

                              {studentSearch.trim().length >= 2 && filteredTeachers.length > 0 && (
                                <>
                                  <div className="px-3 py-1 bg-indigo-50 text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 border-y border-indigo-100">
                                    Data Guru Ditemukan (Klik untuk Pilih Guru)
                                  </div>
                                  {filteredTeachers.slice(0, 6).map(tch => (
                                    <button
                                      key={`cross-tch-${tch.id}`}
                                      type="button"
                                      onClick={() => {
                                        setBuyerType('teacher');
                                        setSelectedTeacher(tch);
                                        setTeacherSearch(tch.name);
                                        setShowStudentDropdown(false);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 border-b border-slate-100 last:border-none flex items-center justify-between cursor-pointer"
                                    >
                                      <div>
                                        <div className="text-xs font-bold text-indigo-950">{tch.name}</div>
                                        <div className="text-[11px] text-indigo-700">{tch.roleLabel}</div>
                                      </div>
                                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                        Guru
                                      </span>
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                ) : buyerType === 'teacher' ? (
                  <div className="relative">
                    {selectedTeacher ? (
                      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-300 rounded-xl px-3 py-2">
                        <div>
                          <div className="text-xs font-extrabold text-indigo-950">
                            {selectedTeacher.name}
                          </div>
                          <div className="text-[11px] text-indigo-700 font-medium">
                            {selectedTeacher.roleLabel}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacher(null);
                            setTeacherSearch('');
                          }}
                          className="p-1 text-indigo-700 hover:bg-indigo-100 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <User className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={teacherSearch}
                            onFocus={() => setShowTeacherDropdown(true)}
                            onChange={e => {
                              setTeacherSearch(e.target.value);
                              setShowTeacherDropdown(true);
                            }}
                            placeholder="Ketik nama guru, wali kelas, atau mata pelajaran..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs sm:text-sm outline-none focus:border-indigo-600"
                          />
                        </div>
                        {showTeacherDropdown && filteredTeachers.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                            {filteredTeachers.map(tch => (
                              <button
                                key={tch.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTeacher(tch);
                                  setTeacherSearch(tch.name);
                                  setShowTeacherDropdown(false);
                                }}
                                className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 border-b border-slate-100 last:border-none flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">{tch.name}</div>
                                  <div className="text-[11px] text-slate-500 truncate">{tch.roleLabel}</div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-bold shrink-0">
                                  {tch.badgeText}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={generalBuyerName}
                      onChange={e => setGeneralBuyerName(e.target.value)}
                      placeholder="Nama Pembeli / Siswa Baru..."
                      className="col-span-2 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      value={generalBuyerClass}
                      onChange={e => setGeneralBuyerClass(e.target.value)}
                      placeholder="Kelas/Ket (Opsional)"
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm outline-none focus:border-emerald-600"
                    />
                  </div>
                )}
              </div>

              {/* 2. Daftar Item di Keranjang */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <span>Daftar Atribut Dibeli ({cartSummary.totalQty} Item)</span>
                  <span>Subtotal</span>
                </div>

                {cart.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-1.5 opacity-60" />
                    <p className="text-xs font-semibold">
                      Scan barcode atribut atau klik kartu produk di sebelah kiri untuk menambahkan ke keranjang.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                    {cart.map(item => {
                      const sub = item.qty * (item.product.sellingPrice || 0);
                      return (
                        <div key={item.product.id} className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-emerald-700 font-bold">
                                {item.product.code}
                              </span>
                              <span>•</span>
                              <span>Uk: {item.product.size}</span>
                              <span>•</span>
                              <span>
                                @ Rp {(item.product.sellingPrice || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={item.product.stock}
                              value={item.qty}
                              onChange={e =>
                                updateCartQty(item.product.id, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-10 text-center text-xs font-bold border border-slate-300 rounded-lg py-1"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right min-w-[82px]">
                            <div className="text-xs font-extrabold text-slate-900">
                              Rp {sub.toLocaleString('id-ID')}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Metode Pembayaran & Uang Diterima */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Metode Pembayaran (Masuk Pembukuan Bendahara)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('kas')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        paymentMethod === 'kas'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Tunai (Buku Kas)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        paymentMethod === 'bank'
                          ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Transfer / QRIS (Bank)</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'kas' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      type="text"
                      value={
                        cashReceivedInput
                          ? Number(String(cashReceivedInput).replace(/[^0-9]/g, '') || 0).toLocaleString('id-ID')
                          : ''
                      }
                      onChange={e => setCashReceivedInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Masukkan nominal uang diterima..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-extrabold text-base text-slate-900 focus:border-emerald-600 outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCashReceivedInput(String(cartSummary.totalSelling))}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold cursor-pointer"
                      >
                        Uang Pas
                      </button>
                      {[50000, 100000, 150000, 200000, 300000, 500000].map(nom => (
                        <button
                          key={nom}
                          type="button"
                          onClick={() => setCashReceivedInput(String(nom))}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          {nom / 1000}rb
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Petugas Kasir / Bendahara
                    </label>
                    <input
                      type="text"
                      value={cashierName}
                      onChange={e => setCashierName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Catatan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ket. ukuran/pesan..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Ringkasan Total, HPP/Laba & Kembalian */}
              <div className="bg-emerald-950 text-white p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-200">
                  <span>Total Item ({cartSummary.totalQty} Unit)</span>
                  <span>
                    HPP: Rp {cartSummary.totalBase.toLocaleString('id-ID')} • Laba: +Rp{' '}
                    {cartSummary.totalProfit.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-base sm:text-lg font-black">
                  <span>TOTAL TAGIHAN</span>
                  <span className="text-amber-300">
                    Rp {cartSummary.totalSelling.toLocaleString('id-ID')}
                  </span>
                </div>
                {paymentMethod === 'kas' && (
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-emerald-800/80">
                    <span className="text-emerald-200">Uang Kembalian</span>
                    <span className="font-black text-sm text-emerald-300">
                      Rp {changeAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrintOnCheckout}
                    onChange={e => setAutoPrintOnCheckout(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Langsung Cetak Struk Thermal (Render Cepat)</span>
                </label>
                <select
                  value={receiptFormat}
                  onChange={e => setReceiptFormat(e.target.value as 'thermal58' | 'thermal80' | 'a5')}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-800"
                >
                  <option value="thermal58">Thermal 58mm</option>
                  <option value="thermal80">Thermal 80mm</option>
                  <option value="a5">Nota A5</option>
                </select>
              </div>

              <button
                type="button"
                disabled={submittingSale || cart.length === 0}
                onClick={handleCheckout}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  submittingSale || cart.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>
                  {submittingSale
                    ? 'Memproses Transaksi...'
                    : 'PROSES TRANSAKSI & CETAK STRUK'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: DATA ATRIBUT, HARGA DASAR & HARGA JUAL, STOK & BARCODE   */}
      {/* =================================================================== */}
      {subTab === 'inventory' && (
        <div className="space-y-5">
          {/* Inventory Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Jenis &amp; Total Stok Atribut</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {inventoryStats.productCount} Jenis{' '}
                <span className="text-sm font-bold text-emerald-700">
                  ({inventoryStats.totalItems.toLocaleString('id-ID')} Unit)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Siap dijual &amp; dipindai dengan barcode di Kasir
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Nilai Modal Persediaan (Harga Dasar)
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                Rp {inventoryStats.totalBaseAsset.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total Stok × Harga Dasar (HPP)
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 uppercase">
                Nilai Jual Persediaan (Harga Jual)
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                Rp {inventoryStats.totalSellingAsset.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Total Stok × Harga Jual Koperasi
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="text-xs font-bold text-emerald-800 uppercase">
                Potensi Laba Persediaan
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                Rp {inventoryStats.potentialProfit.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Selisih Harga Jual dikurangi Harga Dasar
              </div>
            </div>
          </div>

          {/* Filter & Add Product Button */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={e => setInventorySearch(e.target.value)}
                  placeholder="Cari nama atribut, kode barcode, atau kategori..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm outline-none focus:border-emerald-600"
                />
              </div>

              <select
                value={inventoryCategory}
                onChange={e => setInventoryCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white"
              >
                <option value="Semua">Semua Kategori</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBarcodeProductId(null);
                  setShowBarcodeModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer"
              >
                <Barcode className="w-4 h-4 text-emerald-700" />
                <span>Cetak Massal Barcode</span>
              </button>

              <button
                type="button"
                onClick={openAddProductForm}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Atribut &amp; Harga</span>
              </button>
            </div>
          </div>

          {/* Product Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                    <th className="p-3.5">Barcode &amp; Kode</th>
                    <th className="p-3.5">Nama Atribut Sekolah</th>
                    <th className="p-3.5 text-center">Kategori &amp; Ukuran</th>
                    <th className="p-3.5 text-right bg-amber-50/60">Harga Dasar / HPP</th>
                    <th className="p-3.5 text-right bg-emerald-50/60">Harga Jual</th>
                    <th className="p-3.5 text-right">Laba / Unit</th>
                    <th className="p-3.5 text-center">Stok</th>
                    <th className="p-3.5 text-center">Aksi &amp; Barcode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map(prod => {
                    const unitProfit = (prod.sellingPrice || 0) - (prod.basePrice || 0);
                    const marginPct =
                      prod.basePrice > 0
                        ? Math.round((unitProfit / prod.basePrice) * 100)
                        : 0;
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80">
                        <td className="p-3.5 w-40">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            <Code128BarcodeSvg value={prod.code} height={24} showText={true} />
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{prod.name}</div>
                          {prod.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{prod.description}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                            {prod.category}
                          </span>
                          <div className="text-xs font-extrabold text-indigo-700 mt-1">
                            Ukuran: {prod.size}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-700 bg-amber-50/30">
                          Rp {(prod.basePrice || 0).toLocaleString('id-ID')}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Modal / {prod.unit}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-700 bg-emerald-50/30">
                          Rp {(prod.sellingPrice || 0).toLocaleString('id-ID')}
                          <div className="text-[10px] text-emerald-600 font-normal">
                            Jual / {prod.unit}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div
                            className={`font-extrabold ${
                              unitProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            +Rp {unitProfit.toLocaleString('id-ID')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            Margin {marginPct}%
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                              prod.stock <= 0
                                ? 'bg-rose-100 text-rose-800'
                                : prod.stock <= 10
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prod.stock} {prod.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setBarcodeProductId(prod.id);
                                setShowBarcodeModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              title="Cetak Stiker Barcode Atribut Ini"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRestockProduct(prod);
                                setRestockQty('20');
                                setRestockBasePrice(String(prod.basePrice || 0));
                                setRestockSellingPrice(String(prod.sellingPrice || 0));
                                setRestockRecordExpense(true);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                              title="Tambah Stok / Kulakan Atribut"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProductForm(prod)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer"
                              title="Edit Harga Dasar, Harga Jual & Nama Atribut"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                              title="Hapus Atribut"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: LAPORAN PENJUALAN HARIAN KOPERASI SEKOLAH                */}
      {/* =================================================================== */}
      {subTab === 'daily_report' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDailyFilterMode('single_day')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    dailyFilterMode === 'single_day'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Per Tanggal Harian
                </button>
                <button
                  type="button"
                  onClick={() => setDailyFilterMode('date_range')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    dailyFilterMode === 'date_range'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Rentang Tanggal
                </button>
                <button
                  type="button"
                  onClick={() => setDailyFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    dailyFilterMode === 'all'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Semua Transaksi
                </button>
              </div>

              {dailyFilterMode === 'single_day' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold"
                />
              )}

              {dailyFilterMode === 'date_range' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                  <span className="text-xs text-slate-500">s/d</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              )}

              <select
                value={dailyCategoryFilter}
                onChange={e => setDailyCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                title="Filter Kategori Atribut"
              >
                {availableDailyCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'Semua' ? 'Semua Kategori Atribut' : `Kategori: ${cat}`}
                  </option>
                ))}
              </select>

              <select
                value={dailySizeFilter}
                onChange={e => setDailySizeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                title="Filter Ukuran Atribut"
              >
                {availableDailySizes.map(sz => (
                  <option key={sz} value={sz}>
                    {sz === 'Semua' ? 'Semua Ukuran' : `Ukuran: ${sz}`}
                  </option>
                ))}
              </select>

              <select
                value={dailyPaymentFilter}
                onChange={e => setDailyPaymentFilter(e.target.value as 'all' | 'kas' | 'bank')}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
              >
                <option value="all">Semua Metode Bayar</option>
                <option value="kas">Tunai (Buku Kas)</option>
                <option value="bank">Transfer / QRIS (Bank)</option>
              </select>

              {(dailyCategoryFilter !== 'Semua' ||
                dailySizeFilter !== 'Semua' ||
                dailyPaymentFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setDailyCategoryFilter('Semua');
                    setDailySizeFilter('Semua');
                    setDailyPaymentFilter('all');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportDailySalesExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleInstantPrintDailyReport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan Harian</span>
              </button>
            </div>
          </div>

          {/* Daily Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Volume Transaksi &amp; Item Terjual
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {dailyReportMetrics.txCount} Nota{' '}
                <span className="text-sm font-bold text-emerald-700">
                  ({dailyReportMetrics.totalQty} Atribut)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Kas: Rp {dailyReportMetrics.totalKas.toLocaleString('id-ID')} • Bank: Rp{' '}
                {dailyReportMetrics.totalBank.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
              <div className="text-xs font-bold text-amber-800 uppercase">
                Total Modal / Harga Dasar (HPP)
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                Rp {dailyReportMetrics.totalBase.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Akumulasi Harga Dasar atribut terjual
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 uppercase">
                Total Omzet Penjualan (Harga Jual)
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                Rp {dailyReportMetrics.totalSelling.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Otomatis masuk Buku Kas Terpadu Bendahara
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-xs">
              <div className="text-xs font-bold text-emerald-900 uppercase">
                Laba Bersih Penjualan Harian
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                Rp {dailyReportMetrics.totalProfit.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-emerald-800 mt-1">
                Harga Jual dikurangi Harga Dasar (HPP)
              </div>
            </div>
          </div>

          {/* Daily Sales Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  RINCIAN LAPORAN PENJUALAN HARIAN KOPERASI — {schoolName}
                </h3>
                <p className="text-xs text-slate-500">
                  Periode:{' '}
                  {dailyFilterMode === 'single_day'
                    ? selectedDate
                    : dailyFilterMode === 'date_range'
                    ? `${startDate} s/d ${endDate}`
                    : 'Semua Periode'}
                  {' • '}Kategori: <strong className="text-slate-700">{dailyCategoryFilter}</strong>
                  {' • '}Ukuran: <strong className="text-slate-700">{dailySizeFilter}</strong>
                </p>
              </div>
              {(dailyCategoryFilter !== 'Semua' || dailySizeFilter !== 'Semua') && (
                <div className="flex items-center gap-1.5">
                  {dailyCategoryFilter !== 'Semua' && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                      Kategori: {dailyCategoryFilter}
                    </span>
                  )}
                  {dailySizeFilter !== 'Semua' && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                      Ukuran: {dailySizeFilter}
                    </span>
                  )}
                </div>
              )}
            </div>

            {filteredDailySales.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm text-slate-600">
                  Tidak ada transaksi penjualan atribut pada tanggal/periode ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                      <th className="p-3">No. Nota</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Pembeli</th>
                      <th className="p-3">Rincian Atribut (Harga Dasar vs Harga Jual)</th>
                      <th className="p-3 text-center">Metode</th>
                      <th className="p-3 text-right">Total HPP</th>
                      <th className="p-3 text-right">Total Jual</th>
                      <th className="p-3 text-right">Laba</th>
                      <th className="p-3 text-center print:hidden">Struk &amp; Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDailySales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-emerald-800">
                          {sale.invoiceNumber}
                        </td>
                        <td className="p-3 text-slate-600">{sale.date}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{sale.buyerName}</div>
                          {sale.buyerType === 'teacher' ? (
                            <div className="text-[11px] text-indigo-700 font-semibold">
                              {sale.teacherRole || 'Guru / Tendik'}
                            </div>
                          ) : (
                            sale.studentClass && (
                              <div className="text-[11px] text-slate-500">
                                Kelas {sale.studentClass}
                              </div>
                            )
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1.5">
                            {sale.items.map((it, idx) => (
                              <div key={idx} className="text-xs text-slate-700 flex flex-wrap items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                  {it.category}
                                </span>
                                <span className="font-semibold text-slate-900">{it.productName}</span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-extrabold">
                                  Uk: {it.size}
                                </span>
                                <span>
                                  × <strong>{it.qty}</strong>
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  [HPP: Rp {(it.basePrice || 0).toLocaleString('id-ID')} → Jual: Rp{' '}
                                  {(it.sellingPrice || 0).toLocaleString('id-ID')}]
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              sale.paymentMethod === 'bank'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sale.paymentMethod === 'bank' ? 'Bank/QRIS' : 'Kas Tunai'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-600">
                          Rp {(sale.totalBaseAmount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          Rp {(sale.totalAmount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-extrabold text-emerald-700">
                          +Rp {(sale.totalProfit || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                printKoperasiReceiptInstant(sale, {
                                  format: receiptFormat,
                                  schoolName,
                                  schoolAddress
                                })
                              }
                              className="p-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Langsung Cetak Struk Thermal (Render Cepat)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak Cepat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReceiptSale(sale)}
                              className="p-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Pratinjau Struk Nota"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Struk</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoidSale(sale)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                              title="Batalkan Transaksi (Kembalikan Stok & Hapus dari BKU)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-xs sm:text-sm">
                      <td colSpan={5} className="p-3.5 text-right uppercase">
                        TOTAL AKUMULASI ({filteredDailySales.length} Transaksi /{' '}
                        {dailyReportMetrics.totalQty} Item):
                      </td>
                      <td className="p-3.5 text-right text-amber-200">
                        Rp {dailyReportMetrics.totalBase.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right text-emerald-300">
                        Rp {dailyReportMetrics.totalSelling.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right text-amber-400">
                        +Rp {dailyReportMetrics.totalProfit.toLocaleString('id-ID')}
                      </td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: LAPORAN KEUANGAN KOPERASI & INTEGRASI BKU BENDAHARA      */}
      {/* =================================================================== */}
      {subTab === 'financial_report' && (
        <div className="space-y-5">
          {/* Top Period & Export Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-extrabold uppercase text-slate-600">
                Periode Laporan Keuangan:
              </label>
              <input
                type="month"
                disabled={financialAllPeriods}
                value={financialMonth}
                onChange={e => setFinancialMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold disabled:opacity-50"
              />
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={financialAllPeriods}
                  onChange={e => setFinancialAllPeriods(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Tampilkan Seluruh Periode</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportFinancialExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Laporan Keuangan (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleInstantPrintFinancialReport}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan Keuangan</span>
              </button>
            </div>
          </div>

          {/* Neraca Laba Rugi & Arus Kas Koperasi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-slate-500">
                  1. Laba Rugi Penjualan Atribut
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Penjualan (Harga Jual):</span>
                  <span className="font-bold text-slate-900">
                    Rp {financialSummary.omzetSelling.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Modal Terjual (Harga Dasar):</span>
                  <span className="font-bold text-rose-700">
                    (Rp {financialSummary.hppBase.toLocaleString('id-ID')})
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-emerald-700">
                  <span>LABA KOTOR PENJUALAN:</span>
                  <span>Rp {financialSummary.grossProfit.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-slate-500">
                  2. Posisi Kas vs Bank Koperasi
                </span>
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Penerimaan Tunai (Buku Kas):</span>
                  <span className="font-bold text-emerald-800">
                    Rp {financialSummary.kasSales.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Penerimaan Transfer/QRIS (Bank):</span>
                  <span className="font-bold text-blue-800">
                    Rp {financialSummary.bankSales.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>TOTAL PEMASUKAN KASIR:</span>
                  <span>Rp {financialSummary.omzetSelling.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-950 text-white p-5 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-emerald-300">
                  3. Integrasi Pembukuan (BKU Bendahara)
                </span>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex justify-between text-emerald-100">
                  <span>Pemasukan POS Koperasi di BKU:</span>
                  <span className="font-bold text-emerald-300">
                    +Rp {financialSummary.bkuIncoming.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-100">
                  <span>Pengeluaran / Kulakan Stok di BKU:</span>
                  <span className="font-bold text-rose-300">
                    -Rp {financialSummary.bkuOutgoing.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-emerald-800 flex justify-between text-sm font-black text-amber-300">
                  <span>SALDO KAS BKU KOPERASI:</span>
                  <span>Rp {financialSummary.netCashBalance.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table of Koperasi Transactions in Bendahara's Bookkeeping */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  BUKU PEMBUKUAN KOPERASI SEKOLAH (TERCATAT OTOMATIS DI BKU BENDAHARA)
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar mutasi pemasukan penjualan atribut dan pengeluaran belanja modal stok koperasi pada Buku Kas Terpadu Bendahara.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {koperasiLedgerTransactions.length} Mutasi BKU
              </span>
            </div>

            {koperasiLedgerTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">
                Belum ada mutasi keuangan Koperasi Sekolah pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">No. Bukti / Nota</th>
                      <th className="p-3">POS Anggaran</th>
                      <th className="p-3">Uraian Pembukuan (Termasuk HPP &amp; Laba)</th>
                      <th className="p-3 text-center">Buku Kas</th>
                      <th className="p-3 text-right">Pemasukan (Rp)</th>
                      <th className="p-3 text-right">Pengeluaran (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {koperasiLedgerTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-600 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {tx.noBukti || tx.id}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-bold">
                            {tx.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 text-xs">{tx.description}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              tx.paymentMethod === 'bank'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tx.paymentMethod === 'bank' ? 'Bank' : 'Kas Tunai'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {tx.type === 'incoming'
                            ? `Rp ${(tx.amount || 0).toLocaleString('id-ID')}`
                            : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600">
                          {tx.type === 'outgoing'
                            ? `Rp ${(tx.amount || 0).toLocaleString('id-ID')}`
                            : '-'}
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

      {/* =================================================================== */}
      {/* MODAL STRUK / NOTA KASIR KOPERASI SEKOLAH (INSTANT THERMAL PRINT)   */}
      {/* =================================================================== */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="font-black text-sm block leading-tight">STRUK PEMBAYARAN KOPERASI</span>
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    Engine Cetak Thermal Instan (Tanpa Delay Render Windows Print)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setReceiptFormat('thermal58')}
                    className={`px-2 py-1 rounded-md cursor-pointer ${
                      receiptFormat === 'thermal58' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                    }`}
                  >
                    58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptFormat('thermal80')}
                    className={`px-2 py-1 rounded-md cursor-pointer ${
                      receiptFormat === 'thermal80' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptFormat('a5')}
                    className={`px-2 py-1 rounded-md cursor-pointer ${
                      receiptFormat === 'a5' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                    }`}
                  >
                    Nota A5
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptSale(null)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Tercatat otomatis pada Pembukuan Bendahara (POS Koperasi Sekolah •{' '}
                {receiptSale.paymentMethod === 'bank' ? 'Buku Pembantu Bank' : 'Buku Pembantu Kas'}).
              </span>
            </div>

            <div className="p-5 bg-slate-50 flex justify-center">
              <div
                id="koperasi-printable-receipt"
                className={`bg-white border border-slate-300 shadow-xs text-slate-900 ${
                  receiptFormat === 'thermal58'
                    ? 'w-[250px] p-3.5 font-mono text-[11px]'
                    : receiptFormat === 'thermal80'
                    ? 'w-[310px] p-4 font-mono text-xs'
                    : 'w-full p-6 font-sans text-xs sm:text-sm'
                }`}
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
                  <div className="font-black text-sm uppercase">KOPERASI SEKOLAH</div>
                  <div className="font-bold text-xs uppercase">{schoolName}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{schoolAddress}</div>
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2.5 mb-2.5">
                  <div className="flex justify-between">
                    <span>No. Struk:</span>
                    <span className="font-bold">{receiptSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>
                      {receiptSale.date}{' '}
                      {new Date(receiptSale.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pembeli:</span>
                    <span className="font-bold text-right">
                      {receiptSale.buyerName}
                      {receiptSale.buyerType === 'teacher'
                        ? ` (${receiptSale.teacherRole || 'Guru'})`
                        : receiptSale.studentClass
                        ? ` (${receiptSale.studentClass})`
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{receiptSale.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pembayaran:</span>
                    <span className="uppercase font-bold">
                      {receiptSale.paymentMethod === 'bank' ? 'Transfer / QRIS' : 'Tunai / Kas'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-dashed border-slate-400 pb-3 mb-3">
                  {receiptSale.items.map((item, idx) => (
                    <div key={idx} className="text-[11px]">
                      <div className="font-bold">
                        {item.productName}{' '}
                        {item.size && item.size !== '-' && item.size !== 'All Size'
                          ? `(Uk: ${item.size})`
                          : ''}
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>
                          {item.qty} {item.unit} x Rp {(item.sellingPrice || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="font-bold">
                          Rp {(item.subtotalSelling || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-black text-sm">
                    <span>TOTAL BAYAR</span>
                    <span>Rp {(receiptSale.totalAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Uang Diterima</span>
                    <span>Rp {(receiptSale.cashReceived || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>Kembalian</span>
                    <span>Rp {(receiptSale.changeAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {receiptSale.notes && (
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600">
                    Catatan: {receiptSale.notes}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex justify-center">
                  <div className="w-40">
                    <Code128BarcodeSvg value={receiptSale.invoiceNumber} height={24} showText={true} />
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-dashed border-slate-400 text-center text-[10px] text-slate-600 space-y-0.5">
                  <div className="font-bold">Terima Kasih Atas Pembelian Anda</div>
                  <div>Barang/Atribut yang sudah dibeli sesuai ukuran</div>
                  <div>Bukti Sah Pembayaran Koperasi Sekolah</div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2.5">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cetak terisolasi 1 halaman penuh (Instan)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptSale(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printKoperasiReceiptInstant(receiptSale, {
                      format: receiptFormat,
                      schoolName,
                      schoolAddress
                    })
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Struk Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL TAMBAH / EDIT ATRIBUT (INPUT HARGA DASAR & HARGA JUAL)         */}
      {/* =================================================================== */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">
                  {editingProduct
                    ? 'Edit Atribut, Harga Dasar & Harga Jual'
                    : 'Tambah Atribut Koperasi Sekolah Baru'}
                </h3>
                <p className="text-xs text-slate-300">
                  Dilengkapi input Harga Dasar (HPP), Harga Jual, dan generator Barcode otomatis
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Kode Barcode / SKU Atribut
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={e => setFormCode(e.target.value.toUpperCase())}
                      placeholder="ATR-SRG-01"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs sm:text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormCode(
                          `ATR-${Math.floor(1000 + Math.random() * 9000)}`
                        )
                      }
                      className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Acak
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Kategori Atribut
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Nama Atribut / Seragam Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Contoh: Seragam Olahraga Lengkap / Topi Bordir SMP..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              {/* INPUT HARGA DASAR DAN HARGA JUAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-amber-900 mb-1">
                    Harga Dasar / Modal HPP (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    value={
                      formBasePrice
                        ? Number(String(formBasePrice).replace(/[^0-9]/g, '') || 0).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={e => setFormBasePrice(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Contoh: 75.000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white font-bold text-slate-900 text-sm"
                  />
                  <span className="text-[11px] text-slate-500">
                    Harga beli/kulakan dari konveksi atau supplier
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-emerald-900 mb-1">
                    Harga Jual Koperasi (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    value={
                      formSellingPrice
                        ? Number(String(formSellingPrice).replace(/[^0-9]/g, '') || 0).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={e => setFormSellingPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Contoh: 95.000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-400 bg-white font-black text-emerald-800 text-sm"
                  />
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Laba / Margin Otomatis: Rp {formUnitProfit.toLocaleString('id-ID')} /{' '}
                    {(isCustomUnit ? formCustomUnit : formUnit).trim() || 'Unit'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Ukuran
                  </label>
                  <select
                    value={formSize}
                    onChange={e => setFormSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white"
                  >
                    {SIZES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold uppercase text-slate-600">
                      Satuan Barang
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCustomUnit) {
                          setIsCustomUnit(true);
                          setFormCustomUnit(formUnit);
                        } else {
                          setIsCustomUnit(false);
                        }
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {isCustomUnit ? 'Pilih Daftar' : '+ Satuan Custom'}
                    </button>
                  </div>

                  {isCustomUnit ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={formCustomUnit}
                        onChange={e => setFormCustomUnit(e.target.value)}
                        placeholder="Ketik satuan (mis: Rim, Meter, Roll)..."
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500 bg-emerald-50/40 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  ) : (
                    <select
                      value={formUnit}
                      onChange={e => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomUnit(true);
                          setFormCustomUnit('');
                        } else {
                          setFormUnit(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold bg-white"
                    >
                      {availableUnits.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Ketik Satuan Custom...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Keterangan singkat atribut..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div className="sm:col-span-5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">
                    Pratinjau Barcode
                  </div>
                  <div className="w-36 mx-auto">
                    <Code128BarcodeSvg value={formCode || 'ATR-01'} height={24} showText={true} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow cursor-pointer"
                >
                  {savingProduct ? 'Menyimpan...' : 'Simpan Atribut & Harga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL TAMBAH STOK / KULAKAN ATRIBUT (OPSIONAL CATAT PENGELUARAN BKU) */}
      {/* =================================================================== */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Tambah Stok / Kulakan Atribut</h3>
                <p className="text-xs text-slate-300">
                  {restockProduct.name} (Uk: {restockProduct.size})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestockProduct(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRestock} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Jumlah Stok Masuk ({restockProduct.unit})
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-black text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Harga Dasar / HPP (Rp)
                  </label>
                  <input
                    type="text"
                    value={
                      restockBasePrice
                        ? Number(String(restockBasePrice).replace(/[^0-9]/g, '') || 0).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={e => setRestockBasePrice(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="text"
                    value={
                      restockSellingPrice
                        ? Number(String(restockSellingPrice).replace(/[^0-9]/g, '') || 0).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={e => setRestockSellingPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockRecordExpense}
                    onChange={e => setRestockRecordExpense(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    Catat otomatis sebagai Pengeluaran Kulakan di Buku Kas Terpadu (BKU) Bendahara
                  </span>
                </label>

                {restockRecordExpense && (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-amber-900 font-semibold">
                      Total Biaya Kulakan: Rp{' '}
                      {(
                        (Number(restockQty) || 0) *
                        (Number(String(restockBasePrice).replace(/[^0-9]/g, '')) || 0)
                      ).toLocaleString('id-ID')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={restockPaymentMethod}
                        onChange={e => setRestockPaymentMethod(e.target.value as 'kas' | 'bank')}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold"
                      >
                        <option value="kas">Ambil dari Kas Tunai</option>
                        <option value="bank">Transfer dari Bank</option>
                      </select>
                      <input
                        type="text"
                        value={restockSupplier}
                        onChange={e => setRestockSupplier(e.target.value)}
                        placeholder="Nama Konveksi/Supplier..."
                        className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                >
                  Simpan Penambahan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK LABEL BARCODE */}
      {showBarcodeModal && (
        <BarcodeLabelPrintModal
          products={products}
          initialSelectedProductId={barcodeProductId}
          schoolName={`KOPERASI ${schoolName}`}
          onClose={() => {
            setShowBarcodeModal(false);
            setBarcodeProductId(null);
          }}
        />
      )}
    </div>
  );
};
export default KoperasiAdminPanel;
