import { Student, SppBill, SavingsTransaction, HomeroomTeacher, SubjectTeacher, TeacherAssignment, MerdekaAssessment, ClassSchedule, MiscBill } from "../types";

export const FIRST_SEMESTER_MONTHS = ["Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const SECOND_SEMESTER_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];

/**
 * Standard list of Indonesian school months in academic order (Juli to Juni)
 */
export const ACADEMIC_MONTHS = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni"
];

/**
 * Parses academic year string (e.g. "2026/2027") into numeric start and end years
 */
export function parseAcademicYear(ay?: string): { startYear: number; endYear: number } {
  if (!ay || typeof ay !== "string" || !ay.includes("/")) {
    return { startYear: 2026, endYear: 2027 };
  }
  const parts = ay.trim().split("/");
  const start = parseInt(parts[0], 10) || 2026;
  const end = parseInt(parts[1], 10) || start + 1;
  return { startYear: start, endYear: end };
}

/**
 * Derives academic year from month name and calendar year
 * Example: ('Juli', 2026) -> "2026/2027"
 * Example: ('Januari', 2027) -> "2026/2027"
 */
export function getAcademicYearFromMonthAndYear(month: string, year: number): string {
  const normMonth = (month || "").trim();
  const isFirstHalf = FIRST_SEMESTER_MONTHS.some(m => m.toLowerCase() === normMonth.toLowerCase());
  const startYear = isFirstHalf ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

/**
 * Derives academic year from date string or Date object
 * In Indonesia, academic year starts July 1st (month index 6)
 */
export function getAcademicYearFromDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "2026/2027";
  let d: Date;
  if (typeof dateInput === "string") {
    // Handle standard YYYY-MM-DD or ISO strings
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) return "2026/2027";

  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 6 = July

  // July (6) to December (11) belongs to starting year
  // January (0) to June (5) belongs to starting year - 1
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

/**
 * Determines academic year for an SPP Bill
 */
export function getAcademicYearFromSppBill(bill: { month: string; year: number; academicYear?: string }): string {
  if (bill.academicYear && bill.academicYear.includes("/")) {
    return bill.academicYear.trim();
  }
  return getAcademicYearFromMonthAndYear(bill.month, bill.year);
}

/**
 * Checks if an SPP Bill belongs to a specific academic year
 */
export function isBillInAcademicYear(bill: { month: string; year: number; academicYear?: string }, targetAy: string): boolean {
  if (!targetAy) return true;
  return getAcademicYearFromSppBill(bill) === targetAy.trim();
}

/**
 * Determines academic year for a savings transaction
 */
export function getAcademicYearFromTransaction(tx: { createdAt: string; academicYear?: string }): string {
  if (tx.academicYear && tx.academicYear.includes("/")) {
    return tx.academicYear.trim();
  }
  return getAcademicYearFromDate(tx.createdAt);
}

/**
 * Checks if a savings transaction occurred within a specific academic year
 */
export function isTransactionInAcademicYear(tx: { createdAt: string; academicYear?: string }, targetAy: string): boolean {
  if (!targetAy) return true;
  return getAcademicYearFromTransaction(tx) === targetAy.trim();
}

/**
 * Determines academic year for a misc bill
 */
export function getAcademicYearFromMiscBill(bill: { createdAt?: string; month?: string; academicYear?: string }): string {
  if (bill.academicYear && bill.academicYear.includes("/")) {
    return bill.academicYear.trim();
  }
  if (bill.month) {
    const isFirstHalf = FIRST_SEMESTER_MONTHS.some(m => m.toLowerCase() === (bill.month || "").toLowerCase());
    const year = bill.createdAt ? new Date(bill.createdAt).getFullYear() : 2026;
    const startYear = isFirstHalf ? year : year - 1;
    return `${startYear}/${startYear + 1}`;
  }
  return getAcademicYearFromDate(bill.createdAt);
}

/**
 * Resolves what class a student belongs to for a given academic year.
 * Handles both explicit classHistory records and smart historical extrapolation.
 */
export function getStudentClassForYear(
  student: Student,
  targetAy: string,
  activeAy: string = "2026/2027"
): string {
  if (!targetAy) return student.class;

  const cleanTargetAy = targetAy.trim();
  const cleanActiveAy = (activeAy || "2026/2027").trim();

  // 1. Direct match in student's classHistory array
  if (student.classHistory && Array.isArray(student.classHistory) && student.classHistory.length > 0) {
    const entry = student.classHistory.find(h => h.academicYear && h.academicYear.trim() === cleanTargetAy);
    if (entry && entry.className) {
      return entry.className;
    }
  }

  // 2. If viewing current active year, return current class
  if (cleanTargetAy === cleanActiveAy) {
    return student.class;
  }

  // 3. Smart extrapolation based on difference between target year and active year
  const activeParsed = parseAcademicYear(cleanActiveAy);
  const targetParsed = parseAcademicYear(cleanTargetAy);
  const yearDiff = targetParsed.startYear - activeParsed.startYear;

  const currentClass = (student.class || "").trim();
  const currentStatus = (student.status || "").trim().toLowerCase();

  // Handle students who are currently graduated
  if (currentClass.toLowerCase() === "lulus" || currentStatus === "lulus") {
    // If target year is the graduation year (e.g. 1 year ago or active year)
    if (yearDiff === -1) {
      return "9-A (Alumni)";
    }
    if (yearDiff < -1) {
      const pastGrade = 9 + (yearDiff + 1);
      if (pastGrade === 8) return "8-A (Alumni)";
      if (pastGrade === 7) return "7-A (Alumni)";
      return "Belum Masuk";
    }
    return "Lulus";
  }

  // Parse grade level e.g., "7-A" -> grade 7, suffix "-A"
  const match = currentClass.match(/^([789])(.*)$/);
  if (!match) {
    return currentClass;
  }

  const currentGradeNum = parseInt(match[1], 10);
  const suffix = match[2]; // e.g. "-A", "-B"

  const targetGradeNum = currentGradeNum + yearDiff;

  if (targetGradeNum < 7) {
    return "Belum Terdaftar";
  } else if (targetGradeNum === 7) {
    return `7${suffix}`;
  } else if (targetGradeNum === 8) {
    return `8${suffix}`;
  } else if (targetGradeNum === 9) {
    return `9${suffix}`;
  } else {
    return "Lulus";
  }
}

/**
 * Resolves the full list of active homeroom teachers for a specific academic year,
 * taking into account role transitions (Homeroom <-> Subject Teacher) and custom class assignments.
 */
export function getPeriodicHomerooms(
  homerooms: HomeroomTeacher[] = [],
  subjectTeachers: SubjectTeacher[] = [],
  targetAy: string,
  activeAy: string = "2026/2027"
): HomeroomTeacher[] {
  const cleanTargetAy = (targetAy || activeAy || "2026/2027").trim();
  const cleanActiveAy = (activeAy || "2026/2027").trim();

  // Combine both teacher lists, deduplicated by username or id
  const teacherMap = new Map<string, HomeroomTeacher>();

  // 1. Add all homerooms
  (homerooms || []).forEach(h => {
    if (!h) return;
    const key = (h.username || h.id || "").toLowerCase();
    if (key) {
      teacherMap.set(key, { ...h });
    }
  });

  // 2. Check subjectTeachers to see if any have an assignment as homeroom in targetAy
  (subjectTeachers || []).forEach(st => {
    if (!st) return;
    const key = (st.username || st.id || "").toLowerCase();
    if (!key) return;

    const existing = teacherMap.get(key);
    if (!existing) {
      const asg = st.assignments?.find(a => a.academicYear && a.academicYear.trim() === cleanTargetAy);
      if (asg && asg.role === 'homeroom' && asg.className) {
        teacherMap.set(key, {
          id: `ht-sync-${st.id}`,
          username: st.username,
          name: st.name,
          className: asg.className,
          password: st.password || "wali123",
          subject: st.subject,
          subjectId: st.subjectId,
          academicYear: cleanTargetAy,
          assignments: st.assignments
        });
      }
    }
  });

  // 3. Resolve effective class for cleanTargetAy
  const result: HomeroomTeacher[] = [];

  teacherMap.forEach(t => {
    // Check explicit assignment for targetAy
    const asg = t.assignments?.find(a => a.academicYear && a.academicYear.trim() === cleanTargetAy);
    if (asg) {
      if (asg.role === 'homeroom' && asg.className && asg.className.trim().length > 0) {
        result.push({
          ...t,
          className: asg.className.trim(),
          academicYear: cleanTargetAy
        });
      }
      // If asg.role === 'subject_teacher' or asg.className is empty, this teacher is NOT a homeroom teacher in targetAy!
      return;
    }

    // If no explicit assignment for targetAy:
    // Fall back to default className if teacher has one
    if (t.className && t.className.trim().length > 0) {
      result.push({
        ...t,
        className: t.className.trim(),
        academicYear: cleanTargetAy
      });
    }
  });

  return result;
}

/**
 * Resolves the assigned homeroom teacher for a class in a specific academic year.
 */
export function getHomeroomForClassAndYear(
  homerooms: HomeroomTeacher[],
  className: string,
  targetAy: string,
  activeAy: string = "2026/2027",
  subjectTeachers: SubjectTeacher[] = []
): HomeroomTeacher | undefined {
  if (!className) return undefined;
  const cleanClass = className.trim().toUpperCase();
  const effectiveHomerooms = getPeriodicHomerooms(homerooms, subjectTeachers, targetAy, activeAy);
  return effectiveHomerooms.find(h => h.className.trim().toUpperCase() === cleanClass);
}

/**
 * Gathers all distinct academic years across system data and returns them sorted chronologically
 */
export function getAvailableAcademicYears(
  sppBills: SppBill[] = [],
  merdekaAssessments: MerdekaAssessment[] = [],
  schedules: ClassSchedule[] = [],
  activeAy: string = "2026/2027"
): string[] {
  const yearsSet = new Set<string>();

  // Ensure standard educational years are available
  const defaultYears = ["2024/2025", "2025/2026", "2026/2027", "2027/2028", "2028/2029"];
  defaultYears.forEach(y => yearsSet.add(y));

  if (activeAy && activeAy.includes("/")) {
    yearsSet.add(activeAy.trim());
  }

  // Extract from SPP bills
  sppBills.forEach(b => {
    const ay = getAcademicYearFromSppBill(b);
    if (ay && ay.includes("/")) yearsSet.add(ay);
  });

  // Extract from Assessments
  merdekaAssessments.forEach(a => {
    if (a.academicYear && a.academicYear.includes("/")) {
      yearsSet.add(a.academicYear.trim());
    }
  });

  // Extract from Schedules
  schedules.forEach(s => {
    if (s.academicYear && s.academicYear.includes("/")) {
      yearsSet.add(s.academicYear.trim());
    }
  });

  // Sort chronologically by start year
  return Array.from(yearsSet).sort((a, b) => {
    const startA = parseAcademicYear(a).startYear;
    const startB = parseAcademicYear(b).startYear;
    return startA - startB;
  });
}
