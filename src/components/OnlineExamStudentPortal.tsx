import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  RefreshCw,
  HeartPulse,
  BookOpen,
  Award,
  Lock,
  Navigation,
  Check,
  Maximize2
} from 'lucide-react';
import {
  OnlineExamPacket,
  OnlineExamQuestion,
  OnlineExamSchedule,
  OnlineExamSubmission,
  Student
} from '../types';

interface OnlineExamStudentPortalProps {
  student: Student;
  onExamSubmitted?: () => void;
}

interface EnrichedStudentSchedule extends OnlineExamSchedule {
  isCurrentlyOpenWib: boolean;
  scheduleStatusWib: 'belum_mulai' | 'berlangsung' | 'selesai' | 'nonaktif';
  gpsEvaluation?: {
    isSickStudent: boolean;
    sickReason: string;
    allowedRadiusMeters: number;
    targetCenterLat: number;
    targetCenterLng: number;
    distanceMeters: number | null;
    gpsAllowed: boolean;
    gpsMessage: string;
  };
  studentSubmission?: OnlineExamSubmission | null;
}

export const OnlineExamStudentPortal: React.FC<OnlineExamStudentPortalProps> = ({
  student,
  onExamSubmitted
}) => {
  const [schedules, setSchedules] = useState<EnrichedStudentSchedule[]>([]);
  const [currentWibStr, setCurrentWibStr] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Exam Taking State (in-memory only + direct MySQL, NO localStorage)
  const [activeSchedule, setActiveSchedule] = useState<OnlineExamSchedule | null>(null);
  const [activePacket, setActivePacket] = useState<OnlineExamPacket | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<OnlineExamSubmission | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [startingExam, setStartingExam] = useState<boolean>(false);
  const [submittingExam, setSubmittingExam] = useState<boolean>(false);
  const [savingProgress, setSavingProgress] = useState<boolean>(false);
  const [confirmSubmitModal, setConfirmSubmitModal] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);

  // Locked Fullscreen Kiosk & Time-Up 10s Auto-Close States
  const [isFullscreenInterrupted, setIsFullscreenInterrupted] = useState<boolean>(false);
  const [kioskLockWarning, setKioskLockWarning] = useState<string | null>(null);
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState<boolean>(false);
  const [timeUpCountdown, setTimeUpCountdown] = useState<number>(10);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSavedScoreSas, setAutoSavedScoreSas] = useState<number | null>(null);
  const [isSubmittedWaitingTimeUp, setIsSubmittedWaitingTimeUp] = useState<boolean>(false);

  const saveProgressTimeoutRef = useRef<any>(null);
  const examContainerRef = useRef<HTMLDivElement | null>(null);
  const isExamLockedRef = useRef<boolean>(false);
  const timeUpTriggeredRef = useRef<boolean>(false);
  const examSessionActiveAtRef = useRef<number>(0);
  const serverRemainingSeedRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number>(0);
  const touchStartScrollTopRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);
  const answersRef = useRef<Record<string, any>>({});
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 5000);
  }, []);

  const showKioskWarning = useCallback((msg: string) => {
    setKioskLockWarning(msg);
    setTimeout(() => {
      setKioskLockWarning(prev => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Kiosk Fullscreen Viewport Lock + Keyboard Lock + Screen Wake Lock
  // Note: Does NOT call W3C requestFullscreen({ navigationUI: 'hide' }) so browser NEVER displays
  // the "Untuk keluar dari layar penuh, usap layar dari atas" prompt or top-swipe exit button.
  const enterNativeFullscreen = useCallback(async () => {
    try {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      // Lock Escape & system keys if supported by browser
      const navAny = navigator as any;
      if (navAny.keyboard && typeof navAny.keyboard.lock === 'function') {
        navAny.keyboard
          .lock(['Escape', 'F11', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight'])
          .catch(() => {});
      }
      // Keep screen awake during exam
      if (navAny.wakeLock && typeof navAny.wakeLock.request === 'function' && !wakeLockRef.current) {
        wakeLockRef.current = await navAny.wakeLock.request('screen').catch(() => null);
      }
      setIsFullscreenInterrupted(false);
    } catch (_err) {
      setIsFullscreenInterrupted(false);
    }
  }, []);

  const exitNativeFullscreenAndUnlock = useCallback(async () => {
    isExamLockedRef.current = false;
    setIsFullscreenInterrupted(false);
    document.documentElement.style.overflow = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';

    try {
      const navAny = navigator as any;
      if (navAny.keyboard && typeof navAny.keyboard.unlock === 'function') {
        navAny.keyboard.unlock();
      }
    } catch (_e) {
      // ignore
    }

    try {
      if (wakeLockRef.current && typeof wakeLockRef.current.release === 'function') {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (_e) {
      // ignore
    }

    try {
      const docAny = document as any;
      if (document.fullscreenElement || docAny.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        } else if (docAny.webkitExitFullscreen) {
          docAny.webkitExitFullscreen();
        }
      }
    } catch (_e) {
      // ignore
    }
  }, []);

  const fetchStudentSchedules = useCallback(
    async (overrideCoords?: { lat: number; lng: number } | null) => {
      setLoading(true);
      try {
        const targetCoords = overrideCoords !== undefined ? overrideCoords : coordsRef.current;
        const params = new URLSearchParams({
          className: student.class || '',
          nis: student.nis || '',
          name: student.name || ''
        });
        if (targetCoords) {
          params.set('lat', String(targetCoords.lat));
          params.set('lng', String(targetCoords.lng));
        }
        const res = await fetch(
          `/api/online-exams/student-available/${encodeURIComponent(student.id)}?${params.toString()}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.schedules)) {
          setSchedules(data.schedules);
        }
        if (data.currentWib?.isoWib) {
          setCurrentWibStr(data.currentWib.isoWib);
        }
      } catch (_err) {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [student.id, student.class, student.nis, student.name]
  );

  const acquireGpsCoordsWithFallback = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6))
          });
        },
        () => {
          // Fallback to fast Wi-Fi / Cellular network positioning for indoor classrooms
          navigator.geolocation.getCurrentPosition(
            pos2 => {
              resolve({
                lat: Number(pos2.coords.latitude.toFixed(6)),
                lng: Number(pos2.coords.longitude.toFixed(6))
              });
            },
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
          );
        },
        { enableHighAccuracy: true, timeout: 4500, maximumAge: 60000 }
      );
    });
  }, []);

  const detectGpsLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung fitur GPS Geolocation.');
      fetchStudentSchedules(null);
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    const detected = await acquireGpsCoordsWithFallback();
    setGpsLoading(false);
    if (detected) {
      setCoords(detected);
      coordsRef.current = detected;
      fetchStudentSchedules(detected);
    } else {
      setGpsError(
        'Lokasi GPS belum terkunci di dalam ruangan. Anda tetap dapat menekan tombol Mulai Ujian untuk memindai ulang lokasi otomatis.'
      );
      fetchStudentSchedules(coordsRef.current);
    }
  }, [acquireGpsCoordsWithFallback, fetchStudentSchedules]);

  useEffect(() => {
    detectGpsLocation();
  }, [detectGpsLocation]);

  // Live WIB Clock
  useEffect(() => {
    const tick = () => {
      const wib = new Date(Date.now() + 7 * 3600 * 1000);
      const iso = wib.toISOString();
      setCurrentWibStr(`${iso.slice(0, 10)} ${iso.slice(11, 19)} WIB`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // ============================================================================
  // KIOSK FULLSCREEN LOCK: BLOCK BACK BUTTON, TOP-DOWN SWIPE, ESCAPE, & EXIT
  // Only closes automatically when exam time runs out (remainingSeconds <= 0)
  // ============================================================================
  useEffect(() => {
    if (!activeSchedule || !activePacket) {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      return;
    }

    isExamLockedRef.current = true;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    // Push multiple history entries so mobile back button / edge-swipe back gesture cannot leave the page
    try {
      window.history.pushState({ cbtLocked: 1 }, '', window.location.href);
      window.history.pushState({ cbtLocked: 2 }, '', window.location.href);
    } catch (_e) {
      // ignore
    }

    const handlePopState = (e: PopStateEvent) => {
      if (!isExamLockedRef.current) return;
      e.preventDefault();
      try {
        window.history.pushState({ cbtLocked: 2 }, '', window.location.href);
      } catch (_err) {
        // ignore
      }
      enterNativeFullscreen();
      showKioskWarning(
        '🔒 Layar Penuh Ujian Terkunci! Layar penuh hanya menutup otomatis saat waktu ujian habis.'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExamLockedRef.current) return;
      const key = e.key;
      if (
        key === 'Escape' ||
        key === 'F11' ||
        key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 'r' || key.toLowerCase() === 'w')) ||
        (e.altKey && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'F4'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        enterNativeFullscreen();
        showKioskWarning('🔒 Tombol sistem dikunci. Layar penuh hanya menutup otomatis saat waktu habis.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isExamLockedRef.current) return;
      e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!isExamLockedRef.current) return;
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      const firstTouch = e.touches?.[0];
      if (firstTouch) {
        touchStartYRef.current = firstTouch.clientY;
        touchStartScrollTopRef.current = examContainerRef.current?.scrollTop ?? 0;
        // Block any touch gesture originating from the top edge of the screen (0..75px)
        if (firstTouch.clientY <= 75) {
          const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
          if (targetTag !== 'button' && targetTag !== 'select' && targetTag !== 'input') {
            e.preventDefault();
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isExamLockedRef.current) return;
      // Block multi-finger gestures (2+ fingers pinch/three-finger swipe)
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      const touch = e.touches?.[0];
      if (!touch) return;

      const deltaY = touch.clientY - touchStartYRef.current;
      const currentScrollTop = examContainerRef.current?.scrollTop ?? 0;

      // Disable top-down swipe ("usap layar dari atas ke bawah"):
      // 1) Any downward swipe starting from the top 140px of the screen is blocked
      // 2) Any downward pull when scroll container is at top (scrollTop <= 0) is blocked
      if (deltaY > 0 && (touchStartYRef.current <= 140 || currentScrollTop <= 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isExamLockedRef.current) return;
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung dan terkunci sampai waktu habis.';
      return e.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown, { capture: true } as any);
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true } as any);
      document.removeEventListener('touchstart', handleTouchStart, { capture: true } as any);
      document.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSchedule, activePacket, enterNativeFullscreen, showKioskWarning]);

  // ============================================================================
  // EXAM COUNTDOWN TIMER (SERVER-AUTHORITATIVE REMAINING SECONDS)
  // ============================================================================
  useEffect(() => {
    if (!activeSchedule) return;

    const durationSec = (Number(activeSchedule.durationMinutes) || 90) * 60;
    const initialRemaining =
      serverRemainingSeedRef.current !== null && serverRemainingSeedRef.current > 0
        ? serverRemainingSeedRef.current
        : durationSec;

    setRemainingSeconds(initialRemaining);

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSchedule?.id, activeSchedule?.durationMinutes]);

  // ============================================================================
  // AUTOMATIC TIME-UP HANDLER:
  // 1. Shows "Waktu Ujian Habis" Notification Modal
  // 2. Automatically saves & grades exam directly in MySQL
  // 3. Runs 10-second countdown (10..0)
  // 4. Automatically exits locked fullscreen & closes exam screen when 10s ends
  // ============================================================================
  const executeAutoSubmitOnTimeUp = useCallback(async () => {
    if (!activeSchedule) return;
    if (saveProgressTimeoutRef.current) {
      clearTimeout(saveProgressTimeoutRef.current);
    }
    setAutoSaveStatus('saving');
    try {
      const res = await fetch('/api/online-exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: activeSchedule.id,
          studentId: student.id,
          studentNis: student.nis,
          studentName: student.name,
          className: student.class,
          answers: answersRef.current,
          latitude: coordsRef.current?.lat,
          longitude: coordsRef.current?.lng
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutoSaveStatus('saved');
        setAutoSavedScoreSas(data.submission?.finalScoreSas ?? null);
      } else {
        setAutoSaveStatus('error');
      }
    } catch (_err) {
      setAutoSaveStatus('error');
    }
  }, [activeSchedule, student.id, student.nis, student.name, student.class]);

  useEffect(() => {
    if (!activeSchedule || !activePacket) return;
    const activeDurationMs =
      examSessionActiveAtRef.current > 0 ? Date.now() - examSessionActiveAtRef.current : 0;
    if (
      remainingSeconds <= 0 &&
      !timeUpTriggeredRef.current &&
      examSessionActiveAtRef.current > 0 &&
      activeDurationMs >= 3000
    ) {
      timeUpTriggeredRef.current = true;
      setConfirmSubmitModal(false);
      setIsTimeUpModalOpen(true);
      setTimeUpCountdown(10);
      executeAutoSubmitOnTimeUp();
    }
  }, [remainingSeconds, activeSchedule, activePacket, executeAutoSubmitOnTimeUp]);

  // 10-second countdown before automatic fullscreen exit and screen close
  useEffect(() => {
    if (!isTimeUpModalOpen) return;

    if (timeUpCountdown <= 0) {
      const finalizeClose = async () => {
        await exitNativeFullscreenAndUnlock();
        const finalScore = autoSavedScoreSas;
        setIsTimeUpModalOpen(false);
        setActiveSchedule(null);
        setActivePacket(null);
        setActiveSubmission(null);
        setAutoSaveStatus('idle');
        timeUpTriggeredRef.current = false;
        showToast(
          'success',
          `Waktu ujian habis! Hasil ujian & Nilai SAS Anda${
            finalScore !== null ? ` (${finalScore})` : ''
          } telah tersimpan otomatis ke MySQL dan layar penuh ditutup.`
        );
        fetchStudentSchedules();
        if (onExamSubmitted) onExamSubmitted();
      };
      finalizeClose();
      return;
    }

    const timer = setTimeout(() => {
      setTimeUpCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isTimeUpModalOpen,
    timeUpCountdown,
    autoSavedScoreSas,
    exitNativeFullscreenAndUnlock,
    fetchStudentSchedules,
    onExamSubmitted,
    showToast
  ]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  };

  const triggerDebouncedDirectMysqlSave = (nextAnswers: Record<string, any>) => {
    if (!activeSchedule || timeUpTriggeredRef.current) return;
    if (saveProgressTimeoutRef.current) {
      clearTimeout(saveProgressTimeoutRef.current);
    }
    // Jittered debounce (2500ms + 0..1500ms random jitter) so 500-1000 concurrent students never spike the server at the same millisecond
    const jitteredDelay = 2500 + Math.floor(Math.random() * 1500);
    saveProgressTimeoutRef.current = setTimeout(async () => {
      setSavingProgress(true);
      try {
        await fetch('/api/online-exams/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleId: activeSchedule.id,
            studentId: student.id,
            studentNis: student.nis,
            studentName: student.name,
            className: student.class,
            answers: nextAnswers,
            latitude: coords?.lat,
            longitude: coords?.lng
          })
        });
      } catch (_err) {
        // silent retry on next answer
      } finally {
        setSavingProgress(false);
      }
    }, jitteredDelay);
  };

  const handleUpdateAnswer = (questionId: string, value: any) => {
    if (timeUpTriggeredRef.current || isTimeUpModalOpen) return;
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      answersRef.current = updated;
      triggerDebouncedDirectMysqlSave(updated);
      return updated;
    });
  };

  const handleStartExam = async (sch: EnrichedStudentSchedule) => {
    enterNativeFullscreen();
    setStartingExam(true);
    try {
      let activeCoords = coordsRef.current || coords;
      if (sch.gpsLockEnabled && !activeCoords) {
        const freshCoords = await acquireGpsCoordsWithFallback();
        if (freshCoords) {
          setCoords(freshCoords);
          coordsRef.current = freshCoords;
          activeCoords = freshCoords;
        }
      }

      const res = await fetch('/api/online-exams/verify-gps-and-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: sch.id,
          studentId: student.id,
          studentNis: student.nis,
          studentName: student.name,
          className: student.class,
          latitude: activeCoords?.lat,
          longitude: activeCoords?.lng,
          tokenCode: tokenInputs[sch.id] || ''
        })
      });
      const data = await res.json();
      if (!data.success) {
        await exitNativeFullscreenAndUnlock();
        showToast('error', data.message || 'Tidak dapat memulai ujian.');
        return;
      }

      const authoritativeRemaining = Math.max(
        60,
        Number(data.remainingSeconds) || (Number(data.schedule?.durationMinutes) || 90) * 60
      );
      serverRemainingSeedRef.current = authoritativeRemaining;
      examSessionActiveAtRef.current = Date.now();
      timeUpTriggeredRef.current = false;
      setRemainingSeconds(authoritativeRemaining);
      setIsTimeUpModalOpen(false);
      setTimeUpCountdown(10);
      setAutoSaveStatus('idle');
      setAutoSavedScoreSas(null);
      setIsSubmittedWaitingTimeUp(false);
      const initialAnswers = data.submission?.answers || {};
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      setCurrentQIndex(0);
      setActiveSubmission(data.submission);
      setActiveSchedule(data.schedule);
      setActivePacket(data.packet);
      setTimeout(() => {
        enterNativeFullscreen();
      }, 100);
    } catch (err: any) {
      await exitNativeFullscreenAndUnlock();
      showToast('error', err.message || 'Gagal menghubungi server ujian.');
    } finally {
      setStartingExam(false);
    }
  };

  const handleFinalSubmitExam = async () => {
    if (!activeSchedule) return;
    setSubmittingExam(true);
    try {
      const res = await fetch('/api/online-exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: activeSchedule.id,
          studentId: student.id,
          studentNis: student.nis,
          studentName: student.name,
          className: student.class,
          answers: answersRef.current,
          latitude: coords?.lat,
          longitude: coords?.lng
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfirmSubmitModal(false);
        setIsSubmittedWaitingTimeUp(true);
        setAutoSavedScoreSas(data.submission?.finalScoreSas ?? null);
        // Fullscreen ONLY closes automatically when time runs out (remainingSeconds <= 0)
        showKioskWarning(
          `✓ Jawaban & Nilai (${data.submission?.finalScoreSas ?? 0}) Tersimpan di MySQL! Layar penuh tetap terkunci dan hanya akan menutup otomatis saat waktu ujian habis.`
        );
      } else {
        showKioskWarning(data.message || 'Gagal mengumpulkan jawaban ujian.');
      }
    } catch (err: any) {
      showKioskWarning(err.message || 'Gagal menghubungi server MySQL.');
    } finally {
      setSubmittingExam(false);
    }
  };

  const currentQuestion: OnlineExamQuestion | null = useMemo(() => {
    if (!activePacket || !Array.isArray(activePacket.questions)) return null;
    return activePacket.questions[currentQIndex] || null;
  }, [activePacket, currentQIndex]);

  // Deterministic shuffled right responses for Menjodohkan so options don't jump on re-render
  const matchingRightChoices = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== 'menjodohkan') return [];
    const pairs = Array.isArray(currentQuestion.matchingPairs) ? currentQuestion.matchingPairs : [];
    return [...pairs].sort((a, b) => a.rightResponse.localeCompare(b.rightResponse));
  }, [currentQuestion]);

  // ============================================================================
  // ACTIVE EXAM WORKSPACE — LOCKED FULLSCREEN KIOSK MODE
  // ============================================================================
  if (activeSchedule && activePacket && currentQuestion) {
    const totalQ = activePacket.questions.length;
    const answeredCount = activePacket.questions.filter(q => {
      const a = answers[q.id];
      if (a === undefined || a === null || a === '') return false;
      if (Array.isArray(a)) return a.length > 0;
      if (typeof a === 'object') return Object.keys(a).length > 0;
      return true;
    }).length;

    return (
      <div
        ref={examContainerRef}
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        className="fixed inset-0 w-screen h-[100dvh] z-[99999] bg-slate-100 overflow-y-auto overscroll-none select-none p-3 sm:p-6 flex flex-col gap-4"
      >
        {/* Top-Edge Anti-Swipe Touch Shield (Disables top-down swipe gesture during fullscreen exam) */}
        <div
          style={{ touchAction: 'none' }}
          onTouchStart={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchMove={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed top-0 left-0 right-0 h-4 z-[100003] bg-transparent"
        />

        {/* Kiosk Lock Warning Toast */}
        {kioskLockWarning && (
          <div className="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between shadow-lg animate-pulse">
            <span>{kioskLockWarning}</span>
            <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
              Terkunci Sampai Waktu Habis
            </span>
          </div>
        )}

        {/* Saved & Waiting Time-Up Banner (When student saves answers early, fullscreen stays locked until timer ends) */}
        {isSubmittedWaitingTimeUp && (
          <div className="bg-emerald-700 text-white px-4 py-3 rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>
                Jawaban & Nilai Ujian Anda{autoSavedScoreSas !== null ? ` (${autoSavedScoreSas})` : ''} telah tersimpan di MySQL. Layar penuh tetap terkunci dan hanya akan menutup otomatis saat waktu ujian habis ({formatTimer(remainingSeconds)}).
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 text-[11px] font-extrabold">
              Menunggu Waktu Habis
            </span>
          </div>
        )}

        {/* Sticky CBT Top Exam Bar */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-rose-500/25 text-rose-200 border border-rose-400/40 text-[11px] font-extrabold flex items-center gap-1">
                <Lock className="w-3 h-3" /> LAYAR PENUH TERKUNCI (TUTUP OTOMATIS SAAT WAKTU HABIS)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                KAPASITAS 1000 SISWA • DIRECT MYSQL
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold">
                {(activeSchedule.randomizeQuestions ??
                  activeSchedule.scoringConfig?.randomizeQuestions ??
                  activePacket.randomizeQuestions ??
                  true) !== false
                  ? '🔀 Nomor Soal Diacak Otomatis'
                  : '🔢 Nomor Soal Berurutan (Tidak Diacak)'}
              </span>
              {activeSubmission?.isSickHomeMode && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1">
                  <HeartPulse className="w-3 h-3" /> Mode Siswa Sakit (Rumah)
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold mt-1">{activePacket.title}</h3>
            <p className="text-xs text-slate-300">
              {activeSchedule.subjectName} • Peserta: {student.name} ({student.class})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                {savingProgress ? 'Menyimpan ke MySQL...' : 'Tersimpan di MySQL'}
              </div>
              <div
                className={`text-lg font-mono font-extrabold flex items-center gap-1.5 ${
                  remainingSeconds <= 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatTimer(remainingSeconds)}
              </div>
            </div>

            <button
              type="button"
              disabled={isTimeUpModalOpen}
              onClick={() => setConfirmSubmitModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmittedWaitingTimeUp
                ? `Perbarui Simpanan (${answeredCount}/${totalQ})`
                : `Simpan Jawaban Final (${answeredCount}/${totalQ})`}
            </button>
          </div>
        </div>

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
          {/* Question Card (A4 Paper Feel, Single Question) */}
          <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-extrabold text-xs">
                  SOAL NO. {currentQIndex + 1} / {totalQ}
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {currentQuestion.type === 'pg'
                    ? 'Pilihan Ganda'
                    : currentQuestion.type === 'pg_kompleks'
                    ? 'Pilihan Ganda Kompleks (>1 Jawaban)'
                    : currentQuestion.type === 'menjodohkan'
                    ? 'Menjodohkan'
                    : currentQuestion.type === 'benar_salah'
                    ? 'Benar / Salah'
                    : 'Uraian'}
                </span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                  {(activeSchedule.randomizeQuestions ??
                    activeSchedule.scoringConfig?.randomizeQuestions ??
                    activePacket.randomizeQuestions ??
                    true) !== false
                    ? '🔀 Urutan Soal Acak Siswa'
                    : '🔢 Urutan Soal Sesuai Nomor Asli'}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Bobot: {currentQuestion.scoreWeight} Poin
              </span>
            </div>

            {currentQuestion.imageUrl && (
              <div className="mb-4">
                <img
                  src={currentQuestion.imageUrl}
                  alt={`Ilustrasi Soal ${currentQIndex + 1}`}
                  className="max-h-64 rounded-lg border border-slate-200 object-contain"
                />
              </div>
            )}

            {/* Question Stem */}
            <div
              className="prose prose-sm max-w-none text-slate-900 text-base leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: currentQuestion.questionHtml }}
            />

            {/* Answer Input by Question Type */}
            {currentQuestion.type === 'pg' && (
              <div className="space-y-2.5">
                {(currentQuestion.options || []).map(opt => {
                  const selected = answers[currentQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isTimeUpModalOpen}
                      onClick={() => handleUpdateAnswer(currentQuestion.id, opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                        selected
                          ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                          selected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span
                        className="text-sm font-medium text-slate-900"
                        dangerouslySetInnerHTML={{ __html: opt.textHtml }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'pg_kompleks' && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-purple-700 mb-1">
                  * Anda dapat memilih lebih dari satu jawaban yang benar:
                </p>
                {(currentQuestion.options || []).map(opt => {
                  const curArr: string[] = Array.isArray(answers[currentQuestion.id])
                    ? answers[currentQuestion.id]
                    : [];
                  const checked = curArr.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isTimeUpModalOpen}
                      onClick={() => {
                        const next = checked
                          ? curArr.filter(id => id !== opt.id)
                          : [...curArr, opt.id];
                        handleUpdateAnswer(currentQuestion.id, next);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
                        checked
                          ? 'bg-purple-50 border-purple-600 ring-1 ring-purple-600'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </span>
                      <span
                        className="text-sm font-medium text-slate-900"
                        dangerouslySetInnerHTML={{ __html: opt.textHtml }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'menjodohkan' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  * Pilih pasangan jawaban yang tepat pada kolom sebelah kanan untuk setiap pernyataan:
                </p>
                {(currentQuestion.matchingPairs || []).map(pair => {
                  const curMap =
                    answers[currentQuestion.id] && typeof answers[currentQuestion.id] === 'object'
                      ? answers[currentQuestion.id]
                      : {};
                  return (
                    <div
                      key={pair.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-xl bg-amber-50/50 border border-amber-200"
                    >
                      <div className="sm:col-span-6 text-sm font-semibold text-slate-900">
                        {pair.leftPremise}
                      </div>
                      <div className="sm:col-span-1 text-center font-bold text-amber-700">→</div>
                      <div className="sm:col-span-5">
                        <select
                          disabled={isTimeUpModalOpen}
                          value={curMap[pair.id] || ''}
                          onChange={e => {
                            const nextMap = { ...curMap, [pair.id]: e.target.value };
                            handleUpdateAnswer(currentQuestion.id, nextMap);
                          }}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white text-slate-900"
                        >
                          <option value="">-- Pilih Pasangan Jawaban --</option>
                          {matchingRightChoices.map(choice => (
                            <option key={choice.id} value={choice.id}>
                              {choice.rightResponse}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'benar_salah' && (
              <div className="space-y-2.5">
                {(currentQuestion.trueFalseItems || []).map((item, idx) => {
                  const curMap =
                    answers[currentQuestion.id] && typeof answers[currentQuestion.id] === 'object'
                      ? answers[currentQuestion.id]
                      : {};
                  const val = curMap[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        <span className="font-bold mr-2">{idx + 1}.</span>
                        {item.statement}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isTimeUpModalOpen}
                          onClick={() =>
                            handleUpdateAnswer(currentQuestion.id, { ...curMap, [item.id]: true })
                          }
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            val === true
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          BENAR
                        </button>
                        <button
                          type="button"
                          disabled={isTimeUpModalOpen}
                          onClick={() =>
                            handleUpdateAnswer(currentQuestion.id, { ...curMap, [item.id]: false })
                          }
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            val === false
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          SALAH
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'uraian' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Ketik Jawaban Uraian Anda:
                </label>
                <textarea
                  rows={5}
                  disabled={isTimeUpModalOpen}
                  style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleUpdateAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Tuliskan jawaban uraian Anda secara lengkap di sini..."
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none select-text"
                />
              </div>
            )}

            {/* Prev / Next Navigation Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                disabled={currentQIndex <= 0 || isTimeUpModalOpen}
                onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Soal Sebelumnya
              </button>

              {currentQIndex < totalQ - 1 ? (
                <button
                  type="button"
                  disabled={isTimeUpModalOpen}
                  onClick={() => setCurrentQIndex(i => Math.min(totalQ - 1, i + 1))}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  Soal Selanjutnya <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isTimeUpModalOpen}
                  onClick={() => setConfirmSubmitModal(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Kumpulkan Jawaban Ujian
                </button>
              )}
            </div>
          </div>

          {/* Right Question Number Grid */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>Daftar Nomor Soal</span>
              <span className="text-emerald-700">
                {answeredCount}/{totalQ} Terjawab
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {activePacket.questions.map((q, idx) => {
                const a = answers[q.id];
                const isAnswered =
                  a !== undefined &&
                  a !== null &&
                  a !== '' &&
                  (!Array.isArray(a) || a.length > 0) &&
                  (typeof a !== 'object' || Object.keys(a).length > 0);
                const isCurrent = idx === currentQIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isTimeUpModalOpen}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-10 rounded-lg font-bold text-xs border transition cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300'
                        : isAnswered
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-600" /> Keamanan Layar Penuh Aktif
              </p>
              <p>
                Layar penuh ujian terkunci penuh dan hanya menutup otomatis saat waktu ujian habis (setelah hitungan mundur 10 detik).
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================
            MANDATORY RE-LOCK SHIELD IF OS/GESTURE INTERRUPTS NATIVE FULLSCREEN
           ======================================================================== */}
        {isFullscreenInterrupted && !isTimeUpModalOpen && (
          <div
            onClick={enterNativeFullscreen}
            onTouchStart={enterNativeFullscreen}
            className="fixed inset-0 z-[100001] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white cursor-pointer"
          >
            <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center mx-auto text-rose-400">
                <Lock className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-white">
                LAYAR UJIAN TERKUNCI (MODE KIOSK CBT)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Layar penuh ujian hanya akan menutup secara otomatis ketika waktu ujian telah habis.
              </p>
              <button
                type="button"
                onClick={enterNativeFullscreen}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <Maximize2 className="w-4 h-4" />
                Lanjutkan Pengerjaan Soal Ujian
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================
            TIME-UP NOTIFICATION & 10-SECOND AUTO-CLOSE COUNTDOWN MODAL
           ======================================================================== */}
        {isTimeUpModalOpen && (
          <div className="fixed inset-0 z-[100002] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-500 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[11px] uppercase tracking-wider">
                  Pemberitahuan Otomatis CBT
                </span>
                <h4 className="text-xl font-black text-slate-900">
                  ⏰ Waktu Ujian Telah Habis!
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Waktu pengerjaan untuk mata pelajaran <b>{activeSchedule.subjectName}</b> telah berakhir. Seluruh jawaban Anda otomatis disimpan ke database MySQL.
                </p>
              </div>

              {/* Auto-Save Status Indicator */}
              <div
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
                  autoSaveStatus === 'saved'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : autoSaveStatus === 'error'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}
              >
                {autoSaveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Hasil ujian & Nilai SAS
                      {autoSavedScoreSas !== null ? ` (${autoSavedScoreSas})` : ''} berhasil tersimpan otomatis!
                    </span>
                  </>
                ) : autoSaveStatus === 'error' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Progres jawaban terakhir telah diamankan di server MySQL.</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    <span>Menyimpan hasil ujian & Nilai SAS otomatis ke MySQL...</span>
                  </>
                )}
              </div>

              {/* 10-Second Countdown Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-300">
                  Layar penuh (Fullscreen) akan keluar & tertutup otomatis dalam:
                </div>
                <div className="text-4xl font-mono font-black text-amber-400">
                  {timeUpCountdown} <span className="text-base font-sans font-bold text-white">detik</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeUpCountdown / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Submit Modal (Saves answers to MySQL immediately, while fullscreen stays locked until time is up) */}
        {confirmSubmitModal && !isTimeUpModalOpen && (
          <div className="fixed inset-0 z-[100000] bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h4 className="text-base font-extrabold text-slate-900">
                Konfirmasi Simpan Jawaban Final ke MySQL
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda telah menjawab <b>{answeredCount}</b> dari <b>{totalQ}</b> butir soal. Jawaban dan nilai Anda akan langsung disimpan ke <b>MySQL</b> sekarang. Sesuai aturan keamanan CBT, <b>layar penuh ujian tetap terkunci dan hanya akan menutup secara otomatis saat waktu ujian habis</b>.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  disabled={submittingExam}
                  onClick={handleFinalSubmitExam}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  {submittingExam ? 'Menyimpan Nilai ke MySQL...' : 'Ya, Simpan Jawaban Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // DEFAULT STUDENT EXAM DASHBOARD (SCHEDULE LIST + GPS LOCK STATUS)
  // ============================================================================
  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between shadow ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="text-xs underline ml-4">
            Tutup
          </button>
        </div>
      )}

      {/* Top GPS & WIB Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Portal Ujian Online (CBT) — Kelas {student.class}
            </h3>
            <p className="text-xs text-slate-500">
              Mode layar penuh terkunci otomatis saat ujian dimulai & tertutup otomatis saat waktu habis.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentWibStr || 'WIB'}</span>
          </div>

          <button
            type="button"
            onClick={detectGpsLocation}
            disabled={gpsLoading}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            {coords
              ? `GPS Aktif (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
              : 'Segarkan Lokasi GPS'}
          </button>

          <button
            type="button"
            onClick={() => fetchStudentSchedules()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Muat Ulang Jadwal Ujian"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={detectGpsLocation}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold shrink-0"
          >
            Aktifkan GPS
          </button>
        </div>
      )}

      {/* Exam Schedules Cards */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            Belum Ada Jadwal Ujian Online untuk Kelas {student.class}
          </p>
          <p className="text-xs text-slate-500">
            Soal ujian akan muncul dan aktif secara otomatis sesuai jadwal WIB yang ditetapkan oleh Waka Kurikulum.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map(sch => {
            const sub = sch.studentSubmission;
            const hasAnsweredAny =
              sub && sub.answers && typeof sub.answers === 'object'
                ? Object.values(sub.answers).some(val => {
                    if (val === undefined || val === null || val === '') return false;
                    if (Array.isArray(val)) return val.length > 0;
                    if (typeof val === 'object') return Object.keys(val).length > 0;
                    return true;
                  })
                : false;
            const isZeroUnansweredDone =
              Boolean(sub) &&
              (sub?.status === 'submitted' || sub?.status === 'graded') &&
              Number(sub?.finalScoreSas || 0) === 0 &&
              !hasAnsweredAny;
            const isDone =
              Boolean(sub) &&
              (sub?.status === 'submitted' || sub?.status === 'graded') &&
              !isZeroUnansweredDone;
            const gps = sch.gpsEvaluation;
            const canOpenByTime = sch.isCurrentlyOpenWib;
            const canOpenByGps = gps
              ? gps.gpsAllowed || gps.distanceMeters === null
              : true;
            const isScheduleRandomized =
              (sch.randomizeQuestions ?? sch.scoringConfig?.randomizeQuestions ?? true) !== false;

            return (
              <div
                key={sch.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between gap-4 ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : canOpenByTime
                    ? 'border-indigo-400 ring-1 ring-indigo-400/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : canOpenByTime
                          ? 'bg-indigo-600 text-white'
                          : sch.scheduleStatusWib === 'belum_mulai'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isDone
                        ? '✓ SUDAH DIKERJAKAN'
                        : canOpenByTime
                        ? '● JADWAL AKTIF (WIB)'
                        : sch.scheduleStatusWib === 'belum_mulai'
                        ? 'MENUNGGU JADWAL WIB'
                        : 'WAKTU UJIAN BERAKHIR'}
                    </span>

                    <span className="text-xs font-bold text-slate-500">
                      Durasi: {sch.durationMinutes} Menit
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{sch.packetTitle}</h4>
                    <p className="text-xs font-semibold text-indigo-700">
                      Mata Pelajaran: {sch.subjectName} • Semester {sch.semester} ({sch.academicYear})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Tanggal Ujian:</span>
                      <span className="font-bold text-slate-800">{sch.examDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Jam Aktif (WIB):</span>
                      <span className="font-bold text-slate-800">
                        {sch.startTimeWib} - {sch.endTimeWib} WIB
                      </span>
                    </div>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-[11px] font-semibold text-indigo-800 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span>{isScheduleRandomized ? '🔀' : '🔢'}</span>
                      <span>
                        {isScheduleRandomized
                          ? 'Urutan nomor soal diacak otomatis (berbeda tiap siswa)'
                          : 'Urutan nomor soal berurutan (tidak diacak)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-700">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>Mode Layar Penuh Terkunci otomatis selama waktu ujian</span>
                    </div>
                  </div>

                  {isZeroUnansweredDone && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
                      ⚠️ Sesi ujian sebelumnya tertutup dengan 0 jawaban (Nilai 0). Anda dapat langsung mengerjakan ulang ujian ini selama jadwal aktif.
                    </div>
                  )}

                  {/* GPS Radius Verification Box */}
                  {sch.gpsLockEnabled && gps && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        gps.gpsAllowed
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                          : gps.distanceMeters === null
                          ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                          : 'bg-rose-50/80 border-rose-300 text-rose-900'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          {gps.isSickStudent ? (
                            <>
                              <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                              Radius Khusus Siswa Sakit (Rumah)
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5" />
                              Kunci Lokasi GPS Sekolah
                            </>
                          )}
                        </span>
                        <span className="font-mono text-[11px]">
                          {gps.distanceMeters !== null
                            ? `${gps.distanceMeters}m / Maks ${gps.allowedRadiusMeters}m`
                            : `Maks ${gps.allowedRadiusMeters}m`}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90">{gps.gpsMessage}</p>
                    </div>
                  )}
                </div>

                {/* Bottom Action or SAS Score Display */}
                {isDone && sub ? (
                  <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Tersimpan di Nilai SAS MySQL</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1 rounded-xl font-extrabold text-sm">
                      <Award className="w-4 h-4" />
                      Nilai SAS: {sub.finalScoreSas}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    {sch.tokenCode && canOpenByTime && (
                      <input
                        type="text"
                        value={tokenInputs[sch.id] || ''}
                        onChange={e =>
                          setTokenInputs(prev => ({
                            ...prev,
                            [sch.id]: e.target.value.toUpperCase()
                          }))
                        }
                        placeholder="Masukkan Token Ujian..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono uppercase"
                      />
                    )}

                    <button
                      type="button"
                      disabled={!canOpenByTime || !canOpenByGps || startingExam}
                      onClick={() => handleStartExam(sch)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                        canOpenByTime && canOpenByGps
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow cursor-pointer'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {!canOpenByTime ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Soal Aktif Otomatis Pukul {sch.startTimeWib} WIB ({sch.examDate})
                        </>
                      ) : !canOpenByGps ? (
                        <>
                          <MapPin className="w-3.5 h-3.5" />
                          Di Luar Radius GPS Ujian — Dekati Area atau Segarkan GPS
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-4 h-4" />
                          {startingExam
                            ? 'Membuka Soal Ujian...'
                            : isZeroUnansweredDone
                            ? 'Kerjakan Ulang Ujian (Layar Penuh Terkunci)'
                            : sub?.status === 'in_progress'
                            ? 'Lanjutkan Ujian (Mode Layar Penuh Terkunci)'
                            : 'Mulai Kerjakan Ujian (Layar Penuh Terkunci)'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
