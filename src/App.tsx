import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, SppBill, SavingsTransaction, RealtimeNotification, SchoolIdentity, HomeroomTeacher, AttendanceLog } from './types';
import StudentPanel from './components/StudentPanel';
import AdminPanel from './components/AdminPanel';
import HomeroomPanel from './components/HomeroomPanel';
import Login from './components/Login';
import NotificationToast from './components/NotificationToast';
import MidtransPayModal from './components/MidtransPayModal';
import { GraduationCap, Bell, Users, Landmark, CreditCard, ShieldCheck, HelpCircle, Activity, ChevronRight, Volume2, LogOut, ClipboardCheck, X, Trash2, ArrowDownLeft, ArrowUpRight, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function App() {
  // Authed state persistence
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('smp_maarif_logged_in') === 'true';
  });
  const [role, setRole] = useState<'student' | 'admin' | 'homeroom'>(() => {
    return (localStorage.getItem('smp_maarif_role') as 'student' | 'admin' | 'homeroom') || 'student';
  });
  const [loggedStudentId, setLoggedStudentId] = useState<string | null>(() => {
    return localStorage.getItem('smp_maarif_student_id');
  });
  const [loggedHomeroom, setLoggedHomeroom] = useState<HomeroomTeacher | null>(() => {
    const raw = localStorage.getItem('smp_maarif_logged_homeroom');
    return raw ? JSON.parse(raw) : null;
  });

  // School data states
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentBills, setStudentBills] = useState<SppBill[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<SavingsTransaction[]>([]);
  const [globalNotifications, setGlobalNotifications] = useState<RealtimeNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<RealtimeNotification[]>([]);
  const [isNotifHistoryOpen, setIsNotifHistoryOpen] = useState<boolean>(false);
  const [notifSearchQuery, setNotifSearchQuery] = useState<string>('');
  const [attendanceList, setAttendanceList] = useState<AttendanceLog[]>([]);
  const [homeroomsList, setHomeroomsList] = useState<HomeroomTeacher[]>([]);
  
  // School Identity state
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>({
    name: "SMP MA'ARIF NU PANDAAN",
    subheading: "LP MA'ARIF NU CABANG PASURUAN",
    accreditation: "Terakreditasi A",
    address: "Jl. Dr. Sutomo No. 1, Pandaan, Pasuruan, Jawa Timur",
    phone: "(0343) 631234",
    principal: "H. Ahmad Fuad, S.Pd, M.PdI",
    treasurer: "Bendahara Madrasah NU",
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

      // Load Recent notifications history
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setGlobalNotifications(notifData);
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
      const keysRes = await fetch('/api/midtrans-config');
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setSysStatus(keysData);
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

  const handleLoginSuccess = (userRole: 'student' | 'admin' | 'homeroom', student: Student | null, homeroom: HomeroomTeacher | null) => {
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
    } else if (userRole === 'homeroom' && homeroom) {
      setLoggedHomeroom(homeroom);
      localStorage.setItem('smp_maarif_logged_homeroom', JSON.stringify(homeroom));
      setLoggedStudentId(null);
      localStorage.removeItem('smp_maarif_student_id');
      fetchStudentFullData('', true);
    } else {
      setLoggedStudentId(null);
      localStorage.removeItem('smp_maarif_student_id');
      setLoggedHomeroom(null);
      localStorage.removeItem('smp_maarif_logged_homeroom');
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
    localStorage.removeItem('smp_maarif_logged_in');
    localStorage.removeItem('smp_maarif_role');
    localStorage.removeItem('smp_maarif_student_id');
    localStorage.removeItem('smp_maarif_logged_homeroom');
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

  // 3. SPP Payment Initializer (Midtrans Token Charge)
  const handlePaySpp = async (bill: SppBill) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/pay-spp-snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: bill.id })
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
          amount
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

  // 5. Simulated Withdrawal request from client-side
  const handleWithdrawSavings = async (amount: number, notes: string): Promise<boolean> => {
    if (!currentStudent) return false;
    try {
      const res = await fetch('/api/admin/savings-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentStudent.id,
          type: 'withdrawal',
          amount,
          notes
        })
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
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
  const handleCreateStudent = async (studentData: { nis: string; name: string; class: string; email: string; phone: string; initialSavings: number }): Promise<boolean> => {
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
  const handleUpdateStudent = async (id: string, studentData: { nis: string; name: string; class: string; email: string; phone: string }): Promise<boolean> => {
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
  const handleImportStudents = async (list: Array<{ nis: string; name: string; class: string; email: string; phone: string; initialSavings: number }>): Promise<{ success: boolean; addedCount: number; updatedCount: number }> => {
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
    setPayOrderId(null);
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
                          <span className="text-[9px] font-mono text-slate-400 block mb-0.5">
                            {formatNotifTime(notif.createdAt)}
                          </span>
                          <h4 className="font-bold text-xs text-slate-800 leading-tight">
                            {notif.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed break-words font-medium">
                            {notif.message}
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
              
              <div className="w-px h-4 bg-slate-200" />

              {/* Tombol Lonceng untuk History Notif */}
              <button
                id="btn-trigger-notification-log"
                onClick={() => setIsNotifHistoryOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-xs whitespace-nowrap"
                title="Lihat Riwayat Notifikasi Sekolah"
              >
                <span className="relative flex h-4 w-4 items-center justify-center shrink-0">
                  <Bell size={13} className="animate-pulse text-indigo-600" />
                  {globalNotifications.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-650 bg-rose-600 text-[8px] font-extrabold text-white leading-none">
                      {globalNotifications.length}
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
          />
        ) : (
          <AdminPanel
            students={studentsList}
            bills={studentBills}
            transactions={studentTransactions}
            isLoading={isLoading}
            midtransStatus={sysStatus}
            onPaySppManual={handlePaySppManual}
            onPaySppViaMidtrans={handlePaySpp}
            adminSppBillToPrint={adminSppBillToPrint}
            onClearAdminSppBillToPrint={() => setAdminSppBillToPrint(null)}
            onDepositSavingsViaMidtrans={handleDepositSavings}
            adminSavingsToPrint={adminSavingsToPrint}
            onClearAdminSavingsToPrint={() => setAdminSavingsToPrint(null)}
            onSavingsManual={handleSavingsManual}
            onBroadcastNotification={handleBroadcastNotification}
            onRefresh={handleReload}
            onCreateStudent={handleCreateStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onImportStudents={handleImportStudents}
            schoolIdentity={schoolIdentity}
            onUpdateSchoolIdentity={handleUpdateSchoolIdentity}
            homerooms={homeroomsList}
            onCreateHomeroom={handleCreateHomeroom}
            onUpdateHomeroom={handleUpdateHomeroom}
            onDeleteHomeroom={handleDeleteHomeroom}
          />
        )}
      </main>

      {/* Bottom Footer block */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs mt-auto">
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
