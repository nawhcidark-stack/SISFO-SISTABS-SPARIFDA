import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, SppBill, SavingsTransaction, RealtimeNotification, SchoolIdentity, HomeroomTeacher, AttendanceLog, SubjectTeacher, TeachingJournal } from './types';
import StudentPanel from './components/StudentPanel';
import AdminPanel from './components/AdminPanel';
import HomeroomPanel from './components/HomeroomPanel';
import SubjectTeacherPanel from './components/SubjectTeacherPanel';
import TreasurerPanel from './components/TreasurerPanel';
import PrincipalPanel from './components/PrincipalPanel';
import WakaSarprasPanel from './components/WakaSarprasPanel';
import CounselorPanel from './components/CounselorPanel';
import Login from './components/Login';
import NotificationToast from './components/NotificationToast';
import MidtransPayModal from './components/MidtransPayModal';
import SppPaymentReviewModal from './components/SppPaymentReviewModal';
import { GraduationCap, Bell, Users, Landmark, CreditCard, ShieldCheck, HelpCircle, Activity, ChevronRight, Volume2, LogOut, ClipboardCheck, X, Trash2, ArrowDownLeft, ArrowUpRight, Info, CheckCircle2, AlertTriangle, QrCode } from 'lucide-react';

export default function App() {
  // Authed state persistence
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('smp_maarif_logged_in') === 'true';
  });
  const [role, setRole] = useState<'student' | 'admin' | 'homeroom' | 'subject_teacher' | 'treasurer' | 'principal' | 'waka_sarpras' | 'bk'>(() => {
    return (localStorage.getItem('smp_maarif_role') as any) || 'student';
  });
  const [loggedStudentId, setLoggedStudentId] = useState<string | null>(() => {
    return localStorage.getItem('smp_maarif_student_id');
  });
  const [loggedHomeroom, setLoggedHomeroom] = useState<HomeroomTeacher | null>(() => {
    const raw = localStorage.getItem('smp_maarif_logged_homeroom');
    return raw ? JSON.parse(raw) : null;
  });
  const [loggedSubjectTeacher, setLoggedSubjectTeacher] = useState<SubjectTeacher | null>(() => {
    const raw = localStorage.getItem('smp_maarif_logged_subject_teacher');
    return raw ? JSON.parse(raw) : null;
  });

  // School data states
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentBills, setStudentBills] = useState<SppBill[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<SavingsTransaction[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<RealtimeNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<RealtimeNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('school_read_notif_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isNotifHistoryOpen, setIsNotifHistoryOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isNotifHistoryOpen && globalNotifications.length > 0) {
      const allIds = globalNotifications.map(n => n.id);
      setReadNotifIds(prev => {
        const merged = Array.from(new Set([...prev, ...allIds]));
        localStorage.setItem('school_read_notif_ids', JSON.stringify(merged));
        return merged;
      });
    }
  }, [isNotifHistoryOpen, globalNotifications]);
  const [notifSearchQuery, setNotifSearchQuery] = useState<string>('');
  const [attendanceList, setAttendanceList] = useState<AttendanceLog[]>([]);
  const [homeroomsList, setHomeroomsList] = useState<HomeroomTeacher[]>([]);
  const [subjectTeachersList, setSubjectTeachersList] = useState<SubjectTeacher[]>([]);
  
  // School Identity state
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>({
    name: "SMP MA'ARIF NU PANDAAN",
    subheading: "LP MA'ARIF NU CABANG PASURUAN",
    accreditation: "Terakreditasi A",
    address: "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur",
    phone: "(0343) 631234",
    principal: "H. Ahmad Fuad, S.Pd, M.PdI",
    treasurer: "Bendahara Sekolah NU",
    logo: "",
    logo2: "",
    letterhead: ""
  });
  
  // Midtrans Payment Handler states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payToken, setPayToken] = useState<string | null>(null);
  const [payOrderId, setPayOrderId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payItemName, setPayItemName] = useState<string>('');
  const [payIsSimulated, setPayIsSimulated] = useState<boolean>(true);
  
  // States to persist student details on the successful transaction page
  const [payStudentName, setPayStudentName] = useState<string>('');
  const [payStudentNis, setPayStudentNis] = useState<string>('');
  const [payStudentClass, setPayStudentClass] = useState<string>('');

  // Payment review modal states
  const [sppReviewBill, setSppReviewBill] = useState<SppBill | null>(null);
  const [isSppReviewOpen, setIsSppReviewOpen] = useState(false);

  // Admin Auto Receipt print after successful Midtrans Transaction
  const [adminSppBillToPrintCandidate, setAdminSppBillToPrintCandidate] = useState<string | null>(null);
  const [adminSppBillToPrint, setAdminSppBillToPrint] = useState<string | null>(null);
  const [adminSavingsToPrintCandidate, setAdminSavingsToPrintCandidate] = useState<{ studentId: string; orderId: string; amount: number } | null>(null);
  const [adminSavingsToPrint, setAdminSavingsToPrint] = useState<{ studentId: string; orderId: string; amount: number } | null>(null);

  // System indicators
  const [sysStatus, setSysStatus] = useState<{ merchantId: string; clientKey: string; hasServerKey: boolean; isProduction: boolean; adminFee?: number; systemMaintenanceFee?: number; chargeFeesToUser?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeStr, setTimeStr] = useState<string>('');

  // Audio trigger for sound feedback of real-time events
  const [playNotificationSound, setPlayNotificationSound] = useState(true);
  const [showPaymentSuccessScreen, setShowPaymentSuccessScreen] = useState<boolean>(false);
  const [successCountdown, setSuccessCountdown] = useState<number>(5);
  const [isFromRedirect, setIsFromRedirect] = useState<boolean>(false);

  // States for scanning QR item lookup
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);

  // States for physical student QR card scan
  const [scannedStudentNis, setScannedStudentNis] = useState<string | null>(null);
  const [scannedStudentAt, setScannedStudentAt] = useState<number | null>(null);

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore complex control buttons or keys
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Reset buffer if delay is too long (above 1 second between keystrokes indicates separate inputs)
      if (diff > 1200) {
        buffer = "";
      }

      if (e.key === 'Backspace') {
        buffer = buffer.slice(0, -1);
        return;
      }

      if (e.key === 'Enter') {
        const cleanCode = buffer.trim();
        if (cleanCode.length >= 2) {
          const matchedStudent = studentsList.find(s => 
            (s.nis && s.nis.toLowerCase() === cleanCode.toLowerCase()) || 
            (s.id && s.id === cleanCode)
          );
          if (matchedStudent) {
            e.preventDefault();
            e.stopPropagation();
            buffer = "";
            setScannedStudentNis(matchedStudent.nis);
            setScannedStudentAt(Date.now());
            
            // Trigger confirmation beep sound!
            triggerBeep();

            // Push a beautiful floating dynamic toast notification
            const scanNotif: RealtimeNotification = {
              id: 'qr-scan-toast-' + Date.now(),
              title: 'Kartu QR Terdeteksi 🔍',
              message: `Menampilkan profil ${matchedStudent.name} (Kelas ${matchedStudent.class}).`,
              type: 'success',
              createdAt: new Date().toISOString()
            };
            setActiveToasts(prev => {
              // Flush other previous QR scan toasts to keep it clean, then add
              const cleanPrevs = prev.filter(t => !t.id.startsWith('qr-scan-toast-'));
              return [scanNotif, ...cleanPrevs];
            });

            // Blur active elements to remove keyboard focus from text fields
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }
        }
        buffer = "";
      } else {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [studentsList, playNotificationSound]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('scan');
    const orderId = params.get('order_id');

    if (code) {
      // Clear "?scan=X" from browser URL dynamically without full page reload
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      setIsLoading(true);
      fetch(`/api/sarpras/items/by-code/${encodeURIComponent(code)}`)
        .then(res => {
          if (!res.ok) throw new Error("Barang tidak terdaftar atau bermasalah.");
          return res.json();
        })
        .then(item => {
          setScannedItem(item);
          setIsScanningActive(true);
          setScanErrorMsg(null);
        })
        .catch(() => {
          setScannedItem(null);
          setScanErrorMsg(`Aset/Barang dengan kode QR "${code}" tidak terdaftar di sistem inventaris SMP Ma'arif NU Pandaan.`);
          setIsScanningActive(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    if (orderId) {
      // Keep the browser path as '/pembayaran-sukses' if they came from it, but clear query strings
      const isRedirectPath = window.location.pathname === '/pembayaran-sukses';
      const newUrl = window.location.origin + (isRedirectPath ? '/pembayaran-sukses' : window.location.pathname);
      window.history.replaceState({}, document.title, newUrl);

      setIsLoading(true);
      fetch('/api/simulate-payment-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentType: 'Midtrans Redirect' })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          let targetStudentId = '';
          if (orderId.startsWith('SAV-')) {
            const middle = orderId.slice(4);
            const lastHyphenIndex = middle.lastIndexOf("-");
            targetStudentId = lastHyphenIndex === -1 ? middle : middle.slice(0, lastHyphenIndex);
          } else if (orderId.startsWith('SPP-')) {
            if (data.bill && data.bill.studentId) {
              targetStudentId = data.bill.studentId;
            }
          }

          if (targetStudentId) {
            localStorage.setItem('smp_maarif_logged_in', 'true');
            localStorage.setItem('smp_maarif_role', 'student');
            localStorage.setItem('smp_maarif_student_id', targetStudentId);
            setIsLoggedIn(true);
            setRole('student');
            setLoggedStudentId(targetStudentId);
            fetchStudentFullData(targetStudentId, false);
          }

          // Populate the successful payment invoice display states
          setPayOrderId(orderId);
          if (data.type === 'spp' && data.bill) {
            setPayAmount(data.bill.amount);
            setPayItemName(`SPP Bulan ${data.bill.month} ${data.bill.year}`);
          } else if (data.type === 'savings' && data.transaction) {
            setPayAmount(data.transaction.amount);
            setPayItemName('Simpanan Tabungan Mandiri');
          } else if (orderId.startsWith('SAV-')) {
            // fallback if transaction is already success and parsed differently
            const amountStr = orderId.split('-').pop() || '50000';
            const parsedNum = parseInt(amountStr, 10);
            setPayAmount(isNaN(parsedNum) ? 50000 : parsedNum);
            setPayItemName('Simpanan Tabungan Mandiri');
          }

          if (data.student) {
            setPayStudentName(data.student.name);
            setPayStudentNis(data.student.nis);
            setPayStudentClass(data.student.class);
          }

          // Explicitly trigger persistent show of the success screen
          setIsFromRedirect(true);
          setShowPaymentSuccessScreen(true);

          // Show elegant toast and sound beep
          const successNotif: RealtimeNotification = {
            id: 'pay-success-toast-' + Date.now(),
            title: 'Pembayaran Terkonfirmasi ✓',
            message: orderId.startsWith('SAV-')
              ? `Top up tabungan dengan order ID ${orderId} sukses terverifikasi!`
              : `Pembayaran SPP dengan order ID ${orderId} lunas terverifikasi!`,
            type: 'success',
            createdAt: new Date().toISOString()
          };
          setActiveToasts(prev => [successNotif, ...prev]);
          triggerBeep();
        }
      })
      .catch(err => {
        console.error("Gagal melakukan sinkronisasi pembayaran via redirect:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else if (window.location.pathname === '/pembayaran-sukses') {
      // If we are on /pembayaran-sukses but no orderId is in url parameters, check if there is general session success
      const storeId = localStorage.getItem('smp_maarif_student_id');
      if (storeId) {
        localStorage.setItem('smp_maarif_logged_in', 'true');
        localStorage.setItem('smp_maarif_role', 'student');
        setIsLoggedIn(true);
        setRole('student');
        setLoggedStudentId(storeId);
        fetchStudentFullData(storeId, false);
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    // Disable automatic countdown close if we are on the dedicated redirect success page!
    if (showPaymentSuccessScreen && !isFromRedirect) {
      setSuccessCountdown(5);
      interval = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowPaymentSuccessScreen(false);
            setPayOrderId(null);
            setPayStudentName('');
            setPayStudentNis('');
            setPayStudentClass('');
            if (role === 'student' && currentStudent) {
              fetchStudentFullData(currentStudent.id, false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showPaymentSuccessScreen, role, currentStudent, isFromRedirect]);

  // Sound generator
  const triggerBeep = () => {
    if (!playNotificationSound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chord note
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.9);
    } catch (e) {
      console.log('AudioContext blocked/not allowed by browser security policies until page gesture.');
    }
  };

  // 1. Initial Load of students and global system configurations
  const initSystemData = async () => {
    try {
      setIsLoading(true);
      
      // Load Students
      try {
        const stdRes = await fetch('/api/students');
        if (stdRes.ok) {
          const stdData = await stdRes.json();
          setStudentsList(stdData);
          // Default select first student or the stored logged-in student ID
          if (stdData.length > 0) {
            const storedStudentId = localStorage.getItem('smp_maarif_student_id');
            const targetId = storedStudentId || stdData[0].id;
            fetchStudentFullData(targetId, role === 'admin' || role === 'homeroom');
          }
        }
      } catch (e) {
        console.error("Gagal memuat data siswa", e);
      }

      // Load Recent notifications history
      try {
        const notifRes = await fetch('/api/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setGlobalNotifications(notifData);
        }
      } catch (e) {
        console.error("Gagal memuat notifikasi", e);
      }

      // Load School Identity configuration
      try {
        const schoolRes = await fetch('/api/school-identity');
        if (schoolRes.ok) {
          const sData = await schoolRes.json();
          if (sData.success && sData.schoolIdentity) {
            setSchoolIdentity(sData.schoolIdentity);
          }
        }
      } catch (e) {
        console.error("Gagal memuat identitas sekolah", e);
      }

      // Load Midtrans integration keys metadata
      try {
        const keysRes = await fetch('/api/midtrans-config');
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          setSysStatus(keysData);
        }
      } catch (e) {
        console.error("Gagal memuat konfigurasi midtrans", e);
      }

      // Load Attendance Logs
      try {
        const attRes = await fetch('/api/attendance');
        if (attRes.ok) {
          const attData = await attRes.json();
          setAttendanceList(attData);
        }
      } catch (e) {
        console.error("Gagal memuat absensi", e);
      }

      // Load Homerooms
      try {
        const hrRes = await fetch('/api/homerooms');
        if (hrRes.ok) {
          const hrData = await hrRes.json();
          setHomeroomsList(hrData);
        }
      } catch (e) {
        console.error("Gagal memuat wali kelas", e);
      }

      // Load Subject Teachers
      try {
        const stRes = await fetch('/api/subject-teachers');
        if (stRes.ok) {
          const stData = await stRes.json();
          setSubjectTeachersList(stData);
        }
      } catch (e) {
        console.error("Gagal memuat guru mapel", e);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to boot initial data', err);
      setIsLoading(false);
    }
  };

  // Auxiliary loader to fetch a specific student profile's bills and history
  const fetchStudentFullData = async (studentId: string, isAdminOverride?: boolean) => {
    try {
      setIsLoading(true);
      const checkIsAdmin = isAdminOverride !== undefined ? isAdminOverride : (role === 'admin' || role === 'homeroom');

      if (checkIsAdmin) {
        // Fetch all student bills and total transactions for admin bookkeeping roster
        const bRes = await fetch('/api/admin/all-bills');
        const tRes = await fetch('/api/admin/all-transactions');
        if (bRes.ok && tRes.ok) {
          const bData = await bRes.json();
          const tData = await tRes.json();
          setStudentBills(bData);
          setStudentTransactions(tData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }

        // Also fetch profile of active student selector if they exist
        if (studentId) {
          const sRes = await fetch(`/api/students/${studentId}`);
          if (sRes.ok) {
            const sData = await sRes.json();
            setCurrentStudent(sData.student);
          }
        }
      } else {
        const res = await fetch(`/api/students/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentStudent(data.student);
          setStudentBills(data.bills);
          // Sort transactions freshest first
          setStudentTransactions(data.transactions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load student details', err);
      setIsLoading(false);
    }
  };

  // Reload current views
  const handleReload = () => {
    initSystemData();
    if (currentStudent) {
      fetchStudentFullData(currentStudent.id, role === 'admin');
    }
  };

  const handleLoginSuccess = (
    userRole: 'student' | 'admin' | 'homeroom' | 'subject_teacher' | 'treasurer' | 'principal' | 'waka_sarpras' | 'bk', 
    student: Student | null, 
    homeroom: HomeroomTeacher | null,
    subjectTeacher?: SubjectTeacher | null
  ) => {
    setIsLoggedIn(true);
    setRole(userRole);
    localStorage.setItem('smp_maarif_logged_in', 'true');
    localStorage.setItem('smp_maarif_role', userRole);
    
    if (userRole === 'student' && student) {
      setLoggedStudentId(student.id);
      localStorage.setItem('smp_maarif_student_id', student.id);
      fetchStudentFullData(student.id, false);
      setLoggedHomeroom(null);
      localStorage.removeItem('smp_maarif_logged_homeroom');
      setLoggedSubjectTeacher(null);
      localStorage.removeItem('smp_maarif_logged_subject_teacher');
    } else if (userRole === 'homeroom' && homeroom) {
      setLoggedHomeroom(homeroom);
      localStorage.setItem('smp_maarif_logged_homeroom', JSON.stringify(homeroom));
      setLoggedStudentId(null);
      localStorage.removeItem('smp_maarif_student_id');
      fetchStudentFullData('', true);
      setLoggedSubjectTeacher(null);
      localStorage.removeItem('smp_maarif_logged_subject_teacher');
    } else if (userRole === 'subject_teacher' && subjectTeacher) {
      setLoggedSubjectTeacher(subjectTeacher);
      localStorage.setItem('smp_maarif_logged_subject_teacher', JSON.stringify(subjectTeacher));
      setLoggedStudentId(null);
      localStorage.removeItem('smp_maarif_student_id');
      fetchStudentFullData('', true);
      setLoggedHomeroom(null);
      localStorage.removeItem('smp_maarif_logged_homeroom');
    } else {
      setLoggedStudentId(null);
      localStorage.removeItem('smp_maarif_student_id');
      setLoggedHomeroom(null);
      localStorage.removeItem('smp_maarif_logged_homeroom');
      setLoggedSubjectTeacher(null);
      localStorage.removeItem('smp_maarif_logged_subject_teacher');
      if (studentsList.length > 0) {
        fetchStudentFullData(studentsList[0].id, true);
      } else {
        fetchStudentFullData('', true);
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedStudentId(null);
    setCurrentStudent(null);
    setLoggedHomeroom(null);
    setLoggedSubjectTeacher(null);
    localStorage.removeItem('smp_maarif_logged_in');
    localStorage.removeItem('smp_maarif_role');
    localStorage.removeItem('smp_maarif_student_id');
    localStorage.removeItem('smp_maarif_logged_homeroom');
    localStorage.removeItem('smp_maarif_logged_subject_teacher');
  };

  // 2. Real-time notifications listener using Server-Sent Events (SSE)
  useEffect(() => {
    initSystemData();

    // Setup native browser EventSource
    const sse = new EventSource('/api/notifications/stream');

    sse.onopen = () => {
      console.log('SSE Real-time notification stream connected successfully!');
    };

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') return; // skip system check

        // Parse notification
        const rawNotification: RealtimeNotification = data;
        
        // Push to top of notifications array
        setGlobalNotifications(prev => [rawNotification, ...prev]);
        
        // Push to active dynamic toasts for temporary floating displays
        setActiveToasts(prev => [rawNotification, ...prev]);

        // Auto-dismiss floating toast after 4 seconds
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== rawNotification.id));
        }, 4000);
        
        // Play notification ding chime!
        triggerBeep();

        // Bidirectional reactive sync: If the transaction belongs to our currently selected student profile,
        // we automatically trigger an API query to sync the screen with the new funds or paid bills!
        const relatedToActiveStud = currentStudent && (rawNotification.studentId === undefined || rawNotification.studentId === currentStudent.id);
        
        // Update general catalog (student balances/bills might have shifted)
        fetch('/api/students')
          .then(res => res.json())
          .then(dataList => {
            setStudentsList(dataList);
            // Also sync active student's specific sub-cards
            if (currentStudent) {
              const freshActive = dataList.find((s: any) => s.id === currentStudent.id);
              if (freshActive) {
                // Fetch bills and transactions
                fetchStudentFullData(freshActive.id);
              }
            }
          });

      } catch (err) {
        console.error('Error handling push SSE message', err);
      }
    };

    sse.onerror = (err) => {
      console.error('SSE connection lost. Reconnecting in background...', err);
    };

    // Live Clock timer
    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    }, 1000);

    return () => {
      sse.close();
      clearInterval(clockInterval);
    };
  }, [currentStudent?.id]);

  // Dismiss dynamic toast alert manually
  const handleDismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(n => n.id !== id));
  };

  // Delete individual notification from history log
  const handleDeleteHistoryNotification = (id: string) => {
    setGlobalNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notification history logs
  const handleClearAllHistory = () => {
    setGlobalNotifications([]);
  };

  // Modern relative/formatted timestamp helper for logs
  const formatNotifTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();
      
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      if (isToday) {
        return `Hari ini, ${timeStr}`;
      } else if (isYesterday) {
        return `Kemarin, ${timeStr}`;
      } else {
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + `, ${timeStr}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  // 3. SPP Payment Initializer (Opens Review Modal First)
  const handlePaySpp = async (bill: SppBill) => {
    setSppReviewBill(bill);
    setIsSppReviewOpen(true);
  };

  // Actual checkout execution after review approval
  const executePaySppSnap = async (bill: SppBill) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/pay-spp-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: bill.id, origin: window.location.origin })
      });

      if (!res.ok) {
        throw new Error('Gagal memanggil API Pembayaran SPP.');
      }

      const payData = await res.json();
      setPayToken(payData.token);
      setPayOrderId(payData.orderId);
      setPayAmount(payData.totalAmount || bill.amount);
      setPayItemName(`SPP Bulanan - ${bill.month} ${bill.year}`);
      setPayIsSimulated(payData.isSimulated);

      const targetStudent = studentsList.find(s => s.id === bill.studentId) || currentStudent;
      setPayStudentName(targetStudent?.name || "Siswa");
      setPayStudentNis(targetStudent?.nis || "-");
      setPayStudentClass(targetStudent?.class || "-");
      
      setIsLoading(false);
      setIsPayModalOpen(true);

      if (role === 'admin') {
        setAdminSppBillToPrintCandidate(bill.id);
      }
    } catch (err) {
      console.error(err);
      alert('Maaf, sistem tidak bisa menyiapkan invoice Midtrans saat ini. Coba lagi.');
      setIsLoading(false);
    }
  };

  // 4. Tabungan Deposit Initializer (Midtrans Token Charge)
  const handleDepositSavings = async (amount: number, studentId?: string) => {
    const sId = studentId || currentStudent?.id;
    if (!sId) return;
    const targetStudent = sId === currentStudent?.id ? currentStudent : studentsList.find(s => s.id === sId) || null;
    if (!targetStudent) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/deposit-savings-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: sId,
          amount,
          origin: window.location.origin
        })
      });

      if (!res.ok) {
        throw new Error('Gagal memanggil API Buku Tabungan.');
      }

      const payData = await res.json();
      setPayToken(payData.token);
      setPayOrderId(payData.orderId);
      setPayAmount(payData.totalAmount || amount);
      setPayItemName(`Setoran Tabungan - ${targetStudent.name}`);
      setPayIsSimulated(payData.isSimulated);

      setPayStudentName(targetStudent.name || "Siswa");
      setPayStudentNis(targetStudent.nis || "-");
      setPayStudentClass(targetStudent.class || "-");

      setIsLoading(false);
      setIsPayModalOpen(true);

      if (role === 'admin') {
        setAdminSavingsToPrintCandidate({ studentId: sId, orderId: payData.orderId, amount });
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memicu setoran online Midtrans.');
      setIsLoading(false);
    }
  };

  // 5. Simulated Withdrawal request from client-side (requests/submits pending withdrawal)
  const handleWithdrawSavings = async (amount: number, notes: string): Promise<boolean> => {
    if (!currentStudent) return false;
    try {
      const res = await fetch('/api/student/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentStudent.id,
          amount,
          notes
        })
      });
      if (res.ok) {
        initSystemData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Administrative confirm/approve or reject pending student withdrawal request
  const handleConfirmWithdrawal = async (transactionId: string, action: 'approve' | 'reject'): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/savings-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action })
      });
      if (res.ok) {
        initSystemData();
        return true;
      } else {
        const errData = await res.json();
        alert(errData.error || 'Gagal memproses pengajuan.');
        return false;
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
      return false;
    }
  };

  // Administrative Bulk Savings Withdrawal
  const handleBulkWithdrawSavings = async (grade: string, amount: number, notes: string, allowDebt: boolean): Promise<any> => {
    try {
      const res = await fetch('/api/admin/savings-bulk-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, amount, notes, allowDebt })
      });
      const data = await res.json();
      if (res.ok) {
        initSystemData();
        return data;
      } else {
        alert(data.error || 'Gagal memproses penarikan massal.');
        return null;
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server.');
      return null;
    }
  };

  // Change Student Password handler
  const handleChangePassword = async (studentId: string, oldPassword?: string, newPassword?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/students/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, oldPassword, newPassword })
      });
      if (res.ok) {
        // Reload all data to synchronize password dynamically in-memory
        initSystemData();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.error || 'Gagal mengubah sandi.' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Kesalahan jaringan server.' };
    }
  };

  // Admin Manual SPP Verification (Cash clearance)
  const handlePaySppManual = async (billId: string): Promise<any> => {
    try {
      const res = await fetch('/api/admin/pay-spp-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      if (res.ok) {
        const data = await res.json();
        return data.bill || true;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Admin Cancel/Void Manual SPP
  const handleCancelSppManual = async (billId: string): Promise<any> => {
    try {
      const res = await fetch('/api/admin/cancel-spp-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      if (res.ok) {
        const data = await res.json();
        handleReload();
        return { success: true, bill: data.bill };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.error || 'Gagal membatalkan pembayaran SPP.' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: 'Kesalahan jaringan server.' };
    }
  };

  // Admin Manual Savings ledger deposit/withdrawal
  const handleSavingsManual = async (studentId: string, type: 'deposit' | 'withdrawal', amount: number, notes: string): Promise<any> => {
    try {
      const res = await fetch('/api/admin/savings-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          type,
          amount,
          notes
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.transaction || true;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Admin broadcast trigger
  const handleBroadcastNotification = async (title: string, message: string, type: 'info' | 'success' | 'warning' | 'payment'): Promise<boolean> => {
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type
        })
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Create Student
  const handleCreateStudent = async (studentData: { nis: string; name: string; class: string; email: string; phone: string; initialSavings: number; gender?: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      if (res.ok) {
        initSystemData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update Student
  const handleUpdateStudent = async (
    id: string,
    studentData: {
      nis: string;
      name: string;
      class: string;
      email: string;
      phone: string;
      password?: string;
      gender?: string;
      mutationDate?: string;
      mutationReason?: string;
      mutationDestination?: string;
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      if (res.ok) {
        initSystemData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Automatically select another student if deleted student was the active checkout selector
        const nextStudents = studentsList.filter(s => s.id !== id);
        if (nextStudents.length > 0) {
          localStorage.setItem('smp_maarif_student_id', nextStudents[0].id);
        } else {
          localStorage.removeItem('smp_maarif_student_id');
        }
        initSystemData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Batch Import Students Kolektif
  const handleImportStudents = async (list: Array<{ nis: string; name: string; class: string; email: string; phone: string; initialSavings: number; gender?: string }>): Promise<{ success: boolean; addedCount: number; updatedCount: number }> => {
    try {
      const res = await fetch('/api/admin/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentsList: list })
      });
      if (res.ok) {
        const data = await res.json();
        initSystemData();
        return { success: true, addedCount: data.addedCount || 0, updatedCount: data.updatedCount || 0 };
      }
      return { success: false, addedCount: 0, updatedCount: 0 };
    } catch (err) {
      console.error(err);
      return { success: false, addedCount: 0, updatedCount: 0 };
    }
  };

  // Batch Import Teachers (Wali Kelas & Guru Mapel)
  const handleImportTeachers = async (
    homerooms: Array<{ username: string; name: string; className: string; password?: string }>,
    subjectTeachers: Array<{ username: string; name: string; subject: string; password?: string }>
  ): Promise<{ success: boolean; homeroomsAdded: number; homeroomsUpdated: number; subjectsAdded: number; subjectsUpdated: number }> => {
    try {
      const res = await fetch('/api/admin/teachers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homerooms, subjectTeachers })
      });
      if (res.ok) {
        const data = await res.json();
        setHomeroomsList(data.homeroomsList || []);
        setSubjectTeachersList(data.subjectTeachersList || []);
        initSystemData();
        return {
          success: true,
          homeroomsAdded: data.summary?.homeroomsAdded || 0,
          homeroomsUpdated: data.summary?.homeroomsUpdated || 0,
          subjectsAdded: data.summary?.subjectsAdded || 0,
          subjectsUpdated: data.summary?.subjectsUpdated || 0
        };
      }
      return { success: false, homeroomsAdded: 0, homeroomsUpdated: 0, subjectsAdded: 0, subjectsUpdated: 0 };
    } catch (err) {
      console.error(err);
      return { success: false, homeroomsAdded: 0, homeroomsUpdated: 0, subjectsAdded: 0, subjectsUpdated: 0 };
    }
  };

  // Create Homeroom Teacher CRUD
  const handleCreateHomeroom = async (homeroomData: { username: string; name: string; className: string; password?: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/homerooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homeroomData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHomeroomsList(data.homeroomTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update Homeroom Teacher CRUD
  const handleUpdateHomeroom = async (id: string, homeroomData: { username?: string; name?: string; className?: string; password?: string }): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/homerooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homeroomData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHomeroomsList(data.homeroomTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Delete Homeroom Teacher CRUD
  const handleDeleteHomeroom = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/homerooms/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHomeroomsList(data.homeroomTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Create Subject Teacher CRUD
  const handleCreateSubjectTeacher = async (stData: { username: string; name: string; subject: string; password?: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/subject-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubjectTeachersList(data.subjectTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update Subject Teacher CRUD
  const handleUpdateSubjectTeacher = async (id: string, stData: { username?: string; name?: string; subject?: string; password?: string }): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/subject-teachers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubjectTeachersList(data.subjectTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Delete Subject Teacher CRUD
  const handleDeleteSubjectTeacher = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/subject-teachers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubjectTeachersList(data.subjectTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Auto-generate Subject Teachers bulk action
  const handleAutoGenerateSubjectTeachers = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/subject-teachers/auto-generate', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSubjectTeachersList(data.subjectTeachers || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Batch save attendance for Class Room
  const handleSaveBatchAttendance = async (logs: { studentId: string; date: string; status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat'; notes: string }[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAttendanceList(data.attendanceLogs || []);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Success handler once a payment is fully captured
  const handlePaymentSuccess = () => {
    setIsPayModalOpen(false);
    setPayToken(null);
    // Keep setPayOrderId intact so the success page has access to the ID. It will be cleared upon dismissal.

    // Create a beautiful success toast notification with checkicon
    const successNotif: RealtimeNotification = {
      id: 'pay-success-toast-' + Date.now(),
      title: 'Pembayaran Berhasil! ✓',
      message: `${payItemName || 'SPP'} sebesar Rp ${payAmount.toLocaleString('id-ID')} lunas terverifikasi.`,
      type: 'success',
      createdAt: new Date().toISOString()
    };
    setActiveToasts(prev => [successNotif, ...prev]);
    triggerBeep();

    // Trigger success checklist screen & countdown
    setShowPaymentSuccessScreen(true);

    // Refresh student records
    if (currentStudent) {
      fetchStudentFullData(currentStudent.id);
    }
    initSystemData();

    if (role === 'admin' && adminSppBillToPrintCandidate) {
      setAdminSppBillToPrint(adminSppBillToPrintCandidate);
      setAdminSppBillToPrintCandidate(null);
    }

    if (role === 'admin' && adminSavingsToPrintCandidate) {
      setAdminSavingsToPrint(adminSavingsToPrintCandidate);
      setAdminSavingsToPrintCandidate(null);
    }
  };

  const handleUpdateSchoolIdentity = async (updatedData: Partial<SchoolIdentity>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/set-school-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.schoolIdentity) {
          setSchoolIdentity(data.schoolIdentity);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  return (
    <div id="application-container" className="min-h-screen flex flex-col bg-slate-50 antialiased font-sans">
      
      {/* Toast Alert Engine (Listens globally to active SSE events) */}
      <NotificationToast
        notifications={activeToasts}
        onDismiss={handleDismissToast}
      />

      {/* Drawer Riwayat Notifikasi */}
      <AnimatePresence>
        {isNotifHistoryOpen && (
          <div className="fixed inset-0 z-50 flex justify-end no-print" id="notification-history-modal">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotifHistoryOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            />
            
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Bell size={18} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Riwayat Notifikasi</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Update real-time aktivitas sekolah</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNotifHistoryOpen(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Toolbar & Filter */}
              <div className="p-4 border-b border-slate-100 flex flex-col gap-2 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari notifikasi..."
                    value={notifSearchQuery}
                    onChange={(e) => setNotifSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-505"
                  />
                  <div className="absolute left-2.5 top-2.5 text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {globalNotifications.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] pt-1.5">
                    <span className="text-slate-500 font-semibold">Total: {globalNotifications.filter(n => {
                      const q = notifSearchQuery.toLowerCase();
                      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
                    }).length} pesan</span>
                    <button
                      onClick={handleClearAllHistory}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer uppercase tracking-wider text-[9px]"
                    >
                      <Trash2 size={11} /> Hapus Semua
                    </button>
                  </div>
                )}
              </div>

              {/* Message Feed */}
              <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
                {globalNotifications.filter(n => {
                  const q = notifSearchQuery.toLowerCase();
                  return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
                }).length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-20 px-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-350">
                      <Bell size={20} className="text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700 text-xs">Belum Ada Notifikasi</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-[240px] mx-auto">
                        {notifSearchQuery ? 'Tidak menemukan notifikasi dengan kata kunci tersebut.' : 'Semua kuitansi pelunasan, mutasi pinjaman/tabungan, dan siaran pengumuman akan tercatat di sini.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  globalNotifications.filter(n => {
                    const q = notifSearchQuery.toLowerCase();
                    return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
                  }).map((notif) => {
                    let IconComp = Info;
                    let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                    
                    if (notif.type === 'success') {
                      IconComp = CheckCircle2;
                      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    } else if (notif.type === 'warning') {
                      IconComp = AlertTriangle;
                      badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                    } else if (notif.type === 'payment') {
                      IconComp = CreditCard;
                      badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';
                    }

                    return (
                      <motion.div
                        key={notif.id}
                        layoutId={`notif-card-${notif.id}`}
                        className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-slate-100/50 transition-all flex gap-3 relative group"
                      >
                        <div className={`p-1.5 rounded-lg border h-fit self-start shrink-0 ${badgeColor}`}>
                          <IconComp size={15} />
                        </div>
                        <div className="flex-grow min-w-0 pr-4">
                          <span className="text-[9.5px] font-mono text-slate-550 block mb-0.5 font-bold">
                            {formatNotifTime(notif.createdAt)}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-950 leading-tight">
                            {notif.title}
                          </h4>
                          <p className="text-xs text-slate-800 mt-1.5 leading-relaxed break-words font-medium">
                            {notif.message || (notif as any).pesan || (notif as any).notes || "Pemberitahuan resmi dari pihak sekolah."}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHistoryNotification(notif.id)}
                          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Hapus"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 text-center text-[10px] text-slate-400 bg-slate-50/50 font-medium">
                Sistem Informasi SMP Maarif NU Pandaan
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Scanned Item Details Modal Overlay */}
      <AnimatePresence>
        {isScanningActive && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
            >
              <div className="p-4.5 bg-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/10 rounded-lg text-white">
                    <QrCode size={18} />
                  </div>
                  <h3 className="font-extrabold text-xs tracking-wider uppercase">Spesifikasi Detail Aset</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScanningActive(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 flex flex-col text-left">
                {scanErrorMsg ? (
                  <div className="flex flex-col items-center text-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                      <AlertTriangle size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 max-w-sm">{scanErrorMsg}</p>
                    <button
                      type="button"
                      onClick={() => setIsScanningActive(false)}
                      className="mt-2 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                ) : scannedItem ? (
                  <div className="flex flex-col gap-4">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block mb-0.5">Identitas Barang</span>
                      <h4 className="text-base font-extrabold text-slate-900 leading-tight">{scannedItem.name}</h4>
                      <p className="text-xs font-mono font-bold text-slate-400 mt-1 uppercase">🌐 {scannedItem.code}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block mb-0.5">Kategori</span>
                        <span className="font-extrabold text-slate-800">{scannedItem.category || "Umum"}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block mb-0.5">Tahun Beli</span>
                        <span className="font-mono font-extrabold text-indigo-700 inline-block px-1.5 py-0.5 bg-indigo-50 rounded">
                          📅 {scannedItem.purchaseYear || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block mb-0.5">Lokasi Fisik</span>
                        <span className="font-extrabold text-slate-800">📍 {scannedItem.location || "Gudang Utama"}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block mb-0.5">Kondisi Fisik</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                          scannedItem.condition === 'Baik' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : scannedItem.condition === 'Rusak Ringan'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-250'
                        }`}>
                          {scannedItem.condition || "Baik"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block mb-0.5">Stok Inventaris</span>
                        <div className="font-mono font-black text-slate-800 text-sm">
                          {scannedItem.availableQty} <span className="text-slate-400 text-xs font-bold font-sans">unit / {scannedItem.totalQty} total</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block mb-0.5">Estimasi Harga Unit</span>
                        <span className="font-mono font-extrabold text-slate-800">
                          Rp {(scannedItem.price || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2 text-[10.5px] text-slate-500 font-medium pb-4">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>Scan QR Berhasil. Data resmi terverifikasi dari Unit Sarana Prasarana (Sarpras) SMP Ma'arif NU Pandaan.</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsScanningActive(false)}
                      className="mt-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl tracking-wider uppercase cursor-pointer transition-colors shadow-sm"
                    >
                      Selesai
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Midtrans Snap Popup Orchestration (Supports both mock sandbox and real token inputs) */}
      <MidtransPayModal
        isOpen={isPayModalOpen}
        token={payToken}
        orderId={payOrderId}
        amount={payAmount}
        itemName={payItemName}
        isSimulated={payIsSimulated}
        onSuccess={handlePaymentSuccess}
        onClose={() => {
          setIsPayModalOpen(false);
          setPayToken(null);
          setPayOrderId(null);
          if (currentStudent) fetchStudentFullData(currentStudent.id);
        }}
      />

      {/* Spp online payment review step before Snap checkout */}
      <SppPaymentReviewModal
        isOpen={isSppReviewOpen}
        bill={sppReviewBill}
        studentName={sppReviewBill ? (studentsList.find(s => s.id === sppReviewBill.studentId) || currentStudent)?.name || "Siswa" : "Siswa"}
        studentNis={sppReviewBill ? (studentsList.find(s => s.id === sppReviewBill.studentId) || currentStudent)?.nis || "-" : "-"}
        studentClass={sppReviewBill ? (studentsList.find(s => s.id === sppReviewBill.studentId) || currentStudent)?.class || "-" : "-"}
        midtransStatus={sysStatus}
        onCancel={() => {
          setIsSppReviewOpen(false);
          setSppReviewBill(null);
        }}
        onConfirm={() => {
          setIsSppReviewOpen(false);
          if (sppReviewBill) {
            executePaySppSnap(sppReviewBill);
          }
          setSppReviewBill(null);
        }}
      />

      {/* Payment Success Verification Checklist Modal & Redirect Screen */}
      <AnimatePresence>
        {showPaymentSuccessScreen && (
          <div className="fixed inset-0 bg-slate-100 z-250 overflow-y-auto flex flex-col items-center justify-start py-8 px-4 md:px-6">
            
            {/* Screen layout Header, hidden in Print */}
            <div className="w-full max-w-lg text-center mb-6 print:hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shadow-3xs animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Sistem Pembayaran Online Terintegrasi</span>
              </div>
            </div>

            {/* Core Card wrapper that prints beautifully */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              id="print-receipt-section"
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 md:p-8 flex flex-col relative select-text print:border-none print:shadow-none print:p-0"
            >
              {/* Receipt Visual Header with School Deco */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-dashed border-slate-200 pb-5 sm:pb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center h-12 w-12 overflow-hidden relative">
                    {schoolIdentity.logo ? (
                      <img 
                        src={schoolIdentity.logo} 
                        className="w-full h-full object-contain" 
                        alt="Logo Sekolah" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <GraduationCap size={28} className="text-slate-700" />
                    )}
                  </div>
                  <div className="text-left">
                    <h1 className="font-black text-[13px] md:text-[14px] text-slate-850 uppercase tracking-tight leading-tight">
                      {schoolIdentity.name || "SMP MA'ARIF NU PANDAAN"}
                    </h1>
                    <span className="text-[9px] text-slate-450 block font-bold leading-none mt-0.5">UNIT BENDAHARA &amp; KEUANGAN SEKOLAH</span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase inline-block font-mono">
                    KUITANSI DIGITAL
                  </span>
                </div>
              </div>

              {/* Status Badge, decorated on screen, sleek on print */}
              <div className="flex flex-col items-center text-center my-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm animate-bounce shrink-0 print:hidden mb-3">
                  <CheckCircle2 size={32} className="stroke-[2.5]" />
                </div>
                <h2 className="text-xl font-black text-slate-905 tracking-tight leading-none uppercase">
                  Transaksi Berhasil!
                </h2>
                <div className="hidden print:block text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">
                  ✓ STATUS: LUNAS TERVERIFIKASI
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-2 max-w-[360px] print:text-slate-700">
                  Pembayaran Anda telah sukses divalidasi dan diupdate ke dalam database keuangan sekolah secara real-time.
                </p>
              </div>

              {/* Receipt Grid Body */}
              <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-4 md:p-5 flex flex-col gap-3.5 text-xs text-slate-700 print:bg-white print:border-slate-500 print:p-2">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 print:border-slate-300">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">ID Transaksi / Order ID:</span>
                  <span className="font-mono font-black text-slate-850 text-right uppercase select-all tracking-wider text-[11px]">
                    {payOrderId || 'ORD-MIDTRANS-' + Date.now().toString().slice(-6)}
                  </span>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 print:border-slate-300">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Waktu Pembayaran:</span>
                  <span className="font-semibold text-slate-850 text-right">
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, {timeStr || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'}
                  </span>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 print:border-slate-300">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Nama Siswa:</span>
                  <span className="font-black text-slate-850 text-right text-[11px] uppercase">{payStudentName || currentStudent?.name || "Siswa"}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-2.5 print:border-slate-300">
                  <div className="flex flex-col text-left">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">NIS Siswa:</span>
                    <span className="font-bold text-slate-800 font-mono mt-0.5">{payStudentNis || currentStudent?.nis || "-"}</span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Kelas:</span>
                    <span className="font-bold text-slate-800 mt-0.5">{payStudentClass || currentStudent?.class || "-"}</span>
                  </div>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 print:border-slate-300">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Jenis Uraian / Item:</span>
                  <span className="font-extrabold text-slate-800 text-right">{payItemName || 'SPP Bulanan'}</span>
                </div>

                <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 print:border-slate-300">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Metode Keuangan:</span>
                  <span className="font-bold text-slate-800 text-right">Midtrans Snap Online Gateway</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-black uppercase text-[10px] tracking-wider">Total Pembayaran:</span>
                  <span className="font-black text-base md:text-lg text-emerald-600 print:text-black">
                    Rp {payAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Digital QR Integrity Visual */}
              <div className="my-5 flex items-center gap-3.5 p-3.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-250 print:border-slate-400 print:bg-white text-left">
                <div className="p-1 bg-white rounded-lg border border-slate-200 shrink-0">
                  <QrCode size={40} className="text-slate-800 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wide">Tanda Terima Elektronik Sah</h4>
                  <p className="text-[9.5px] text-slate-405 leading-relaxed mt-0.5 print:text-slate-600">
                    Sertifikat token digital resmi diverifikasi oleh Midtrans Sandbox &amp; Sistem Keuangan SMP Ma'arif NU Pandaan.
                  </p>
                </div>
              </div>

              {/* Verified Checklist Process Stack on Screen, simplified */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 py-2.5 bg-slate-50/20 border-t border-b border-slate-150 text-[10px] text-slate-500 font-bold tracking-tight print:hidden">
                <span className="flex items-center gap-1 text-emerald-700">✓ Midtrans Diproses</span>
                <span className="flex items-center gap-1 text-emerald-700">✓ Dana Lunas</span>
                <span className="flex items-center gap-1 text-emerald-700">✓ Sistem Terupdate</span>
                <span className="flex items-center gap-1 text-emerald-700">✓ Kuitansi Digital Siap</span>
              </div>

              {/* Foot lock for the printed receipt page */}
              <div className="mt-6 pt-4 border-t border-dashed border-slate-250 text-center flex flex-col items-center gap-1">
                <span className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase font-mono">
                  {schoolIdentity.name || "SMP MA'ARIF NU PANDAAN"} &bull; LAPORAN TRANSAKSI AKTIF
                </span>
                <p className="text-[7.5px] text-slate-400 leading-normal max-w-[360px] print:text-slate-600">
                  Bukti Pembayaran Kuitansi Digital ini sah secara hukum dan diterbitkan secara elektronik oleh platform SIPAS (Sistem Informasi Spp &amp; Tabungan Siswa) Sekolah.
                </p>
              </div>

              {/* Screen action controls, strictly hidden in print */}
              <div className="flex flex-col gap-2.5 mt-6 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="py-2.5 px-4 bg-white border border-slate-250 hover:border-slate-800 text-slate-700 hover:text-slate-900 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                    <span>Cetak Kuitansi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentSuccessScreen(false);
                      setPayOrderId(null);
                      setPayStudentName('');
                      setPayStudentNis('');
                      setPayStudentClass('');
                      if (role === 'student' && currentStudent) {
                        fetchStudentFullData(currentStudent.id, false);
                      }
                      if (isFromRedirect) {
                        const cleanUrl = window.location.origin + '/';
                        window.history.replaceState({}, document.title, cleanUrl);
                        setIsFromRedirect(false);
                      }
                    }}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Ke Halaman Utama</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>

                {!isFromRedirect ? (
                  <>
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden relative">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute top-0 bottom-0 left-0 bg-emerald-500"
                      />
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-semibold text-center mt-1">
                      {role === 'student' ? (
                        `Kembali ke panel utama dalam ${successCountdown} detik...`
                      ) : (
                        `Menutup kuitansi digital dalam ${successCountdown} detik...`
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-500 font-bold text-center mt-2 bg-emerald-50/65 border border-emerald-150 px-3 py-1 rounded-xl">
                    📌 Mode Tinjau Kuitansi Terverifikasi &amp; Siap Diunduh/Dicetak
                  </p>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Top Header Branding */}
      <header className="bg-gradient-to-r from-blue-700 via-teal-600 to-emerald-600 border-b-4 border-emerald-400 shadow-lg text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Logo & School Name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1.5 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-800 self-center h-10 w-10 overflow-hidden">
                {schoolIdentity.logo ? (
                  <img 
                    src={schoolIdentity.logo} 
                    className="w-full h-full object-contain" 
                    alt="Logo Sekolah" 
                    referrerPolicy="no-referrer"
                    id="header-school-logo"
                  />
                ) : (
                  <GraduationCap size={24} className="stroke-[2.5]" />
                )}
              </div>
              {schoolIdentity.logo2 && (
                <div className="p-1.5 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-800 self-center h-10 w-10 overflow-hidden">
                  <img 
                    src={schoolIdentity.logo2} 
                    className="w-full h-full object-contain" 
                    alt="Logo Sekolah Kedua" 
                    referrerPolicy="no-referrer"
                    id="header-school-logo-2"
                  />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight uppercase leading-none text-yellow-300">
                {schoolIdentity.subheading || "Lembaga Pendidikan Maarif NU"}
              </h1>
              <h2 className="text-base font-bold tracking-tight text-white mt-0.5">
                {schoolIdentity.name || "SMP MA'ARIF NU PANDAAN"}
              </h2>
              <span className="text-[10px] text-emerald-100 block font-medium">
                Sistem Portal Administrasi &bull; {schoolIdentity.accreditation || "Terakreditasi A"}
              </span>
            </div>
          </div>

          {/* Time indicator and Toggle Sound */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Live UTC time converted to WIB */}
            <div className="bg-blue-950/40 border border-teal-500/30 px-3 py-1 rounded-lg text-right font-mono text-[11px] text-teal-100 flex items-center gap-1.5 shadow-inner">
              <Activity size={10} className="text-teal-300 animate-pulse" />
              <span>{timeStr || 'Memuat Jam...'}</span>
            </div>

            {/* Toggle audio */}
            <button
              onClick={() => {
                setPlayNotificationSound(!playNotificationSound);
                triggerBeep();
              }}
              className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 cursor-pointer font-bold ${
                playNotificationSound 
                  ? 'bg-emerald-800 border-emerald-700 text-yellow-300 hover:bg-emerald-750' 
                  : 'bg-emerald-950 border-emerald-900 text-emerald-500'
              }`}
              title={playNotificationSound ? "Matikan Suara Beep" : "Aktifkan Suara Beep"}
            >
              <Volume2 size={13} />
              <span className="text-[9px] uppercase tracking-wider">{playNotificationSound ? 'ON' : 'OFF'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Role Selector sub-nav bar / Auth Session status bar */}
      {isLoggedIn && (
        <div className="bg-white border-b border-slate-200 py-3 shadow-inner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peran Sesi Aktif:</span>
              {role === 'student' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-lg text-xs font-bold shadow-sm">
                  <GraduationCap size={13} className="text-emerald-700 font-bold" />
                  <span>Wali Murid / Siswa: {currentStudent?.name || 'Siswa'}</span>
                </div>
              ) : role === 'homeroom' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-850 border border-amber-150 rounded-lg text-xs font-bold shadow-sm">
                  <ClipboardCheck size={13} className="text-amber-700" />
                  <span>Wali Kelas: {loggedHomeroom?.name || 'Wali Kelas'} (Kelas {loggedHomeroom?.className})</span>
                </div>
              ) : role === 'subject_teacher' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-850 border border-teal-150 rounded-lg text-xs font-extrabold shadow-sm">
                  <ClipboardCheck size={13} className="text-teal-700" />
                  <span>Guru Mapel: {loggedSubjectTeacher?.name || 'Guru Mapel'} ({loggedSubjectTeacher?.subject})</span>
                </div>
              ) : role === 'treasurer' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-850 border border-rose-150 rounded-lg text-xs font-bold shadow-sm animate-pulse">
                  <ShieldCheck size={13} className="text-rose-700" />
                  <span>Bendahara: {schoolIdentity.treasurer}</span>
                </div>
              ) : role === 'principal' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-850 border border-violet-155 border-slate-200 rounded-lg text-xs font-bold shadow-sm">
                  <ShieldCheck size={13} className="text-indigo-700" />
                  <span>Kepala Sekolah: {schoolIdentity.principal}</span>
                </div>
              ) : role === 'bk' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-850 border border-indigo-150 rounded-lg text-xs font-bold shadow-sm">
                  <ShieldCheck size={13} className="text-indigo-700" />
                  <span>Guru BK</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-850 border border-indigo-150 rounded-lg text-xs font-bold shadow-sm animate-pulse">
                  <ShieldCheck size={13} className="text-indigo-700" />
                  <span>Staf Administrasi (Teller)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3.5 font-sans">
              <div className="flex items-center gap-1 text-[11px] text-emerald-850 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Kanal Real-time Aktif</span>
              </div>
              
              <div className={`w-px h-4 bg-slate-200 ${role === 'student' ? 'hidden lg:block' : ''}`} />

              {/* Tombol Lonceng untuk History Notif */}
              <button
                id="btn-trigger-notification-log"
                onClick={() => {
                  setIsNotifHistoryOpen(true);
                  if (globalNotifications.length > 0) {
                    const allIds = globalNotifications.map(n => n.id);
                    setReadNotifIds(prev => {
                      const merged = Array.from(new Set([...prev, ...allIds]));
                      localStorage.setItem('school_read_notif_ids', JSON.stringify(merged));
                      return merged;
                    });
                  }
                }}
                className={`relative items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-xs whitespace-nowrap ${role === 'student' ? 'hidden lg:flex' : 'flex'}`}
                title="Lihat Riwayat Notifikasi Sekolah"
              >
                <span className="relative flex h-4 w-4 items-center justify-center shrink-0">
                  <Bell size={13} className="animate-pulse text-indigo-600" />
                  {globalNotifications.filter(n => !readNotifIds.includes(n.id)).length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-650 bg-rose-600 text-[8px] font-extrabold text-white leading-none animate-pulse">
                      {globalNotifications.filter(n => !readNotifIds.includes(n.id)).length}
                    </span>
                  )}
                </span>
                <span className="hidden xs:inline">Riwayat Notifikasi</span>
              </button>

              <div className="w-px h-4 bg-slate-200" />

              <button
                id="btn-logout-portal"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50/50 text-slate-600 hover:text-rose-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <LogOut size={12} />
                <span>Keluar Sesi</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Core Stage Frame */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isLoggedIn ? (
          <Login
            students={studentsList}
            onLoginSuccess={handleLoginSuccess}
            schoolIdentity={schoolIdentity}
          />
        ) : role === 'student' ? (
          <StudentPanel
            students={studentsList}
            currentStudent={currentStudent}
            bills={studentBills}
            transactions={studentTransactions}
            isLoading={isLoading}
            onSelectStudent={(id) => fetchStudentFullData(id)}
            onPaySpp={handlePaySpp}
            onDepositSavings={handleDepositSavings}
            onWithdrawSavings={handleWithdrawSavings}
            onRefresh={handleReload}
            onChangePassword={handleChangePassword}
            isLoginLocked={true}
            schoolIdentity={schoolIdentity}
            attendanceLogs={attendanceList.filter(l => l.studentId === currentStudent?.id)}
            notifications={globalNotifications}
            onLogout={handleLogout}
          />
        ) : role === 'homeroom' ? (
          <HomeroomPanel
            currentTeacher={loggedHomeroom!}
            students={studentsList}
            attendanceLogs={attendanceList}
            bills={studentBills}
            schoolIdentity={schoolIdentity}
            onLogout={handleLogout}
            onSaveBatchAttendance={handleSaveBatchAttendance}
            onRefresh={handleReload}
            isLoading={isLoading}
            scannedStudentNis={scannedStudentNis}
            scannedStudentAt={scannedStudentAt}
          />
        ) : role === 'subject_teacher' ? (
          <SubjectTeacherPanel
            currentTeacher={loggedSubjectTeacher!}
            students={studentsList}
            attendanceLogs={attendanceList}
            schoolIdentity={schoolIdentity}
            onLogout={handleLogout}
            onRefresh={handleReload}
            isLoading={isLoading}
          />
        ) : role === 'treasurer' ? (
          <TreasurerPanel
            schoolIdentity={schoolIdentity}
            onLogout={handleLogout}
          />
        ) : role === 'principal' ? (
          <PrincipalPanel
            students={studentsList}
            bills={studentBills}
            attendanceLogs={attendanceList}
            homerooms={homeroomsList}
            subjectTeachers={subjectTeachersList}
            schoolIdentity={schoolIdentity}
            onUpdateSchoolIdentity={handleUpdateSchoolIdentity}
            onLogout={handleLogout}
            onRefresh={handleReload}
            isLoading={isLoading}
          />
        ) : role === 'waka_sarpras' ? (
          <WakaSarprasPanel
            schoolIdentity={schoolIdentity}
            onLogout={handleLogout}
            homerooms={homeroomsList}
            subjectTeachers={subjectTeachersList}
          />
        ) : role === 'bk' ? (
          <CounselorPanel
            schoolIdentity={schoolIdentity}
            onLogout={handleLogout}
            onRefresh={handleReload}
          />
        ) : (
          <AdminPanel
            students={studentsList}
            bills={studentBills}
            transactions={studentTransactions}
            isLoading={isLoading}
            midtransStatus={sysStatus}
            scannedStudentNis={scannedStudentNis}
            scannedStudentAt={scannedStudentAt}
            onPaySppManual={handlePaySppManual}
            onCancelSppManual={handleCancelSppManual}
            onPaySppViaMidtrans={handlePaySpp}
            adminSppBillToPrint={adminSppBillToPrint}
            onClearAdminSppBillToPrint={() => setAdminSppBillToPrint(null)}
            onDepositSavingsViaMidtrans={handleDepositSavings}
            adminSavingsToPrint={adminSavingsToPrint}
            onClearAdminSavingsToPrint={() => setAdminSavingsToPrint(null)}
            onSavingsManual={handleSavingsManual}
            onConfirmWithdrawal={handleConfirmWithdrawal}
            onBulkWithdrawSavings={handleBulkWithdrawSavings}
            onBroadcastNotification={handleBroadcastNotification}
            onRefresh={handleReload}
            onCreateStudent={handleCreateStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImportStudents}
            onImportTeachers={handleImportTeachers}
            schoolIdentity={schoolIdentity}
            onUpdateSchoolIdentity={handleUpdateSchoolIdentity}
            homerooms={homeroomsList}
            onCreateHomeroom={handleCreateHomeroom}
            onUpdateHomeroom={handleUpdateHomeroom}
            onDeleteHomeroom={handleDeleteHomeroom}
            subjectTeachers={subjectTeachersList}
            onCreateSubjectTeacher={handleCreateSubjectTeacher}
            onUpdateSubjectTeacher={handleUpdateSubjectTeacher}
            onDeleteSubjectTeacher={handleDeleteSubjectTeacher}
            onAutoGenerateSubjectTeachers={handleAutoGenerateSubjectTeachers}
            onLogout={handleLogout}
            attendanceLogs={attendanceList}
          />
        )}
      </main>

      {/* Bottom Footer block */}
      <footer className="hidden lg:block bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="m-0 text-slate-500">
            &copy; 2026 LP Ma'arif NU Pandaan. Hak Cipta Dilindungi Undang-Undang.
          </p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck size={12} /> Terverifikasi Midtrans Sandbox Secure API
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
