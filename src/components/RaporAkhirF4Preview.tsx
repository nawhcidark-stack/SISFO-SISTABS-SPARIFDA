import React, { useState, useEffect } from 'react';
import { Student, SchoolIdentity } from '../types';
import {
  RaporSubjectRow,
  RaporStudentRecord,
  RaporSemesterDataConfig,
  RaporExtracurricularItem,
  ExtracurricularMasterItem,
  splitSubjectsForTwoPageRapor,
  formatClassLabelForRapor,
  resolveSubjectCapaianTopBottom,
  getDisplayedExtracurricularRows,
  buildExtracurricularDescription
} from '../utils/raporAkhirPrint';
import { Save, Edit2, Award, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface RaporAkhirF4PreviewProps {
  student: Student;
  subjectRows: RaporSubjectRow[];
  rawAttendance: { Sakit: number; Izin: number; Alpa: number };
  studentRecord?: RaporStudentRecord;
  raporSettings: RaporSemesterDataConfig['settings'];
  extracurricularMaster?: ExtracurricularMasterItem[];
  semester: string;
  academicYear: string;
  homeroomTeacherName: string;
  schoolIdentity?: SchoolIdentity;
  formattedDateStr: string;
  editable?: boolean;
  isSavingRaporData?: boolean;
  onSaveStudentRecord?: (updated: Partial<RaporStudentRecord>) => Promise<void>;
}

export const RaporAkhirF4Preview: React.FC<RaporAkhirF4PreviewProps> = ({
  student,
  subjectRows,
  rawAttendance,
  studentRecord,
  raporSettings,
  extracurricularMaster = [],
  semester,
  academicYear,
  homeroomTeacherName,
  schoolIdentity,
  formattedDateStr,
  editable = false,
  isSavingRaporData = false,
  onSaveStudentRecord
}) => {
  const { page1Subjects, page2IntraSubjects, page2MulokSubjects } = splitSubjectsForTwoPageRapor(subjectRows);

  const [isEditingEkskul, setIsEditingEkskul] = useState(false);
  const [ekskulDraft, setEkskulDraft] = useState<RaporExtracurricularItem[]>([]);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<string | null>(null);

  // Ketidakhadiran otomatis dari sistem absensi
  const sakitVal = rawAttendance.Sakit;
  const izinVal = rawAttendance.Izin;
  const alpaVal = rawAttendance.Alpa;

  // Tampilkan sesuai jumlah ekstra yang diikuti siswa (1, 2, atau maksimal 3)
  const activeEkskul: RaporExtracurricularItem[] = getDisplayedExtracurricularRows(
    studentRecord,
    extracurricularMaster
  );

  useEffect(() => {
    const displayed = getDisplayedExtracurricularRows(studentRecord, extracurricularMaster);
    setEkskulDraft(displayed);
    setIsEditingEkskul(false);
  }, [student.id, semester, academicYear, studentRecord, extracurricularMaster]);

  const handleSaveEkskul = async () => {
    if (!onSaveStudentRecord) return;
    const cleaned = ekskulDraft
      .filter(e => (e.name && e.name.trim() && e.name.trim() !== '-') || (e.id_ekstra && e.id_ekstra.trim() && e.id_ekstra.trim() !== '-'))
      .slice(0, 3)
      .map((e, i) => {
        const matched = extracurricularMaster.find(
          m => m.id_ekstra.toLowerCase() === (e.id_ekstra || '').trim().toLowerCase() ||
               m.nama_ekstra.toLowerCase() === (e.name || '').trim().toLowerCase()
        );
        const finalName = matched?.nama_ekstra || e.name.trim() || '-';
        const finalPred = (e.predicate || '').trim().toUpperCase() || '-';
        return {
          no: i + 1,
          id_ekstra: matched?.id_ekstra || e.id_ekstra || undefined,
          name: finalName,
          predicate: finalPred,
          description: buildExtracurricularDescription(finalPred, finalName, e.description)
        };
      });

    await onSaveStudentRecord({
      studentId: student.id,
      nis: student.nis,
      semester,
      academicYear,
      extracurriculars: cleaned
    });
    setIsEditingEkskul(false);
    setSaveSuccessBanner('Data Ekstrakurikuler berhasil disimpan langsung ke MySQL!');
    setTimeout(() => setSaveSuccessBanner(null), 3500);
  };

  const schoolName = (schoolIdentity?.name || raporSettings.schoolName || "SMP MA'ARIF NU PANDAAN").toUpperCase();
  const schoolAddress =
    schoolIdentity?.address ||
    (raporSettings.schoolAddress && raporSettings.schoolAddress !== 'Jl. Raya A. Yani No. 92'
      ? raporSettings.schoolAddress
      : '') ||
    'Pandaan, Pasuruan';
  const place = raporSettings.place || 'Pandaan';
  const principalName =
    (raporSettings.principalName && raporSettings.principalName !== 'H. Lasudi, S.Pd.'
      ? raporSettings.principalName
      : '') ||
    schoolIdentity?.principal ||
    'Kepala Sekolah';
  const fase = raporSettings.fase || 'D';
  const classDisplay = formatClassLabelForRapor(student.class);

  const renderIdentityBox = () => (
    <div className="border-t border-b border-black py-1.5 mb-2.5 text-[11pt] leading-snug text-black shrink-0">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-0.5">
        <div className="md:col-span-8 grid grid-cols-12">
          <div className="col-span-4">Nama Murid</div>
          <div className="col-span-8">: <span className="uppercase">{student.name}</span></div>
          <div className="col-span-4">NIS / NISN</div>
          <div className="col-span-8">: {student.nis || '-'} / {student.nisn || '-'}</div>
          <div className="col-span-4">Sekolah</div>
          <div className="col-span-8">: {schoolName}</div>
          <div className="col-span-4">Alamat</div>
          <div className="col-span-8">: {schoolAddress}</div>
        </div>
        <div className="md:col-span-4 grid grid-cols-12">
          <div className="col-span-6">Kelas</div>
          <div className="col-span-6">: {classDisplay}</div>
          <div className="col-span-6">Fase</div>
          <div className="col-span-6">: {fase}</div>
          <div className="col-span-6">Semester</div>
          <div className="col-span-6">: {semester}</div>
          <div className="col-span-6">Tahun Pelajaran</div>
          <div className="col-span-6">: {academicYear}</div>
        </div>
      </div>
    </div>
  );

  const renderSubjectRow = (s: RaporSubjectRow, _isPage1: boolean = false) => {
    const val = s.naAkhir > 0 ? s.naAkhir : (s.naPts > 0 ? s.naPts : '-');
    const { top, bottom } = resolveSubjectCapaianTopBottom(s);

    return (
      <React.Fragment key={`${s.orderNo}-${s.id}`}>
        <tr className="hover:bg-slate-50/70">
          <td rowSpan={2} className="border border-black px-2 py-1.5 text-center align-middle w-12 text-[11pt]">
            {s.orderNo}
          </td>
          <td rowSpan={2} className="border border-black px-3 py-1.5 align-middle w-56 text-[11pt] leading-tight">
            {s.displayName}
          </td>
          <td rowSpan={2} className="border border-black px-2 py-1.5 text-center align-middle w-20 font-medium text-[11pt]">
            {val}
          </td>
          <td className="border border-black px-3 py-1.5 align-middle text-[11pt] leading-tight text-justify">
            {top}
          </td>
        </tr>
        <tr className="hover:bg-slate-50/70">
          <td className="border border-black px-3 py-1.5 align-middle text-[11pt] leading-tight text-justify">
            {bottom}
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {saveSuccessBanner && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{saveSuccessBanner}</span>
        </div>
      )}

      {/* Editor Ekstrakurikuler (Tersimpan langsung ke MySQL) */}
      {editable && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Award size={15} className="text-purple-600" />
                <span>Nilai Ekstrakurikuler Rapor ({student.name})</span>
              </h4>
              <p className="text-[10.5px] text-slate-500">
                Ketidakhadiran diambil otomatis dari sistem absensi (Sakit: {sakitVal}, Izin: {izinVal}, Tanpa Keterangan: {alpaVal}) &amp; Capaian TP otomatis dari Deskripsi TP Penilaian.
              </p>
            </div>
            {!isEditingEkskul ? (
              <button
                type="button"
                onClick={() => setIsEditingEkskul(true)}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit2 size={13} />
                <span>Input / Edit Ekstrakurikuler</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingEkskul(false)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingRaporData}
                  onClick={handleSaveEkskul}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save size={13} />
                  <span>{isSavingRaporData ? 'Menyimpan ke MySQL...' : 'Simpan ke MySQL'}</span>
                </button>
              </div>
            )}
          </div>

          {isEditingEkskul && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    B. Nilai Ekstrakurikuler (Maksimal 3 Ekstra — Tampil di Rapor Sesuai Jumlah yang Diikuti)
                  </label>
                  {ekskulDraft.length < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEkskulDraft(prev => [
                          ...prev,
                          { no: prev.length + 1, id_ekstra: '', name: '', predicate: 'A', description: '' }
                        ])
                      }
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Tambah Ekstra ({ekskulDraft.length}/3)</span>
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {ekskulDraft.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 items-center">
                      <div className="sm:col-span-1 flex items-center justify-center font-bold text-xs text-slate-500">
                        #{idx + 1}
                      </div>
                      <div className="sm:col-span-4">
                        {extracurricularMaster.length > 0 ? (
                          <select
                            value={
                              item.id_ekstra ||
                              extracurricularMaster.find(m => m.nama_ekstra.toLowerCase() === (item.name || '').toLowerCase())?.id_ekstra ||
                              ''
                            }
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const matched = extracurricularMaster.find(m => m.id_ekstra === selectedId);
                              const nextName = matched ? matched.nama_ekstra : '';
                              const pred = item.predicate && item.predicate !== '-' ? item.predicate : 'A';
                              const next = [...ekskulDraft];
                              next[idx] = {
                                ...next[idx],
                                id_ekstra: selectedId,
                                name: nextName,
                                predicate: pred,
                                description: buildExtracurricularDescription(pred, nextName)
                              };
                              setEkskulDraft(next);
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                          >
                            <option value="">-- Pilih Ekstrakurikuler --</option>
                            {extracurricularMaster.map(m => (
                              <option key={m.id_ekstra} value={m.id_ekstra}>
                                [{m.id_ekstra}] {m.nama_ekstra}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.name === '-' ? '' : item.name}
                            onChange={(e) => {
                              const nextName = e.target.value;
                              const pred = item.predicate && item.predicate !== '-' ? item.predicate : 'A';
                              const next = [...ekskulDraft];
                              next[idx] = {
                                ...next[idx],
                                name: nextName,
                                predicate: pred,
                                description: buildExtracurricularDescription(pred, nextName)
                              };
                              setEkskulDraft(next);
                            }}
                            placeholder="Nama Ekstrakurikuler"
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={item.predicate === '-' ? '' : item.predicate}
                          onChange={(e) => {
                            const nextPred = e.target.value;
                            const next = [...ekskulDraft];
                            next[idx] = {
                              ...next[idx],
                              predicate: nextPred,
                              description: buildExtracurricularDescription(nextPred, next[idx].name)
                            };
                            setEkskulDraft(next);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center bg-white"
                        >
                          <option value="">- Predikat -</option>
                          <option value="A">A (Sangat Baik)</option>
                          <option value="B">B (Baik)</option>
                          <option value="C">C (Cukup Baik)</option>
                          <option value="D">D (Kurang)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={item.description === '-' ? '' : item.description}
                          onChange={(e) => {
                            const next = [...ekskulDraft];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setEkskulDraft(next);
                          }}
                          placeholder="Keterangan otomatis berdasarkan predikat"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = ekskulDraft.filter((_, i) => i !== idx);
                            setEkskulDraft(next.length > 0 ? next : [{ no: 1, name: '-', predicate: '-', description: '-' }]);
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Hapus baris ekstra ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= PRATINJAU HALAMAN 1 (KERTAS F4 CUSTOM: MAPEL 1 - 9, TANPA KOP, FULL SAMPAI SEBELUM FOOTER) ================= */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl pt-6 sm:pt-8 px-6 sm:px-8 pb-[12.6mm] shadow-sm text-black font-sans text-[11pt] select-text relative min-h-[1080px] flex flex-col justify-between overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 mb-[5.6mm]">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-dashed border-slate-200 text-[10px] text-slate-400 font-mono shrink-0">
            <span>LEMBAR 1 &bull; KERTAS F4 (21,59 &times; 32,04 cm) &bull; FONT 11pt &bull; MARGIN BAWAH TABEL 2,22 cm &bull; FOOTER 1,26 cm</span>
            <span className="font-bold text-purple-600">HALAMAN 1 (Mapel No. 1 - 9)</span>
          </div>

          {/* Identitas Rapor Halaman 1 */}
          {renderIdentityBox()}

          <div className="text-center font-bold text-[11pt] my-1.5 tracking-wide shrink-0">
            LAPORAN HASIL BELAJAR
          </div>

          <div className="font-bold text-[11pt] mb-1.5 shrink-0">
            A. &nbsp;INTRAKURIKULER
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-x-auto">
            <table className="w-full flex-1 border-collapse border border-black text-[11pt]">
              <thead>
                <tr className="text-center font-bold">
                  <th className="border border-black px-2 py-1.5 w-12 text-[11pt]">No</th>
                  <th className="border border-black px-3 py-1.5 w-56 text-[11pt]">Muatan Pelajaran</th>
                  <th className="border border-black px-2 py-1.5 w-20 leading-tight text-[11pt]">Nilai<br />Akhir</th>
                  <th className="border border-black px-3 py-1.5 text-[11pt]">Capaian Tujuan Pembelajaran</th>
                </tr>
              </thead>
              <tbody>
                {page1Subjects.map(s => renderSubjectRow(s, true))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Halaman 1 (Terpisah dengan jarak 5,6 mm di bawah tabel agar tabel tidak pernah masuk ke footer) */}
        <div className="pt-1 border-t border-slate-600 flex items-center justify-between font-mono text-[10px] text-slate-700 shrink-0 bg-white relative z-10">
          <span>{classDisplay} | {(student.name || '').toUpperCase()} | {student.nis || '-'}</span>
          <span>Halaman | 1</span>
        </div>
      </div>

      {/* ================= PRATINJAU HALAMAN 2 (KERTAS F4 CUSTOM: MAPEL 10, MULOK 11-12, EKSKUL, KEHADIRAN, TTD) ================= */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl pt-6 sm:pt-8 px-6 sm:px-8 pb-[12.6mm] shadow-sm text-black font-sans text-[11pt] select-text relative min-h-[1080px] flex flex-col justify-between">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-dashed border-slate-200 text-[10px] text-slate-400 font-mono shrink-0">
            <span>LEMBAR 2 &bull; KERTAS F4 (21,59 &times; 32,04 cm) &bull; FONT 11pt &bull; MARGIN BAWAH TABEL 2,22 cm &bull; FOOTER 1,26 cm</span>
            <span className="font-bold text-purple-600">HALAMAN 2 (Mapel No. 10, Mulok 11-12, Ekskul, Absensi &amp; TTD)</span>
          </div>

          {/* Identitas Rapor Halaman 2 (Sama dengan Halaman 1) */}
          {renderIdentityBox()}

          {/* Tabel Lanjutan Mapel No 10 & Muatan Lokal No 11-12 */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full border-collapse border border-black text-[11pt]">
              <thead>
                <tr className="text-center font-bold">
                  <th className="border border-black px-2 py-2 w-12 text-[11pt]">No</th>
                  <th className="border border-black px-3 py-2 w-60 text-[11pt]">Muatan Pelajaran</th>
                  <th className="border border-black px-2 py-2 w-20 leading-tight text-[11pt]">Nilai<br />Akhir</th>
                  <th className="border border-black px-3 py-2 text-[11pt]">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {page2IntraSubjects.map(s => renderSubjectRow(s, false))}
                {page2MulokSubjects.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={4} className="border border-black px-3 py-1.5 font-bold uppercase text-[11pt]">
                        MUATAN LOKAL
                      </td>
                    </tr>
                    {page2MulokSubjects.map(s => renderSubjectRow(s, false))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* B. EKSTRAKURIKULER */}
          <div className="font-bold text-[11pt] mt-3.5 mb-1">
            B. &nbsp;EKSTRAKURIKULER
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[11pt]">
              <thead>
                <tr className="text-center font-bold">
                  <th className="border border-black px-2 py-1.5 w-12 text-[11pt]">No</th>
                  <th className="border border-black px-3 py-1.5 w-60 text-[11pt]">Ekstrakurikuler</th>
                  <th className="border border-black px-2 py-1.5 w-24 text-[11pt]">Predikat</th>
                  <th className="border border-black px-3 py-1.5 text-[11pt]">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {activeEkskul.map((ek) => (
                  <tr key={ek.no}>
                    <td className="border border-black px-2 py-1.5 text-center text-[11pt]">{ek.no}</td>
                    <td className="border border-black px-3 py-1.5 text-[11pt]">{ek.name}</td>
                    <td className="border border-black px-2 py-1.5 text-center text-[11pt]">{ek.predicate}</td>
                    <td className="border border-black px-3 py-1.5 leading-snug text-[11pt]">{ek.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* C. KETIDAKHADIRAN (Otomatis dari Sistem Absensi) */}
          <div className="font-bold text-[11pt] mt-3.5 mb-1">
            C. &nbsp;KETIDAKHADIRAN
          </div>
          <div className="max-w-sm">
            <table className="w-full border-collapse border border-black text-[11pt]">
              <thead>
                <tr>
                  <th colSpan={2} className="border border-black px-3 py-1.5 text-center font-bold text-[11pt]">
                    Ketidakhadiran
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-3 py-1 w-2/3 text-[11pt]">Sakit</td>
                  <td className="border border-black px-3 py-1 w-1/3 text-[11pt]">
                    <span className="inline-block w-6 text-center">{sakitVal > 0 ? sakitVal : '-'}</span> hari
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-1 text-[11pt]">Izin</td>
                  <td className="border border-black px-3 py-1 text-[11pt]">
                    <span className="inline-block w-6 text-center">{izinVal > 0 ? izinVal : '-'}</span> hari
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-3 py-1 text-[11pt]">Tanpa Keterangan</td>
                  <td className="border border-black px-3 py-1 text-[11pt]">
                    <span className="inline-block w-6 text-center">{alpaVal > 0 ? alpaVal : '-'}</span> hari
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TANDA TANGAN RAPOR (Sama dengan Format Rapor Tengah Semester) */}
          <table className="w-full border-collapse text-center text-[11pt] mt-6">
            <tbody>
              <tr>
                <td className="w-1/3 text-center align-top">
                  Mengetahui,<br />
                  Orang Tua / Wali Murid
                  <div className="h-14" />
                  ( ........................................ )
                </td>
                <td className="w-1/3 text-center align-top">
                  {place}, {formattedDateStr}<br />
                  Wali Kelas {classDisplay}
                  <div className="h-14" />
                  {homeroomTeacherName && homeroomTeacherName !== 'Wali Kelas' ? (
                    <u><strong>{homeroomTeacherName}</strong></u>
                  ) : (
                    '( ........................................ )'
                  )}
                </td>
                <td className="w-1/3 text-center align-top">
                  Mengetahui,<br />
                  Kepala Sekolah
                  <div className="h-14 flex items-center justify-center">
                    {schoolIdentity?.principalSignature ? (
                      <img
                        src={schoolIdentity.principalSignature}
                        alt="TTD Kepala Sekolah"
                        className="max-h-13 object-contain mx-auto"
                      />
                    ) : null}
                  </div>
                  <u><strong>{principalName}</strong></u>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Halaman 2 */}
        <div className="mt-[9.6mm] pt-1 border-t border-slate-600 flex items-center justify-between font-mono text-[10px] text-slate-700 shrink-0">
          <span>{classDisplay} | {(student.name || '').toUpperCase()} | {student.nis || '-'}</span>
          <span>Halaman | 2</span>
        </div>
      </div>
    </div>
  );
};
