import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SpmbConfig, 
  SpmbCandidate, 
  SpmbSession, 
  SpmbUniformItem, 
  SchoolIdentity 
} from '../types';
import SpmbReceiptModal from './SpmbReceiptModal';
import BirthDateSplitInput from './BirthDateSplitInput';
import PWAInstallButton from './PWAInstallButton';
import { printSpmbReceiptDirect } from '../utils/spmbReceiptPrint';
import { formatCombinedPlaceAndDate, formatIndonesianDate, toProperCase } from '../utils/dateUtils';
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
  Unlock,
  UserPlus,
  UserCheck,
  MessageSquare,
  MessageCircle,
  Copy,
  Trash2
} from 'lucide-react';
import QRCode from 'qrcode';

// Opsi Pendidikan Terakhir untuk Formulir Data Lengkap SPMB
export const SPMB_EDUCATION_OPTIONS = [
  'tidak bersekolah',
  'SD/MI Sederajat',
  'SMP/Mts',
  'SMA/MA/SMK',
  'D1',
  'D2',
  'D3',
  'S1/D4',
  'S2',
  'S3',
] as const;

export const getNormalizedEduValue = (val?: string) => {
  if (!val) return '';
  const match = SPMB_EDUCATION_OPTIONS.find(o => o.toLowerCase() === val.trim().toLowerCase());
  return match || val;
};

export function isSchoolLpMaarif(schoolOriginType?: string, schoolOrigin?: string): boolean {
  if (!schoolOriginType && !schoolOrigin) return false;
  if (schoolOriginType === 'maarif_jogosari' || schoolOriginType === 'lp_maarif') return true;
  const s = `${schoolOriginType || ''} ${schoolOrigin || ''}`.toUpperCase();
  return s.includes('MAARIF') || s.includes("MA'ARIF");
}

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
  const [currentSchoolIdentity, setCurrentSchoolIdentity] = useState<SchoolIdentity | undefined>(schoolIdentity);
  const handleBack = onBackToLogin || onBackToPortal;
  // Navigation tabs in landing page
  const [activeTab, setActiveTab] = useState<'info' | 'register' | 'portal'>('info');

  // SPMB Config & State
  const [config, setConfig] = useState<SpmbConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [selectedGenderPreview, setSelectedGenderPreview] = useState<'male' | 'female'>('female');
  const [selectedSchoolPreview, setSelectedSchoolPreview] = useState<'maarif_jogosari' | 'lp_maarif' | 'other'>('maarif_jogosari');
  const [previewSiblingFreeSpp, setPreviewSiblingFreeSpp] = useState<boolean>(false);

  // Sibling KK Match State
  const [siblingMatchResult, setSiblingMatchResult] = useState<{ isMatch: boolean; matchedDetail?: string; message?: string } | null>(null);
  const [isCheckingKk, setIsCheckingKk] = useState<boolean>(false);

  // SPMB Official Receipt Modal (Token & Daftar Ulang)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [receiptModalCandidate, setReceiptModalCandidate] = useState<SpmbCandidate | null>(null);
  const [receiptModalType, setReceiptModalType] = useState<'token' | 'rereg'>('token');

  useEffect(() => {
    if (schoolIdentity) {
      setCurrentSchoolIdentity(schoolIdentity);
    }
  }, [schoolIdentity]);

  // Candidate Registration State (Step 1)
  const [regForm, setRegForm] = useState({
    fullName: '',
    nisn: '',
    nik: '',
    gender: 'L' as 'L' | 'P',
    birthPlace: 'Pasuruan',
    birthDate: '2014-05-12',
    phone: '',
    schoolOriginType: 'maarif_jogosari' as 'maarif_jogosari' | 'lp_maarif' | 'other',
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
  const [expiredNotice, setExpiredNotice] = useState<{ message: string; nisn?: string } | null>(null);
  const [copiedVa, setCopiedVa] = useState<boolean>(false);
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    formattedString: string;
  } | null>(null);

  // Full Data Lengkap Siswa Form State
  const [fullForm, setFullForm] = useState<Partial<SpmbCandidate>>({});
  const [hasGuardian, setHasGuardian] = useState<boolean>(false);
  const [isSavingFullForm, setIsSavingFullForm] = useState<boolean>(false);
  const [fullFormSuccessMsg, setFullFormSuccessMsg] = useState<string | null>(null);

  // Re-registration & Uniform Size State
  const [selectedUniformSize, setSelectedUniformSize] = useState<string>('L');
  const [customUniformNote, setCustomUniformNote] = useState<string>('');
  const [isProcessingReRegPay, setIsProcessingReRegPay] = useState<boolean>(false);

  // Documents Upload State (5 berkas utama: Akte Kelahiran, KK, KTP Ayah, KTP Ibu, Foto Murid)
  const [docUploads, setDocUploads] = useState<{
    aktaPhoto?: string;
    kkPhoto?: string;
    ktpPhoto?: string;
    ktpAyahPhoto?: string;
    ktpIbuPhoto?: string;
    pasPhoto?: string;
    sklPhoto?: string;
    kipPhoto?: string;
    ktp?: string;
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

  // Helper: Dapatkan Tautan Chat Langsung ke WhatsApp Narahubung Panitia SPMB
  const getWhatsAppLink = (customText?: string) => {
    const rawPhone = config?.contactPhone || currentSchoolIdentity?.phone || (currentSchoolIdentity as any)?.whatsapp || '081234567890';
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    const defaultMsg = customText || `Assalamu'alaikum Wr. Wb. Panitia SPMB ${currentSchoolIdentity?.name || 'SMP Maarif NU Pandaan'}, saya ingin berkonsultasi seputar pendaftaran murid baru tahun ajaran ${config?.academicYear || '2027/2028'}.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(defaultMsg)}`;
  };

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

      if (!schoolIdentity) {
        try {
          const resId = await fetch(`/api/school-identity?_t=${Date.now()}`);
          if (resId.ok) {
            const idData = await resId.json();
            setCurrentSchoolIdentity(idData);
          }
        } catch (err) {
          console.error('Failed to load school identity:', err);
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
            setIsPayModalOpen(false);
            setSnapError('Pembayaran dalam status pending. Silakan selesaikan pembayaran sesuai panduan Midtrans.');
            const targetNisn = regForm.nisn || activeCandidate?.nisn;
            if (targetNisn) {
              handleCheckStatus(targetNisn);
            }
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
            const targetNisn = regForm.nisn || activeCandidate?.nisn;
            if (targetNisn) {
              handleCheckStatus(targetNisn);
            }
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
    setExpiredNotice(null);
    setIsSearchingCandidate(true);

    try {
      const res = await fetch(`/api/spmb/candidate/${encodeURIComponent(nisn)}?_t=${Date.now()}`);
      if (res.ok) {
        const candidate: SpmbCandidate = await res.json();
        setActiveCandidate(candidate);
        setFullForm({
          ...candidate,
          studentPhone: candidate.studentPhone || '',
          nickname: (candidate.nickname || '').toUpperCase(),
          fatherName: (candidate.fatherName || '').toUpperCase(),
          motherName: (candidate.motherName || '').toUpperCase(),
          birthPlace: toProperCase(candidate.birthPlace || ''),
          fatherBirthPlace: toProperCase(candidate.fatherBirthPlace || ''),
          motherBirthPlace: toProperCase(candidate.motherBirthPlace || ''),
          guardianBirthPlace: toProperCase(candidate.guardianBirthPlace || ''),
          guardianName: (candidate.guardianName || '').toUpperCase(),
        });
        setHasGuardian(Boolean(candidate.hasGuardian || (candidate.guardianName && candidate.guardianName.trim() !== '')));
        setDocUploads(candidate.documents || {});
        setSelectedUniformSize(candidate.selectedUniformSize || 'L');
        setCustomUniformNote(candidate.customUniformNote || '');
        setActiveTab('portal');

        // Otomatis arahkan ke tahap aktif (tahap terdepan yang belum selesai tapi sudah terbuka)
        const isTargetReset = candidate.nisn === '0158483548' || candidate.nisn === '0152892235' || candidate.id === '0158483548' || candidate.id === '0152892235';
        const isStep1Done = Boolean(candidate.tokenPaymentStatus === 'paid' || candidate.tokenPaid);
        const hasRealFormData = Boolean(
          candidate.isFormCompleted &&
          (candidate.kkNumber && String(candidate.kkNumber).trim().length >= 8) &&
          (candidate.fatherName || candidate.motherName || candidate.guardianName || candidate.fullFormData?.fatherName || candidate.fullFormData?.motherName)
        );
        const isStep2Done = !isTargetReset && isStep1Done && (candidate.nisn === '0156620618' ? Boolean(candidate.isFormCompleted) : hasRealFormData);
        const hasActualDocs = Boolean(
          candidate.documents && 
          (candidate.documents.aktaPhoto || candidate.documents.kkPhoto || candidate.documents.pasPhoto || candidate.documents.ktpAyahPhoto || candidate.documents.ktpPhoto || candidate.documents.ktpIbuPhoto) &&
          Object.keys(candidate.documents).some(k => Boolean(candidate.documents[k]))
        );
        const isStep3Done = !isTargetReset && isStep2Done && (candidate.nisn === '0156620618' ? Boolean(candidate.documentsUploaded) : (Boolean(candidate.documentsUploaded) && hasActualDocs));
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

        // Cek apakah calon murid sudah terverifikasi punya saudara kandung / No KK sama
        const candKk = candidate.kkNumber || candidate.fullFormData?.kkNumber;
        if (candKk) {
          checkKkMatchRealtime(candKk, candidate);
        } else {
          setSiblingMatchResult(null);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 410 || err.isExpired || err.expired || err.code === 'TOKEN_EXPIRED') {
          setExpiredNotice({
            message: err.error || err.message || 'Batas waktu pembayaran token pendaftaran di Midtrans telah kedaluwarsa (expired). Data pendaftaran awal telah dihapus otomatis dari sistem.',
            nisn
          });
          setActiveCandidate(null);
          setPortalError(null);
          setActiveTab('portal');
          return;
        }
        setPortalError(err.error || 'Calon murid belum menyelesaikan pembayaran token atau data tidak ditemukan. Silakan input formulir pendaftaran awal.');
        setActiveCandidate(null);
      }
    } catch (e) {
      console.error('Error fetching candidate:', e);
      setPortalError('Gagal menghubungkan ke server. Silakan periksa koneksi Anda.');
    } finally {
      setIsSearchingCandidate(false);
    }
  };

  // Re-generate or restart Snap Token for a pending candidate
  const handleRestartSnapForCandidate = async (candidate: SpmbCandidate) => {
    try {
      setIsProcessingTokenPay(true);
      const res = await fetch('/api/spmb/register-token-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: candidate.nisn,
          fullName: candidate.fullName,
          phone: candidate.phone || candidate.parentPhone,
          gender: candidate.gender,
          sessionId: candidate.sessionId,
          schoolOriginType: candidate.schoolOriginType,
          schoolOrigin: candidate.schoolOrigin
        })
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.snapToken || data.token;
        setSnapToken(token);
        setSnapOrderId(data.orderId);
        setSnapAmount(data.tokenFee || 50000);
        setSnapRedirectUrl(data.redirectUrl || null);
        setSnapTitle(`Token Pendaftaran SPMB - ${candidate.fullName}`);
        setSnapPayType('token');
        setIsPayModalOpen(true);
        setTimeout(() => {
          triggerSnapPayment(token, data.orderId, 'token');
        }, 300);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal membuat sesi pembayaran Midtrans.');
      }
    } catch (e: any) {
      alert('Koneksi Midtrans gagal: ' + e.message);
    } finally {
      setIsProcessingTokenPay(false);
    }
  };

  // Live countdown timer for pending Midtrans token payment
  useEffect(() => {
    if (!activeCandidate || activeCandidate.tokenPaid || activeCandidate.tokenPaymentStatus !== 'pending' || !activeCandidate.tokenExpiryTime) {
      setTokenTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      try {
        const expiryMs = new Date(activeCandidate.tokenExpiryTime!.replace(' ', 'T')).getTime();
        const diff = expiryMs - Date.now();

        if (diff <= 0) {
          setTokenTimeRemaining({
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            formattedString: 'Batas Waktu Telah Habis (Expired)'
          });
          // Check live status to trigger cleanup
          handleCheckStatus(activeCandidate.nisn);
        } else {
          const totalSecs = Math.floor(diff / 1000);
          const hours = Math.floor(totalSecs / 3600);
          const minutes = Math.floor((totalSecs % 3600) / 60);
          const seconds = totalSecs % 60;

          setTokenTimeRemaining({
            hours,
            minutes,
            seconds,
            isExpired: false,
            formattedString: `${hours} Jam ${minutes} Menit ${seconds} Detik`
          });
        }
      } catch (e) {
        setTokenTimeRemaining(null);
      }
    };

    calculateRemaining();
    const timerInterval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timerInterval);
  }, [activeCandidate?.tokenExpiryTime, activeCandidate?.tokenPaymentStatus, activeCandidate?.tokenPaid, activeCandidate?.nisn]);

  // Check saved NISN on mount (e.g. redirect back from Midtrans)
  useEffect(() => {
    const savedNisn = localStorage.getItem('spmb_last_nisn');
    if (savedNisn) {
      localStorage.removeItem('spmb_last_nisn');
      setSearchNisn(savedNisn);
      handleCheckStatus(savedNisn);
    }
  }, []);

  // Real-time Check No KK Match with active students (7/8/9) or new candidates
  const checkKkMatchRealtime = async (kkVal: string, candidateToUse?: SpmbCandidate | null) => {
    const cand = candidateToUse !== undefined ? candidateToUse : activeCandidate;
    const cleanKk = String(kkVal || '').replace(/\D/g, '');
    if (cleanKk.length < 10) {
      setSiblingMatchResult(null);
      return;
    }
    setIsCheckingKk(true);
    try {
      const res = await fetch('/api/spmb/check-kk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kkNumber: cleanKk,
          candidateId: cand?.id,
          nisn: cand?.nisn
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isMatch) {
          setSiblingMatchResult(data);
          if (cand) {
            setActiveCandidate(prev => prev ? ({
              ...prev,
              isSiblingKkMatch: true,
              matchedSiblingDetail: data.matchedDetail,
              freeFirstMonthSpp: cand.sessionId === 'inden' ? true : prev.freeFirstMonthSpp
            }) : null);
          }
        } else {
          setSiblingMatchResult({ isMatch: false });
        }
      }
    } catch (e) {
      console.error('Error checking KK match:', e);
    } finally {
      setIsCheckingKk(false);
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
    schoolOriginType: 'maarif_jogosari' | 'lp_maarif' | 'other' | string = 'other',
    customSchoolName: string = '',
    isFreeFirstMonthSppOverride?: boolean
  ) => {
    if (!config) return 0;
    const g = (gender === 'L' || gender === 'male') ? 'male' : 'female';
    const items = getUniformItemsForGender(g);
    const rawUniformTotal = items.reduce((sum, item) => sum + item.price, 0);
    const buildingFee = config.buildingFee || 2000000;
    const julySppFee = config.julySppFee || 200000;
    const baseFee = config.reRegistrationBaseFee || 0;
    
    const isMaarif = schoolOriginType === 'maarif_jogosari' || 
      customSchoolName.toUpperCase().includes('MAARIF JOGOSARI') ||
      schoolOriginType.toUpperCase().includes('MAARIF JOGOSARI');

    const isLpMaarif = isMaarif ||
      schoolOriginType === 'lp_maarif' ||
      customSchoolName.toUpperCase().includes('MAARIF') ||
      customSchoolName.toUpperCase().includes("MA'ARIF") ||
      schoolOriginType.toUpperCase().includes('MAARIF') ||
      schoolOriginType.toUpperCase().includes("MA'ARIF");

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

    // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
    let sportsUniformBonus = 0;
    const allowBonus = session?.sportsUniformBonusForMaarif ?? config.maarifIndenSportsUniformBonus ?? true;
    if (sessionId === 'inden' && isLpMaarif && allowBonus) {
      const sportsItem = items.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
      sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
    }

    const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount - sportsUniformBonus);

    // Sibling KK Match: Gratis SPP bulan pertama (Juli) pada Sesi Inden
    const hasSiblingFreeSpp = isFreeFirstMonthSppOverride !== undefined 
      ? isFreeFirstMonthSppOverride 
      : Boolean(sessionId === 'inden' && (activeCandidate?.freeFirstMonthSpp || activeCandidate?.isSiblingKkMatch));
    const effectiveJulySppFee = hasSiblingFreeSpp ? 0 : julySppFee;

    return netBuildingFee + effectiveJulySppFee + baseFee + netUniformTotal;
  };

  const getSessionFeeDetails = (
    sessionId: string,
    gender: 'male' | 'female',
    schoolOriginType: 'maarif_jogosari' | 'lp_maarif' | 'other' | string = 'other',
    customSchoolName: string = '',
    isFreeFirstMonthSppOverride?: boolean
  ) => {
    const items = getUniformItemsForGender(gender);
    const rawUniformTotal = items.reduce((sum, item) => sum + item.price, 0);
    const buildingFee = config?.buildingFee || 2000000;
    const julySppFee = config?.julySppFee || 200000;
    const baseFee = config?.reRegistrationBaseFee || 0;
    const session = config?.sessions.find(s => s.id === sessionId);

    const isMaarif = schoolOriginType === 'maarif_jogosari' || 
      customSchoolName.toUpperCase().includes('MAARIF JOGOSARI') ||
      schoolOriginType.toUpperCase().includes('MAARIF JOGOSARI');

    const isLpMaarif = isMaarif ||
      schoolOriginType === 'lp_maarif' ||
      customSchoolName.toUpperCase().includes('MAARIF') ||
      customSchoolName.toUpperCase().includes("MA'ARIF") ||
      schoolOriginType.toUpperCase().includes('MAARIF') ||
      schoolOriginType.toUpperCase().includes("MA'ARIF");

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

    // Bonus 1 Set Seragam Olahraga khusus Sesi Inden bagi SD/MI dari LP. Maarif
    let sportsUniformBonus = 0;
    const allowBonus = session?.sportsUniformBonusForMaarif ?? config?.maarifIndenSportsUniformBonus ?? true;
    if (sessionId === 'inden' && isLpMaarif && allowBonus) {
      const sportsItem = items.find(u => u.id === 'u-1' || u.name.toLowerCase().includes('olahraga'));
      sportsUniformBonus = sportsItem ? sportsItem.price : 125000;
    }

    const netUniformTotal = Math.max(0, rawUniformTotal - maarifUniformDiscount - sportsUniformBonus);

    // Sibling KK Match: Gratis SPP bulan pertama (Juli) pada Sesi Inden
    const hasSiblingFreeSpp = isFreeFirstMonthSppOverride !== undefined 
      ? isFreeFirstMonthSppOverride 
      : Boolean(sessionId === 'inden' && (activeCandidate?.freeFirstMonthSpp || activeCandidate?.isSiblingKkMatch));
    const effectiveJulySppFee = hasSiblingFreeSpp ? 0 : julySppFee;

    const total = netBuildingFee + effectiveJulySppFee + baseFee + netUniformTotal;

    return {
      buildingFee,
      discountPercent,
      buildingWaveDiscount,
      buildingDiscount: buildingWaveDiscount,
      maarifBuildingDiscount,
      totalBuildingDiscount,
      netBuildingFee,
      julySppFee,
      effectiveJulySppFee,
      hasSiblingFreeSpp,
      isSiblingFreeSpp: hasSiblingFreeSpp,
      baseFee,
      rawUniformTotal,
      maarifUniformDiscount,
      uniformDiscount: maarifUniformDiscount,
      sportsUniformBonus,
      hasSportsUniformBonus: sportsUniformBonus > 0,
      netUniformTotal,
      total,
      session,
      isMaarif,
      isLpMaarif
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
        setFullForm({
          ...resData.candidate,
          studentPhone: resData.candidate.studentPhone || '',
          nickname: (resData.candidate.nickname || '').toUpperCase(),
          fatherName: (resData.candidate.fatherName || '').toUpperCase(),
          motherName: (resData.candidate.motherName || '').toUpperCase(),
          birthPlace: toProperCase(resData.candidate.birthPlace || ''),
          fatherBirthPlace: toProperCase(resData.candidate.fatherBirthPlace || ''),
          motherBirthPlace: toProperCase(resData.candidate.motherBirthPlace || ''),
          guardianBirthPlace: toProperCase(resData.candidate.guardianBirthPlace || ''),
          guardianName: (resData.candidate.guardianName || '').toUpperCase(),
        });
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
          setFullForm({
            ...verified.candidate,
            studentPhone: verified.candidate.studentPhone || '',
            nickname: (verified.candidate.nickname || '').toUpperCase(),
            fatherName: (verified.candidate.fatherName || '').toUpperCase(),
            motherName: (verified.candidate.motherName || '').toUpperCase(),
            birthPlace: toProperCase(verified.candidate.birthPlace || ''),
            fatherBirthPlace: toProperCase(verified.candidate.fatherBirthPlace || ''),
            motherBirthPlace: toProperCase(verified.candidate.motherBirthPlace || ''),
            guardianBirthPlace: toProperCase(verified.candidate.guardianBirthPlace || ''),
            guardianName: (verified.candidate.guardianName || '').toUpperCase(),
          });
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

  // 3. Step 3: Save Full Data Lengkap Murid Form (Semua Wajib Diisi)
  const handleSaveFullForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidate) return;

    // VALIDASI KETAT: Seluruh kolom biodata buku induk wajib diisi
    const missingFields: string[] = [];
    if (!fullForm.fullName?.trim() && !activeCandidate.fullName?.trim()) missingFields.push("Nama Lengkap Murid");
    if (!fullForm.nickname?.trim()) missingFields.push("Nama Panggilan");
    if (!fullForm.nik?.trim() && !activeCandidate.nik?.trim()) missingFields.push("NIK Murid (16 digit)");
    if (!fullForm.kkNumber?.trim()) missingFields.push("Nomor Kartu Keluarga (KK)");
    if (!fullForm.birthCertNumber?.trim()) missingFields.push("Nomor Registrasi Akta Kelahiran");
    if (!fullForm.birthPlace?.trim() && !activeCandidate.birthPlace?.trim()) missingFields.push("Tempat Lahir Murid");
    if (!fullForm.birthDate?.trim() && !activeCandidate.birthDate?.trim()) missingFields.push("Tanggal Lahir Murid");
    if (!fullForm.religion?.trim()) missingFields.push("Agama");
    if (!fullForm.address?.trim() && !fullForm.dusun?.trim()) missingFields.push("Alamat / Dusun");
    if (!fullForm.rt?.trim()) missingFields.push("RT");
    if (!fullForm.rw?.trim()) missingFields.push("RW");
    if (!fullForm.village?.trim()) missingFields.push("Desa / Kelurahan");
    if (!fullForm.district?.trim()) missingFields.push("Kecamatan");
    if (!fullForm.city?.trim()) missingFields.push("Kabupaten / Kota");
    if (!fullForm.postalCode?.trim()) missingFields.push("Kode Pos");
    if (!fullForm.livingWith?.trim()) missingFields.push("Tempat Tinggal / Tinggal Bersama");
    if (!fullForm.transportation?.trim()) missingFields.push("Moda Transportasi ke Sekolah");
    if (!fullForm.childOrder && fullForm.childOrder !== 0) missingFields.push("Anak Ke-");
    if (!fullForm.siblingsCount && fullForm.siblingsCount !== 0) missingFields.push("Jumlah Saudara Kandung");
    if (!fullForm.height) missingFields.push("Tinggi Badan (cm)");
    if (!fullForm.weight) missingFields.push("Berat Badan (kg)");
    if (!fullForm.distanceToSchool?.trim()) missingFields.push("Jarak ke Sekolah");
    if (!fullForm.travelTime?.trim()) missingFields.push("Waktu Tempuh ke Sekolah");

    // Data Ayah
    if (!fullForm.fatherName?.trim()) missingFields.push("Nama Lengkap Ayah");
    if (!fullForm.fatherNik?.trim()) missingFields.push("NIK Ayah Kandung");
    if (!fullForm.fatherBirthPlace?.trim()) missingFields.push("Tempat Lahir Ayah");
    if (!fullForm.fatherBirthDate?.trim()) missingFields.push("Tanggal Lahir Ayah");
    if (!fullForm.fatherEducation?.trim()) missingFields.push("Pendidikan Terakhir Ayah");
    if (!fullForm.fatherOccupation?.trim()) missingFields.push("Pekerjaan Ayah");
    if (!fullForm.fatherIncome?.trim()) missingFields.push("Penghasilan Bulanan Ayah");
    if (!fullForm.fatherPhone?.trim() && !fullForm.phone?.trim() && !activeCandidate.phone?.trim()) missingFields.push("No. WhatsApp / HP Ayah/Ortu");

    // Data Ibu
    if (!fullForm.motherName?.trim()) missingFields.push("Nama Lengkap Ibu");
    if (!fullForm.motherNik?.trim()) missingFields.push("NIK Ibu Kandung");
    if (!fullForm.motherBirthPlace?.trim()) missingFields.push("Tempat Lahir Ibu");
    if (!fullForm.motherBirthDate?.trim()) missingFields.push("Tanggal Lahir Ibu");
    if (!fullForm.motherEducation?.trim()) missingFields.push("Pendidikan Terakhir Ibu");
    if (!fullForm.motherOccupation?.trim()) missingFields.push("Pekerjaan Ibu");
    if (!fullForm.motherIncome?.trim()) missingFields.push("Penghasilan Bulanan Ibu");
    if (!fullForm.motherPhone?.trim() && !fullForm.phone?.trim() && !activeCandidate.phone?.trim()) missingFields.push("No. WhatsApp / HP Ibu");

    if (hasGuardian) {
      if (!fullForm.guardianName?.trim()) missingFields.push("Nama Lengkap Wali");
      if (!fullForm.guardianNik?.trim()) missingFields.push("NIK Wali");
      if (!fullForm.guardianOccupation?.trim()) missingFields.push("Pekerjaan Wali");
      if (!fullForm.guardianPhone?.trim()) missingFields.push("No. HP / WA Wali");
    }

    if (missingFields.length > 0) {
      alert(
        `⚠️ SEMUA BIODATA LENGKAP WAJIB DIISI!\n\n` +
        `Anda belum mengisi kolom berikut:\n• ` +
        missingFields.slice(0, 8).join('\n• ') +
        (missingFields.length > 8 ? `\n...dan ${missingFields.length - 8} kolom wajib lainnya.` : '') +
        `\n\nSilakan lengkapi seluruh kolom formulir untuk dapat menyimpan dan melanjutkan ke tahap upload berkas.`
      );
      return;
    }

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
      studentPhone: (fullForm.studentPhone || '').trim(),
      phone: activeCandidate.phone || (fullForm as any).phone || '',
      nickname: (fullForm.nickname || '').toUpperCase(),
      fatherName: (fullForm.fatherName || '').toUpperCase(),
      motherName: (fullForm.motherName || '').toUpperCase(),
      birthPlace: toProperCase(fullForm.birthPlace || activeCandidate.birthPlace || ''),
      dusun: toProperCase(fullForm.dusun || ''),
      village: toProperCase(fullForm.village || ''),
      district: toProperCase(fullForm.district || ''),
      city: toProperCase(fullForm.city || 'Pasuruan'),
      fatherBirthPlace: toProperCase(fullForm.fatherBirthPlace || ''),
      fatherOccupation: toProperCase(fullForm.fatherOccupation || ''),
      motherBirthPlace: toProperCase(fullForm.motherBirthPlace || ''),
      motherOccupation: toProperCase(fullForm.motherOccupation || ''),
      guardianBirthPlace: toProperCase(fullForm.guardianBirthPlace || ''),
      guardianOccupation: toProperCase(fullForm.guardianOccupation || ''),
      guardianAddress: toProperCase(fullForm.guardianAddress || ''),
      guardianName: (fullForm.guardianName || '').toUpperCase(),
      hasGuardian,
      address: combinedAddress || fullForm.address,
      ...(!hasGuardian ? {
        guardianName: '',
        guardianNik: '',
        guardianBirthPlace: '',
        guardianBirthDate: '',
        guardianEducation: '',
        guardianOccupation: '',
        guardianIncome: '',
        guardianPhone: '',
        guardianRelation: '',
        guardianAddress: '',
        guardianStatus: '',
      } : {})
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
        setFullForm({
          ...updated.candidate,
          studentPhone: updated.candidate.studentPhone || '',
          nickname: (updated.candidate.nickname || '').toUpperCase(),
          fatherName: (updated.candidate.fatherName || '').toUpperCase(),
          motherName: (updated.candidate.motherName || '').toUpperCase(),
          birthPlace: toProperCase(updated.candidate.birthPlace || ''),
          fatherBirthPlace: toProperCase(updated.candidate.fatherBirthPlace || ''),
          motherBirthPlace: toProperCase(updated.candidate.motherBirthPlace || ''),
          guardianBirthPlace: toProperCase(updated.candidate.guardianBirthPlace || ''),
          guardianName: (updated.candidate.guardianName || '').toUpperCase(),
        });
        setFullFormSuccessMsg('Biodata lengkap calon murid berhasil disimpan!');
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

  // 4. Step 4: Upload Files & Photos (Akte, KK, KTP Ayah, KTP Ibu, Foto Murid - Kompres 1000px)
  const handleFileChange = async (
    field: 'aktaPhoto' | 'kkPhoto' | 'ktpPhoto' | 'ktpAyahPhoto' | 'ktpIbuPhoto' | 'pasPhoto' | 'kipPhoto',
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

    // Validasi berkas wajib: Akte Kelahiran, Kartu Keluarga, KTP Ayah/Wali, KTP Ibu, dan Pas Foto Murid
    const hasAkta = Boolean(docUploads.aktaPhoto || activeCandidate.documents?.aktaPhoto);
    const hasKk = Boolean(docUploads.kkPhoto || activeCandidate.documents?.kkPhoto);
    const hasFoto = Boolean(docUploads.pasPhoto || activeCandidate.documents?.pasPhoto);
    const hasKtpAyah = Boolean(docUploads.ktpAyahPhoto || activeCandidate.documents?.ktpAyahPhoto || docUploads.ktpPhoto || activeCandidate.documents?.ktpPhoto);
    const hasKtpIbu = Boolean(docUploads.ktpIbuPhoto || activeCandidate.documents?.ktpIbuPhoto);

    const missingDocs: string[] = [];
    if (!hasFoto) missingDocs.push("1. Pas Foto Calon Murid (3x4)");
    if (!hasKk) missingDocs.push("2. Kartu Keluarga (KK)");
    if (!hasAkta) missingDocs.push("3. Akte Kelahiran");
    if (!hasKtpAyah) missingDocs.push("4. KTP Ayah / Wali");
    if (!hasKtpIbu) missingDocs.push("5. KTP Ibu");

    if (missingDocs.length > 0) {
      alert(
        `⚠️ SELURUH BERKAS PERSYARATAN WAJIB DIUNGGAH!\n\n` +
        `Berkas berikut belum diunggah:\n• ` +
        missingDocs.join('\n• ') +
        `\n\nMohon lengkapi dan unggah semua berkas yang diwajibkan untuk dapat menyimpan dan melanjutkan pendaftaran.`
      );
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
        setDocsSuccessMsg('Seluruh berkas pendaftaran berhasil diunggah! Lanjut ke tahap pembayaran daftar ulang.');
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
      const isFreeFirstMonth = Boolean(activeCandidate.sessionId === 'inden' && (activeCandidate.freeFirstMonthSpp || activeCandidate.isSiblingKkMatch));
      const totalFee = calculateTotalReRegFee(
        activeCandidate.gender,
        activeCandidate.sessionId,
        activeCandidate.schoolOriginType,
        activeCandidate.schoolOrigin,
        isFreeFirstMonth
      );
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
      setSnapAmount(snapData.totalAmount || snapData.amount || totalFee);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      {/* Top Floating Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {schoolIdentity?.logo ? (
              <img src={schoolIdentity.logo} alt="Logo 1" className="w-10 h-10 object-contain rounded-lg bg-slate-100 p-1 border border-slate-200 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm font-black shrink-0">
                <GraduationCap size={22} />
              </div>
            )}
            <img
              src={schoolIdentity?.logo2 || "/logo2.png"}
              alt="Logo Sekolah Inspiratif"
              className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-emerald-200 shadow-2xs shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo2.png'; }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 m-0">
                  SPMB 2027/2028
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Resmi Terbuka
                </span>
              </div>
              <p className="text-[11px] text-slate-500 m-0 hidden sm:block">
                Sekolah Inspiratif {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"} • {schoolIdentity?.accreditation || 'Terakreditasi A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'info' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Info & Biaya
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'register' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Daftar Baru</span>
            </button>
            <button
              onClick={() => setActiveTab('portal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'portal' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Search size={13} />
              <span>Cek Status</span>
            </button>

            <PWAInstallButton variant="pill" label="Pasang Aplikasi" className="shrink-0" />

            {handleBack && (
              <button
                onClick={handleBack}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold border border-slate-300 shadow-2xs transition-all cursor-pointer"
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-indigo-50/60 border border-emerald-200/80 p-6 sm:p-10 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-xs font-bold">
                  <Award size={14} />
                  <span>Penerimaan Peserta Didik Baru TA 2027/2028</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Wujudkan Masa Depan Gemilang di <span className="text-emerald-700">Sekolah Inspiratif {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}</span>
                </h2>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Sekolah Ramah Anak dengan Kurikulum Merdeka Terintegrasi Pendidikan Karakter Aswaja An-Nahdliyah, Laboratorium Komputer Modern, dan Program Unggulan Tahfidz serta Digital Literacy.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span>Daftar Sekarang (Token Rp 50.000)</span>
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => setActiveTab('portal')}
                    className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl border border-slate-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Search size={15} />
                    <span>Sudah Daftar? Cek Status</span>
                  </button>
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white font-bold text-sm rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle size={16} className="text-emerald-200 animate-pulse" />
                    <span>WhatsApp Narahubung SPMB</span>
                  </a>
                </div>
              </div>

              {/* Logo Ke-2 / Logo Sekolah Inspiratif Pada Banner header sebelah kanan */}
              <div className="relative z-10 shrink-0 flex items-center justify-center lg:justify-end">
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 rounded-3xl blur-xl opacity-40 group-hover:opacity-65 transition duration-500" />
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-xl border border-emerald-200/90 flex flex-col items-center justify-center text-center transform transition duration-300 hover:scale-105">
                    <img
                      src={schoolIdentity?.logo2 || "/logo2.png"}
                      alt="Logo Sekolah Inspiratif"
                      className="max-h-28 sm:max-h-36 max-w-full object-contain drop-shadow-md"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo2.png';
                      }}
                    />
                    <div className="mt-2.5">
                      <span className="block text-xs sm:text-sm font-black text-emerald-800 uppercase tracking-wider">
                        Sekolah Inspiratif
                      </span>
                      <span className="block text-[10px] text-slate-500 font-semibold">
                        {schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute right-0 bottom-0 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* 3 Sesi Pendaftaran Cards */}
            <div className="space-y-4">
              <div className="text-center max-w-2xl mx-auto space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">3 Sesi Pendaftaran Murid Baru 2027/2028</h3>
                <p className="text-xs sm:text-sm text-slate-600">
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
                          ? 'bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-50 border-slate-200 opacity-90'
                      }`}
                    >
                      {session.isActive ? (
                        <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Sesi Dibuka / Aktif
                        </span>
                      ) : (
                        <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
                          Jalur Belum Aktif
                        </span>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                            Sesi 0{idx + 1}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Users size={13} />
                            <span>Kuota: {session.quota} Murid</span>
                          </span>
                        </div>

                        <h4 className="text-lg font-black text-slate-900 m-0">{session.name}</h4>
                        
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                          <div className="flex items-center gap-2 text-slate-800">
                            <Calendar size={13} className="text-emerald-600 shrink-0" />
                            <span>
                              {new Date(session.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s.d. {new Date(session.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          {hasDiscount ? (
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Percent size={13} className="text-emerald-700 shrink-0" />
                                <span>Diskon Uang Gedung: {discountPct}%</span>
                              </div>
                              <p className="text-[10px] text-emerald-800 m-0 pl-4">
                                Hemat Rp {discountVal.toLocaleString('id-ID')} dari Uang Gedung
                              </p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500">
                              Uang Gedung Standar (Tanpa Potongan)
                            </div>
                          )}

                          {/* Bonus 1 Set Seragam Olahraga untuk Sesi Inden bagi SD/MI LP. Maarif */}
                          {(session.id === 'inden' || session.sportsUniformBonusForMaarif) && (
                            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-300 text-amber-950 font-bold space-y-0.5 shadow-2xs">
                              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-black">
                                <span className="text-base leading-none">🎁</span>
                                <span>BONUS: 1 Set Seragam Olahraga Gratis</span>
                              </div>
                              <p className="text-[10px] text-amber-800 m-0 pl-5 font-semibold leading-tight">
                                Khusus pendaftar SD/MI dari LP. Ma'arif (Bebas biaya 1 setel seragam olahraga)
                              </p>
                            </div>
                          )}

                          {/* Promo Bebas SPP Bulan Pertama di Sesi Inden jika No KK Sama */}
                          {session.id === 'inden' && (
                            <div className="p-2.5 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-300 text-teal-950 font-bold space-y-0.5 shadow-2xs">
                              <div className="flex items-center gap-1.5 text-xs text-teal-900 font-black">
                                <span className="text-base leading-none">🎉</span>
                                <span>GRATIS SPP Bulan Pertama (Juli)</span>
                              </div>
                              <p className="text-[10px] text-teal-800 m-0 pl-5 font-semibold leading-tight">
                                Jika No. KK sama dengan sesama murid baru atau murid aktif kelas 7/8/9
                              </p>
                            </div>
                          )}

                          {session.id === 'inden' ? (
                            <div className="pt-2 border-t border-slate-200 text-[11px] space-y-1 text-slate-600">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">SD Maarif Jogosari:</span>
                                <span className="font-bold text-emerald-700">Rp 200.000 <span className="text-[10px] text-slate-500 font-normal">(Hanya SPP)</span></span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">SD/MI LP. Ma'arif:</span>
                                <span className="font-bold text-amber-700">Rp 435.000 (L) / Rp 525.000 (P)</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">SD Lainnya (Umum):</span>
                                <span className="font-bold text-slate-900">Rp {feeMale.total.toLocaleString('id-ID')} (L) / Rp {feeFemale.total.toLocaleString('id-ID')} (P)</span>
                              </div>
                              <p className="text-[10px] text-teal-700 font-bold m-0 pt-0.5">
                                *Gratis SPP bulan pertama jika No. KK sama dengan siswa aktif/calon murid baru
                              </p>
                            </div>
                          ) : (
                            <div className="pt-1.5 border-t border-slate-200 text-[11px] flex justify-between text-slate-600">
                              <span>Estimasi Total:</span>
                              <span className="font-bold text-slate-900">
                                Rp {feeMale.total.toLocaleString('id-ID')} (L) / Rp {feeFemale.total.toLocaleString('id-ID')} (P)
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
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
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <Receipt size={20} className="text-emerald-600" />
                    <span>Struktur & Rincian Biaya Daftar Ulang</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Simulasikan rincian biaya pendaftaran sesuai jenis kelamin dan asal sekolah (SD Maarif Jogosari, SD/MI LP. Ma'arif, atau SD Lainnya).
                  </p>
                </div>

                {/* Filter Controls: Gender, School Origin, & Sibling KK Match */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Asal SD Switch */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolPreview('maarif_jogosari')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedSchoolPreview === 'maarif_jogosari'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>SD Maarif Jogosari</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolPreview('lp_maarif')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedSchoolPreview === 'lp_maarif'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🎁 SD/MI LP. Ma'arif</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolPreview('other')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedSchoolPreview === 'other'
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>SD Lainnya (Umum)</span>
                    </button>
                  </div>

                  {/* Gender Switch */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedGenderPreview('male')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedGenderPreview === 'male'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Putra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGenderPreview('female')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedGenderPreview === 'female'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Putri</span>
                    </button>
                  </div>

                  {/* Sibling KK Gratis SPP Juli Toggle */}
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border cursor-pointer text-xs font-bold transition-all select-none ${
                    previewSiblingFreeSpp 
                      ? 'bg-teal-50 border-teal-300 text-teal-900 ring-2 ring-teal-400/30' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={previewSiblingFreeSpp}
                      onChange={(e) => setPreviewSiblingFreeSpp(e.target.checked)}
                      className="rounded border-teal-400 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                    />
                    <span className="flex items-center gap-1">
                      <span>🎉 Simulasi No KK Sama</span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-black">Gratis SPP Juli</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Notice for SD Maarif Jogosari */}
              {selectedSchoolPreview === 'maarif_jogosari' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                  <Sparkles size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900 font-bold block text-sm">
                      🌟 Ketentuan Khusus SD MAARIF JOGOSARI Aktif!
                    </strong>
                    <div className="mt-1 space-y-0.5 text-slate-700">
                      <p className="m-0">
                        • <strong>Potongan Uang Gedung 100%:</strong> Bebas biaya Uang Gedung (Infaq) senilai Rp {(config?.buildingFee || 2000000).toLocaleString('id-ID')} (Net: Rp 0).
                      </p>
                      <p className="m-0">
                        • <strong>Diskon Seragam Lengkap 100%:</strong> Bebas biaya seluruh paket seragam & atribut sekolah (Net: Rp 0).
                      </p>
                      <p className="m-0 text-emerald-800 font-bold">
                        • <strong>Daftar Ulang Hanya SPP Juli:</strong> Hanya membayar SPP Bulan Juli 2027 sebesar Rp {(config?.julySppFee || 200000).toLocaleString('id-ID')} (atau <strong>Rp 0 GRATIS</strong> jika memiliki No. KK sama dengan siswa aktif/murid baru).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice for SD/MI LP Maarif Lainnya */}
              {selectedSchoolPreview === 'lp_maarif' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
                  <span className="text-xl shrink-0 mt-0.5">🎁</span>
                  <div>
                    <strong className="text-amber-900 font-bold block text-sm">
                      Bonus Sesi Inden Khusus SD/MI dari LP. Ma'arif Aktif!
                    </strong>
                    <div className="mt-1 space-y-0.5 text-amber-950">
                      <p className="m-0 font-bold text-emerald-800">
                        • <strong>🎁 BONUS 1 Set Seragam Olahraga Gratis:</strong> Bebas biaya 1 setel seragam olahraga senilai Rp {(config?.uniformItems?.find(u => u.id === 'u-1')?.price || 125000).toLocaleString('id-ID')} (Potongan 100%).
                      </p>
                      <p className="m-0 text-slate-700">
                        • <strong>Potongan Uang Gedung 100%:</strong> Menikmati potongan Uang Gedung 100% di Jalur Inden (hemat Rp {(config?.buildingFee || 2000000).toLocaleString('id-ID')}).
                      </p>
                      <p className="m-0 text-teal-800 font-semibold">
                        • <strong>🎉 Gratis SPP Bulan Pertama:</strong> Jika memiliki No. KK sama dengan sesama murid baru atau murid aktif kelas 7/8/9, SPP Juli senilai Rp 200.000 menjadi GRATIS (Rp 0).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice for SD Lainnya */}
              {selectedSchoolPreview === 'other' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-3">
                  <Building2 size={18} className="text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 font-bold block text-sm">
                      Ketentuan Pendaftar dari SD Lainnya (Umum / Non-Ma'arif)
                    </strong>
                    <div className="mt-1 space-y-0.5 text-slate-600">
                      <p className="m-0">
                        • <strong>Potongan Uang Gedung 100% di Sesi Inden:</strong> Bebas biaya Uang Gedung senilai Rp {(config?.buildingFee || 2000000).toLocaleString('id-ID')} (Net: Rp 0).
                      </p>
                      <p className="m-0">
                        • <strong>Paket Seragam & Atribut:</strong> Membayar paket seragam lengkap sesuai jenis kelamin ({selectedGenderPreview === 'male' ? 'Putra: Rp 360.000' : 'Putri: Rp 450.000'}).
                      </p>
                      <p className="m-0 text-teal-800 font-semibold">
                        • <strong>🎉 Gratis SPP Bulan Pertama:</strong> Jika No. KK sama dengan murid aktif kelas 7/8/9 atau sesama calon murid baru, SPP Juli (Rp 200.000) menjadi GRATIS (Rp 0).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3 Komponen Utama Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Building2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">1. Uang Gedung (Infaq)</span>
                  </div>
                  <p className="text-base font-black text-slate-900 m-0">
                    Rp {(config?.buildingFee || 2000000).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold m-0">
                    Potongan 100% di Sesi Inden (Net: Rp 0)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Coins size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">2. SPP Juli 2027</span>
                  </div>
                  <p className="text-base font-black text-slate-900 m-0">
                    {previewSiblingFreeSpp ? (
                      <span className="text-emerald-700">GRATIS (Rp 0)</span>
                    ) : (
                      `Rp ${(config?.julySppFee || 200000).toLocaleString('id-ID')}`
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0">
                    {previewSiblingFreeSpp ? '🎉 Bebas SPP (No. KK Sama)' : 'SPP bulan pertama tahun ajaran baru'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-700">
                    <Shirt size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">3. Seragam & Atribut</span>
                  </div>
                  <p className="text-base font-black text-slate-900 m-0">
                    {selectedSchoolPreview === 'maarif_jogosari' ? (
                      <span className="text-emerald-700">GRATIS (Diskon 100%)</span>
                    ) : selectedSchoolPreview === 'lp_maarif' ? (
                      <span>
                        Rp {(getUniformItemsForGender(selectedGenderPreview).reduce((sum, item) => sum + item.price, 0) - (config?.uniformItems?.find(u => u.id === 'u-1')?.price || 125000)).toLocaleString('id-ID')}
                        <span className="text-[10px] text-emerald-700 font-normal ml-1">(Net)</span>
                      </span>
                    ) : (
                      `Rp ${getUniformItemsForGender(selectedGenderPreview).reduce((sum, item) => sum + item.price, 0).toLocaleString('id-ID')}`
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 m-0">
                    {selectedSchoolPreview === 'maarif_jogosari' 
                      ? 'Bebas biaya seragam (Diskon SD Maarif Jogosari)' 
                      : selectedSchoolPreview === 'lp_maarif' 
                      ? '🎁 Bonus 1 Set Seragam Olahraga Gratis (Rp 125.000)' 
                      : `Paket Lengkap (${selectedGenderPreview === 'male' ? 'Putra' : 'Putri'})`}
                  </p>
                </div>
              </div>

              {/* Equipment Items Table */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rincian Item Seragam & Perlengkapan ({selectedGenderPreview === 'male' ? 'Putra' : 'Putri'}):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getUniformItemsForGender(selectedGenderPreview).map((item, idx) => {
                    const isSportsItem = item.id === 'u-1' || item.name.toLowerCase().includes('olahraga');
                    const isFreeBonus = isSportsItem && (selectedSchoolPreview === 'maarif_jogosari' || selectedSchoolPreview === 'lp_maarif');
                    const isJogosariFreeAll = selectedSchoolPreview === 'maarif_jogosari';
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs transition-all ${
                          isJogosariFreeAll || isFreeBonus 
                            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isJogosariFreeAll || isFreeBonus ? 'bg-amber-500 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isJogosariFreeAll || isFreeBonus ? '🎁' : idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 m-0">{item.name}</p>
                              {isJogosariFreeAll ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                                  Diskon SD Maarif
                                </span>
                              ) : isFreeBonus ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                                  Bonus Inden
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-slate-500 m-0">
                              {item.gender === 'both' ? 'Wajib Semua Siswa' : `Khusus ${item.gender === 'female' ? 'Putri' : 'Putra'}`}
                              {isFreeBonus && ' • Khusus SD/MI LP. Ma\'arif'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {isJogosariFreeAll || isFreeBonus ? (
                            <div>
                              <span className="text-xs font-black text-emerald-700 block">GRATIS</span>
                              <span className="text-[10px] text-slate-400 line-through">Rp {item.price.toLocaleString('id-ID')}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-black text-emerald-700">
                              Rp {item.price.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculation Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs text-slate-600 m-0">
                    Estimasi Total Biaya Sesi Inden ({selectedGenderPreview === 'male' ? 'Putra' : 'Putri'} - {selectedSchoolPreview === 'maarif_jogosari' ? 'SD Maarif Jogosari' : selectedSchoolPreview === 'lp_maarif' ? 'SD/MI LP. Ma\'arif' : 'SD Lainnya'}):
                  </p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight m-0">
                    Rp {calculateTotalReRegFee(selectedGenderPreview, 'inden', selectedSchoolPreview, '', previewSiblingFreeSpp).toLocaleString('id-ID')}
                    <span className="text-xs font-semibold text-emerald-700 ml-2">
                      {selectedSchoolPreview === 'maarif_jogosari' 
                        ? '(Potongan Uang Gedung 100% + Diskon Seragam SD Maarif)' 
                        : selectedSchoolPreview === 'lp_maarif'
                        ? '(Potongan Uang Gedung 100% + 🎁 Bonus 1 Set Seragam Olahraga Gratis)'
                        : '(Potongan Uang Gedung 100% Sesi Inden)'}
                      {previewSiblingFreeSpp ? ' + 🎉 Bebas SPP Juli (No KK Sama)' : ''}
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
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Daftar Calon Murid {selectedGenderPreview === 'male' ? 'Putra' : 'Putri'}
                </button>
              </div>
            </div>

            {/* Alur Pendaftaran 5 Langkah */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 text-center">Alur Pendaftaran Mudah & Transparan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { step: '1', title: 'Isi Data Singkat', desc: 'Isi identitas diri, NISN, no WhatsApp, dan asal sekolah.' },
                  { step: '2', title: 'Bayar Token Rp 50.000', desc: 'Selesaikan pembayaran token via Midtrans agar data tersimpan aman.' },
                  { step: '3', title: 'Data Lengkap Siswa', desc: 'Login dengan NISN lalu lengkapi biodata detail siswa & orang tua.' },
                  { step: '4', title: 'Upload Berkas', desc: 'Unggah Akte kelahiran, KK, KTP Ayah, KTP Ibu, dan Foto Murid (auto 1000px).' },
                  { step: '5', title: 'Daftar Ulang & Diterima', desc: 'Pilih ukuran seragam, selesaikan daftar ulang, dan cetak Tanda Terima Resmi.' }
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-2xs">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center mx-auto border border-emerald-200">
                      {s.step}
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 m-0">{s.title}</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed m-0">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Informasi Penting Batas Waktu & Bantuan Petugas Kantor SPMB */}
            <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300/90 text-slate-800 shadow-sm flex flex-col sm:flex-row items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-amber-700" />
              </div>
              <div className="space-y-2 flex-1 text-xs">
                <h4 className="text-sm font-black text-amber-950 m-0">Informasi Penting Batas Waktu Pembayaran & Pengisian Formulir</h4>
                <p className="text-slate-700 leading-relaxed m-0">
                  Setelah mengisi formulir pendaftaran awal, harap segera selesaikan pembayaran token. <strong>Jika tidak langsung dibayarkan sesuai jangka waktu yang ditentukan maka data akan dihapus dan Calon Murid wajib mengisi ulang formulir.</strong>
                </p>
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-amber-200/80 mt-1">
                  <p className="text-emerald-900 font-bold m-0 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                    <span>Jika Kesulitan silahkan datang langsung ke <strong>Kantor SPMB SMP Maarif NU Pandaan</strong> untuk dibantu Petugas.</span>
                  </p>
                  <a
                    href={getWhatsAppLink('Assalamu\'alaikum Panitia SPMB SMP Maarif NU Pandaan, saya ingin bertanya dan meminta bantuan proses pendaftaran calon murid baru.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-all cursor-pointer"
                  >
                    <MessageCircle size={14} />
                    <span>Bantuan Petugas SPMB</span>
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp Narahubung SPMB Callout Banner in Tab 1 */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <MessageCircle size={13} className="text-emerald-300" />
                  <span>Narahubung & Layanan Informasi Resmi SPMB</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black m-0 tracking-tight">
                  Punya Pertanyaan Seputar Pendaftaran & Sekolah?
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100/80 m-0 leading-relaxed">
                  Konsultasikan info jadwal gelombang, rincian biaya seragam, diskon pendaftar SD Ma'arif Jogosari, atau kendala pendaftaran langsung bersama Panitia SPMB via WhatsApp.
                </p>
                
                <div className="pt-2 flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  {[
                    { label: "Tanya Biaya Masuk", text: "Halo Panitia SPMB, saya ingin menanyakan rincian biaya masuk dan daftar ulang seragam." },
                    { label: "Diskon Inden 50%", text: "Halo Panitia SPMB, saya ingin menanyakan syarat dan ketentuan diskon Sesi Inden 50%." },
                    { label: "Alumni SD Maarif", text: "Halo Panitia SPMB, saya ingin menanyakan diskon khusus alumni SD Maarif Jogosari / LP Maarif." },
                    { label: "Bantuan Bayar Online", text: "Halo Panitia SPMB, saya membutuhkan panduan cara pembayaran token pendaftaran via Midtrans online." }
                  ].map((topic, tIdx) => (
                    <a
                      key={tIdx}
                      href={getWhatsAppLink(topic.text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer border border-white/10 flex items-center gap-1"
                    >
                      <MessageCircle size={11} />
                      <span>{topic.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2.5 text-center"
                >
                  <MessageCircle size={18} className="text-slate-950" />
                  <span>Chat WhatsApp Panitia Sekarang</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: FORM PENDAFTARAN AWAL (TOKEN RP 50.000) ================= */}
        {activeTab === 'register' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                <Sparkles size={14} />
                <span>Formulir Pendaftaran Awal Calon Murid</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">SPMB Tahun Ajaran 2027/2028</h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Isi data awal calon murid di bawah ini. Setelah itu, lakukan pembayaran token pendaftaran <strong className="text-emerald-700 font-bold">Rp 50.000</strong> via Midtrans online untuk aktivasi akun pendaftaran resmi.
              </p>
            </div>

            {/* Alert if overall SPMB is closed or all sessions are inactive */}
            {(!config?.isOpen || !config?.sessions?.some(s => s.isActive)) && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold m-0 text-amber-900">Pemberitahuan: Jalur Pendaftaran Belum Aktif</p>
                  <p className="m-0 text-slate-700 mt-0.5">
                    Pendaftaran SPMB saat ini belum dibuka atau seluruh jalur pendaftaran sedang tidak aktif. Silakan pantau pengumuman resmi atau hubungi panitia SPMB sekolah.
                  </p>
                </div>
              </div>
            )}

            {regError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
                <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold m-0">Gagal Memproses Formulir:</p>
                  <p className="m-0 text-slate-700 mt-0.5">{regError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRegisterTokenPay} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
              {/* 1. Pilihan Sesi Pendaftaran */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Pilihan Sesi / Gelombang Pendaftaran <span className="text-rose-500">*</span>
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
                              ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                              : 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                            : isInactive
                              ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-900 m-0">{session.name}</p>
                          {isInactive ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-black uppercase">
                              Belum Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
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
                      <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                        <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                        <span>
                          <strong>Peringatan:</strong> Jalur pendaftaran <strong>{currentSession.name}</strong> belum aktif. Silakan pilih jalur pendaftaran yang berstatus aktif.
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* 2. Asal Sekolah (SD MAARIF JOGOSARI vs SD/MI LP. MA'ARIF vs SD Lainnya) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  2. Asal Sekolah (SD / MI) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        ? 'bg-emerald-50 border-2 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-600" />
                        <span>1. SD MAARIF JOGOSARI</span>
                      </span>
                      {regForm.schoolOriginType === 'maarif_jogosari' && (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        ✨ Diskon Gedung & Seragam
                      </span>
                      {regForm.sessionId === 'inden' && (
                        <span className="inline-block ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                          🎁 Bonus Seragam
                        </span>
                      )}
                    </div>
                  </button>

                  {/* SD / MI LP. Maarif Lainnya */}
                  <button
                    type="button"
                    onClick={() => setRegForm(prev => ({
                      ...prev,
                      schoolOriginType: 'lp_maarif',
                      schoolOrigin: prev.manualSchoolName || ''
                    }))}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      regForm.schoolOriginType === 'lp_maarif'
                        ? 'bg-amber-50 border-2 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>🎁 2. SD/MI LP. MA'ARIF</span>
                      </span>
                      {regForm.schoolOriginType === 'lp_maarif' && (
                        <CheckCircle2 size={14} className="text-amber-600" />
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                        🎁 Bonus 1 Set Seragam Olahraga (Inden)
                      </span>
                    </div>
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
                        ? 'bg-indigo-50 border-2 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">3. SD Lainnya (Umum)</span>
                      {regForm.schoolOriginType === 'other' && (
                        <CheckCircle2 size={14} className="text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 m-0">Dari SD / MI negeri & swasta lainnya</p>
                  </button>
                </div>

                {/* Input Manual jika memilih SD/MI LP Maarif Lainnya atau SD Lainnya */}
                {(regForm.schoolOriginType === 'other' || regForm.schoolOriginType === 'lp_maarif') && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Lengkap SD / MI Asal (Otomatis Huruf Proper) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={regForm.schoolOriginType === 'lp_maarif' ? "Contoh: MI Maarif Pandaan / SD Maarif Sukorejo" : "Contoh: SDN Pandaan 1 / SD Kristen"}
                      value={regForm.manualSchoolName}
                      onChange={(e) => {
                        const properVal = toProperCase(e.target.value);
                        setRegForm({
                          ...regForm,
                          manualSchoolName: properVal,
                          schoolOrigin: properVal
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Alert jika berhak mendapatkan bonus seragam olahraga sesi inden */}
                {(() => {
                  const isLp = isSchoolLpMaarif(regForm.schoolOriginType, regForm.schoolOrigin || regForm.manualSchoolName);
                  if (regForm.sessionId === 'inden' && isLp) {
                    return (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-2xs animate-in fade-in mt-2">
                        <span className="text-xl shrink-0 mt-0.5">🎁</span>
                        <div>
                          <p className="text-xs font-black text-amber-900 m-0">
                            Klaim Bonus Sesi Inden Terdeteksi! (1 Set Seragam Olahraga Gratis)
                          </p>
                          <p className="text-[11px] text-amber-800 m-0 mt-0.5 leading-relaxed">
                            Selamat! Calon murid asal SD/MI dari LP. Ma'arif di Sesi Inden otomatis mendapatkan <strong>1 Set Seragam Olahraga Lengkap secara GRATIS (Senilai Rp 175.000)</strong> saat menyelesaikan daftar ulang seragam sekolah.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Nama Lengkap */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Nama Lengkap Calon Murid <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 font-medium">Otomatis Huruf Besar (KAPITAL)</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="CONTOH: MUHAMMAD RIZKY PRATAMA"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase placeholder:normal-case placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold tracking-wide"
                />
              </div>

              {/* NISN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  NISN Calon Murid (10 Digit) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0123456789"
                  value={regForm.nisn}
                  onChange={(e) => setRegForm({ ...regForm, nisn: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1">NISN akan digunakan sebagai nomor ID login portal status dan pencarian data calon murid.</p>
              </div>

              {/* Jenis Kelamin & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, gender: 'L' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        regForm.gender === 'L'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Laki-laki (Putra)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, gender: 'P' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        regForm.gender === 'P'
                          ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Perempuan (Putri)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor WhatsApp Aktif (Murid / Ortu) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081234567890"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tempat & Tanggal Lahir (Kolom Tersendiri |tgl| |bln| |Tahun| + Fleksibel Manual) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <BirthDateSplitInput
                  idPrefix="reg-student"
                  birthPlace={regForm.birthPlace}
                  onBirthPlaceChange={(val) => setRegForm({ ...regForm, birthPlace: toProperCase(val) })}
                  birthDate={regForm.birthDate}
                  onBirthDateChange={(val) => setRegForm({ ...regForm, birthDate: val })}
                  placeLabel="Tempat Lahir Calon Murid (Besar Kecil / Proper)"
                  dateLabel="Tanggal Lahir Calon Murid"
                  combinedLabel="Tempat, Tgl Lahir Siswa"
                  required
                  showPlaceInput
                  theme="light"
                  placeholderPlace="Contoh: Pasuruan"
                  properCasePlace={true}
                  helperText="Pilih tanggal, bulan, dan ketik 4 digit tahun lahir secara manual/bebas tanpa pembatasan (contoh: 2014)"
                />
              </div>

              {/* Token Fee Summary Box */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-900 m-0">Biaya Token Pendaftaran Online:</p>
                  <p className="text-[11px] text-slate-600 m-0">Pembayaran aman via QRIS, Transfer Bank, atau E-Wallet (Midtrans)</p>
                </div>
                <span className="text-xl font-black text-emerald-700">
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
                        className="w-full py-3.5 bg-slate-100 border-2 border-rose-300 text-rose-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed opacity-90 shadow-2xs"
                      >
                        <Lock size={16} className="text-rose-500" />
                        <span>Jalur Pendaftaran Belum Aktif (Pendaftaran Ditutup)</span>
                      </button>
                      <p className="text-[11px] text-rose-600 text-center m-0">
                        Jalur pendaftaran yang dipilih sedang belum dibuka. Silakan pilih gelombang lain yang aktif atau hubungi panitia.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Peringatan Batas Waktu Pembayaran & Bantuan Petugas */}
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs space-y-2 text-slate-800 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                        <span>Perhatian Penting Batas Waktu Pembayaran:</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed m-0">
                        Harap segera selesaikan pembayaran token pendaftaran via Midtrans online setelah formulir dikirim. <strong>Jika tidak langsung dibayarkan sesuai jangka waktu yang ditentukan maka data akan dihapus dan Calon Murid wajib mengisi ulang formulir.</strong>
                      </p>
                      <div className="p-2.5 bg-white/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[11px] text-emerald-900 font-bold m-0">
                          🏢 <strong>Jika Kesulitan</strong> silahkan datang langsung ke <strong>Kantor SPMB SMP Maarif NU Pandaan</strong> untuk dibantu Petugas.
                        </p>
                        <a
                          href={getWhatsAppLink('Assalamu\'alaikum Panitia SPMB SMP Maarif NU Pandaan, saya butuh panduan pengisian formulir pendaftaran awal.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
                        >
                          <MessageCircle size={13} />
                          <span>Hubungi WA Panitia</span>
                        </a>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessingTokenPay}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                  </div>
                );
              })()}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('portal')}
                  className="text-xs text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
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
            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900">Portal Status & Akun Sementara Murid Baru</h3>
                <p className="text-xs text-slate-500">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckStatus()}
                  disabled={isSearchingCandidate}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {isSearchingCandidate ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Cek Status</span>
                </button>
              </div>

              {expiredNotice && (
                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs space-y-3 shadow-sm animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <AlertTriangle size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-rose-900 text-sm m-0">Batas Waktu Pembayaran Telah Kedaluwarsa (Expired)</p>
                      <p className="m-0 text-slate-700 leading-relaxed">
                        {expiredNotice.message}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-white/90 border border-rose-200 rounded-xl text-slate-700 space-y-1.5 text-[11px]">
                    <p className="font-bold text-rose-800 m-0">Ketentuan Sistem Pendaftaran:</p>
                    <p className="m-0 leading-relaxed">
                      Karena pembayaran tidak diselesaikan sebelum batas waktu berakhir di Midtrans, seluruh data pendaftaran awal telah dihapus otomatis oleh sistem. <strong>Jika tidak langsung dibayarkan sesuai jangka waktu yang ditentukan maka data akan dihapus dan Calon Murid wajib mengisi ulang formulir.</strong>
                    </p>
                    <p className="font-bold text-emerald-900 m-0 pt-1">
                      🏢 <strong>Jika Kesulitan</strong> silahkan datang langsung ke <strong>Kantor SPMB SMP Maarif NU Pandaan</strong> untuk dibantu Petugas.
                    </p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setExpiredNotice(null);
                        setPortalError(null);
                        setSearchNisn('');
                        setRegForm({
                          nisn: expiredNotice.nisn || '',
                          fullName: '',
                          nik: '',
                          gender: 'L',
                          birthPlace: 'Pasuruan',
                          birthDate: '2014-05-12',
                          phone: '',
                          schoolOriginType: 'maarif_jogosari',
                          manualSchoolName: '',
                          schoolOrigin: 'SD MAARIF JOGOSARI',
                          sessionId: config?.sessions?.find(s => s.isActive)?.id || 'gelombang-1'
                        });
                        setActiveTab('register');
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <FileText size={15} />
                      <span>Isi Ulang Formulir Data Awal Sekarang</span>
                    </button>
                  </div>
                </div>
              )}

              {portalError && !expiredNotice && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-rose-800 m-0">Status Pendaftaran Tidak Ditemukan / Belum Selesai</p>
                      <p className="m-0 text-slate-700 leading-relaxed">{portalError}</p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setRegError(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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
              const isTargetReset = activeCandidate.nisn === '0158483548' || activeCandidate.nisn === '0152892235' || activeCandidate.id === '0158483548' || activeCandidate.id === '0152892235';
              const isStep1Done = Boolean(activeCandidate.tokenPaymentStatus === 'paid' || activeCandidate.tokenPaid);
              const hasRealFormData = Boolean(
                activeCandidate.isFormCompleted &&
                (activeCandidate.kkNumber && String(activeCandidate.kkNumber).trim().length >= 8) &&
                (activeCandidate.fatherName || activeCandidate.motherName || activeCandidate.guardianName || activeCandidate.fullFormData?.fatherName || activeCandidate.fullFormData?.motherName)
              );
              const isStep2Done = !isTargetReset && Boolean(isStep1Done && (activeCandidate.nisn === '0156620618' ? Boolean(activeCandidate.isFormCompleted) : hasRealFormData));

              const hasUploadedMandatoryDocs = Boolean(
                (activeCandidate.documents?.aktaPhoto || docUploads.aktaPhoto) &&
                (activeCandidate.documents?.kkPhoto || docUploads.kkPhoto) &&
                (activeCandidate.documents?.pasPhoto || docUploads.pasPhoto) &&
                (activeCandidate.documents?.ktpAyahPhoto || docUploads.ktpAyahPhoto || activeCandidate.documents?.ktpPhoto || docUploads.ktpPhoto) &&
                (activeCandidate.documents?.ktpIbuPhoto || docUploads.ktpIbuPhoto)
              );
              const hasActualDocs = Boolean(
                activeCandidate.documents && 
                (activeCandidate.documents.aktaPhoto || activeCandidate.documents.kkPhoto || activeCandidate.documents.pasPhoto) &&
                Object.keys(activeCandidate.documents).some(k => Boolean(activeCandidate.documents[k]))
              );
              const isStep3Done = !isTargetReset && Boolean(isStep2Done && (activeCandidate.nisn === '0156620618' ? Boolean(activeCandidate.documentsUploaded) : (Boolean(activeCandidate.documentsUploaded && hasActualDocs) || hasUploadedMandatoryDocs)));
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
                  desc: isStep1Done ? 'LUNAS (Rp 50rb)' : 'PENDING (Rp 50rb)',
                  icon: CreditCard,
                  done: isStep1Done,
                  unlocked: isStep1Unlocked,
                  lockReason: ''
                },
                {
                  id: 'form' as const,
                  num: 2,
                  label: '2. Data Lengkap Murid',
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
                  lockReason: 'Tahap 3 terkunci: Lengkapi dan simpan Formulir Data Lengkap Murid (Tahap 2) terlebih dahulu.'
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
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-black text-xl shrink-0">
                      {activeCandidate.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 m-0">{activeCandidate.fullName}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {activeCandidate.gender === 'L' ? 'Putra' : 'Putri'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        NISN: <span className="font-mono text-slate-900 font-bold">{activeCandidate.nisn}</span> • Asal: <span className="text-slate-900 font-semibold">{activeCandidate.schoolOrigin}</span> • Sesi: <span className="text-emerald-700 font-bold uppercase">{activeCandidate.sessionId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeCandidate.status === 'accepted' ? (
                      <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5">
                        <CheckCircle2 size={16} />
                        <span>DITERIMA / LOLOS SELEKSI</span>
                      </span>
                    ) : !isStep1Done ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-xs flex items-center gap-1.5 animate-pulse shadow-xs">
                        <Clock size={14} className="text-amber-600" />
                        <span>Status: Menunggu Pembayaran Token (Pending)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-xs">
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
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                      title={isStep5Unlocked ? 'Cetak Bukti Pendaftaran' : 'Selesaikan seluruh tahap pendaftaran untuk membuka bukti resmi'}
                    >
                      {isStep5Unlocked ? <Printer size={14} /> : <Lock size={14} className="text-amber-500" />}
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
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30 cursor-pointer'
                            : tab.done
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                            : tab.unlocked
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs'
                            : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <tab.icon size={15} className={isCurrent ? 'text-white' : tab.done ? 'text-emerald-700' : tab.unlocked ? 'text-slate-600' : 'text-slate-400'} />
                          {tab.done ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-0.5 text-[9px] font-black">
                              ✓ Selesai
                            </span>
                          ) : !tab.unlocked ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 border border-slate-300 flex items-center gap-0.5 text-[9px] font-bold">
                              <Lock size={9} className="text-amber-600" />
                              Terkunci
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-xs font-bold mt-2 m-0 truncate">{tab.label}</p>
                        <p className={`text-[10px] m-0 mt-0.5 truncate ${isCurrent ? 'text-emerald-100' : 'text-slate-500'}`}>{tab.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* TAB CONTENT 1: STATUS TOKEN */}
                {portalTab === 'status' && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                      {isStep1Done ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-600" />
                          <span>Pembayaran Token Pendaftaran Awal (Rp 50.000)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={18} className="text-amber-500" />
                          <span>Status Pembayaran Token Pendaftaran</span>
                        </>
                      )}
                    </h4>

                    {isStep1Done ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Status Pembayaran Token:</span>
                          <span className="font-bold text-emerald-700 uppercase">LUNAS (PAID)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Nominal Pembayaran:</span>
                          <span className="font-bold text-slate-900">Rp {(activeCandidate.tokenAmount || 50000).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-500">Waktu Pembayaran:</span>
                          <span className="font-bold text-slate-700">
                            {activeCandidate.tokenPaidAt ? new Date(activeCandidate.tokenPaidAt).toLocaleString('id-ID') : 'Terkonfirmasi'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">No Order Transaksi:</span>
                          <span className="font-mono text-slate-700">{activeCandidate.tokenPaymentOrderId || '-'}</span>
                        </div>

                        {/* Button Cetak Kuitansi Token Resmi */}
                        <div className="pt-2 border-t border-slate-200 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptModalCandidate(activeCandidate);
                              setReceiptModalType('token');
                              setIsReceiptModalOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                          >
                            <Printer size={14} />
                            <span>Cetak Kuitansi Token Lunas (KOP Resmi)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 rounded-3xl bg-amber-50/90 border-2 border-amber-300 text-xs space-y-4 shadow-sm animate-in fade-in">
                        {/* Status Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
                              <Clock size={20} className="animate-spin text-amber-700" style={{ animationDuration: '6s' }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                  STATUS FORMULIR AWAL: PENDING
                                </span>
                              </div>
                              <p className="text-xs font-bold text-amber-900 mt-1 m-0">
                                Menunggu Penyelesaian Pembayaran Token Pendaftaran Midtrans
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right bg-white/80 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-amber-200">
                            <span className="text-[11px] text-slate-500 block">Total Tagihan Token:</span>
                            <span className="text-base font-black text-slate-900">Rp {(activeCandidate.tokenAmount || 50000).toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        {/* Midtrans Expiry & Jeda Waktu Countdown Box */}
                        <div className="p-4 bg-white/90 border border-amber-300/80 rounded-2xl space-y-2.5">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jeda Waktu / Batas Akhir Pembayaran:</span>
                              <p className="text-xs font-extrabold text-slate-900 m-0">
                                {activeCandidate.tokenExpiryTime
                                  ? `${activeCandidate.tokenExpiryTime.replace(' ', ' • Jam ')} WIB`
                                  : '24 Jam sejak pendaftaran awal dimulai'}
                              </p>
                            </div>

                            {/* Live Countdown Timer */}
                            {tokenTimeRemaining && (
                              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                                tokenTimeRemaining.isExpired
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 font-black'
                                  : 'bg-amber-100/80 text-amber-900 border-amber-300 font-mono font-bold'
                              }`}>
                                <Clock size={14} className={tokenTimeRemaining.isExpired ? 'text-rose-600' : 'text-amber-700 animate-pulse'} />
                                <span>
                                  {tokenTimeRemaining.isExpired
                                    ? 'WAKTU HABIS (EXPIRED)'
                                    : `Sisa Waktu: ${tokenTimeRemaining.formattedString}`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Warning Message per User Request */}
                          <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-2">
                            <p className="font-extrabold flex items-center gap-1.5 text-rose-950 m-0 text-xs">
                              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                              <span>Ketentuan Penting Batas Waktu Pembayaran:</span>
                            </p>
                            <p className="m-0 leading-relaxed text-slate-700">
                              Harap segera selesaikan pembayaran token pendaftaran sebelum batas waktu berakhir.
                              <strong> Jika tidak langsung dibayarkan sesuai jangka waktu yang ditentukan maka data akan dihapus dan Calon Murid wajib mengisi ulang formulir.</strong>
                            </p>
                            <div className="p-2.5 bg-white border border-rose-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="font-bold text-emerald-900">
                                🏢 Jika Kesulitan silahkan datang langsung ke <strong>Kantor SPMB SMP Maarif NU Pandaan</strong> untuk dibantu Petugas.
                              </span>
                              <a
                                href={getWhatsAppLink('Assalamu\'alaikum Panitia SPMB, saya mengalami kendala pembayaran token pendaftaran di portal.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:text-emerald-800 font-black flex items-center gap-1 shrink-0"
                              >
                                <MessageCircle size={13} />
                                <span>WA Petugas</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Midtrans Virtual Account & Payment Info if Available */}
                        {activeCandidate.tokenVaNumbers && activeCandidate.tokenVaNumbers.length > 0 && (
                          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                <CreditCard size={14} className="text-indigo-600" />
                                <span>Nomor Virtual Account (VA) Midtrans</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-300">
                                {activeCandidate.tokenVaNumbers[0]?.bank?.toUpperCase() || 'VA'}
                              </span>
                            </div>

                            <div className="p-3 bg-white border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-bold">Bank {activeCandidate.tokenVaNumbers[0]?.bank?.toUpperCase()}:</span>
                                <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                                  {activeCandidate.tokenVaNumbers[0]?.va_number}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeCandidate.tokenVaNumbers?.[0]?.va_number) {
                                    navigator.clipboard.writeText(activeCandidate.tokenVaNumbers[0].va_number);
                                    setCopiedVa(true);
                                    setTimeout(() => setCopiedVa(false), 2000);
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                {copiedVa ? <Check size={13} /> : <Copy size={13} />}
                                <span>{copiedVa ? 'Tersalin!' : 'Salin No. VA'}</span>
                              </button>
                            </div>
                            <p className="text-[11px] text-indigo-900 m-0 leading-relaxed">
                              Transfer tepat <strong>Rp {(activeCandidate.tokenAmount || 50000).toLocaleString('id-ID')}</strong> melalui ATM, Mobile Banking, atau Internet Banking menggunakan nomor Virtual Account di atas.
                            </p>
                          </div>
                        )}

                        {/* Action Buttons: Lanjutkan Pembayaran, Cek Status, Batalkan Draft */}
                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Tombol Lanjutkan Pembayaran (Midtrans Snap) */}
                            <button
                              type="button"
                              onClick={() => {
                                if (activeCandidate) {
                                  if (activeCandidate.tokenSnapToken) {
                                    setSnapToken(activeCandidate.tokenSnapToken);
                                    setSnapOrderId(activeCandidate.tokenPaymentOrderId || null);
                                    setSnapAmount(activeCandidate.tokenAmount || 50000);
                                    setSnapRedirectUrl(activeCandidate.tokenRedirectUrl || null);
                                    setSnapTitle(`Token Pendaftaran SPMB - ${activeCandidate.fullName}`);
                                    setSnapPayType('token');
                                    setIsPayModalOpen(true);
                                    setTimeout(() => {
                                      triggerSnapPayment(activeCandidate.tokenSnapToken, activeCandidate.tokenPaymentOrderId, 'token');
                                    }, 200);
                                  } else {
                                    handleRestartSnapForCandidate(activeCandidate);
                                  }
                                }
                              }}
                              disabled={isProcessingTokenPay}
                              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <CreditCard size={15} />
                              <span>{isProcessingTokenPay ? 'Menghubungkan Midtrans...' : 'Lanjutkan Pembayaran (Midtrans)'}</span>
                            </button>

                            {/* Tombol Cek Status Pembayaran Realtime */}
                            <button
                              type="button"
                              onClick={() => {
                                if (activeCandidate?.nisn) {
                                  handleCheckStatus(activeCandidate.nisn);
                                }
                              }}
                              disabled={isSearchingCandidate}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
                              title="Sinkronkan status transaksi terkini dari Midtrans"
                            >
                              <RefreshCw size={14} className={isSearchingCandidate ? 'animate-spin text-emerald-600' : ''} />
                              <span>{isSearchingCandidate ? 'Mengecek...' : 'Cek Status Midtrans'}</span>
                            </button>
                          </div>

                          {/* Tombol Batalkan / Hapus Draft Formulir Awal */}
                          <button
                            type="button"
                            onClick={() => {
                              const confirmCancel = window.confirm(
                                `Batalkan pendaftaran awal calon murid ${activeCandidate.fullName}?\n\nPerhatian: Seluruh data formulir awal yang belum lunas ini akan dihapus dari sistem dan Anda dapat melakukan pengisian formulir data awal kembali kapan saja.`
                              );
                              if (confirmCancel) {
                                handleCancelTokenPayment(activeCandidate.tokenPaymentOrderId || undefined);
                              }
                            }}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            title="Batalkan pendaftaran dan hapus formulir awal ini"
                          >
                            <Trash2 size={13} className="text-rose-600" />
                            <span>Batalkan & Hapus Draft</span>
                          </button>
                        </div>
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
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {isStep2Unlocked ? (
                          <>
                            <span>Lanjut ke Tahap 2: Isi Data Lengkap Murid</span>
                            <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            <Lock size={14} className="text-amber-500" />
                            <span>Tahap 2 Terkunci (Perlu Bayar Token)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT 2: FORM DATA LENGKAP MURID */}
                {portalTab === 'form' && (
                  !isStep2Unlocked ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-slate-900">Tahap 2: Data Lengkap Murid Terkunci</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Anda harus menyelesaikan pembayaran Token Pendaftaran (Tahap 1) terlebih dahulu sebelum dapat mengisi dan menyimpan formulir data lengkap murid.
                      </p>
                      <button
                        onClick={() => setPortalTab('status')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ArrowLeft size={14} />
                        <span>Kembali ke Tahap 1: Status Token</span>
                      </button>
                    </div>
                  ) : (
                  <form onSubmit={handleSaveFullForm} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900">Data Lengkap Murid</h4>
                        <p className="text-xs text-slate-500">Pastikan seluruh data pribadi, alamat terperinci, dan orang tua diisi sesuai dokumen resmi KK & Akta.</p>
                      </div>
                      {activeCandidate.isFormCompleted && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                          <Check size={13} />
                          <span>Sudah Tersimpan</span>
                        </span>
                      )}
                    </div>

                    {fullFormSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{fullFormSuccessMsg}</span>
                      </div>
                    )}

                    {/* Section 1: Data Pribadi */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-emerald-700 uppercase tracking-wider">A. Data Pribadi Murid</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Lengkap Murid (Otomatis Huruf Kapital) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={fullForm.fullName || activeCandidate.fullName || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fullName: e.target.value.toUpperCase() })}
                            placeholder="NAMA LENGKAP MURID"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase font-bold tracking-wide focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Panggilan (Otomatis Huruf Kapital)
                          </label>
                          <input
                            type="text"
                            value={fullForm.nickname || ''}
                            onChange={(e) => setFullForm({ ...fullForm, nickname: e.target.value.toUpperCase() })}
                            placeholder="NAMA PANGGILAN MURID"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase font-bold tracking-wide placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Tempat & Tanggal Lahir (Kolom Tersendiri |tgl| |bln| |Tahun| + Otomatis Gabung) */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <BirthDateSplitInput
                          idPrefix="student"
                          birthPlace={fullForm.birthPlace || activeCandidate.birthPlace || ''}
                          onBirthPlaceChange={(val) => setFullForm({ ...fullForm, birthPlace: toProperCase(val) })}
                          birthDate={fullForm.birthDate || activeCandidate.birthDate || ''}
                          onBirthDateChange={(val) => setFullForm({ ...fullForm, birthDate: val })}
                          placeLabel="Tempat Lahir Murid (Besar Kecil / Proper)"
                          dateLabel="Tanggal Lahir Murid"
                          combinedLabel="Tempat, Tgl Lahir Murid"
                          required
                          showPlaceInput
                          theme="light"
                          minYear={2000}
                          maxYear={new Date().getFullYear()}
                          placeholderPlace="Contoh: Pasuruan"
                          properCasePlace={true}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            No. Kartu Keluarga (KK)
                            <span className="ml-1 text-[10px] font-normal text-emerald-700">
                              (Promo Inden: Bebas SPP Bulan Pertama jika No. KK sama dengan saudara kandung siswa aktif/murid baru)
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={fullForm.kkNumber || ''}
                              onChange={(e) => {
                                const cleanVal = e.target.value.replace(/\D/g, '');
                                setFullForm({ ...fullForm, kkNumber: cleanVal });
                                if (cleanVal.length >= 10) {
                                  checkKkMatchRealtime(cleanVal);
                                } else {
                                  setSiblingMatchResult(null);
                                }
                              }}
                              placeholder="16 Digit No KK Sesuai Kartu Keluarga Resmi"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                            {isCheckingKk && (
                              <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <RefreshCw size={10} className="animate-spin text-emerald-600" />
                                Cek KK...
                              </span>
                            )}
                          </div>

                          {/* Notifikasi Hasil Pengecekan No KK Sibling */}
                          {siblingMatchResult?.isMatch && (
                            <div className="mt-2 p-2.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 text-xs font-bold flex items-start gap-2 shadow-2xs">
                              <span className="text-base leading-none">🎉</span>
                              <div>
                                <span className="font-extrabold text-teal-900 block text-xs">SELAMAT! PROMO SESI INDEN AKTIF: GRATIS SPP BULAN PERTAMA</span>
                                <span className="text-[11px] text-teal-800 font-normal">
                                  {siblingMatchResult.message}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">No. Akta Kelahiran</label>
                          <input
                            type="text"
                            value={fullForm.birthCertNumber || ''}
                            onChange={(e) => setFullForm({ ...fullForm, birthCertNumber: e.target.value })}
                            placeholder="Sesuai Akta Kelahiran"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">No. HP / WA Murid</label>
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Kosongkan jika tidak ada)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={fullForm.studentPhone || ''}
                            onChange={(e) => setFullForm({ ...fullForm, studentPhone: e.target.value })}
                            placeholder="08xxxxxxxxxx (Kosongkan jika belum punya HP)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Agama</label>
                          <select
                            value={fullForm.religion || 'Islam'}
                            onChange={(e) => setFullForm({ ...fullForm, religion: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Anak Ke-</label>
                          <input
                            type="number"
                            value={fullForm.childOrder || ''}
                            onChange={(e) => setFullForm({ ...fullForm, childOrder: e.target.value })}
                            placeholder="1"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Jumlah Saudara Kandung</label>
                          <input
                            type="number"
                            value={fullForm.siblingsCount || ''}
                            onChange={(e) => setFullForm({ ...fullForm, siblingsCount: e.target.value })}
                            placeholder="2"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* RINCIAN PENGISIAN ALAMAT (DUSUN, RT, RW, DESA, KECAMATAN) */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800">Rincian Komponen Alamat Murid:</span>
                          <span className="text-[10px] text-slate-500">RT & RW otomatis 3 digit angka (contoh: RT. 001, RW. 007)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Dusun / Jalan / Gang (Otomatis Proper)</label>
                            <input
                              type="text"
                              value={fullForm.dusun || ''}
                              onChange={(e) => setFullForm({ ...fullForm, dusun: toProperCase(e.target.value) })}
                              placeholder="Contoh: Jabon"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">RT (3 Digit Angka)</label>
                            <input
                              type="text"
                              maxLength={3}
                              value={fullForm.rt || ''}
                              onChange={(e) => setFullForm({ ...fullForm, rt: e.target.value.replace(/\D/g, '') })}
                              placeholder="001"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono text-center placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">RW (3 Digit Angka)</label>
                            <input
                              type="text"
                              maxLength={3}
                              value={fullForm.rw || ''}
                              onChange={(e) => setFullForm({ ...fullForm, rw: e.target.value.replace(/\D/g, '') })}
                              placeholder="007"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono text-center placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Desa / Kelurahan (Otomatis Proper)</label>
                            <input
                              type="text"
                              value={fullForm.village || ''}
                              onChange={(e) => setFullForm({ ...fullForm, village: toProperCase(e.target.value) })}
                              placeholder="Contoh: Jogosari"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Kecamatan (Otomatis Proper)</label>
                            <input
                              type="text"
                              value={fullForm.district || ''}
                              onChange={(e) => setFullForm({ ...fullForm, district: toProperCase(e.target.value) })}
                              placeholder="Contoh: Pandaan"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Read-Only Gabung Alamat */}
                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-[11px] font-bold text-emerald-800 mb-1 flex items-center justify-between">
                            <span>Alamat Lengkap (Otomatis Menggabungkan Komponen Alamat) [Read-Only]:</span>
                            <span className="text-[10px] text-slate-500 font-normal">Sesuai Format Resmi</span>
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={formatCombinedAddress(fullForm.dusun, fullForm.rt, fullForm.rw, fullForm.village, fullForm.district) || fullForm.address || ''}
                            placeholder="Contoh: Jabon RT. 001, RW. 007, Jogosari, Pandaan"
                            className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium cursor-not-allowed select-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Kabupaten / Kota (Otomatis Proper)</label>
                          <input
                            type="text"
                            value={fullForm.city || 'Pasuruan'}
                            onChange={(e) => setFullForm({ ...fullForm, city: toProperCase(e.target.value) })}
                            placeholder="Pasuruan"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Kode Pos</label>
                          <input
                            type="text"
                            value={fullForm.postalCode || ''}
                            onChange={(e) => setFullForm({ ...fullForm, postalCode: e.target.value })}
                            placeholder="67156"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Data Ayah Kandung */}
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <h5 className="text-xs font-black text-emerald-700 uppercase tracking-wider">B. Data Ayah Kandung</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Ayah (Otomatis Huruf Kapital)
                          </label>
                          <input
                            type="text"
                            value={fullForm.fatherName || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherName: e.target.value.toUpperCase() })}
                            placeholder="NAMA LENGKAP AYAH"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase font-bold tracking-wide placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">NIK Ayah</label>
                          <input
                            type="text"
                            value={fullForm.fatherNik || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherNik: e.target.value.replace(/\D/g, '') })}
                            placeholder="16 Digit NIK"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Tempat & Tanggal Lahir Ayah (|tgl| |bln| |Tahun| + Otomatis Gabung) */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <BirthDateSplitInput
                          idPrefix="father"
                          birthPlace={fullForm.fatherBirthPlace || ''}
                          onBirthPlaceChange={(val) => setFullForm({ ...fullForm, fatherBirthPlace: toProperCase(val) })}
                          birthDate={fullForm.fatherBirthDate || ''}
                          onBirthDateChange={(val) => setFullForm({ ...fullForm, fatherBirthDate: val })}
                          placeLabel="Tempat Lahir Ayah (Besar Kecil / Proper)"
                          dateLabel="Tanggal Lahir Ayah"
                          combinedLabel="Tempat, Tgl Lahir Ayah"
                          showPlaceInput
                          theme="light"
                          minYear={1940}
                          maxYear={2015}
                          placeholderPlace="Contoh: Pasuruan"
                          properCasePlace={true}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Pendidikan Terakhir Ayah</label>
                          <select
                            value={getNormalizedEduValue(fullForm.fatherEducation)}
                            onChange={(e) => setFullForm({ ...fullForm, fatherEducation: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih Pendidikan Terakhir --</option>
                            {SPMB_EDUCATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt === 'tidak bersekolah' ? 'Tidak Bersekolah' : opt}
                              </option>
                            ))}
                            {fullForm.fatherEducation &&
                              !SPMB_EDUCATION_OPTIONS.some(o => o.toLowerCase() === fullForm.fatherEducation?.toLowerCase()) && (
                              <option value={fullForm.fatherEducation}>{fullForm.fatherEducation}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Pekerjaan Ayah (Otomatis Proper)</label>
                          <input
                            type="text"
                            value={fullForm.fatherOccupation || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherOccupation: toProperCase(e.target.value) })}
                            placeholder="Wiraswasta / Karyawan / PNS"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Keberadaan Ayah</label>
                          <select
                            value={fullForm.fatherStatus || 'Hidup'}
                            onChange={(e) => setFullForm({ ...fullForm, fatherStatus: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="Hidup">Masih Hidup</option>
                            <option value="Meninggal">Sudah Meninggal</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Penghasilan Bulanan Ayah</label>
                          <select
                            value={fullForm.fatherIncome || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherIncome: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih Range Penghasilan --</option>
                            <option value="Kurang dari Rp 1.000.000">Kurang dari Rp 1.000.000</option>
                            <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                            <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                            <option value="Lebih dari Rp 5.000.000">Lebih dari Rp 5.000.000</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp / HP Ayah</label>
                          <input
                            type="text"
                            value={fullForm.fatherPhone || ''}
                            onChange={(e) => setFullForm({ ...fullForm, fatherPhone: e.target.value })}
                            placeholder="081234..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Data Ibu Kandung */}
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <h5 className="text-xs font-black text-emerald-700 uppercase tracking-wider">C. Data Ibu Kandung</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Ibu (Otomatis Huruf Kapital)
                          </label>
                          <input
                            type="text"
                            value={fullForm.motherName || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherName: e.target.value.toUpperCase() })}
                            placeholder="NAMA LENGKAP IBU"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase font-bold tracking-wide placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">NIK Ibu</label>
                          <input
                            type="text"
                            value={fullForm.motherNik || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherNik: e.target.value.replace(/\D/g, '') })}
                            placeholder="16 Digit NIK"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Tempat & Tanggal Lahir Ibu (|tgl| |bln| |Tahun| + Otomatis Gabung) */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <BirthDateSplitInput
                          idPrefix="mother"
                          birthPlace={fullForm.motherBirthPlace || ''}
                          onBirthPlaceChange={(val) => setFullForm({ ...fullForm, motherBirthPlace: toProperCase(val) })}
                          birthDate={fullForm.motherBirthDate || ''}
                          onBirthDateChange={(val) => setFullForm({ ...fullForm, motherBirthDate: val })}
                          placeLabel="Tempat Lahir Ibu (Besar Kecil / Proper)"
                          dateLabel="Tanggal Lahir Ibu"
                          combinedLabel="Tempat, Tgl Lahir Ibu"
                          showPlaceInput
                          theme="light"
                          minYear={1940}
                          maxYear={2015}
                          placeholderPlace="Contoh: Pasuruan"
                          properCasePlace={true}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Pendidikan Terakhir Ibu</label>
                          <select
                            value={getNormalizedEduValue(fullForm.motherEducation)}
                            onChange={(e) => setFullForm({ ...fullForm, motherEducation: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih Pendidikan Terakhir --</option>
                            {SPMB_EDUCATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt === 'tidak bersekolah' ? 'Tidak Bersekolah' : opt}
                              </option>
                            ))}
                            {fullForm.motherEducation &&
                              !SPMB_EDUCATION_OPTIONS.some(o => o.toLowerCase() === fullForm.motherEducation?.toLowerCase()) && (
                              <option value={fullForm.motherEducation}>{fullForm.motherEducation}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Pekerjaan Ibu (Otomatis Proper)</label>
                          <input
                            type="text"
                            value={fullForm.motherOccupation || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherOccupation: toProperCase(e.target.value) })}
                            placeholder="Ibu Rumah Tangga / Guru / Karyawan"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Keberadaan Ibu</label>
                          <select
                            value={fullForm.motherStatus || 'Hidup'}
                            onChange={(e) => setFullForm({ ...fullForm, motherStatus: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="Hidup">Masih Hidup</option>
                            <option value="Meninggal">Sudah Meninggal</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Penghasilan Bulanan Ibu</label>
                          <select
                            value={fullForm.motherIncome || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherIncome: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih Range Penghasilan --</option>
                            <option value="Tidak Berpenghasilan">Tidak Berpenghasilan / IRT</option>
                            <option value="Kurang dari Rp 1.000.000">Kurang dari Rp 1.000.000</option>
                            <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                            <option value="Lebih dari Rp 2.500.000">Lebih dari Rp 2.500.000</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp / HP Ibu</label>
                          <input
                            type="text"
                            value={fullForm.motherPhone || ''}
                            onChange={(e) => setFullForm({ ...fullForm, motherPhone: e.target.value })}
                            placeholder="081234..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Data Wali Murid (Opsi Ceklist Ada / Tidak) */}
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-black text-emerald-700 uppercase tracking-wider">D. Data Wali Murid (Opsional)</h5>
                          <p className="text-[11px] text-slate-500">Centang opsi di bawah jika calon murid memiliki wali selain orang tua kandung.</p>
                        </div>
                      </div>

                      {/* Ceklist Wali Ada / Tidak Ada */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        hasGuardian 
                          ? 'bg-emerald-50 border-emerald-300 shadow-2xs' 
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              hasGuardian ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                            }`}>
                              <UserCheck size={18} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                Apakah Calon Murid Memiliki Wali Murid?
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Centang kotak ini jika ada wali (Paman/Bibi/Kakek/Nenek/Saudara/Lainnya) yang bertanggung jawab atas murid.
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hasGuardian}
                              onChange={(e) => setHasGuardian(e.target.checked)}
                              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                            />
                            <span className={`text-xs font-bold ${hasGuardian ? 'text-emerald-800' : 'text-slate-500'}`}>
                              {hasGuardian ? 'Wali Ada' : 'Wali Tidak Ada'}
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Jika Ceklist Wali Ada: Form Data Wali Tampil */}
                      {hasGuardian && (
                        <div className="space-y-4 p-5 rounded-2xl bg-white border border-emerald-300 shadow-xs">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                              <UserPlus size={14} />
                              <span>Formulir Isian Data Lengkap Wali Murid</span>
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              Status: Wali Aktif
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Nama Lengkap Wali (Otomatis Huruf Kapital) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required={hasGuardian}
                                value={fullForm.guardianName || ''}
                                onChange={(e) => setFullForm({ ...fullForm, guardianName: e.target.value.toUpperCase() })}
                                placeholder="NAMA LENGKAP WALI"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 uppercase font-bold tracking-wide placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Hubungan dengan Murid <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={fullForm.guardianRelation || 'Paman'}
                                onChange={(e) => setFullForm({ ...fullForm, guardianRelation: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="Paman">Paman</option>
                                <option value="Bibi">Bibi</option>
                                <option value="Kakek">Kakek</option>
                                <option value="Nenek">Nenek</option>
                                <option value="Kakak Kandung">Kakak Kandung</option>
                                <option value="Saudara">Saudara Lainnya</option>
                                <option value="Wali Asuh">Wali Asuh</option>
                                <option value="Lainnya">Lainnya</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                NIK Wali (16 Digit)
                              </label>
                              <input
                                type="text"
                                value={fullForm.guardianNik || ''}
                                onChange={(e) => setFullForm({ ...fullForm, guardianNik: e.target.value.replace(/\D/g, '') })}
                                placeholder="16 Digit NIK Wali"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Tempat & Tanggal Lahir Wali (|tgl| |bln| |Tahun| + Otomatis Gabung) */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <BirthDateSplitInput
                              idPrefix="guardian"
                              birthPlace={fullForm.guardianBirthPlace || ''}
                              onBirthPlaceChange={(val) => setFullForm({ ...fullForm, guardianBirthPlace: toProperCase(val) })}
                              birthDate={fullForm.guardianBirthDate || ''}
                              onBirthDateChange={(val) => setFullForm({ ...fullForm, guardianBirthDate: val })}
                              placeLabel="Tempat Lahir Wali (Besar Kecil / Proper)"
                              dateLabel="Tanggal Lahir Wali"
                              combinedLabel="Tempat, Tgl Lahir Wali"
                              showPlaceInput
                              theme="light"
                              minYear={1940}
                              maxYear={2015}
                              placeholderPlace="Contoh: Pasuruan"
                              properCasePlace={true}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Pendidikan Terakhir Wali</label>
                              <select
                                value={getNormalizedEduValue(fullForm.guardianEducation)}
                                onChange={(e) => setFullForm({ ...fullForm, guardianEducation: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">-- Pilih Pendidikan Terakhir --</option>
                                {SPMB_EDUCATION_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt === 'tidak bersekolah' ? 'Tidak Bersekolah' : opt}
                                  </option>
                                ))}
                                {fullForm.guardianEducation &&
                                  !SPMB_EDUCATION_OPTIONS.some(o => o.toLowerCase() === fullForm.guardianEducation?.toLowerCase()) && (
                                  <option value={fullForm.guardianEducation}>{fullForm.guardianEducation}</option>
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Pekerjaan Wali (Otomatis Proper)</label>
                              <input
                                type="text"
                                value={fullForm.guardianOccupation || ''}
                                onChange={(e) => setFullForm({ ...fullForm, guardianOccupation: toProperCase(e.target.value) })}
                                placeholder="Wiraswasta / Karyawan / PNS"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Keberadaan Wali</label>
                              <select
                                value={fullForm.guardianStatus || 'Hidup'}
                                onChange={(e) => setFullForm({ ...fullForm, guardianStatus: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="Hidup">Masih Hidup</option>
                                <option value="Meninggal">Sudah Meninggal</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Penghasilan Bulanan Wali</label>
                              <select
                                value={fullForm.guardianIncome || ''}
                                onChange={(e) => setFullForm({ ...fullForm, guardianIncome: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">-- Pilih Range Penghasilan --</option>
                                <option value="Kurang dari Rp 1.000.000">Kurang dari Rp 1.000.000</option>
                                <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                                <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                                <option value="Lebih dari Rp 5.000.000">Lebih dari Rp 5.000.000</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp / HP Wali</label>
                              <input
                                type="text"
                                value={fullForm.guardianPhone || ''}
                                onChange={(e) => setFullForm({ ...fullForm, guardianPhone: e.target.value })}
                                placeholder="081234..."
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Tinggal Wali (Otomatis Proper)</label>
                            <input
                              type="text"
                              value={fullForm.guardianAddress || ''}
                              onChange={(e) => setFullForm({ ...fullForm, guardianAddress: toProperCase(e.target.value) })}
                              placeholder="Kosongkan jika sama dengan alamat tinggal murid"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        type="submit"
                        disabled={isSavingFullForm}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        {isSavingFullForm ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                        <span>Simpan Data Lengkap Murid & Lanjut Upload Berkas</span>
                      </button>
                    </div>
                  </form>
                  )
                )}

                {/* TAB CONTENT 3: UPLOAD BERKAS (SEBELUM DAFTAR ULANG) */}
                {portalTab === 'docs' && (
                  !isStep3Unlocked ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-slate-900">Tahap 3: Unggah Berkas Terkunci</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Silakan lengkapi dan simpan Formulir Data Lengkap Murid (Tahap 2) terlebih dahulu sebelum mengunggah berkas persyaratan pendaftaran.
                      </p>
                      <button
                        onClick={() => setPortalTab('form')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ArrowLeft size={14} />
                        <span>Buka Tahap 2: Data Lengkap Murid</span>
                      </button>
                    </div>
                  ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900">Unggah Berkas Persyaratan Pendaftaran</h4>
                        <p className="text-xs text-slate-500">
                          Upload 5 berkas resmi pendaftaran: Akte Kelahiran, KK, KTP Ayah, KTP Ibu, dan Foto Murid.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>Auto Kompres Maks 1000px</span>
                      </span>
                    </div>

                    {docsSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{docsSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {/* 1. Akte Kelahiran */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">1. Akte Kelahiran <span className="text-rose-500">*</span></span>
                          {docUploads.aktaPhoto && <span className="text-[10px] font-bold text-emerald-600">✓ Terunggah</span>}
                        </div>
                        {docUploads.aktaPhoto && (
                          <img src={docUploads.aktaPhoto} alt="Akta Preview" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('aktaPhoto', e)}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                        />
                      </div>

                      {/* 2. Kartu Keluarga */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">2. Kartu Keluarga (KK) <span className="text-rose-500">*</span></span>
                          {docUploads.kkPhoto && <span className="text-[10px] font-bold text-emerald-600">✓ Terunggah</span>}
                        </div>
                        {docUploads.kkPhoto && (
                          <img src={docUploads.kkPhoto} alt="KK Preview" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('kkPhoto', e)}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                        />
                      </div>

                      {/* 3. KTP Ayah / Wali */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">3. KTP Ayah / Wali <span className="text-rose-500">*</span></span>
                          {docUploads.ktpAyahPhoto && <span className="text-[10px] font-bold text-emerald-600">✓ Terunggah</span>}
                        </div>
                        {docUploads.ktpAyahPhoto && (
                          <img src={docUploads.ktpAyahPhoto} alt="KTP Ayah Preview" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('ktpAyahPhoto', e)}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                        />
                      </div>

                      {/* 4. KTP Ibu */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">4. KTP Ibu <span className="text-rose-500">*</span></span>
                          {docUploads.ktpIbuPhoto && <span className="text-[10px] font-bold text-emerald-600">✓ Terunggah</span>}
                        </div>
                        {docUploads.ktpIbuPhoto && (
                          <img src={docUploads.ktpIbuPhoto} alt="KTP Ibu Preview" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange('ktpIbuPhoto', e)}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                        />
                      </div>

                      {/* 5. Foto Murid */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">5. Foto Murid (3x4) <span className="text-rose-500">*</span></span>
                          {docUploads.pasPhoto && <span className="text-[10px] font-bold text-emerald-600">✓ Terunggah</span>}
                        </div>
                        {docUploads.pasPhoto && (
                          <img src={docUploads.pasPhoto} alt="Foto Preview" className="w-24 h-28 object-cover rounded-xl border border-slate-200 mx-auto" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('pasPhoto', e)}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleSaveDocuments}
                        disabled={isUploadingDocs}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
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
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-slate-900">Tahap 4: Pembayaran Daftar Ulang Terkunci</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Anda harus melengkapi berkas persyaratan resmi (Akte Kelahiran, KK, dan Pas Foto) pada Tahap 3 terlebih dahulu sebelum dapat melanjutkan ke tahap pembayaran Daftar Ulang & Seragam.
                      </p>
                      <button
                        onClick={() => setPortalTab('docs')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ArrowLeft size={14} />
                        <span>Buka Tahap 3: Unggah Berkas</span>
                      </button>
                    </div>
                  ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900">Pembayaran Daftar Ulang & Seragam Sekolah</h4>
                        <p className="text-xs text-slate-500">Selesaikan pelunasan biaya daftar ulang & seragam sekolah via Midtrans Snap atau teller sekolah.</p>
                      </div>
                      {activeCandidate.reRegistrationStatus === 'paid' ? (
                        <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                          LUNAS (PAID)
                        </span>
                      ) : (
                        <span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                          Belum Lunas
                        </span>
                      )}
                    </div>

                    {/* Rincian Item Tagihan Daftar Ulang */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-black text-slate-800">Rincian Paket Biaya Daftar Ulang & Seragam:</h5>
                      <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 text-xs">
                        {/* 1. Uang Gedung & Diskon */}
                        <div className="p-3.5 flex justify-between items-center bg-slate-50/70">
                          <div>
                            <span className="font-bold text-slate-900 block">Uang Gedung / Infaq Pembangunan</span>
                            <span className="text-[11px] text-slate-500">Biaya sarana & prasarana pendidikan</span>
                          </div>
                          <span className="font-bold text-slate-900">Rp {(config?.buildingFee || 1500000).toLocaleString('id-ID')}</span>
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
                                <div className="p-3.5 flex justify-between items-center text-emerald-800 font-bold bg-emerald-50">
                                  <div className="flex items-center gap-1.5">
                                    <Percent size={14} className="text-emerald-700 shrink-0" />
                                    <span>Potongan Gelombang Uang Gedung Sesi {activeCandidate.sessionId.toUpperCase()} ({details.discountPercent}%)</span>
                                  </div>
                                  <span>- Rp {details.buildingDiscount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              {details.maarifBuildingDiscount > 0 && (
                                <div className="p-3.5 flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/60">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-emerald-700 shrink-0" />
                                    <span>Diskon Khusus Uang Gedung (SD Maarif Jogosari)</span>
                                  </div>
                                  <span>- Rp {details.maarifBuildingDiscount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* 2. SPP Bulan Juli 2027 */}
                        {(() => {
                          const isFreeSpp = Boolean(
                            activeCandidate.sessionId === 'inden' && 
                            (activeCandidate.freeFirstMonthSpp || activeCandidate.isSiblingKkMatch)
                          );
                          return (
                            <div className={`p-3.5 flex justify-between items-center transition-all ${isFreeSpp ? 'bg-teal-50/90 border-t border-b border-teal-200 text-teal-950' : 'bg-slate-50/70'}`}>
                              <div>
                                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                                  <span>SPP Bulan Juli 2027</span>
                                  {isFreeSpp && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-200 text-teal-900 font-extrabold uppercase shadow-2xs">
                                      🎉 GRATIS (No. KK Sama)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {isFreeSpp 
                                    ? `Bebas biaya SPP bulan pertama berkat promo Sesi Inden (Terdeteksi No. KK sama dengan: ${activeCandidate.matchedSiblingDetail || 'Siswa/Murid Baru'})` 
                                    : 'SPP bulan pertama tahun ajaran baru'}
                                </span>
                              </div>
                              <div className="text-right">
                                {isFreeSpp ? (
                                  <div>
                                    <span className="font-black text-teal-800 text-sm block">GRATIS (Rp 0)</span>
                                    <span className="text-[10px] text-slate-400 line-through">Rp {(config?.julySppFee || 200000).toLocaleString('id-ID')}</span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-slate-900">Rp {(config?.julySppFee || 200000).toLocaleString('id-ID')}</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 3. Seragam Items Header */}
                        <div className="p-3 bg-slate-100 font-bold text-slate-700 text-[11px] uppercase tracking-wider flex justify-between items-center">
                          <span>Paket Seragam & Atribut Murid ({activeCandidate.gender === 'L' ? 'Putra' : 'Putri'}):</span>
                          <span className="text-emerald-700">
                            Rp {getUniformItemsForGender(activeCandidate.gender === 'L' ? 'male' : 'female').reduce((sum, item) => sum + item.price, 0).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {getUniformItemsForGender(activeCandidate.gender === 'L' ? 'male' : 'female').map((item) => (
                          <div key={item.id} className="p-2.5 px-4 flex justify-between items-center text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>{item.name}</span>
                            </span>
                            <span className="font-semibold text-slate-900">Rp {item.price.toLocaleString('id-ID')}</span>
                          </div>
                        ))}

                        {/* Maarif Uniform Discount & Inden Sports Uniform Bonus if applied */}
                        {(() => {
                          const details = getSessionFeeDetails(
                            activeCandidate.sessionId,
                            activeCandidate.gender === 'L' ? 'male' : 'female',
                            activeCandidate.schoolOriginType,
                            activeCandidate.schoolOrigin
                          );
                          return (
                            <>
                              {details.maarifUniformDiscount > 0 && (
                                <div className="p-3.5 flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/60 border-t border-slate-200">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-emerald-700 shrink-0" />
                                    <span>Diskon Khusus Seragam / Perlengkapan (SD Maarif Jogosari)</span>
                                  </div>
                                  <span>- Rp {details.maarifUniformDiscount.toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              {details.sportsUniformBonus > 0 && (
                                <div className="p-3.5 flex justify-between items-center text-amber-950 font-bold bg-gradient-to-r from-amber-50 to-emerald-50 border-t border-amber-200">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-base leading-none">🎁</span>
                                    <div>
                                      <span className="font-black text-amber-900 block text-xs">Bonus 1 Set Seragam Olahraga Gratis</span>
                                      <span className="text-[10px] text-amber-800 font-medium">Khusus Sesi Inden bagi SD/MI dari LP. Ma'arif</span>
                                    </div>
                                  </div>
                                  <span className="text-emerald-700 font-black text-xs">- Rp {details.sportsUniformBonus.toLocaleString('id-ID')} (GRATIS)</span>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Final Total */}
                        <div className="p-4 flex justify-between items-center bg-emerald-50 text-sm font-black border-t border-emerald-200">
                          <div>
                            <span className="text-slate-900 block">Total Tagihan Daftar Ulang:</span>
                            <span className="text-[11px] text-slate-600 font-normal">
                              Uang Gedung Net + SPP Juli 2027 + Seragam Net
                              {activeCandidate.schoolOriginType === 'maarif_jogosari' && ' (Termasuk Diskon SD Maarif)'}
                              {activeCandidate.sessionId === 'inden' && isSchoolLpMaarif(activeCandidate.schoolOriginType, activeCandidate.schoolOrigin) && ' + 🎁 Bonus Seragam Olahraga'}
                              {activeCandidate.sessionId === 'inden' && (activeCandidate.freeFirstMonthSpp || activeCandidate.isSiblingKkMatch) && ' + 🎉 Bebas SPP Juli (No KK Sama)'}
                            </span>
                          </div>
                          <span className="text-emerald-700 text-lg font-black">
                            Rp {calculateTotalReRegFee(activeCandidate.gender, activeCandidate.sessionId, activeCandidate.schoolOriginType, activeCandidate.schoolOrigin).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      {activeCandidate.reRegistrationStatus === 'paid' ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <span>Daftar Ulang telah Lunas pada {activeCandidate.reRegistrationPaidAt ? new Date(activeCandidate.reRegistrationPaidAt).toLocaleDateString('id-ID') : 'sebelumnya'}.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptModalCandidate(activeCandidate);
                              setReceiptModalType('rereg');
                              setIsReceiptModalOpen(true);
                            }}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                          >
                            <Printer size={14} />
                            <span>Cetak Kuitansi Daftar Ulang (KOP Resmi)</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePayReRegistrationSnap}
                          disabled={isProcessingReRegPay}
                          className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                            ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer shadow-sm'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {isStep5Unlocked ? (
                          <>
                            <span>Lihat Bukti Tanda Terima Resmi</span>
                            <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            <Lock size={14} className="text-amber-500" />
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
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                        <Lock size={32} />
                      </div>
                      <h4 className="text-lg font-black text-slate-900">Tahap 5: Kartu & Tanda Terima Resmi Terkunci</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Bukti tanda terima dan kartu pendaftaran resmi hanya dapat diterbitkan dan dicetak setelah calon murid menyelesaikan pelunasan Daftar Ulang & Seragam (Tahap 4).
                      </p>
                      <button
                        onClick={() => setPortalTab('rereg')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ArrowLeft size={14} />
                        <span>Buka Tahap 4: Pembayaran Daftar Ulang</span>
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptModalCandidate(activeCandidate);
                            setReceiptModalType('token');
                            setIsReceiptModalOpen(true);
                          }}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-emerald-300 shadow-sm cursor-pointer transition-colors"
                        >
                          <Printer size={14} />
                          <span>Cetak Kuitansi Token Lunas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptModalCandidate(activeCandidate);
                            setReceiptModalType('rereg');
                            setIsReceiptModalOpen(true);
                          }}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-cyan-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-cyan-300 shadow-sm cursor-pointer transition-colors"
                        >
                          <Printer size={14} />
                          <span>Cetak Kuitansi Daftar Ulang Lunas</span>
                        </button>
                      </div>

                      <button
                        onClick={handlePrintCard}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Printer size={15} />
                        <span>Cetak Bukti Pendaftaran (PDF / Print)</span>
                      </button>
                    </div>

                    {/* Official Card for Print & Screen */}
                    <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xl space-y-6 print:shadow-none print:border-none print:p-0">
                      {/* Card Header with Letterhead (Admin Main Settings Letterhead KOP) */}
                      {currentSchoolIdentity?.letterhead ? (
                        <div className="border-b-2 border-slate-900 pb-3 mb-2">
                          <img 
                            src={currentSchoolIdentity.letterhead} 
                            alt="KOP Resmi Sekolah" 
                            className="w-full h-auto max-h-36 object-contain mx-auto" 
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                          {currentSchoolIdentity?.logo ? (
                            <img src={currentSchoolIdentity.logo} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-2xl shrink-0">
                              NU
                            </div>
                          )}
                          <div className="text-center flex-grow">
                            <h3 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900 m-0">
                              SEKOLAH INSPIRATIF {currentSchoolIdentity?.name || "SMP MA'ARIF NU PANDAAN"}
                            </h3>
                            <p className="text-xs font-bold text-emerald-800 m-0 uppercase">
                              PANITIA SISTEM PENERIMAAN MURID BARU (SPMB) T.A. {config?.academicYear || '2027/2028'}
                            </p>
                            <p className="text-[10px] text-slate-600 m-0">
                              {currentSchoolIdentity?.address || 'Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan'} • Telp: {config?.contactPhone || currentSchoolIdentity?.phone || '(0343) 631234'}
                            </p>
                          </div>
                          <img
                            src={currentSchoolIdentity?.logo2 || "/logo2.png"}
                            alt="Logo Sekolah Inspiratif"
                            className="w-16 h-16 object-contain shrink-0 hidden sm:block"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo2.png'; }}
                          />
                        </div>
                      )}

                      <div className="text-center py-1 bg-slate-100 rounded-xl">
                        <h4 className="text-xs sm:text-sm font-black uppercase text-slate-800 m-0">
                          TANDA BUKTI PENDAFTARAN & STATUS PENERIMAAN MURID BARU
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
                          {activeCandidate.selectedUniformSize && (
                            <div className="grid grid-cols-3 py-1 border-b border-slate-200">
                              <span className="font-semibold text-slate-500">Ukuran Seragam</span>
                              <span className="col-span-2 font-bold text-slate-900">: Ukuran {activeCandidate.selectedUniformSize}</span>
                            </div>
                          )}
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
                          <p className="m-0 text-slate-600">{config?.spmbChairTitle || `Ketua Panitia SPMB ${config?.academicYear || '2027/2028'}`},</p>
                          <div className="h-16" />
                          <p className="font-bold underline text-slate-900 m-0">{config?.spmbChairName || 'Drs. H. M. Sholihuddin'}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <CreditCard size={28} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">{snapTitle}</h3>
              <p className="text-xs text-slate-600 mt-1">
                Silakan selesaikan pembayaran online sebesar <strong className="text-emerald-700 font-bold">Rp {snapAmount.toLocaleString('id-ID')}</strong> melalui Gateway Resmi Midtrans Snap.
              </p>
            </div>

            {snapError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left">
                <p className="font-semibold text-rose-900 mb-0.5">Pemberitahuan:</p>
                <p className="text-[11px]">{snapError}</p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2 font-mono text-slate-700">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="text-emerald-700 font-bold">{snapOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Biaya:</span>
                <span className="text-slate-900 font-bold">Rp {snapAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Lingkungan:</span>
                <span>{midtransConfigState?.isProduction ? 'Production Live' : 'Sandbox Testing'}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => triggerSnapPayment(snapToken, snapOrderId, snapPayType)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <CreditCard size={15} />
                Buka / Tampilkan Jendela Midtrans Snap
              </button>

              {snapRedirectUrl && (
                <a
                  href={snapRedirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-emerald-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
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
                className="w-full py-2 text-xs text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                {snapPayType === 'token' ? 'Batalkan Pendaftaran (Hapus Draft)' : 'Tutup Jendela Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kuitansi Resmi SPMB (KOP Resmi Lembaga) */}
      <SpmbReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        candidate={receiptModalCandidate}
        config={config}
        schoolIdentity={currentSchoolIdentity}
        defaultType={receiptModalType}
      />

      {/* Floating WhatsApp Narahubung SPMB Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <a
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl hover:shadow-2xl border border-emerald-400/40 transition-all transform hover:-translate-y-1 active:scale-95 cursor-pointer"
          aria-label="Hubungi WhatsApp Narahubung SPMB"
        >
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
          </span>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <MessageCircle size={18} />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold m-0 leading-none">Narahubung Panitia</p>
            <p className="text-xs font-black m-0 leading-tight">Chat WhatsApp SPMB</p>
          </div>
          <span className="sm:hidden text-xs font-bold">WA SPMB</span>
        </a>
      </div>
    </div>
  );
}
