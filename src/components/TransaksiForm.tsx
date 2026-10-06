import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  Calculator,
  User,
  ShoppingBag,
  CreditCard,
  Plus,
  Trash2,
  Save,
  X,
  Calendar,
  Clock,
  ScanText,
  Lightbulb,
  Loader2,
  Ticket,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Layers
} from 'lucide-react';
import {
  Invoice,
  InvoiceItem,
  Customer,
  Produk,
  Bahan,
  Counters,
  Settings,
  Voucher,
  FinishingGroup,
  SelectedFinishingItem
} from '../types';
import { saveDocument, saveCounters, subscribeCollection } from '../firebaseService';
import { AIScanModal } from './AIScanModal';
import { suggestItemDescriptionWithAI, ParsedInvoiceData } from '../services/aiService';
import { GoogleDriveUploader } from './GoogleDriveUploader';
import { getDriveInfo } from '../utils/googleDrive';
import {
  getGoogleAccessToken,
  appendSheetValues,
  createCalendarEvent
} from '../lib/googleWorkspace';
import {
  getCustomerCode,
  getProductCode,
  formatCustomerOptionLabel,
  formatProductOptionLabel,
  generateUniqueInvoiceNumber,
  checkDuplicateInvoiceNumber
} from '../utils/idGenerator';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';
import { ProductAutocompleteInput } from './ProductAutocompleteInput';
import { FinishingSelectorModal } from './FinishingSelectorModal';
import {
  DEFAULT_FINISHING_GROUPS,
  getApplicableFinishingGroups,
  calculateFinishingAddition
} from '../data/defaultFinishings';

interface TransaksiFormProps {
  invoices?: Invoice[];
  customers: Customer[];
  products: Produk[];
  bahans: Bahan[];
  counters: Counters;
  settings: Settings;
  editingInvoice: Invoice | null;
  onFinish: () => void;
  onCancelEdit: () => void;
  showToast: (msg: string, isErr?: boolean) => void;
  finishingGroups?: FinishingGroup[];
}

export const TransaksiForm: React.FC<TransaksiFormProps> = ({
  invoices,
  customers,
  products,
  bahans,
  counters,
  settings,
  editingInvoice,
  onFinish,
  onCancelEdit,
  showToast,
  finishingGroups
}) => {
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>([]);
  
  useEffect(() => {
    if (!invoices) {
      const unsub = subscribeCollection<Invoice>('invoice', (data) => {
        setLocalInvoices(data || []);
      });
      return () => unsub();
    }
  }, [invoices]);

  const allInvoices = invoices || localInvoices;

  const [tipeDoc, setTipeDoc] = useState<'Invoice' | 'Quotation'>('Invoice');
  const [noInv, setNoInv] = useState('');
  const [tglInv, setTglInv] = useState(new Date().toISOString().split('T')[0]);
  const [tempoInv, setTempoInv] = useState(new Date().toISOString().split('T')[0]);
  const [estimasiPengerjaan, setEstimasiPengerjaan] = useState('1 Hari Kerja');
  const [statusJob, setStatusJob] = useState('Pending');
  const [accDesainUrl, setAccDesainUrl] = useState('');

  const [selectedCustId, setSelectedCustId] = useState('');
  const [namaCust, setNamaCust] = useState('');
  const [waCust, setWaCust] = useState('');
  const [alamatCust, setAlamatCust] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([
    { nama: '', desc: '', qty: 1, satuan: 'Pcs', harga: 0, diskon: 0, subtotal: 0, hpp: 0 }
  ]);

  const [diskonTambahan, setDiskonTambahan] = useState(0);
  const [dibayar, setDibayar] = useState(0);
  const [bayarNote, setBayarNote] = useState('');

  // Voucher States
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  useEffect(() => {
    const unsub = subscribeCollection<Voucher>('vouchers', (data) => {
      setVouchers(data || []);
    });
    return () => unsub();
  }, []);

  // Finishing Modal & Groups
  const [finishingModalIdx, setFinishingModalIdx] = useState<number | null>(null);

  const allFinishingGroups = React.useMemo(() => {
    return finishingGroups && finishingGroups.length > 0 ? finishingGroups : DEFAULT_FINISHING_GROUPS;
  }, [finishingGroups]);

  const handleApplyFinishingToItem = (
    index: number,
    selected: SelectedFinishingItem[],
    newUnitPrice: number,
    summaryText: string
  ) => {
    const updated = [...items];
    const current = { ...updated[index] };
    const base = current.baseHarga !== undefined && current.baseHarga > 0 ? current.baseHarga : current.harga;
    current.baseHarga = base;
    current.selectedFinishings = selected;
    current.finishingDetailsText = summaryText;
    current.finishingType = summaryText;
    current.harga = newUnitPrice;
    const qty = parseFloat(String(current.qty)) || 1;
    const diskon = parseFloat(String(current.diskon)) || 0;
    current.subtotal = qty * newUnitPrice * (1 - diskon / 100);
    updated[index] = current;
    setItems(updated);
    setFinishingModalIdx(null);
    showToast(selected.length > 0 ? `Finishing diterapkan: ${summaryText}` : 'Finishing dikosongkan');
  };

  const handleRemoveFinishingFromItem = (index: number) => {
    const updated = [...items];
    const current = { ...updated[index] };
    const base = current.baseHarga !== undefined && current.baseHarga > 0 ? current.baseHarga : current.harga;
    current.harga = base;
    current.selectedFinishings = [];
    current.finishingDetailsText = '';
    current.finishingType = '';
    const qty = parseFloat(String(current.qty)) || 1;
    const diskon = parseFloat(String(current.diskon)) || 0;
    current.subtotal = qty * base * (1 - diskon / 100);
    updated[index] = current;
    setItems(updated);
    showToast('Finishing dihapus dari item');
  };

  // AI States
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [loadingItemAiIdx, setLoadingItemAiIdx] = useState<number | null>(null);

  const handleApplyAiData = (data: ParsedInvoiceData) => {
    if (data.customerName) setNamaCust(data.customerName);
    if (data.customerPhone) setWaCust(data.customerPhone);
    if (data.dp !== undefined && data.dp > 0) setDibayar(data.dp);

    if (data.items && data.items.length > 0) {
      const formattedItems: InvoiceItem[] = data.items.map((it) => {
        const qty = it.qty || 1;
        const harga = it.price || 0;
        return {
          nama: it.title || '',
          desc: it.note || '',
          qty,
          satuan: 'Pcs',
          harga,
          diskon: 0,
          subtotal: it.subtotal || qty * harga,
          hpp: 0,
        };
      });
      setItems(formattedItems);
    }
  };

  const handleAiSuggestItem = async (index: number) => {
    const item = items[index];
    if (!item.nama.trim()) {
      showToast('Ketik nama produk terlebih dahulu (misal: Banner Flexi, Brosur A4, Stiker)', true);
      return;
    }

    setLoadingItemAiIdx(index);
    try {
      const suggestion = await suggestItemDescriptionWithAI(item.nama);
      const updated = [...items];
      const cur = { ...updated[index] };
      cur.desc = suggestion.suggestedDescription;
      if (suggestion.recommendedPrice && cur.harga === 0) {
        cur.harga = suggestion.recommendedPrice;
      }
      if (suggestion.unitName) {
        cur.satuan = suggestion.unitName;
      }
      cur.subtotal = cur.qty * cur.harga * (1 - cur.diskon / 100);
      updated[index] = cur;
      setItems(updated);
      showToast('Deskripsi & estimasi harga berhasil diisi.');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal meminta saran AI', true);
    } finally {
      setLoadingItemAiIdx(null);
    }
  };

  // Safe unique number generation function
  const handleGenerateUniqueNo = (forcedType?: 'Invoice' | 'Quotation') => {
    const type = forcedType || tipeDoc;
    const nextStart = type === 'Invoice' ? (counters.nextInvNumber || 1) : (counters.nextQuoteNumber || 1);
    const { number } = generateUniqueInvoiceNumber(type, allInvoices, nextStart);
    setNoInv(number);
    return number;
  };

  // Auto Generate Guaranteed Unique Number on mount / doc type toggle
  useEffect(() => {
    if (!editingInvoice) {
      const nextStart = tipeDoc === 'Invoice' ? (counters.nextInvNumber || 1) : (counters.nextQuoteNumber || 1);
      const { number } = generateUniqueInvoiceNumber(tipeDoc, allInvoices, nextStart);
      setNoInv(number);
    }
  }, [tipeDoc, counters, editingInvoice, allInvoices.length]);

  // Real-time Duplicate Check
  const duplicateCheck = checkDuplicateInvoiceNumber(noInv, allInvoices, editingInvoice?.id);

  // Load editing invoice
  useEffect(() => {
    if (editingInvoice) {
      setTipeDoc(editingInvoice.tipeDoc as any);
      setNoInv(editingInvoice.noInv);
      setTglInv(editingInvoice.tglInv);
      setTempoInv(editingInvoice.tempoInv);
      setNamaCust(editingInvoice.namaCust);
      setWaCust(editingInvoice.waCust || '');
      setAlamatCust(editingInvoice.alamatCust || '');
      setItems(editingInvoice.items || []);
      setDiskonTambahan(editingInvoice.diskonTambahan || 0);
      setDibayar(editingInvoice.dibayar || 0);
      setBayarNote(editingInvoice.bayarNote || editingInvoice.historyBayar?.[0]?.metode || editingInvoice.historyBayar?.[0]?.note || '');
      setEstimasiPengerjaan(editingInvoice.estimasiPengerjaan || '1 Hari Kerja');
      setStatusJob(editingInvoice.statusJob || 'Pending');
      setAccDesainUrl(editingInvoice.accDesainUrl || editingInvoice.fileUrl || editingInvoice.proofImageUrl || '');
      if (editingInvoice.voucherCode) {
        setVoucherCodeInput(editingInvoice.voucherCode);
        setVoucherDiscount(editingInvoice.voucherDiscount || 0);
      }
    }
  }, [editingInvoice]);

  const setQuickTempo = (days: number) => {
    const d = new Date(tglInv);
    if (days === 0) {
      setTempoInv(new Date().toISOString().split('T')[0]);
    } else {
      d.setDate(d.getDate() + days);
      setTempoInv(d.toISOString().split('T')[0]);
    }
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setNamaCust(c.nama);
      setWaCust(c.wa || '');
      setAlamatCust(c.alamat || '');
    }
  };

  const handleSelectProductForItem = (index: number, productOrId: string | Produk) => {
    const p = typeof productOrId === 'string'
      ? products.find((x) => x.id === productOrId)
      : productOrId;
    if (!p) return;
    const actualIndex = products.findIndex((x) => x.id === p.id);
    const code = getProductCode(p, (actualIndex >= 0 ? actualIndex : 0) + 1, products);
    const updated = [...items];
    const qty = parseFloat(String(updated[index].qty)) || 1;
    const diskon = parseFloat(String(updated[index].diskon)) || 0;

    let finalUnitPrice = p.harga;
    let finishText = updated[index].finishingDetailsText || '';

    // If item already had selected finishings, recalculate with new base price
    if (updated[index].selectedFinishings && updated[index].selectedFinishings!.length > 0) {
      const { newUnitPrice, summary } = calculateFinishingAddition(updated[index].selectedFinishings!, p.harga, qty);
      finalUnitPrice = newUnitPrice;
      finishText = summary;
    }

    const current: InvoiceItem = {
      ...updated[index],
      prodId: p.id,
      productId: p.id,
      product_id: p.id,
      prodCode: code,
      nama: p.nama,
      desc: p.desc || updated[index].desc || '',
      baseHarga: p.harga,
      harga: finalUnitPrice,
      finishingDetailsText: finishText,
      finishingType: finishText,
      hpp: p.hpp || 0,
      satuan: p.satuan || updated[index].satuan || 'Pcs',
      bahanId: p.bahanId || '',
      bahanQty: p.bahanQty || 0,
      subtotal: qty * finalUnitPrice * (1 - diskon / 100)
    };

    updated[index] = current;
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'nama') {
      const valStr = String(value || '').trim();
      const valLower = valStr.toLowerCase();

      // Check if user entered an exact SKU or bracketed SKU like "PRD-0019" or "[PRD-0019]"
      const skuPattern = /\[?(PRD-\d{4}|SKU-\d+|[A-Z0-9_-]+)\]?/i;
      const matchSku = valStr.match(skuPattern);
      const targetSku = matchSku ? matchSku[1].toUpperCase() : '';

      let p: Produk | undefined;

      // 1. Try finding by SKU if user typed/pasted a code
      if (targetSku && targetSku.startsWith('PRD-')) {
        p = products.find((x, xIdx) => {
          const xCode = getProductCode(x, xIdx + 1, products).toUpperCase();
          return xCode === targetSku || (x.sku && x.sku.toUpperCase() === targetSku) || (x.code && x.code.toUpperCase() === targetSku);
        });
      }

      // 2. Try matching by exact product ID if it was already set
      if (!p && current.prodId) {
        const existing = products.find((x) => x.id === current.prodId);
        if (existing && existing.nama.trim().toLowerCase() === valLower) {
          p = existing;
        }
      }

      // 3. Try matching by formatProductOptionLabel or full label
      if (!p) {
        p = products.find((x, xIdx) => {
          const lbl = formatProductOptionLabel(x, xIdx + 1, products).toLowerCase();
          return lbl === valLower || lbl.startsWith(valLower);
        });
      }

      // 4. Try matching by nama AND current.desc (if desc was already typed/selected)
      if (!p && current.desc) {
        p = products.find((x) =>
          x.nama.trim().toLowerCase() === valLower &&
          (x.desc || '').trim().toLowerCase() === (current.desc || '').trim().toLowerCase()
        );
      }

      // 5. Try matching by nama AND current.harga (if harga was set)
      if (!p && current.harga) {
        p = products.find((x) =>
          x.nama.trim().toLowerCase() === valLower &&
          Number(x.harga) === Number(current.harga)
        );
      }

      // 6. If only 1 product exists with that name in the entire database, match it
      if (!p) {
        const matchingByName = products.filter((x) => x.nama.trim().toLowerCase() === valLower);
        if (matchingByName.length === 1) {
          p = matchingByName[0];
        }
      }

      if (p) {
        const actualIndex = products.findIndex((x) => x.id === p!.id);
        const code = getProductCode(p, (actualIndex >= 0 ? actualIndex : 0) + 1, products);
        current.prodId = p.id;
        current.productId = p.id;
        current.product_id = p.id;
        current.prodCode = code;
        current.nama = p.nama;
        current.desc = p.desc || current.desc || '';
        current.baseHarga = p.harga;
        current.harga = p.harga ?? 0;
        current.hpp = p.hpp || 0;
        if (p.satuan) {
          current.satuan = p.satuan;
        }
        current.bahanId = p.bahanId || '';
        current.bahanQty = p.bahanQty || 0;
      }
    }

    if (field === 'qty') {
      const newQty = parseFloat(String(value)) || 0;
      if (current.selectedFinishings && current.selectedFinishings.length > 0 && current.baseHarga) {
        const { newUnitPrice } = calculateFinishingAddition(current.selectedFinishings, current.baseHarga, newQty || 1);
        current.harga = newUnitPrice;
      }
    }

    if (field === 'harga') {
      const typedPrice = parseFloat(String(value)) || 0;
      current.baseHarga = typedPrice;
    }

    const qty = parseFloat(String(current.qty)) || 0;
    const harga = parseFloat(String(current.harga)) || 0;
    const diskon = parseFloat(String(current.diskon)) || 0;
    current.subtotal = qty * harga * (1 - diskon / 100);

    updated[index] = current;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { nama: '', desc: '', qty: 1, satuan: 'Pcs', harga: 0, diskon: 0, subtotal: 0, hpp: 0 }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Voucher Handler Functions
  const handleApplyVoucher = (codeToApply?: string) => {
    const targetCode = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!targetCode) {
      showToast('Masukkan kode voucher promo terlebih dahulu', true);
      return;
    }

    const v = vouchers.find((x) => x.code.toUpperCase() === targetCode);
    if (!v) {
      showToast(`Kode voucher "${targetCode}" tidak ditemukan!`, true);
      return;
    }

    if (!v.active) {
      showToast(`Voucher "${targetCode}" sedang tidak aktif!`, true);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (v.validFrom && todayStr < v.validFrom) {
      showToast(`Voucher "${targetCode}" baru berlaku mulai ${v.validFrom}`, true);
      return;
    }
    if (v.validUntil && todayStr > v.validUntil) {
      showToast(`Voucher "${targetCode}" sudah kadaluarsa sejak ${v.validUntil}`, true);
      return;
    }

    if (v.quota !== undefined && v.quota > 0 && (v.usedCount || 0) >= v.quota) {
      showToast(`Kuota penggunaan voucher "${targetCode}" sudah habis!`, true);
      return;
    }

    if (v.minTransaction && subtotalSum < v.minTransaction) {
      showToast(`Min. transaksi Rp ${v.minTransaction.toLocaleString('id-ID')} untuk voucher ini!`, true);
      return;
    }

    let disc = 0;
    if (v.type === 'nominal') {
      disc = v.value;
    } else {
      disc = Math.round((subtotalSum * v.value) / 100);
      if (v.maxDiscount && disc > v.maxDiscount) {
        disc = v.maxDiscount;
      }
    }

    disc = Math.min(disc, subtotalSum);

    setAppliedVoucher(v);
    setVoucherCodeInput(v.code);
    setVoucherDiscount(disc);
    showToast(`🎉 Voucher "${v.code}" berhasil dipasang! Hemat Rp ${disc.toLocaleString('id-ID')}`);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherDiscount(0);
    showToast('Voucher dilepas');
  };

  // Calculations
  const subtotalSum = items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const totalHppSum = items.reduce((acc, it) => acc + (it.qty || 0) * (it.hpp || 0), 0);
  const grandTotal = Math.max(subtotalSum - diskonTambahan - voucherDiscount, 0);
  const sisaTertagih = Math.max(grandTotal - dibayar, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNoInv = (noInv || '').trim();
    if (!cleanNoInv || !namaCust.trim()) {
      return showToast('No Nota / Dokumen dan Nama Pelanggan wajib diisi', true);
    }
    if (items.some((it) => !it.nama || it.qty <= 0)) {
      return showToast('Pastikan semua baris item memiliki nama dan Qty > 0', true);
    }

    // Prevent duplicate document numbers strictly
    const dupCheck = checkDuplicateInvoiceNumber(cleanNoInv, allInvoices, editingInvoice?.id);
    if (dupCheck.isDuplicate) {
      const conflict = dupCheck.conflictingInvoice;
      return showToast(
        `❌ Gagal: No. Dokumen "${cleanNoInv}" sudah digunakan oleh ${conflict?.namaCust || 'transaksi lain'} (${formatDate(conflict?.tglInv)}). Silakan gunakan nomor dokumen unik!`,
        true
      );
    }

    // Auto save / resolve customer and ID
    let finalCustomerId = selectedCustId || editingInvoice?.customerId || editingInvoice?.customer_id || '';
    let finalCustomerCode = '';

    const cleanNamaCust = namaCust.trim();
    if (cleanNamaCust) {
      const existingCust = customers.find((c) => c.nama.trim().toLowerCase() === cleanNamaCust.toLowerCase() || c.id === selectedCustId);
      if (existingCust) {
        finalCustomerId = existingCust.id;
        finalCustomerCode = getCustomerCode(existingCust);
        if ((waCust.trim() && !existingCust.wa) || (alamatCust.trim() && !existingCust.alamat)) {
          await saveDocument('customer', {
            ...existingCust,
            wa: waCust.trim() || existingCust.wa || '',
            alamat: alamatCust.trim() || existingCust.alamat || ''
          });
        }
      } else {
        const nextCustNum = counters.nextCustNumber || customers.length + 1;
        const newCode = `CUST-${String(nextCustNum).padStart(4, '0')}`;
        const newCustId = String(Date.now());
        finalCustomerId = newCustId;
        finalCustomerCode = newCode;

        await saveDocument('customer', {
          id: newCustId,
          code: newCode,
          nama: cleanNamaCust,
          wa: waCust.trim(),
          alamat: alamatCust.trim()
        });

        await saveCounters({ ...counters, nextCustNumber: nextCustNum + 1 });
      }
    }

    // Auto save / resolve products and product_id for each item
    let currentNextProdNum = counters.nextProdNumber || products.length + 1;
    let prodCounterChanged = false;

    const processedItems: InvoiceItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cleanItemNama = (item.nama || '').trim();
      let itemProdId = item.prodId || item.productId || item.product_id || '';
      let itemProdCode = item.prodCode || '';

      if (cleanItemNama) {
        let existingProd: Produk | undefined;

        // 1. Match by itemProdId
        if (itemProdId) {
          existingProd = products.find((p) => p.id === itemProdId);
        }

        // 2. Match by itemProdCode (e.g. PRD-0019)
        if (!existingProd && itemProdCode) {
          existingProd = products.find((p, pIdx) => {
            const code = getProductCode(p, pIdx + 1, products);
            return (
              code.toLowerCase() === itemProdCode.toLowerCase() ||
              (p.sku && p.sku.toLowerCase() === itemProdCode.toLowerCase()) ||
              (p.code && p.code.toLowerCase() === itemProdCode.toLowerCase())
            );
          });
        }

        // 3. Match by nama AND desc (specification)
        if (!existingProd && item.desc) {
          existingProd = products.find(
            (p) =>
              p.nama.trim().toLowerCase() === cleanItemNama.toLowerCase() &&
              (p.desc || '').trim().toLowerCase() === (item.desc || '').trim().toLowerCase()
          );
        }

        // 4. Match by nama AND harga
        if (!existingProd && item.harga) {
          existingProd = products.find(
            (p) =>
              p.nama.trim().toLowerCase() === cleanItemNama.toLowerCase() &&
              Number(p.harga) === Number(item.harga)
          );
        }

        // 5. Match by nama
        if (!existingProd) {
          const nameMatches = products.filter(
            (p) => p.nama.trim().toLowerCase() === cleanItemNama.toLowerCase()
          );
          if (nameMatches.length > 0) {
            existingProd = nameMatches[0];
          }
        }

        if (existingProd) {
          const actualIndex = products.findIndex((x) => x.id === existingProd!.id);
          itemProdId = existingProd.id;
          itemProdCode = getProductCode(existingProd, (actualIndex >= 0 ? actualIndex : 0) + 1, products);
        } else {
          const newSku = `PRD-${String(currentNextProdNum).padStart(4, '0')}`;
          const newProdId = String(Date.now() + Math.floor(Math.random() * 1000) + i);
          itemProdId = newProdId;
          itemProdCode = newSku;

          await saveDocument('produk', {
            id: newProdId,
            sku: newSku,
            code: newSku,
            tipe: 'Barang',
            kategori: 'Lainnya',
            nama: cleanItemNama,
            desc: item.desc || '',
            satuan: item.satuan || 'Pcs',
            hpp: item.hpp || 0,
            harga: item.harga || 0,
            showInPortal: true
          });

          currentNextProdNum += 1;
          prodCounterChanged = true;
        }
      }

      processedItems.push({
        ...item,
        prodId: itemProdId,
        productId: itemProdId,
        product_id: itemProdId,
        prodCode: itemProdCode
      });
    }

    if (prodCounterChanged) {
      await saveCounters({ ...counters, nextProdNumber: currentNextProdNum });
    }

    // Process Stock deductions
    if (tipeDoc === 'Invoice') {
      for (const item of processedItems) {
        if (item.bahanId && item.bahanQty) {
          const bahan = bahans.find((b) => b.id === item.bahanId);
          if (bahan) {
            const deductedQty = Math.max(bahan.jumlah - item.qty * item.bahanQty, 0);
            await saveDocument('bahan_baku', { ...bahan, jumlah: deductedQty });
          }
        }
      }
    }

    const statusBayar = dibayar >= grandTotal ? 'Paid' : dibayar > 0 ? 'Partial' : 'Unpaid';
    const invId = editingInvoice ? editingInvoice.id : String(Date.now());

    let finalAccDesainUrl = accDesainUrl.trim();
    const driveInfo = getDriveInfo(finalAccDesainUrl);

    const invData: Invoice = {
      id: invId,
      tipeDoc,
      noInv,
      tglInv,
      tempoInv,
      customerId: finalCustomerId,
      customer_id: finalCustomerId,
      customerCode: finalCustomerCode,
      namaCust,
      waCust,
      alamatCust,
      items: processedItems,
      diskonTambahan,
      voucherCode: appliedVoucher?.code || voucherCodeInput || '',
      voucherDiscount: voucherDiscount || 0,
      totalHPP: totalHppSum,
      grandTotal,
      dibayar,
      bayarNote: bayarNote || (dibayar > 0 ? (paymentMethods[0] || 'Cash') : (editingInvoice?.bayarNote || '')),
      sisaTertagih,
      statusBayar,
      statusJob: statusJob || 'Pending',
      accDesainUrl: driveInfo.drive_view_url || finalAccDesainUrl,
      drive_file_id: driveInfo.drive_file_id || undefined,
      drive_view_url: driveInfo.drive_view_url || undefined,
      drive_embed_url: driveInfo.drive_embed_url || undefined,
      fileUrl: driveInfo.drive_view_url || finalAccDesainUrl,
      accDesainStatus: finalAccDesainUrl ? (editingInvoice?.accDesainStatus || 'Menunggu ACC') : undefined,
      estimasiPengerjaan: estimasiPengerjaan.trim() || '1 Hari Kerja',
      historyBayar: editingInvoice
        ? (editingInvoice.historyBayar && editingInvoice.historyBayar.length > 0
            ? editingInvoice.historyBayar
            : dibayar > 0
            ? [{ tgl: tglInv, nominal: dibayar, note: bayarNote || 'DP / Pembayaran Awal', metode: bayarNote || (paymentMethods[0] || 'Cash') }]
            : [])
        : dibayar > 0
        ? [{ tgl: tglInv, nominal: dibayar, note: bayarNote || 'DP / Pembayaran Awal', metode: bayarNote || (paymentMethods[0] || 'Cash') }]
        : []
    };

    await saveDocument('invoice', invData);

    // Google Workspace Sync: Sheets & Calendar
    const googleToken = getGoogleAccessToken();
    if (googleToken && settings.googleSpreadsheetId && (settings.autoSyncGoogleSheets ?? true)) {
      try {
        const itemSummary = processedItems.map(it => `${it.nama} (${it.qty} ${it.satuan})`).join(', ');
        await appendSheetValues(
          googleToken,
          settings.googleSpreadsheetId,
          'Rekap Penjualan!A:J',
          [[
            invData.noInv,
            invData.tglInv,
            invData.namaCust,
            invData.waCust || '-',
            invData.grandTotal,
            invData.dibayar,
            invData.sisaTertagih,
            invData.statusBayar,
            invData.statusJob,
            itemSummary
          ]]
        );
      } catch (sheetErr) {
        console.warn('Silent Google Sheets sync notice:', sheetErr);
      }
    }

    // Google Calendar Deadline Event Creation
    if (googleToken && tempoInv && !editingInvoice) {
      try {
        const deadlineDate = tempoInv.includes('T') ? tempoInv : `${tempoInv}T17:00:00+07:00`;
        const endDate = tempoInv.includes('T') ? tempoInv : `${tempoInv}T18:00:00+07:00`;
        await createCalendarEvent(googleToken, {
          summary: `[CTRL PRINT] Deadline Order: ${invData.noInv} - ${invData.namaCust}`,
          description: `Pesanan ${invData.noInv}\nPelanggan: ${invData.namaCust} (${invData.waCust || '-'})\nTotal: Rp ${invData.grandTotal.toLocaleString('id-ID')}\nStatus: ${invData.statusJob}\nEstimasi: ${invData.estimasiPengerjaan || '1 Hari'}`,
          startDateTime: deadlineDate,
          endDateTime: endDate
        });
      } catch (calErr) {
        console.warn('Silent Google Calendar sync notice:', calErr);
      }
    }

    if (appliedVoucher) {
      await saveDocument('vouchers', {
        ...appliedVoucher,
        usedCount: (appliedVoucher.usedCount || 0) + 1
      });
    }

    if (!editingInvoice) {
      if (tipeDoc === 'Invoice') {
        await saveCounters({ ...counters, nextInvNumber: (counters.nextInvNumber || 1) + 1 });
      } else {
        await saveCounters({ ...counters, nextQuoteNumber: (counters.nextQuoteNumber || 1) + 1 });
      }
    }

    showToast('Transaksi Berhasil Disimpan ke Database Online!');
    onFinish();
  };

  const paymentMethods = (settings.paymentMethods || 'Cash, Transfer BCA, QRIS')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FilePlus size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
              {editingInvoice ? 'Edit Transaksi Sales' : 'Form Transaksi & Penawaran Harga'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {editingInvoice ? (
                <>Nomor Transaksi: <strong style={{ color: 'var(--accent)' }}>{editingInvoice.noInv}</strong></>
              ) : (
                'Buat nota penjualan atau surat penawaran cetak baru'
              )}
            </span>
          </div>
        </div>

        {/* Actions & Tipe Dokumen Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsAiScanOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
            }}
          >
            <ScanText size={15} />
            <span>Scan Nota / Ekstrak Pesanan</span>
          </button>

          <div
            style={{
              display: 'flex',
              background: 'var(--bg-main)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}
          >
          <button
            type="button"
            onClick={() => setTipeDoc('Invoice')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: tipeDoc === 'Invoice' ? 'var(--primary)' : 'transparent',
              color: tipeDoc === 'Invoice' ? '#FFF' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Sales Invoice
          </button>
          <button
            type="button"
            onClick={() => setTipeDoc('Quotation')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: tipeDoc === 'Quotation' ? 'var(--primary)' : 'transparent',
              color: tipeDoc === 'Quotation' ? '#FFF' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Penawaran (Quotation)
          </button>
        </div>
      </div>
    </div>

      <form onSubmit={handleSubmit}>
        {/* Top Split Grid: Data Pelanggan & Informasi Dokumen */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}
        >
          {/* Card 1: Data Pelanggan (LEFT) */}
          <div
            style={{
              background: 'var(--bg-main)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--primary)' }} /> Data & Informasi Pelanggan
              </div>
              <span style={{ fontSize: '10.5px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                Auto-Save Pelanggan Baru
              </span>
            </div>

            <div className="form-grid" style={{ gap: '10px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Pilih dari Database Pelanggan</label>
                <select value={selectedCustId} onChange={(e) => handleSelectCustomer(e.target.value)}>
                  <option value="">-- Pelanggan Baru / Ketik Manual --</option>
                  {[...customers]
                    .sort((a, b) => a.nama.localeCompare(b.nama, undefined, { sensitivity: 'base' }))
                    .map((c, idx) => (
                      <option key={c.id} value={c.id}>
                        {formatCustomerOptionLabel(c, idx + 1)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Nama Pelanggan *</label>
                <input
                  type="text"
                  value={namaCust}
                  onChange={(e) => setNamaCust(e.target.value)}
                  placeholder="Nama / Instansi / Perusahaan"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>WhatsApp</label>
                <input
                  type="text"
                  value={waCust}
                  onChange={(e) => setWaCust(e.target.value)}
                  placeholder="08..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Alamat / Catatan Pengiriman</label>
                <input
                  type="text"
                  value={alamatCust}
                  onChange={(e) => setAlamatCust(e.target.value)}
                  placeholder="Alamat lengkap atau lokasi kirim..."
                />
              </div>
            </div>
          </div>

          {/* Card 2: Informasi Dokumen & Tanggal (RIGHT) */}
          <div
            style={{
              background: 'var(--bg-main)',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Calendar size={16} style={{ color: 'var(--primary)' }} /> Informasi Dokumen & Tanggal
            </div>

            <div className="form-grid" style={{ gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    No. Dokumen
                    {duplicateCheck.isDuplicate ? (
                      <span style={{ color: '#DC2626', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <AlertTriangle size={11} /> Duplikat
                      </span>
                    ) : noInv ? (
                      <span style={{ color: '#059669', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle2 size={11} /> Unik
                      </span>
                    ) : null}
                  </label>
                  {!editingInvoice && (
                    <button
                      type="button"
                      onClick={() => handleGenerateUniqueNo()}
                      title="Generate Nomor Dokumen Unik Baru Otomatis"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: 0
                      }}
                    >
                      <RefreshCw size={11} /> Generate Baru
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={noInv}
                    onChange={(e) => setNoInv(e.target.value)}
                    placeholder="Contoh: INV/2026/0001"
                    style={{
                      fontWeight: 800,
                      color: duplicateCheck.isDuplicate ? '#DC2626' : 'var(--primary)',
                      border: duplicateCheck.isDuplicate ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
                      background: duplicateCheck.isDuplicate ? '#FEF2F2' : 'var(--bg-card)'
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Tanggal Nota</label>
                <input type="date" value={tglInv} onChange={(e) => setTglInv(e.target.value)} />
              </div>

              {/* Real-time Duplicate Document Number Warning Alert */}
              {duplicateCheck.isDuplicate && (
                <div
                  style={{
                    gridColumn: 'span 2',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginTop: '-2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <span>
                      <strong>Peringatan No. Dokumen Sama!</strong> "{noInv}" sudah terdaftar pada pelanggan <strong>{duplicateCheck.conflictingInvoice?.namaCust}</strong> ({formatDate(duplicateCheck.conflictingInvoice?.tglInv)}).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateUniqueNo()}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: '#DC2626',
                      color: '#FFF',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    Ganti Nomor Unik
                  </button>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, margin: 0 }}>Jatuh Tempo</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setQuickTempo(0)}>Hari Ini</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setQuickTempo(1)}>1 Hari</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setQuickTempo(7)}>7 Hari</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setQuickTempo(30)}>30 Hari</button>
                  </div>
                </div>
                <input type="date" value={tempoInv} onChange={(e) => setTempoInv(e.target.value)} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                    <Clock size={12} /> Estimasi Pengerjaan / Produksi
                  </label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setEstimasiPengerjaan('Selesai Hari Ini')}>Hari Ini</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setEstimasiPengerjaan('1 Hari Kerja')}>1 Hari</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setEstimasiPengerjaan('2-3 Hari Kerja')}>2-3 Hari</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setEstimasiPengerjaan('3-5 Hari Kerja')}>3-5 Hari</button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setEstimasiPengerjaan('7 Hari Kerja')}>1 Minggu</button>
                  </div>
                </div>
                <input
                  type="text"
                  value={estimasiPengerjaan}
                  onChange={(e) => setEstimasiPengerjaan(e.target.value)}
                  placeholder="Misal: 1 Hari Kerja, 2-3 Hari, Selesai Jam 17:00..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: 600 }}>Status Job / Alur Pengerjaan</label>
                <select
                  value={statusJob}
                  onChange={(e) => setStatusJob(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi (Verifikasi File & Biaya)</option>
                  <option value="Pending">Pending (Siap Diproses)</option>
                  <option value="Desain">Desain / Setting Layout</option>
                  <option value="Produksi">Produksi / Cetak</option>
                  <option value="Finishing">Finishing / Potong / Lipat</option>
                  <option value="Siap Kirim">Siap Kirim / Diambil</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Rincian Produk & Jasa Cetak */}
        <div
          style={{
            background: 'var(--bg-main)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            marginBottom: '16px'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: 'var(--primary)',
              marginBottom: '12px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={16} style={{ color: 'var(--primary)' }} /> Rincian Item Produk & Jasa Cetak
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10.5px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                Auto-Save Katalog Produk
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {items.length} Baris Item Dibuat
              </span>
            </div>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '260px', paddingBottom: '40px' }}>
            <table className="data-table" style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Pilih / Nama Produk</th>
                  <th style={{ width: '22%' }}>Spesifikasi & Keterangan</th>
                  <th style={{ width: '8%' }}>Qty</th>
                  <th style={{ width: '9%' }}>Satuan</th>
                  <th style={{ width: '15%' }}>Harga Satuan</th>
                  <th style={{ width: '6%' }}>Disc%</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ width: '4%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const hasFinishing = Boolean(item.finishingDetailsText);
                  return (
                    <React.Fragment key={index}>
                      {/* Main Input Row - Laser Aligned */}
                      <tr style={{ borderBottom: hasFinishing ? 'none' : '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                          <ProductAutocompleteInput
                            value={item.nama}
                            onChange={(val) => handleItemChange(index, 'nama', val)}
                            onSelectProduct={(prod) => handleSelectProductForItem(index, prod)}
                            products={products}
                            placeholder="Pilih katalog atau ketik produk baru..."
                            selectedProductId={item.prodId || item.productId || item.product_id}
                            selectedProductCode={item.prodCode}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="text"
                              value={item.desc || ''}
                              onChange={(e) => handleItemChange(index, 'desc', e.target.value)}
                              placeholder="Detail spesifikasi..."
                              style={{ padding: '7px 8px', fontSize: '12px', width: '100%', borderRadius: '6px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setFinishingModalIdx(index)}
                              title={hasFinishing ? `Finishing: ${item.finishingDetailsText}` : "Pilih Opsi Finishing (Potong, Laminasi, Jilid, dll)"}
                              style={{
                                background: hasFinishing ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-main, #F1F5F9)',
                                border: hasFinishing ? '1px solid #2563EB' : '1px solid var(--border-color)',
                                color: hasFinishing ? '#2563EB' : 'var(--text-main)',
                                borderRadius: '6px',
                                padding: '0 8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0,
                                fontSize: '11px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Layers size={13} />
                              <span>Finishing</span>
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            min="0.1"
                            step="any"
                            style={{ padding: '7px 8px', fontSize: '12px', width: '100%', borderRadius: '6px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            list="list-satuan-umum"
                            value={item.satuan}
                            onChange={(e) => handleItemChange(index, 'satuan', e.target.value)}
                            style={{ padding: '7px 8px', fontSize: '12px', width: '100%', borderRadius: '6px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            value={item.harga}
                            onChange={(e) => handleItemChange(index, 'harga', e.target.value)}
                            style={{ padding: '7px 8px', fontSize: '12px', width: '100%', borderRadius: '6px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            value={item.diskon}
                            onChange={(e) => handleItemChange(index, 'diskon', e.target.value)}
                            min="0"
                            max="100"
                            style={{ padding: '7px 8px', fontSize: '12px', width: '100%', borderRadius: '6px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--primary)' }}>
                            Rp {(item.subtotal || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger)', padding: '5px 7px', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '6px' }}
                            onClick={() => removeItemRow(index)}
                            title="Hapus baris item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* Finishing & Add-on Sub-Row spanning full table width */}
                      {hasFinishing && (
                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main, #F8FAFC)' }}>
                          <td colSpan={8} style={{ padding: '6px 12px', borderTop: 'none' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                flexWrap: 'wrap'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    color: '#334155',
                                    background: '#E2E8F0',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    flexShrink: 0
                                  }}
                                >
                                  <Layers size={11} /> Finishing
                                </span>
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'var(--text-main)'
                                  }}
                                >
                                  {item.finishingDetailsText}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setFinishingModalIdx(index)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#2563EB',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  Ubah Opsi
                                </button>
                                <span style={{ color: 'var(--border-color, #CBD5E1)', fontSize: '11px' }}>•</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFinishingFromItem(index)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#EF4444',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px 4px'
                                  }}
                                  title="Hapus finishing dari item ini"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={addItemRow}
            style={{
              marginTop: '12px',
              width: '100%',
              borderStyle: 'dashed',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '12px'
            }}
          >
            <Plus size={15} /> Tambah Baris Item Produk Baru
          </button>
        </div>

        {/* Section: File Desain & Lampiran Google Drive */}
        <div style={{ marginBottom: '20px' }}>
          <GoogleDriveUploader
            currentUrl={accDesainUrl}
            onUrlGenerated={(url) => setAccDesainUrl(url)}
            invoiceNo={noInv}
            customerName={namaCust}
            contextCategory="desain_acc"
            label="File Desain / Lampiran Nota (Google Drive)"
          />
        </div>

        {/* Section: Ringkasan Tagihan & Pembayaran */}
        <div
          style={{
            background: 'var(--bg-main)',
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: 'var(--primary)',
              marginBottom: '16px',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CreditCard size={17} style={{ color: 'var(--primary)' }} /> Ringkasan Tagihan & Pembayaran
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
              alignItems: 'start',
              marginBottom: '18px'
            }}
          >
            {/* Column 1: Diskon Tambahan */}
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', margin: 0, minHeight: '22px', display: 'flex', alignItems: 'center' }}>
                Diskon Tambahan Nota (Rp)
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="number"
                  value={diskonTambahan}
                  onChange={(e) => setDiskonTambahan(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    height: '42px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#FFF',
                    padding: '0 12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Potongan nominal khusus langsung ke total nota.
              </span>
            </div>

            {/* Column 2: Voucher Promo Toko */}
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)', margin: 0, minHeight: '22px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Ticket size={14} /> Voucher Promo Toko
              </label>
              {appliedVoucher ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid #10B981',
                    borderRadius: '8px',
                    height: '42px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <strong style={{ color: '#065F46', fontSize: '12px', letterSpacing: '0.5px' }}>🎟️ {appliedVoucher.code}</strong>
                    <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                      (-Rp {voucherDiscount.toLocaleString('id-ID')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      padding: '4px 6px',
                      flexShrink: 0
                    }}
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="KODE VOUCHER"
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                    style={{
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      height: '42px',
                      flex: 1,
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#FFF',
                      padding: '0 12px',
                      fontSize: '12.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleApplyVoucher()}
                    style={{
                      height: '42px',
                      padding: '0 14px',
                      whiteSpace: 'nowrap',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      flexShrink: 0
                    }}
                  >
                    Gunakan
                  </button>
                </div>
              )}
              {vouchers.filter(v => v.active).length > 0 && !appliedVoucher && (
                <select
                  onChange={(e) => {
                    if (e.target.value) handleApplyVoucher(e.target.value);
                  }}
                  defaultValue=""
                  style={{
                    height: '34px',
                    fontSize: '11px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: '#FFF',
                    color: 'var(--text-muted)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Atau Pilih Promo Aktif Toko --</option>
                  {vouchers.filter(v => v.active).map(v => (
                    <option key={v.id} value={v.code}>
                      {v.code} - {v.type === 'nominal' ? `Potongan Rp ${v.value.toLocaleString('id-ID')}` : `Diskon ${v.value}%`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Column 3: DP / Dibayar Saat Ini */}
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '22px', flexWrap: 'wrap', gap: '4px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  DP / Dibayar (Rp)
                </label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 7px', fontSize: '10px', fontWeight: 700, borderRadius: '5px', lineHeight: '1.2' }}
                    onClick={() => {
                      setDibayar(grandTotal);
                      if (!bayarNote && paymentMethods.length > 0) setBayarNote(paymentMethods[0]);
                    }}
                  >
                    Lunas
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 7px', fontSize: '10px', fontWeight: 700, borderRadius: '5px', lineHeight: '1.2' }}
                    onClick={() => {
                      setDibayar(Math.round(grandTotal / 2));
                      if (!bayarNote && paymentMethods.length > 0) setBayarNote(paymentMethods[0]);
                    }}
                  >
                    DP 50%
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 7px', fontSize: '10px', fontWeight: 700, borderRadius: '5px', lineHeight: '1.2' }}
                    onClick={() => setDibayar(0)}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <input
                type="number"
                value={dibayar}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setDibayar(val);
                  if (val > 0 && !bayarNote && paymentMethods.length > 0) {
                    setBayarNote(paymentMethods[0]);
                  }
                }}
                style={{
                  width: '100%',
                  height: '42px',
                  borderColor: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--primary)',
                  background: '#FFF',
                  padding: '0 12px',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {dibayar >= grandTotal && grandTotal > 0 ? (
                  <b style={{ color: '#059669' }}>✅ Status Pembayaran: LUNAS</b>
                ) : dibayar > 0 ? (
                  <b style={{ color: '#D97706' }}>⏳ Status Pembayaran: DP / Uang Muka</b>
                ) : (
                  <span>Belum ada pembayaran masuk.</span>
                )}
              </span>
            </div>

            {/* Column 4: Metode Pembayaran */}
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)', margin: 0, minHeight: '22px', display: 'flex', alignItems: 'center' }}>
                Metode Pembayaran
              </label>
              <select
                value={bayarNote}
                onChange={(e) => setBayarNote(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: '#FFF',
                  padding: '0 12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">-- Pilih Metode Pembayaran --</option>
                {paymentMethods.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Tercetak pada struk & invoice nota pelanggan.
              </span>
            </div>
          </div>

          {/* Calculations Summary Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Subtotal Barang:</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Rp {subtotalSum.toLocaleString('id-ID')}
                </span>
              </div>
              {diskonTambahan > 0 && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Potongan Diskon:</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444' }}>
                    - Rp {diskonTambahan.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Voucher ({voucherCodeInput}):</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>
                    - Rp {voucherDiscount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Grand Total Nota:</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                  Rp {grandTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <div style={{ width: '1px', height: '36px', background: 'var(--border-color)' }} />

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Sisa Belum Dibayar:</span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: sisaTertagih > 0 ? '#EF4444' : '#10B981',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Rp {sisaTertagih.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons & Static Bottom Bar */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Total Tagihan Nota</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                Rp {grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Sisa Tagihan</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: sisaTertagih > 0 ? '#EF4444' : '#10B981' }}>
                Rp {sisaTertagih.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {editingInvoice && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onCancelEdit}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
              >
                <X size={16} /> Batal Edit
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '13.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px',
                boxShadow: '0 4px 14px rgba(0,82,255,0.22)'
              }}
            >
              <Save size={18} /> Simpan Transaksi Ke Cloud
            </button>
          </div>
        </div>
      </form>

      {/* AI Scan Nota Modal */}
      <AIScanModal
        isOpen={isAiScanOpen}
        onClose={() => setIsAiScanOpen(false)}
        onApplyData={handleApplyAiData}
        showToast={showToast}
      />

      {/* Finishing Selector Modal */}
      {finishingModalIdx !== null && items[finishingModalIdx] && (() => {
        const item = items[finishingModalIdx];
        const matchedProd = products.find(
          (p) => p.id === item.prodId || p.id === item.productId || (item.nama && p.nama.trim().toLowerCase() === item.nama.trim().toLowerCase())
        );
        const basePrice = item.baseHarga !== undefined && item.baseHarga > 0 ? item.baseHarga : (item.harga || 0);
        const applicableGroups = getApplicableFinishingGroups(matchedProd?.kategori, matchedProd?.finishingGroupIds, allFinishingGroups);
        const effectiveGroups = applicableGroups.length > 0 ? applicableGroups : allFinishingGroups;

        return (
          <FinishingSelectorModal
            isOpen={true}
            onClose={() => setFinishingModalIdx(null)}
            item={item}
            itemIndex={finishingModalIdx}
            applicableGroups={effectiveGroups}
            onApply={(idx, selected, newPrice, summary) => {
              handleApplyFinishingToItem(idx, selected, newPrice, summary);
            }}
          />
        );
      })()}

      {/* Datalists for Autocomplete */}
      <datalist id="list-satuan-umum">
        <option value="Pcs" />
        <option value="m²" />
        <option value="Meter" />
        <option value="cm" />
        <option value="Lembar" />
        <option value="Buku" />
        <option value="Box" />
        <option value="Paket" />
        <option value="Roll" />
      </datalist>
    </div>
  );
};
