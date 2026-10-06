import { Customer, Produk, Vendor, Invoice, PoVendor } from '../types';
import { formatRupiah } from './currency';

/**
 * Normalizes document numbers for robust comparison (trims, ignores case, strips extra spaces).
 */
export function normalizeDocNumber(docNo?: string): string {
  if (!docNo) return '';
  return docNo.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Checks if an Invoice/Quotation/WebOrder number is already taken by another document.
 */
export function checkDuplicateInvoiceNumber(
  candidateNo: string,
  existingInvoices: Invoice[] = [],
  excludeInvoiceId?: string
): { isDuplicate: boolean; conflictingInvoice?: Invoice } {
  const cleanTarget = normalizeDocNumber(candidateNo);
  if (!cleanTarget) return { isDuplicate: false };

  const conflict = existingInvoices.find((inv) => {
    if (excludeInvoiceId && inv.id === excludeInvoiceId) return false;
    return normalizeDocNumber(inv.noInv) === cleanTarget;
  });

  return {
    isDuplicate: !!conflict,
    conflictingInvoice: conflict
  };
}

/**
 * Generates a guaranteed UNIQUE Invoice or Quotation or WebOrder number by verifying against existing invoices in database.
 */
export function generateUniqueInvoiceNumber(
  tipeDoc: 'Invoice' | 'Quotation' | 'WebOrder' | string,
  existingInvoices: Invoice[] = [],
  startingCounter: number = 1,
  yearOverride?: number
): { number: string; nextCounter: number } {
  const year = yearOverride || new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  let currentNum = Math.max(startingCounter, 1);

  // Safety loop to ensure no collision
  let maxTries = 5000;
  while (maxTries > 0) {
    let candidate = '';
    if (tipeDoc === 'Invoice') {
      candidate = `INV/${year}/${String(currentNum).padStart(4, '0')}`;
    } else if (tipeDoc === 'Quotation') {
      candidate = `QUO/${year}/${String(currentNum).padStart(4, '0')}`;
    } else if (tipeDoc === 'WebOrder') {
      candidate = `WEB-${year}${month}-${String(currentNum).padStart(3, '0')}`;
    } else {
      candidate = `DOC/${year}/${String(currentNum).padStart(4, '0')}`;
    }

    const { isDuplicate } = checkDuplicateInvoiceNumber(candidate, existingInvoices);
    if (!isDuplicate) {
      return {
        number: candidate,
        nextCounter: currentNum + 1
      };
    }
    currentNum++;
    maxTries--;
  }

  // Fallback timestamp if search exceeds range
  return {
    number: `INV/${year}/${Date.now().toString().slice(-4)}`,
    nextCounter: currentNum + 1
  };
}

/**
 * Checks if a PO Vendor number is already taken by another PO.
 */
export function checkDuplicatePoNumber(
  candidateNo: string,
  existingPos: PoVendor[] = [],
  excludePoId?: string
): { isDuplicate: boolean; conflictingPo?: PoVendor } {
  const cleanTarget = normalizeDocNumber(candidateNo);
  if (!cleanTarget) return { isDuplicate: false };

  const conflict = existingPos.find((po) => {
    if (excludePoId && po.id === excludePoId) return false;
    return normalizeDocNumber(po.noPo) === cleanTarget;
  });

  return {
    isDuplicate: !!conflict,
    conflictingPo: conflict
  };
}

/**
 * Generates a guaranteed UNIQUE PO Vendor number by verifying against existing POs in database.
 */
export function generateUniquePoNumber(
  existingPos: PoVendor[] = [],
  startingCounter: number = 1,
  yearOverride?: number
): { number: string; nextCounter: number } {
  const year = yearOverride || new Date().getFullYear();
  let currentNum = Math.max(startingCounter, 1);

  let maxTries = 5000;
  while (maxTries > 0) {
    const candidate = `PO/${year}/${String(currentNum).padStart(4, '0')}`;
    const { isDuplicate } = checkDuplicatePoNumber(candidate, existingPos);
    if (!isDuplicate) {
      return {
        number: candidate,
        nextCounter: currentNum + 1
      };
    }
    currentNum++;
    maxTries--;
  }

  return {
    number: `PO/${year}/${Date.now().toString().slice(-4)}`,
    nextCounter: currentNum + 1
  };
}

/**
 * Gets or computes normalized Customer Code (e.g., CUST-0001)
 */
export function getCustomerCode(c: Partial<Customer>, fallbackIndex?: number): string {
  if (c.code) return c.code;
  if (c.id && c.id.startsWith('CUST-')) return c.id;
  if (fallbackIndex !== undefined) {
    return `CUST-${String(fallbackIndex).padStart(4, '0')}`;
  }
  return `CUST-0001`;
}

/**
 * Gets or computes normalized Product SKU/Code (e.g., PRD-0001)
 */
export function getProductCode(p: Partial<Produk>, fallbackIndex?: number, allProducts?: Produk[]): string {
  if (p.sku) return p.sku;
  if (p.code) return p.code;
  if (p.id && (p.id.startsWith('PRD-') || p.id.startsWith('SKU-'))) return p.id;
  if (fallbackIndex !== undefined && fallbackIndex > 0) {
    return `PRD-${String(fallbackIndex).padStart(4, '0')}`;
  }
  if (allProducts && p.id) {
    const idx = allProducts.findIndex((x) => x.id === p.id);
    if (idx >= 0) {
      return `PRD-${String(idx + 1).padStart(4, '0')}`;
    }
  }
  return `PRD-0001`;
}

/**
 * Gets or computes normalized Vendor Code (e.g., VND-0001)
 */
export function getVendorCode(v: Partial<Vendor>, fallbackIndex?: number): string {
  if (v.code) return v.code;
  if (v.id && v.id.startsWith('VND-')) return v.id;
  if (fallbackIndex !== undefined && fallbackIndex > 0) {
    return `VND-${String(fallbackIndex).padStart(4, '0')}`;
  }
  return `VND-0001`;
}

/**
 * Formats Customer option label for dropdowns:
 * "[CUST-0012] Budi - 081350242016"
 */
export function formatCustomerOptionLabel(c: Customer, index?: number): string {
  const code = getCustomerCode(c, index);
  const waStr = c.wa ? ` - ${c.wa}` : ' - (Tanpa WA)';
  return `[${code}] ${c.nama}${waStr}`;
}

/**
 * Formats Product option label for dropdowns:
 * "[PRD-0005] Spanduk Flexi 280gr - Standard (Rp 25.000 / m²)"
 */
export function formatProductOptionLabel(p: Produk, index?: number, allProducts?: Produk[]): string {
  const code = getProductCode(p, index, allProducts);
  const spec = p.desc ? ` - ${p.desc}` : '';
  const unit = p.satuan ? ` / ${p.satuan}` : '';
  const price = p.harga ? ` (${formatRupiah(p.harga)}${unit})` : '';
  return `[${code}] ${p.nama}${spec}${price}`;
}


