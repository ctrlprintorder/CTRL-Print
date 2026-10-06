import React, { useState } from 'react';
import {
  Search,
  CreditCard,
  RefreshCw,
  Download,
  Edit3,
  Trash2,
  FileText,
  Truck,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  FileSpreadsheet,
  Copy,
  Clock,
  Mail,
  Tag,
  Send,
  Check
} from 'lucide-react';
import { Invoice, Settings, Counters } from '../types';
import { saveDocument, deleteDocument, saveCounters, isInvoiceMatch } from '../firebaseService';
import {
  openWhatsApp,
  getInvoiceWaMessage,
  getReadyOrderWaMessage,
  getAccDesainWaMessage,
  getFollowUpPiutangWaMessage
} from '../utils/whatsapp';
import { sendCustomerInvoiceEmail } from '../services/gmailService';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';
import { SortableHeader } from './SortableHeader';
import { GoogleDrivePreviewEmbed } from './GoogleDrivePreviewEmbed';
import { Table as TableIcon } from 'lucide-react';
import { getGoogleAccessToken, appendSheetValues, requestGoogleAccessToken } from '../lib/googleWorkspace';
import { generateUniqueInvoiceNumber } from '../utils/idGenerator';

interface RiwayatJobProps {
  invoices: Invoice[];
  counters?: Counters;
  settings: Settings;
  onEditInvoice: (inv: Invoice) => void;
  onPrintDoc: (tipe: 'A5' | 'TH' | 'DO' | 'LABEL', inv: Invoice) => void;
  showToast: (msg: string, isErr?: boolean) => void;
  initialSearchTerm?: string;
}

export const RiwayatJob: React.FC<RiwayatJobProps> = ({
  invoices,
  counters,
  settings,
  onEditInvoice,
  onPrintDoc,
  showToast,
  initialSearchTerm
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDocTypeTab, setActiveDocTypeTab] = useState<'all' | 'sales' | 'penawaran' | 'web'>('all');
  const [statusBayarFilter, setStatusBayarFilter] = useState<'all' | 'lunas' | 'sebagian' | 'unpaid'>('all');

  // Sorting State
  const [sortKey, setSortKey] = useState<string>('tglInv');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const itemsPerPage = 10;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Detail Multi-Payment History Modal
  const [historyModalInv, setHistoryModalInv] = useState<Invoice | null>(null);

  const isWebOrder = (inv: Invoice) => {
    if (inv.tipeDoc === 'WebOrder') return true;
    if ((inv.noInv.startsWith('WEB-') || inv.noInv.startsWith('ORD-')) && !inv.isWebVerified) return true;
    return false;
  };

  const isQuotation = (inv: Invoice) => {
    return inv.tipeDoc === 'Quotation';
  };

  const isSalesInvoice = (inv: Invoice) => {
    return !isWebOrder(inv) && !isQuotation(inv);
  };

  const countSales = invoices.filter(isSalesInvoice).length;
  const countPenawaran = invoices.filter(isQuotation).length;
  const countWeb = invoices.filter(isWebOrder).length;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Modal Payment
  const [payModalInv, setPayModalInv] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<string>('Transfer BCA');
  const [payBuktiUrl, setPayBuktiUrl] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('');

  // WhatsApp Template Modal State
  const [waModalInv, setWaModalInv] = useState<Invoice | null>(null);
  const [buktiBayarModalUrl, setBuktiBayarModalUrl] = useState<string | null>(null);

  // Gmail Invoice Modal State
  const [emailModalInv, setEmailModalInv] = useState<Invoice | null>(null);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailCustomMsg, setEmailCustomMsg] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch = !searchTerm || isInvoiceMatch(inv, searchTerm);
    if (!matchSearch) return false;

    if (activeDocTypeTab === 'sales' && !isSalesInvoice(inv)) return false;
    if (activeDocTypeTab === 'penawaran' && !isQuotation(inv)) return false;
    if (activeDocTypeTab === 'web' && !isWebOrder(inv)) return false;

    if (statusBayarFilter === 'lunas') {
      if (inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas' && (inv.sisaTertagih || 0) > 0) return false;
    } else if (statusBayarFilter === 'sebagian') {
      if (inv.statusBayar !== 'DP' && inv.statusBayar !== 'Sebagian' && (inv.dibayar <= 0 || inv.sisaTertagih <= 0)) return false;
    } else if (statusBayarFilter === 'unpaid') {
      if (inv.statusBayar === 'Paid' || inv.statusBayar === 'Lunas' || (inv.sisaTertagih || 0) <= 0) return false;
    }

    return true;
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof Invoice] || '';
    let bVal: any = b[sortKey as keyof Invoice] || '';

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return showToast('Tidak ada data penjualan untuk di-export', true);
    
    const headers = ['No Invoice', 'Tipe Dokumen', 'Tanggal', 'Nama Customer', 'WA Customer', 'Status Job', 'Status Bayar', 'Grand Total', 'Dibayar', 'Sisa Tagihan'];
    const rows = filteredInvoices.map((inv) => [
      `"${inv.noInv}"`,
      `"${inv.tipeDoc}"`,
      `"${inv.tglInv}"`,
      `"${inv.namaCust.replace(/"/g, '""')}"`,
      `"${inv.waCust}"`,
      `"${inv.statusJob}"`,
      `"${inv.statusBayar}"`,
      inv.grandTotal || 0,
      inv.dibayar || 0,
      inv.sisaTertagih || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Berhasil export ${filteredInvoices.length} data penjualan ke CSV!`);
  };

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const pageInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(pageInvoices.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleStatusJobChange = async (inv: Invoice, newStatus: string) => {
    const updated = { ...inv, statusJob: newStatus };
    await saveDocument('invoice', updated);
    showToast(`Status Job ${inv.noInv} diubah ke ${newStatus}`);
  };

  const handleDelete = async (inv: Invoice) => {
    if (confirm(`Hapus permanen nota ${inv.noInv}?`)) {
      await deleteDocument('invoice', inv.id);
      showToast('Transaksi Berhasil Dihapus!');
    }
  };

  const handleConvertQuote = async (inv: Invoice) => {
    if (confirm(`Konversi Penawaran ${inv.noInv} ke Sales Invoice?`)) {
      const updated: Invoice = {
        ...inv,
        tipeDoc: 'Invoice'
      };
      await saveDocument('invoice', updated);
      showToast('Penawaran Berhasil Dikonversi ke Sales Invoice!');
    }
  };

  const handleVerifyWebOrder = async (inv: Invoice) => {
    if (confirm(`Verifikasi & Konversi Order Web ${inv.noInv} ke Sales Invoice Resmi?`)) {
      const updated: Invoice = {
        ...inv,
        tipeDoc: 'Invoice',
        isWebVerified: true,
        statusJob: inv.statusJob === 'Menunggu Verifikasi' ? 'Pending' : inv.statusJob
      };
      await saveDocument('invoice', updated);
      showToast(`Order Web ${inv.noInv} Berhasil Diverifikasi & Masuk ke Sales Invoice!`);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setPayModalInv(inv);
    setPayAmount(inv.sisaTertagih || 0);
    setPayDate(new Date().toISOString().split('T')[0]);
    const methods = (settings.paymentMethods || '').split(/,|\n/).map((s) => s.trim()).filter(Boolean);
    setPayMethod(methods[0] || 'Transfer BCA');
    setPayNote('');
    setPayBuktiUrl(inv.buktiBayarUrl || '');
  };

  const handleSavePayment = async () => {
    if (!payModalInv || payAmount <= 0) return showToast('Nominal pembayaran tidak valid', true);

    const dibayarNew = (payModalInv.dibayar || 0) + payAmount;
    const sisaNew = Math.max(payModalInv.grandTotal - dibayarNew, 0);
    const statusNew = sisaNew <= 0 ? 'Paid' : 'Partial';

    const historyNew = [
      ...(payModalInv.historyBayar || []),
      {
        tgl: payDate || new Date().toISOString().split('T')[0],
        nominal: payAmount,
        metode: payMethod,
        note: payNote,
        buktiUrl: payBuktiUrl || undefined
      }
    ];

    const updated: Invoice = {
      ...payModalInv,
      dibayar: dibayarNew,
      sisaTertagih: sisaNew,
      statusBayar: statusNew,
      historyBayar: historyNew,
      bayarNote: payMethod || payModalInv.bayarNote,
      buktiBayarUrl: payBuktiUrl || payModalInv.buktiBayarUrl,
      tglBuktiBayar: payDate
    };

    await saveDocument('invoice', updated);
    showToast(`Pembayaran ${formatRupiah(payAmount)} (${payMethod}) berhasil dicatat!`);
    setPayModalInv(null);

    if (confirm(`Pembayaran berhasil dicatat. Buat Draf WA Konfirmasi Pembayaran Ke Customer?`)) {
      handleKirimWA(updated);
    }
  };

  const handleDeletePaymentItem = async (payIndex: number) => {
    if (!historyModalInv) return;
    if (!window.confirm('Yakin ingin menghapus catatan riwayat pembayaran ini?')) return;

    try {
      const currentHistory = historyModalInv.historyBayar || [];
      const newHistory = currentHistory.filter((_, idx) => idx !== payIndex);
      const newDibayar = newHistory.reduce((sum, item) => sum + (item.nominal || 0), 0);
      const grandTotal = historyModalInv.grandTotal || 0;
      const newSisa = Math.max(grandTotal - newDibayar, 0);

      let newStatusBayar = newSisa <= 0 ? 'Paid' : (newDibayar > 0 ? 'Partial' : 'Unpaid');

      const updatedInv: Invoice = {
        ...historyModalInv,
        historyBayar: newHistory,
        dibayar: newDibayar,
        sisaTertagih: newSisa,
        statusBayar: newStatusBayar
      };

      await saveDocument('invoice', updatedInv);
      setHistoryModalInv(updatedInv);
      showToast('Catatan riwayat pembayaran berhasil dihapus!');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus riwayat pembayaran!', true);
    }
  };

  const handleKirimWA = (inv: Invoice) => {
    if (!inv.waCust) return showToast('Nomor WA Pelanggan tidak ada!', true);
    let cleanWa = inv.waCust.replace(/[^0-9]/g, '');
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);

    const isLunas = inv.statusBayar === 'Paid' || inv.statusBayar === 'Lunas' || (inv.sisaTertagih || 0) <= 0;

    let msg = `*${settings.company || 'CTRL PRINT'}*\n\n`;
    msg += `Halo *${inv.namaCust}* 👋,\nBerikut rincian & pembaruan status ${inv.tipeDoc} *#${inv.noInv}*:\n\n`;
    msg += `*Rincian Pesanan:*\n`;
    (inv.items || []).forEach((item, idx) => {
      msg += `${idx + 1}. ${item.nama} ${item.desc ? '(' + item.desc + ')' : ''} x${item.qty} ${item.satuan} = ${formatRupiah(item.subtotal)}\n`;
    });
    msg += `\n• *Total Tagihan:* ${formatRupiah(inv.grandTotal)}\n`;
    msg += `• *Total Dibayar:* ${formatRupiah(inv.dibayar)}\n`;
    
    if (isLunas) {
      msg += `• *Status Pembayaran:* LUNAS ✅ (Terima kasih atas pelunasannya!)\n`;
    } else {
      msg += `• *Sisa Tagihan:* ${formatRupiah(Math.max(inv.sisaTertagih || 0, 0))}\n`;
      msg += `• *Status Pembayaran:* ${inv.statusBayar || 'Belum Lunas'}\n`;
    }
    msg += `• *Status Pengerjaan:* ${inv.statusJob || 'Pending'}\n`;
    if (inv.estimasiPengerjaan) {
      msg += `• *Estimasi Selesai:* ${inv.estimasiPengerjaan}\n`;
    }

    const trackingUrl = `${window.location.origin}${window.location.pathname}?inv=${inv.noInv}`;
    msg += `\n*Lacak Status Cetak Real-Time & Download Nota:* \n${trackingUrl}\n\n`;

    // Only attach bank account details IF NOT LUNAS!
    if (!isLunas && settings.bank) {
      msg += `*Info Pembayaran Resmi:*\n${settings.bank}\n\n`;
    }

    msg += `Terima kasih! 🙏`;

    openWhatsApp(inv.waCust, msg);
  };

  const handleSendWaTemplate = (inv: Invoice, type: 'invoice' | 'ready' | 'acc' | 'piutang') => {
    if (!inv.waCust) return showToast('Nomor WA Pelanggan tidak ada!', true);
    let message = '';
    if (type === 'invoice') {
      message = getInvoiceWaMessage(inv, settings);
    } else if (type === 'ready') {
      message = getReadyOrderWaMessage(inv, settings);
    } else if (type === 'acc') {
      message = getAccDesainWaMessage(inv, settings);
    } else if (type === 'piutang') {
      message = getFollowUpPiutangWaMessage(inv, settings);
    }
    openWhatsApp(inv.waCust, message);
    setWaModalInv(null);
  };

  const handleOpenEmailModal = (inv: Invoice) => {
    setEmailModalInv(inv);
    setEmailTo(inv.emailCust || '');
    setEmailCustomMsg('');
  };

  const handleSendInvoiceEmail = async () => {
    if (!emailModalInv) return;
    if (!emailTo || !emailTo.includes('@')) {
      return showToast('Masukkan alamat email tujuan yang valid!', true);
    }
    setIsSendingEmail(true);
    try {
      await sendCustomerInvoiceEmail({
        toEmail: emailTo,
        invoice: emailModalInv,
        settings,
        customMessage: emailCustomMsg
      });
      showToast(`Faktur ${emailModalInv.noInv} berhasil dikirim ke ${emailTo}!`);
      setEmailModalInv(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal mengirim email faktur!', true);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Bulk Actions
  const handleBulkPay = async () => {
    if (confirm(`Lunaskan ${selectedIds.length} transaksi terpilih?`)) {
      for (const id of selectedIds) {
        const inv = invoices.find((x) => x.id === id);
        if (inv && inv.sisaTertagih > 0) {
          const updated: Invoice = {
            ...inv,
            dibayar: inv.grandTotal,
            sisaTertagih: 0,
            statusBayar: 'Paid',
            historyBayar: [
              ...(inv.historyBayar || []),
              {
                tgl: new Date().toISOString().split('T')[0],
                nominal: inv.sisaTertagih,
                note: 'Pelunasan Masal'
              }
            ]
          };
          await saveDocument('invoice', updated);
        }
      }
      setSelectedIds([]);
      showToast('Transaksi Terpilih Berhasil Dilunaskan!');
    }
  };

  const handleBulkStatus = async () => {
    const stat = prompt('Status Job Baru (Pending/Desain/Produksi/Finishing/Siap Kirim/Selesai):', 'Selesai');
    if (stat) {
      for (const id of selectedIds) {
        const inv = invoices.find((x) => x.id === id);
        if (inv) {
          await saveDocument('invoice', { ...inv, statusJob: stat });
        }
      }
      setSelectedIds([]);
      showToast(`Status Job ${selectedIds.length} transaksi diubah ke ${stat}`);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedIds.length} transaksi/invoice terpilih?`)) {
      for (const id of selectedIds) {
        await deleteDocument('invoice', id);
      }
      setSelectedIds([]);
      showToast(`${selectedIds.length} transaksi berhasil dihapus.`);
    }
  };

  const handleDuplicateInvoice = async (inv: Invoice) => {
    try {
      const isQuote = inv.tipeDoc === 'Quotation' || isQuotation(inv);
      const docType = isQuote ? 'Quotation' : (isWebOrder(inv) ? 'WebOrder' : 'Invoice');
      const startCounter = docType === 'Quotation'
        ? (counters?.nextQuoteNumber || 1)
        : (docType === 'WebOrder' ? (counters?.nextWebInvNumber || 1) : (counters?.nextInvNumber || counters?.nextInvoiceNumber || 1));

      const { number: nextInvNo, nextCounter } = generateUniqueInvoiceNumber(docType, invoices, startCounter);
      
      // Clone items without reference issues
      const clonedItems = (inv.items || []).map((item) => ({ ...item }));

      const newInv: Invoice = {
        ...inv,
        id: String(Date.now()),
        tipeDoc: docType,
        noInv: nextInvNo,
        tglInv: new Date().toISOString().split('T')[0],
        items: clonedItems,
        dibayar: 0,
        sisaTertagih: inv.grandTotal,
        statusBayar: 'Unpaid',
        statusJob: 'Pending',
        historyBayar: []
      };

      // Omit proof fields
      delete (newInv as any).buktiBayarUrl;
      delete (newInv as any).tglBuktiBayar;
      delete (newInv as any).catatanBuktiBayar;

      await saveDocument('invoice', newInv);
      if (counters) {
        await saveCounters({
          ...counters,
          ...(docType === 'Quotation'
            ? { nextQuoteNumber: nextCounter }
            : docType === 'WebOrder'
            ? { nextWebInvNumber: nextCounter }
            : { nextInvNumber: nextCounter, nextInvoiceNumber: nextCounter })
        });
      }
      showToast(`Pesanan ${inv.noInv} berhasil diduplikat menjadi nomor unik ${nextInvNo}!`);
    } catch (err) {
      console.error('Failed to duplicate invoice:', err);
      showToast('Gagal menduplikat invoice', true);
    }
  };

  const handleBulkSyncGoogleSheets = async () => {
    if (selectedIds.length === 0) return;
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        token = await requestGoogleAccessToken();
      }
      if (!settings.googleSpreadsheetId) {
        showToast('ID Google Spreadsheet belum diatur di menu Pengaturan!', true);
        return;
      }

      showToast(`Menyinkronkan ${selectedIds.length} transaksi ke Google Sheets...`);
      const rows: any[][] = [];
      selectedIds.forEach((id) => {
        const inv = invoices.find((x) => x.id === id);
        if (inv) {
          const itemSummary = (inv.items || []).map(it => `${it.nama} (${it.qty} ${it.satuan})`).join(', ');
          rows.push([
            inv.noInv,
            inv.tglInv,
            inv.namaCust,
            inv.waCust || '-',
            inv.grandTotal,
            inv.dibayar,
            inv.sisaTertagih,
            inv.statusBayar,
            inv.statusJob,
            itemSummary
          ]);
        }
      });

      await appendSheetValues(token, settings.googleSpreadsheetId, 'Rekap Penjualan!A:J', rows);
      showToast(`Sukses! ${selectedIds.length} transaksi berhasil disinkronkan ke Google Sheets.`);
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      showToast(err.message || 'Gagal menyinkronkan data ke Google Sheets.', true);
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedIds.length === 0) return;
    let csv = 'data:text/csv;charset=utf-8,No Nota,Tipe,Tgl,Pelanggan,Total,Dibayar,Sisa,Status Bayar,Status Job\n';
    selectedIds.forEach((id) => {
      const inv = invoices.find((x) => x.id === id);
      if (inv) {
        csv += `"${inv.noInv}","${inv.tipeDoc}","${inv.tglInv}","${inv.namaCust}",${inv.grandTotal},${inv.dibayar},${inv.sisaTertagih},"${inv.statusBayar}","${inv.statusJob}"\n`;
      }
    });
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `Export_Penjualan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getJobColor = (status: string) => {
    switch (status) {
      case 'Menunggu Verifikasi': return { bg: '#FEF3C7', text: '#B45309' };
      case 'Pending': return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Desain': return { bg: '#FEF3C7', text: '#92400E' };
      case 'Produksi': return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'Finishing': return { bg: '#E0E7FF', text: '#3730A3' };
      case 'Siap Kirim': return { bg: '#D1FAE5', text: '#065F46' };
      case 'Selesai': return { bg: '#ECFDF5', text: '#047857' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Header & Search Control Bar */}
      <div className="card-title" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Data Penjualan & Job Board Status</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: '420px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: '34px', width: '100%', height: '38px', borderRadius: '10px' }}
                placeholder="Cari Nota / Pelanggan / WA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleExportCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10B981', borderColor: '#10B981', fontWeight: 700, height: '38px', borderRadius: '10px', padding: '0 12px' }}
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Category Tabs & Status Filter Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', width: '100%' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn btn-sm ${activeDocTypeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setActiveDocTypeTab('all'); setCurrentPage(1); }}
              style={{ borderRadius: '8px' }}
            >
              Semua ({invoices.length})
            </button>
            <button
              className={`btn btn-sm ${activeDocTypeTab === 'sales' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setActiveDocTypeTab('sales'); setCurrentPage(1); }}
              style={{
                borderRadius: '8px',
                borderColor: activeDocTypeTab === 'sales' ? 'var(--primary)' : 'var(--border-color)',
                background: activeDocTypeTab === 'sales' ? 'var(--primary)' : 'transparent',
                color: activeDocTypeTab === 'sales' ? '#FFF' : 'var(--text-main)'
              }}
            >
              🧾 Sales Invoice ({countSales})
            </button>
            <button
              className={`btn btn-sm ${activeDocTypeTab === 'penawaran' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setActiveDocTypeTab('penawaran'); setCurrentPage(1); }}
              style={{
                borderRadius: '8px',
                borderColor: activeDocTypeTab === 'penawaran' ? '#F59E0B' : 'var(--border-color)',
                background: activeDocTypeTab === 'penawaran' ? '#F59E0B' : 'transparent',
                color: activeDocTypeTab === 'penawaran' ? '#FFF' : 'var(--text-main)'
              }}
            >
              📄 Penawaran ({countPenawaran})
            </button>
            <button
              className={`btn btn-sm ${activeDocTypeTab === 'web' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setActiveDocTypeTab('web'); setCurrentPage(1); }}
              style={{
                borderRadius: '8px',
                borderColor: activeDocTypeTab === 'web' ? '#2563EB' : 'var(--border-color)',
                background: activeDocTypeTab === 'web' ? '#2563EB' : 'transparent',
                color: activeDocTypeTab === 'web' ? '#FFF' : 'var(--text-main)'
              }}
            >
              🌐 Portal Pelanggan ({countWeb})
            </button>
          </div>

          {/* Quick Pay Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
            <button
              type="button"
              className={`btn btn-sm ${statusBayarFilter === 'all' ? 'btn-secondary' : 'btn-outline'}`}
              onClick={() => setStatusBayarFilter('all')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
            >
              Semua
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusBayarFilter === 'lunas' ? 'btn-success' : 'btn-outline'}`}
              onClick={() => setStatusBayarFilter('lunas')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
            >
              Lunas
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusBayarFilter === 'sebagian' ? 'btn-warning' : 'btn-outline'}`}
              onClick={() => setStatusBayarFilter('sebagian')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
            >
              DP
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusBayarFilter === 'unpaid' ? 'btn-danger' : 'btn-outline'}`}
              onClick={() => setStatusBayarFilter('unpaid')}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
            >
              Belum Lunas
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            display: 'flex',
            background: 'var(--primary-light)',
            border: '1px solid var(--primary)',
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <strong style={{ color: 'var(--primary)', fontSize: '12px' }}>
            Aksi Terpilih ({selectedIds.length} Item):
          </strong>
          <button className="btn btn-success btn-sm" onClick={handleBulkPay}>
            <CreditCard size={14} /> Lunaskan Masal
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleBulkStatus}>
            <RefreshCw size={14} /> Update Status Job
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleBulkExportCSV}>
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button
            className="btn btn-sm"
            onClick={handleBulkSyncGoogleSheets}
            style={{ background: '#0F9D58', color: '#FFF', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
            title="Kirim dan catat seluruh invoice terpilih ke Google Spreadsheet"
          >
            <TableIcon size={14} /> Sync ke Google Sheets
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleBulkDelete}
            style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)', fontWeight: 600, marginLeft: 'auto' }}
          >
            <Trash2 size={14} /> Hapus Terpilih ({selectedIds.length})
          </button>
        </div>
      )}

      {/* Responsive Data Table */}
      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '32px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  checked={selectedIds.length > 0 && selectedIds.length === pageInvoices.length}
                />
              </th>
              <SortableHeader label="Nota / Tgl" sortKey="noInv" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Pelanggan" sortKey="namaCust" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Total & Sisa" sortKey="grandTotal" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status Bayar & Job" sortKey="statusJob" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Tidak ada data transaksi yang sesuai filter.
                </td>
              </tr>
            ) : (
              pageInvoices.map((inv) => {
                const jobCol = getJobColor(inv.statusJob);
                const hasProofing = inv.proofingApproved !== undefined || (inv.items && inv.items.some(i => i.fileDesignUrl));

                return (
                  <tr key={inv.id} style={{ position: 'relative', zIndex: activeDropdownId === inv.id ? 100 : 'auto' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(inv.id)}
                        onChange={() => toggleSelectOne(inv.id)}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="nota-preview-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPrintDoc('A5', inv);
                        }}
                        title={`Klik untuk Pratinjau & Cetak Dokumen Nota ${inv.noInv}`}
                      >
                        {inv.noInv}
                      </button>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{formatDate(inv.tglInv)}</small>
                      {inv.estimasiPengerjaan && (
                        <div style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>⏱️</span> {inv.estimasiPengerjaan}
                        </div>
                      )}
                    </td>
                    <td className="col-truncate-md">
                      <strong style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.namaCust}</strong>
                      {inv.waCust && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {inv.waCust}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span
                          className={`badge ${
                            isWebOrder(inv)
                              ? 'badge-warning'
                              : isQuotation(inv)
                              ? 'badge-quote'
                              : 'badge-paid'
                          }`}
                          style={{
                            background: isWebOrder(inv) ? '#DBEAFE' : undefined,
                            color: isWebOrder(inv) ? '#1E40AF' : undefined,
                            fontWeight: 700
                          }}
                        >
                          {isWebOrder(inv)
                            ? 'Order Web (Portal)'
                            : isQuotation(inv)
                            ? 'Penawaran'
                            : 'Sales Invoice'}
                        </span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{formatRupiah(inv.grandTotal)}</strong>
                      <br />
                      <small style={{ color: (inv.sisaTertagih || 0) > 0 ? 'var(--danger)' : '#10B981', fontWeight: 700 }}>
                        {(inv.sisaTertagih || 0) > 0 ? `Sisa: ${formatRupiah(inv.sisaTertagih)}` : 'Lunas (Rp 0)'}
                      </small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {(() => {
                          const isPaid = inv.statusBayar === 'Paid' || inv.statusBayar === 'Lunas' || (inv.sisaTertagih || 0) <= 0;
                          return (
                            <button
                              type="button"
                              className={`badge badge-${(inv.statusBayar || 'unpaid').toLowerCase()}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPaid) {
                                  setHistoryModalInv(inv);
                                } else {
                                  openPaymentModal(inv);
                                }
                              }}
                              title={
                                isPaid
                                  ? `Status: ${inv.statusBayar} (Lunas) • Klik untuk Lihat Riwayat Pembayaran`
                                  : `Status: ${inv.statusBayar} • Klik untuk Buka Form Terima Pembayaran`
                              }
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                                userSelect: 'none',
                                outline: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.filter = 'brightness(0.95)';
                                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.filter = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {isPaid ? (
                                <CheckCircle2 size={11} strokeWidth={2.5} />
                              ) : (
                                <CreditCard size={11} strokeWidth={2} />
                              )}
                              <span>{inv.statusBayar}</span>
                            </button>
                          );
                        })()}
                        {inv.buktiBayarUrl && (
                          <button
                            type="button"
                            onClick={() => setBuktiBayarModalUrl(inv.buktiBayarUrl || null)}
                            title="Klik untuk Lihat Foto Resi/Bukti Bayar Pelanggan"
                            style={{
                              background: '#10B981',
                              color: '#FFF',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <CreditCard size={10} /> Resi QRIS/Transfer
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                        {inv.statusJob && inv.statusJob !== 'Selesai' ? (
                          <span className="status-live-dot" style={{ background: jobCol.text, width: '6px', height: '6px', flexShrink: 0 }} title="Pengerjaan Aktif" />
                        ) : (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block', flexShrink: 0 }} />
                        )}
                        <select
                          value={inv.statusJob}
                          onChange={(e) => handleStatusJobChange(inv, e.target.value)}
                          style={{
                            width: '100%',
                            minWidth: '110px',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: jobCol.bg,
                            color: jobCol.text
                          }}
                        >
                          {['Menunggu Verifikasi', 'Pending', 'Desain', 'Produksi', 'Finishing', 'Siap Kirim', 'Selesai'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="dropdown">
                        <button
                          className="btn-kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeDropdownId === inv.id && (
                          <div className="dropdown-content show" style={{ minWidth: '220px', padding: '6px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px 2px 8px', letterSpacing: '0.5px' }}>
                              💬 Komunikasi Customer
                            </div>
                          <button onClick={() => { setActiveDropdownId(null); setWaModalInv(inv); }} style={{ color: '#059669', fontWeight: 700 }}>
                            <MessageSquare size={14} color="#10B981" /> Template WhatsApp (4 Pilihan)
                          </button>
                          <button onClick={() => { setActiveDropdownId(null); handleOpenEmailModal(inv); }} style={{ color: '#EA4335', fontWeight: 600 }}>
                            <Mail size={14} color="#EA4335" /> Kirim Faktur via Gmail
                          </button>

                          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 8px 2px 8px', borderTop: '1px solid var(--border-color)', marginTop: '4px', letterSpacing: '0.5px' }}>
                            ⚙️ Kelola Transaksi
                          </div>
                          <button onClick={() => { setActiveDropdownId(null); onEditInvoice(inv); }}>
                            <Edit3 size={14} /> Edit Transaksi
                          </button>
                          <button onClick={() => { setActiveDropdownId(null); handleDuplicateInvoice(inv); }} style={{ color: '#2563EB', fontWeight: 600 }}>
                            <Copy size={14} /> Duplikat Invoice / Pesanan
                          </button>
                          {isQuotation(inv) && (
                            <button onClick={() => { setActiveDropdownId(null); handleConvertQuote(inv); }} style={{ color: '#2563EB', fontWeight: 700 }}>
                              <RefreshCw size={14} /> Convert Ke Sales Invoice
                            </button>
                          )}
                          {isWebOrder(inv) && (
                            <button onClick={() => { setActiveDropdownId(null); handleVerifyWebOrder(inv); }} style={{ color: '#10B981', fontWeight: 700 }}>
                              <CheckCircle2 size={14} /> Verifikasi Order Web
                            </button>
                          )}
                          <button onClick={() => { setActiveDropdownId(null); handleDelete(inv); }} style={{ color: 'var(--danger)', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
                            <Trash2 size={14} /> Hapus Permanen
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
        <button
          className="btn btn-outline btn-sm"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
          Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
        </span>
        <button
          className="btn btn-outline btn-sm"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Modal Payment */}
      {payModalInv && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '12px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '420px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div className="card-title" style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
                <CreditCard size={18} color="#10B981" /> Terima Pembayaran ({payModalInv.noInv})
              </span>
              <button className="btn-link" onClick={() => setPayModalInv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pelanggan:</span>
                <strong>{payModalInv.namaCust}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Tagihan:</span>
                <strong>{formatRupiah(payModalInv.grandTotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: (payModalInv.sisaTertagih || 0) > 0 ? '#EF4444' : '#10B981', fontWeight: 700 }}>
                <span>Sisa Tertagih:</span>
                <span>{formatRupiah(payModalInv.sisaTertagih || 0)}</span>
              </div>
              {(payModalInv.historyBayar && payModalInv.historyBayar.length > 0) && (
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const inv = payModalInv;
                      setPayModalInv(null);
                      setHistoryModalInv(inv);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Clock size={12} /> Lihat {payModalInv.historyBayar.length} Riwayat Pembayaran Sebelumnya
                  </button>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Tanggal Pembayaran</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Nominal Pembayaran (Rp)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                style={{ fontWeight: 'bold', fontSize: '15px', color: '#10B981' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Metode Pembayaran</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '13px' }}
              >
                {(() => {
                  const opts = (settings.paymentMethods || '').split(/,|\n/).map((s) => s.trim()).filter(Boolean);
                  const defaultOpts = opts.length > 0 ? opts : ['Transfer BCA', 'Cash / Tunai', 'QRIS', 'Transfer Mandiri', 'Transfer BRI', 'Transfer BNI', 'Lainnya'];
                  return defaultOpts.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ));
                })()}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Bukti Pembayaran (Link Google Drive / URL Gambar)</label>
              <input
                type="text"
                value={payBuktiUrl}
                onChange={(e) => setPayBuktiUrl(e.target.value)}
                placeholder="https://drive.google.com/file/... atau URL Gambar"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Catatan Pembayaran (Opsional)</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Misal: Pelunasan DP / Titip Kasir"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setPayModalInv(null)}>Batal</button>
              <button className="btn btn-success" onClick={handleSavePayment} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Konfirmasi Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Bukti Transfer / Resi Pelanggan */}
      {buktiBayarModalUrl && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '580px', border: '1px solid var(--border-color)' }}>
            <div className="card-title" style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                <CreditCard size={18} color="#10B981" /> Bukti Pembayaran / Resi Transfer Pelanggan
              </span>
              <button className="btn-link" onClick={() => setBuktiBayarModalUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ width: '100%', marginBottom: '14px' }}>
              <GoogleDrivePreviewEmbed
                url={buktiBayarModalUrl}
                height="380px"
                showFallbackButton={true}
                emptyMessage="File bukti transfer tidak ditemukan"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-primary" onClick={() => setBuktiBayarModalUrl(null)}>
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Multi-Payment History */}
      {historyModalInv && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '520px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div className="card-title" style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
                <Clock size={18} color="#10B981" /> Riwayat Pembayaran ({historyModalInv.noInv})
              </span>
              <button className="btn-link" onClick={() => setHistoryModalInv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
              <div>Pelanggan: <strong>{historyModalInv.namaCust}</strong> ({historyModalInv.waCust})</div>
              <div>Total Tagihan: <strong style={{ color: 'var(--primary)' }}>{formatRupiah(historyModalInv.grandTotal)}</strong></div>
              <div>Total Terbayar: <strong style={{ color: '#10B981' }}>{formatRupiah(historyModalInv.dibayar)}</strong></div>
              <div>Sisa Tertagih: <strong style={{ color: '#EF4444' }}>{formatRupiah(Math.max(historyModalInv.sisaTertagih || 0, 0))}</strong></div>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '14px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px' }}>Tanggal</th>
                    <th style={{ padding: '6px' }}>Metode</th>
                    <th style={{ padding: '6px' }}>Nominal</th>
                    <th style={{ padding: '6px' }}>Bukti / Catatan</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyModalInv.historyBayar || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Belum ada riwayat pembayaran.
                      </td>
                    </tr>
                  ) : (
                    (historyModalInv.historyBayar || []).map((h, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{formatDate(h.tgl)}</td>
                        <td style={{ padding: '8px 6px' }}>{h.metode || 'Transfer / Tunai'}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: '#10B981' }}>
                          {formatRupiah(h.nominal)}
                        </td>
                        <td style={{ padding: '8px 6px', fontSize: '11px' }}>
                          {h.note || '-'}
                          {h.buktiUrl && (
                            <div style={{ marginTop: '2px' }}>
                              <a href={h.buktiUrl} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                Bukti Transfer
                              </a>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleDeletePaymentItem(idx)}
                            style={{
                              padding: '3px 6px',
                              color: '#EF4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '11px'
                            }}
                            title="Hapus Pembayaran Ini"
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {(historyModalInv.sisaTertagih || 0) > 0 && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    const inv = historyModalInv;
                    setHistoryModalInv(null);
                    openPaymentModal(inv);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <CreditCard size={14} /> Terima Pembayaran ({formatRupiah(historyModalInv.sisaTertagih || 0)})
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setHistoryModalInv(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Template Selector Modal */}
      {waModalInv && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '14px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '14px', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#25D366" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>Kirim WhatsApp Pelanggan</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setWaModalInv(null)} style={{ padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Penerima: <strong style={{ color: 'var(--text-main)' }}>{waModalInv.namaCust}</strong> ({waModalInv.waCust || 'Tidak ada no WA'})<br/>
              Nota: <strong>{waModalInv.noInv}</strong> | Total: <strong>{formatRupiah(waModalInv.grandTotal)}</strong> | Sisa: <strong style={{ color: waModalInv.sisaTertagih > 0 ? '#EF4444' : '#10B981' }}>{formatRupiah(waModalInv.sisaTertagih)}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendWaTemplate(waModalInv, 'invoice')}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', borderColor: 'var(--border-color)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>1. Kirim Nota & Rincian Pesanan Baru</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mengirim detail item, total bayar, link tracking portal & info rekening toko</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendWaTemplate(waModalInv, 'ready')}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.04)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#059669' }}>2. Pesanan Selesai & Siap Diambil / Kirim</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pemberitahuan bahwa hasil cetak telah selesai diproduksi dan siap diambil</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendWaTemplate(waModalInv, 'acc')}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', borderColor: 'rgba(37, 99, 235, 0.4)', background: 'rgba(37, 99, 235, 0.04)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🎨</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#2563EB' }}>3. Permintaan Review / ACC Desain Online</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Minta customer mereview mockup & menyetujui desain di portal sebelum cetak</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleSendWaTemplate(waModalInv, 'piutang')}
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.04)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>💳</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#DC2626' }}>4. Follow-Up & Pengingat Sisa Piutang</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kirim rincian sisa tagihan yang belum lunas beserta nomor rekening bank</div>
                  </div>
                </div>
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setWaModalInv(null)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kirim Faktur via Gmail (Google Workspace REST API) */}
      {emailModalInv && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '14px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '14px', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={20} color="#EA4335" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>Kirim Faktur via Akun Gmail</span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setEmailModalInv(null)} style={{ padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Faktur <strong>{emailModalInv.noInv}</strong> ({emailModalInv.namaCust}) akan dikirimkan dengan template HTML resmi berlogo <strong>{settings.company || 'CTRL PRINT'}</strong> melalui akun Gmail Google Workspace Anda.
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>Alamat Email Pelanggan</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="nama.customer@gmail.com"
                required
                style={{ fontSize: '13px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>Catatan Tambahan (Opsional)</label>
              <textarea
                value={emailCustomMsg}
                onChange={(e) => setEmailCustomMsg(e.target.value)}
                rows={2}
                placeholder="Misal: Terima kasih telah berbelanja di CTRL PRINT. Pesanan Anda saat ini sedang dalam proses cetak..."
                style={{ fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEmailModalInv(null)} disabled={isSendingEmail}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendInvoiceEmail}
                disabled={isSendingEmail}
                style={{ background: '#EA4335', borderColor: '#EA4335', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#FFF' }}
              >
                {isSendingEmail ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Mengirim ke Gmail...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Kirim Faktur Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
