import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { OnlineExamQuestion, OnlineExamQuestionType } from '../types';

function makeQuestionId(num: number): string {
  return `q-imp-${Date.now()}-${num}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeQuestionType(rawType: string, rawKey: string, optionsList: string[]): OnlineExamQuestionType {
  const t = (rawType || '').trim().toUpperCase().replace(/[\s\-]/g, '_');
  if (t === 'PG' || t === 'PILIHAN_GANDA' || t === 'MULTIPLE_CHOICE') return 'pg';
  if (t === 'PG_KOMPLEKS' || t === 'PILIHAN_GANDA_KOMPLEKS' || t === 'PGK' || t === 'KOMPLEKS') return 'pg_kompleks';
  if (t === 'MENJODOHKAN' || t === 'JODOHKAN' || t === 'MATCHING') return 'menjodohkan';
  if (t === 'BENAR_SALAH' || t === 'BS' || t === 'TRUE_FALSE') return 'benar_salah';
  if (t === 'URAIAN' || t === 'ESSAY' || t === 'ESAI' || t === 'ISIAN') return 'uraian';

  // Auto-detect if type column is blank
  if (optionsList.some(o => o.includes('=>') || o.includes('<->') || o.includes(' = '))) {
    return 'menjodohkan';
  }
  const keyClean = (rawKey || '').trim().toUpperCase();
  if (/^[BS](\s*,\s*[BS])+$/i.test(keyClean) || /^(BENAR|SALAH)(\s*,\s*(BENAR|SALAH))+$/i.test(keyClean)) {
    return 'benar_salah';
  }
  if (optionsList.length === 0) {
    return 'uraian';
  }
  if (keyClean.includes(',') && keyClean.split(',').map(s => s.trim()).filter(Boolean).length > 1) {
    return 'pg_kompleks';
  }
  return 'pg';
}

export function downloadOnlineExamExcelTemplate(subjectName = 'Matematika', gradeLevel = '7'): void {
  const sampleRows = [
    {
      NO: 1,
      TIPE_SOAL: 'PG',
      BOBOT_SKOR: 1,
      PERTANYAAN: `Hasil dari operasi hitung (−12) + 8 × 4 − (−6) pada materi ${subjectName} adalah ...`,
      OPSI_A: '14',
      OPSI_B: '20',
      OPSI_C: '26',
      OPSI_D: '32',
      OPSI_E: '',
      KUNCI_JAWABAN: 'C'
    },
    {
      NO: 2,
      TIPE_SOAL: 'PG_KOMPLEKS',
      BOBOT_SKOR: 2,
      PERTANYAAN: 'Pilihlah LEBIH DARI SATU pernyataan yang benar mengenai sifat bangun datar persegi panjang berikut!',
      OPSI_A: 'Memiliki 2 pasang sisi sejajar dan sama panjang',
      OPSI_B: 'Keempat sudutnya merupakan sudut siku-siku (90°)',
      OPSI_C: 'Kedua diagonalnya saling berpotongan tegak lurus',
      OPSI_D: 'Memiliki 4 sumbu simetri lipat',
      OPSI_E: '',
      KUNCI_JAWABAN: '1,2'
    },
    {
      NO: 3,
      TIPE_SOAL: 'MENJODOHKAN',
      BOBOT_SKOR: 2,
      PERTANYAAN: 'Pasangkan besaran pada lajur kiri dengan satuan atau rumus yang tepat pada lajur kanan! (Gunakan tanda => untuk memisahkan Kiri dan Kanan)',
      OPSI_A: 'Luas Lingkaran => π × r²',
      OPSI_B: 'Keliling Lingkaran => 2 × π × r',
      OPSI_C: 'Volume Kubus => s³',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: 'OTOMATIS'
    },
    {
      NO: 4,
      TIPE_SOAL: 'BENAR_SALAH',
      BOBOT_SKOR: 2,
      PERTANYAAN: 'Tentukan apakah setiap pernyataan berikut BENAR (B) atau SALAH (S)!',
      OPSI_A: 'Bilangan prima terkecil adalah 2',
      OPSI_B: 'Semua bilangan ganjil merupakan bilangan prima',
      OPSI_C: 'Hasil penjumlahan dua bilangan genap selalu genap',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: 'B,S,B'
    },
    {
      NO: 5,
      TIPE_SOAL: 'URAIAN',
      BOBOT_SKOR: 4,
      PERTANYAAN: 'Sebuah taman berbentuk persegi panjang memiliki panjang 15 meter dan lebar 8 meter. Hitunglah luas dan keliling taman tersebut secara lengkap!',
      OPSI_A: '',
      OPSI_B: '',
      OPSI_C: '',
      OPSI_D: '',
      OPSI_E: '',
      KUNCI_JAWABAN: '120, 46, luas 120, keliling 46'
    }
  ];

  const guideRows = [
    {
      TIPE_SOAL: 'PG (Pilihan Ganda)',
      CARA_ISI_OPSI: 'Isi OPSI_A sampai OPSI_D dengan teks pilihan jawaban.',
      CARA_ISI_KUNCI_JAWABAN: 'Isi dengan 1 huruf kunci jawaban yang benar: A, B, C, atau D.',
      CONTOH_KUNCI: 'C'
    },
    {
      TIPE_SOAL: 'PG_KOMPLEKS (Pilihan Ganda Kompleks)',
      CARA_ISI_OPSI: 'Isi OPSI_A sampai OPSI_D (atau OPSI_E) dengan pernyataan-pernyataan pilihan.',
      CARA_ISI_KUNCI_JAWABAN: 'Isi dengan nomor atau huruf pernyataan yang benar, dipisahkan tanda koma (,).',
      CONTOH_KUNCI: '1,2 atau A,B'
    },
    {
      TIPE_SOAL: 'MENJODOHKAN',
      CARA_ISI_OPSI: 'Isi OPSI_A, OPSI_B, dst. dengan format: Pernyataan Kiri => Jawaban Kanan.',
      CARA_ISI_KUNCI_JAWABAN: 'Isi OTOMATIS (karena pasangan Kiri => Kanan pada tiap kolom OPSI sudah menjadi kunci pasangan).',
      CONTOH_KUNCI: 'OTOMATIS'
    },
    {
      TIPE_SOAL: 'BENAR_SALAH',
      CARA_ISI_OPSI: 'Isi OPSI_A, OPSI_B, OPSI_C, dst. dengan kalimat pernyataan yang dianalisis.',
      CARA_ISI_KUNCI_JAWABAN: 'Isi B (Benar) atau S (Salah) berurutan sesuai jumlah pernyataan, dipisahkan koma.',
      CONTOH_KUNCI: 'B,S,B'
    },
    {
      TIPE_SOAL: 'URAIAN (Essay)',
      CARA_ISI_OPSI: 'Kosongkan kolom OPSI_A sampai OPSI_E.',
      CARA_ISI_KUNCI_JAWABAN: 'Isi dengan kata kunci jawaban uraian (dipisahkan tanda koma) untuk penskoran otomatis.',
      CONTOH_KUNCI: 'fotosintesis, klorofil, glukosa, oksigen'
    }
  ];

  const wb = XLSX.utils.book_new();
  const wsQuestions = XLSX.utils.json_to_sheet(sampleRows);
  wsQuestions['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 13 },
    { wch: 58 },
    { wch: 32 },
    { wch: 32 },
    { wch: 32 },
    { wch: 32 },
    { wch: 24 },
    { wch: 25 }
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [
    { wch: 34 },
    { wch: 55 },
    { wch: 60 },
    { wch: 28 }
  ];

  XLSX.utils.book_append_sheet(wb, wsQuestions, 'TEMPLATE_SOAL_CBT');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'PANDUAN_PENGISIAN');

  const safeSub = subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Template_Import_Soal_CBT_${safeSub}_Kelas_${gradeLevel}.xlsx`);
}

export function getSampleStructuredTextTemplate(subjectName = 'Matematika', gradeLevel = '7'): string {
  return `====================================================================
TEMPLATE IMPORT CEPAT SOAL UJIAN ONLINE (CBT) — ${subjectName.toUpperCase()} KELAS ${gradeLevel}
Bisa langsung diketik di MS Word / Notepad atau Copy-Paste ke Panel Import
Mendukung 5 Tipe Soal: [PG], [PG_KOMPLEKS], [MENJODOHKAN], [BENAR_SALAH], [URAIAN]
====================================================================

1. [PG] Hasil dari (−12) + 8 × 4 − (−6) adalah ...
A. 14
B. 20
C. 26
D. 32
KUNCI: C
BOBOT: 1

2. [PG_KOMPLEKS] Pilihlah lebih dari satu pernyataan yang benar mengenai sifat bangun persegi panjang!
A. Memiliki 2 pasang sisi sejajar dan sama panjang
B. Keempat sudutnya siku-siku (90°)
C. Kedua diagonalnya berpotongan tegak lurus
D. Memiliki 4 simetri lipat
KUNCI: A, B
BOBOT: 2

3. [MENJODOHKAN] Pasangkan besaran berikut dengan rumus yang sesuai!
- Luas Lingkaran => π × r²
- Keliling Lingkaran => 2 × π × r
- Volume Kubus => s³
BOBOT: 2

4. [BENAR_SALAH] Tentukan apakah setiap pernyataan berikut Benar (B) atau Salah (S)!
- Bilangan prima terkecil adalah 2
- Semua bilangan ganjil adalah bilangan prima
- Jumlah dua bilangan genap selalu genap
KUNCI: B, S, B
BOBOT: 2

5. [URAIAN] Sebuah taman berbentuk persegi panjang memiliki panjang 15 m dan lebar 8 m. Hitunglah luas dan keliling taman tersebut!
KUNCI: 120, 46, luas 120, keliling 46
BOBOT: 4
`;
}

export function downloadOnlineExamWordTextTemplate(subjectName = 'Matematika', gradeLevel = '7'): void {
  const content = getSampleStructuredTextTemplate(subjectName, gradeLevel);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeSub = subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `Template_Teks_Cepat_Soal_CBT_${safeSub}_Kelas_${gradeLevel}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeDocxParagraph(
  text: string,
  opts?: { bold?: boolean; color?: string; sizeHalfPt?: number; spacingAfter?: number }
): string {
  const size = opts?.sizeHalfPt || 22; // 11pt default
  const spacingAfter = opts?.spacingAfter !== undefined ? opts.spacingAfter : 100;
  const boldTag = opts?.bold ? '<w:b/>' : '';
  const colorTag = opts?.color ? `<w:color w:val="${opts.color}"/>` : '';
  return `<w:p>
    <w:pPr><w:spacing w:after="${spacingAfter}" w:line="260" w:lineRule="auto"/></w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        ${boldTag}
        ${colorTag}
        <w:sz w:val="${size}"/>
        <w:szCs w:val="${size}"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;
}

function makeDocxTableCell(
  text: string,
  opts?: { bold?: boolean; fillHex?: string; widthDxa?: number; colorHex?: string }
): string {
  const widthTag = opts?.widthDxa
    ? `<w:tcW w:w="${opts.widthDxa}" w:type="dxa"/>`
    : '<w:tcW w:w="1500" w:type="dxa"/>';
  const shdTag = opts?.fillHex
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fillHex}"/>`
    : '';
  const boldTag = opts?.bold ? '<w:b/>' : '';
  const colorTag = opts?.colorHex ? `<w:color w:val="${opts.colorHex}"/>` : '';
  return `<w:tc>
    <w:tcPr>
      ${widthTag}
      ${shdTag}
      <w:tcMar>
        <w:top w:w="80" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:left w:w="100" w:type="dxa"/>
        <w:right w:w="100" w:type="dxa"/>
      </w:tcMar>
    </w:tcPr>
    <w:p>
      <w:pPr><w:spacing w:after="40"/></w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          ${boldTag}
          ${colorTag}
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(text)}</w:t>
      </w:r>
    </w:p>
  </w:tc>`;
}

export async function downloadOnlineExamDocxTemplate(
  subjectName = 'Matematika',
  gradeLevel = '7'
): Promise<void> {
  const zip = new JSZip();

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const headers = [
    { label: 'NO', width: 600 },
    { label: 'TIPE_SOAL', width: 1500 },
    { label: 'BOBOT_SKOR', width: 1100 },
    { label: 'PERTANYAAN', width: 3800 },
    { label: 'OPSI_A', width: 1800 },
    { label: 'OPSI_B', width: 1800 },
    { label: 'OPSI_C', width: 1800 },
    { label: 'OPSI_D', width: 1800 },
    { label: 'OPSI_E', width: 1200 },
    { label: 'KUNCI_JAWABAN', width: 1500 }
  ];

  const sampleTableRows = [
    [
      '1',
      'PG',
      '1',
      `Hasil dari operasi hitung (−12) + 8 × 4 − (−6) pada materi ${subjectName} adalah ...`,
      '14',
      '20',
      '26',
      '32',
      '',
      'C'
    ],
    [
      '2',
      'PG_KOMPLEKS',
      '2',
      'Pilihlah LEBIH DARI SATU pernyataan yang benar mengenai sifat bangun datar persegi panjang berikut!',
      'Memiliki 2 pasang sisi sejajar dan sama panjang',
      'Keempat sudutnya merupakan sudut siku-siku (90°)',
      'Kedua diagonalnya saling berpotongan tegak lurus',
      'Memiliki 4 sumbu simetri lipat',
      '',
      '1,2'
    ],
    [
      '3',
      'MENJODOHKAN',
      '2',
      'Pasangkan besaran pada lajur kiri dengan rumus yang tepat pada lajur kanan! (Gunakan tanda => untuk memisahkan Kiri dan Kanan)',
      'Luas Lingkaran => π × r²',
      'Keliling Lingkaran => 2 × π × r',
      'Volume Kubus => s³',
      '',
      '',
      'OTOMATIS'
    ],
    [
      '4',
      'BENAR_SALAH',
      '2',
      'Tentukan apakah setiap pernyataan berikut BENAR (B) atau SALAH (S)!',
      'Bilangan prima terkecil adalah 2',
      'Semua bilangan ganjil merupakan bilangan prima',
      'Hasil penjumlahan dua bilangan genap selalu genap',
      '',
      '',
      'B,S,B'
    ],
    [
      '5',
      'URAIAN',
      '4',
      'Sebuah taman berbentuk persegi panjang memiliki panjang 15 meter dan lebar 8 meter. Hitunglah luas dan keliling taman tersebut!',
      '',
      '',
      '',
      '',
      '',
      '120, 46, luas 120, keliling 46'
    ]
  ];

  const headerRowXml = `<w:tr>
    ${headers
      .map(h =>
        makeDocxTableCell(h.label, {
          bold: true,
          fillHex: '185ABD',
          colorHex: 'FFFFFF',
          widthDxa: h.width
        })
      )
      .join('\n')}
  </w:tr>`;

  const bodyRowsXml = sampleTableRows
    .map(
      (cols, rIdx) => `<w:tr>
      ${cols
        .map((colText, cIdx) =>
          makeDocxTableCell(colText, {
            bold: cIdx === 0 || cIdx === 1 || cIdx === 9,
            fillHex: rIdx % 2 === 1 ? 'F8FAFC' : 'FFFFFF',
            widthDxa: headers[cIdx]?.width || 1500
          })
        )
        .join('\n')}
    </w:tr>`
    )
    .join('\n');

  const tableXml = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="16900" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>
    </w:tblPr>
    ${headerRowXml}
    ${bodyRowsXml}
  </w:tbl>`;

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${makeDocxParagraph(
      `TEMPLATE RESMI SOAL UJIAN ONLINE (CBT) — FORMAT MICROSOFT WORD (.DOCX)`,
      { bold: true, color: '185ABD', sizeHalfPt: 28, spacingAfter: 60 }
    )}
    ${makeDocxParagraph(
      `Mata Pelajaran: ${subjectName} | Kelas: ${gradeLevel} | Mendukung 5 Tipe Soal CBT (PG, PG Kompleks, Menjodohkan, Benar/Salah, Uraian)`,
      { bold: true, color: '334155', sizeHalfPt: 22, spacingAfter: 140 }
    )}
    ${makeDocxParagraph(
      `PETUNJUK PENGGUNAAN TEMPLATE WORD INI:`,
      { bold: true, color: '0F172A', sizeHalfPt: 21, spacingAfter: 40 }
    )}
    ${makeDocxParagraph(
      `1. Anda dapat langsung mengisi/menambah baris soal pada TABEL SOAL CBT di bawah ini di Microsoft Word, lalu Simpan (Ctrl+S) dan Upload file .docx ini ke aplikasi.`,
      { sizeHalfPt: 20, spacingAfter: 40 }
    )}
    ${makeDocxParagraph(
      `2. Kolom TIPE_SOAL diisi salah satu: PG, PG_KOMPLEKS, MENJODOHKAN, BENAR_SALAH, atau URAIAN.`,
      { sizeHalfPt: 20, spacingAfter: 40 }
    )}
    ${makeDocxParagraph(
      `3. Untuk soal MENJODOHKAN: tulis pasangan pada kolom OPSI_A, OPSI_B, dst. menggunakan tanda panah => (Contoh: Luas Lingkaran => π × r²).`,
      { sizeHalfPt: 20, spacingAfter: 40 }
    )}
    ${makeDocxParagraph(
      `4. Untuk soal BENAR_SALAH: isi pernyataan di OPSI_A, OPSI_B, dst., lalu isi KUNCI_JAWABAN dengan B atau S dipisahkan koma (Contoh: B,S,B).`,
      { sizeHalfPt: 20, spacingAfter: 140 }
    )}
    ${tableXml}
    ${makeDocxParagraph('', { spacingAfter: 160 })}
    ${makeDocxParagraph(
      `ALTERNATIF PENGETIKAN TANPA TABEL (FORMAT NOMOR SOAL DI WORD / COPY-PASTE):`,
      { bold: true, color: '185ABD', sizeHalfPt: 22, spacingAfter: 60 }
    )}
    ${makeDocxParagraph(
      `Selain menggunakan tabel di atas, Anda juga dapat mengetik soal secara berurutan dengan nomor (1., 2., 3., dst.) di dokumen Word seperti contoh berikut:`,
      { sizeHalfPt: 20, spacingAfter: 80 }
    )}
    ${makeDocxParagraph(`1. [PG] Hasil dari (−12) + 8 × 4 − (−6) adalah ...`, { bold: true, sizeHalfPt: 20, spacingAfter: 20 })}
    ${makeDocxParagraph(`A. 14`, { sizeHalfPt: 20, spacingAfter: 20 })}
    ${makeDocxParagraph(`B. 20`, { sizeHalfPt: 20, spacingAfter: 20 })}
    ${makeDocxParagraph(`C. 26`, { sizeHalfPt: 20, spacingAfter: 20 })}
    ${makeDocxParagraph(`D. 32`, { sizeHalfPt: 20, spacingAfter: 20 })}
    ${makeDocxParagraph(`KUNCI: C`, { bold: true, color: '047857', sizeHalfPt: 20, spacingAfter: 20 })}
    ${makeDocxParagraph(`BOBOT: 1`, { sizeHalfPt: 20, spacingAfter: 100 })}
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="450" w:footer="450" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.folder('_rels')?.file('.rels', rootRelsXml);
  const wordFolder = zip.folder('word');
  wordFolder?.file('document.xml', docXml);
  wordFolder?.folder('_rels')?.file('document.xml.rels', wordRelsXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeSub = subjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `Template_Soal_Word_CBT_${safeSub}_Kelas_${gradeLevel}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getRowField(row: Record<string, any>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const foundKey = keys.find(
      k => k.trim().toUpperCase().replace(/[\s\-]/g, '_') === alias.toUpperCase()
    );
    if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== null) {
      return String(row[foundKey]).trim();
    }
  }
  return '';
}

export function parseRowObjectsToQuestions(rows: Record<string, any>[]): OnlineExamQuestion[] {
  const questions: OnlineExamQuestion[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const stemRaw = getRowField(r, [
      'PERTANYAAN',
      'SOAL',
      'NASKAH_SOAL',
      'BUTIR_SOAL',
      'QUESTION',
      'STEM'
    ]);
    if (!stemRaw) continue;

    const rawType = getRowField(r, ['TIPE_SOAL', 'TIPE', 'JENIS_SOAL', 'JENIS', 'TYPE']);
    const rawWeight = getRowField(r, ['BOBOT_SKOR', 'BOBOT', 'SKOR', 'WEIGHT', 'POIN']);
    const rawKey = getRowField(r, ['KUNCI_JAWABAN', 'KUNCI', 'JAWABAN', 'ANSWER_KEY', 'KEY']);

    const optA = getRowField(r, ['OPSI_A', 'PILIHAN_A', 'A', 'PERNYATAAN_1', 'OPSI_1']);
    const optB = getRowField(r, ['OPSI_B', 'PILIHAN_B', 'B', 'PERNYATAAN_2', 'OPSI_2']);
    const optC = getRowField(r, ['OPSI_C', 'PILIHAN_C', 'C', 'PERNYATAAN_3', 'OPSI_3']);
    const optD = getRowField(r, ['OPSI_D', 'PILIHAN_D', 'D', 'PERNYATAAN_4', 'OPSI_4']);
    const optE = getRowField(r, ['OPSI_E', 'PILIHAN_E', 'E', 'PERNYATAAN_5', 'OPSI_5']);

    const rawOptions = [optA, optB, optC, optD, optE].filter(Boolean);
    const qType = normalizeQuestionType(rawType, rawKey, rawOptions);
    const num = questions.length + 1;
    const id = makeQuestionId(num);
    const questionHtml = stemRaw.startsWith('<') ? stemRaw : `<p>${stemRaw.replace(/\n/g, '<br/>')}</p>`;

    const defaultWeight =
      qType === 'uraian' ? 4 : qType === 'pg' ? 1 : 2;
    const scoreWeight = Math.max(1, Number(rawWeight) || defaultWeight);

    if (qType === 'pg') {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const finalOpts = (rawOptions.length > 0 ? rawOptions : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']).map(
        (txt, idx) => ({
          id: letters[idx] || `O${idx + 1}`,
          label: letters[idx] || `${idx + 1}`,
          textHtml: txt
        })
      );
      const keyUpper = rawKey.toUpperCase().trim();
      const matchedOpt =
        finalOpts.find(o => o.id === keyUpper || o.label === keyUpper) ||
        finalOpts[Number(keyUpper) - 1] ||
        finalOpts[0];

      questions.push({
        id,
        number: num,
        type: 'pg',
        questionHtml,
        scoreWeight,
        options: finalOpts,
        correctOptionId: matchedOpt?.id || 'A'
      });
    } else if (qType === 'pg_kompleks') {
      const finalOpts = (rawOptions.length > 0 ? rawOptions : ['Pernyataan 1', 'Pernyataan 2', 'Pernyataan 3', 'Pernyataan 4']).map(
        (txt, idx) => ({
          id: `P${idx + 1}`,
          label: `${idx + 1}`,
          textHtml: txt
        })
      );
      const tokens = rawKey
        .split(/[,;/\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const letterMap: Record<string, string> = { A: 'P1', B: 'P2', C: 'P3', D: 'P4', E: 'P5' };
      const correctOptionIds: string[] = [];
      for (const tk of tokens) {
        if (letterMap[tk]) correctOptionIds.push(letterMap[tk]);
        else if (tk.startsWith('P')) correctOptionIds.push(tk);
        else if (!Number.isNaN(Number(tk))) correctOptionIds.push(`P${Number(tk)}`);
      }
      questions.push({
        id,
        number: num,
        type: 'pg_kompleks',
        questionHtml,
        scoreWeight,
        options: finalOpts,
        correctOptionIds: correctOptionIds.length > 0 ? Array.from(new Set(correctOptionIds)) : ['P1', 'P2']
      });
    } else if (qType === 'menjodohkan') {
      const matchingPairs = (rawOptions.length > 0
        ? rawOptions
        : ['Pernyataan 1 => Pasangan 1', 'Pernyataan 2 => Pasangan 2']
      ).map((line, idx) => {
        const parts = line.split(/=>|<->|->|:/);
        const leftPremise = (parts[0] || `Pernyataan ${idx + 1}`).trim();
        const rightResponse = (parts.slice(1).join(':').trim() || `Pasangan ${idx + 1}`).trim();
        return {
          id: `M${idx + 1}`,
          leftPremise,
          rightResponse
        };
      });
      questions.push({
        id,
        number: num,
        type: 'menjodohkan',
        questionHtml,
        scoreWeight,
        matchingPairs
      });
    } else if (qType === 'benar_salah') {
      const keyTokens = rawKey
        .split(/[,;/\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const trueFalseItems = (rawOptions.length > 0
        ? rawOptions
        : ['Pernyataan 1', 'Pernyataan 2']
      ).map((stmt, idx) => {
        let isTrue = true;
        let cleanStmt = stmt;
        const inlineMatch = stmt.match(/[\(\[](B|S|BENAR|SALAH|TRUE|FALSE)[\)\]]\s*$/i);
        if (inlineMatch) {
          const tok = inlineMatch[1].toUpperCase();
          isTrue = tok === 'B' || tok === 'BENAR' || tok === 'TRUE';
          cleanStmt = stmt.replace(/[\(\[](B|S|BENAR|SALAH|TRUE|FALSE)[\)\]]\s*$/i, '').trim();
        } else if (keyTokens[idx]) {
          const tok = keyTokens[idx];
          isTrue = tok === 'B' || tok === 'BENAR' || tok === 'TRUE' || tok === 'T' || tok === '1';
        }
        return {
          id: `BS${idx + 1}`,
          statement: cleanStmt,
          isTrue
        };
      });
      questions.push({
        id,
        number: num,
        type: 'benar_salah',
        questionHtml,
        scoreWeight,
        trueFalseItems
      });
    } else {
      questions.push({
        id,
        number: num,
        type: 'uraian',
        questionHtml,
        scoreWeight,
        answerKeyText: rawKey
      });
    }
  }

  return questions;
}

export function parseOnlineExamExcelBuffer(buffer: ArrayBuffer): OnlineExamQuestion[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  return parseRowObjectsToQuestions(rows);
}

export async function parseOnlineExamDocxBuffer(buffer: ArrayBuffer): Promise<{
  questions: OnlineExamQuestion[];
  extractedText: string;
}> {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('File .docx tidak valid (word/document.xml tidak ditemukan).');
  }
  const xmlText = await docXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  // 1. Check if the Word document contains a Table of questions (<w:tbl>)
  const tables = Array.from(xmlDoc.getElementsByTagName('w:tbl'));
  const tableQuestions: OnlineExamQuestion[] = [];

  for (const tbl of tables) {
    const trList = Array.from(tbl.getElementsByTagName('w:tr'));
    if (trList.length < 2) continue;

    const extractRowCells = (tr: Element): string[] => {
      const cells = Array.from(tr.getElementsByTagName('w:tc'));
      return cells.map(tc => {
        const pList = Array.from(tc.getElementsByTagName('w:p'));
        return pList
          .map(p =>
            Array.from(p.getElementsByTagName('w:t'))
              .map(t => t.textContent || '')
              .join('')
              .trim()
          )
          .filter(Boolean)
          .join('\n')
          .trim();
      });
    };

    const headerCells = extractRowCells(trList[0]).map(h =>
      h.toUpperCase().replace(/[\s\-]/g, '_')
    );
    const hasQuestionHeader = headerCells.some(h =>
      ['PERTANYAAN', 'SOAL', 'NASKAH_SOAL', 'BUTIR_SOAL', 'TIPE_SOAL'].includes(h)
    );
    if (!hasQuestionHeader) continue;

    const rowObjects: Record<string, any>[] = [];
    for (let rIdx = 1; rIdx < trList.length; rIdx++) {
      const vals = extractRowCells(trList[rIdx]);
      const obj: Record<string, any> = {};
      headerCells.forEach((hKey, cIdx) => {
        if (hKey) {
          obj[hKey] = vals[cIdx] || '';
        }
      });
      rowObjects.push(obj);
    }

    const parsedFromTbl = parseRowObjectsToQuestions(rowObjects);
    if (parsedFromTbl.length > 0) {
      tableQuestions.push(...parsedFromTbl);
    }
  }

  // 2. Also extract non-table paragraphs for text preview or numbered questions
  const bodyEl = xmlDoc.getElementsByTagName('w:body')[0];
  const bodyParagraphLines: string[] = [];
  if (bodyEl) {
    const childNodes = Array.from(bodyEl.children);
    for (const child of childNodes) {
      if (child.tagName === 'w:p') {
        const line = Array.from(child.getElementsByTagName('w:t'))
          .map(t => t.textContent || '')
          .join('')
          .trim();
        if (
          line &&
          !line.startsWith('TEMPLATE RESMI SOAL UJIAN ONLINE') &&
          !line.startsWith('Mata Pelajaran:') &&
          !line.startsWith('PETUNJUK PENGGUNAAN TEMPLATE') &&
          !line.startsWith('1. Anda dapat langsung mengisi') &&
          !line.startsWith('2. Kolom TIPE_SOAL') &&
          !line.startsWith('3. Untuk soal MENJODOHKAN') &&
          !line.startsWith('4. Untuk soal BENAR_SALAH') &&
          !line.startsWith('ALTERNATIF PENGETIKAN TANPA TABEL') &&
          !line.startsWith('Selain menggunakan tabel di atas')
        ) {
          bodyParagraphLines.push(line);
        }
      }
    }
  }

  const extractedText = bodyParagraphLines.join('\n');

  if (tableQuestions.length > 0) {
    const renumbered = tableQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
    return {
      questions: renumbered,
      extractedText:
        extractedText ||
        `Berhasil mengekstrak ${renumbered.length} butir soal dari Tabel Microsoft Word (.docx).`
    };
  }

  const textQuestions = parseOnlineExamStructuredText(extractedText);
  return {
    questions: textQuestions,
    extractedText
  };
}

export async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  const res = await parseOnlineExamDocxBuffer(buffer);
  return res.extractedText;
}

export function parseOnlineExamStructuredText(rawText: string): OnlineExamQuestion[] {
  const lines = (rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('===') && !l.startsWith('TEMPLATE IMPORT') && !l.startsWith('Bisa langsung diketik') && !l.startsWith('Mendukung 5 Tipe Soal'));

  interface RawBlock {
    explicitType: string;
    stemLines: string[];
    options: { label: string; text: string; starred: boolean }[];
    bulletLines: string[];
    keyStr: string;
    weightStr: string;
  }

  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;

  const startNewBlock = (firstStemLine: string) => {
    if (current) blocks.push(current);
    let explicitType = '';
    let cleaned = firstStemLine;
    const typeMatch = cleaned.match(/^\[(PG_KOMPLEKS|PG|PILIHAN_GANDA|MENJODOHKAN|BENAR_SALAH|BS|URAIAN|ESSAY)\]\s*(.*)$/i);
    if (typeMatch) {
      explicitType = typeMatch[1].toUpperCase();
      cleaned = typeMatch[2].trim();
    }
    current = {
      explicitType,
      stemLines: cleaned ? [cleaned] : [],
      options: [],
      bulletLines: [],
      keyStr: '',
      weightStr: ''
    };
  };

  for (const line of lines) {
    // Check if line starts a new numbered question: e.g. "1. ...", "2) ...", "Soal 3: ..."
    const qStartMatch = line.match(/^(?:SOAL\s+|NO\.?\s*)?(\d+)[\.\)\:]\s+(.*)$/i);
    if (qStartMatch) {
      startNewBlock(qStartMatch[2].trim());
      continue;
    }

    if (!current) {
      // Allow unnumbered first block if it starts with [PG] etc.
      if (/^\[(PG_KOMPLEKS|PG|MENJODOHKAN|BENAR_SALAH|URAIAN)\]/i.test(line)) {
        startNewBlock(line);
      }
      continue;
    }

    // Check KUNCI / JAWABAN
    const keyMatch = line.match(/^(?:KUNCI(?:\s+JAWABAN)?|JAWABAN|ANSWER|KEY)\s*[\:\=]\s*(.*)$/i);
    if (keyMatch) {
      current.keyStr = keyMatch[1].trim();
      continue;
    }

    // Check BOBOT / SKOR
    const weightMatch = line.match(/^(?:BOBOT(?:\s+SKOR)?|SKOR|POIN|WEIGHT)\s*[\:\=]\s*(\d+)$/i);
    if (weightMatch) {
      current.weightStr = weightMatch[1].trim();
      continue;
    }

    // Check Option A-E: e.g. "A. ...", "*B. ...", "a) ..."
    const optMatch = line.match(/^(\*)?([A-Ea-e])[\.\)]\s+(.*)$/);
    if (optMatch) {
      current.options.push({
        starred: Boolean(optMatch[1]),
        label: optMatch[2].toUpperCase(),
        text: optMatch[3].trim()
      });
      continue;
    }

    // Check bullet line for Menjodohkan / Benar-Salah: "- ... " or "• ..."
    const bulletMatch = line.match(/^[\-\•\*]\s+(.*)$/);
    if (bulletMatch) {
      current.bulletLines.push(bulletMatch[1].trim());
      continue;
    }

    // Check if line itself is a matching pair "Premis => Jawaban"
    if (line.includes('=>') || line.includes('<->')) {
      current.bulletLines.push(line);
      continue;
    }

    // Otherwise append to stem
    current.stemLines.push(line);
  }

  if (current) blocks.push(current);

  const result: OnlineExamQuestion[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const stemText = b.stemLines.join('<br/>').trim();
    if (!stemText && b.options.length === 0 && b.bulletLines.length === 0) continue;

    const rawOptionsText =
      b.options.length > 0 ? b.options.map(o => o.text) : b.bulletLines;

    const starredOpts = b.options.filter(o => o.starred).map(o => o.label);
    const effectiveKey = b.keyStr || starredOpts.join(',');

    const qType = normalizeQuestionType(b.explicitType, effectiveKey, rawOptionsText);
    const num = result.length + 1;
    const id = makeQuestionId(num);
    const questionHtml = `<p>${stemText || `Pertanyaan Soal No. ${num}`}</p>`;
    const defaultWeight = qType === 'uraian' ? 4 : qType === 'pg' ? 1 : 2;
    const scoreWeight = Math.max(1, Number(b.weightStr) || defaultWeight);

    if (qType === 'pg') {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const opts = (b.options.length > 0
        ? b.options
        : [
            { label: 'A', text: 'Pilihan A', starred: false },
            { label: 'B', text: 'Pilihan B', starred: false },
            { label: 'C', text: 'Pilihan C', starred: false },
            { label: 'D', text: 'Pilihan D', starred: false }
          ]
      ).map((o, idx) => ({
        id: o.label || letters[idx] || `O${idx + 1}`,
        label: o.label || letters[idx] || `${idx + 1}`,
        textHtml: o.text
      }));
      const keyClean = effectiveKey.trim().toUpperCase();
      const matched = opts.find(o => o.id === keyClean || o.label === keyClean) || opts[0];
      result.push({
        id,
        number: num,
        type: 'pg',
        questionHtml,
        scoreWeight,
        options: opts,
        correctOptionId: matched?.id || 'A'
      });
    } else if (qType === 'pg_kompleks') {
      const opts = (rawOptionsText.length > 0
        ? rawOptionsText
        : ['Pernyataan 1', 'Pernyataan 2', 'Pernyataan 3', 'Pernyataan 4']
      ).map((txt, idx) => ({
        id: `P${idx + 1}`,
        label: `${idx + 1}`,
        textHtml: txt
      }));
      const tokens = effectiveKey
        .split(/[,;/\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const letterMap: Record<string, string> = { A: 'P1', B: 'P2', C: 'P3', D: 'P4', E: 'P5' };
      const correctOptionIds: string[] = [];
      for (const tk of tokens) {
        if (letterMap[tk]) correctOptionIds.push(letterMap[tk]);
        else if (tk.startsWith('P')) correctOptionIds.push(tk);
        else if (!Number.isNaN(Number(tk))) correctOptionIds.push(`P${Number(tk)}`);
      }
      result.push({
        id,
        number: num,
        type: 'pg_kompleks',
        questionHtml,
        scoreWeight,
        options: opts,
        correctOptionIds: correctOptionIds.length > 0 ? Array.from(new Set(correctOptionIds)) : ['P1', 'P2']
      });
    } else if (qType === 'menjodohkan') {
      const matchingPairs = (rawOptionsText.length > 0
        ? rawOptionsText
        : ['Pernyataan 1 => Pasangan 1', 'Pernyataan 2 => Pasangan 2']
      ).map((line, idx) => {
        const parts = line.split(/=>|<->|->|:/);
        return {
          id: `M${idx + 1}`,
          leftPremise: (parts[0] || `Pernyataan ${idx + 1}`).trim(),
          rightResponse: (parts.slice(1).join(':').trim() || `Pasangan ${idx + 1}`).trim()
        };
      });
      result.push({
        id,
        number: num,
        type: 'menjodohkan',
        questionHtml,
        scoreWeight,
        matchingPairs
      });
    } else if (qType === 'benar_salah') {
      const keyTokens = effectiveKey
        .split(/[,;/\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const trueFalseItems = (rawOptionsText.length > 0
        ? rawOptionsText
        : ['Pernyataan 1', 'Pernyataan 2']
      ).map((stmt, idx) => {
        let isTrue = true;
        let cleanStmt = stmt;
        const inlineMatch = stmt.match(/[\(\[](B|S|BENAR|SALAH|TRUE|FALSE)[\)\]]\s*$/i);
        if (inlineMatch) {
          const tok = inlineMatch[1].toUpperCase();
          isTrue = tok === 'B' || tok === 'BENAR' || tok === 'TRUE';
          cleanStmt = stmt.replace(/[\(\[](B|S|BENAR|SALAH|TRUE|FALSE)[\)\]]\s*$/i, '').trim();
        } else if (keyTokens[idx]) {
          const tok = keyTokens[idx];
          isTrue = tok === 'B' || tok === 'BENAR' || tok === 'TRUE' || tok === '1';
        }
        return {
          id: `BS${idx + 1}`,
          statement: cleanStmt,
          isTrue
        };
      });
      result.push({
        id,
        number: num,
        type: 'benar_salah',
        questionHtml,
        scoreWeight,
        trueFalseItems
      });
    } else {
      result.push({
        id,
        number: num,
        type: 'uraian',
        questionHtml,
        scoreWeight,
        answerKeyText: effectiveKey
      });
    }
  }

  return result;
}
