/**
 * Central Date Formatting Utility for CTRL PRINT
 * Formats dates consistently to DD/MM/YYYY across all UI views, documents, and messages.
 */

export function formatDate(val?: string | Date | null): string {
  if (!val) return '-';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const str = String(val).trim();
  if (!str) return '-';

  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  // Handles YYYY-MM-DD or ISO strings YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  // Fallback parsing with Date object
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch {
    // ignore
  }

  return str;
}

export function formatDateTime(val?: string | Date | null, timeStr?: string | null): string {
  const d = formatDate(val);
  if (d === '-') return '-';
  if (timeStr) {
    return `${d} ${timeStr}`;
  }
  return d;
}
