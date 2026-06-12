import React, { useState, useEffect, useMemo } from "react";
import { 
  LogOut, 
  RefreshCw, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  Loader2, 
  Brain, 
  User, 
  Calendar, 
  AlertCircle, 
  Printer, 
  ShieldCheck, 
  Key, 
  Grid, 
  Clock, 
  BookOpen, 
  Activity, 
  ChevronRight, 
  CheckSquare, 
  Award,
  Smartphone,
  Apple,
  HelpCircle,
  Home,
  LayoutGrid,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  UserCheck,
  Building,
  ArrowRight,
  TrendingUp,
  FileText,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudentCounselingLog, SchoolIdentity, AttendanceLog, StudentInfractionLog, Student } from "../types";
import BukuIndukManagement from "./BukuIndukManagement";

interface CounselorPanelProps {
  schoolIdentity?: SchoolIdentity;
  onLogout: () => void;
  onRefresh: () => void;
  onUpdateStudent: (id: string, data: any) => Promise<boolean>;
}

export default function CounselorPanel({ schoolIdentity, onLogout, onRefresh, onUpdateStudent }: CounselorPanelProps) {
  const [logs, setLogs] = useState<StudentCounselingLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [infractions, setInfractions] = useState<StudentInfractionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'home' | 'counseling' | 'attendance' | 'infractions' | 'buku_induk'>('home');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [classFilter, setClassFilter] = useState("all");

  // Date range filters for attendance & infractions
  const [attendanceStartDate, setAttendanceStartDate] = useState("");
  const [attendanceEndDate, setAttendanceEndDate] = useState("");
  const [infractionStartDate, setInfractionStartDate] = useState("");
  const [infractionEndDate, setInfractionEndDate] = useState("");

  // Secondary sub-tab states for custom list or aggregates
  const [attendanceSubTab, setAttendanceSubTab] = useState<'diary' | 'aggregate'>('aggregate');
  const [infractionSubTab, setInfractionSubTab] = useState<'list' | 'points' | 'reduction'>('points');

  // Suggestion & Solutions form state
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [bkFeedbackText, setBkFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Change Password State
  const [showPasswordTab, setShowPasswordTab] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Custom Quick Counseling draft state (auto-connect from infractions or absences)
  const [draftStudentName, setDraftStudentName] = useState("");
  const [draftClassName, setDraftClassName] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [draftSuccess, setDraftSuccess] = useState(false);

  // Point Reduction State
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [reductionStudentId, setReductionStudentId] = useState("");
  const [reductionStudentSearch, setReductionStudentSearch] = useState("");
  const [draftStudentSearch, setDraftStudentSearch] = useState("");
  const [reductionPoints, setReductionPoints] = useState(5);
  const [reductionReason, setReductionReason] = useState("");
  const [reductionDate, setReductionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reductionTime, setReductionTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [submittingReduction, setSubmittingReduction] = useState(false);

  // Load all integrated databases
  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resCouns, resAtt, resInf, resStud] = await Promise.all([
        fetch("/api/student-counseling-logs"),
        fetch("/api/attendance"),
        fetch("/api/student-infraction-logs"),
        fetch("/api/students")
      ]);

      if (resCouns.ok) {
        const data = await resCouns.json();
        setLogs(data);
      }
      if (resAtt.ok) {
        const data = await resAtt.json();
        setAttendance(data);
      }
      if (resInf.ok) {
        const data = await resInf.json();
        setInfractions(data);
      }
      if (resStud.ok) {
        const data = await resStud.json();
        setAllStudents(data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal melakukan sinkronisasi dengan database rekam sekolah.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reductionStudentId || !reductionPoints || !reductionReason.trim()) {
      alert("Mohon lengkapi seluruh field point reduction.");
      return;
    }

    const student = allStudents.find(s => s.id === reductionStudentId);
    if (!student) {
      alert("Siswa tidak ditemukan.");
      return;
    }

    setSubmittingReduction(true);
    try {
      const res = await fetch('/api/student-infraction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          className: student.class,
          date: reductionDate,
          time: reductionTime,
          location: "Ruang Bimbingan Konseling (BK)",
          infractionType: `Pengurangan Poin (BK): ${reductionReason.trim()}`,
          actionTaken: `Hasil pembinaan & bimbingan siswa selesai (Poin dikurangi ${reductionPoints})`,
          resolutionStatus: 'Selesai',
          points: -Math.abs(reductionPoints) // Save as a negative value!
        })
      });

      if (res.ok) {
        setSuccessMsg(`Berhasil mencatatkan pengurangan ${reductionPoints} poin tata tertib untuk ${student.name}.`);
        setReductionReason("");
        setReductionStudentId("");
        fetchAllData();
        onRefresh();
        setInfractionSubTab('points');
        
        // Auto dismiss success toast message after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Gagal mencatatkan pengurangan poin.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal terhubung ke server.");
    } finally {
      setSubmittingReduction(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleReload = () => {
    fetchAllData();
    onRefresh();
  };

  // Submit Saran & Rekomendasi Guru BK
  const handleSubmitFeedback = async (e: React.FormEvent, logId: string) => {
    e.preventDefault();
    if (!bkFeedbackText.trim()) {
      alert("Saran dan solusi tidak boleh kosong.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/student-counseling-logs/${logId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bkFeedback: bkFeedbackText.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.studentCounselingLogs);
        setSelectedLogId(null);
        setBkFeedbackText("");
        setSuccessMsg("Saran & Komitmen solusi berhasil dikirim langsung ke akun Wali Kelas terkait!");
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        alert("Gagal menyimpan saran. Coba hubungi administrator.");
      }
    } catch (err) {
      console.error(err);
      alert("Koneksi internet bermasalah.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi sandi baru tidak cocok.");
      return;
    }

    if (newPassword.length < 5) {
      setErrorMsg("Kriteria sandi minimal 5 karakter.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/bk/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      if (res.ok) {
        setSuccessMsg("Sandi akun konselor Guru BK berhasil diamankan.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Gagal memperbarui sandi.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Sandi gagal dikirim karena kendala sistem jaringan.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Print single counselor layout
  const handlePrintLog = (log: StudentCounselingLog) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak dokumen.");
      return;
    }

    const schoolName = schoolIdentity?.name || "SMP MA'ARIF NU PANDAAN";
    const subHeader = schoolIdentity?.subheading || "Penilaian Karakter, Bimbingan & Kebiasaan Positif";
    const accreditation = schoolIdentity?.accreditation || "Terakreditasi A";
    const address = schoolIdentity?.address || "Jl. Pandaan, Jawa Timur";
    const logoSrc = schoolIdentity?.logo || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Hasil Bimbingan & Konseling Sekolah</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: white; line-height: 1.5; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px double #0f172a; margin-bottom: 25px; padding-bottom: 10px; }
            .logo-cell { width: 70px; text-align: center; vertical-align: middle; }
            .info-cell { text-align: center; vertical-align: middle; }
            .school-name { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
            .school-sub { font-size: 11px; margin: 3px 0 0 0; color: #475569; font-weight: 600; }
            .school-meta { font-size: 9px; margin: 3px 0 0 0; color: #64748b; font-style: italic; }
            .title-doc { text-align: center; font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 25px 0; letter-spacing: 0.5px; text-decoration: underline; }
            .meta-info-table { width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; margin-bottom: 20px; }
            .meta-info-table th, .meta-info-table td { padding: 8px 12px; font-size: 11px; border: 1px solid #cbd5e1; text-align: left; }
            .meta-info-table th { background-color: #f8fafc; font-weight: bold; width: 25%; }
            .log-section { width: 100%; border: 1px solid #e2e8f0; border-collapse: collapse; margin-bottom: 20px; }
            .log-section th { background-color: #f1f5f9; font-size: 11px; font-weight: bold; padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
            .log-section td { font-size: 11px; padding: 12px; border: 1px solid #e2e8f0; vertical-align: top; background: #fff; }
            .block-text { margin: 0; font-size: 11px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
            .feedback-block { background-color: #f0fdf4 !important; border-left: 4px solid #16a34a; }
            .signatures { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 30px; margin-top: 50px; text-align: center; font-size: 11px; }
            .sig-space { height: 75px; }
            .sig-title { font-weight: bold; margin-bottom: 5px; }
            .footer-line { border-top: 1px solid #cbd5e1; font-size: 9px; font-style: italic; text-align: center; color: #94a3b8; margin-top: 50px; padding-top: 10px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              ${logoSrc ? `<td class="logo-cell"><img src="${logoSrc}" style="max-height: 60px; max-width: 60px;" /></td>` : ''}
              <td class="info-cell">
                <div class="school-name">${schoolName}</div>
                <div class="school-sub">${subHeader} - Akreditasi: ${accreditation}</div>
                <div class="school-meta">Alamat: ${address}</div>
              </td>
            </tr>
          </table>

          <div class="title-doc">DOKUMEN INTEGRASI PEMBINAAN BIMBINGAN & KONSELING (BK)</div>

          <table class="meta-info-table">
            <tr>
              <th>Nama Siswa Terkait</th>
              <td>${log.studentName}</td>
              <th>Wali Kelas Penginput</th>
              <td>Kelas ${log.className}</td>
            </tr>
            <tr>
              <th>Tanggal Konseling</th>
              <td>${new Date(log.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              <th>Waktu Audit Rekaman</th>
              <td>${new Date(log.createdAt).toLocaleString('id-ID')}</td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th>I. Topik / Deskripsi Permasalahan Siswa (Diinput Wali Kelas)</th>
            </tr>
            <tr>
              <td>
                <p class="block-text">"${log.topic}"</p>
              </td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th>II. Rencana Tindakan Advokasi & Mediasi Kelas</th>
            </tr>
            <tr>
              <td>
                <p class="block-text">"${log.actionPlan}"</p>
              </td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th>III. Komitmen Perubahan Perilaku & Hasil Akhir Siswa</th>
            </tr>
            <tr>
              <td>
                <p class="block-text">"${log.result}"</p>
              </td>
            </tr>
          </table>

          <table class="log-section">
            <tr>
              <th style="background-color: #dcfce7; color: #14532d;">IV. Saran Profesional, Intervensi &amp; Solusi Terarah Guru BK</th>
            </tr>
            <tr class="feedback-block">
              <td>
                <p class="block-text" style="color: #14532d; font-weight: bold;">
                  ${log.bkFeedback ? `"${log.bkFeedback}"` : "Belum diuraikan oleh Guru Konselor BK / dalam proses pengamatan khusus."}
                </p>
                ${log.bkFeedbackAt ? `<span style="font-size: 8px; color: #166534; display: block; margin-top: 5px;">Diselesaikan pada: ${new Date(log.bkFeedbackAt).toLocaleString('id-ID')}</span>` : ''}
              </td>
            </tr>
          </table>

          <div class="signatures">
            <div>
              <div class="sig-title">Wali Kelas Penginput</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Wali Kelas ${log.className} )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Kelas Terdaftar</div>
            </div>
            <div>
              <div class="sig-title">Guru Bimbingan Konseling</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( Guru Konselor BK )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. BK Terintegrasi</div>
            </div>
            <div>
              <div class="sig-title">Kepala Sekolah / Yayasan</div>
              <div class="sig-space"></div>
              <div style="text-decoration: underline; font-weight: bold;">( ${schoolIdentity?.principal || "Kepala Sekolah"} )</div>
              <div style="font-size: 9px; color: #64748b;">NIP. Penanggung Jawab</div>
            </div>
          </div>

          <div class="footer-line">
            Kerahasiaan dokumen bimbingan ini dilindungi di bawah kode etik Guru BK dilarang dibagikan ke pihak luar lembaga yang tidak berkepentingan resmi.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Get distinct classes from available logs for filters
  const uniqueClasses = useMemo(() => {
    const list = new Set<string>();
    logs.forEach(l => {
      if (l.className) list.add(l.className);
    });
    attendance.forEach(a => {
      // Find class name if available, otherwise skip
    });
    infractions.forEach(i => {
      if (i.className) list.add(i.className);
    });
    return Array.from(list).sort();
  }, [logs, attendance, infractions]);

  // Aggregate Attendance states grouping per student
  const aggregatedAttendance = useMemo(() => {
    const studentMap: { [key: string]: { id: string; name: string; className: string; hadir: number; sakit: number; izin: number; alpa: number; terlambat: number; total: number } } = {};

    attendance.forEach(log => {
      // Filter by date range if provided
      if (attendanceStartDate || attendanceEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (attendanceStartDate && d < attendanceStartDate) return;
        if (attendanceEndDate && d > attendanceEndDate) return;
      }

      const key = `${log.studentId}`;
      if (!studentMap[key]) {
        // Let's find student name from other logs or search
        let name = "Siswa Terdaftar";
        let cName = "7-A";

        // Try lookup in logs or infractions
        const foundC = logs.find(l => l.studentId === log.studentId);
        const foundI = infractions.find(i => i.studentId === log.studentId);
        if (foundC) {
          name = foundC.studentName;
          cName = foundC.className;
        } else if (foundI) {
          name = foundI.studentName;
          cName = foundI.className;
        }

        studentMap[key] = {
          id: log.studentId,
          name: name,
          className: cName,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          terlambat: 0,
          total: 0
        };
      }

      const status = log.status;
      if (status === 'Hadir') studentMap[key].hadir++;
      else if (status === 'Sakit') studentMap[key].sakit++;
      else if (status === 'Izin') studentMap[key].izin++;
      else if (status === 'Alpa') studentMap[key].alpa++;
      else if (status === 'Terlambat') studentMap[key].terlambat++;

      studentMap[key].total++;
    });

    return Object.values(studentMap);
  }, [attendance, logs, infractions, attendanceStartDate, attendanceEndDate]);

  // Aggregate Infractions (Leaderboard points)
  const aggregatedInfractions = useMemo(() => {
    const map: { [key: string]: { id: string; name: string; className: string; points: number; count: number; list: StudentInfractionLog[] } } = {};

    infractions.forEach(log => {
      // Filter by date range if provided
      if (infractionStartDate || infractionEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (infractionStartDate && d < infractionStartDate) return;
        if (infractionEndDate && d > infractionEndDate) return;
      }

      const key = `${log.studentId}`;
      if (!map[key]) {
        map[key] = {
          id: log.studentId,
          name: log.studentName,
          className: log.className,
          points: 0,
          count: 0,
          list: []
        };
      }
      map[key].points += (log.points || 0);
      map[key].count++;
      map[key].list.push(log);
    });

    return Object.values(map).sort((a, b) => b.points - a.points);
  }, [infractions, infractionStartDate, infractionEndDate]);

  // Warn Interventions: Students with high infractions (>10 pts) or High Alpa (>= 2 alpa)
  const interventionStudents = useMemo(() => {
    const list: { id: string; name: string; className: string; alpaCount: number; infractionPoints: number; reason: string }[] = [];

    // Check high infractions
    aggregatedInfractions.forEach(st => {
      if (st.points >= 15) {
        list.push({
          id: st.id,
          name: st.name,
          className: st.className,
          alpaCount: 0,
          infractionPoints: st.points,
          reason: `Poin pelanggaran kumulatif sangat tinggi (${st.points} poin). Butuh konseling moral bimbingan.`
        });
      }
    });

    // Check high alpa
    aggregatedAttendance.forEach(att => {
      if (att.alpa >= 2) {
        // Prevent duplicate
        const exist = list.find(l => l.id === att.id);
        if (!exist) {
          list.push({
            id: att.id,
            name: att.name,
            className: att.className,
            alpaCount: att.alpa,
            infractionPoints: 0,
            reason: `Sering absen tanpa keterangan (${att.alpa} hari Alpa). Indikasi putus sekolah atau problem keluarga.`
          });
        } else {
          exist.alpaCount = att.alpa;
          exist.reason = `Memiliki catatan ${att.alpa} hari Alpa & ${exist.infractionPoints} poin pelanggaran disiplin. Urgen pembinaan keluarga!`;
        }
      }
    });

    return list;
  }, [aggregatedAttendance, aggregatedInfractions]);

  // Counseling list filters mapping
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchMatch = 
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        log.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.className.toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch = 
        statusFilter === 'all' ? true :
        statusFilter === 'pending' ? !log.bkFeedback : !!log.bkFeedback;

      const classMatch = 
        classFilter === "all" ? true : log.className === classFilter;

      return searchMatch && statusMatch && classMatch;
    });
  }, [logs, searchQuery, statusFilter, classFilter]);

  // Attendance filter mapping
  const filteredAttendanceDiary = useMemo(() => {
    return attendance.filter(log => {
      // Find name from counseling / infractions
      let name = "Siswa Terdaftar";
      let cName = "7-A";
      const foundC = logs.find(l => l.studentId === log.studentId);
      const foundI = infractions.find(i => i.studentId === log.studentId);
      if (foundC) { name = foundC.studentName; cName = foundC.className; }
      else if (foundI) { name = foundI.studentName; cName = foundI.className; }

      const searchMatch = 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cName.toLowerCase().includes(searchQuery.toLowerCase());

      const classMatch = 
        classFilter === "all" ? true : cName === classFilter;

      // Filter by date range if provided
      if (attendanceStartDate || attendanceEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (attendanceStartDate && d < attendanceStartDate) return false;
        if (attendanceEndDate && d > attendanceEndDate) return false;
      }

      return searchMatch && classMatch;
    });
  }, [attendance, logs, infractions, searchQuery, classFilter, attendanceStartDate, attendanceEndDate]);

  const filteredAttendanceAggregate = useMemo(() => {
    return aggregatedAttendance.filter(st => {
      const searchMatch = st.name.toLowerCase().includes(searchQuery.toLowerCase());
      const classMatch = classFilter === "all" ? true : st.className === classFilter;
      return searchMatch && classMatch;
    });
  }, [aggregatedAttendance, searchQuery, classFilter]);

  // Infractions filter mapping
  const filteredInfractionsList = useMemo(() => {
    return infractions.filter(log => {
      const searchMatch = 
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.infractionType.toLowerCase().includes(searchQuery.toLowerCase());

      const classMatch = 
        classFilter === "all" ? true : log.className === classFilter;

      // Filter by date range if provided
      if (infractionStartDate || infractionEndDate) {
        const d = log.date ? log.date.substring(0, 10) : "";
        if (infractionStartDate && d < infractionStartDate) return false;
        if (infractionEndDate && d > infractionEndDate) return false;
      }

      return searchMatch && classMatch;
    });
  }, [infractions, searchQuery, classFilter, infractionStartDate, infractionEndDate]);

  const filteredInfractionsAggregate = useMemo(() => {
    return aggregatedInfractions.filter(st => {
      const searchMatch = st.name.toLowerCase().includes(searchQuery.toLowerCase());
      const classMatch = classFilter === "all" ? true : st.className === classFilter;
      return searchMatch && classMatch;
    });
  }, [aggregatedInfractions, searchQuery, classFilter]);

  // Trigger quick counseling creation (to draft and save a new counseling log)
  const handleInitiateCounseling = (studentName: string, className: string, problemReason: string) => {
    setDraftStudentName(studentName);
    setDraftClassName(className);
    setDraftReason(`Hasil pantauan BK: Siswa mengalami ${problemReason}`);
    setDraftSuccess(false);
    setActiveTab('counseling');
    setSelectedLogId("draft_new");
  };

  const submitDraftCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      // Find or generate synthetic details
      const response = await fetch("/api/student-counseling-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: `ST-${Math.floor(Math.random() * 90000) + 10000}`,
          studentName: draftStudentName,
          className: draftClassName,
          date: new Date().toISOString().split('T')[0],
          topic: draftReason,
          actionPlan: "Dipanggil langsung ke ruang BK oleh Guru Bimbingan Konseling.",
          result: "Diberikan arahan pembinaan khusus dan motivasi konseling terintegrasi.",
          bkFeedback: "Telah diberikan motivasi pengembangan diri terpadu."
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(prev => [data, ...prev]);
        setSelectedLogId(null);
        setSuccessMsg(`Berhasil menjadwalkan kasus bimbingan mandiri untuk ${draftStudentName}!`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        alert("Gagal menyimpan rekam bimbingan mandiri.");
      }
    } catch (e) {
      console.error(e);
      alert("Masalah komunikasi server.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Delete an infraction log 
  const handleDeleteInfraction = async (id: string) => {
    if (!window.confirm("Beneran ingin menghapus rekam pelanggaran siswa ini?")) return;
    try {
      const res = await fetch(`/api/student-infraction-logs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInfractions(prev => prev.filter(i => i.id !== id));
        setSuccessMsg("Berhasil menghapus rekam pelanggaran.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Statistics counters
  const stats = useMemo(() => {
    const totalC = logs.length;
    const resolvedC = logs.filter(l => !!l.bkFeedback).length;
    const pendingC = totalC - resolvedC;

    // Attendance stats of today / overall
    const totalAbsences = attendance.filter(a => a.status !== 'Hadir').length;
    const totalAlpa = attendance.filter(a => a.status === 'Alpa').length;

    // Infractions stats
    const totalI = infractions.length;
    const unresolvedI = infractions.filter(inf => inf.resolutionStatus !== 'Selesai').length;

    return { totalC, resolvedC, pendingC, totalAbsences, totalAlpa, totalI, unresolvedI };
  }, [logs, attendance, infractions]);

  // ================= EXCEL EXPORTS (Direct .xls creation matching Homeroom styles) =================
  const downloadExcelCounseling = () => {
    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();
    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Riwayat Bimbingan BK</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; }
  .title { font-size: 14pt; font-weight: bold; color: #4f46e5; }
  .school { font-size: 11pt; font-weight: bold; color: #334155; }
  .table-header { background-color: #f1f5f9; font-weight: bold; text-align: center; border: 1.5pt solid #cbd5e1; height: 30px; }
  .cell { border: 0.5pt solid #cbd5e1; padding: 6px; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="7" class="title">REKAPITULASI RIWAYAT JURNAL BIMBINGAN & KONSELING (BK)</td></tr>
    <tr><td colspan="7" class="school">${schoolNameUpper}</td></tr>
    <tr><td colspan="7">Tanggal Penarikan Data: ${new Date().toLocaleDateString('id-ID')}</td></tr>
    <tr></tr>
    <tr>
      <td class="table-header">No</td>
      <td class="table-header">Tangal Bimbingan</td>
      <td class="table-header">Nama Siswa</td>
      <td class="table-header">Kelas</td>
      <td class="table-header">Topik &amp; Kasus Masalah</td>
      <td class="table-header">Rencana Tindakan (Wali Kelas)</td>
      <td class="table-header">Saran, Solusi &amp; Intervensi Guru BK</td>
    </tr>
`;

    filteredLogs.forEach((l, index) => {
      excelHtml += `
    <tr>
      <td class="cell text-center">${index + 1}</td>
      <td class="cell text-center">${l.date}</td>
      <td class="cell text-left" style="font-weight:bold;">${l.studentName}</td>
      <td class="cell text-center" style="font-weight:bold; color:#4f46e5;">${l.className}</td>
      <td class="cell text-left">${l.topic}</td>
      <td class="cell text-left">${l.actionPlan}</td>
      <td class="cell text-left" style="background-color:#f0fdf4; color:#166534; font-weight:550;">${l.bkFeedback || "Belum ada rekomendasi solusi Guru BK"}</td>
    </tr>
`;
    });

    excelHtml += `
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `REKAP_BIMBINGAN_BK_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelAttendance = () => {
    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();
    const periodStr = `Periode: ${attendanceStartDate ? attendanceStartDate : 'Awal'} s.d ${attendanceEndDate ? attendanceEndDate : 'Akhir'}`;
    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Rekap Presensi BK</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; }
  .title { font-size: 14.5pt; font-weight: bold; color: #10b981; }
  .table-header { background-color: #f1f5f9; font-weight: bold; text-align: center; border: 1.5pt solid #cbd5e1; height: 28px; }
  .cell { border: 0.5pt solid #cbd5e1; padding: 5px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="9" class="title">REKAPITULASI PRESENSI KETIDAKHADIRAN MAJEMUK SISWA</td></tr>
    <tr><td colspan="9" style="font-weight:bold;">${schoolNameUpper} - PORTAL BK</td></tr>
    <tr><td colspan="9" style="color:#475569; font-style:italic;">${periodStr}</td></tr>
    <tr></tr>
    <tr>
      <td class="table-header">No</td>
      <td class="table-header">Nama Siswa</td>
      <td class="table-header">Kelas</td>
      <td class="table-header" style="background:#ecfdf5;color:#047857;">Hadir (H)</td>
      <td class="table-header" style="background:#eff6ff;color:#1d4ed8;">Sakit (S)</td>
      <td class="table-header" style="background:#fef9c3;color:#a16207;">Izin (I)</td>
      <td class="table-header" style="background:#fef2f2;color:#b91c1c;">Alpa (A)</td>
      <td class="table-header" style="background:#faf5ff;color:#6b21a8;">Terlambat (T)</td>
      <td class="table-header">Presentase Hadir</td>
    </tr>
`;

    filteredAttendanceAggregate.forEach((st, index) => {
      const parentHasRecord = st.total > 0;
      const rate = parentHasRecord ? Math.round((st.hadir / st.total) * 100) : 0;
      excelHtml += `
    <tr>
      <td class="cell text-center">${index + 1}</td>
      <td class="cell text-left" style="font-weight:bold;">${st.name}</td>
      <td class="cell text-center" style="font-weight:bold;">Kelas ${st.className}</td>
      <td class="cell text-center" style="color:#047857; font-weight:bold;">${st.hadir}</td>
      <td class="cell text-center" style="color:#1d4ed8;">${st.sakit}</td>
      <td class="cell text-center" style="color:#a16207;">${st.izin}</td>
      <td class="cell text-center" style="color:#b91c1c; font-weight:bold; background:#fef2f2;">${st.alpa}</td>
      <td class="cell text-center" style="color:#6b21a8;">${st.terlambat}</td>
      <td class="cell text-center" style="font-weight:black; color:#10b981;">${rate}%</td>
    </tr>
`;
    });

    excelHtml += `
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const startFilename = attendanceStartDate || "AWAL";
    const endFilename = attendanceEndDate || "AKHIR";
    link.download = `REKAP_PRESENSI_SISWA_BK_${startFilename}_TO_${endFilename}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcelInfractions = () => {
    const schoolNameUpper = (schoolIdentity?.name || 'SMP MAARIF NU PANDAAN').toUpperCase();
    const periodStr = `Periode: ${infractionStartDate ? infractionStartDate : 'Awal'} s.d ${infractionEndDate ? infractionEndDate : 'Akhir'}`;
    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Poin Pelanggaran Siswa</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; }
  .title { font-size: 14pt; font-weight: bold; color: #e11d48; }
  .table-header { background-color: #f1f5f9; font-weight: bold; text-align: center; border: 1.5pt solid #cbd5e1; height: 30px; }
  .cell { border: 0.5pt solid #cbd5e1; padding: 5px; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
</style>
</head>
<body>
  <table>
    <tr><td colspan="6" class="title">REKAPITULASI RIWAYAT POIN PELANGGARAN DISIPLIN SISWA</td></tr>
    <tr><td colspan="6" style="font-weight:bold;">${schoolNameUpper} - RUANG GURU BK</td></tr>
    <tr><td colspan="6" style="color:#475569; font-style:italic;">${periodStr}</td></tr>
    <tr></tr>
    <tr>
      <td class="table-header">No</td>
      <td class="table-header">Nama Siswa</td>
      <td class="table-header">Kelas</td>
      <td class="table-header">Jumlah Kasus Pelanggaran</td>
      <td class="table-header">Total Poin Akumulasi</td>
      <td class="table-header">Status Penanganan Terakhir</td>
    </tr>
`;

    filteredInfractionsAggregate.forEach((st, index) => {
      excelHtml += `
    <tr>
      <td class="cell text-center">${index + 1}</td>
      <td class="cell text-left" style="font-weight:bold;">${st.name}</td>
      <td class="cell text-center" style="font-weight:bold;">Kelas ${st.className}</td>
      <td class="cell text-center">${st.count} Kali</td>
      <td class="cell text-center" style="color:#e11d48; font-weight:bold; background:#faf5ff;">${st.points} Poin</td>
      <td class="cell text-center">${st.points >= 15 ? '⚠️ Butuh Panggilan Khusus' : 'Biasa'}</td>
    </tr>
`;
    });

    excelHtml += `
  </table>
</body>
</html>
`;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const startFilename = infractionStartDate || "AWAL";
    const endFilename = infractionEndDate || "AKHIR";
    link.download = `REKAP_PELANGGARAN_POIN_BK_${startFilename}_TO_${endFilename}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6" id="counselor-panel-root">
      
      {/* ================= DESKTOP HEADER (Selaras & Responsif) ================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 hidden sm:block">
            <Brain size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-[9px] uppercase tracking-wider">
              👥 GURU BK / KONSELOR SEKOLAH
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
              Portal Terpadu Bimbingan Konseling
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Sinergi bimbingan siswa, rekap presensi alpa, dan pantauan poin pelanggaran disiplin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={() => {
              setShowPasswordTab(!showPasswordTab);
              setShowMoreMenu(false);
            }}
            className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border shadow-2xs ${
              showPasswordTab 
                ? "bg-slate-800 text-white border-slate-900" 
                : "bg-white text-slate-700 border-slate-250 hover:bg-slate-50"
            }`}
          >
            <Key size={13} />
            <span>Sandi Keamanan</span>
          </button>
          
          <button
            onClick={handleReload}
            disabled={loading}
            className="cursor-pointer bg-white text-slate-700 border border-slate-250 hover:bg-slate-50 p-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center h-[38px] w-[38px]"
            title="Muat Ulang Seluruh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-slate-400" : "text-slate-600"} />
          </button>

          <button
            onClick={onLogout}
            className="cursor-pointer bg-rose-50 hover:bg-rose-100/90 text-rose-700 font-bold border border-rose-200/80 rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* ================= DESKTOP SIDEBAR OR TABS MENU (Non-Mobile) ================= */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-3xl">
        <button
          onClick={() => { setActiveTab('home'); setShowPasswordTab(false); }}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'home' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Home size={14} />
          <span>Home</span>
        </button>
        <button
          onClick={() => { setActiveTab('counseling'); setShowPasswordTab(false); }}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'counseling' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare size={14} />
          <span>Jurnal Bimbingan</span>
        </button>
        <button
          onClick={() => { setActiveTab('attendance'); setShowPasswordTab(false); }}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'attendance' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar size={14} />
          <span>Rekap Absensi</span>
        </button>
        <button
          onClick={() => { setActiveTab('infractions'); setShowPasswordTab(false); }}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'infractions' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle size={14} />
          <span>Poin Pelanggaran</span>
        </button>
        <button
          onClick={() => { setActiveTab('buku_induk'); setShowPasswordTab(false); }}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'buku_induk' && !showPasswordTab ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen size={14} />
          <span>Buku Induk</span>
        </button>
      </div>

      {showPasswordTab ? (
        /* PASSWORD TAB SCREEN */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-xl mx-auto w-full">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
            <span className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Ubah Sandi Keamanan Akun BK</h2>
              <p className="text-slate-500 text-[11px]">Silakan perbarui sandi secara berkala untuk menjaga kerahasiaan kasus sosial murid.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sandi Lama Guru BK</label>
              <input
                type="password"
                required
                placeholder="Masukkan sandi saat ini (default: bk123)"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sandi Baru</label>
              <input
                type="password"
                required
                placeholder="Masukkan pola sandi kuat baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Konfirmasi Sandi Baru</label>
              <input
                type="password"
                required
                placeholder="Ulangi isian sandi baru Anda"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowPasswordTab(false)}
                className="cursor-pointer px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Tutup Form
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                className="cursor-pointer px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-750 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {changingPassword ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Perbarui Sandi Aktif</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* MAIN AREA: CONDITIONAL RENDERING OF THE ACTIVE TAB */
        <div>
          {/* 1. STATUS SUMMARY BANNER FOR THE ENTIRE PORTAL */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">Jurnal BK Wali Kelas</span>
                <span className="text-xl font-black text-indigo-750">{stats.totalC} Catatan</span>
                <span className="text-[9px] text-slate-400 leading-normal mt-0.5">{stats.pendingC} belum dirumuskan BK</span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <MessageSquare size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-emerald-600 uppercase tracking-widest">Saran Terselesaikan</span>
                <span className="text-xl font-black text-emerald-800">{stats.resolvedC} Kasus</span>
                <span className="text-[9px] text-emerald-650 leading-normal mt-0.5">Sudah tersinkron ke Wali Kelas</span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckSquare size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-amber-600 uppercase tracking-widest">Total Ketidakhadiran</span>
                <span className="text-xl font-black text-amber-800">{stats.totalAbsences} Kalender</span>
                <span className="text-[9px] text-amber-650 leading-normal mt-0.5">Kumulatif Sakit, Izin, Alpa & Terlambat</span>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xxs flex items-center justify-between">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[9.5px] font-black text-rose-600 uppercase tracking-widest">Total Disiplin Melanggar</span>
                <span className="text-xl font-black text-rose-800">{stats.totalI} Laporan</span>
                <span className="text-[9px] text-rose-650 leading-normal mt-0.5">Pelanggaran aturan tata tertib</span>
              </div>
              <div className="p-3 bg-rose-50 text-rose-605 rounded-xl">
                <AlertCircle size={18} />
              </div>
            </div>
          </div>

          {/* RENDERING DYNAMIC SECTION VIEWS */}
          {activeTab === 'home' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Welcome box */}
              <div className="bg-gradient-to-r from-indigo-750 to-indigo-600 text-white rounded-3xl p-6 shadow-sm text-left relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
                  <Brain size={250} />
                </div>
                <div className="relative z-10 max-w-2xl">
                  <span className="bg-indigo-500/50 text-indigo-50 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest">INTEGRATED BK SYSTEM</span>
                  <h2 className="text-xl font-black mt-2">Selamat Datang, Konselor Guru BK</h2>
                  <p className="text-indigo-100 text-xs mt-1.5 leading-relaxed">
                    Sistem kini menghubungkan otomatis rekam absensi mampet (Wali Kelas) dan poin pelanggaran moralitas di gawai siswa langsung ke portal ini. Sila monitor analisis peringatan di bawah ini untuk intervensi tanggap darurat bimbingan siswa.
                  </p>
                </div>
              </div>

              {/* INTEGRATIVE INTERVENTION SCREENING (Menghubungkan absolut absensi + pelanggaran) */}
              <div className="bg-white border border-indigo-150 rounded-3xl p-6 shadow-xs text-left">
                <div className="flex justify-between items-center pb-4 border-b border-indigo-50 mb-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-rose-600 animate-bounce" /> Radar Deteksi Intervensi BK Kreatif (Sistem Pintar)
                    </h3>
                    <p className="text-slate-450 text-[11px] mt-0.5">
                      Menyaring siswa dengan ketidakhadiran berulang maupun akumulasi poin denda paling tinggi di angkatan sekolah.
                    </p>
                  </div>
                  <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-3 py-1 rounded-xl uppercase tracking-wider border border-rose-200">
                    ⚠️ Urgen Diperhatikan
                  </span>
                </div>

                {interventionStudents.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 font-semibold text-xs italic">
                    Belum ditemukan kondisi darurat ketidakhadiran alpa (&gt;=2 hari) atau poin pelanggaran ekstrem (&gt;=15). Keadaan lingkungan sekolah aman & tertib.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {interventionStudents.map((st) => (
                      <div key={st.id} className="p-4 bg-slate-50 border border-slate-250 rounded-2xl flex flex-col justify-between gap-3 flex-1">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="font-black text-xs text-slate-900">{st.name}</span>
                            <span className="text-[9.5px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">Kelas {st.className}</span>
                          </div>
                          <p className="text-[11px] text-slate-650 leading-relaxed font-semibold mt-1 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                             {st.reason}
                          </p>
                        </div>

                        <button
                          onClick={() => handleInitiateCounseling(st.name, st.className, st.reason)}
                          className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center inline-flex items-center justify-center gap-1"
                        >
                          <Brain size={12} />
                          <span>Buat Sesi Bimbingan Siswa BK ini 🧠</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RECENT RECORDS SNEAK PEEK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* A. Recent Absences */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xxs text-left flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <Calendar size={14} className="text-amber-500" /> Kejadian Absen Terakhir (Sakit/Alpa/Izin/Terlambat)
                    </span>
                    <button onClick={() => { setActiveTab('attendance'); setAttendanceSubTab('diary'); }} className="text-[10px] font-bold text-indigo-650 hover:underline">
                      Lihat Semua
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                    {attendance.slice(0, 5).map((a, i) => {
                      const statusColors: { [key: string]: string } = {
                        "Alpa": "bg-rose-50 text-rose-700 border-rose-200",
                        "Sakit": "bg-blue-50 text-blue-700 border-blue-200",
                        "Izin": "bg-amber-50 text-amber-700 border-amber-200",
                        "Terlambat": "bg-purple-50 text-purple-700 border-purple-200"
                      };
                      
                      // Find student info
                      const f = logs.find(log => log.studentId === a.studentId) || infractions.find(inf => inf.studentId === a.studentId);
                      const stdName = f ? f.studentName : "Siswa No Rekam " + a.studentId;
                      const cName = f ? f.className : "7-A";

                      return (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-105 rounded-xl text-[11px]">
                          <div className="text-left font-semibold">
                            <span className="font-extrabold text-slate-800 block text-xs leading-none mb-1">{stdName}</span>
                            <span className="text-slate-400 font-mono">Tgl: {a.date} | Kls: {cName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${statusColors[a.status] || "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            {a.status}
                          </span>
                        </div>
                      );
                    })}
                    {attendance.length === 0 && <span className="text-[11px] text-slate-400 text-center py-4">Belum ada rekam presensi harian masuk.</span>}
                  </div>
                </div>

                {/* B. Recent Infractions */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xxs text-left flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <AlertTriangle size={14} className="text-rose-500" /> Rekaman Kejadian Pelanggaran Terakhir
                    </span>
                    <button onClick={() => { setActiveTab('infractions'); setInfractionSubTab('list'); }} className="text-[10px] font-bold text-indigo-650 hover:underline">
                      Lihat Semua
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                    {infractions.slice(0, 5).map((inf, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-105 rounded-xl text-[11px]">
                        <div className="text-left font-semibold flex-1 pr-2">
                          <span className="font-extrabold text-slate-800 block text-xs leading-none mb-1">{inf.studentName}</span>
                          <span className="text-slate-500 font-medium block truncate-custom max-w-[200px] sm:max-w-xs">{inf.infractionType}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 block text-[10.5px]">+{inf.points || 0} Pts</span>
                          <span className="text-[8px] text-slate-400 font-mono mt-0.5 block">{inf.date}</span>
                        </div>
                      </div>
                    ))}
                    {infractions.length === 0 && <span className="text-[11px] text-slate-400 text-center py-4">Belum ada rekam pelanggaran tertib masuk.</span>}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* 2. TAB JURNAL BIMBINGAN GURU BK (Counseling List & Actions) */}
          {activeTab === 'counseling' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={16} className="text-indigo-600 font-bold" /> Jurnal Advokasi Sosial &amp; Bimbingan Konseling (BK)
                  </h2>
                  <p className="text-slate-450 text-[11px]">Gunakan form masukan solusi untuk secara instan menyinkronkan masukan bimbingan ke tabel portal Wali Kelas.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadExcelCounseling}
                  className="cursor-pointer bg-indigo-50 border border-indigo-250 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FileSpreadsheet size={13} />
                  <span>Ekspor Excel Bimbingan Rapi</span>
                </button>
              </div>

              {/* SEARCH & FILTERS FOR COUNSELING LIST */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-5 mb-5 border-b border-slate-100">
                
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari bimbingan berdasarkan nama siswa, topik, rincian kasus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pointer-events-auto rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status filter selection */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="all">Semua Riwayat</option>
                    <option value="pending">Menunggu Rekomendasi (Pending)</option>
                    <option value="resolved">Telah Ditanggapi (Resolved)</option>
                  </select>

                  {/* Class selection filter */}
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="all">Semua Tingkat Kelas</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* INTEGRATED DRAFT CUSTOM/MANDATORY BIMBINGAN BK FORM */}
              {selectedLogId === "draft_new" && (
                <div className="mb-6 p-5 border border-indigo-200 bg-indigo-50/20 rounded-2xl">
                  <div className="flex justify-between items-center pb-2 mb-4 border-b border-indigo-100">
                    <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1">
                      <Brain size={14} /> INISIASI MANDIRI KASUS BIMBINGAN BK BARU
                    </span>
                    <button onClick={() => setSelectedLogId(null)} className="text-[10px] font-extrabold text-rose-600 hover:underline">Batal</button>
                  </div>
                  <form onSubmit={submitDraftCounseling} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-150">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-indigo-950 flex items-center gap-1">
                          👤 Cari &amp; Pilih Siswa Cepat (Dari Database Sekolah)
                        </label>
                        {draftStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setDraftStudentSearch('')}
                            className="text-[9px] text-rose-500 hover:underline font-bold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="🔍 Tulis nama siswa atau NIS untuk memfilter list..."
                        value={draftStudentSearch}
                        onChange={(e) => setDraftStudentSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold placeholder-slate-400 focus:outline-none mb-1 shadow-2xs"
                      />
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const stud = allStudents.find(s => s.id === val);
                            if (stud) {
                              setDraftStudentName(stud.name);
                              setDraftClassName(stud.class);
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-205 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none py-1.5 px-2"
                      >
                        <option value="">-- Pilih Siswa (atau isi/ubah kolom manual di bawah) --</option>
                        {allStudents
                          .filter(s => {
                            if (!draftStudentSearch) return true;
                            const term = draftStudentSearch.toLowerCase();
                            return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                          })
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Kelas {s.class}) - NIS: {s.nis}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Nama Siswa Terkait</label>
                      <input
                        type="text"
                        value={draftStudentName}
                        onChange={(e) => setDraftStudentName(e.target.value)}
                        className="p-2 border border-slate-250 rounded-xl bg-white focus:outline-none text-xs font-semibold text-slate-800"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Tingkat Kelas</label>
                      <input
                        type="text"
                        placeholder="Contoh: 7-A"
                        value={draftClassName}
                        onChange={(e) => setDraftClassName(e.target.value)}
                        className="p-2 border border-slate-250 rounded-xl bg-white focus:outline-none text-xs font-semibold text-slate-800"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500">Uraian Alasan Hubungan Intervensi BK</label>
                      <textarea
                        value={draftReason}
                        onChange={(e) => setDraftReason(e.target.value)}
                        className="p-2.5 border border-slate-250 rounded-xl bg-white focus:outline-none text-xs font-semibold text-slate-800"
                        rows={2}
                        required
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-2 md:col-span-2">
                      <button type="button" onClick={() => setSelectedLogId(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs">Tutup</button>
                      <button type="submit" disabled={submittingFeedback} className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5">
                        {submittingFeedback ? <Loader2 size={12} className="animate-spin" /> : null}
                        <span>Jadwalkan Penanganan BK</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* LIST DISPLAY SECTION */}
              {loading ? (
                <div className="py-20 text-center flex flex-col justify-center items-center gap-3">
                  <Loader2 size={36} className="text-indigo-600 animate-spin" />
                  <span className="text-slate-450 text-xs font-extrabold tracking-widest uppercase">Sinkronisasi Jurnal Bimbingan Wali Kelas...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl py-14 px-4 text-center">
                  <MessageSquare size={24} className="text-slate-350 mx-auto mb-2" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tidak Ada Catatan Bimbingan</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">Silakan coba sesuaikan pencarian atau pilih filter status bimbingan lainnya.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {filteredLogs.map((log) => {
                    const isSelected = selectedLogId === log.id;
                    return (
                      <div 
                        key={log.id} 
                        className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white text-left ${
                          log.bkFeedback 
                            ? "border-slate-200 shadow-xxs hover:border-slate-350" 
                            : "border-amber-200 shadow-xs hover:shadow-sm"
                        }`}
                      >
                        
                        {/* Header card info */}
                        <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b ${
                          log.bkFeedback ? "bg-slate-50/75 border-slate-105" : "bg-amber-50/45 border-amber-100"
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs ${
                              log.bkFeedback 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}>
                              {log.className}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">{log.studentName}</h3>
                              <div className="flex items-center gap-2 text-[10px] text-slate-450 font-semibold mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} />
                                  <span>{log.date}</span>
                                </span>
                                <span>•</span>
                                <span>Wali Kelas {log.className}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                            {log.bkFeedback ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-850 font-black text-[9px] uppercase tracking-wider select-none">
                                <CheckCircle2 size={10} className="text-emerald-700" />
                                <span>Disaran BK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-850 font-black text-[9px] uppercase tracking-wider animate-pulse select-none">
                                <AlertCircle size={10} className="text-amber-700" />
                                <span>Butuh Solusi</span>
                              </span>
                            )}

                            <button
                              onClick={() => handlePrintLog(log)}
                              className="cursor-pointer p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 shadow-2xs transition-colors flex items-center justify-center bg-white"
                              title="Cetak Log Bimbingan Integrasi"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Content parts description */}
                        <div className="p-4 flex flex-col gap-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">📢 Kronologi Kejadian</span>
                              <p className="text-slate-700 text-xs leading-relaxed italic">"{log.topic}"</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">🧭 Upaya Wali Kelas</span>
                              <p className="text-slate-700 text-xs leading-relaxed italic">"{log.actionPlan}"</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">🏆 Komitmen Siswa</span>
                              <p className="text-slate-700 text-xs leading-relaxed italic">"{log.result}"</p>
                            </div>
                          </div>

                          {/* Suggested interventions/feedback section from Counselor */}
                          {log.bkFeedback && (
                            <div className="mt-1 p-3.5 bg-indigo-50/75 border border-indigo-150 rounded-xl flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>🧠 Rekomendasi Solusi Guru BK (Live di Wali Kelas)</span>
                                </span>
                                {log.bkFeedbackAt && (
                                  <span className="text-[9px] text-indigo-400 font-mono">
                                    {new Date(log.bkFeedbackAt).toLocaleString('id-ID')}
                                  </span>
                                )}
                              </div>
                              <p className="text-indigo-950 font-semibold text-xs leading-relaxed italic">
                                "{log.bkFeedback}"
                              </p>
                              <div className="flex justify-end mt-1.5 pt-1.5 border-t border-indigo-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(log.id);
                                    setBkFeedbackText(log.bkFeedback || "");
                                  }}
                                  className="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-805 transition-colors"
                                >
                                  📝 Edit Solusi / Saran BK
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Add counselor feedback form */}
                          {!log.bkFeedback && !isSelected && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLogId(log.id);
                                setBkFeedbackText("");
                              }}
                              className="cursor-pointer mt-1 py-2 px-3 border border-indigo-200 hover:border-indigo-350 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 w-full shadow-xxs"
                            >
                              <Brain size={13} />
                              <span>Uraikan Form Solusi &amp; Intervensi Guru BK untuk Wali Kelas</span>
                            </button>
                          )}

                          {/* Feedback Form (when active/selected) */}
                          {isSelected && (
                            <form 
                              onSubmit={(e) => handleSubmitFeedback(e, log.id)}
                              className="mt-2 text-left p-4 bg-slate-55 border border-slate-200 rounded-xl flex flex-col gap-3 shadow-inner bg-slate-50"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                  📝 FORM INPUT REKOMENDASI GURU BK
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(null);
                                    setBkFeedbackText("");
                                  }}
                                  className="cursor-pointer text-[10px] font-bold text-rose-600 hover:underline"
                                >
                                  Batal
                                </button>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-650">Saran, Solusi, atau Langkah Intervensi Profesional BK:</label>
                                <textarea
                                  value={bkFeedbackText}
                                  onChange={(e) => setBkFeedbackText(e.target.value)}
                                  placeholder="Contoh: Disarankan untuk memanggil orang tua siswa minggu depan, kami akan sediakan asesmen minat bakat terarah untuk menemukan problem belajarnya..."
                                  rows={3}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-550"
                                  required
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogId(null);
                                    setBkFeedbackText("");
                                  }}
                                  className="cursor-pointer py-1.5 px-3 bg-white text-slate-600 border border-slate-250 font-bold hover:bg-slate-100 rounded-lg text-xs"
                                >
                                  Tutup
                                </button>
                                <button
                                  type="submit"
                                  disabled={submittingFeedback}
                                  className="cursor-pointer py-1.5 px-4 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                  {submittingFeedback ? <Loader2 size={12} className="animate-spin" /> : null}
                                  <span>Simpan &amp; Kirim ke Wali Kelas</span>
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* 3. TAB MONITORING & REKAP ABSENSI SISWA ALPA */}
          {activeTab === 'attendance' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col gap-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={16} className="text-emerald-600 font-bold" /> Rekapitulasi Presensi &amp; Ketidakhadiran Kumulatif
                  </h2>
                  <p className="text-slate-450 text-[11px]">Amati siswa yang kerap mangkir kelas (Alpa) untuk diprioritaskan mendapat pembinaan mental bimbingan.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadExcelAttendance}
                  className="cursor-pointer bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FileSpreadsheet size={13} />
                  <span>Ekspor Excel Ketidakhadiran</span>
                </button>
              </div>

              {/* DUAL SELECTOR SUBTABS DIRECT ON SCREEN */}
              <div className="flex gap-2 border-b border-slate-100 pb-3">
                <button
                  onClick={() => setAttendanceSubTab('aggregate')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    attendanceSubTab === 'aggregate' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 bg-transparent hover:text-slate-700'
                  }`}
                >
                  Akumulasi Status per Siswa 📊
                </button>
                <button
                  onClick={() => setAttendanceSubTab('diary')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    attendanceSubTab === 'diary' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 bg-transparent hover:text-slate-700'
                  }`}
                >
                  Riwayat Harian Jurnal Presensi 📔
                </button>
              </div>

              {/* FILTERS PANEL */}
              <div className="flex flex-col gap-3 pb-2">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Masukkan nama siswa untuk melacak kehadiran..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pointer-events-auto rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
                    />
                  </div>
                  
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Kelas</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                {/* Saringan Tanggal Export & Tampilan */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/30 border border-emerald-100 p-3 rounded-2xl">
                  <div className="text-[11px] font-black text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Calendar size={13} className="text-emerald-600" />
                    <span>Filter Periode Tanggal BK:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">Mulai:</span>
                      <input
                        type="date"
                        value={attendanceStartDate}
                        onChange={(e) => setAttendanceStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">Sampai:</span>
                      <input
                        type="date"
                        value={attendanceEndDate}
                        onChange={(e) => setAttendanceEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    {(attendanceStartDate || attendanceEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStartDate("");
                          setAttendanceEndDate("");
                        }}
                        className="text-[10px] uppercase font-black tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Reset Saring
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RENDER ACTIVE ATTENDANCE DISPLAY */}
              {loading ? (
                <div className="py-20 text-center flex flex-col justify-center animate-pulse gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Mengalkulasi rekap presensi seluruh angkatan...
                </div>
              ) : attendanceSubTab === 'aggregate' ? (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="py-3 px-4 font-black text-slate-800">Nama Siswa</th>
                        <th className="py-3 px-4 font-black text-slate-850 text-center">Kelas</th>
                        <th className="py-3 px-2 font-black text-emerald-700 text-center">Hadir</th>
                        <th className="py-3 px-2 font-black text-indigo-700 text-center">Sakit</th>
                        <th className="py-3 px-2 font-black text-amber-700 text-center">Izin</th>
                        <th className="py-3 px-2 font-black text-rose-700 text-center">Alpa (A)</th>
                        <th className="py-3 px-2 font-black text-purple-700 text-center">Terlambat</th>
                        <th className="py-3 px-2 font-black text-slate-800 text-center">Rasio</th>
                        <th className="py-3 px-4 font-black text-indigo-650 text-center">Tindakan BK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredAttendanceAggregate.map((st, i) => {
                        const hasAlpaProblem = st.alpa >= 2;
                        return (
                          <tr key={i} className={`hover:bg-slate-50 bg-white ${hasAlpaProblem ? 'bg-rose-50/20' : ''}`}>
                            <td className="py-3 px-4 text-xs font-extrabold text-slate-900">{st.name}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">Kelas {st.className}</td>
                            <td className="py-3 px-2 text-center text-emerald-600 font-extrabold">{st.hadir}</td>
                            <td className="py-3 px-2 text-center text-indigo-600">{st.sakit}</td>
                            <td className="py-3 px-2 text-center text-amber-600">{st.izin}</td>
                            <td className={`py-3 px-2 text-center font-black ${st.alpa > 0 ? "text-rose-600 bg-rose-50" : "text-slate-400"}`}>{st.alpa}</td>
                            <td className="py-3 px-2 text-center text-purple-600">{st.terlambat}</td>
                            <td className="py-3 px-2 text-center font-black text-emerald-650 text-xs">
                              {st.total > 0 ? Math.round((st.hadir / st.total) * 100) : 0}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {st.alpa > 0 || st.terlambat > 0 ? (
                                <button
                                  onClick={() => handleInitiateCounseling(st.name, st.className, `${st.alpa} hari ALPA & ${st.terlambat} kali Terlambat`)}
                                  className="px-2 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-705 text-[10px] uppercase font-black tracking-wider rounded-lg transition-colors cursor-pointer"
                                >
                                  Inisiasi BK 🧠
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold">Baik/Tertib ✅</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAttendanceAggregate.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 font-medium italic">Tidak ada siswa yang termonitor absensi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="py-3 px-4 font-black">Tanggal</th>
                        <th className="py-3 px-4 font-black">Nama Siswa</th>
                        <th className="py-3 px-4 font-black text-center">Kelas</th>
                        <th className="py-3 px-4 font-black text-center">Status</th>
                        <th className="py-3 px-4 font-black">Catatan Keterangan Sakit/Alpa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredAttendanceDiary.map((a, i) => {
                        const f = logs.find(log => log.studentId === a.studentId) || infractions.find(inf => inf.studentId === a.studentId);
                        const name = f ? f.studentName : "Siswa No Registrasi " + a.studentId;
                        const cName = f ? f.className : "7-A";

                        return (
                          <tr key={i} className="hover:bg-slate-50 bg-white">
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">{a.date}</td>
                            <td className="py-3 px-4 font-extrabold text-slate-900">{name}</td>
                            <td className="py-3 px-4 text-center">Kelas {cName}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                                a.status === 'Alpa' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                a.status === 'Sakit' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                a.status === 'Izin' ? 'bg-amber-50 text-amber-750 border-amber-200' :
                                a.status === 'Terlambat' ? 'bg-purple-50 text-purple-750 border-purple-200' :
                                'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 italic text-[11px] font-medium">"{a.notes || "Tidak ada rincian daktili kelas"}"</td>
                          </tr>
                        );
                      })}
                      {filteredAttendanceDiary.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-medium italic">Belum ada riwayat presensi terekam saat ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. TAB TRACING POIN PELANGGARAN DISIPLIN */}
          {activeTab === 'infractions' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col gap-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-rose-600 font-bold" /> Deteksi Riwayat &amp; Poin Pelanggaran Siswa
                  </h2>
                  <p className="text-slate-450 text-[11px]">Siswa yang melampaui ambang batas poin tata tertib dapat langsung dipanggil bersama Wali Kelas untuk mediasi.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadExcelInfractions}
                  className="cursor-pointer bg-rose-50 border border-rose-250 hover:bg-rose-100 text-rose-800 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FileSpreadsheet size={13} />
                  <span>Ekspor Excel Poin Pelanggaran</span>
                </button>
              </div>

              {/* TRIPLE SELECTOR SUBTABS DIRECT ON SCREEN */}
              <div className="flex gap-2 border-b border-slate-100 pb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('points')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    infractionSubTab === 'points' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 bg-transparent hover:text-slate-700'
                  }`}
                >
                  Kumulatif Poin Tata Tertib 🏆
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('list')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    infractionSubTab === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 bg-transparent hover:text-slate-700'
                  }`}
                >
                  Daftar Kejadian Kasus Masuk 🚨
                </button>
                <button
                  type="button"
                  onClick={() => setInfractionSubTab('reduction')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    infractionSubTab === 'reduction' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-400 bg-transparent hover:text-emerald-700'
                  }`}
                >
                  Input Pengurangan Poin BK ❇️
                </button>
              </div>

              {/* FILTERS PANEL */}
              {infractionSubTab !== 'reduction' && (
                <div className="flex flex-col gap-3 pb-2">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Masukkan kata kunci nama siswa atau jenis pelanggaran..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pointer-events-auto rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Semua Kelas</option>
                      {uniqueClasses.map(c => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Saringan Tanggal Export & Tampilan */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50/30 border border-rose-100 p-3 rounded-2xl">
                    <div className="text-[11px] font-black text-rose-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Calendar size={13} className="text-rose-600" />
                      <span>Filter Periode Tanggal BK:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold">Mulai:</span>
                        <input
                          type="date"
                          value={infractionStartDate}
                          onChange={(e) => setInfractionStartDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold">Sampai:</span>
                        <input
                          type="date"
                          value={infractionEndDate}
                          onChange={(e) => setInfractionEndDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>
                      {(infractionStartDate || infractionEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setInfractionStartDate("");
                            setInfractionEndDate("");
                          }}
                          className="text-[10px] uppercase font-black tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Reset Saring
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENTS TO RENDER BASE ON INFRACTION SUBTAB */}
              {loading ? (
                <div className="py-20 text-center animate-pulse font-bold text-xs uppercase tracking-widest text-slate-400">
                  Mengalkulasi akumulasi poin kompilasi disiplin...
                </div>
              ) : infractionSubTab === 'points' ? (
                <div className="border border-slate-150 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200">
                        <th className="py-3 px-4 font-black">No</th>
                        <th className="py-3 px-4 font-black">Nama Siswa</th>
                        <th className="py-3 px-4 font-black text-center">Kelas</th>
                        <th className="py-3 px-4 font-black text-center">Frekuensi Melanggar</th>
                        <th className="py-3 px-4 font-black text-center">Akumulasi Poin Sanksi</th>
                        <th className="py-3 px-4 font-black text-center">Predikat / Bahaya</th>
                        <th className="py-3 px-4 font-black text-center">Tindakan Advokasi BK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredInfractionsAggregate.map((st, idx) => {
                        const isSevere = st.points >= 15;
                        const isMedium = st.points >= 5 && st.points < 15;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50 bg-white ${isSevere ? "bg-rose-50/20" : ""}`}>
                            <td className="py-3 px-4 font-mono text-slate-450 text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 font-extrabold text-slate-900">{st.name}</td>
                            <td className="py-3 px-4 text-center">Kelas {st.className}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-600">{st.count} Kali Kejadian</td>
                            <td className={`py-3 px-4 text-center font-black ${isSevere ? "text-rose-700 bg-rose-50" : isMedium ? "text-amber-700" : "text-slate-700"}`}>
                              {st.points} Poin denda
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isSevere ? (
                                <span className="px-2 py-0.5 font-bold text-[9px] bg-rose-100 text-rose-800 border border-rose-200 rounded uppercase">⚠️ Urgen Advokasi</span>
                              ) : isMedium ? (
                                <span className="px-2 py-0.5 font-bold text-[9px] bg-amber-100 text-amber-800 border border-amber-200 rounded uppercase">Peringatan Ringan</span>
                              ) : (
                                <span className="px-2 py-0.5 font-bold text-[9px] bg-slate-100 text-slate-650 border border-slate-200 rounded uppercase">Wajar / Normal</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleInitiateCounseling(st.name, st.className, `Total akumulasi ${st.points} Poin Pelanggaran tata tertib`)}
                                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-150 text-indigo-700 text-[10.5px] uppercase font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Brain size={11} /> Solusi BK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReductionStudentId(st.id);
                                    setInfractionSubTab('reduction');
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-150 hover:bg-emerald-100 text-emerald-800 text-[10.5px] uppercase font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>❇️ Kurangi Poin</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredInfractionsAggregate.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 font-medium italic">Tidak ditemukan kejadian pelanggaran murid terdaftar.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : infractionSubTab === 'reduction' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xxs">
                  <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-205">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                      ❇️
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">Form Pengurangan Poin Tata Tertib Siswa</h3>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight">Pengurangan poin ini akan terhubung secara realtime ke portal Wali Kelas, Kepala Sekolah, dan portal Akun Siswa.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitReduction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-slate-550 flex items-center gap-1">
                          👤 Pilih Siswa Terkait
                        </label>
                        {reductionStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setReductionStudentSearch('')}
                            className="text-[9px] text-rose-500 hover:underline font-bold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="🔍 Tulis nama murid atau NIS untuk mencari..."
                        value={reductionStudentSearch}
                        onChange={(e) => setReductionStudentSearch(e.target.value)}
                        className="p-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-1"
                      />
                      <select
                        value={reductionStudentId}
                        onChange={(e) => setReductionStudentId(e.target.value)}
                        className="p-2.5 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 pointer-events-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      >
                        <option value="">
                          {reductionStudentSearch
                            ? `-- Hasil Pencarian (${allStudents.filter(s => s.name.toLowerCase().includes(reductionStudentSearch.toLowerCase()) || (s.nis && s.nis.toLowerCase().includes(reductionStudentSearch.toLowerCase()))).length} ditemukan) --`
                            : "-- Pilih Siswa --"}
                        </option>
                        {allStudents
                          .filter(s => {
                            if (!reductionStudentSearch) return true;
                            const term = reductionStudentSearch.toLowerCase();
                            return s.name.toLowerCase().includes(term) || (s.nis && s.nis.toLowerCase().includes(term));
                          })
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Kelas {s.class}) - NIS: {s.nis}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        ⭐ Besaran Poin yang Dikurangi
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={reductionPoints}
                        onChange={(e) => setReductionPoints(Number(e.target.value))}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left font-semibold">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        📅 Tanggal Penyesuaian
                      </label>
                      <input
                        type="date"
                        value={reductionDate}
                        onChange={(e) => setReductionDate(e.target.value)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left font-semibold">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        ⏱️ Waktu (WIB / Setempat)
                      </label>
                      <input
                        type="time"
                        value={reductionTime}
                        onChange={(e) => setReductionTime(e.target.value)}
                        className="p-2 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left font-semibold md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-555 flex items-center gap-1">
                        📝 Alasan Pengurangan Poin (Apresiasi / Perilaku Baik / Hasil Pembinaan BK)
                      </label>
                      <textarea
                        value={reductionReason}
                        onChange={(e) => setReductionReason(e.target.value)}
                        placeholder="Contoh: Siswa menunjukkan komitmen peningkatan kehadiran yang konsisten pasca pembinaan bimbingan bimbingan konseling dan aktif membantu KBM kelas..."
                        className="p-3 border border-slate-250 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2 md:col-span-2 border-t border-slate-205 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setInfractionSubTab('points');
                          setReductionReason("");
                          setReductionStudentId("");
                        }}
                        className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReduction}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {submittingReduction ? <Loader2 size={12} className="animate-spin" /> : null}
                        <span>Simpan &amp; Kurangi Poin Siswa</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredInfractionsList.map((log) => (
                    <div key={log.id} className="p-4 bg-slate-50 border border-slate-220 rounded-2xl flex flex-col gap-2 relative">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          {log.points && log.points < 0 ? (
                            <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded mr-2 inline-block">❇️ Apresiasi BK</span>
                          ) : (
                            <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded mr-2 inline-block">🚨 Kasus</span>
                          )}
                          <span className="font-extrabold text-xs text-slate-905">{log.studentName} (Kelas {log.className})</span>
                          <h4 className={`font-extrabold text-sm mt-1 mb-0.5 ${log.points && log.points < 0 ? 'text-emerald-800' : 'text-rose-900'}`}>{log.infractionType}</h4>
                        </div>
                        <div className="text-right">
                          {log.points && log.points < 0 ? (
                            <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded font-mono text-xs block text-center">
                              {log.points} pt
                            </span>
                          ) : (
                            <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 font-mono text-xs block text-center">
                              +{log.points || 0} pt
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium mt-1.5 block leading-none">{log.date} ({log.time})</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-150 pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-1 py-1 text-slate-650 text-xs">
                        <div>
                          <strong>Tindakan Wali/Guru:</strong> <span className="italic">"{log.actionTaken}"</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 font-bold text-[9px] uppercase tracking-wider rounded border ${
                            log.resolutionStatus === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                            log.resolutionStatus === 'Dalam Proses' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                            'bg-slate-100 text-slate-500 border-slate-205'
                          }`}>
                            {log.resolutionStatus}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteInfraction(log.id)}
                            className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 p-1.5 rounded-lg text-xs font-black transition-colors"
                            title="Hapus Rekam"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredInfractionsList.length === 0 && (
                    <span className="text-slate-400 text-xs font-medium py-8 text-center bg-slate-50 border border-dashed rounded-2xl block">Tidak ada kasus melanggar terdaftar.</span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* 5. TAB BUKU INDUK SISWA INTEGRATED */}
          {activeTab === 'buku_induk' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <BukuIndukManagement
                students={allStudents}
                onUpdateStudent={onUpdateStudent}
                onRefresh={fetchAllData}
              />
            </motion.div>
          )}

        </div>
      )}

      {/* ================= PERSISTENT BOTTOM NAVIGATION BAR (Selaras di Semua Akun) ================= */}
      <div 
        style={{ contentVisibility: 'auto' }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-2 flex md:hidden justify-around items-center h-16"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'home' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Home size={20} className={activeTab === 'home' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'home' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('counseling');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'counseling' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <MessageSquare size={20} className={activeTab === 'counseling' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'counseling' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Bimbingan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('attendance');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'attendance' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <Calendar size={20} className={activeTab === 'attendance' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'attendance' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Absensi</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('infractions');
            setShowPasswordTab(false);
            setShowMoreMenu(false);
          }}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'infractions' && !showPasswordTab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <AlertTriangle size={20} className={activeTab === 'infractions' && !showPasswordTab ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${activeTab === 'infractions' && !showPasswordTab ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Pelanggaran</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMoreMenu(prev => !prev)}
          className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all"
        >
          <div className={`p-1.5 rounded-xl transition-colors ${(showPasswordTab || showMoreMenu) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
            <LayoutGrid size={20} className={(showPasswordTab || showMoreMenu) ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
          </div>
          <span className={`text-[9.5px] leading-none ${(showPasswordTab || showMoreMenu) ? 'text-indigo-650 font-bold' : 'text-slate-400'}`}>Lainnya</span>
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
              className="fixed bottom-16 left-0 right-0 z-45 bg-white border-t border-slate-200 rounded-t-3xl p-6 shadow-xl text-left flex flex-col gap-4 max-h-[80vh] overflow-y-auto pb-10"
            >
              <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Lainnya</span>
                  <h4 className="text-slate-900 font-extrabold text-sm mt-0.5 font-bold">Portal Administrasi BK</h4>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1 px-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setActiveTab('buku_induk');
                    setShowPasswordTab(false);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left py-3 px-4 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/50 flex items-center gap-3 text-indigo-900 font-extrabold text-xs"
                >
                  <BookOpen size={16} className="text-indigo-600 shrink-0" />
                  <span>📗 Buku Induk Siswa (Master Ledger)</span>
                </button>

                <button
                  onClick={() => {
                    setShowPasswordTab(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left py-3 px-4 rounded-xl border border-slate-150 hover:bg-slate-50 flex items-center gap-3 text-slate-705 font-bold text-xs"
                >
                  <Key size={16} className="text-amber-500 shrink-0 text-slate-500 hover:text-slate-800" />
                  <span>Atur Password Akun Guru BK</span>
                </button>

                <div className="mt-2 py-1 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">📑 Ekspor Laporan Excel (.xls)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => { downloadExcelCounseling(); setShowMoreMenu(false); }}
                      className="py-2.5 px-3 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10.5px] font-extrabold text-center transition-all flex items-center justify-center gap-1"
                    >
                      <FileSpreadsheet size={12} />
                      <span>Excel Bimbingan 🧠</span>
                    </button>
                    <button
                      onClick={() => { downloadExcelAttendance(); setShowMoreMenu(false); }}
                      className="py-2.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10.5px] font-extrabold text-center transition-all flex items-center justify-center gap-1"
                    >
                      <Calendar size={12} />
                      <span>Excel Absensi 📊</span>
                    </button>
                    <button
                      onClick={() => { downloadExcelInfractions(); setShowMoreMenu(false); }}
                      className="py-2.5 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10.5px] font-extrabold text-center transition-all flex items-center justify-center gap-1"
                    >
                      <AlertTriangle size={12} />
                      <span>Excel Disiplin 🚨</span>
                    </button>
                  </div>
                </div>

                {/* Mobile app install links */}
                <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">📲 Download Aplikasi Mobile Sekolah</span>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={schoolIdentity?.apkUrl || "#"}
                      target={schoolIdentity?.apkUrl ? "_blank" : undefined}
                      onClick={(e) => {
                        if (!schoolIdentity?.apkUrl) { e.preventDefault(); alert("Unduhan Android belum disiapkan admin sekolah."); }
                      }}
                      className="py-2.5 px-3 rounded-lg border border-slate-150 text-slate-700 bg-slate-50 font-bold text-[10.5px] text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      <Smartphone size={12} className="text-emerald-600" />
                      <span>Download APK Android</span>
                    </a>
                    <a
                      href={schoolIdentity?.iosUrl || "#"}
                      target={schoolIdentity?.iosUrl ? "_blank" : undefined}
                      onClick={(e) => {
                        if (!schoolIdentity?.iosUrl) { e.preventDefault(); alert("Unduhan App Store iOS belum disiapkan admin sekolah."); }
                      }}
                      className="py-2.5 px-3 rounded-lg border border-slate-150 text-slate-700 bg-slate-50 font-bold text-[10.5px] text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      <Apple size={12} className="text-sky-600" />
                      <span>Download iOS App</span>
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-center py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100/90 text-rose-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Log Out Keluar Akun</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Safety spacing under content for fixed bottom offset on mobile viewports */}
      <div className="h-16 md:hidden"></div>

    </div>
  );
}
