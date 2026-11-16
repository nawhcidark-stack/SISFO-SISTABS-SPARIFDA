import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  CheckCircle2,
  CheckSquare,
  GitCompare,
  ToggleLeft,
  AlignLeft as EssayIcon,
  FolderOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Award,
  Check,
  Maximize2,
  Minimize2,
  Shuffle,
  Calendar,
  Clock,
  MapPin,
  Users,
  Database,
  FileText,
  Edit3
} from 'lucide-react';
import {
  CurriculumSubject,
  OnlineExamPacket,
  OnlineExamPacketPurpose,
  OnlineExamQuestion,
  OnlineExamQuestionType,
  OnlineExamSchedule,
  OnlineExamScoreTargetMode,
  OnlineExamSubmission
} from '../types';

interface OnlineExamWordEditorProps {
  creatorId: string;
  creatorName: string;
  creatorRole: 'Guru Mapel' | 'Wali Kelas' | 'Waka Kurikulum';
  curriculumSubjects: CurriculumSubject[];
  allowedSubjectNames?: string[];
  defaultClassName?: string;
  availableClasses?: string[];
  initialPacketId?: string;
  onPacketSaved?: (packet: OnlineExamPacket) => void;
  onRefreshData?: () => void;
}

const UH_TP_SLOTS: {
  mode: 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4';
  quotaNumber: number;
  shortLabel: string;
  fullLabel: string;
  columnLabel: string;
}[] = [
  {
    mode: 'uh_tp1',
    quotaNumber: 1,
    shortLabel: 'UH TP 1',
    fullLabel: 'Jatah Ulangan Harian 1 — Tujuan Pembelajaran 1 (TP 1)',
    columnLabel: 'Kolom UH pada TP 1 di Penilaian'
  },
  {
    mode: 'uh_tp2',
    quotaNumber: 2,
    shortLabel: 'UH TP 2',
    fullLabel: 'Jatah Ulangan Harian 2 — Tujuan Pembelajaran 2 (TP 2)',
    columnLabel: 'Kolom UH pada TP 2 di Penilaian'
  },
  {
    mode: 'uh_tp3',
    quotaNumber: 3,
    shortLabel: 'UH TP 3',
    fullLabel: 'Jatah Ulangan Harian 3 — Tujuan Pembelajaran 3 (TP 3)',
    columnLabel: 'Kolom UH pada TP 3 di Penilaian'
  },
  {
    mode: 'uh_tp4',
    quotaNumber: 4,
    shortLabel: 'UH TP 4',
    fullLabel: 'Jatah Ulangan Harian 4 — Tujuan Pembelajaran 4 (TP 4)',
    columnLabel: 'Kolom UH pada TP 4 di Penilaian'
  }
];

const QUESTION_TYPE_META: Record<
  OnlineExamQuestionType,
  { label: string; shortLabel: string; badgeClass: string; defaultWeight: number }
> = {
  pg: {
    label: 'Pilihan Ganda (1 Jawaban Benar)',
    shortLabel: 'Pilihan Ganda',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultWeight: 1
  },
  pg_kompleks: {
    label: 'Pilihan Ganda Kompleks (>1 Jawaban Benar)',
    shortLabel: 'PG Kompleks',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    defaultWeight: 2
  },
  menjodohkan: {
    label: 'Menjodohkan (Pasangan Kiri - Kanan)',
    shortLabel: 'Menjodohkan',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultWeight: 2
  },
  benar_salah: {
    label: 'Benar - Salah (Multi Pernyataan)',
    shortLabel: 'Benar / Salah',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultWeight: 2
  },
  uraian: {
    label: 'Uraian / Essay Terstruktur',
    shortLabel: 'Uraian',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    defaultWeight: 4
  }
};

const MATH_SYMBOLS = [
  '×', '÷', '±', '∓', '≈', '≠', '≡', '≤', '≥', '√', '∛', '∜', 'π', '°', '∠', '∟', '△', '⊥', '∥', '≅', '∼', '∞',
  '∈', '∉', '⊂', '⊆', '∪', '∩', '∅', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 'Δ', 'Σ', 'Ω', '→', '⇒', '⇔'
];

type MathEquationTemplateType =
  | 'fraction'
  | 'mixed_fraction'
  | 'power'
  | 'subscript'
  | 'sqrt'
  | 'nth_root'
  | 'quadratic'
  | 'spldv'
  | 'log'
  | 'sigma'
  | 'limit'
  | 'matrix2x2'
  | 'angle_deg';

interface MathEquationTemplateMeta {
  id: MathEquationTemplateType;
  label: string;
  previewSymbol: string;
  fields: { key: 'a' | 'b' | 'c' | 'd'; label: string; placeholder: string }[];
  defaultValues: { a: string; b: string; c: string; d: string };
}

const MATH_EQUATION_TEMPLATES: MathEquationTemplateMeta[] = [
  {
    id: 'fraction',
    label: 'Pecahan (a/b)',
    previewSymbol: 'a / b',
    fields: [
      { key: 'a', label: 'Pembilang (Atas)', placeholder: '2x + 3' },
      { key: 'b', label: 'Penyebut (Bawah)', placeholder: 'x - 5' }
    ],
    defaultValues: { a: '3', b: '4', c: '', d: '' }
  },
  {
    id: 'mixed_fraction',
    label: 'Pecahan Campuran',
    previewSymbol: 'c a/b',
    fields: [
      { key: 'c', label: 'Bilangan Bulat', placeholder: '2' },
      { key: 'a', label: 'Pembilang (Atas)', placeholder: '3' },
      { key: 'b', label: 'Penyebut (Bawah)', placeholder: '5' }
    ],
    defaultValues: { a: '3', b: '5', c: '2', d: '' }
  },
  {
    id: 'power',
    label: 'Pangkat / Eksponen',
    previewSymbol: 'xⁿ',
    fields: [
      { key: 'a', label: 'Basis (Bilangan Pokok)', placeholder: 'x' },
      { key: 'b', label: 'Pangkat (Eksponen)', placeholder: '2' }
    ],
    defaultValues: { a: 'x', b: '2', c: '', d: '' }
  },
  {
    id: 'subscript',
    label: 'Indeks / Subscript',
    previewSymbol: 'Uₙ',
    fields: [
      { key: 'a', label: 'Simbol Utama', placeholder: 'U' },
      { key: 'b', label: 'Indeks Bawah', placeholder: 'n' }
    ],
    defaultValues: { a: 'U', b: 'n', c: '', d: '' }
  },
  {
    id: 'sqrt',
    label: 'Akar Kuadrat (√)',
    previewSymbol: '√x',
    fields: [{ key: 'a', label: 'Nilai di Dalam Akar', placeholder: 'x² + y²' }],
    defaultValues: { a: '144', b: '', c: '', d: '' }
  },
  {
    id: 'nth_root',
    label: 'Akar Pangkat n (ⁿ√)',
    previewSymbol: 'ⁿ√x',
    fields: [
      { key: 'b', label: 'Pangkat Akar (n)', placeholder: '3' },
      { key: 'a', label: 'Nilai di Dalam Akar', placeholder: '27' }
    ],
    defaultValues: { a: '27', b: '3', c: '', d: '' }
  },
  {
    id: 'quadratic',
    label: 'Persamaan Kuadrat / ABC',
    previewSymbol: 'ax²+bx+c=0',
    fields: [
      { key: 'a', label: 'Koefisien x² (a)', placeholder: 'x²' },
      { key: 'b', label: 'Suku Tengah (bx)', placeholder: '- 5x' },
      { key: 'c', label: 'Konstanta (c)', placeholder: '+ 6 = 0' }
    ],
    defaultValues: { a: 'x', b: '- 5x', c: '+ 6 = 0', d: '' }
  },
  {
    id: 'spldv',
    label: 'Sistem Persamaan (SPLDV)',
    previewSymbol: '{ ax+by=c',
    fields: [
      { key: 'a', label: 'Persamaan Baris 1', placeholder: '2x + 3y = 12' },
      { key: 'b', label: 'Persamaan Baris 2', placeholder: 'x - y = 1' }
    ],
    defaultValues: { a: '2x + 3y = 12', b: 'x - y = 1', c: '', d: '' }
  },
  {
    id: 'log',
    label: 'Logaritma (ᵃlog b)',
    previewSymbol: 'ᵃlog b',
    fields: [
      { key: 'a', label: 'Basis Logaritma (a)', placeholder: '2' },
      { key: 'b', label: 'Numerus (b)', placeholder: '8' }
    ],
    defaultValues: { a: '2', b: '8', c: '', d: '' }
  },
  {
    id: 'sigma',
    label: 'Notasi Sigma (∑)',
    previewSymbol: '∑ f(i)',
    fields: [
      { key: 'a', label: 'Batas Bawah', placeholder: 'i = 1' },
      { key: 'b', label: 'Batas Atas', placeholder: 'n' },
      { key: 'c', label: 'Rumus Suku', placeholder: '2i + 1' }
    ],
    defaultValues: { a: 'i=1', b: 'n', c: '2i + 1', d: '' }
  },
  {
    id: 'limit',
    label: 'Limit Fungsi (lim)',
    previewSymbol: 'lim x→a',
    fields: [
      { key: 'a', label: 'Menuju (x → ...)', placeholder: 'x → 2' },
      { key: 'b', label: 'Fungsi f(x)', placeholder: '(x² - 4) / (x - 2)' }
    ],
    defaultValues: { a: 'x → 2', b: 'x² - 4', c: '', d: '' }
  },
  {
    id: 'matrix2x2',
    label: 'Matriks 2 × 2',
    previewSymbol: '[ a b ; c d ]',
    fields: [
      { key: 'a', label: 'Baris 1 Kolom 1 (a₁₁)', placeholder: '2' },
      { key: 'b', label: 'Baris 1 Kolom 2 (a₁₂)', placeholder: '-1' },
      { key: 'c', label: 'Baris 2 Kolom 1 (a₂₁)', placeholder: '3' },
      { key: 'd', label: 'Baris 2 Kolom 2 (a₂₂)', placeholder: '4' }
    ],
    defaultValues: { a: '2', b: '-1', c: '3', d: '4' }
  },
  {
    id: 'angle_deg',
    label: 'Sudut & Geometri (∠, △)',
    previewSymbol: '∠ABC = 60°',
    fields: [
      { key: 'a', label: 'Simbol / Nama Sudut atau Bangun', placeholder: '∠ABC' },
      { key: 'b', label: 'Nilai Sudut / Keterangan', placeholder: '60°' }
    ],
    defaultValues: { a: '∠ABC', b: '60°', c: '', d: '' }
  }
];

function buildMathEquationHtml(
  template: MathEquationTemplateType,
  params: { a: string; b: string; c: string; d: string }
): string {
  const a = params.a || '';
  const b = params.b || '';
  const c = params.c || '';
  const d = params.d || '';
  const wrapStyle =
    "display:inline-flex;align-items:center;vertical-align:middle;font-family:'Cambria Math','Times New Roman',serif;margin:0 4px;padding:1px 3px;line-height:1.2;";

  if (template === 'fraction') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;"><span style="padding:0 5px 1px 5px;border-bottom:1.5px solid currentColor;line-height:1.15;">${a}</span><span style="padding:1px 5px 0 5px;line-height:1.15;">${b}</span></span></span>&nbsp;`;
  }
  if (template === 'mixed_fraction') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="font-size:1.05em;margin-right:2px;">${c}</span><span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;"><span style="padding:0 4px 1px 4px;border-bottom:1.5px solid currentColor;line-height:1.1;">${a}</span><span style="padding:1px 4px 0 4px;line-height:1.1;">${b}</span></span></span>&nbsp;`;
  }
  if (template === 'power') {
    return `<span class="ms-eq" style="${wrapStyle}"><span>${a}</span><sup style="font-size:0.75em;margin-left:1px;">${b}</sup></span>&nbsp;`;
  }
  if (template === 'subscript') {
    return `<span class="ms-eq" style="${wrapStyle}"><span>${a}</span><sub style="font-size:0.75em;margin-left:1px;">${b}</sub></span>&nbsp;`;
  }
  if (template === 'sqrt') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="font-size:1.2em;line-height:1;margin-right:1px;">√</span><span style="border-top:1.5px solid currentColor;padding:1px 4px 0 2px;">${a}</span></span>&nbsp;`;
  }
  if (template === 'nth_root') {
    return `<span class="ms-eq" style="${wrapStyle}"><sup style="font-size:0.7em;margin-right:-2px;align-self:flex-start;">${b}</sup><span style="font-size:1.2em;line-height:1;margin-right:1px;">√</span><span style="border-top:1.5px solid currentColor;padding:1px 4px 0 2px;">${a}</span></span>&nbsp;`;
  }
  if (template === 'quadratic') {
    return `<span class="ms-eq" style="${wrapStyle}"><span>${a}</span><sup style="font-size:0.75em;">2</sup><span>&nbsp;${b}&nbsp;${c}</span></span>&nbsp;`;
  }
  if (template === 'spldv') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="font-size:2.1em;font-weight:300;line-height:0.9;margin-right:3px;">{</span><span style="display:inline-flex;flex-direction:column;align-items:flex-start;font-size:0.95em;"><span>${a}</span><span>${b}</span></span></span>&nbsp;`;
  }
  if (template === 'log') {
    return `<span class="ms-eq" style="${wrapStyle}"><sup style="font-size:0.72em;margin-right:1px;">${a}</sup><span>log&nbsp;(${b})</span></span>&nbsp;`;
  }
  if (template === 'sigma') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="display:inline-flex;flex-direction:column;align-items:center;margin-right:4px;"><span style="font-size:0.68em;line-height:1;">${b}</span><span style="font-size:1.35em;line-height:1;">∑</span><span style="font-size:0.68em;line-height:1;">${a}</span></span><span>(${c})</span></span>&nbsp;`;
  }
  if (template === 'limit') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="display:inline-flex;flex-direction:column;align-items:center;margin-right:4px;"><span style="font-size:0.95em;line-height:1;">lim</span><span style="font-size:0.68em;line-height:1;">${a}</span></span><span>(${b})</span></span>&nbsp;`;
  }
  if (template === 'matrix2x2') {
    return `<span class="ms-eq" style="${wrapStyle}"><span style="border-left:2px solid currentColor;border-top:1.5px solid currentColor;border-bottom:1.5px solid currentColor;width:4px;align-self:stretch;"></span><span style="display:inline-grid;grid-template-columns:auto auto;gap:2px 10px;padding:2px 6px;text-align:center;"><span>${a}</span><span>${b}</span><span>${c}</span><span>${d}</span></span><span style="border-right:2px solid currentColor;border-top:1.5px solid currentColor;border-bottom:1.5px solid currentColor;width:4px;align-self:stretch;"></span></span>&nbsp;`;
  }
  return `<span class="ms-eq" style="${wrapStyle}"><span>${a} = ${b}</span></span>&nbsp;`;
}

function createDefaultQuestion(number: number, type: OnlineExamQuestionType): OnlineExamQuestion {
  const id = `q-${Date.now()}-${number}-${Math.random().toString(36).slice(2, 6)}`;
  if (type === 'pg') {
    return {
      id,
      number,
      type: 'pg',
      questionHtml: '<p>Tuliskan naskah pertanyaan pilihan ganda di sini...</p>',
      scoreWeight: 1,
      options: [
        { id: 'A', label: 'A', textHtml: 'Pilihan jawaban A' },
        { id: 'B', label: 'B', textHtml: 'Pilihan jawaban B' },
        { id: 'C', label: 'C', textHtml: 'Pilihan jawaban C' },
        { id: 'D', label: 'D', textHtml: 'Pilihan jawaban D' }
      ],
      correctOptionId: 'A'
    };
  }
  if (type === 'pg_kompleks') {
    return {
      id,
      number,
      type: 'pg_kompleks',
      questionHtml: '<p>Pilihlah <b>lebih dari satu</b> pernyataan yang tepat berdasarkan bacaan/data berikut...</p>',
      scoreWeight: 2,
      options: [
        { id: 'P1', label: '1', textHtml: 'Pernyataan pertama' },
        { id: 'P2', label: '2', textHtml: 'Pernyataan kedua' },
        { id: 'P3', label: '3', textHtml: 'Pernyataan ketiga' },
        { id: 'P4', label: '4', textHtml: 'Pernyataan keempat' }
      ],
      correctOptionIds: ['P1', 'P2']
    };
  }
  if (type === 'menjodohkan') {
    return {
      id,
      number,
      type: 'menjodohkan',
      questionHtml: '<p>Pasangkan pernyataan pada lajur kiri dengan jawaban yang sesuai pada lajur kanan!</p>',
      scoreWeight: 2,
      matchingPairs: [
        { id: 'M1', leftPremise: 'Pernyataan / Konsep 1', rightResponse: 'Pasangan Jawaban 1' },
        { id: 'M2', leftPremise: 'Pernyataan / Konsep 2', rightResponse: 'Pasangan Jawaban 2' },
        { id: 'M3', leftPremise: 'Pernyataan / Konsep 3', rightResponse: 'Pasangan Jawaban 3' }
      ]
    };
  }
  if (type === 'benar_salah') {
    return {
      id,
      number,
      type: 'benar_salah',
      questionHtml: '<p>Tentukan apakah setiap pernyataan berikut <b>Benar</b> atau <b>Salah</b>!</p>',
      scoreWeight: 2,
      trueFalseItems: [
        { id: 'BS1', statement: 'Pernyataan analisis pertama', isTrue: true },
        { id: 'BS2', statement: 'Pernyataan analisis kedua', isTrue: false },
        { id: 'BS3', statement: 'Pernyataan analisis ketiga', isTrue: true }
      ]
    };
  }
  return {
    id,
    number,
    type: 'uraian',
    questionHtml: '<p>Jelaskan secara rinci dan sistematis pertanyaan uraian berikut...</p>',
    scoreWeight: 4,
    answerKeyText: ''
  };
}

export const OnlineExamWordEditor: React.FC<OnlineExamWordEditorProps> = ({
  creatorId,
  creatorName,
  creatorRole,
  curriculumSubjects,
  allowedSubjectNames,
  defaultClassName,
  availableClasses,
  initialPacketId,
  onPacketSaved,
  onRefreshData
}) => {
  const isTeacherOrHomeroom = creatorRole === 'Guru Mapel' || creatorRole === 'Wali Kelas';

  // Top-level mode tab for Guru Mapel & Wali Kelas:
  // 'editor' -> Lembar Kerja Buat Soal (MS Word)
  // 'uh_schedule' -> Jadwal & Jatah Ulangan Harian (UH) Online Mandiri (4 Slot TP)
  // 'uh_results' -> Hasil & Nilai Ulangan Harian Siswa (Otomatis Masuk UH TP 1..4)
  const [activeWorkTab, setActiveWorkTab] = useState<'editor' | 'uh_schedule' | 'uh_results'>('editor');

  const [packets, setPackets] = useState<OnlineExamPacket[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPacket, setLoadingPacket] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'questions' | 'equation'>('home');
  const [viewMode, setViewMode] = useState<'single_fast' | 'full_sheet'>('full_sheet');
  const [focusedQuestionIdx, setFocusedQuestionIdx] = useState<number>(0);
  const [fontFamily, setFontFamily] = useState<string>('Times New Roman');
  const [fontSizePt, setFontSizePt] = useState<string>('12pt');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Microsoft Word Equation Builder State
  const [eqTemplate, setEqTemplate] = useState<MathEquationTemplateType>('fraction');
  const [eqParams, setEqParams] = useState<{ a: string; b: string; c: string; d: string }>({
    a: '3',
    b: '4',
    c: '',
    d: ''
  });
  const [eqInsertTarget, setEqInsertTarget] = useState<string>('stem');

  // Teacher's UH Online schedules & submissions state
  const [teacherSchedules, setTeacherSchedules] = useState<
    (OnlineExamSchedule & { isCurrentlyOpenWib?: boolean; scheduleStatusWib?: string })[]
  >([]);
  const [submissions, setSubmissions] = useState<OnlineExamSubmission[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [savingUhSchedule, setSavingUhSchedule] = useState(false);
  const [syncingUhId, setSyncingUhId] = useState<string | null>(null);
  const [currentWibStr, setCurrentWibStr] = useState<string>('');
  const [selectedScheduleFilterId, setSelectedScheduleFilterId] = useState<string>('ALL');

  const taughtClassesList = useMemo(() => {
    const raw = Array.isArray(availableClasses) && availableClasses.length > 0
      ? availableClasses
      : defaultClassName
      ? [defaultClassName]
      : ['7A', '7B', '8A', '8B', '9A', '9B'];
    return Array.from(new Set(raw.map(c => c.trim()).filter(Boolean))).sort();
  }, [availableClasses, defaultClassName]);

  const availableSubjects = useMemo(() => {
    const base = Array.isArray(curriculumSubjects) && curriculumSubjects.length > 0
      ? curriculumSubjects
      : [
          { id: 'PAI', code: 'PAI', name: 'Pendidikan Agama Islam dan Budi Pekerti', category: 'Wajib' as const },
          { id: 'PPKN', code: 'PPKN', name: 'Pendidikan Pancasila', category: 'Wajib' as const },
          { id: 'BIN', code: 'BIN', name: 'Bahasa Indonesia', category: 'Wajib' as const },
          { id: 'MTK', code: 'MTK', name: 'Matematika', category: 'Wajib' as const },
          { id: 'IPA', code: 'IPA', name: 'Ilmu Pengetahuan Alam (IPA)', category: 'Wajib' as const },
          { id: 'IPS', code: 'IPS', name: 'Ilmu Pengetahuan Sosial (IPS)', category: 'Wajib' as const },
          { id: 'BING', code: 'BING', name: 'Bahasa Inggris', category: 'Wajib' as const },
          { id: 'PJOK', code: 'PJOK', name: 'PJOK', category: 'Wajib' as const },
          { id: 'INF', code: 'INF', name: 'Informatika', category: 'Wajib' as const },
          { id: 'SBK', code: 'SBK', name: 'Seni Budaya dan Prakarya', category: 'Wajib' as const },
          { id: 'BJW', code: 'BJW', name: 'Bahasa Jawa', category: 'Muatan Lokal' as const },
          { id: 'ASWAJA', code: 'ASWAJA', name: 'Ke-NU-an / Aswaja', category: 'Muatan Lokal' as const }
        ];
    if (!allowedSubjectNames || allowedSubjectNames.length === 0) return base;
    const normAllowed = allowedSubjectNames.map(s => s.trim().toLowerCase());
    const matched = base.filter(sub =>
      normAllowed.some(
        a =>
          sub.name.toLowerCase().includes(a) ||
          a.includes(sub.name.toLowerCase()) ||
          sub.code.toLowerCase() === a
      )
    );
    return matched.length > 0 ? matched : base;
  }, [curriculumSubjects, allowedSubjectNames]);

  const defaultGrade = useMemo((): '7' | '8' | '9' => {
    const firstCls = defaultClassName || taughtClassesList[0] || '';
    const m = firstCls.match(/^([789])/);
    if (m) return m[1] as '7' | '8' | '9';
    return '7';
  }, [defaultClassName, taughtClassesList]);

  const todayWib = useMemo(() => {
    const d = new Date(Date.now() + 7 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }, []);

  const [currentPacket, setCurrentPacket] = useState<OnlineExamPacket>(() => {
    const firstSub = availableSubjects[0] || { id: 'MTK', name: 'Matematika' };
    const initClass = defaultClassName || taughtClassesList[0] || '';
    return {
      id: '',
      title: `Naskah Soal ${firstSub.name} Kelas ${initClass || defaultGrade}`,
      subjectId: firstSub.id,
      subjectName: firstSub.name,
      gradeLevel: defaultGrade,
      targetClasses: initClass ? [initClass] : [],
      semester: 'Genap',
      academicYear: '2025/2026',
      examCategory: 'SAS',
      packetPurpose: 'bank_soal',
      creatorId,
      creatorName,
      creatorRole,
      status: 'published',
      questions: [createDefaultQuestion(1, 'pg')],
      questionCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Teacher's UH Online schedule form state
  const [selectedQuotaClass, setSelectedQuotaClass] = useState<string>(
    defaultClassName || taughtClassesList[0] || '7A'
  );
  const [selectedQuotaSubjectId, setSelectedQuotaSubjectId] = useState<string>(
    availableSubjects[0]?.id || 'MTK'
  );

  const [uhScheduleForm, setUhScheduleForm] = useState<OnlineExamSchedule>(() => {
    const firstSub = availableSubjects[0] || { id: 'MTK', name: 'Matematika' };
    const initClass = defaultClassName || taughtClassesList[0] || '7A';
    return {
      id: '',
      packetId: '',
      packetTitle: '',
      subjectId: firstSub.id,
      subjectName: firstSub.name,
      gradeLevel: defaultGrade,
      targetClasses: [initClass],
      semester: 'Genap',
      academicYear: '2025/2026',
      examDate: todayWib,
      startTimeWib: '07:30',
      endTimeWib: '09:00',
      durationMinutes: 60,
      isActive: true,
      tokenCode: '',
      gpsLockEnabled: false,
      schoolLatitude: -7.9096,
      schoolLongitude: 110.2966,
      schoolRadiusMeters: 150,
      sickStudentDefaultRadiusMeters: 15000,
      sickStudentsHomeOverrides: [],
      scheduleType: 'teacher_uh',
      scoreTargetMode: 'uh_tp1',
      creatorId,
      creatorName,
      creatorRole,
      scoringConfig: {
        pgWeight: 1,
        pgKompleksWeight: 2,
        menjodohkanWeight: 2,
        benarSalahWeight: 1,
        uraianWeight: 4,
        maxScaleScore: 100,
        useQuestionCustomScore: true,
        autoSyncToSas: true,
        scheduleType: 'teacher_uh',
        scoreTargetMode: 'uh_tp1',
        creatorId,
        creatorName,
        creatorRole
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const activeEditableRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const fetchPacketsList = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/online-exams/packets?summary=1');
      const data = await res.json();
      if (data.success && Array.isArray(data.packets)) {
        setPackets(data.packets);
      }
    } catch (_err) {
      // ignore
    } finally {
      setLoadingList(false);
    }
  };

  const fetchTeacherUhData = async () => {
    setLoadingSchedules(true);
    try {
      const [schRes, subRes] = await Promise.all([
        fetch('/api/online-exams/schedules'),
        fetch('/api/online-exams/submissions')
      ]);
      const [schData, subData] = await Promise.all([schRes.json(), subRes.json()]);
      if (schData.success && Array.isArray(schData.schedules)) {
        setTeacherSchedules(schData.schedules);
      }
      if (schData.currentWib?.isoWib) {
        setCurrentWibStr(schData.currentWib.isoWib);
      }
      if (subData.success && Array.isArray(subData.submissions)) {
        setSubmissions(subData.submissions);
      }
    } catch (_err) {
      // ignore
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadPacketById = async (packetId: string) => {
    if (!packetId) return;
    setLoadingPacket(true);
    try {
      const res = await fetch(`/api/online-exams/packets/${encodeURIComponent(packetId)}`);
      const data = await res.json();
      if (data.success && data.packet) {
        const pkt: OnlineExamPacket = data.packet;
        if (!Array.isArray(pkt.questions) || pkt.questions.length === 0) {
          pkt.questions = [createDefaultQuestion(1, 'pg')];
        }
        if (!pkt.packetPurpose) {
          pkt.packetPurpose = pkt.examCategory === 'UH' ? 'ulangan_harian' : 'bank_soal';
        }
        setCurrentPacket(pkt);
        setFocusedQuestionIdx(0);
      }
    } catch (_err) {
      showToast('error', 'Gagal memuat detail paket soal dari MySQL.');
    } finally {
      setLoadingPacket(false);
    }
  };

  useEffect(() => {
    fetchPacketsList();
    if (isTeacherOrHomeroom) {
      fetchTeacherUhData();
    }
  }, [isTeacherOrHomeroom]);

  useEffect(() => {
    if (initialPacketId) {
      loadPacketById(initialPacketId);
    }
  }, [initialPacketId]);

  const handleExecCommand = (command: string, value?: string) => {
    if (activeEditableRef.current) {
      activeEditableRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const activeEqTemplateMeta = useMemo(
    () => MATH_EQUATION_TEMPLATES.find(t => t.id === eqTemplate) || MATH_EQUATION_TEMPLATES[0],
    [eqTemplate]
  );

  const liveEquationPreviewHtml = useMemo(
    () => buildMathEquationHtml(eqTemplate, eqParams),
    [eqTemplate, eqParams]
  );

  const handleSelectEqTemplate = (tplId: MathEquationTemplateType) => {
    setEqTemplate(tplId);
    const meta = MATH_EQUATION_TEMPLATES.find(t => t.id === tplId);
    if (meta) {
      setEqParams({ ...meta.defaultValues });
    }
  };

  const handleInsertEquationToTarget = (overrideTarget?: string, overrideQuestionIdx?: number) => {
    const qIdx =
      overrideQuestionIdx !== undefined
        ? overrideQuestionIdx
        : Math.max(0, Math.min(focusedQuestionIdx, currentPacket.questions.length - 1));
    const target = overrideTarget || eqInsertTarget || 'stem';
    const eqHtml = buildMathEquationHtml(eqTemplate, eqParams);

    if (target === 'stem') {
      // If activeEditableRef is currently focused on the active question stem, insert at cursor
      if (activeEditableRef.current) {
        activeEditableRef.current.focus();
        document.execCommand('insertHTML', false, eqHtml);
        const updatedHtml = activeEditableRef.current.innerHTML;
        updateQuestionAt(qIdx, prevQ => ({ ...prevQ, questionHtml: updatedHtml }));
      } else {
        updateQuestionAt(qIdx, prevQ => ({
          ...prevQ,
          questionHtml: `${prevQ.questionHtml || ''} ${eqHtml}`
        }));
      }
      showToast('success', `Rumus matematika (${activeEqTemplateMeta.label}) berhasil disisipkan ke Soal No. ${qIdx + 1}!`);
      return;
    }

    if (target.startsWith('opt-')) {
      const optIdx = Number(target.replace('opt-', ''));
      updateQuestionAt(qIdx, prevQ => ({
        ...prevQ,
        options: (prevQ.options || []).map((o, i) =>
          i === optIdx ? { ...o, textHtml: `${o.textHtml || ''} ${eqHtml}`.trim() } : o
        )
      }));
      showToast(
        'success',
        `Rumus matematika (${activeEqTemplateMeta.label}) berhasil disisipkan ke Pilihan Jawaban Soal No. ${qIdx + 1}!`
      );
    }
  };

  const handleInsertTableHtml = () => {
    const tableHtml = `
      <table style="width:100%; border-collapse: collapse; margin: 8px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #475569; padding: 6px;">Kolom 1</th>
            <th style="border: 1px solid #475569; padding: 6px;">Kolom 2</th>
            <th style="border: 1px solid #475569; padding: 6px;">Kolom 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #475569; padding: 6px;">Data 1A</td>
            <td style="border: 1px solid #475569; padding: 6px;">Data 1B</td>
            <td style="border: 1px solid #475569; padding: 6px;">Data 1C</td>
          </tr>
          <tr>
            <td style="border: 1px solid #475569; padding: 6px;">Data 2A</td>
            <td style="border: 1px solid #475569; padding: 6px;">Data 2B</td>
            <td style="border: 1px solid #475569; padding: 6px;">Data 2C</td>
          </tr>
        </tbody>
      </table>
    `;
    handleExecCommand('insertHTML', tableHtml);
  };

  const handleAddQuestion = (type: OnlineExamQuestionType) => {
    setCurrentPacket(prev => {
      const nextNum = prev.questions.length + 1;
      const newQ = createDefaultQuestion(nextNum, type);
      const updated = [...prev.questions, newQ];
      setFocusedQuestionIdx(updated.length - 1);
      return {
        ...prev,
        questions: updated,
        questionCount: updated.length
      };
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (currentPacket.questions.length <= 1) {
      showToast('error', 'Minimal harus terdapat 1 butir soal pada lembar kerja.');
      return;
    }
    setCurrentPacket(prev => {
      const filtered = prev.questions
        .filter((_, idx) => idx !== index)
        .map((q, idx) => ({ ...q, number: idx + 1 }));
      setFocusedQuestionIdx(Math.max(0, Math.min(focusedQuestionIdx, filtered.length - 1)));
      return {
        ...prev,
        questions: filtered,
        questionCount: filtered.length
      };
    });
  };

  const updateQuestionAt = (index: number, updater: (q: OnlineExamQuestion) => OnlineExamQuestion) => {
    setCurrentPacket(prev => {
      const nextQuestions = prev.questions.map((q, idx) => (idx === index ? updater(q) : q));
      return { ...prev, questions: nextQuestions };
    });
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>, questionIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          updateQuestionAt(questionIdx, q => ({ ...q, imageUrl: compressedDataUrl }));
        }
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateNewBlankPacket = (purpose: OnlineExamPacketPurpose = 'bank_soal') => {
    const firstSub = availableSubjects[0] || { id: 'MTK', name: 'Matematika' };
    const initClass = defaultClassName || taughtClassesList[0] || '';
    const isUh = purpose === 'ulangan_harian';
    setCurrentPacket({
      id: '',
      title: isUh
        ? `Ulangan Harian (UH) ${firstSub.name} Kelas ${initClass || defaultGrade}`
        : `Naskah Soal SAS ${firstSub.name} Kelas ${defaultGrade}`,
      subjectId: firstSub.id,
      subjectName: firstSub.name,
      gradeLevel: defaultGrade,
      targetClasses: initClass ? [initClass] : [],
      semester: 'Genap',
      academicYear: '2025/2026',
      examCategory: isUh ? 'UH' : 'SAS',
      packetPurpose: purpose,
      creatorId,
      creatorName,
      creatorRole,
      status: 'published',
      questions: [createDefaultQuestion(1, 'pg')],
      questionCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setFocusedQuestionIdx(0);
  };

  const handleSavePacketToMysql = async (
    targetStatus?: 'draft' | 'published',
    openUhScheduleAfterSave?: boolean
  ) => {
    if (!currentPacket.title.trim()) {
      showToast('error', 'Judul naskah soal wajib diisi.');
      return;
    }
    const purpose = currentPacket.packetPurpose || 'bank_soal';
    if (
      (purpose === 'ulangan_harian' || purpose === 'both') &&
      (!Array.isArray(currentPacket.targetClasses) || currentPacket.targetClasses.length === 0)
    ) {
      showToast('error', 'Pilih minimal 1 Kelas yang Diampu untuk paket soal Ulangan Harian.');
      return;
    }

    setSaving(true);
    try {
      const payload: OnlineExamPacket = {
        ...currentPacket,
        packetPurpose: purpose,
        examCategory: purpose === 'ulangan_harian' ? 'UH' : currentPacket.examCategory,
        status: targetStatus || currentPacket.status || 'published',
        creatorId: currentPacket.creatorId || creatorId,
        creatorName: currentPacket.creatorName || creatorName,
        creatorRole: currentPacket.creatorRole || creatorRole,
        questionCount: currentPacket.questions.length
      };
      const res = await fetch('/api/online-exams/packets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.packet) {
        const savedPkt: OnlineExamPacket = data.packet;
        setCurrentPacket(savedPkt);
        const destLabel =
          purpose === 'ulangan_harian'
            ? `Ulangan Harian Kelas (${(savedPkt.targetClasses || []).join(', ')})`
            : purpose === 'both'
            ? `Bank Soal Mapel & Ulangan Harian Kelas (${(savedPkt.targetClasses || []).join(', ')})`
            : 'Bank Soal Master Data Mapel (Waka Kurikulum)';
        showToast('success', `Naskah soal berhasil disimpan ke ${destLabel} (MySQL)!`);
        fetchPacketsList();
        if (onPacketSaved) onPacketSaved(savedPkt);

        if (openUhScheduleAfterSave && isTeacherOrHomeroom) {
          const firstCls = savedPkt.targetClasses?.[0] || defaultClassName || taughtClassesList[0] || '7A';
          setSelectedQuotaClass(firstCls);
          setSelectedQuotaSubjectId(savedPkt.subjectId);
          setUhScheduleForm(prev => ({
            ...prev,
            id: '',
            packetId: savedPkt.id,
            packetTitle: savedPkt.title,
            subjectId: savedPkt.subjectId,
            subjectName: savedPkt.subjectName,
            gradeLevel: savedPkt.gradeLevel,
            targetClasses: savedPkt.targetClasses?.length ? savedPkt.targetClasses : [firstCls],
            semester: savedPkt.semester,
            academicYear: savedPkt.academicYear
          }));
          setActiveWorkTab('uh_schedule');
          fetchTeacherUhData();
        }
      } else {
        showToast('error', data.message || 'Gagal menyimpan paket soal ke MySQL.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghubungi server MySQL.');
    } finally {
      setSaving(false);
    }
  };

  // Packets available for Ulangan Harian scheduling by this teacher/homeroom
  const uhAvailablePackets = useMemo(() => {
    return packets.filter(p => {
      const isAllowedSub = availableSubjects.some(
        s => s.id === p.subjectId || s.name.toLowerCase() === p.subjectName.toLowerCase()
      );
      return isAllowedSub;
    });
  }, [packets, availableSubjects]);

  // Filter schedules relevant to this teacher / homeroom
  const myUhSchedules = useMemo(() => {
    return teacherSchedules.filter(s => {
      if ((s.scheduleType || 'waka_sas') !== 'teacher_uh') return false;
      if (s.creatorId && s.creatorId === creatorId) return true;
      const isAllowedSub = availableSubjects.some(
        sub => sub.id === s.subjectId || sub.name.toLowerCase() === s.subjectName.toLowerCase()
      );
      const hasClassOverlap = (s.targetClasses || []).some(c =>
        taughtClassesList.map(tc => tc.toUpperCase()).includes(c.toUpperCase())
      );
      return isAllowedSub && hasClassOverlap;
    });
  }, [teacherSchedules, creatorId, availableSubjects, taughtClassesList]);

  // Compute the 4 UH TP Quota Slots for `selectedQuotaClass` + `selectedQuotaSubjectId`
  const quotaSlotsStatus = useMemo(() => {
    const selectedSubObj = availableSubjects.find(s => s.id === selectedQuotaSubjectId) || availableSubjects[0];
    return UH_TP_SLOTS.map(slot => {
      const matchedSchedule = myUhSchedules.find(s => {
        const sMode = s.scoreTargetMode || s.scoringConfig?.scoreTargetMode || 'uh_tp1';
        if (sMode !== slot.mode) return false;
        const sameSub =
          s.subjectId === selectedQuotaSubjectId ||
          (selectedSubObj && s.subjectName.toLowerCase() === selectedSubObj.name.toLowerCase());
        if (!sameSub) return false;
        const normClasses = (s.targetClasses || []).map(c => c.trim().toUpperCase());
        return normClasses.includes(selectedQuotaClass.trim().toUpperCase());
      });
      return {
        ...slot,
        schedule: matchedSchedule || null
      };
    });
  }, [myUhSchedules, selectedQuotaClass, selectedQuotaSubjectId, availableSubjects]);

  const usedQuotaCount = useMemo(
    () => quotaSlotsStatus.filter(s => Boolean(s.schedule)).length,
    [quotaSlotsStatus]
  );

  const handleSelectQuotaSlotForForm = (
    slotMode: 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4',
    existingSchedule?: OnlineExamSchedule | null
  ) => {
    if (existingSchedule) {
      setUhScheduleForm({
        ...existingSchedule,
        scheduleType: 'teacher_uh',
        scoreTargetMode: slotMode,
        scoringConfig: {
          ...existingSchedule.scoringConfig,
          scheduleType: 'teacher_uh',
          scoreTargetMode: slotMode,
          autoSyncToSas: true
        }
      });
      return;
    }

    const subObj = availableSubjects.find(s => s.id === selectedQuotaSubjectId) || availableSubjects[0];
    const matchingPackets = uhAvailablePackets.filter(
      p => p.subjectId === subObj?.id || p.subjectName.toLowerCase() === (subObj?.name || '').toLowerCase()
    );
    const defaultPkt = matchingPackets[0] || uhAvailablePackets[0];
    const gradeMatch = selectedQuotaClass.match(/^([789])/);
    const grade = (gradeMatch ? gradeMatch[1] : defaultGrade) as '7' | '8' | '9';

    setUhScheduleForm(prev => ({
      ...prev,
      id: '',
      packetId: defaultPkt?.id || prev.packetId || '',
      packetTitle: defaultPkt?.title || prev.packetTitle || '',
      subjectId: subObj?.id || prev.subjectId,
      subjectName: subObj?.name || prev.subjectName,
      gradeLevel: grade,
      targetClasses: [selectedQuotaClass],
      scheduleType: 'teacher_uh',
      scoreTargetMode: slotMode,
      creatorId,
      creatorName,
      creatorRole,
      scoringConfig: {
        ...prev.scoringConfig,
        scheduleType: 'teacher_uh',
        scoreTargetMode: slotMode,
        autoSyncToSas: true,
        creatorId,
        creatorName,
        creatorRole
      }
    }));
  };

  const handleSaveTeacherUhSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uhScheduleForm.packetId) {
      showToast('error', 'Pilih paket soal Ulangan Harian terlebih dahulu.');
      return;
    }
    if (!uhScheduleForm.targetClasses || uhScheduleForm.targetClasses.length === 0) {
      showToast('error', 'Pilih minimal 1 kelas yang diampu untuk jadwal Ulangan Harian.');
      return;
    }
    if (!uhScheduleForm.examDate || !uhScheduleForm.startTimeWib || !uhScheduleForm.endTimeWib) {
      showToast('error', 'Tanggal ujian, Jam Mulai (WIB), dan Jam Selesai (WIB) wajib diisi.');
      return;
    }

    const selectedPkt = packets.find(p => p.id === uhScheduleForm.packetId);
    const targetMode: OnlineExamScoreTargetMode =
      uhScheduleForm.scoreTargetMode &&
      ['uh_tp1', 'uh_tp2', 'uh_tp3', 'uh_tp4'].includes(uhScheduleForm.scoreTargetMode)
        ? uhScheduleForm.scoreTargetMode
        : 'uh_tp1';

    setSavingUhSchedule(true);
    try {
      const payload: OnlineExamSchedule = {
        ...uhScheduleForm,
        packetTitle: selectedPkt?.title || uhScheduleForm.packetTitle,
        subjectId: selectedPkt?.subjectId || uhScheduleForm.subjectId,
        subjectName: selectedPkt?.subjectName || uhScheduleForm.subjectName,
        gradeLevel: selectedPkt?.gradeLevel || uhScheduleForm.gradeLevel,
        scheduleType: 'teacher_uh',
        scoreTargetMode: targetMode,
        creatorId,
        creatorName,
        creatorRole,
        scoringConfig: {
          ...uhScheduleForm.scoringConfig,
          autoSyncToSas: true,
          scheduleType: 'teacher_uh',
          scoreTargetMode: targetMode,
          creatorId,
          creatorName,
          creatorRole
        }
      };

      const res = await fetch('/api/online-exams/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.schedule) {
        const tpLabel = targetMode.replace('uh_tp', 'TP ');
        showToast(
          'success',
          `Jadwal Ulangan Harian (${tpLabel}) berhasil disimpan ke MySQL! Nilai siswa otomatis masuk ke Kolom UH ${tpLabel} di Penilaian.`
        );
        setUhScheduleForm(data.schedule);
        fetchTeacherUhData();
        if (onRefreshData) onRefreshData();
      } else {
        showToast('error', data.message || 'Gagal menyimpan jadwal Ulangan Harian.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghubungi server MySQL.');
    } finally {
      setSavingUhSchedule(false);
    }
  };

  const handleDeleteUhSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/online-exams/schedules/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Jadwal Ulangan Harian berhasil dihapus dari MySQL.');
        if (uhScheduleForm.id === id) {
          setUhScheduleForm(prev => ({ ...prev, id: '' }));
        }
        fetchTeacherUhData();
      } else {
        showToast('error', data.message || 'Gagal menghapus jadwal Ulangan Harian.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus jadwal.');
    }
  };

  const handleSyncScheduleToUhTp = async (
    scheduleId: string,
    scoreTargetMode: 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4'
  ) => {
    setSyncingUhId(scheduleId);
    try {
      const res = await fetch('/api/online-exams/sync-to-uh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          scoreTargetMode,
          teacherName: creatorName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Nilai berhasil disinkronkan ke Ulangan Harian di Penilaian!');
        fetchTeacherUhData();
        if (onRefreshData) onRefreshData();
      } else {
        showToast('error', data.message || 'Gagal menyinkronkan nilai ke Penilaian.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghubungi server MySQL.');
    } finally {
      setSyncingUhId(null);
    }
  };

  const myUhSubmissions = useMemo(() => {
    const myScheduleIds = new Set(myUhSchedules.map(s => s.id));
    return submissions.filter(sub => {
      if (!myScheduleIds.has(sub.scheduleId)) return false;
      if (selectedScheduleFilterId !== 'ALL' && sub.scheduleId !== selectedScheduleFilterId) return false;
      return true;
    });
  }, [submissions, myUhSchedules, selectedScheduleFilterId]);

  const questionsToRender = useMemo(() => {
    if (viewMode === 'single_fast') {
      const safeIdx = Math.max(0, Math.min(focusedQuestionIdx, currentPacket.questions.length - 1));
      const item = currentPacket.questions[safeIdx];
      return item ? [{ question: item, index: safeIdx }] : [];
    }
    return currentPacket.questions.map((question, index) => ({ question, index }));
  }, [viewMode, focusedQuestionIdx, currentPacket.questions]);

  const saveButtonLabel = useMemo(() => {
    const p = currentPacket.packetPurpose || 'bank_soal';
    if (p === 'ulangan_harian') return 'Simpan untuk Ulangan Harian Kelas (MySQL)';
    if (p === 'both') return 'Simpan ke Bank Soal & UH Kelas (MySQL)';
    return 'Simpan ke Bank Soal Mapel (MySQL)';
  }, [currentPacket.packetPurpose]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-800/90 p-2 sm:p-4'
          : 'w-full min-w-0'
      }
    >
      <div className="w-full min-w-0 rounded-2xl border border-slate-300 bg-slate-100 shadow-lg">
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`px-4 py-3 rounded-t-2xl text-sm font-medium flex items-center justify-between ${
              toastMsg.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <span>{toastMsg.text}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-xs underline ml-4 opacity-90 hover:opacity-100"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Top Mode Switcher for Guru Mapel & Wali Kelas */}
        {isTeacherOrHomeroom && (
          <div className="bg-slate-900 text-white px-3 sm:px-5 py-2.5 rounded-t-2xl border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveWorkTab('editor')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeWorkTab === 'editor'
                    ? 'bg-[#185abd] text-white shadow-sm ring-1 ring-blue-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. Lembar Kerja Buat Soal (Bank Soal / UH Kelas)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWorkTab('uh_schedule');
                  fetchTeacherUhData();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeWorkTab === 'uh_schedule'
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>2. Jadwal & Jatah Ulangan Harian Online (4 TP)</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
                  {myUhSchedules.length} Jadwal
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWorkTab('uh_results');
                  fetchTeacherUhData();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeWorkTab === 'uh_results'
                    ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>3. Hasil & Nilai Ulangan Harian (Otomatis Masuk UH TP)</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20">
                  {myUhSubmissions.length}
                </span>
              </button>
            </div>

            <div className="text-[11px] text-slate-300 flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 rounded-lg font-semibold">
                Jatah UH: 4 Kali per Mapel/Kelas (UH TP 1, TP 2, TP 3, TP 4)
              </span>
            </div>
          </div>
        )}

        {/* ================================================================================= */}
        {/* TAB 2: JADWAL & JATAH ULANGAN HARIAN (UH) ONLINE MANDIRI (GURU MAPEL / WALI KELAS) */}
        {/* ================================================================================= */}
        {isTeacherOrHomeroom && activeWorkTab === 'uh_schedule' && (
          <div className="p-4 sm:p-6 bg-slate-50 rounded-b-2xl space-y-6 text-slate-800">
            {/* Header Banner & Quota Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Jadwal & Jatah Ulangan Harian (UH) Online Mandiri — {creatorRole}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Buat jadwal Ulangan Harian (UH) Online sendiri untuk kelas yang Anda ampu. Nilai hasil ulangan siswa otomatis masuk ke kolom <b>Ulangan Harian (UH)</b> pada <b>TP 1, TP 2, TP 3, atau TP 4</b> di Sistem Penilaian (MySQL).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentWibStr && (
                    <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Waktu Server: {currentWibStr}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchTeacherUhData}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSchedules ? 'animate-spin' : ''}`} />
                    Muat Ulang
                  </button>
                </div>
              </div>

              {/* Filter Kelas & Mapel untuk Melihat 4 Jatah UH TP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Pilih Kelas yang Diampu:
                  </label>
                  <select
                    value={selectedQuotaClass}
                    onChange={e => {
                      const cls = e.target.value;
                      setSelectedQuotaClass(cls);
                      const gm = cls.match(/^([789])/);
                      setUhScheduleForm(prev => ({
                        ...prev,
                        gradeLevel: (gm ? gm[1] : prev.gradeLevel) as '7' | '8' | '9',
                        targetClasses: [cls]
                      }));
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white"
                  >
                    {taughtClassesList.map(cls => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Pilih Mata Pelajaran:
                  </label>
                  <select
                    value={selectedQuotaSubjectId}
                    onChange={e => {
                      const subId = e.target.value;
                      setSelectedQuotaSubjectId(subId);
                      const subObj = availableSubjects.find(s => s.id === subId);
                      if (subObj) {
                        setUhScheduleForm(prev => ({
                          ...prev,
                          subjectId: subObj.id,
                          subjectName: subObj.name
                        }));
                      }
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white"
                  >
                    {availableSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-center">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Kuota Ulangan Harian Kelas {selectedQuotaClass}
                  </div>
                  <div className="text-sm font-black text-emerald-950 mt-0.5">
                    Terpakai {usedQuotaCount} dari 4 Jatah UH TP
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Sesuai 4 Tujuan Pembelajaran (TP 1 – TP 4) di Penilaian
                  </div>
                </div>
              </div>

              {/* 4 Kartu Jatah Ulangan Harian Sesuai TP di Penilaian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {quotaSlotsStatus.map(slot => {
                  const isSelectedInForm = uhScheduleForm.scoreTargetMode === slot.mode;
                  const sch = slot.schedule;
                  return (
                    <div
                      key={slot.mode}
                      onClick={() => handleSelectQuotaSlotForForm(slot.mode, sch)}
                      className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelectedInForm
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                          : sch
                          ? 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-extrabold">
                            JATAH {slot.quotaNumber}: {slot.shortLabel}
                          </span>
                          {sch ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              Terjadwal
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-semibold">
                              Tersedia
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800">{slot.columnLabel}</p>
                        {sch ? (
                          <div className="mt-2 text-[11px] text-slate-700 space-y-0.5 bg-white/90 p-2 rounded-lg border border-slate-200">
                            <div className="font-bold text-slate-900 truncate" title={sch.packetTitle}>
                              {sch.packetTitle}
                            </div>
                            <div className="text-slate-600">
                              📅 {sch.examDate} • ⏰ {sch.startTimeWib}–{sch.endTimeWib} WIB
                            </div>
                            <div className="text-[10px] font-bold text-emerald-700">
                              ✓ Otomatis masuk {slot.shortLabel}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 mt-2">
                            Klik kartu ini untuk membuat jadwal {slot.shortLabel} pada Kelas {selectedQuotaClass}.
                          </p>
                        )}
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className={isSelectedInForm ? 'text-emerald-700' : 'text-blue-700'}>
                          {sch ? 'Edit Jadwal Slot Ini →' : '+ Buat Jadwal Slot Ini →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Buat / Atur Jadwal Ulangan Harian Mandiri & Daftar Jadwal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Form: 5 cols */}
              <form
                onSubmit={handleSaveTeacherUhSchedule}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 text-xs"
              >
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {uhScheduleForm.id
                        ? `Edit Jadwal ${uhScheduleForm.scoreTargetMode?.replace('uh_tp', 'UH TP ')}`
                        : `Buat Jadwal Ulangan Harian Baru (${uhScheduleForm.scoreTargetMode?.replace('uh_tp', 'UH TP ')})`}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Waktu aktif otomatis mengikuti Waktu Indonesia Barat (WIB)
                    </p>
                  </div>
                  {uhScheduleForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setUhScheduleForm(prev => ({
                          ...prev,
                          id: ''
                        }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                    >
                      Reset Form
                    </button>
                  )}
                </div>

                {/* Pilihan Jatah UH TP (1 s/d 4) */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                  <label className="block font-extrabold text-emerald-950">
                    Jatah Ulangan Harian di Penilaian (Otomatis Masuk Nilai UH TP):
                  </label>
                  <select
                    value={uhScheduleForm.scoreTargetMode || 'uh_tp1'}
                    onChange={e => {
                      const mode = e.target.value as 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4';
                      setUhScheduleForm(prev => ({
                        ...prev,
                        scoreTargetMode: mode,
                        scoringConfig: {
                          ...prev.scoringConfig,
                          scoreTargetMode: mode,
                          autoSyncToSas: true
                        }
                      }));
                    }}
                    className="w-full border border-emerald-400 rounded-lg px-3 py-2 font-bold text-slate-900 bg-white"
                  >
                    {UH_TP_SLOTS.map(slot => (
                      <option key={slot.mode} value={slot.mode}>
                        {slot.fullLabel} → [{slot.columnLabel}]
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-emerald-800">
                    Begitu siswa selesai mengerjakan, nilai otomatis masuk ke kolom <b>{uhScheduleForm.scoreTargetMode?.replace('uh_tp', 'UH TP ')}</b> pada menu Penilaian.
                  </p>
                </div>

                {/* Pilih Paket Soal */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Paket Soal (Dari Soal UH Kelas / Bank Soal):
                  </label>
                  <select
                    value={uhScheduleForm.packetId}
                    onChange={e => {
                      const pkt = packets.find(p => p.id === e.target.value);
                      if (pkt) {
                        setUhScheduleForm(prev => ({
                          ...prev,
                          packetId: pkt.id,
                          packetTitle: pkt.title,
                          subjectId: pkt.subjectId,
                          subjectName: pkt.subjectName,
                          gradeLevel: pkt.gradeLevel,
                          targetClasses:
                            Array.isArray(pkt.targetClasses) && pkt.targetClasses.length > 0
                              ? pkt.targetClasses
                              : prev.targetClasses
                        }));
                      } else {
                        setUhScheduleForm(prev => ({ ...prev, packetId: e.target.value }));
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 bg-white"
                  >
                    <option value="">-- Pilih Paket Soal ({uhAvailablePackets.length} Paket) --</option>
                    {uhAvailablePackets.map(p => {
                      const purposeBadge =
                        p.packetPurpose === 'ulangan_harian'
                          ? 'Khusus UH Kelas'
                          : p.packetPurpose === 'both'
                          ? 'Bank Soal & UH Kelas'
                          : 'Bank Soal Mapel';
                      return (
                        <option key={p.id} value={p.id}>
                          [{purposeBadge}] {p.title} — {p.subjectName} ({p.questionCount} Soal)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Pilih Kelas yang Diampu */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Kelas yang Mengikuti Ulangan Harian Ini:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {taughtClassesList.map(cls => {
                      const isChecked = (uhScheduleForm.targetClasses || []).includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setSelectedQuotaClass(cls);
                            setUhScheduleForm(prev => {
                              const cur = prev.targetClasses || [];
                              const next = cur.includes(cls)
                                ? cur.filter(c => c !== cls)
                                : [...cur, cls];
                              return { ...prev, targetClasses: next };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          Kelas {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Waktu & Tanggal Pelaksanaan (WIB) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Ulangan (WIB):</label>
                    <input
                      type="date"
                      value={uhScheduleForm.examDate}
                      onChange={e =>
                        setUhScheduleForm(prev => ({ ...prev, examDate: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Durasi Pengerjaan (Menit):</label>
                    <input
                      type="number"
                      min={10}
                      max={240}
                      value={uhScheduleForm.durationMinutes}
                      onChange={e =>
                        setUhScheduleForm(prev => ({
                          ...prev,
                          durationMinutes: Math.max(10, Number(e.target.value) || 60)
                        }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam Mulai (WIB):</label>
                    <input
                      type="time"
                      value={uhScheduleForm.startTimeWib}
                      onChange={e =>
                        setUhScheduleForm(prev => ({ ...prev, startTimeWib: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam Selesai (WIB):</label>
                    <input
                      type="time"
                      value={uhScheduleForm.endTimeWib}
                      onChange={e =>
                        setUhScheduleForm(prev => ({ ...prev, endTimeWib: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Semester:</label>
                    <select
                      value={uhScheduleForm.semester}
                      onChange={e =>
                        setUhScheduleForm(prev => ({ ...prev, semester: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Token Ulangan (Opsional):</label>
                    <input
                      type="text"
                      value={uhScheduleForm.tokenCode || ''}
                      onChange={e =>
                        setUhScheduleForm(prev => ({
                          ...prev,
                          tokenCode: e.target.value.toUpperCase()
                        }))
                      }
                      placeholder="Kosongkan jika tanpa token"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Opsi Kunci Lokasi GPS */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Aktifkan Kunci Lokasi / Radius GPS Sekolah
                    </span>
                    <input
                      type="checkbox"
                      checked={uhScheduleForm.gpsLockEnabled}
                      onChange={e =>
                        setUhScheduleForm(prev => ({ ...prev, gpsLockEnabled: e.target.checked }))
                      }
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </label>
                  {uhScheduleForm.gpsLockEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">
                          Radius Sekolah (Meter):
                        </label>
                        <input
                          type="number"
                          min={30}
                          value={uhScheduleForm.schoolRadiusMeters}
                          onChange={e =>
                            setUhScheduleForm(prev => ({
                              ...prev,
                              schoolRadiusMeters: Number(e.target.value) || 150
                            }))
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">
                          Radius Siswa Sakit di Rumah (m):
                        </label>
                        <input
                          type="number"
                          min={100}
                          value={uhScheduleForm.sickStudentDefaultRadiusMeters}
                          onChange={e =>
                            setUhScheduleForm(prev => ({
                              ...prev,
                              sickStudentDefaultRadiusMeters: Number(e.target.value) || 15000
                            }))
                          }
                          className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingUhSchedule}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingUhSchedule
                      ? 'Menyimpan Jadwal UH...'
                      : `Simpan & Aktifkan Jadwal ${uhScheduleForm.scoreTargetMode?.replace('uh_tp', 'UH TP ')}`}
                  </span>
                </button>
              </form>

              {/* Right Column: List of Active Teacher UH Schedules (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Daftar Jadwal Ulangan Harian (UH) Online Anda ({myUhSchedules.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Soal aktif otomatis pada ponsel/perangkat siswa sesuai tanggal & jam WIB yang dijadwalkan
                    </p>
                  </div>
                </div>

                {myUhSchedules.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-semibold">Belum ada jadwal Ulangan Harian (UH) Online yang dibuat.</p>
                    <p>Pilih salah satu dari 4 Kartu Jatah UH TP di atas lalu simpan jadwal di formulir sebelah kiri.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myUhSchedules.map(sch => {
                      const tpMode = (sch.scoreTargetMode ||
                        sch.scoringConfig?.scoreTargetMode ||
                        'uh_tp1') as 'uh_tp1' | 'uh_tp2' | 'uh_tp3' | 'uh_tp4';
                      const tpBadge = tpMode.replace('uh_tp', 'UH TP ');
                      const subCount = submissions.filter(s => s.scheduleId === sch.id).length;

                      return (
                        <div
                          key={sch.id}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-extrabold text-[11px]">
                                {tpBadge} (Penilaian)
                              </span>
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px]">
                                Kelas {(sch.targetClasses || []).join(', ') || sch.gradeLevel}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                  sch.isCurrentlyOpenWib
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : sch.scheduleStatusWib === 'belum_mulai'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {sch.isCurrentlyOpenWib
                                  ? '● Sedang Berlangsung (WIB)'
                                  : sch.scheduleStatusWib === 'belum_mulai'
                                  ? 'Menunggu Waktu WIB'
                                  : 'Selesai'}
                              </span>
                            </div>

                            <div className="font-extrabold text-slate-900 text-sm truncate">
                              {sch.packetTitle}
                            </div>
                            <div className="text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                              <span>📚 {sch.subjectName}</span>
                              <span>📅 {sch.examDate}</span>
                              <span>
                                ⏰ {sch.startTimeWib} – {sch.endTimeWib} WIB ({sch.durationMinutes} mnt)
                              </span>
                              <span>👥 {subCount} Siswa Mengerjakan</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedScheduleFilterId(sch.id);
                                setActiveWorkTab('uh_results');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold cursor-pointer"
                            >
                              Lihat Nilai ({subCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectQuotaSlotForForm(tpMode, sch)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer"
                              title="Edit Jadwal UH Ini"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUhSchedule(sch.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                              title="Hapus Jadwal UH Ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================================= */}
        {/* TAB 3: HASIL & NILAI ULANGAN HARIAN SISWA (OTOMATIS MASUK UH TP 1..4 DI PENILAIAN) */}
        {/* ================================================================================= */}
        {isTeacherOrHomeroom && activeWorkTab === 'uh_results' && (
          <div className="p-4 sm:p-6 bg-slate-50 rounded-b-2xl space-y-5 text-slate-800">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Hasil & Nilai Ulangan Harian (UH) Online Siswa — Terintegrasi Penilaian TP
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Seluruh hasil Ulangan Harian siswa di bawah ini otomatis masuk ke kolom <b>Ulangan Harian (UH)</b> pada <b>TP 1 / TP 2 / TP 3 / TP 4</b> di Sistem Penilaian (MySQL).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={selectedScheduleFilterId}
                    onChange={e => setSelectedScheduleFilterId(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 bg-white"
                  >
                    <option value="ALL">-- Semua Jadwal Ulangan Harian ({myUhSchedules.length}) --</option>
                    {myUhSchedules.map(s => {
                      const tpLabel = (
                        s.scoreTargetMode ||
                        s.scoringConfig?.scoreTargetMode ||
                        'uh_tp1'
                      ).replace('uh_tp', 'UH TP ');
                      return (
                        <option key={s.id} value={s.id}>
                          [{tpLabel} - Kls {(s.targetClasses || []).join(', ')}] {s.packetTitle}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={fetchTeacherUhData}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSchedules ? 'animate-spin' : ''}`} />
                    Segarkan Nilai
                  </button>
                </div>
              </div>

              {/* Quick Sync Bar per Schedule */}
              {selectedScheduleFilterId !== 'ALL' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="font-semibold text-purple-950">
                    Ingin memindahkan atau menyinkronkan ulang seluruh nilai jadwal ini ke jatah TP tertentu di Penilaian?
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {UH_TP_SLOTS.map(slot => (
                      <button
                        key={slot.mode}
                        type="button"
                        disabled={syncingUhId === selectedScheduleFilterId}
                        onClick={() => handleSyncScheduleToUhTp(selectedScheduleFilterId, slot.mode)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold cursor-pointer"
                      >
                        Sinkronkan ke {slot.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submissions Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[11px]">
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">Mata Pelajaran</th>
                      <th className="py-2.5 px-3">Jatah UH TP di Penilaian</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Nilai UH</th>
                      <th className="py-2.5 px-3">Sinkronisasi MySQL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {myUhSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500">
                          Belum ada data pengerjaan siswa pada jadwal Ulangan Harian ini.
                        </td>
                      </tr>
                    ) : (
                      myUhSubmissions.map((sub, idx) => {
                        const parentSch = myUhSchedules.find(s => s.id === sub.scheduleId);
                        const tpMode =
                          sub.scoreTargetMode ||
                          parentSch?.scoreTargetMode ||
                          parentSch?.scoringConfig?.scoreTargetMode ||
                          'uh_tp1';
                        const tpBadge = tpMode.replace('uh_tp', 'UH TP ');
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {sub.studentName}
                              <div className="text-[10px] font-mono text-slate-400">{sub.studentNis}</div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-700">{sub.className}</td>
                            <td className="py-2.5 px-3 text-slate-700">{sub.subjectName}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[11px]">
                                Kolom {tpBadge}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.status === 'graded' || sub.status === 'submitted'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sub.status === 'in_progress' ? 'Sedang Mengerjakan' : 'Selesai'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-sm font-black text-slate-900">
                                {sub.finalScoreSas}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {sub.status !== 'in_progress' ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Tersimpan di {tpBadge} (MySQL)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Menunggu selesai</span>
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
          </div>
        )}

        {/* ================================================================================= */}
        {/* TAB 1: MICROSOFT WORD QUESTION EDITOR (BANK SOAL MAPEL / ULANGAN HARIAN KELAS)    */}
        {/* ================================================================================= */}
        {(!isTeacherOrHomeroom || activeWorkTab === 'editor') && (
          <>
            {/* Microsoft Word Top Application Title Bar */}
            <div
              className={`bg-[#185abd] text-white ${
                !isTeacherOrHomeroom ? 'rounded-t-2xl' : ''
              } px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-white/15 flex items-center justify-center font-bold text-base tracking-tighter border border-white/25 shrink-0">
                  W
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-xs sm:text-sm tracking-wide">
                      Microsoft Word — Lembar Kerja Soal Ujian Online (CBT)
                    </span>
                    <span className="text-[10px] bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2 py-0.5 rounded font-medium">
                      Direct MySQL (Bank Soal & UH Kelas)
                    </span>
                    <span className="text-[10px] bg-amber-400/25 text-amber-100 border border-amber-300/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <Shuffle className="w-3 h-3" /> Nomor Soal Otomatis Acak Tiap Siswa
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-100 truncate">
                    Pembuat: {currentPacket.creatorName} ({currentPacket.creatorRole}) • Pilih simpan ke Bank Soal Mapel atau Ulangan Harian Kelas
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(prev => !prev)}
                  className="px-2.5 py-1.5 rounded bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5 border border-white/25 transition cursor-pointer"
                  title={isFullscreen ? 'Kembali ke Tampilan Panel Normal' : 'Perlebar Lembar Kerja ke Layar Penuh'}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Keluar Layar Penuh</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Layar Penuh</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewBlankPacket(currentPacket.packetPurpose || 'bank_soal')}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5 border border-white/20 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lembar Baru</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSavePacketToMysql('published', false)}
                  className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menyimpan...' : saveButtonLabel}</span>
                </button>
              </div>
            </div>

            {/* Quick Packet Selector Bar (Bank Soal Mapel & Soal UH Kelas) */}
            <div className="bg-[#f3f2f1] border-b border-slate-300 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1 shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-[#185abd]" />
                  Buka Paket Soal Tersimpan (MySQL):
                </span>
                <select
                  value={currentPacket.id}
                  onChange={e => {
                    if (e.target.value) loadPacketById(e.target.value);
                  }}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 min-w-[180px] max-w-full sm:max-w-md flex-1"
                >
                  <option value="">-- Pilih Paket Soal Tersimpan ({packets.length}) --</option>
                  {packets.map(p => {
                    const pLabel =
                      p.packetPurpose === 'ulangan_harian'
                        ? 'UH Kelas'
                        : p.packetPurpose === 'both'
                        ? 'Bank Soal & UH'
                        : 'Bank Soal';
                    return (
                      <option key={p.id} value={p.id}>
                        [{pLabel} • {p.subjectName} - Kls {p.gradeLevel}] {p.title} ({p.questionCount} Soal)
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={fetchPacketsList}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 shrink-0"
                  title="Muat ulang daftar soal dari MySQL"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-600 text-[11px]">Tampilan:</span>
                <button
                  type="button"
                  onClick={() => setViewMode('full_sheet')}
                  className={`px-2.5 py-1 rounded font-medium transition text-xs cursor-pointer ${
                    viewMode === 'full_sheet'
                      ? 'bg-[#185abd] text-white'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  Lembar Kertas Utuh
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('single_fast')}
                  className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 text-xs cursor-pointer ${
                    viewMode === 'single_fast'
                      ? 'bg-[#185abd] text-white'
                      : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Fokus Per Nomor
                </button>
              </div>
            </div>

            {/* Microsoft Word Ribbon Tabs */}
            <div className="bg-[#f3f2f1] border-b border-slate-300">
              <div className="flex flex-wrap items-center gap-1 px-3 sm:px-4 pt-1 border-b border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('home')}
                  className={`px-3 sm:px-4 py-1.5 font-semibold rounded-t transition cursor-pointer ${
                    activeRibbonTab === 'home'
                      ? 'bg-white text-[#185abd] border-t border-x border-slate-300 -mb-px'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  Beranda (Format Naskah)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('questions')}
                  className={`px-3 sm:px-4 py-1.5 font-semibold rounded-t transition cursor-pointer ${
                    activeRibbonTab === 'questions'
                      ? 'bg-white text-[#185abd] border-t border-x border-slate-300 -mb-px'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  Tambah Butir Soal (5 Tipe CBT)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('insert')}
                  className={`px-3 sm:px-4 py-1.5 font-semibold rounded-t transition cursor-pointer ${
                    activeRibbonTab === 'insert'
                      ? 'bg-white text-[#185abd] border-t border-x border-slate-300 -mb-px'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  Sisipkan Tabel & Simbol
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('equation')}
                  className={`px-3 sm:px-4 py-1.5 font-extrabold rounded-t transition flex items-center gap-1.5 cursor-pointer ${
                    activeRibbonTab === 'equation'
                      ? 'bg-white text-[#185abd] border-t border-x border-slate-300 -mb-px'
                      : 'text-indigo-800 bg-indigo-100/70 hover:bg-indigo-200/70'
                  }`}
                >
                  <span className="font-serif text-sm font-black">π</span>
                  <span>Equation (Rumus Matematika)</span>
                </button>
              </div>

              {/* Ribbon Content Bar */}
              <div className="bg-white px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2.5 text-xs shadow-sm">
                {activeRibbonTab === 'home' && (
                  <>
                    <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200">
                      <select
                        value={fontFamily}
                        onChange={e => {
                          setFontFamily(e.target.value);
                          handleExecCommand('fontName', e.target.value);
                        }}
                        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800"
                      >
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                      <select
                        value={fontSizePt}
                        onChange={e => setFontSizePt(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800"
                      >
                        <option value="11pt">11 pt</option>
                        <option value="12pt">12 pt</option>
                        <option value="14pt">14 pt</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 pr-2.5 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleExecCommand('bold')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700 border border-transparent hover:border-slate-300"
                        title="Tebal (Bold)"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('italic')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700 border border-transparent hover:border-slate-300"
                        title="Miring (Italic)"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('underline')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700 border border-transparent hover:border-slate-300"
                        title="Garis Bawah (Underline)"
                      >
                        <Underline className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('subscript')}
                        className="px-2 py-1 rounded hover:bg-slate-100 text-slate-700 font-serif font-bold"
                        title="Subscript (H₂O)"
                      >
                        X₂
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('superscript')}
                        className="px-2 py-1 rounded hover:bg-slate-100 text-slate-700 font-serif font-bold"
                        title="Superscript (x²)"
                      >
                        X²
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveRibbonTab('equation')}
                        className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                        title="Buka Equation Editor (Rumus Matematika)"
                      >
                        <span className="font-serif font-black text-sm">π</span>
                        <span>Equation</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 pr-2.5 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleExecCommand('justifyLeft')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
                        title="Rata Kiri"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('justifyCenter')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
                        title="Rata Tengah"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('justifyRight')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
                        title="Rata Kanan"
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('justifyFull')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
                        title="Rata Kiri-Kanan"
                      >
                        <AlignJustify className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 pr-2.5 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleExecCommand('insertUnorderedList')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
                        title="Daftar Poin (Bullet)"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecCommand('insertOrderedList')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
                        title="Daftar Nomor"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 mr-0.5">+ Soal:</span>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('pg')}
                        className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> + PG
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('pg_kompleks')}
                        className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> + PG Kompleks
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('menjodohkan')}
                        className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <GitCompare className="w-3.5 h-3.5" /> + Menjodohkan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('benar_salah')}
                        className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ToggleLeft className="w-3.5 h-3.5" /> + Benar/Salah
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('uraian')}
                        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <EssayIcon className="w-3.5 h-3.5" /> + Uraian
                      </button>
                    </div>
                  </>
                )}

                {activeRibbonTab === 'questions' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700">Sisipkan Blok Soal ke Lembar Kerja:</span>
                    {(['pg', 'pg_kompleks', 'menjodohkan', 'benar_salah', 'uraian'] as OnlineExamQuestionType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddQuestion(t)}
                        className={`px-3 py-1.5 rounded border font-semibold flex items-center gap-1.5 cursor-pointer ${QUESTION_TYPE_META[t].badgeClass}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {QUESTION_TYPE_META[t].label}
                      </button>
                    ))}
                  </div>
                )}

                {activeRibbonTab === 'insert' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleInsertTableHtml}
                      className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <TableIcon className="w-4 h-4 text-[#185abd]" />
                      Sisipkan Tabel (3x3) ke Soal Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRibbonTab('equation')}
                      className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span className="font-serif text-sm font-black">π</span>
                      Buka Pembuat Rumus Matematika (Equation)
                    </button>
                    <div className="flex flex-wrap items-center gap-1 pl-2 border-l border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600 mr-1">Simbol Cepat:</span>
                      {MATH_SYMBOLS.map(sym => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => handleExecCommand('insertText', sym)}
                          className="w-7 h-7 rounded bg-slate-50 hover:bg-blue-50 border border-slate-300 text-slate-800 font-serif font-semibold text-sm flex items-center justify-center cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeRibbonTab === 'equation' && (
                  <div className="w-full space-y-3 py-1">
                    {/* Top Row: 13 Equation Structure Templates */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-[#185abd] text-white font-serif font-black flex items-center justify-center text-xs">
                            π
                          </span>
                          Pilih Struktur Rumus Matematika (Microsoft Word Equation):
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Target aktif: <b>Soal Nomor {focusedQuestionIdx + 1}</b>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5">
                        {MATH_EQUATION_TEMPLATES.map(tpl => {
                          const isSelected = eqTemplate === tpl.id;
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => handleSelectEqTemplate(tpl.id)}
                              className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#185abd] text-white border-[#185abd] shadow-xs'
                                  : 'bg-slate-50 hover:bg-blue-50 text-slate-800 border-slate-300'
                              }`}
                            >
                              <span className="font-serif font-bold text-xs sm:text-sm tracking-tight">
                                {tpl.previewSymbol}
                              </span>
                              <span className="text-[10px] font-semibold leading-tight line-clamp-1">
                                {tpl.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Row: Dynamic Equation Parameter Inputs + Live Visual Preview + Insert Button */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-300 items-center">
                      {/* Input fields (6 cols) */}
                      <div className="lg:col-span-6 space-y-2">
                        <div className="text-[11px] font-bold text-slate-700">
                          Isi Komponen Rumus — {activeEqTemplateMeta.label}:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeEqTemplateMeta.fields.map(f => (
                            <div key={f.key}>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                {f.label}:
                              </label>
                              <input
                                type="text"
                                value={eqParams[f.key]}
                                onChange={e =>
                                  setEqParams(prev => ({ ...prev, [f.key]: e.target.value }))
                                }
                                placeholder={f.placeholder}
                                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-serif font-semibold text-slate-900 bg-white focus:border-[#185abd] focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        {/* Mini symbol bar for inserting symbols inside equation fields */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] font-semibold text-slate-500 mr-1">
                            Tambah ke kotak rumus:
                          </span>
                          {['²', '³', '±', '×', '÷', '√', 'π', '°', '≤', '≥', '≠', '∞', 'α', 'β', 'θ'].map(sym => (
                            <button
                              key={sym}
                              type="button"
                              onClick={() => {
                                const firstKey = activeEqTemplateMeta.fields[0]?.key || 'a';
                                setEqParams(prev => ({
                                  ...prev,
                                  [firstKey]: `${prev[firstKey]}${sym}`
                                }));
                              }}
                              className="px-1.5 py-0.5 rounded bg-white hover:bg-blue-50 border border-slate-300 text-slate-800 font-serif font-bold text-xs cursor-pointer"
                              title={`Tambahkan ${sym}`}
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Visual Preview (3 cols) */}
                      <div className="lg:col-span-3 bg-white border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center min-h-[78px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Pratinjau Rumus (Live Preview)
                        </span>
                        <div
                          className="text-base sm:text-lg text-slate-900 font-serif py-1"
                          dangerouslySetInnerHTML={{ __html: liveEquationPreviewHtml }}
                        />
                      </div>

                      {/* Target Selector & Insert Action (3 cols) */}
                      <div className="lg:col-span-3 flex flex-col gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Sisipkan Rumus Ke (Soal No. {focusedQuestionIdx + 1}):
                          </label>
                          <select
                            value={eqInsertTarget}
                            onChange={e => setEqInsertTarget(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white"
                          >
                            <option value="stem">Naskah Pertanyaan (Soal No. {focusedQuestionIdx + 1})</option>
                            {(currentPacket.questions[focusedQuestionIdx]?.options || []).map((opt, oIdx) => (
                              <option key={opt.id} value={`opt-${oIdx}`}>
                                Pilihan Jawaban {opt.label} (Soal No. {focusedQuestionIdx + 1})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleInsertEquationToTarget()}
                          className="w-full py-2 px-3 rounded-lg bg-[#185abd] hover:bg-blue-800 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="font-serif text-sm font-black">π</span>
                          <span>Sisipkan Rumus Sekarang</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Compact Question Navigator Bar */}
            <div className="bg-slate-200/80 border-b border-slate-300 px-3 sm:px-5 py-2.5 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#185abd]" />
                    Navigasi Nomor Soal ({currentPacket.questions.length} Butir):
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                    Total Bobot Skor: {currentPacket.questions.reduce((acc, q) => acc + (Number(q.scoreWeight) || 1), 0)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {(['pg', 'pg_kompleks', 'menjodohkan', 'benar_salah', 'uraian'] as OnlineExamQuestionType[]).map(t => {
                    const count = currentPacket.questions.filter(q => q.type === t).length;
                    if (count === 0) return null;
                    return (
                      <span
                        key={t}
                        className={`px-2 py-0.5 rounded border font-semibold ${QUESTION_TYPE_META[t].badgeClass}`}
                      >
                        {QUESTION_TYPE_META[t].shortLabel}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto py-0.5">
                {currentPacket.questions.map((q, idx) => {
                  const isFocused = focusedQuestionIdx === idx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setFocusedQuestionIdx(idx)}
                      className={`h-8 min-w-[38px] px-2 rounded text-xs font-bold border flex items-center justify-center gap-1 transition cursor-pointer ${
                        isFocused
                          ? 'bg-[#185abd] text-white border-[#185abd] shadow-sm'
                          : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
                      }`}
                      title={`Soal No. ${idx + 1} (${QUESTION_TYPE_META[q.type]?.shortLabel})`}
                    >
                      <span>{idx + 1}</span>
                      <span className="text-[9px] font-normal opacity-80 uppercase">{q.type.slice(0, 2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Microsoft Word Horizontal Ruler */}
            <div className="bg-[#e1dfdd] border-b border-slate-300 py-1 px-3 sm:px-6 hidden sm:block">
              <div className="w-full max-w-[960px] mx-auto bg-white border border-slate-300 h-4 flex items-center justify-between px-3 text-[9px] font-mono text-slate-400 select-none">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(cm => (
                  <span key={cm} className="border-l border-slate-300 pl-1">
                    {cm}
                  </span>
                ))}
              </div>
            </div>

            {/* Main Desk Area — 100% Dedicated to the White MS Word Paper Sheet */}
            <div className="p-2 sm:p-5 md:p-6 bg-[#d2d0ce] rounded-b-2xl w-full min-w-0">
              <div
                className="w-full max-w-[960px] mx-auto bg-white shadow-xl border border-slate-300 rounded-sm px-3 sm:px-7 md:px-10 py-5 sm:py-8 min-w-0"
                style={{ fontFamily, fontSize: fontSizePt }}
              >
                {loadingPacket ? (
                  <div className="py-20 text-center text-slate-500 text-sm font-sans">
                    Memuat lembar kerja soal dari MySQL...
                  </div>
                ) : (
                  <>
                    {/* Official Exam Paper Header (KOP Naskah Ujian) */}
                    <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 font-sans">
                      <div className="text-center mb-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                          LEMBAR KERJA PEMBUATAN SOAL UJIAN ONLINE (CBT)
                        </p>
                        <h3 className="text-base sm:text-lg font-extrabold uppercase text-slate-900 tracking-wide">
                          SMP MA&apos;ARIF — KURIKULUM MERDEKA
                        </h3>
                        <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                          * Saat ujian berlangsung, urutan nomor soal otomatis diacak sehingga setiap siswa mendapat urutan soal berbeda
                        </p>
                      </div>

                      {/* Opsi Tujuan Penyimpanan Soal (Bank Soal vs Ulangan Harian Kelas yang Diampu) */}
                      <div className="mb-3 bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 sm:p-3.5 text-xs space-y-2.5">
                        <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-indigo-600" />
                          <span>Opsi Tujuan Penyimpanan Paket Soal:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPacket(prev => ({
                                ...prev,
                                packetPurpose: 'bank_soal',
                                examCategory: prev.examCategory === 'UH' ? 'SAS' : prev.examCategory
                              }))
                            }
                            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                              (currentPacket.packetPurpose || 'bank_soal') === 'bank_soal'
                                ? 'bg-[#185abd] text-white border-[#185abd] shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-extrabold text-xs">1. Simpan di Bank Soal Mapel</div>
                            <div className="text-[10px] opacity-85 mt-0.5">
                              Masuk ke Bank Soal Master Data Mapel (Waka Kurikulum) untuk SAS/SAT/STS
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPacket(prev => ({
                                ...prev,
                                packetPurpose: 'ulangan_harian',
                                examCategory: 'UH',
                                targetClasses:
                                  prev.targetClasses && prev.targetClasses.length > 0
                                    ? prev.targetClasses
                                    : taughtClassesList.slice(0, 1)
                              }))
                            }
                            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                              currentPacket.packetPurpose === 'ulangan_harian'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-extrabold text-xs">2. Untuk Ulangan Harian (UH) Kelas</div>
                            <div className="text-[10px] opacity-85 mt-0.5">
                              Khusus Ulangan Harian di kelas yang Anda ampu (Nilai masuk UH TP 1–4)
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPacket(prev => ({
                                ...prev,
                                packetPurpose: 'both',
                                targetClasses:
                                  prev.targetClasses && prev.targetClasses.length > 0
                                    ? prev.targetClasses
                                    : taughtClassesList.slice(0, 1)
                              }))
                            }
                            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                              currentPacket.packetPurpose === 'both'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-extrabold text-xs">3. Simpan ke Keduanya</div>
                            <div className="text-[10px] opacity-85 mt-0.5">
                              Tersimpan di Bank Soal Mapel sekaligus bisa dipakai Ulangan Harian Kelas
                            </div>
                          </button>
                        </div>

                        {/* Jika disimpan untuk Ulangan Harian Kelas, pilih kelas yang diampu */}
                        {(currentPacket.packetPurpose === 'ulangan_harian' ||
                          currentPacket.packetPurpose === 'both') && (
                          <div className="pt-2 border-t border-indigo-200/80 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-indigo-950 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-emerald-700" />
                                Pilih Kelas yang Diampu untuk Ulangan Harian:
                              </span>
                              {taughtClassesList.map(cls => {
                                const selected = (currentPacket.targetClasses || []).includes(cls);
                                return (
                                  <button
                                    key={cls}
                                    type="button"
                                    onClick={() =>
                                      setCurrentPacket(prev => {
                                        const cur = prev.targetClasses || [];
                                        const next = cur.includes(cls)
                                          ? cur.filter(c => c !== cls)
                                          : [...cur, cls];
                                        const gm = cls.match(/^([789])/);
                                        return {
                                          ...prev,
                                          gradeLevel: (gm ? gm[1] : prev.gradeLevel) as '7' | '8' | '9',
                                          targetClasses: next
                                        };
                                      })
                                    }
                                    className={`px-2.5 py-1 rounded-md font-bold text-xs border transition cursor-pointer ${
                                      selected
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    Kelas {cls}
                                  </button>
                                );
                              })}
                            </div>

                            {isTeacherOrHomeroom && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSavePacketToMysql('published', true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Simpan Soal & Lanjut Buat Jadwal UH Online →</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Metadata Grid inside Paper Header */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 sm:p-3.5 rounded-lg border border-slate-300 text-xs">
                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Judul Paket Soal:
                          </label>
                          <input
                            type="text"
                            value={currentPacket.title}
                            onChange={e => setCurrentPacket(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full min-w-0 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                            placeholder="Contoh: Ulangan Harian TP 1 Matematika Kelas 7A"
                          />
                        </div>

                        <div className="min-w-0">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Mata Pelajaran:
                          </label>
                          <select
                            value={currentPacket.subjectId}
                            onChange={e => {
                              const sub = availableSubjects.find(s => s.id === e.target.value);
                              if (sub) {
                                setCurrentPacket(prev => ({
                                  ...prev,
                                  subjectId: sub.id,
                                  subjectName: sub.name
                                }));
                              }
                            }}
                            className="w-full min-w-0 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                          >
                            {availableSubjects.map(sub => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name} ({sub.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tingkat Kelas:</label>
                            <select
                              value={currentPacket.gradeLevel}
                              onChange={e =>
                                setCurrentPacket(prev => ({
                                  ...prev,
                                  gradeLevel: e.target.value as '7' | '8' | '9'
                                }))
                              }
                              className="w-full min-w-0 border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900 bg-white"
                            >
                              <option value="7">Kelas 7</option>
                              <option value="8">Kelas 8</option>
                              <option value="9">Kelas 9</option>
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Kategori:</label>
                            <select
                              value={currentPacket.examCategory}
                              onChange={e =>
                                setCurrentPacket(prev => ({
                                  ...prev,
                                  examCategory: e.target.value as any
                                }))
                              }
                              className="w-full min-w-0 border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900 bg-white"
                            >
                              <option value="UH">Ulangan Harian (UH)</option>
                              <option value="SAS">SAS (Akhir Semester)</option>
                              <option value="SAT">SAT (Akhir Tahun)</option>
                              <option value="STS">STS (Tengah Semester)</option>
                              <option value="TryOut">Try Out</option>
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Semester:</label>
                            <select
                              value={currentPacket.semester}
                              onChange={e =>
                                setCurrentPacket(prev => ({
                                  ...prev,
                                  semester: e.target.value as 'Ganjil' | 'Genap'
                                }))
                              }
                              className="w-full min-w-0 border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900 bg-white"
                            >
                              <option value="Ganjil">Ganjil</option>
                              <option value="Genap">Genap</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun Ajaran:</label>
                            <input
                              type="text"
                              value={currentPacket.academicYear}
                              onChange={e =>
                                setCurrentPacket(prev => ({ ...prev, academicYear: e.target.value }))
                              }
                              className="w-full min-w-0 border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-900 bg-white"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Paket Soal:</label>
                            <select
                              value={currentPacket.status}
                              onChange={e =>
                                setCurrentPacket(prev => ({
                                  ...prev,
                                  status: e.target.value as 'draft' | 'published'
                                }))
                              }
                              className="w-full min-w-0 border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900 bg-white"
                            >
                              <option value="published">Siap Digunakan (Published)</option>
                              <option value="draft">Draft Sementara</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Single Question Fast Mode Pagination Header */}
                    {viewMode === 'single_fast' && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 font-sans text-xs">
                        <span className="font-bold text-blue-900">
                          Menampilkan Butir Soal Nomor {focusedQuestionIdx + 1} dari {currentPacket.questions.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={focusedQuestionIdx <= 0}
                            onClick={() => setFocusedQuestionIdx(i => Math.max(0, i - 1))}
                            className="px-2.5 py-1 rounded bg-white border border-blue-300 disabled:opacity-40 font-semibold text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                          </button>
                          <button
                            type="button"
                            disabled={focusedQuestionIdx >= currentPacket.questions.length - 1}
                            onClick={() =>
                              setFocusedQuestionIdx(i => Math.min(currentPacket.questions.length - 1, i + 1))
                            }
                            className="px-2.5 py-1 rounded bg-white border border-blue-300 disabled:opacity-40 font-semibold text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Question Blocks on the Word Sheet */}
                    <div className="space-y-6">
                      {questionsToRender.map(({ question: q, index: qIdx }) => {
                        const meta = QUESTION_TYPE_META[q.type] || QUESTION_TYPE_META.pg;
                        return (
                          <div
                            key={q.id}
                            onClick={() => setFocusedQuestionIdx(qIdx)}
                            className={`p-3.5 sm:p-4 rounded-lg border transition min-w-0 ${
                              focusedQuestionIdx === qIdx
                                ? 'border-[#185abd] bg-blue-50/10 ring-1 ring-[#185abd]/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Top Question Meta Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200 font-sans text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-bold">
                                  SOAL NO. {qIdx + 1}
                                </span>
                                <select
                                  value={q.type}
                                  onChange={e => {
                                    const newType = e.target.value as OnlineExamQuestionType;
                                    const replacement = createDefaultQuestion(qIdx + 1, newType);
                                    updateQuestionAt(qIdx, prevQ => ({
                                      ...replacement,
                                      id: prevQ.id,
                                      questionHtml: prevQ.questionHtml,
                                      imageUrl: prevQ.imageUrl
                                    }));
                                  }}
                                  className={`px-2.5 py-1 rounded border font-semibold ${meta.badgeClass}`}
                                >
                                  <option value="pg">Pilihan Ganda (PG)</option>
                                  <option value="pg_kompleks">Pilihan Ganda Kompleks</option>
                                  <option value="menjodohkan">Menjodohkan</option>
                                  <option value="benar_salah">Benar - Salah</option>
                                  <option value="uraian">Uraian / Essay</option>
                                </select>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-1 text-slate-600 font-medium">
                                  <Award className="w-3.5 h-3.5 text-amber-600" />
                                  Bobot Skor:
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={q.scoreWeight}
                                    onChange={e =>
                                      updateQuestionAt(qIdx, prevQ => ({
                                        ...prevQ,
                                        scoreWeight: Math.max(1, Number(e.target.value) || 1)
                                      }))
                                    }
                                    className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-center font-bold text-slate-800 bg-white"
                                  />
                                </label>

                                <label className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer flex items-center gap-1">
                                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Gambar</span>
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleImageFileSelect(e, qIdx)}
                                    className="hidden"
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFocusedQuestionIdx(qIdx);
                                    setEqInsertTarget('stem');
                                    setActiveRibbonTab('equation');
                                  }}
                                  className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                                  title="Sisipkan Rumus Matematika (Equation) ke Soal Ini"
                                >
                                  <span className="font-serif font-black text-xs">π</span>
                                  <span>Rumus / Equation</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(qIdx)}
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Hapus Butir Soal Ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Optional Attached Image Preview */}
                            {q.imageUrl && (
                              <div className="mb-3 relative inline-block border border-slate-300 rounded p-1.5 bg-white max-w-full">
                                <img
                                  src={q.imageUrl}
                                  alt={`Ilustrasi Soal ${qIdx + 1}`}
                                  className="max-h-56 max-w-full object-contain rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateQuestionAt(qIdx, prevQ => ({ ...prevQ, imageUrl: undefined }))}
                                  className="mt-1 text-[11px] text-rose-600 hover:underline font-sans flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Hapus Gambar Lampiran
                                </button>
                              </div>
                            )}

                            {/* Rich Text Editable Question Stem (MS Word Canvas Area) */}
                            <div className="mb-4 min-w-0">
                              <div className="text-[11px] font-sans font-semibold text-slate-500 mb-1">
                                Naskah Pertanyaan / Wacana Soal (Klik untuk mengetik dan memformat seperti MS Word):
                              </div>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={e => {
                                  activeEditableRef.current = e.currentTarget;
                                }}
                                onBlur={e => {
                                  const html = e.currentTarget.innerHTML;
                                  updateQuestionAt(qIdx, prevQ => ({ ...prevQ, questionHtml: html }));
                                }}
                                dangerouslySetInnerHTML={{ __html: q.questionHtml }}
                                className="min-h-[84px] w-full min-w-0 break-words p-3 rounded border border-slate-300 bg-white focus:outline-none focus:border-[#185abd] focus:ring-2 focus:ring-blue-500/20 leading-relaxed text-slate-900"
                              />
                            </div>

                            {/* Type 1: Pilihan Ganda (pg) */}
                            {q.type === 'pg' && (
                              <div className="space-y-2 font-sans text-xs min-w-0">
                                <div className="font-semibold text-slate-700">
                                  Pilihan Jawaban & Kunci Jawaban (Klik bulatan huruf untuk menetapkan Kunci Jawaban Benar):
                                </div>
                                {(q.options || []).map((opt, optIdx) => {
                                  const isCorrect = q.correctOptionId === opt.id;
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded border min-w-0 ${
                                        isCorrect
                                          ? 'bg-emerald-50/70 border-emerald-400'
                                          : 'bg-slate-50/60 border-slate-200'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuestionAt(qIdx, prevQ => ({
                                            ...prevQ,
                                            correctOptionId: opt.id
                                          }))
                                        }
                                        className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition cursor-pointer ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                        }`}
                                        title="Jadikan Kunci Jawaban Benar"
                                      >
                                        {opt.label}
                                      </button>
                                      <div className="flex-1 min-w-0 w-full space-y-1">
                                        <input
                                          type="text"
                                          value={opt.textHtml}
                                          onChange={e => {
                                            const val = e.target.value;
                                            updateQuestionAt(qIdx, prevQ => ({
                                              ...prevQ,
                                              options: (prevQ.options || []).map((o, i) =>
                                                i === optIdx ? { ...o, textHtml: val } : o
                                              )
                                            }));
                                          }}
                                          className="w-full min-w-0 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                                          placeholder={`Teks Pilihan ${opt.label}`}
                                        />
                                        {opt.textHtml && opt.textHtml.includes('<span') && (
                                          <div className="px-2.5 py-1 rounded bg-indigo-50/60 border border-indigo-200 text-slate-900 flex items-center justify-between gap-2">
                                            <div
                                              className="text-sm font-serif"
                                              dangerouslySetInnerHTML={{ __html: opt.textHtml }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateQuestionAt(qIdx, prevQ => ({
                                                  ...prevQ,
                                                  options: (prevQ.options || []).map((o, i) =>
                                                    i === optIdx ? { ...o, textHtml: '' } : o
                                                  )
                                                }))
                                              }
                                              className="text-[10px] text-rose-600 hover:underline shrink-0"
                                            >
                                              Reset Opsi
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleInsertEquationToTarget(`opt-${optIdx}`, qIdx)}
                                        className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-[11px] shrink-0 cursor-pointer"
                                        title={`Sisipkan Rumus Aktif (${activeEqTemplateMeta.label}) ke Pilihan ${opt.label}`}
                                      >
                                        + π Rumus
                                      </button>
                                      {isCorrect && (
                                        <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded shrink-0">
                                          Kunci Benar
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Type 2: Pilihan Ganda Kompleks (pg_kompleks) */}
                            {q.type === 'pg_kompleks' && (
                              <div className="space-y-2 font-sans text-xs min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-700">
                                    Pernyataan Pilihan Ganda Kompleks (Centang semua jawaban yang benar):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuestionAt(qIdx, prevQ => {
                                        const nextNum = (prevQ.options || []).length + 1;
                                        return {
                                          ...prevQ,
                                          options: [
                                            ...(prevQ.options || []),
                                            {
                                              id: `P${nextNum}`,
                                              label: `${nextNum}`,
                                              textHtml: `Pernyataan ke-${nextNum}`
                                            }
                                          ]
                                        };
                                      })
                                    }
                                    className="text-purple-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Tambah Opsi Pernyataan
                                  </button>
                                </div>
                                {(q.options || []).map((opt, optIdx) => {
                                  const isChecked = (q.correctOptionIds || []).includes(opt.id);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded border min-w-0 ${
                                        isChecked
                                          ? 'bg-purple-50/70 border-purple-400'
                                          : 'bg-slate-50/60 border-slate-200'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuestionAt(qIdx, prevQ => {
                                            const cur = prevQ.correctOptionIds || [];
                                            const next = cur.includes(opt.id)
                                              ? cur.filter(id => id !== opt.id)
                                              : [...cur, opt.id];
                                            return { ...prevQ, correctOptionIds: next };
                                          })
                                        }
                                        className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                          isChecked
                                            ? 'bg-purple-600 border-purple-600 text-white'
                                            : 'bg-white border-slate-300 text-transparent'
                                        }`}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <input
                                        type="text"
                                        value={opt.textHtml}
                                        onChange={e => {
                                          const val = e.target.value;
                                          updateQuestionAt(qIdx, prevQ => ({
                                            ...prevQ,
                                            options: (prevQ.options || []).map((o, i) =>
                                              i === optIdx ? { ...o, textHtml: val } : o
                                            )
                                          }));
                                        }}
                                        className="flex-1 min-w-0 w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                                      />
                                      {isChecked && (
                                        <span className="text-[11px] font-bold text-purple-700 px-2 py-0.5 bg-purple-100 rounded shrink-0">
                                          Benar
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Type 3: Menjodohkan (menjodohkan) */}
                            {q.type === 'menjodohkan' && (
                              <div className="space-y-2 font-sans text-xs min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-700">
                                    Pasangan Menjodohkan (Premis Kiri & Pasangan Jawaban Kanan):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuestionAt(qIdx, prevQ => {
                                        const nextNum = (prevQ.matchingPairs || []).length + 1;
                                        return {
                                          ...prevQ,
                                          matchingPairs: [
                                            ...(prevQ.matchingPairs || []),
                                            {
                                              id: `M${nextNum}`,
                                              leftPremise: `Pernyataan ${nextNum}`,
                                              rightResponse: `Pasangan Jawaban ${nextNum}`
                                            }
                                          ]
                                        };
                                      })
                                    }
                                    className="text-amber-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Tambah Baris Pasangan
                                  </button>
                                </div>
                                {(q.matchingPairs || []).map((pair, pIdx) => (
                                  <div
                                    key={pair.id}
                                    className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center bg-amber-50/40 p-2 rounded border border-amber-200 min-w-0"
                                  >
                                    <div className="sm:col-span-5 min-w-0">
                                      <input
                                        type="text"
                                        value={pair.leftPremise}
                                        onChange={e => {
                                          const val = e.target.value;
                                          updateQuestionAt(qIdx, prevQ => ({
                                            ...prevQ,
                                            matchingPairs: (prevQ.matchingPairs || []).map((p, i) =>
                                              i === pIdx ? { ...p, leftPremise: val } : p
                                            )
                                          }));
                                        }}
                                        className="w-full min-w-0 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                                        placeholder="Pernyataan Lajur Kiri"
                                      />
                                    </div>
                                    <div className="sm:col-span-1 text-center font-bold text-amber-700">↔</div>
                                    <div className="sm:col-span-5 flex items-center gap-1.5 min-w-0">
                                      <input
                                        type="text"
                                        value={pair.rightResponse}
                                        onChange={e => {
                                          const val = e.target.value;
                                          updateQuestionAt(qIdx, prevQ => ({
                                            ...prevQ,
                                            matchingPairs: (prevQ.matchingPairs || []).map((p, i) =>
                                              i === pIdx ? { ...p, rightResponse: val } : p
                                            )
                                          }));
                                        }}
                                        className="w-full min-w-0 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                                        placeholder="Jawaban Pasangan Lajur Kanan"
                                      />
                                      {(q.matchingPairs || []).length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateQuestionAt(qIdx, prevQ => ({
                                              ...prevQ,
                                              matchingPairs: (prevQ.matchingPairs || []).filter((_, i) => i !== pIdx)
                                            }))
                                          }
                                          className="p-1 text-rose-500 hover:bg-rose-50 rounded shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Type 4: Benar - Salah (benar_salah) */}
                            {q.type === 'benar_salah' && (
                              <div className="space-y-2 font-sans text-xs min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-700">
                                    Daftar Pernyataan Benar / Salah:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuestionAt(qIdx, prevQ => {
                                        const nextNum = (prevQ.trueFalseItems || []).length + 1;
                                        return {
                                          ...prevQ,
                                          trueFalseItems: [
                                            ...(prevQ.trueFalseItems || []),
                                            {
                                              id: `BS${nextNum}`,
                                              statement: `Pernyataan ke-${nextNum}`,
                                              isTrue: true
                                            }
                                          ]
                                        };
                                      })
                                    }
                                    className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Tambah Pernyataan
                                  </button>
                                </div>
                                {(q.trueFalseItems || []).map((item, idx) => (
                                  <div
                                    key={item.id}
                                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-emerald-50/40 p-2 rounded border border-emerald-200 min-w-0"
                                  >
                                    <span className="font-bold text-slate-600 w-5 shrink-0">{idx + 1}.</span>
                                    <input
                                      type="text"
                                      value={item.statement}
                                      onChange={e => {
                                        const val = e.target.value;
                                        updateQuestionAt(qIdx, prevQ => ({
                                          ...prevQ,
                                          trueFalseItems: (prevQ.trueFalseItems || []).map((it, i) =>
                                            i === idx ? { ...it, statement: val } : it
                                          )
                                        }));
                                      }}
                                      className="flex-1 min-w-0 w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                                    />
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuestionAt(qIdx, prevQ => ({
                                            ...prevQ,
                                            trueFalseItems: (prevQ.trueFalseItems || []).map((it, i) =>
                                              i === idx ? { ...it, isTrue: true } : it
                                            )
                                          }))
                                        }
                                        className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
                                          item.isTrue
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-slate-600 border-slate-300'
                                        }`}
                                      >
                                        BENAR
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateQuestionAt(qIdx, prevQ => ({
                                            ...prevQ,
                                            trueFalseItems: (prevQ.trueFalseItems || []).map((it, i) =>
                                              i === idx ? { ...it, isTrue: false } : it
                                            )
                                          }))
                                        }
                                        className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
                                          !item.isTrue
                                            ? 'bg-rose-600 text-white border-rose-600'
                                            : 'bg-white text-slate-600 border-slate-300'
                                        }`}
                                      >
                                        SALAH
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Type 5: Uraian (uraian) */}
                            {q.type === 'uraian' && (
                              <div className="space-y-1.5 font-sans text-xs bg-rose-50/40 p-3 rounded border border-rose-200 min-w-0">
                                <label className="block font-semibold text-slate-700">
                                  Kunci Jawaban / Kata Kunci Penskoran Otomatis Uraian (Pisahkan kata kunci dengan koma):
                                </label>
                                <textarea
                                  rows={2}
                                  value={q.answerKeyText || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateQuestionAt(qIdx, prevQ => ({ ...prevQ, answerKeyText: val }));
                                  }}
                                  className="w-full min-w-0 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                                  placeholder="Contoh: fotosintesis, klorofil, cahaya matahari, glukosa, oksigen"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Paper Footer Actions */}
                    <div className="mt-8 pt-4 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 font-sans text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-600 mr-1">Tambah Soal di Bawah:</span>
                        {(['pg', 'pg_kompleks', 'menjodohkan', 'benar_salah', 'uraian'] as OnlineExamQuestionType[]).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleAddQuestion(t)}
                            className={`px-2.5 py-1.5 rounded border font-semibold cursor-pointer ${QUESTION_TYPE_META[t].badgeClass}`}
                          >
                            + {QUESTION_TYPE_META[t].shortLabel}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isTeacherOrHomeroom &&
                          (currentPacket.packetPurpose === 'ulangan_harian' ||
                            currentPacket.packetPurpose === 'both') && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleSavePacketToMysql('published', true)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <Calendar className="w-4 h-4" />
                              <span>Simpan & Buat Jadwal UH Online</span>
                            </button>
                          )}

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleSavePacketToMysql('published', false)}
                          className="px-5 py-2 rounded-lg bg-[#185abd] hover:bg-blue-800 text-white font-bold flex items-center gap-2 shadow cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? 'Menyimpan ke MySQL...' : saveButtonLabel}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
