/**
 * Safely formats any value (number, string, or undefined) into Indonesian Rupiah format with dots.
 * Example: formatRupiah(30000) -> "Rp 30.000"
 * Example: formatRupiah("30000") -> "Rp 30.000"
 */
export function formatRupiah(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return 'Rp 0';
  const rawNum = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  const num = isNaN(rawNum) ? 0 : rawNum;
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export function formatNumber(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '0';
  const rawNum = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  const num = isNaN(rawNum) ? 0 : rawNum;
  return num.toLocaleString('id-ID');
}
