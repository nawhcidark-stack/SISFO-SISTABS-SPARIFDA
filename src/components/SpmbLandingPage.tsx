import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SpmbConfig, 
  SpmbCandidate, 
  SpmbSession, 
  SpmbUniformItem, 
  SchoolIdentity 
} from '../types';
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Users, 
  ArrowRight, 
  Sparkles, 
  CreditCard, 
  FileText, 
  Upload, 
  Search, 
  Check, 
  AlertCircle, 
  Printer, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  User, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  Shirt, 
  Award,
  Layers,
  ArrowLeft,
  Info,
  Building2,
  Coins,
  Receipt,
  Percent,
  Lock,
  Unlock
} from 'lucide-react';
import QRCode from 'qrcode';

interface SpmbLandingPageProps {
  schoolIdentity?: SchoolIdentity;
  onBackToPortal?: () => void;
  onBackToLogin?: () => void;
  midtransClientKey?: string;
  isProduction?: boolean;
}

export default function SpmbLandingPage({
  schoolIdentity,
  onBackToPortal,
  onBackToLogin,
  midtransClientKey = '',
  isProduction = false
}: SpmbLandingPageProps) {
  const handleBack = onBackToLogin || onBackToPortal;
  // Navigation tabs in landing page
  const [activeTab, setActiveTab] = useState<'info' | 'register' | 'portal'>('info');

  // SPMB Config & State
  const [config, setConfig] = useState<SpmbConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [selectedGenderPreview, setSelectedGenderPreview] = useState<'male' | 'female'>('female');
  const [selectedSchoolPreview, setSelectedSchoolPreview] = useState<'maarif_jogosari' | 'other'>('maarif_jogosari');

  // Candidate Registration State (Step 1)
  const [regForm, setRegForm] = useState({
    fullName: '',
    nisn: '',
    nik: '',
    gender: 'L' as 'L' | 'P',
    birthPlace: 'Pasuruan',
    birthDate: '2014-05-12',
    phone: '',
    schoolOriginType: 'maarif_jogosari' as 'maarif_jogosari' | 'other',
    manualSchoolName: '',
    schoolOrigin: 'SD MAARIF JOGOSARI',
    sessionId: 'inden'
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [isProcessingTokenPay, setIsProcessingTokenPay] = useState<boolean>(false);

  // Candidate Portal / Check Status State (Step 2-5)
  const [searchNisn, setSearchNisn] = useState<string>('');
  const [activeCandidate, setActiveCandidate] = useState<SpmbCandidate | null>(null);
  const [isSearchingCandidate, setIsSearchingCandidate] = useState<boolean>(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalTab, setPortalTab] = useState<'status' | 'form' | 'docs' | 'rereg' | 'card'>('status');

  // Full Data Lengkap Siswa Form State
  const [fullForm, setFullForm] = useState<Partial<SpmbCandidate>>({});
  const [isSavingFullForm, setIsSavingFullForm] = useState<boolean>(false);
  const [fullFormSuccessMsg, setFullFormSuccessMsg] = useState<string | null>(null);

  // Re-registration & Uniform Size State
  const [selectedUniformSize, setSelectedUniformSize] = useState<string>('L');
  const [customUniformNote, setCustomUniformNote] = useState<string>('');
  const [isProcessingReRegPay, setIsProcessingReRegPay] = useState<boolean>(false);

  // Documents Upload State (5 berkas utama: Akte Kelahiran, KK, KTP Ayah, KTP Ibu, Foto Siswa)
  const [docUploads, setDocUploads] = useState<{
    aktaPhoto?: string;
    kkPhoto?: string;
    ktpAyahPhoto?: string;
    ktpIbuPhoto?: string;
    pasPhoto?: string;
    sklPhoto?: string;
    kipPhoto?: string;
  }>({});
  const [isUploadingDocs, setIsUploadingDocs] = useState<boolean>(false);
  const [docsSuccessMsg, setDocsSuccessMsg] = useState<string | null>(null);

  // Modal Midtrans Token & Order ID
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [snapOrderId, setSnapOrderId] = useState<string | null>(null);
  const [snapAmount, setSnapAmount] = useState<number>(0);
  const [snapTitle, setSnapTitle] = useState<string>('');
  const [snapRedirectUrl, setSnapRedirectUrl] = useState<string | null>(null);
  const [snapPayType, setSnapPayType] = useState<'token' | 'rereg'>('token');
  const [snapError, setSnapError] = useState<string | null>(null);
  const [isSnapReady, setIsSnapReady] = useState<boolean>(false);
  const [midtransConfigState, setMidtransConfigState] = useState<{ clientKey: string; isProduction: boolean; isDisabled?: boolean } | null>(null);

  // QR Code data URL for registration proof card
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Helper: Format Alamat Gabung Otomatis dari Dusun, RT, RW, Desa, Kecamatan
  const formatCombinedAddress = (dusun?: string, rt?: string, rw?: string, village?: string, district?: string) => {
    const cleanDusun = (dusun || '').trim();
    const cleanRt = (rt || '').replace(/\D/g, '');
    const cleanRw = (rw || '').replace(/\D/g, '');
    const cleanVillage = (village || '').trim();
    const cleanDistrict = (district || '').trim();

    const formattedRt = cleanRt ? `RT. ${cleanRt.padStart(3, '0')}` : '';
    const formattedRw = cleanRw ? `RW. ${cleanRw.padStart(3, '0')}` : '';

    let rtRwPart = '';
    if (formattedRt && formattedRw) {
      rtRwPart = `${formattedRt}, ${formattedRw}`;
    } else if (formattedRt) {
      rtRwPart = formattedRt;
    } else if (formattedRw) {
      rtRwPart = formattedRw;
    }

    const parts: string[] = [];
    if (cleanDusun && rtRwPart) {
      parts.push(`${cleanDusun} ${rtRwPart}`);
    } else if (cleanDusun) {
      parts.push(cleanDusun);
    } else if (rtRwPart) {
      parts.push(rtRwPart);
    }

    if (cleanVillage) parts.push(cleanVillage);
    if (cleanDistrict) parts.push(cleanDistrict);

    return parts.join(', ');
  };

  // Helper: Format Tanggal Lahir (dd/mm/yyyy)
  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return '-';
    const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const [_, y, m, d] = match;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return dateString;
  };

  // Helper: Otomatis kompres gambar menjadi maksimal 1000px
  const compressImageToMax1000px = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const MAX_SIZE = 1000;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => {
          resolve(event.target?.result as string);
        };
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Fetch SPMB configuration from backend
  const loadConfig = async () => {
    try {
      setIsLoadingConfig(true);
      const res = await fetch(`/api/spmb/config?_t=${Date.now()}`);
      if (res.ok) {
        const data: SpmbConfig = await res.json();
        setConfig(data);
        if (data.sessions && data.sessions.length > 0) {
          const activeSession = data.sessions.find(s => s.isActive) || data.sessions[0];
          setRegForm(prev => ({ ...prev, sessionId: activeSession.id }));
        }
      }
    } catch (e) {
      console.error('Failed to load SPMB config:', e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Fetch Midtrans Config & Load Snap.js Script
  useEffect(() => {
    const initMidtransSnapScript = async () => {
      let isProd = isProduction;
      let cKey = midtransClientKey;

      try {
        const res = await fetch(`/api/midtrans-config?_t=${Date.now()}`);
        if (res.ok) {
          const cfg = await res.json();
          if (cfg) {
            setMidtransConfigState(cfg);
            isProd = !!cfg.isProduction;
            cKey = cfg.clientKey || cKey;
          }
        }
      } catch (e) {
        console.error('Failed to load Midtrans config in SPMB landing:', e);
      }

      const scriptSrc = isProd
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';

      const altSrc = isProd
        ? 'https://app.sandbox.midtrans.com/snap/snap.js'
        : 'https://app.midtrans.com/snap/snap.js';

      const altScript = document.querySelector(`script[src="${altSrc}"]`);
      if (altScript) {
        altScript.remove();
        if ((window as any).snap) {
          try { delete (window as any).snap; } catch (_) { (window as any).snap = undefined; }
        }
      }

      const existingScript = document.querySelector(`script[src="${scriptSrc}"]`) as HTMLScriptElement;
      if ((window as any).snap) {
        setIsSnapReady(true);
      } else if (existingScript) {
        existingScript.onload = () => setIsSnapReady(true);
      } else {
        const script = document.createElement('script');
        script.src = scriptSrc;
        if (cKey) {
          script.setAttribute('data-client-key', cKey);
        }
        script.async = true;
        script.onload = () => setIsSnapReady(true);
        script.onerror = () => {
          console.error('Failed to load Midtrans snap.js script');
          setSnapError('Gagal memuat modul Midtrans Snap. Periksa koneksi internet Anda.');
        };
        document.body.appendChild(script);
      }
    };

    initMidtransSnapScript();
  }, [midtransClientKey, isProduction]);

  // Open Midtrans Snap Payment Overlay
  const triggerSnapPayment = (tokenToPay?: string | null, orderIdToPay?: string | null, payType?: 'token' | 'rereg') => {
    const token = tokenToPay || snapToken;
    const orderId = orderIdToPay || snapOrderId;
    const type = payType || snapPayType;
    if (!token) return;

    setSnapError(null);
    const snapInstance = (window as any).snap;

    if (snapInstance && typeof snapInstance.pay === 'function') {
      try {
        snapInstance.pay(token, {
          onSuccess: (result: any) => {
            console.log('Midtrans Snap payment success:', result);
            handlePaymentSuccess(result?.order_id || orderId, type, result?.payment_type);
          },
          onPending: (result: any) => {
            console.log('Midtrans Snap payment pending:', result);
            setSnapError('Pembayaran dalam status pending. Silakan selesaikan pembayaran sesuai panduan Midtrans.');
          },
          onError: (result: any) => {
            console.error('Midtrans Snap payment error:', result);
            setSnapError(result?.status_message || 'Pembayaran dibatalkan atau ditolak oleh Midtrans.');
            if (type === 'token') {
              handleCancelTokenPayment(orderId || undefined);
            }
          },
          onClose: () => {
            console.log('Midtrans Snap closed by user');
            // Do NOT mark as paid when closed
          }
        });
      } catch (err: any) {
        console.error('Error invoking snap.pay:', err);
        setSnapError(err.message || 'Gagal membuka jendela popup Midtrans Snap.');
      }
    } else {
      setSnapError('Modul Midtrans Snap belum siap. Silakan klik tombol Buka Jendela Midtrans lagi atau gunakan tautan alternatif.');
    }
  };

  // Fetch candidate details by NISN
  const handleCheckStatus = async (nisnToCheck?: string) => {
    const nisn = nisnToCheck || searchNisn.trim();
    if (!nisn) {
      setPortalError('Masukkan nomor NISN Anda untuk mengecek status pendaftaran.');
      return;
    }

    setPortalError(null);
    setIsSearchingCandidate(true);

    try {
      const res = await fetch(`/api/spmb/candidate/${encodeURIComponent(nisn)}?_t=${Date.now()}`);
      if (res.ok) {
        const candidate: SpmbCandidate = await res.json();
        setActiveCandidate(candidate);
        setFullForm(candidate);
        setDocUploads(candidate.documents || {});
        setSelectedUniformSize(candidate.selectedUniformSize || 'L');
        setCustomUniformNote(candidate.customUniformNote || '');
        setActiveTab('portal');

        // Otomatis arahkan ke tahap aktif (tahap terdepan yang belum selesai tapi sudah terbuka)
        const isStep1Done = Boolean(candidate.tokenPaymentStatus === 'paid' || candidate.tokenPaid);
        const isStep2Done = isStep1Done && Boolean(candidate.isFormCompleted);
        const hasDocs = Boolean(candidate.documentsUploaded || (candidate.documents && (candidate.documents.aktaPhoto || candidate.documents.kkPhoto || candidate.documents.pasPhoto)));
        const isStep3Done = isStep2Done && hasDocs;
        const isStep4Done = isStep3Done && Boolean(candidate.reRegistrationStatus === 'paid' || candidate.reRegistrationPaid);

        if (!isStep1Done) {
          setPortalTab('status');
        } else if (!isStep2Done) {
          setPortalTab('form');
        } else if (!isStep3Done) {
          setPortalTab('docs');
        } else if (!isStep4Done) {
          setPortalTab('rereg');
        } else {
          setPortalTab('card');
        }
        
        // Generate QR for Candidate Card
        QRCode.toDataURL(`SPMB-${candidate.nisn}-${candidate.fullName}`, {
          margin: 1,
          width: 140,
          color: { dark: '#0f172a', light: '#ffffff' }
        }).then(url => setQrCodeDataUrl(url)).catch(() => {});
      } else {
        const err = await res.json();
        setPortalError(err.error || 'Calon siswa belum menyelesaikan pembayaran token atau data tidak ditemukan. Data pendaftaran tidak tersimpan, silakan input formulir pendaftaran ulang.');
        setActiveCandidate(null);
      }
    } catch (e) {
      console.error('Error fetching candidate:', e);
      setPortalError('Gagal menghubungkan ke server. Silakan periksa koneksi Anda.');
    } finally {
      setIsSearchingCandidate(false);
    }
  };

  // Calculate Equipment and Uniform Fee based on Gender & Session & School Origin
  const getUniformItemsForGender = (gender: 'male' | 'female') => {
    if (!config || !config.uniformItems) return [];
    return config.uniformItems.filter(item => item.gender === 'both' || item.gender === gender);
  };

  const calculateTotalReRegFee = (
    gender: 'L' | 'P' | 'male' | 'female',
    sessionId: string,
    schoolOriginType: 'maarif_jogosari' | 'other' | string = 'maarif_jogosari',
    customSchoolName: string = ''
  ) => {
    if (!config) return 0;
    const g = (gender === 'L' || gender === 'male') ? 'male' : 'female';
    const items = getUniformItemsForGender(g);
    const rawUniformTotal = items.reduce((sum, item) => sum + item.price, 0);
    const buildingFee = config.buildingFee || 1500000;
    const julySppFee = config.julySppFee || 200000;
    const baseFee = config.reRegistrationBaseFee || 0;
    
    const isMaarif = schoolOriginType === 'maarif_jogosari' || 
      customSchoolName.toUpperCase().includes('MAARIF JOGOSARI') ||
      schoolOriginType.toUpperCase().includes('MAARIF JOGOSARI');

    // Check session wave discount (percentage for Building Fee)
    const session = config.sessions.find(s => s.id === sessionId);
    const discountPercent = typeof session?.discountPercent === 'number'
      ? session.discountPercent
      : (session?.discountAmount ? Math.round((session.discountAmount / (buildingFee || 1)) * 100) : 0);
    const buildingWaveDiscount = Math.round(buildingFee * (discountPercent / 100));

    // SD Maarif Jogosari Building Discount
    let maarifBuildingDiscount = 0;
    if (isMaarif) {
      if (config.maarifBuildingDiscountType === 'percent') {
        maarifBuildingDiscount = Math.round(buildingFee * ((config.maarifBuildingDiscount || 0) / 100));
      } else {
        maarifBuildingDiscount = config.maarifBuildingDiscount || 0;
      }
    }

    const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
    const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);

    // SD Maarif Jogosari Uniform Discount
    let maarifUniformDiscount = 0;
    if (isMaarif) {
      if (config.maarifUniformDiscountType === 'percent') {
        maarifUniformDiscount = Math.round(rawUniformTotal * ((config.maarifUniformDiscount || 0) / 100));
      } else {
        maarifUniformDiscount = config.maarifUniformDiscount || 0;
      }
    }
    const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount);

    return netBuildingFee + julySppFee + baseFee + netUniformTotal;
  };

  const getSessionFeeDetails = (
    sessionId: string,
    gender: 'male' | 'female',
    schoolOriginType: 'maarif_jogosari' | 'other' | string = 'maarif_jogosari',
    customSchoolName: string = ''
  ) => {
    const items = getUniformItemsForGender(gender);
    const rawUniformTotal = items.reduce((sum, item) => sum + item.price, 0);
    const buildingFee = config?.buildingFee || 1500000;
    const julySppFee = config?.julySppFee || 200000;
    const baseFee = config?.reRegistrationBaseFee || 0;
    const session = config?.sessions.find(s => s.id === sessionId);

    const isMaarif = schoolOriginType === 'maarif_jogosari' || 
      customSchoolName.toUpperCase().includes('MAARIF JOGOSARI') ||
      schoolOriginType.toUpperCase().includes('MAARIF JOGOSARI');

    const discountPercent = typeof session?.discountPercent === 'number'
      ? session.discountPercent
      : (session?.discountAmount ? Math.round((session.discountAmount / (buildingFee || 1)) * 100) : 0);
    const buildingWaveDiscount = Math.round(buildingFee * (discountPercent / 100));

    let maarifBuildingDiscount = 0;
    if (isMaarif) {
      if (config?.maarifBuildingDiscountType === 'percent') {
        maarifBuildingDiscount = Math.round(buildingFee * ((config.maarifBuildingDiscount || 0) / 100));
      } else {
        maarifBuildingDiscount = config?.maarifBuildingDiscount || 0;
      }
    }

    const totalBuildingDiscount = Math.min(buildingFee, buildingWaveDiscount + maarifBuildingDiscount);
    const netBuildingFee = Math.max(0, buildingFee - totalBuildingDiscount);

    let maarifUniformDiscount = 0;
    if (isMaarif) {
      if (config?.maarifUniformDiscountType === 'percent') {
        maarifUniformDiscount = Math.round(rawUniformTotal * ((config.maarifUniformDiscount || 0) / 100));
      } else {
        maarifUniformDiscount = config?.maarifUniformDiscount || 0;
      }
    }
    const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount);
    const total = netBuildingFee + julySppFee + baseFee + netUniformTotal;

    return {
      buildingFee,
      discountPercent,
      buildingWaveDiscount,
      buildingDiscount: buildingWaveDiscount,
      maarifBuildingDiscount,
      totalBuildingDiscount,
      netBuildingFee,
      julySppFee,
      baseFee,
      rawUniformTotal,
      maarifUniformDiscount,
      uniformDiscount: maarifUniformDiscount,
      netUniformTotal,
      total,
      session,
      isMaarif
    };
  };

  // Helper to cancel unpaid token draft and clear candidate data
  const handleCancelTokenPayment = async (orderIdToCancel?: string) => {
    setIsPayModalOpen(false);
    const orderId = orderIdToCancel || snapOrderId;
    const nisn = regForm.nisn;
    try {
      await fetch('/api/spmb/cancel-unpaid-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn, orderId })
      });
    } catch (e) {
      console.error('Error cancelling unpaid token draft:', e);
    }
    setSnapToken(null);
    setSnapOrderId(null);
    setActiveCandidate(null);
    setRegError('Pembayaran token belum diselesaikan. Data pendaftaran tidak tersimpan di sistem. Silakan isi formulir pendaftaran kembali.');
  };

  // 1. Step 1: Submit Initial Form and Trigger Token Midtrans Payment (Rp 50.000)
  const handleRegisterTokenPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validasi apakah sistem pendaftaran SPMB sedang dibuka
    if (config && config.isOpen === false) {
      setRegError('Pendaftaran SPMB saat ini belum aktif atau sedang ditutup.');
      return;
    }

    // Validasi apakah jalur pendaftaran yang dipilih sedang aktif
    const selectedSession = config?.sessions?.find(s => s.id === regForm.sessionId);
    if (selectedSession && selectedSession.isActive === false) {
      setRegError(`Jalur pendaftaran '${selectedSession.name}' belum aktif. Silakan pilih jalur pendaftaran yang berstatus aktif.`);
      return;
    }

    if (!regForm.fullName.trim()) {
      setRegError('Nama lengkap calon murid wajib diisi.');
      return;
    }
    if (!regForm.nisn.trim() || regForm.nisn.trim().length < 8) {
      setRegError('Nomor NISN wajib diisi dengan benar (minimal 8-10 digit).');
      return;
    }
    if (!regForm.phone.trim()) {
      setRegError('Nomor WhatsApp aktif murid/orang tua wajib diisi untuk konfirmasi.');
      return;
    }

    const finalSchoolOrigin = regForm.schoolOriginType === 'maarif_jogosari'
      ? (config?.maarifSchoolName || 'SD MAARIF JOGOSARI')
      : regForm.manualSchoolName.trim();

    if (regForm.schoolOriginType === 'other' && !finalSchoolOrigin) {
      setRegError('Nama SD/MI asal wajib diisi secara lengkap.');
      return;
    }

    setIsProcessingTokenPay(true);

    try {
      const formattedFullName = regForm.fullName.trim().toUpperCase();
      const formattedPhone = regForm.phone.trim();

      const payload = {
        ...regForm,
        fullName: formattedFullName,
        parentPhone: formattedPhone,
        phone: formattedPhone,
        schoolOrigin: finalSchoolOrigin,
        originSchool: finalSchoolOrigin,
        origin: window.location.origin
      };

      const res = await fetch('/api/spmb/register-token-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal memproses pendaftaran awal.');
      }

      const resData = await res.json();

      // If already paid previously, direct to portal
      if (resData.alreadyPaid) {
        setActiveCandidate(resData.candidate);
        setFullForm(resData.candidate);
        setSearchNisn(resData.candidate.nisn);
        
        QRCode.toDataURL(`SPMB-${resData.candidate.nisn}-${resData.candidate.fullName}`, {
          margin: 1,
          width: 140,
          color: { dark: '#0f172a', light: '#ffffff' }
        }).then(url => setQrCodeDataUrl(url)).catch(() => {});

        setActiveTab('portal');
        setPortalTab('form');
        return;
      }

      // Online Individual with Midtrans Snap Token
      const token = resData.snapToken || resData.token;
      setSnapToken(token);
      setSnapOrderId(resData.orderId);
      setSnapAmount(resData.tokenFee || 50000);
      setSnapRedirectUrl(resData.redirectUrl || null);
      setSnapTitle(`Token Pendaftaran SPMB ${config?.academicYear || '2027/2028'} - ${formattedFullName}`);
      setSnapPayType('token');
      setSnapError(null);
      setIsPayModalOpen(true);

      // Auto-trigger Snap Popup after opening modal
      setTimeout(() => {
        triggerSnapPayment(token, resData.orderId, 'token');
      }, 400);
    } catch (err: any) {
      console.error('Error starting registration payment:', err);
      setRegError(err.message || 'Terjadi kesalahan sistem saat menghubungi payment gateway Midtrans.');
    } finally {
      setIsProcessingTokenPay(false);
    }
  };

  // 2. Step 2: Handle Midtrans Payment Success (Token or Re-Registration)
  const handlePaymentSuccess = async (verifiedOrderId?: string | null, verifiedType?: 'token' | 'rereg', paymentTypeStr?: string) => {
    setIsPayModalOpen(false);
    const orderIdToUse = verifiedOrderId || snapOrderId;
    const typeToUse = verifiedType || snapPayType;

    if (typeToUse === 'token') {
      try {
        const res = await fetch('/api/spmb/verify-token-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateData: regForm,
            orderId: orderIdToUse,
            paymentType: paymentTypeStr || 'Midtrans Snap Online'
          })
        });

        if (res.ok) {
          const verified = await res.json();
          setActiveCandidate(verified.candidate);
          setFullForm(verified.candidate);
          setSearchNisn(verified.candidate.nisn);
          setActiveTab('portal');
          setPortalTab('form'); // Direct to fill full Data Lengkap Siswa form
          
          QRCode.toDataURL(`SPMB-${verified.candidate.nisn}-${verified.candidate.fullName}`, {
            margin: 1,
            width: 140,
            color: { dark: '#0f172a', light: '#ffffff' }
          }).then(url => setQrCodeDataUrl(url)).catch(() => {});
        } else {
          const err = await res.json();
          alert(err.error || 'Gagal memverifikasi status pembayaran token.');
        }
      } catch (e) {
        console.error('Failed to verify token payment:', e);
      }
    } else if (typeToUse === 'rereg' && activeCandidate) {
      try {
        const res = await fetch('/api/spmb/verify-reregistration-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nisn: activeCandidate.nisn,
            orderId: orderIdToUse,
            amount: snapAmount,
            selectedUniformSize,
            customUniformNote,
            paymentType: paymentTypeStr || 'Midtrans Snap Online'
          })
        });

        if (res.ok) {
          const verified = await res.json();
          setActiveCandidate(verified.candidate);
          setPortalTab('card'); // Direct to official acceptance card after re-registration
        } else {
          const err = await res.json();
          alert(err.error || 'Gagal memverifikasi status daftar ulang.');
        }
      } catch (e) {
        console.error('Failed to verify re-reg payment:', e);
      }
    }
  };

  // 3. Step 3: Save Full Data Lengkap Siswa Form
  const handleSaveFullForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidate) return;

    setIsSavingFullForm(true);
    setFullFormSuccessMsg(null);

    // Otomatis gabungkan alamat jika dusun/rt/rw/desa/kecamatan terisi
    const combinedAddress = formatCombinedAddress(
      fullForm.dusun,
      fullForm.rt,
      fullForm.rw,
      fullForm.village,
      fullForm.district
    );
    const dataToSave = {
      ...fullForm,
      address: combinedAddress || fullForm.address
    };

    try {
      const res = await fetch('/api/spmb/save-full-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: activeCandidate.nisn,
          formData: dataToSave
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveCandidate(updated.candidate);
        setFullForm(updated.candidate);
        setFullFormSuccessMsg('Data lengkap siswa berhasil disimpan!');
        setTimeout(() => {
          setFullFormSuccessMsg(null);
          setPortalTab('docs'); // Alur baru: Lanjut ke Upload Berkas sebelum Bayar Daftar Ulang
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan biodata lengkap.');
      }
    } catch (e) {
      console.error('Error saving full form:', e);
      alert('Gagal menyimpan data ke server.');
    } finally {
      setIsSavingFullForm(false);
    }
  };

  // 4. Step 4: Upload Files & Photos (Akte, KK, KTP Ayah, KTP Ibu, Foto Siswa - Kompres 1000px)
  const handleFileChange = async (
    field: 'aktaPhoto' | 'kkPhoto' | 'ktpAyahPhoto' | 'ktpIbuPhoto' | 'pasPhoto' | 'sklPhoto' | 'kipPhoto',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Otomatis kompres menjadi maksimal 1000px
      const compressedDataUrl = await compressImageToMax1000px(file);
      setDocUploads(prev => ({ ...prev, [field]: compressedDataUrl }));
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Gagal memproses gambar. Silakan coba file gambar lain.');
    }
  };

  const handleSaveDocuments = async () => {
    if (!activeCandidate) return;

    // Validasi berkas wajib: Akte Kelahiran, Kartu Keluarga, dan Pas Foto Siswa
    const hasAkta = Boolean(docUploads.aktaPhoto || activeCandidate.documents?.aktaPhoto);
    const hasKk = Boolean(docUploads.kkPhoto || activeCandidate.documents?.kkPhoto);
    const hasFoto = Boolean(docUploads.pasPhoto || activeCandidate.documents?.pasPhoto);

    if (!hasAkta) {
      alert('⚠️ Mohon unggah berkas wajib: Akte Kelahiran calon siswa.');
      return;
    }
    if (!hasKk) {
      alert('⚠️ Mohon unggah berkas wajib: Kartu Keluarga (KK).');
      return;
    }
    if (!hasFoto) {
      alert('⚠️ Mohon unggah berkas wajib: Pas Foto Calon Siswa (3x4).');
      return;
    }

    setIsUploadingDocs(true);
    setDocsSuccessMsg(null);

    try {
      const res = await fetch('/api/spmb/upload-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: activeCandidate.nisn,
          documents: docUploads
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveCandidate(updated.candidate);
        setDocsSuccessMsg('Berkas pendaftaran berhasil diunggah! Lanjut ke tahap pembayaran daftar ulang.');
        setTimeout(() => {
          setDocsSuccessMsg(null);
          // Lanjut ke Daftar Ulang jika belum lunas, atau ke Tanda Terima jika sudah lunas
          if (updated.candidate.reRegistrationStatus === 'paid') {
            setPortalTab('card');
          } else {
            setPortalTab('rereg');
          }
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal mengunggah berkas.');
      }
    } catch (e) {
      console.error('Error saving documents:', e);
      alert('Terjadi kesalahan saat mengunggah berkas.');
    } finally {
      setIsUploadingDocs(false);
    }
  };

  // 5. Step 5: Trigger Re-Registration Payment (Midtrans Snap)
  const handlePayReRegistrationSnap = async () => {
    if (!activeCandidate) return;

    setIsProcessingReRegPay(true);

    try {
      const totalFee = calculateTotalReRegFee(activeCandidate.gender, activeCandidate.sessionId);
      const res = await fetch('/api/spmb/pay-reregistration-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: activeCandidate.nisn,
          selectedUniformSize,
          customUniformNote,
          origin: window.location.origin
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memulai pembayaran daftar ulang.');
      }

      const snapData = await res.json();
      const token = snapData.token || snapData.snapToken;
      setSnapToken(token);
      setSnapOrderId(snapData.orderId);
      setSnapAmount(snapData.amount || totalFee);
      setSnapRedirectUrl(snapData.redirectUrl || null);
      setSnapTitle(`Daftar Ulang & Seragam SPMB 2027/2028 - ${activeCandidate.fullName}`);
      setSnapPayType('rereg');
      setSnapError(null);
      setIsPayModalOpen(true);

      // Auto-trigger Snap Popup
      setTimeout(() => {
        triggerSnapPayment(token, snapData.orderId, 'rereg');
      }, 400);
    } catch (err: any) {
      console.error('Error in re-registration payment:', err);
      alert(err.message || 'Terjadi kesalahan sistem saat menghubungi payment gateway Midtrans.');
    } finally {
      setIsProcessingReRegPay(false);
    }
  };

  // Print Registration Proof Card
  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      {/* Top Floating Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {schoolIdentity?.logo ? (
              <img src={schoolIdentity.logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm font-black">
                <GraduationCap size={22} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white m-0">
                  SPMB 2027/2028
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Resmi Terbuka
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 hidden sm:block">
                {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"} • {schoolIdentity?.accreditation || 'Terakreditasi A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'info' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Info & Biaya
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'register' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                  : 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30'
              }`}
            >
              <Sparkles size={13} />
              <span>Daftar Baru</span>
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'portal' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Search size={13} />
              <span>Cek Status</span>
            </button>

            {handleBack && (
              <button
                onClick={handleBack}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="Kembali ke Portal Administrasi Utama"
              >
                <ArrowLeft size={13} />
                <span>Portal Utama</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Containers */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ================= TAB 1: INFORMASI JALUR & BIAYA PERLENGKAPAN ================= */}
        {activeTab === 'info' && (
          <div className="space-y-10">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/20 p-6 sm:p-10 shadow-2xl">
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <Award size={14} />
                  <span>Penerimaan Peserta Didik Baru TA 2027/2028</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Wujudkan Masa Depan Gemilang di <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">{schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Sekolah Ramah Anak dengan Kurikulum Merdeka Terintegrasi Pendidikan Karakter Aswaja An-Nahdliyah, Laboratorium Komputer Modern, dan Program Unggulan Tahfidz serta Digital Literacy.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span>Daftar Sekarang (Token Rp 50.000)</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => setActiveTab('portal')}
                    className="px-5 py-3 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm rounded-2xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Search size={15} />
                    <span>Sudah Daftar? Cek Status</span>
                  </button>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute right-0 bottom-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* 3 Sesi Pendaftaran Cards */}
            <div className="space-y-4">
              <div className="text-center max-w-2xl mx-auto space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-white">3 Sesi Pendaftaran Siswa Baru 2027/2028</h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Pilih sesi yang sesuai untuk mendapatkan kuota dan penawaran prioritas ukuran seragam.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(config?.sessions || []).map((session, idx) => {
                  const feeMale = getSessionFeeDetails(session.id, 'male');
                  const feeFemale = getSessionFeeDetails(session.id, 'female');
                  const hasDiscount = (session.discountPercent && session.discountPercent > 0) || (session.discountAmount && session.discountAmount > 0);
                  const discountPct = session.discountPercent || (session.discountAmount ? Math.round((session.discountAmount / (config?.buildingFee || 1500000)) * 100) : 0);
                  const discountVal = feeMale.buildingDiscount;

                  return (
                    <div
                      key={session.id}
                      className={`relative rounded-3xl p-6 border transition-all ${
                        session.isActive
                          ? 'bg-slate-800/90 border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                          : 'bg-slate-800/40 border-slate-700/60 opacity-80'
                      }`}
                    >
                      {session.isActive ? (
                        <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                          Sesi Dibuka / Aktif
                        </span>
                      ) : (
                        <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold text-[10px] uppercase tracking-wider shadow-md">
                          Jalur Belum Aktif
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                            Sesi 0{idx + 1}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Users size={13} />
                            <span>Kuota: {session.quota} Murid</span>
                          </span>
                        </div>

                        <h4 className="text-lg font-black text-white m-0">{session.name}</h4>
                        
                        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-emerald-400 shrink-0" />
                            <span>
                              {new Date(session.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s.d. {new Date(session.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {hasDiscount ? (
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Percent size={13} className="text-emerald-400 shrink-0" />
                                <span>Diskon Uang Gedung: {discountPct}%</span>
                              </div>
                              <p className="text-[10px] text-emerald-400/80 m-0 pl-4">
                                Hemat Rp {discountVal.toLocaleString('id-ID')} dari Uang Gedung
                              </p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">
                              Uang Gedung Standar (Tanpa Potongan)
                            </div>
                          )}

                          <div className="pt-1.5 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                            <span>Estimasi Total:</span>
                            <span className="font-bold text-white">
                              Rp {feeMale.total.toLocaleString('id-ID')} (L) / Rp {feeFemale.total.toLocaleString('id-ID')} (P)
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                          {session.description}
                        </p>

                        <button
                          onClick={() => {
                            setRegForm(prev => ({ ...prev, sessionId: session.id }));
                            setActiveTab('register');
                          }}
                          disabled={!session.isActive}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            session.isActive
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md'
                              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span>{session.isActive ? 'Pilih Sesi Ini' : 'Belum Dibuka'}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rincian Biaya Daftar Ulang, Uang Gedung & Seragam Berdasarkan Jenis Kelamin & Asal SD */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Receipt size={20} className="text-emerald-400" />
                    <span>Struktur & Rincian Biaya Daftar Ulang</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulasikan rincian biaya pendaftaran sesuai jenis kelamin dan asal sekolah (SD Maarif vs SD Lainnya).
                  </p>
                </div>

                {/* Filter Controls: Gender & School Origin */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Asal SD Switch */}
                  <div className="flex items-center p-1 bg-slate-900 rounded-2xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolPreview('maarif_jogosari')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedSchoolPreview === 'maarif_jogosari'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>SD Maarif Jogosari</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolPreview('other')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedSchoolPreview === 'other'
                          ? 'bg-slate-700 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>SD Lainnya (Umum)</span>
                    </button>
                  </div>

                  {/* Gender Switch */}
                  <div className="flex items-center p-1 bg-slate-900 rounded-2xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setSelectedGenderPreview('male')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedGenderPreview === 'male'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Putra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGenderPreview('female')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedGenderPreview === 'female'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Putri</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notice for SD Maarif Jogosari */}
              {selectedSchoolPreview === 'maarif_jogosari' && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-3">
                  <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-200 font-bold block text-sm">
                      🌟 Diskon Spesial Alumni SD MAARIF JOGOSARI Aktif!
                    </strong>
                    <div className="mt-1 space-y-0.5 text-slate-300">
                      <p className="m-0">
                        • <strong>Diskon Uang Gedung Tambahan:</strong> Potongan {config?.maarifBuildingDiscountType === 'percent' ? `${config.maarifBuildingDiscount || 0}%` : `Rp ${(config?.maarifBuildingDiscount || 250000).toLocaleString('id-ID')}`}.
                      </p>
                      <p className="m-0">
                        • <strong>Diskon Seragam/Perlengkapan:</strong> Potongan {config?.maarifUniformDiscountType === 'percent' ? `${config.maarifUniformDiscount || 0}%` : `Rp ${(config?.maarifUniformDiscount || 100000).toLocaleString('id-ID')}`}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3 Komponen Utama Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Building2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">1. Uang Gedung (Infaq)</span>
                  </div>
                  <p className="text-base font-black text-white m-0">
                    Rp {(config?.buildingFee || 1500000).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium m-0">
                    Dapat diskon gelombang s.d. 50% di Sesi Inden {selectedSchoolPreview === 'maarif_jogosari' ? '+ Diskon SD Maarif' : ''}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Coins size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">2. SPP Juli 2027</span>
                  </div>
                  <p className="text-base font-black text-white m-0">
                    Rp {(config?.julySppFee || 200000).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-slate-400 m-0">
                    SPP bulan pertama tahun ajaran baru 2027/2028
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Shirt size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">3. Seragam & Atribut</span>
                  </div>
                  <p className="text-base font-black text-white m-0">
                    Rp {getUniformItemsForGender(selectedGenderPreview).reduce((sum, item) => sum + item.price, 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-slate-400 m-0">
                    Paket lengkap ({selectedGenderPreview === 'male' ? 'Putra' : 'Putri'}) {selectedSchoolPreview === 'maarif_jogosari' ? '(Dapat Diskon Khusus SD Maarif)' : ''}
                  </p>
                </div>
              </div>

              {/* Equipment Items Table */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rincian Item Seragam & Perlengkapan ({selectedGenderPreview === 'male' ? 'Putra' : 'Putri'}):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getUniformItemsForGender(selectedGenderPreview).map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white m-0">{item.name}</p>
                          <p className="text-[10px] text-slate-400 m-0">
                            {item.gender === 'both' ? 'Wajib Semua Siswa' : `Khusus ${item.gender === 'female' ? 'Putri' : 'Putra'}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-400">
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs text-slate-400 m-0">
                    Estimasi Total Biaya Sesi Inden ({selectedGenderPreview === 'male' ? 'Putra' : 'Putri'} - {selectedSchoolPreview === 'maarif_jogosari' ? 'SD Maarif Jogosari' : 'SD Lainnya'}):
                  </p>
                  <p className="text-2xl font-black text-white tracking-tight m-0">
                    Rp {calculateTotalReRegFee(selectedGenderPreview, 'inden', selectedSchoolPreview).toLocaleString('id-ID')}
                    <span className="text-xs font-semibold text-emerald-400 ml-2">
                      {selectedSchoolPreview === 'maarif_jogosari' ? '(Diskon Gelombang + Diskon SD Maarif)' : '(Diskon Gelombang Uang Gedung 50%)'}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    setRegForm(prev => ({
                      ...prev,
                      gender: selectedGenderPreview === 'male' ? 'L' : 'P',
                      schoolOriginType: selectedSchoolPreview,
                      schoolOrigin: selectedSchoolPreview === 'maarif_jogosari' ? (config?.maarifSchoolName || 'SD MAARIF JOGOSARI') : ''
                    }));
                    setActiveTab('register');
                  }}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Daftar Calon Murid {selectedGenderPreview === 'male' ? 'Putra' : 'Putri'}
                </button>
              </div>
            </div>

            {/* Alur Pendaftaran 5 Langkah */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white text-center">Alur Pendaftaran Mudah & Transparan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { step: '1', title: 'Isi Data Singkat', desc: 'Isi identitas diri, NISN, no WhatsApp, dan asal sekolah.' },
                  { step: '2', title: 'Bayar Token Rp 50.000', desc: 'Selesaikan pembayaran token via Midtrans agar data tersimpan aman.' },
                  { step: '3', title: 'Data Lengkap Siswa', desc: 'Login dengan NISN lalu lengkapi biodata detail siswa & orang tua.' },
                  { step: '4', title: 'Upload Berkas', desc: 'Unggah Akte kelahiran, KK, KTP Ayah, KTP Ibu, dan Foto Siswa (auto 1000px).' },
                  { step: '5', title: 'Daftar Ulang & Diterima', desc: 'Pilih ukuran seragam, selesaikan daftar ulang, dan cetak Tanda Terima Resmi.' }
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mx-auto border border-emerald-500/40">
                      {s.step}
                    </div>
                    <h5 className="text-xs font-bold text-white m-0">{s.title}</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed m-0">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: FORM PENDAFTARAN AWAL (TOKEN RP 50.000) ================= */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Sparkles size={14} />
                <span>Formulir Pendaftaran Awal Calon Murid</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">SPMB Tahun Ajaran 2027/2028</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Isi data awal calon murid di bawah ini. Setelah itu, lakukan pembayaran token pendaftaran <strong className="text-emerald-300">Rp 50.000</strong> via Midtrans online untuk aktivasi akun pendaftaran resmi.
              </p>
            </div>

            {/* Alert if overall SPMB is closed or all sessions are inactive */}
            {(!config?.isOpen || !config?.sessions?.some(s => s.isActive)) && (
              <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold m-0 text-amber-300">Pemberitahuan: Jalur Pendaftaran Belum Aktif</p>
                  <p className="m-0 text-slate-300 mt-0.5">
                    Pendaftaran SPMB saat ini belum dibuka atau seluruh jalur pendaftaran sedang tidak aktif. Silakan pantau pengumuman resmi atau hubungi panitia SPMB sekolah.
                  </p>
                </div>
              </div>
            )}

            {regError && (
              <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold m-0">Gagal Memproses Formulir:</p>
                  <p className="m-0 text-slate-300 mt-0.5">{regError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRegisterTokenPay} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
              {/* 1. Pilihan Sesi Pendaftaran */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. Pilihan Sesi / Gelombang Pendaftaran <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(config?.sessions || []).map((session) => {
                    const isSelected = regForm.sessionId === session.id;
                    const isInactive = session.isActive === false;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setRegForm(prev => ({ ...prev, sessionId: session.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? isInactive
                              ? 'bg-rose-950/40 border-rose-500/60 text-white ring-2 ring-rose-500/20'
                              : 'bg-emerald-500/20 border-emerald-500 text-white ring-2 ring-emerald-500/20'
                            : isInactive
                              ? 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'
                              : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-white m-0">{session.name}</p>
                          {isInactive ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black uppercase">
                              Belum Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Kuota: {session.quota} Siswa
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Warning message if selected session is inactive */}
                {(() => {
                  const currentSession = config?.sessions?.find(s => s.id === regForm.sessionId);
                  if (currentSession && currentSession.isActive === false) {
                    return (
                      <div className="mt-2 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                        <span>
                          <strong>Peringatan:</strong> Jalur pendaftaran <strong>{currentSession.name}</strong> belum aktif. Silakan pilih jalur pendaftaran yang berstatus aktif.
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* 2. Asal Sekolah (SD MAARIF JOGOSARI vs SD Lainnya) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  2. Asal Sekolah (SD / MI) <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* SD Maarif Jogosari */}
                  <button
                    type="button"
                    onClick={() => setRegForm(prev => ({
                      ...prev,
                      schoolOriginType: 'maarif_jogosari',
                      schoolOrigin: config?.maarifSchoolName || 'SD MAARIF JOGOSARI'
                    }))}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      regForm.schoolOriginType === 'maarif_jogosari'
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>1. SD MAARIF JOGOSARI</span>
                      </span>
                      {regForm.schoolOriginType === 'maarif_jogosari' && (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      ✨ Diskon Khusus Gedung & Seragam
                    </span>
                  </button>

                  {/* SD Lainnya */}
                  <button
                    type="button"
                    onClick={() => setRegForm(prev => ({
                      ...prev,
                      schoolOriginType: 'other',
                      schoolOrigin: prev.manualSchoolName || ''
                    }))}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      regForm.schoolOriginType === 'other'
                        ? 'bg-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">2. SD Lainnya (Isi Manual)</span>
                      {regForm.schoolOriginType === 'other' && (
                        <CheckCircle2 size={14} className="text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 m-0">Dari SD / MI negeri & swasta lainnya</p>
                  </button>
                </div>

                {/* Input Manual jika memilih SD Lainnya */}
                {regForm.schoolOriginType === 'other' && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nama Lengkap SD / MI Asal <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SDN Pandaan 1 / MI Maarif Pandaan"
                      value={regForm.manualSchoolName}
                      onChange={(e) => setRegForm({
                        ...regForm,
                        manualSchoolName: e.target.value,
                        schoolOrigin: e.target.value
                      })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Nama Lengkap */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    3. Nama Lengkap Calon Murid <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">Otomatis Huruf Besar (KAPITAL)</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="CONTOH: MUHAMMAD RIZKY PRATAMA"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white uppercase placeholder:normal-case placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold tracking-wide"
                />
              </div>

              {/* NISN & NIK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    NISN Calon Murid (10 Digit) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 0123456789"
                    value={regForm.nisn}
                    onChange={(e) => setRegForm({ ...regForm, nisn: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">NISN akan digunakan sebagai nomor ID login portal status.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    NIK Calon Murid (16 Digit)
                  </label>
                  <input
                    type="text"
                    placeholder="Sesuai Kartu Keluarga (KK)"
                    value={regForm.nik}
                    onChange={(e) => setRegForm({ ...regForm, nik: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Jenis Kelamin & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Jenis Kelamin <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, gender: 'L' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        regForm.gender === 'L'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Laki-laki (Putra)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, gender: 'P' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        regForm.gender === 'P'
                          ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      Perempuan (Putri)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nomor WhatsApp Aktif (Murid / Ortu) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081234567890"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tempat & Tanggal Lahir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tempat Lahir <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pasuruan"
                    value={regForm.birthPlace}
                    onChange={(e) => setRegForm({ ...regForm, birthPlace: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Tanggal Lahir <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">Format: dd/mm/yyyy ({formatDisplayDate(regForm.birthDate)})</span>
                  </div>
                  <input
                    type="date"
                    required
                    value={regForm.birthDate}
                    onChange={(e) => setRegForm({ ...regForm, birthDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Token Fee Summary Box */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-300 m-0">Biaya Token Pendaftaran Online:</p>
                  <p className="text-[11px] text-slate-400 m-0">Pembayaran aman via QRIS, Transfer Bank, atau E-Wallet (Midtrans)</p>
                </div>
                <span className="text-xl font-black text-emerald-400">
                  Rp {(config?.registrationTokenFee || 50000).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Submit Button */}
              {(() => {
                const currentSession = config?.sessions?.find(s => s.id === regForm.sessionId);
                const isSessionInactive = !config?.isOpen || (currentSession && currentSession.isActive === false);

                if (isSessionInactive) {
                  return (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled
                        className="w-full py-3.5 bg-slate-800 border-2 border-rose-500/40 text-rose-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed opacity-90 shadow-md"
                      >
                        <Lock size={16} className="text-rose-400" />
                        <span>Jalur Pendaftaran Belum Aktif (Pendaftaran Ditutup)</span>
                      </button>
                      <p className="text-[11px] text-rose-300/80 text-center m-0">
                        Jalur pendaftaran yang dipilih sedang belum dibuka. Silakan pilih gelombang lain yang aktif atau hubungi panitia.
                      </p>
                    </div>
                  );
                }

                return (
                  <button
                    type="submit"
                    disabled={isProcessingTokenPay}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isProcessingTokenPay ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Memproses pendaftaran calon murid...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        <span>Bayar Token Rp {(config?.registrationTokenFee || 50000).toLocaleString('id-ID')} via Midtrans</span>
                      </>
                    )}
                  </button>
                );
              })()}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('portal')}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Sudah mendaftar / bayar token sebelumnya? Klik di sini untuk Cek Status & Login Akun
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 3: PORTAL STATUS & DASHBOARD CALON MURID ================= */}
        {activeTab === 'portal' && (
          <div className="space-y-6">
            {/* Search / Lookup Box */}
            <div className="max-w-xl mx-auto bg-slate-800/80 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white">Portal Status & Akun Sementara Siswa Baru</h3>
                <p className="text-xs text-slate-400">
                  Masukkan NISN calon murid untuk mengecek progres berkas, bayar daftar ulang, dan cetak tanda terima.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Masukkan 10 digit NISN Calon Murid..."
                    value={searchNisn}
                    onChange={(e) => setSearchNisn(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckStatus()}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckStatus()}
                  disabled={isSearchingCandidate}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {isSearchingCandidate ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Cek Status</span>
                </button>
              </div>

              {portalError && (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-rose-300 m-0">Status Pendaftaran Tidak Ditemukan / Belum Selesai</p>
                      <p className="m-0 text-slate-300 leading-relaxed">{portalError}</p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setRegError(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Input / Daftar Formulir Baru</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Dashboard */}
            {activeCandidate && (() => {
              const isStep1Done = Boolean(activeCandidate.tokenPaymentStatus === 'paid' || activeCandidate.tokenPaid);
              const isStep2Done = Boolean(isStep1Done && activeCandidate.isFormCompleted);
              const hasUploadedMandatoryDocs = Boolean(
                (activeCandidate.documents?.aktaPhoto || docUploads.aktaPhoto) &&
                (activeCandidate.documents?.kkPhoto || docUploads.kkPhoto) &&
                (activeCandidate.documents?.pasPhoto || docUploads.pasPhoto)
              );
              const isStep3Done = Boolean(isStep2Done && (activeCandidate.documentsUploaded || hasUploadedMandatoryDocs));
              const isStep4Done = Boolean(isStep3Done && (activeCandidate.reRegistrationStatus === 'paid' || activeCandidate.reRegistrationPaid));
              const isStep5Done = Boolean(isStep4Done || activeCandidate.status === 'accepted');

              const isStep1Unlocked = true;
              const isStep2Unlocked = isStep1Done;
              const isStep3Unlocked = isStep2Done;
              const isStep4Unlocked = isStep3Done;
              const isStep5Unlocked = isStep4Done || activeCandidate.status === 'accepted';

              const steps = [
                {
                  id: 'status' as const,
                  num: 1,
                  label: '1. Status Token',
                  desc: 'Rp 50.000',
                  icon: CreditCard,
                  done: isStep1Done,
                  unlocked: isStep1Unlocked,
                  lockReason: ''
                },
                {
                  id: 'form' as const,
                  num: 2,
                  label: '2. Data Lengkap Siswa',
                  desc: 'Buku Induk',
                  icon: FileText,
                  done: isStep2Done,
                  unlocked: isStep2Unlocked,
                  lockReason: 'Tahap 2 terkunci: Selesaikan pembayaran token pendaftaran (Tahap 1) terlebih dahulu.'
                },
                {
                  id: 'docs' as const,
                  num: 3,
                  label: '3. Upload Berkas',
                  desc: 'Akta, KK, Foto',
                  icon: Upload,
                  done: isStep3Done,
                  unlocked: isStep3Unlocked,
                  lockReason: 'Tahap 3 terkunci: Lengkapi dan simpan Formulir Data Lengkap Siswa (Tahap 2) terlebih dahulu.'
                },
                {
                  id: 'rereg' as const,
                  num: 4,
                  label: '4. Daftar Ulang',
                  desc: 'Seragam & Pelunasan',
                  icon: Shirt,
                  done: isStep4Done,
                  unlocked: isStep4Unlocked,
                  lockReason: 'Tahap 4 terkunci: Unggah seluruh berkas persyaratan wajib (Tahap 3) terlebih dahulu.'
                },
                {
                  id: 'card' as const,
                  num: 5,
                  label: '5. Tanda Terima',
                  desc: 'Kartu & Bukti Resmi',
                  icon: Award,
                  done: isStep5Done,
                  unlocked: isStep5Unlocked,
                  lockReason: 'Tahap 5 terkunci: Selesaikan pembayaran Daftar Ulang & Seragam (Tahap 4) terlebih dahulu.'
                }
              ];

              return (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl shrink-0">
                      {activeCandidate.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white m-0">{activeCandidate.fullName}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {activeCandidate.gender === 'L' ? 'Putra' : 'Putri'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 m-0 mt-0.5">
                        NISN: <span className="font-mono text-white">{activeCandidate.nisn}</span> • Asal: <span className="text-white">{activeCandidate.schoolOrigin}</span> • Sesi: <span className="text-emerald-400 font-bold uppercase">{activeCandidate.sessionId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeCandidate.status === 'accepted' ? (
                      <span className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                        <CheckCircle2 size={16} />
                        <span>DITERIMA / LOLOS SELEKSI</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs">
                        Status: Dalam Proses Verifikasi
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (!isStep5Unlocked) {
                          alert('⛔ Bukti Resmi Terkunci!\n\nSelesaikan seluruh tahap pendaftaran dan pembayaran Daftar Ulang (Tahap 4) terlebih dahulu untuk mencetak kartu tanda terima resmi.');
                          return;
                        }
                        setPortalTab('card');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isStep5Unlocked
                          ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
                          : 'bg-slate-800/60 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      }`}
                      title={isStep5Unlocked ? 'Cetak Bukti Pendaftaran' : 'Selesaikan seluruh tahap pendaftaran untuk membuka bukti resmi'}
                    >
                      {isStep5Unlocked ? <Printer size={14} /> : <Lock size={14} className="text-amber-400" />}
                      <span>{isStep5Unlocked ? 'Cetak Bukti' : 'Bukti Terkunci'}</span>
                    </button>
                  </div>
                </div>

                {/* Stepper Navigation Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {steps.map((tab) => {
                    const isCurrent = portalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          if (!tab.unlocked) {
                            alert(`⛔ ${tab.label} Masih Terkunci!\n\n${tab.lockReason}`);
                            return;
                          }
                          setPortalTab(tab.id);
                        }}
                        disabled={!tab.unlocked}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg ring-2 ring-emerald-500/40 cursor-pointer'
                            : tab.done
                            ? 'bg-slate-800/90 border-emerald-500/40 text-emerald-300 hover:bg-slate-700/80 cursor-pointer'
                            : tab.unlocked
                            ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <tab.icon size={15} className={isCurrent ? 'text-white' : tab.done ? 'text-emerald-400' : tab.unlocked ? 'text-slate-300' : 'text-slate-600'} />
                          {tab.done ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 flex items-center gap-0.5 text-[9px] font-black">
                              ✓ Selesai
                            </span>
                          ) : !tab.unlocked ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-0.5 text-[9px] font-bold">
                              <Lock size={9} className="text-amber-400" />
                              Terkunci
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-xs font-bold mt-2 m-0 truncate">{tab.label}</p>
                        <p className="text-[10px] text-slate-400 m-0 mt-0.5 truncate">{tab.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* TAB CONTENT 1: STATUS TOKEN */}
                {portalTab === 'status' && (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 space-y-4">
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      {isStep1Done ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-400" />
                          <span>Pembayaran Token Pendaftaran Awal (Rp 50.000)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={18} className="text-amber-400" />
                          <span>Status Pembayaran Token Pendaftaran</span>
                        </>
                      )}
                    </h4>

                    {isStep1Done ? (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Status Pembayaran Token:</span>
                          <span className="font-bold text-emerald-400 uppercase">LUNAS (PAID)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Nominal Pembayaran:</span>
                          <span className="font-bold text-white">Rp {(activeCandidate.tokenAmount || 50000).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800">
                          <span className="text-slate-400">Waktu Pembayaran:</span>
                          <span className="font-bold text-slate-200">
                            {activeCandidate.tokenPaidAt ? new Date(activeCandidate.tokenPaidAt).toLocaleString('id-ID') : 'Terkonfirmasi'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">No Order Transaksi:</span>
                          <span className="font-mono text-slate-300">{activeCandidate.tokenPaymentOrderId || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-3">
                        <p className="m-0">
                          Token pendaftaran awal (Rp 50.000) belum lunas. Silakan selesaikan pembayaran token terlebih dahulu untuk membuka akses Tahap 2: Pengisian Data Lengkap Siswa.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeCandidate) {
                              setRegForm(prev => ({
                                ...prev,
                                fullName: activeCandidate.fullName || '',
                                nisn: activeCandidate.nisn || '',
                                phone: activeCandidate.phone || '',
                                gender: activeCandidate.gender || 'L',
                                schoolOriginType: activeCandidate.schoolOriginType || 'maarif_jogosari',
                                manualSchoolName: activeCandidate.schoolOrigin || '',
                                sessionId: activeCandidate.sessionId || prev.sessionId
                              }));
                            }
                            setActiveTab('register');
                          }}
                          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md"
                        >
                          <CreditCard size={14} />
                          <span>Menuju Halaman Pendaftaran & Bayar Token (Rp 50.000)</span>
                        </button>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (!isStep2Unlocked) {
                            alert('⛔ Tahap 2 Masih Terkunci!\n\nSelesaikan pembayaran token pendaftaran (Tahap 1) terlebih dahulu.');
                            return;
                          }
                          setPortalTab('form');
                        }}
                        disabled={!isStep2Unlocked}
                        className={`px-5 py-2.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all ${
                          isStep2Unlocked
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md'
                            : 'bg-slate-900/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        {isStep2Unlocked ? (
                          <>
                            <span>Lanjut ke Tahap 2: Isi Data Lengkap Siswa</span>
                            <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            <Lock size={14} className="text-amber-400" />
                            <span>Tahap 2 Terkunci (Perlu Bayar Token)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 2: FORM DATA LENGKAP SISWA */}
                {portalTab === 'form' && (
                  !isStep2Unlocked ? (
                    <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-white">Tahap 2: Data Lengkap Siswa Terkunci</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Anda harus menyelesaikan pembayaran Token Pendaftaran (Tahap 1) terlebih dahulu sebelum dapat mengisi dan menyimpan formulir data lengkap siswa.
                      </p>
                      <button
                        onClick={() => setPortalTab('status')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <ArrowLeft size={14} />
                        <span>Kembali ke Tahap 1: Status Token</span>
                      </button>
                    </div>
                  ) : (
                  <form onSubmit={handleSaveFullForm} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <div>
                        <h4 className="text-base font-black text-white">Data Lengkap Siswa</h4>
                        <p className="text-xs text-slate-400">Pastikan seluruh data pribadi, alamat terperinci, dan orang tua diisi sesuai dokumen resmi KK & Akta.</p>
                      </div>
                      {activeCandidate.isFormCompleted && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                          <Check size={13} />
                          <span>Sudah Tersimpan</span>
                        </span>
                      )}
                    </div>

                    {fullFormSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span>{fullFormSuccessMsg}</span>
                      </div>
                    )}

                    {/* Section 1: Data Pribadi */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wider">A. Data Pribadi Murid</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Nama Lengkap Murid (Otomatis Huruf Kapital) <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={fullForm.fullName || activeCandidate.fullName || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fullName: e.target.value.toUpperCase() })}
                            placeholder="NAMA LENGKAP SISWA"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white uppercase font-bold tracking-wide focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama Panggilan</label>
                          <input
                            type="text"
                            value={fullForm.nickname || ''}
                            onChange={(e) => setFullForm({ ...fullForm, nickname: e.target.value })}
                            placeholder="Contoh: Rizky"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Tempat & Tanggal Lahir */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Tempat Lahir <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={fullForm.birthPlace || activeCandidate.birthPlace || ''}
                            onChange={(e) => setFullForm({ ...fullForm, birthPlace: e.target.value })}
                            placeholder="Contoh: Pasuruan"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-300">
                              Tanggal Lahir <span className="text-rose-400">*</span>
                            </label>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              Format: dd/mm/yyyy ({formatDisplayDate(fullForm.birthDate || activeCandidate.birthDate)})
                            </span>
                          </div>
                          <input
                            type="date"
                            value={fullForm.birthDate || activeCandidate.birthDate || ''}
                            onChange={(e) => setFullForm({ ...fullForm, birthDate: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">No. Kartu Keluarga (KK)</label>
                          <input
                            type="text"
                            value={fullForm.kkNumber || ''}
                            onChange={(e) => setFullForm({ ...fullForm, kkNumber: e.target.value.replace(/\D/g, '') })}
                            placeholder="16 Digit No KK"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">No. Akta Kelahiran</label>
                          <input
                            type="text"
                            value={fullForm.birthCertNumber || ''}
                            onChange={(e) => setFullForm({ ...fullForm, birthCertNumber: e.target.value })}
                            placeholder="Sesuai Akta Kelahiran"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Agama</label>
                          <select
                            value={fullForm.religion || 'Islam'}
                            onChange={(e) => setFullForm({ ...fullForm, religion: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          >
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Anak Ke-</label>
                          <input
                            type="number"
                            value={fullForm.childOrder || ''}
                            onChange={(e) => setFullForm({ ...fullForm, childOrder: e.target.value })}
                            placeholder="1"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Jumlah Saudara Kandung</label>
                          <input
                            type="number"
                            value={fullForm.siblingsCount || ''}
                            onChange={(e) => setFullForm({ ...fullForm, siblingsCount: e.target.value })}
                            placeholder="2"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* RINCIAN PENGISIAN ALAMAT (DUSUN, RT, RW, DESA, KECAMATAN) */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">Rincian Komponen Alamat Siswa:</span>
                          <span className="text-[10px] text-slate-400">RT & RW otomatis 3 digit angka (contoh: RT. 001, RW. 007)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Dusun / Jalan / Gang</label>
                            <input
                              type="text"
                              value={fullForm.dusun || ''}
                              onChange={(e) => setFullForm({ ...fullForm, dusun: e.target.value })}
                              placeholder="Contoh: Jabon"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">RT (3 Digit Angka)</label>
                            <input
                              type="text"
                              maxLength={3}
                              value={fullForm.rt || ''}
                              onChange={(e) => setFullForm({ ...fullForm, rt: e.target.value.replace(/\D/g, '') })}
                              placeholder="001"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">RW (3 Digit Angka)</label>
                            <input
                              type="text"
                              maxLength={3}
                              value={fullForm.rw || ''}
                              onChange={(e) => setFullForm({ ...fullForm, rw: e.target.value.replace(/\D/g, '') })}
                              placeholder="007"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono text-center"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Desa / Kelurahan</label>
                            <input
                              type="text"
                              value={fullForm.village || ''}
                              onChange={(e) => setFullForm({ ...fullForm, village: e.target.value })}
                              placeholder="Contoh: Jogosari"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">Kecamatan</label>
                            <input
                              type="text"
                              value={fullForm.district || ''}
                              onChange={(e) => setFullForm({ ...fullForm, district: e.target.value })}
                              placeholder="Contoh: Pandaan"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                            />
                          </div>
                        </div>

                        {/* Read-Only Gabung Alamat */}
                        <div className="pt-2 border-t border-slate-800">
                          <label className="block text-[11px] font-bold text-emerald-400 mb-1 flex items-center justify-between">
                            <span>Alamat Lengkap (Otomatis Menggabungkan Komponen Alamat) [Read-Only]:</span>
                            <span className="text-[10px] text-slate-400 font-normal">Sesuai Format Resmi</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={formatCombinedAddress(fullForm.dusun, fullForm.rt, fullForm.rw, fullForm.village, fullForm.district) || fullForm.address || ''}
                            placeholder="Contoh: Jabon RT. 001, RW. 007, Jogosari, Pandaan"
                            className="w-full px-3 py-2.5 bg-slate-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-medium cursor-not-allowed select-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Kabupaten / Kota</label>
                          <input
                            type="text"
                            value={fullForm.city || 'Pasuruan'}
                            onChange={(e) => setFullForm({ ...fullForm, city: e.target.value })}
                            placeholder="Pasuruan"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Kode Pos</label>
                          <input
                            type="text"
                            value={fullForm.postalCode || ''}
                            onChange={(e) => setFullForm({ ...fullForm, postalCode: e.target.value })}
                            placeholder="67156"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Data Ayah Kandung */}
                    <div className="space-y-4 pt-2 border-t border-slate-700/80">
                      <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wider">B. Data Ayah Kandung</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama Ayah</label>
                          <input
                            type="text"
                            value={fullForm.fatherName || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherName: e.target.value })}
                            placeholder="Nama Lengkap Ayah"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">NIK Ayah</label>
                          <input
                            type="text"
                            value={fullForm.fatherNik || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherNik: e.target.value.replace(/\D/g, '') })}
                            placeholder="16 Digit NIK"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Pekerjaan Ayah</label>
                          <input
                            type="text"
                            value={fullForm.fatherOccupation || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherOccupation: e.target.value })}
                            placeholder="Wiraswasta / Karyawan / PNS"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Penghasilan Bulanan Ayah</label>
                          <select
                            value={fullForm.fatherIncome || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherIncome: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          >
                            <option value="">-- Pilih Range Penghasilan --</option>
                            <option value="Kurang dari Rp 1.000.000">Kurang dari Rp 1.000.000</option>
                            <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                            <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                            <option value="Lebih dari Rp 5.000.000">Lebih dari Rp 5.000.000</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">No. WhatsApp / HP Ayah</label>
                          <input
                            type="text"
                            value={fullForm.fatherPhone || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherPhone: e.target.value })}
                            placeholder="081234..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Data Ibu Kandung */}
                    <div className="space-y-4 pt-2 border-t border-slate-700/80">
                      <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wider">C. Data Ibu Kandung</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama Ibu</label>
                          <input
                            type="text"
                            value={fullForm.motherName || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherName: e.target.value })}
                            placeholder="Nama Lengkap Ibu"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">NIK Ibu</label>
                          <input
                            type="text"
                            value={fullForm.motherNik || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherNik: e.target.value.replace(/\D/g, '') })}
                            placeholder="16 Digit NIK"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Pekerjaan Ibu</label>
                          <input
                            type="text"
                            value={fullForm.motherOccupation || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherOccupation: e.target.value })}
                            placeholder="Ibu Rumah Tangga / Guru / Karyawan"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">Penghasilan Bulanan Ibu</label>
                          <select
                            value={fullForm.motherIncome || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherIncome: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          >
                            <option value="">-- Pilih Range Penghasilan --</option>
                            <option value="Tidak Berpenghasilan">Tidak Berpenghasilan / IRT</option>
                            <option value="Kurang dari Rp 1.000.000">Kurang dari Rp 1.000.000</option>
                            <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                            <option value="Lebih dari Rp 2.500.000">Lebih dari Rp 2.500.000</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">No. WhatsApp / HP Ibu</label>
                          <input
                            type="text"
                            value={fullForm.motherPhone || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherPhone: e.target.value })}
                            placeholder="081234..."
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                      <button
                        type="submit"
                        disabled={isSavingFullForm}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        {isSavingFullForm ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                        <span>Simpan Data Lengkap Siswa & Lanjut Upload Berkas</span>
                      </button>
                    </div>
                  </form>
                  )
                )}

                {/* TAB CONTENT 3: UPLOAD BERKAS (SEBELUM DAFTAR ULANG) */}
                {portalTab === 'docs' && (
                  !isStep3Unlocked ? (
                    <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-white">Tahap 3: Unggah Berkas Terkunci</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Silakan lengkapi dan simpan Formulir Data Lengkap Siswa (Tahap 2) terlebih dahulu sebelum mengunggah berkas persyaratan pendaftaran.
                      </p>
                      <button
                        onClick={() => setPortalTab('form')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <ArrowLeft size={14} />
                        <span>Buka Tahap 2: Data Lengkap Siswa</span>
                      </button>
                    </div>
                  ) : (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <div>
                        <h4 className="text-base font-black text-white">Unggah Berkas Persyaratan Pendaftaran</h4>
                        <p className="text-xs text-slate-400">
                          Upload 5 berkas resmi pendaftaran: Akte Kelahiran, KK, KTP Ayah, KTP Ibu, dan Foto Siswa.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>Auto Kompres Maks 1000px</span>
                      </span>
                    </div>

                    {docsSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span>{docsSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 gap-4">
                      {/* 1. Akte Kelahiran */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">1. Akte Kelahiran <span className="text-rose-400">*</span></span>
                          {docUploads.aktaPhoto && <span className="text-[10px] font-bold text-emerald-400">✓ Terunggah</span>}
                        </div>
                        {docUploads.aktaPhoto && (
                          <img src={docUploads.aktaPhoto} alt="Akta Preview" className="w-full h-28 object-cover rounded-xl border border-slate-700" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('aktaPhoto', e)}
                          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      {/* 2. Kartu Keluarga */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">2. Kartu Keluarga (KK) <span className="text-rose-400">*</span></span>
                          {docUploads.kkPhoto && <span className="text-[10px] font-bold text-emerald-400">✓ Terunggah</span>}
                        </div>
                        {docUploads.kkPhoto && (
                          <img src={docUploads.kkPhoto} alt="KK Preview" className="w-full h-28 object-cover rounded-xl border border-slate-700" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('kkPhoto', e)}
                          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      {/* 3. KTP Ayah */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">3. KTP Ayah <span className="text-rose-400">*</span></span>
                          {docUploads.ktpAyahPhoto && <span className="text-[10px] font-bold text-emerald-400">✓ Terunggah</span>}
                        </div>
                        {docUploads.ktpAyahPhoto && (
                          <img src={docUploads.ktpAyahPhoto} alt="KTP Ayah Preview" className="w-full h-28 object-cover rounded-xl border border-slate-700" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('ktpAyahPhoto', e)}
                          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      {/* 4. KTP Ibu */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">4. KTP Ibu <span className="text-rose-400">*</span></span>
                          {docUploads.ktpIbuPhoto && <span className="text-[10px] font-bold text-emerald-400">✓ Terunggah</span>}
                        </div>
                        {docUploads.ktpIbuPhoto && (
                          <img src={docUploads.ktpIbuPhoto} alt="KTP Ibu Preview" className="w-full h-28 object-cover rounded-xl border border-slate-700" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('ktpIbuPhoto', e)}
                          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      {/* 5. Foto Siswa */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">5. Foto Siswa (3x4) <span className="text-rose-400">*</span></span>
                          {docUploads.pasPhoto && <span className="text-[10px] font-bold text-emerald-400">✓ Terunggah</span>}
                        </div>
                        {docUploads.pasPhoto && (
                          <img src={docUploads.pasPhoto} alt="Foto Preview" className="w-24 h-28 object-cover rounded-xl border border-slate-700 mx-auto" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('pasPhoto', e)}
                          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      {/* Opsional: SKL / Ijazah */}
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">6. SKL / Ijazah (Opsional)</span>
                          {docUploads.sklPhoto && <span className="text-[10px] font-bold text-emerald-400">✓ Terunggah</span>}
                        </div>
                        {docUploads.sklPhoto && (
                          <img src={docUploads.sklPhoto} alt="SKL Preview" className="w-full h-28 object-cover rounded-xl border border-slate-700" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('sklPhoto', e)}
                          className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                      <button
                        type="button"
                        onClick={handleSaveDocuments}
                        disabled={isUploadingDocs}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      >
                        {isUploadingDocs ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
                        <span>Simpan Seluruh Berkas & Lanjut ke Pembayaran Daftar Ulang</span>
                      </button>
                    </div>
                  </div>
                  )
                )}

                {/* TAB CONTENT 4: DAFTAR ULANG & SERAGAM */}
                {portalTab === 'rereg' && (
                  !isStep4Unlocked ? (
                    <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-white">Tahap 4: Pembayaran Daftar Ulang Terkunci</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Anda harus melengkapi berkas persyaratan resmi (Akte Kelahiran, KK, dan Pas Foto) pada Tahap 3 terlebih dahulu sebelum dapat melanjutkan ke tahap pembayaran Daftar Ulang & Seragam.
                      </p>
                      <button
                        onClick={() => setPortalTab('docs')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <ArrowLeft size={14} />
                        <span>Buka Tahap 3: Unggah Berkas</span>
                      </button>
                    </div>
                  ) : (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                      <div>
                        <h4 className="text-base font-black text-white">Pembayaran Daftar Ulang & Seragam Sekolah</h4>
                        <p className="text-xs text-slate-400">Pilih ukuran seragam dan selesaikan pelunasan via Midtrans Snap.</p>
                      </div>
                      {activeCandidate.reRegistrationStatus === 'paid' ? (
                        <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                          LUNAS (PAID)
                        </span>
                      ) : (
                        <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                          Belum Lunas
                        </span>
                      )}
                    </div>

                    {/* Ukuran Seragam Selector */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-300">
                        Pilih Ukuran Seragam Calon Siswa ({activeCandidate.gender === 'L' ? 'Putra' : 'Putri'}):
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {['S', 'M', 'L', 'XL', 'XXL', 'Jumbo'].map((size) => (
                          <button
                            key={size}
                            type="button"
                            disabled={activeCandidate.reRegistrationStatus === 'paid'}
                            onClick={() => setSelectedUniformSize(size)}
                            className={`py-2.5 rounded-xl border text-xs font-black transition-all ${
                              selectedUniformSize === size
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            Ukuran {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rincian Item Tagihan Daftar Ulang */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-slate-300">Rincian Paket Biaya Daftar Ulang & Seragam:</h5>
                      <div className="rounded-2xl bg-slate-900 border border-slate-700/80 divide-y divide-slate-800 text-xs">
                        {/* 1. Uang Gedung & Diskon */}
                        <div className="p-3.5 flex justify-between items-center bg-slate-950/60">
                          <div>
                            <span className="font-bold text-white block">Uang Gedung / Infaq Pembangunan</span>
                            <span className="text-[11px] text-slate-400">Biaya sarana & prasarana pendidikan</span>
                          </div>
                          <span className="font-bold text-white">Rp {(config?.buildingFee || 1500000).toLocaleString('id-ID')}</span>
                        </div>

                        {(() => {
                          const details = getSessionFeeDetails(
                            activeCandidate.sessionId,
                            activeCandidate.gender === 'L' ? 'male' : 'female',
                            activeCandidate.schoolOriginType,
                            activeCandidate.schoolOrigin
                          );
                          return (
                            <>
                              {details.discountPercent > 0 && details.buildingDiscount > 0 && (
                                <div className="p-3.5 flex justify-between items-center text-emerald-400 font-bold bg-emerald-950/30">
                                  <div className="flex items-center gap-1.5">
                                    <Percent size={14} className="text-emerald-400 shrink-0" />
                                    <span>Potongan Gelombang Uang Gedung Sesi {activeCandidate.sessionId.toUpperCase()} ({details.discountPercent}%)</span>
                                  </div>
                                  <span>- Rp {details.buildingDiscount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              {details.maarifBuildingDiscount > 0 && (
                                <div className="p-3.5 flex justify-between items-center text-emerald-300 font-bold bg-emerald-900/30">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-emerald-400 shrink-0" />
                                    <span>Diskon Khusus Uang Gedung (SD Maarif Jogosari)</span>
                                  </div>
                                  <span>- Rp {details.maarifBuildingDiscount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* 2. SPP Juli 2027 */}
                        <div className="p-3.5 flex justify-between items-center bg-slate-950/60">
                          <div>
                            <span className="font-bold text-white block">SPP Bulan Juli 2027</span>
                            <span className="text-[11px] text-slate-400">SPP bulan pertama tahun ajaran baru</span>
                          </div>
                          <span className="font-bold text-white">Rp {(config?.julySppFee || 200000).toLocaleString('id-ID')}</span>
                        </div>

                        {/* 3. Seragam Items Header */}
                        <div className="p-3 bg-slate-800/60 font-bold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between items-center">
                          <span>Paket Seragam & Atribut Siswa ({activeCandidate.gender === 'L' ? 'Putra' : 'Putri'}):</span>
                          <span className="text-emerald-400">
                            Rp {getUniformItemsForGender(activeCandidate.gender === 'L' ? 'male' : 'female').reduce((sum, item) => sum + item.price, 0).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {getUniformItemsForGender(activeCandidate.gender === 'L' ? 'male' : 'female').map((item) => (
                          <div key={item.id} className="p-2.5 px-4 flex justify-between items-center text-slate-300">
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              <span>{item.name}</span>
                            </span>
                            <span className="font-semibold text-slate-200">Rp {item.price.toLocaleString('id-ID')}</span>
                          </div>
                        ))}

                        {/* Maarif Uniform Discount if applied */}
                        {(() => {
                          const details = getSessionFeeDetails(
                            activeCandidate.sessionId,
                            activeCandidate.gender === 'L' ? 'male' : 'female',
                            activeCandidate.schoolOriginType,
                            activeCandidate.schoolOrigin
                          );
                          if (details.maarifUniformDiscount > 0) {
                            return (
                              <div className="p-3.5 flex justify-between items-center text-emerald-300 font-bold bg-emerald-900/30 border-t border-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-emerald-400 shrink-0" />
                                  <span>Diskon Khusus Seragam / Perlengkapan (SD Maarif Jogosari)</span>
                                </div>
                                <span>- Rp {details.maarifUniformDiscount.toLocaleString('id-ID')}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Final Total */}
                        <div className="p-4 flex justify-between items-center bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 text-sm font-black border-t border-emerald-500/30">
                          <div>
                            <span className="text-white block">Total Tagihan Daftar Ulang:</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              Uang Gedung Net + SPP Juli 2027 + Seragam Net
                              {activeCandidate.schoolOriginType === 'maarif_jogosari' && ' (Termasuk Diskon SD Maarif)'}
                            </span>
                          </div>
                          <span className="text-emerald-400 text-lg font-black">
                            Rp {calculateTotalReRegFee(activeCandidate.gender, activeCandidate.sessionId, activeCandidate.schoolOriginType, activeCandidate.schoolOrigin).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      {activeCandidate.reRegistrationStatus === 'paid' ? (
                        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <span>Daftar Ulang telah Lunas pada {activeCandidate.reRegistrationPaidAt ? new Date(activeCandidate.reRegistrationPaidAt).toLocaleDateString('id-ID') : 'sebelumnya'}.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePayReRegistrationSnap}
                          disabled={isProcessingReRegPay}
                          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          {isProcessingReRegPay ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>Membuka Midtrans Snap...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={16} />
                              <span>Bayar Daftar Ulang via Midtrans Snap</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (!isStep5Unlocked) {
                            alert('⛔ Tahap 5 Terkunci!\n\nSelesaikan pembayaran Daftar Ulang & Seragam (Tahap 4) terlebih dahulu untuk menerbitkan Tanda Terima & Kartu Pendaftaran Resmi.');
                            return;
                          }
                          setPortalTab('card');
                        }}
                        className={`px-5 py-2.5 font-bold text-xs rounded-xl flex items-center gap-1.5 ml-auto transition-all ${
                          isStep5Unlocked
                            ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer shadow-md'
                            : 'bg-slate-900/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        {isStep5Unlocked ? (
                          <>
                            <span>Lihat Bukti Tanda Terima Resmi</span>
                            <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            <Lock size={14} className="text-amber-400" />
                            <span>Tahap 5 Terkunci (Perlu Lunas Daftar Ulang)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  )
                )}

                {/* TAB CONTENT 5: TANDA TERIMA / KARTU PENDAFTARAN RESMI */}
                {portalTab === 'card' && (
                  !isStep5Unlocked ? (
                    <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-white">Tahap 5: Kartu & Tanda Terima Resmi Terkunci</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Bukti tanda terima dan kartu pendaftaran resmi hanya dapat diterbitkan dan dicetak setelah calon siswa menyelesaikan pelunasan Daftar Ulang & Seragam (Tahap 4).
                      </p>
                      <button
                        onClick={() => setPortalTab('rereg')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <ArrowLeft size={14} />
                        <span>Buka Tahap 4: Pembayaran Daftar Ulang</span>
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-6">
                    <div className="flex justify-end gap-2 print:hidden">
                      <button
                        onClick={handlePrintCard}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Printer size={15} />
                        <span>Cetak Bukti Pendaftaran (PDF / Print)</span>
                      </button>
                    </div>

                    {/* Official Card for Print & Screen */}
                    <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xl space-y-6 print:shadow-none print:border-none print:p-0">
                      {/* Card Header with Letterhead */}
                      <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-4">
                        {schoolIdentity?.logo ? (
                          <img src={schoolIdentity.logo} alt="Logo" className="w-16 h-16 object-contain" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-2xl">
                            NU
                          </div>
                        )}
                        <div className="text-center flex-grow">
                          <h3 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900 m-0">
                            {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                          </h3>
                          <p className="xs font-bold text-emerald-800 m-0 uppercase">
                            PANITIA SISTEM PENERIMAAN MURID BARU (SPMB) T.A. {config?.academicYear || '2027/2028'}
                          </p>
                          <p className="text-[10px] text-slate-600 m-0">
                            {schoolIdentity?.address || 'Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan'} • Telp: {schoolIdentity?.phone || '(0343) 631234'}
                          </p>
                        </div>
                        {qrCodeDataUrl && (
                          <img src={qrCodeDataUrl} alt="QR Code" className="w-16 h-16 object-contain hidden sm:block" />
                        )}
                      </div>

                      <div className="text-center py-1 bg-slate-100 rounded-xl">
                        <h4 className="text-xs sm:text-sm font-black uppercase text-slate-800 m-0">
                          TANDA BUKTI PENDAFTARAN & STATUS PENERIMAAN SISWA BARU
                        </h4>
                      </div>

                      {/* Candidate Bio Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* Pas Photo & Status */}
                        <div className="text-center space-y-3">
                          {docUploads.pasPhoto ? (
                            <img src={docUploads.pasPhoto} alt="Pas Foto" className="w-28 h-36 object-cover rounded-xl border-2 border-slate-800 mx-auto" />
                          ) : (
                            <div className="w-28 h-36 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 mx-auto">
                              Pas Foto 3x4
                            </div>
                          )}
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300">
                            <span className="text-[10px] font-bold text-emerald-800 block">STATUS KELULUSAN:</span>
                            <span className="text-xs font-black text-emerald-700 uppercase">
                              {activeCandidate.status === 'accepted' ? 'DITERIMA' : 'TERDAFTAR RESMI'}
                            </span>
                          </div>
                        </div>

                        {/* Detail Data */}
                        <div className="sm:col-span-2 space-y-2 text-xs">
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Nomor Registrasi / NISN</span>
                            <span className="col-span-2 font-mono font-bold text-slate-900">: {activeCandidate.nisn}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Nama Lengkap Murid</span>
                            <span className="col-span-2 font-bold text-slate-900">: {activeCandidate.fullName}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Jenis Kelamin</span>
                            <span className="col-span-2 text-slate-800">: {activeCandidate.gender === 'L' ? 'Laki-laki (Putra)' : 'Perempuan (Putri)'}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Tempat, Tanggal Lahir</span>
                            <span className="col-span-2 text-slate-800">: {activeCandidate.birthPlace}, {formatDisplayDate(activeCandidate.birthDate)}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Alamat Lengkap</span>
                            <span className="col-span-2 text-slate-800">: {activeCandidate.address || '-'}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Asal Sekolah (SD/MI)</span>
                            <span className="col-span-2 text-slate-800">: {activeCandidate.schoolOrigin}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Sesi Gelombang</span>
                            <span className="col-span-2 font-bold text-emerald-800 uppercase">: {activeCandidate.sessionId}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                            <span className="font-semibold text-slate-500">Ukuran Seragam</span>
                            <span className="col-span-2 font-bold text-slate-900">: Ukuran {selectedUniformSize}</span>
                          </div>
                          <div className="grid grid-cols-3 py-1">
                            <span className="font-semibold text-slate-500">Status Pembayaran</span>
                            <span className="col-span-2 font-bold text-emerald-700">
                              : Token (Lunas) • Daftar Ulang ({activeCandidate.reRegistrationStatus === 'paid' ? 'Lunas' : 'Belum Lunas'})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                        <div>
                          <p className="m-0 text-slate-600">Orang Tua / Wali Murid,</p>
                          <div className="h-16" />
                          <p className="font-bold underline text-slate-900 m-0">( ........................................ )</p>
                        </div>
                        <div>
                          <p className="m-0 text-slate-600">Pandaan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p className="m-0 text-slate-600">Ketua Panitia SPMB {config?.academicYear || '2027/2028'},</p>
                          <div className="h-16" />
                          <p className="font-bold underline text-slate-900 m-0">H. Ahmad Fuad, S.Pd, M.PdI</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                )}
              </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Midtrans Snap Integration Modal */}
      {isPayModalOpen && snapToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CreditCard size={28} />
            </div>

            <div>
              <h3 className="text-base font-black text-white">{snapTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Silakan selesaikan pembayaran online sebesar <strong className="text-emerald-400 font-bold">Rp {snapAmount.toLocaleString('id-ID')}</strong> melalui Gateway Resmi Midtrans Snap.
              </p>
            </div>

            {snapError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs text-left">
                <p className="font-semibold text-rose-200 mb-0.5">Pemberitahuan:</p>
                <p className="text-[11px]">{snapError}</p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-left space-y-2 font-mono text-slate-300">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="text-emerald-400 font-bold">{snapOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Biaya:</span>
                <span className="text-white font-bold">Rp {snapAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Lingkungan:</span>
                <span>{midtransConfigState?.isProduction ? 'Production Live' : 'Sandbox Testing'}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => triggerSnapPayment(snapToken, snapOrderId, snapPayType)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <CreditCard size={15} />
                Buka / Tampilkan Jendela Midtrans Snap
              </button>

              {snapRedirectUrl && (
                <a
                  href={snapRedirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 transition-colors"
                >
                  Buka Halaman Midtrans di Tab Baru (Alternatif)
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  if (snapPayType === 'token') {
                    handleCancelTokenPayment(snapOrderId || undefined);
                  } else {
                    setIsPayModalOpen(false);
                  }
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                {snapPayType === 'token' ? 'Batalkan Pendaftaran (Hapus Draft)' : 'Tutup Jendela Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
