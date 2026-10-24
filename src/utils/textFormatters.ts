/**
 * Utility functions for automated text casing in Guest Book (Buku Tamu)
 */

/**
 * Proper Case: Huruf pertama setiap kata menjadi huruf besar (Title/Proper Case)
 * Contoh: "drs. h. ahmad fauzi, s.pd" -> "Drs. H. Ahmad Fauzi, S.Pd"
 */
export function toProperCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/(?:^|[\s\-\/\(\)\.,])([a-z])/g, (match) => match.toUpperCase());
}

/**
 * Live Proper formatting during typing (capitalizes first letter of words without destroying unfinished words)
 */
export function formatProperWhileTyping(str: string): string {
  if (!str) return '';
  return str.replace(/(?:^|[\s\-\/\(\)\.,])([a-z])/g, (match) => match.toUpperCase());
}

/**
 * Upper Case: Otomatis semua huruf menjadi besar (UPPERCASE)
 * Contoh: "dinas pendidikan kab. pasuruan" -> "DINAS PENDIDIKAN KAB. PASURUAN"
 */
export function toUpperCase(str: string): string {
  if (!str) return '';
  return str.toUpperCase();
}

/**
 * Sentence Case: Huruf pertama saja yang huruf besar
 * Contoh: "kunjungan silaturahmi dan koordinasi" -> "Kunjungan silaturahmi dan koordinasi"
 */
export function toSentenceCase(str: string): string {
  if (!str) return '';
  const trimmed = str.trimStart();
  const leadingWhitespace = str.slice(0, str.length - trimmed.length);
  if (!trimmed) return str;
  return leadingWhitespace + trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
