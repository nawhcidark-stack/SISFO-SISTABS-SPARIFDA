import re

with open("src/components/SubjectTeacherPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. State declarations
old_state = """  const [tp1InputName, setTp1InputName] = useState<string>('');
  const [tp2InputName, setTp2InputName] = useState<string>('');
  const [tp3InputName, setTp3InputName] = useState<string>('');
  const [tp4InputName, setTp4InputName] = useState<string>('');"""

new_state = """  const [tp1InputName, setTp1InputName] = useState<string>('');
  const [tp2InputName, setTp2InputName] = useState<string>('');
  const [tp3InputName, setTp3InputName] = useState<string>('');
  const [tp4InputName, setTp4InputName] = useState<string>('');
  const [savedTpDescriptions, setSavedTpDescriptions] = useState<Record<string, { tp1Name?: string; tp2Name?: string; tp3Name?: string; tp4Name?: string }>>({});
  const [isSavingTp, setIsSavingTp] = useState<boolean>(false);
  const [unsavedTpCache, setUnsavedTpCache] = useState<Record<string, { tp1Name: string; tp2Name: string; tp3Name: string; tp4Name: string }>>({});"""

assert old_state in content, "old_state not found"
content = content.replace(old_state, new_state, 1)

# 2. Remove defaultTpsMap overriding and add synchronization hook for TP descriptions per subject
old_effect = """  useEffect(() => {
    if (currentSubjectDefaultTps) {
      setTp1InputName(currentSubjectDefaultTps[0] || '');
      setTp2InputName(currentSubjectDefaultTps[1] || '');
      setTp3InputName(currentSubjectDefaultTps[2] || '');
      setTp4InputName(currentSubjectDefaultTps[3] || '');
    }
  }, [currentSubjectDefaultTps]);"""

new_effect = """  // Fungsi pengambilan data deskripsi TP dari server
  const fetchTpDescriptions = async () => {
    try {
      const res = await fetch('/api/tp-descriptions');
      if (res.ok) {
        const data = await res.json();
        if (data && data.descriptions) {
          setSavedTpDescriptions(data.descriptions);
        }
      }
    } catch (e) {
      console.warn("Gagal mengambil deskripsi TP:", e);
    }
  };

  useEffect(() => {
    fetchTpDescriptions();
  }, []);

  // Simpan deskripsi TP secara mandiri untuk mapel yang aktif
  const handleSaveTpDescriptions = async () => {
    if (!selectedSubject) {
      setFeedback({ type: 'error', text: 'Pilih mata pelajaran terlebih dahulu.' });
      return;
    }
    setIsSavingTp(true);
    try {
      const res = await fetch('/api/tp-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          className: selectedGradeClass,
          semester: selectedSemesterGrading,
          academicYear: selectedYearGrading,
          tp1Name: tp1InputName,
          tp2Name: tp2InputName,
          tp3Name: tp3InputName,
          tp4Name: tp4InputName
        })
      });
      if (res.ok) {
        const subKey = (selectedSubject || '').trim().toLowerCase();
        const classKey = (selectedGradeClass || '').trim().toLowerCase();
        const semKey = (selectedSemesterGrading || 'ganjil').trim().toLowerCase();
        const yearKey = (selectedYearGrading || '2026/2027').trim().toLowerCase();
        const fullKey = `${classKey}_${subKey}_${semKey}_${yearKey}`;
        
        const updated = {
          tp1Name: tp1InputName,
          tp2Name: tp2InputName,
          tp3Name: tp3InputName,
          tp4Name: tp4InputName
        };

        setSavedTpDescriptions(prev => ({
          ...prev,
          [fullKey]: updated,
          [subKey]: updated
        }));

        setFeedback({
          type: 'success',
          text: `Deskripsi Tujuan Pembelajaran (TP) untuk mapel ${selectedSubject} berhasil disimpan!`
        });
        fetchAssessments();
      } else {
        setFeedback({ type: 'error', text: 'Gagal menyimpan deskripsi TP ke server.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan sistem saat menyimpan TP.' });
    } finally {
      setIsSavingTp(false);
    }
  };

  // Saat berpindah mata pelajaran / kelas:
  // TP otomatis berganti sesuai yang tersimpan untuk mapel tersebut (atau kosong jika belum diisi),
  // dan jika kembali ke mapel yang sudah disimpan, otomatis terisi kembali sesuai simpanan awal.
  useEffect(() => {
    if (!selectedSubject) return;

    const subKey = (selectedSubject || '').trim().toLowerCase();
    const classKey = (selectedGradeClass || '').trim().toLowerCase();
    const semKey = (selectedSemesterGrading || 'ganjil').trim().toLowerCase();
    const yearKey = (selectedYearGrading || '2026/2027').trim().toLowerCase();
    const fullKey = `${classKey}_${subKey}_${semKey}_${yearKey}`;

    // 1. Cek dari draft belum tersimpan di sesi ini
    const cachedDraft = unsavedTpCache[subKey] || unsavedTpCache[fullKey];
    if (cachedDraft && (cachedDraft.tp1Name || cachedDraft.tp2Name || cachedDraft.tp3Name || cachedDraft.tp4Name)) {
      setTp1InputName(cachedDraft.tp1Name || '');
      setTp2InputName(cachedDraft.tp2Name || '');
      setTp3InputName(cachedDraft.tp3Name || '');
      setTp4InputName(cachedDraft.tp4Name || '');
      return;
    }

    // 2. Cek dari savedTpDescriptions
    const savedDesc = savedTpDescriptions[fullKey] || savedTpDescriptions[subKey];
    if (savedDesc && (savedDesc.tp1Name || savedDesc.tp2Name || savedDesc.tp3Name || savedDesc.tp4Name)) {
      setTp1InputName(savedDesc.tp1Name || '');
      setTp2InputName(savedDesc.tp2Name || '');
      setTp3InputName(savedDesc.tp3Name || '');
      setTp4InputName(savedDesc.tp4Name || '');
      return;
    }

    // 3. Cek dari merdekaAssessments yang sudah tersimpan di database
    const matchedAss = merdekaAssessments.find(a => 
      matchSubject(a.subject, selectedSubject) &&
      (!selectedGradeClass || (a.className || '').trim().toLowerCase() === classKey) &&
      (a.tp1Name || a.tp2Name || a.tp3Name || a.tp4Name)
    ) || merdekaAssessments.find(a => 
      matchSubject(a.subject, selectedSubject) &&
      (a.tp1Name || a.tp2Name || a.tp3Name || a.tp4Name)
    );

    if (matchedAss && (matchedAss.tp1Name || matchedAss.tp2Name || matchedAss.tp3Name || matchedAss.tp4Name)) {
      setTp1InputName(matchedAss.tp1Name || '');
      setTp2InputName(matchedAss.tp2Name || '');
      setTp3InputName(matchedAss.tp3Name || '');
      setTp4InputName(matchedAss.tp4Name || '');
      return;
    }

    // 4. Jika belum pernah disimpan untuk mapel ini, kosongkan agar guru dapat mengisinya
    setTp1InputName('');
    setTp2InputName('');
    setTp3InputName('');
    setTp4InputName('');
  }, [selectedSubject, selectedGradeClass, selectedSemesterGrading, selectedYearGrading, savedTpDescriptions, merdekaAssessments]);"""

assert old_effect in content, "old_effect not found"
content = content.replace(old_effect, new_effect, 1)

# 3. Update gradeInputMap type - remove tp1Tugas2, tp2Tugas2, tp3Tugas2, tp4Tugas2
old_grade_type = """  const [gradeInputMap, setGradeInputMap] = useState<Record<string, {
    tp1Tugas1: string;
    tp1Tugas2: string;
    tp1Uh: string;

    tp2Tugas1: string;
    tp2Tugas2: string;
    tp2Uh: string;

    tp3Tugas1: string;
    tp3Tugas2: string;
    tp3Uh: string;

    tp4Tugas1: string;
    tp4Tugas2: string;
    tp4Uh: string;"""

new_grade_type = """  const [gradeInputMap, setGradeInputMap] = useState<Record<string, {
    tp1Tugas1: string;
    tp1Uh: string;

    tp2Tugas1: string;
    tp2Uh: string;

    tp3Tugas1: string;
    tp3Uh: string;

    tp4Tugas1: string;
    tp4Uh: string;"""

assert old_grade_type in content, "old_grade_type not found"
content = content.replace(old_grade_type, new_grade_type, 1)

# 4. Update populate gradeInputMap useEffect
old_populate_map = """      if (match) {
        newMap[s.id] = {
          tp1Tugas1: match.tp1Tugas1 !== undefined && match.tp1Tugas1 !== null ? String(match.tp1Tugas1) : (match.tp1Grade !== undefined ? String(match.tp1Grade) : ''),
          tp1Tugas2: match.tp1Tugas2 !== undefined && match.tp1Tugas2 !== null ? String(match.tp1Tugas2) : '',
          tp1Uh: match.tp1Uh !== undefined && match.tp1Uh !== null ? String(match.tp1Uh) : '',

          tp2Tugas1: match.tp2Tugas1 !== undefined && match.tp2Tugas1 !== null ? String(match.tp2Tugas1) : (match.tp2Grade !== undefined ? String(match.tp2Grade) : ''),
          tp2Tugas2: match.tp2Tugas2 !== undefined && match.tp2Tugas2 !== null ? String(match.tp2Tugas2) : '',
          tp2Uh: match.tp2Uh !== undefined && match.tp2Uh !== null ? String(match.tp2Uh) : '',

          tp3Tugas1: match.tp3Tugas1 !== undefined && match.tp3Tugas1 !== null ? String(match.tp3Tugas1) : (match.tp3Grade !== undefined ? String(match.tp3Grade) : ''),
          tp3Tugas2: match.tp3Tugas2 !== undefined && match.tp3Tugas2 !== null ? String(match.tp3Tugas2) : '',
          tp3Uh: match.tp3Uh !== undefined && match.tp3Uh !== null ? String(match.tp3Uh) : '',

          tp4Tugas1: match.tp4Tugas1 !== undefined && match.tp4Tugas1 !== null ? String(match.tp4Tugas1) : (match.tp4Grade !== undefined ? String(match.tp4Grade) : ''),
          tp4Tugas2: match.tp4Tugas2 !== undefined && match.tp4Tugas2 !== null ? String(match.tp4Tugas2) : '',
          tp4Uh: match.tp4Uh !== undefined && match.tp4Uh !== null ? String(match.tp4Uh) : '',

          nilaiSumatifLM: String(match.nilaiSumatifLM ?? ''),
          nilaiSAS: String(match.nilaiSAS ?? ''),
          deskripsiCapaian: match.deskripsiCapaian ?? ''
        };
      } else {
        newMap[s.id] = {
          tp1Tugas1: '', tp1Tugas2: '', tp1Uh: '',
          tp2Tugas1: '', tp2Tugas2: '', tp2Uh: '',
          tp3Tugas1: '', tp3Tugas2: '', tp3Uh: '',
          tp4Tugas1: '', tp4Tugas2: '', tp4Uh: '',
          nilaiSumatifLM: '',
          nilaiSAS: '',
          deskripsiCapaian: ''
        };
      }"""

new_populate_map = """      if (match) {
        newMap[s.id] = {
          tp1Tugas1: match.tp1Tugas1 !== undefined && match.tp1Tugas1 !== null ? String(match.tp1Tugas1) : (match.tp1Grade !== undefined ? String(match.tp1Grade) : ''),
          tp1Uh: match.tp1Uh !== undefined && match.tp1Uh !== null ? String(match.tp1Uh) : '',

          tp2Tugas1: match.tp2Tugas1 !== undefined && match.tp2Tugas1 !== null ? String(match.tp2Tugas1) : (match.tp2Grade !== undefined ? String(match.tp2Grade) : ''),
          tp2Uh: match.tp2Uh !== undefined && match.tp2Uh !== null ? String(match.tp2Uh) : '',

          tp3Tugas1: match.tp3Tugas1 !== undefined && match.tp3Tugas1 !== null ? String(match.tp3Tugas1) : (match.tp3Grade !== undefined ? String(match.tp3Grade) : ''),
          tp3Uh: match.tp3Uh !== undefined && match.tp3Uh !== null ? String(match.tp3Uh) : '',

          tp4Tugas1: match.tp4Tugas1 !== undefined && match.tp4Tugas1 !== null ? String(match.tp4Tugas1) : (match.tp4Grade !== undefined ? String(match.tp4Grade) : ''),
          tp4Uh: match.tp4Uh !== undefined && match.tp4Uh !== null ? String(match.tp4Uh) : '',

          nilaiSumatifLM: String(match.nilaiSumatifLM ?? ''),
          nilaiSAS: String(match.nilaiSAS ?? ''),
          deskripsiCapaian: match.deskripsiCapaian ?? ''
        };
      } else {
        newMap[s.id] = {
          tp1Tugas1: '', tp1Uh: '',
          tp2Tugas1: '', tp2Uh: '',
          tp3Tugas1: '', tp3Uh: '',
          tp4Tugas1: '', tp4Uh: '',
          nilaiSumatifLM: '',
          nilaiSAS: '',
          deskripsiCapaian: ''
        };
      }"""

assert old_populate_map in content, "old_populate_map not found"
content = content.replace(old_populate_map, new_populate_map, 1)

# 5. Template Excel Download without Tugas 2
old_template = """    const headers = [
      "No", "NIS", "Nama Siswa",
      "TP1_Tugas1", "TP1_Tugas2", "TP1_UH",
      "TP2_Tugas1", "TP2_Tugas2", "TP2_UH",
      "TP3_Tugas1", "TP3_Tugas2", "TP3_UH",
      "TP4_Tugas1", "TP4_Tugas2", "TP4_UH",
      "Kokurikuler", "PTS", "PAS"
    ];

    const rows = gradingClassStudents.map((st, idx) => [
      idx + 1,
      `"${st.nis || st.id}"`,
      `"${st.name.replace(/"/g, '""')}"`,
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", ""
    ]);"""

new_template = """    const headers = [
      "No", "NIS", "Nama Siswa",
      "TP1_Tugas", "TP1_UH",
      "TP2_Tugas", "TP2_UH",
      "TP3_Tugas", "TP3_UH",
      "TP4_Tugas", "TP4_UH",
      "Kokurikuler", "PTS", "PAS"
    ];

    const rows = gradingClassStudents.map((st, idx) => [
      idx + 1,
      `"${st.nis || st.id}"`,
      `"${st.name.replace(/"/g, '""')}"`,
      "", "",
      "", "",
      "", "",
      "", "",
      "", "", ""
    ]);"""

assert old_template in content, "old_template not found"
content = content.replace(old_template, new_template, 1)

# 6. Excel parsing update
old_excel_parse = """        if (gradeCells.length >= 15) {
          tp1T1 = gradeCells[0] || ""; tp1T2 = gradeCells[1] || ""; tp1Uh = gradeCells[2] || "";
          tp2T1 = gradeCells[3] || ""; tp2T2 = gradeCells[4] || ""; tp2Uh = gradeCells[5] || "";
          tp3T1 = gradeCells[6] || ""; tp3T2 = gradeCells[7] || ""; tp3Uh = gradeCells[8] || "";
          tp4T1 = gradeCells[9] || ""; tp4T2 = gradeCells[10] || ""; tp4Uh = gradeCells[11] || "";
          kokurikuler = gradeCells[12] || "";
          pts = gradeCells[13] || "";
          pas = gradeCells[14] || "";
        } else if (gradeCells.length >= 12) {
          tp1T1 = gradeCells[0] || ""; tp1T2 = gradeCells[1] || ""; tp1Uh = gradeCells[2] || "";
          tp2T1 = gradeCells[3] || ""; tp2T2 = gradeCells[4] || ""; tp2Uh = gradeCells[5] || "";
          tp3T1 = gradeCells[6] || ""; tp3T2 = gradeCells[7] || ""; tp3Uh = gradeCells[8] || "";
          tp4T1 = gradeCells[9] || ""; tp4T2 = gradeCells[10] || ""; tp4Uh = gradeCells[11] || "";
        } else {
          tp1Uh = gradeCells[0] || "";
          tp2Uh = gradeCells[1] || "";
          tp3Uh = gradeCells[2] || "";
          tp4Uh = gradeCells[3] || "";
          pts = gradeCells[4] || "";
          pas = gradeCells[5] || "";
        }"""

new_excel_parse = """        if (gradeCells.length >= 15) {
          // Legacy format (TP1-TP4 T1, T2, UH, Kokurikuler, PTS, PAS)
          tp1T1 = gradeCells[0] || ""; tp1Uh = gradeCells[2] || "";
          tp2T1 = gradeCells[3] || ""; tp2Uh = gradeCells[5] || "";
          tp3T1 = gradeCells[6] || ""; tp3Uh = gradeCells[8] || "";
          tp4T1 = gradeCells[9] || ""; tp4Uh = gradeCells[11] || "";
          kokurikuler = gradeCells[12] || "";
          pts = gradeCells[13] || "";
          pas = gradeCells[14] || "";
        } else if (gradeCells.length >= 11) {
          // Format terbaru tanpa T2 (TP1-TP4 Tugas & UH, Kokurikuler, PTS, PAS)
          tp1T1 = gradeCells[0] || ""; tp1Uh = gradeCells[1] || "";
          tp2T1 = gradeCells[2] || ""; tp2Uh = gradeCells[3] || "";
          tp3T1 = gradeCells[4] || ""; tp3Uh = gradeCells[5] || "";
          tp4T1 = gradeCells[6] || ""; tp4Uh = gradeCells[7] || "";
          kokurikuler = gradeCells[8] || "";
          pts = gradeCells[9] || "";
          pas = gradeCells[10] || "";
        } else if (gradeCells.length >= 8) {
          tp1T1 = gradeCells[0] || ""; tp1Uh = gradeCells[1] || "";
          tp2T1 = gradeCells[2] || ""; tp2Uh = gradeCells[3] || "";
          tp3T1 = gradeCells[4] || ""; tp3Uh = gradeCells[5] || "";
          tp4T1 = gradeCells[6] || ""; tp4Uh = gradeCells[7] || "";
        } else {
          tp1Uh = gradeCells[0] || "";
          tp2Uh = gradeCells[1] || "";
          tp3Uh = gradeCells[2] || "";
          tp4Uh = gradeCells[3] || "";
          pts = gradeCells[4] || "";
          pas = gradeCells[5] || "";
        }"""

assert old_excel_parse in content, "old_excel_parse not found"
content = content.replace(old_excel_parse, new_excel_parse, 1)

# 7. Add Save TP button in TP Card Header
old_tp_header_btn = """              {/* Quick Auto-fill TP Button from Teaching Journals */}
              <button
                type="button"
                onClick={handleAutoFillAllTpsFromJournals}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-[10.5px] transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-xs whitespace-nowrap"
                title="Ambil otomatis 4 TP dari jurnal pembelajaran terawal untuk mapel dan kelas ini"
              >
                <Sparkles size={13} className="text-amber-300" />
                <span>Link Otomatis Semua TP dari Jurnal</span>
              </button>"""

new_tp_header_btn = """              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {/* Tombol Simpan Khusus Deskripsi TP Mapel Ini */}
                <button
                  type="button"
                  onClick={handleSaveTpDescriptions}
                  disabled={isSavingTp}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-[10.5px] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  title={`Simpan permanen deskripsi TP 1 s.d. TP 4 untuk mapel ${selectedSubject}`}
                >
                  {isSavingTp ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Simpan Deskripsi TP ({selectedSubject})</span>
                </button>

                {/* Quick Auto-fill TP Button from Teaching Journals */}
                <button
                  type="button"
                  onClick={handleAutoFillAllTpsFromJournals}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-[10.5px] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  title="Ambil otomatis 4 TP dari jurnal pembelajaran terawal untuk mapel dan kelas ini"
                >
                  <Sparkles size={13} className="text-amber-300" />
                  <span>Link Otomatis dari Jurnal</span>
                </button>
              </div>"""

assert old_tp_header_btn in content, "old_tp_header_btn not found"
content = content.replace(old_tp_header_btn, new_tp_header_btn, 1)

# 8. Update TP Input selectors onChange to also cache into unsavedTpCache
content = content.replace(
    'onChange={setTp1InputName}',
    'onChange={(val) => { setTp1InputName(val); const k = (selectedSubject||\'\').trim().toLowerCase(); setUnsavedTpCache(p => ({ ...p, [k]: { ...(p[k]||{tp1Name:\'\',tp2Name:\'\',tp3Name:\'\',tp4Name:\'\'}), tp1Name: val } })); }}',
    1
)
content = content.replace(
    'onChange={setTp2InputName}',
    'onChange={(val) => { setTp2InputName(val); const k = (selectedSubject||\'\').trim().toLowerCase(); setUnsavedTpCache(p => ({ ...p, [k]: { ...(p[k]||{tp1Name:\'\',tp2Name:\'\',tp3Name:\'\',tp4Name:\'\'}), tp2Name: val } })); }}',
    1
)
content = content.replace(
    'onChange={setTp3InputName}',
    'onChange={(val) => { setTp3InputName(val); const k = (selectedSubject||\'\').trim().toLowerCase(); setUnsavedTpCache(p => ({ ...p, [k]: { ...(p[k]||{tp1Name:\'\',tp2Name:\'\',tp3Name:\'\',tp4Name:\'\'}), tp3Name: val } })); }}',
    1
)
content = content.replace(
    'onChange={setTp4InputName}',
    'onChange={(val) => { setTp4InputName(val); const k = (selectedSubject||\'\').trim().toLowerCase(); setUnsavedTpCache(p => ({ ...p, [k]: { ...(p[k]||{tp1Name:\'\',tp2Name:\'\',tp3Name:\'\',tp4Name:\'\'}), tp4Name: val } })); }}',
    1
)

# 9. Update Table Header without Tugas 2
old_table_header = """                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={3}>TP 1</th>
                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={3}>TP 2</th>
                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={3}>TP 3</th>
                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={3}>TP 4</th>

                    <th className="py-3 px-2 w-16 bg-blue-900 text-blue-200 font-black" rowSpan={2}>Rata2 TP</th>
                    <th className="py-3 px-2 w-16 bg-violet-900 text-violet-200 font-black" rowSpan={2}>Kokurikuler</th>
                    <th className="py-3 px-2 w-16 bg-amber-900 text-amber-200 font-black" rowSpan={2}>PTS</th>
                    <th className="py-3 px-2 w-16 bg-amber-950 text-amber-200 font-black" rowSpan={2}>PAS</th>
                    <th className="py-3 px-2 w-24 bg-emerald-950 text-emerald-300 font-black rounded-tr-3xl" rowSpan={2}>Nilai Akhir Mapel</th>
                  </tr>
                  <tr className="bg-slate-800 text-slate-300 font-bold text-[9px] uppercase tracking-wider text-center">
                    <th className="py-1.5 px-1 bg-slate-800">Tugas 1</th>
                    <th className="py-1.5 px-1 bg-slate-800">Tugas 2</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>

                    <th className="py-1.5 px-1 bg-slate-800">Tugas 1</th>
                    <th className="py-1.5 px-1 bg-slate-800">Tugas 2</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>

                    <th className="py-1.5 px-1 bg-slate-800">Tugas 1</th>
                    <th className="py-1.5 px-1 bg-slate-800">Tugas 2</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>

                    <th className="py-1.5 px-1 bg-slate-800">Tugas 1</th>
                    <th className="py-1.5 px-1 bg-slate-800">Tugas 2</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>
                  </tr>"""

new_table_header = """                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={2}>TP 1</th>
                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={2}>TP 2</th>
                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={2}>TP 3</th>
                    <th className="py-2 px-2 bg-indigo-950 text-indigo-200 border-x border-indigo-900" colSpan={2}>TP 4</th>

                    <th className="py-3 px-2 w-16 bg-blue-900 text-blue-200 font-black" rowSpan={2}>Rata2 TP</th>
                    <th className="py-3 px-2 w-16 bg-violet-900 text-violet-200 font-black" rowSpan={2}>Kokurikuler</th>
                    <th className="py-3 px-2 w-16 bg-amber-900 text-amber-200 font-black" rowSpan={2}>PTS</th>
                    <th className="py-3 px-2 w-16 bg-amber-950 text-amber-200 font-black" rowSpan={2}>PAS</th>
                    <th className="py-3 px-2 w-24 bg-emerald-950 text-emerald-300 font-black rounded-tr-3xl" rowSpan={2}>Nilai Akhir Mapel</th>
                  </tr>
                  <tr className="bg-slate-800 text-slate-300 font-bold text-[9px] uppercase tracking-wider text-center">
                    <th className="py-1.5 px-1 bg-slate-800">Tugas</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>

                    <th className="py-1.5 px-1 bg-slate-800">Tugas</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>

                    <th className="py-1.5 px-1 bg-slate-800">Tugas</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>

                    <th className="py-1.5 px-1 bg-slate-800">Tugas</th>
                    <th className="py-1.5 px-1 bg-indigo-900 text-indigo-200 font-black">UH</th>
                  </tr>"""

assert old_table_header in content, "old_table_header not found"
content = content.replace(old_table_header, new_table_header, 1)

# colSpan 18 to 15
content = content.replace('colSpan={18}', 'colSpan={15}', 1)

# 10. Update calcTpScore inside table rows and formula
old_calc_score = """                      const calcTpScore = (t1Val: any, t2Val: any, uhVal: any) => {
                        const t1 = parseVal(t1Val);
                        const t2 = parseVal(t2Val);
                        const u = parseVal(uhVal);
                        const tList = [t1, t2].filter((x): x is number => x !== null);
                        if (tList.length === 0 && u === null) return null;
                        const avgTugas = tList.length > 0 ? (tList.reduce((a, b) => a + b, 0) / tList.length) : null;
                        if (avgTugas !== null && u !== null) return Math.round((avgTugas * 0.6) + (u * 0.4));
                        if (avgTugas !== null) return Math.round(avgTugas);
                        if (u !== null) return Math.round(u);
                        return null;
                      };

                      const tp1Score = calcTpScore(inputState.tp1Tugas1, inputState.tp1Tugas2, inputState.tp1Uh);
                      const tp2Score = calcTpScore(inputState.tp2Tugas1, inputState.tp2Tugas2, inputState.tp2Uh);
                      const tp3Score = calcTpScore(inputState.tp3Tugas1, inputState.tp3Tugas2, inputState.tp3Uh);
                      const tp4Score = calcTpScore((inputState as any).tp4Tugas1, (inputState as any).tp4Tugas2, (inputState as any).tp4Uh);"""

new_calc_score = """                      const calcTpScore = (tVal: any, uhVal: any) => {
                        const t = parseVal(tVal);
                        const u = parseVal(uhVal);
                        if (t === null && u === null) return null;
                        if (t !== null && u !== null) return Math.round((t * 0.6) + (u * 0.4));
                        if (t !== null) return Math.round(t);
                        if (u !== null) return Math.round(u);
                        return null;
                      };

                      const tp1Score = calcTpScore(inputState.tp1Tugas1, inputState.tp1Uh);
                      const tp2Score = calcTpScore(inputState.tp2Tugas1, inputState.tp2Uh);
                      const tp3Score = calcTpScore(inputState.tp3Tugas1, inputState.tp3Uh);
                      const tp4Score = calcTpScore((inputState as any).tp4Tugas1, (inputState as any).tp4Uh);"""

assert old_calc_score in content, "old_calc_score not found"
content = content.replace(old_calc_score, new_calc_score, 1)

# 11. Update row inputs (remove Tugas 2 input columns)
old_row_inputs = """                          {/* TP 1 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp1Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp1Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp1Tugas2 || ''}
                              onChange={(e) => handleGradeChange('tp1Tugas2', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={inputState.tp1Uh || ''}
                              onChange={(e) => handleGradeChange('tp1Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>

                          {/* TP 2 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp2Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp2Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp2Tugas2 || ''}
                              onChange={(e) => handleGradeChange('tp2Tugas2', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={inputState.tp2Uh || ''}
                              onChange={(e) => handleGradeChange('tp2Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>

                          {/* TP 3 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp3Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp3Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp3Tugas2 || ''}
                              onChange={(e) => handleGradeChange('tp3Tugas2', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={inputState.tp3Uh || ''}
                              onChange={(e) => handleGradeChange('tp3Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>

                          {/* TP 4 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={(inputState as any).tp4Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp4Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={(inputState as any).tp4Tugas2 || ''}
                              onChange={(e) => handleGradeChange('tp4Tugas2', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={(inputState as any).tp4Uh || ''}
                              onChange={(e) => handleGradeChange('tp4Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>"""

new_row_inputs = """                          {/* TP 1 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp1Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp1Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={inputState.tp1Uh || ''}
                              onChange={(e) => handleGradeChange('tp1Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>

                          {/* TP 2 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp2Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp2Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={inputState.tp2Uh || ''}
                              onChange={(e) => handleGradeChange('tp2Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>

                          {/* TP 3 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={inputState.tp3Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp3Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={inputState.tp3Uh || ''}
                              onChange={(e) => handleGradeChange('tp3Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>

                          {/* TP 4 Inputs */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="text" maxLength={3} value={(inputState as any).tp4Tugas1 || ''}
                              onChange={(e) => handleGradeChange('tp4Tugas1', e.target.value)}
                              className="w-10 text-center border border-slate-200 rounded py-0.5 font-bold text-slate-800 bg-white focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>
                          <td className="py-2 px-1 text-center bg-indigo-50/30">
                            <input
                              type="text" maxLength={3} value={(inputState as any).tp4Uh || ''}
                              onChange={(e) => handleGradeChange('tp4Uh', e.target.value)}
                              className="w-10 text-center border border-indigo-200 rounded py-0.5 font-black text-indigo-900 bg-indigo-50/50 focus:border-indigo-600 focus:outline-none" placeholder="-"
                            />
                          </td>"""

assert old_row_inputs in content, "old_row_inputs not found"
content = content.replace(old_row_inputs, new_row_inputs, 1)

# 12. Update formula text
content = content.replace(
    'Formula: Nilai Akhir TP = (Rata2 Tugas × 60%) + (UH × 40%) | Nilai Akhir Mapel = ((Rata2 TP × 2) + Kokurikuler + PTS + PAS) / 5',
    'Formula: Nilai Akhir TP = (Tugas × 60%) + (UH × 40%) | Nilai Akhir Mapel = ((Rata2 TP × 2) + Kokurikuler + PTS + PAS) / 5',
    1
)

# 13. Update batchData in handleSave
old_batch_save = """                    const batchData = gradingClassStudents.map(s => {
                      const inputState = gradeInputMap[s.id] || {
                        tp1Tugas1: '', tp1Tugas2: '', tp1Uh: '',
                        tp2Tugas1: '', tp2Tugas2: '', tp2Uh: '',
                        tp3Tugas1: '', tp3Tugas2: '', tp3Uh: '',
                        tp4Tugas1: '', tp4Tugas2: '', tp4Uh: ''
                      };

                      return {
                        studentId: s.id,
                        studentName: s.name,
                        className: s.class,
                        subject: selectedSubject,
                        teacherName: currentTeacher.name,
                        semester: selectedSemesterGrading,
                        academicYear: selectedYearGrading,
                        tp1Name: tp1InputName,
                        tp1Tugas1: inputState.tp1Tugas1,
                        tp1Tugas2: inputState.tp1Tugas2,
                        tp1Uh: inputState.tp1Uh,

                        tp2Name: tp2InputName || undefined,
                        tp2Tugas1: inputState.tp2Tugas1,
                        tp2Tugas2: inputState.tp2Tugas2,
                        tp2Uh: inputState.tp2Uh,

                        tp3Name: tp3InputName || undefined,
                        tp3Tugas1: inputState.tp3Tugas1,
                        tp3Tugas2: inputState.tp3Tugas2,
                        tp3Uh: inputState.tp3Uh,

                        tp4Name: tp4InputName || undefined,
                        tp4Tugas1: (inputState as any).tp4Tugas1,
                        tp4Tugas2: (inputState as any).tp4Tugas2,
                        tp4Uh: (inputState as any).tp4Uh
                      };
                    });"""

new_batch_save = """                    const batchData = gradingClassStudents.map(s => {
                      const inputState = gradeInputMap[s.id] || {
                        tp1Tugas1: '', tp1Uh: '',
                        tp2Tugas1: '', tp2Uh: '',
                        tp3Tugas1: '', tp3Uh: '',
                        tp4Tugas1: '', tp4Uh: ''
                      };

                      return {
                        studentId: s.id,
                        studentName: s.name,
                        className: s.class,
                        subject: selectedSubject,
                        teacherName: currentTeacher.name,
                        semester: selectedSemesterGrading,
                        academicYear: selectedYearGrading,
                        tp1Name: tp1InputName,
                        tp1Tugas1: inputState.tp1Tugas1,
                        tp1Uh: inputState.tp1Uh,

                        tp2Name: tp2InputName || undefined,
                        tp2Tugas1: inputState.tp2Tugas1,
                        tp2Uh: inputState.tp2Uh,

                        tp3Name: tp3InputName || undefined,
                        tp3Tugas1: inputState.tp3Tugas1,
                        tp3Uh: inputState.tp3Uh,

                        tp4Name: tp4InputName || undefined,
                        tp4Tugas1: (inputState as any).tp4Tugas1,
                        tp4Uh: (inputState as any).tp4Uh
                      };
                    });"""

assert old_batch_save in content, "old_batch_save not found"
content = content.replace(old_batch_save, new_batch_save, 1)

# 14. In handleSave success, also call handleSaveTpDescriptions
old_save_success = """                    if (res.ok) {
                      setFeedback({ type: 'success', text: `Seluruh penilaian Kurikulum Merdeka untuk Kelas ${selectedGradeClass} berhasil disimpan ke basis data!` });
                      fetchAssessments();
                      onRefresh();
                    }"""

new_save_success = """                    if (res.ok) {
                      setFeedback({ type: 'success', text: `Seluruh penilaian Kurikulum Merdeka dan deskripsi TP untuk Kelas ${selectedGradeClass} berhasil disimpan ke basis data!` });
                      fetchAssessments();
                      handleSaveTpDescriptions();
                      onRefresh();
                    }"""

assert old_save_success in content, "old_save_success not found"
content = content.replace(old_save_success, new_save_success, 1)

# 15. Update guide text
content = content.replace(
    'Mendukung format terbaru Kurikulum Merdeka (TP1-TP4 Tugas 1, Tugas 2, UH, Kokurikuler, PTS, PAS)',
    'Mendukung format terbaru Kurikulum Merdeka (TP1-TP4 Tugas, UH, Kokurikuler, PTS, PAS)',
    1
)

# 16. Update Print Preview table headers and rows (remove Tugas 2)
old_print_headers = """                      <tr className="bg-slate-50 text-slate-700 font-bold text-[9px] text-center border-b border-slate-800">
                        <th className="p-1 border border-slate-800 w-7">T1</th><th className="p-1 border border-slate-800 w-7">T2</th><th className="p-1 border border-slate-800 w-7">UH</th>
                        <th className="p-1 border border-slate-800 w-7">T1</th><th className="p-1 border border-slate-800 w-7">T2</th><th className="p-1 border border-slate-800 w-7">UH</th>
                        <th className="p-1 border border-slate-800 w-7">T1</th><th className="p-1 border border-slate-800 w-7">T2</th><th className="p-1 border border-slate-800 w-7">UH</th>
                        <th className="p-1 border border-slate-800 w-7">T1</th><th className="p-1 border border-slate-800 w-7">T2</th><th className="p-1 border border-slate-800 w-7">UH</th>
                      </tr>"""

new_print_headers = """                      <tr className="bg-slate-50 text-slate-700 font-bold text-[9px] text-center border-b border-slate-800">
                        <th className="p-1 border border-slate-800 w-8">Tugas</th><th className="p-1 border border-slate-800 w-8">UH</th>
                        <th className="p-1 border border-slate-800 w-8">Tugas</th><th className="p-1 border border-slate-800 w-8">UH</th>
                        <th className="p-1 border border-slate-800 w-8">Tugas</th><th className="p-1 border border-slate-800 w-8">UH</th>
                        <th className="p-1 border border-slate-800 w-8">Tugas</th><th className="p-1 border border-slate-800 w-8">UH</th>
                      </tr>"""

assert old_print_headers in content, "old_print_headers not found"
content = content.replace(old_print_headers, new_print_headers, 1)

# colSpan in print preview top header
content = content.replace(
    '<th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={3}>TP 1</th>\n                        <th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={3}>TP 2</th>\n                        <th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={3}>TP 3</th>\n                        <th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={3}>TP 4</th>',
    '<th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={2}>TP 1</th>\n                        <th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={2}>TP 2</th>\n                        <th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={2}>TP 3</th>\n                        <th className="p-1.5 border border-slate-800 bg-slate-100" colSpan={2}>TP 4</th>',
    1
)

# Print preview calcTp
old_print_calctp = """                        const calcTp = (t1: any, t2: any, uh: any) => {
                          const n1 = t1 !== '' && !isNaN(Number(t1)) ? Number(t1) : null;
                          const n2 = t2 !== '' && !isNaN(Number(t2)) ? Number(t2) : null;
                          const n3 = uh !== '' && !isNaN(Number(uh)) ? Number(uh) : null;
                          if (n1 === null && n2 === null && n3 === null) return null;
                          let tugasAvg = null;
                          if (n1 !== null && n2 !== null) tugasAvg = (n1 + n2) / 2;
                          else if (n1 !== null) tugasAvg = n1;
                          else if (n2 !== null) tugasAvg = n2;

                          if (tugasAvg !== null && n3 !== null) return Math.round((tugasAvg * 0.6) + (n3 * 0.4));
                          if (tugasAvg !== null) return Math.round(tugasAvg);
                          if (n3 !== null) return Math.round(n3);
                          return null;
                        };

                        const tp1 = calcTp(inputState.tp1Tugas1, inputState.tp1Tugas2, inputState.tp1Uh);
                        const tp2 = calcTp(inputState.tp2Tugas1, inputState.tp2Tugas2, inputState.tp2Uh);
                        const tp3 = calcTp(inputState.tp3Tugas1, inputState.tp3Tugas2, inputState.tp3Uh);
                        const tp4 = calcTp(inputState.tp4Tugas1, inputState.tp4Tugas2, inputState.tp4Uh);"""

new_print_calctp = """                        const calcTp = (t1: any, uh: any) => {
                          const n1 = t1 !== '' && !isNaN(Number(t1)) ? Number(t1) : null;
                          const n3 = uh !== '' && !isNaN(Number(uh)) ? Number(uh) : null;
                          if (n1 === null && n3 === null) return null;
                          if (n1 !== null && n3 !== null) return Math.round((n1 * 0.6) + (n3 * 0.4));
                          if (n1 !== null) return Math.round(n1);
                          if (n3 !== null) return Math.round(n3);
                          return null;
                        };

                        const tp1 = calcTp(inputState.tp1Tugas1, inputState.tp1Uh);
                        const tp2 = calcTp(inputState.tp2Tugas1, inputState.tp2Uh);
                        const tp3 = calcTp(inputState.tp3Tugas1, inputState.tp3Uh);
                        const tp4 = calcTp(inputState.tp4Tugas1, inputState.tp4Uh);"""

assert old_print_calctp in content, "old_print_calctp not found"
content = content.replace(old_print_calctp, new_print_calctp, 1)

# Print preview row cells
old_print_cells = """                            <td className="p-1 border border-slate-300">{inputState.tp1Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300">{inputState.tp1Tugas2 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp1Uh || "-"}</td>

                            <td className="p-1 border border-slate-300">{inputState.tp2Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300">{inputState.tp2Tugas2 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp2Uh || "-"}</td>

                            <td className="p-1 border border-slate-300">{inputState.tp3Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300">{inputState.tp3Tugas2 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp3Uh || "-"}</td>

                            <td className="p-1 border border-slate-300">{inputState.tp4Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300">{inputState.tp4Tugas2 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp4Uh || "-"}</td>"""

new_print_cells = """                            <td className="p-1 border border-slate-300">{inputState.tp1Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp1Uh || "-"}</td>

                            <td className="p-1 border border-slate-300">{inputState.tp2Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp2Uh || "-"}</td>

                            <td className="p-1 border border-slate-300">{inputState.tp3Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp3Uh || "-"}</td>

                            <td className="p-1 border border-slate-300">{inputState.tp4Tugas1 || "-"}</td>
                            <td className="p-1 border border-slate-300 font-bold">{inputState.tp4Uh || "-"}</td>"""

assert old_print_cells in content, "old_print_cells not found"
content = content.replace(old_print_cells, new_print_cells, 1)

with open("src/components/SubjectTeacherPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: All SubjectTeacherPanel.tsx updates completed!")
