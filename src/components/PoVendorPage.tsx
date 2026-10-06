import React, { useState } from 'react';
import { PoVendor, PoItem, Vendor, Counters, Settings } from '../types';
import { saveDocument, deleteDocument, saveCounters } from '../firebaseService';
import { openWhatsApp } from '../utils/whatsapp';
import {
  FileText,
  Plus,
  ExternalLink,
  Share2,
  Printer,
  Edit3,
  Trash2,
  Save,
  X,
  MoreVertical,
  Copy,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  Check,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Search,
  Clock,
  Clock3,
  Wrench,
  AlertCircle,
  MessageCircle,
  MessageSquareText,
  RotateCcw,
  FolderSync,
  ArrowRight,
  CheckSquare,
  Square,
  FolderCheck
} from 'lucide-react';
import { SortableHeader } from './SortableHeader';
import { getVendorCode, generateUniquePoNumber, checkDuplicatePoNumber } from '../utils/idGenerator';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';
import { sendPoVendorEmail, generatePoEmailHtml } from '../services/gmailService';
import { GoogleDriveUploader } from './GoogleDriveUploader';
import {
  scanVendorPembayaranFiles,
  movePrintFilesToVendorFolder,
  DriveScannedVendorFile,
  MoveFileResult
} from '../services/googleDriveService';

interface PoVendorPageProps {
  poList: PoVendor[];
  vendors: Vendor[];
  counters: Counters;
  settings: Settings;
  onPrintPO: (po: PoVendor) => void;
  onOpenVendorPortal?: (po: PoVendor) => void;
  showToast: (msg: string, isErr?: boolean) => void;
}

export const PoVendorPage: React.FC<PoVendorPageProps> = ({
  poList,
  vendors,
  counters,
  settings,
  onPrintPO,
  onOpenVendorPortal,
  showToast
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PoVendor | null>(null);

  const [noPo, setNoPo] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [tglPo, setTglPo] = useState(new Date().toISOString().split('T')[0]);
  const [tglSelesai, setTglSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [jamSelesai, setJamSelesai] = useState('15:00');
  const [driveUrl, setDriveUrl] = useState('');
  const [modalTotal, setModalTotal] = useState<number>(0);
  const [catatan, setCatatan] = useState('');

  const [poItems, setPoItems] = useState<PoItem[]>([
    { fileName: '', prodName: '', ket: '', qty: 1, satuan: 'Pcs' }
  ]);

  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  // Email Vendor PO Modal State
  const [emailPoTarget, setEmailPoTarget] = useState<PoVendor | null>(null);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailCustomNote, setEmailCustomNote] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Real-time duplicate check for PO
  const duplicatePoCheck = checkDuplicatePoNumber(noPo, poList, editingPo?.id);

  const handleGenerateUniquePoNo = () => {
    const { number } = generateUniquePoNumber(poList, counters.nextPoNumber || 1);
    setNoPo(number);
    showToast(`Nomor PO unik "${number}" berhasil dibuat.`);
  };

  // Vendor Payment Modal State
  const [payVendorPo, setPayVendorPo] = useState<PoVendor | null>(null);
  const [payModalMode, setPayModalMode] = useState<'add' | 'edit'>('add');
  const [vendorPayAmount, setVendorPayAmount] = useState<number>(0);
  const [vendorPayDate, setVendorPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vendorPayMethod, setVendorPayMethod] = useState<string>('Transfer BCA');
  const [vendorPayDriveUrl, setVendorPayDriveUrl] = useState<string>('');
  const [vendorPayNote, setVendorPayNote] = useState<string>('');

  // Google Drive Relocation Modal State
  const [showRelocateModal, setShowRelocateModal] = useState<boolean>(false);
  const [isScanningFiles, setIsScanningFiles] = useState<boolean>(false);
  const [isMovingFiles, setIsMovingFiles] = useState<boolean>(false);
  const [scannedFiles, setScannedFiles] = useState<DriveScannedVendorFile[]>([]);
  const [selectedFileIdsToMove, setSelectedFileIdsToMove] = useState<string[]>([]);
  const [pembayaranFolderInfo, setPembayaranFolderInfo] = useState<{ id: string; name: string } | null>(null);
  const [fileCetakFolderInfo, setFileCetakFolderInfo] = useState<{ id: string; name: string } | null>(null);
  const [moveProgress, setMoveProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [moveResults, setMoveResults] = useState<MoveFileResult[] | null>(null);
  const [relocateError, setRelocateError] = useState<string>('');

  const handleOpenRelocateModal = async () => {
    setShowRelocateModal(true);
    setRelocateError('');
    setMoveResults(null);
    setMoveProgress(null);
    setIsScanningFiles(true);

    try {
      const result = await scanVendorPembayaranFiles(poList);
      setScannedFiles(result.files);
      setPembayaranFolderInfo(result.pembayaranFolder);
      setFileCetakFolderInfo(result.fileCetakFolder);

      // Auto-select all files detected as 'file_cetak'
      const printIds = result.files.filter((f) => f.detectedType === 'file_cetak').map((f) => f.id);
      setSelectedFileIdsToMove(printIds);
    } catch (err: any) {
      console.error('Scan error:', err);
      setRelocateError(err.message || 'Gagal memindai folder Google Drive');
    } finally {
      setIsScanningFiles(false);
    }
  };

  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIdsToMove((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllPrintFiles = () => {
    const printIds = scannedFiles.filter((f) => f.detectedType === 'file_cetak').map((f) => f.id);
    setSelectedFileIdsToMove(printIds);
  };

  const handleExecuteMoveFiles = async () => {
    if (!pembayaranFolderInfo || !fileCetakFolderInfo || selectedFileIdsToMove.length === 0) return;

    setIsMovingFiles(true);
    setRelocateError('');
    setMoveResults(null);

    try {
      const { movedCount, results } = await movePrintFilesToVendorFolder(
        selectedFileIdsToMove,
        pembayaranFolderInfo.id,
        fileCetakFolderInfo.id,
        (current, total, fileName) => {
          setMoveProgress({ current, total, fileName });
        }
      );

      setMoveResults(results);
      showToast(`Berhasil memindahkan ${movedCount} berkas ke folder 'File Cetak & PO Vendor'!`);

      // Re-scan after moving to refresh list
      const updated = await scanVendorPembayaranFiles(poList);
      setScannedFiles(updated.files);
      setSelectedFileIdsToMove(updated.files.filter((f) => f.detectedType === 'file_cetak').map((f) => f.id));
    } catch (err: any) {
      console.error('Move error:', err);
      setRelocateError(err.message || 'Terjadi kesalahan saat memindahkan berkas');
    } finally {
      setIsMovingFiles(false);
      setMoveProgress(null);
    }
  };
  const [statusFilter, setStatusFilter] = useState<'all' | 'lunas' | 'sebagian' | 'unpaid'>('all');
  const [prodFilter, setProdFilter] = useState<'all' | 'menunggu' | 'proses' | 'siap'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [sortKey, setSortKey] = useState<string>('tglPo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getVendorProductionStatus = (po: PoVendor): 'menunggu' | 'proses' | 'siap' => {
    if (po.vendorStatus === 'Siap Diambil' || po.vendorStatus === 'Selesai') return 'siap';
    if (po.vendorStatus === 'Sedang Dikerjakan' || po.vendorConfirmedAt) return 'proses';
    return 'menunggu';
  };

  const filteredPoList = poList.filter((po) => {
    // Payment status filter
    const isPaid = po.statusBayarVendor === 'Lunas' || ((po.dibayarVendor || 0) >= (po.modalTotal || 0) && (po.modalTotal || 0) > 0);
    const isPartial = po.statusBayarVendor === 'Sebagian' || ((po.dibayarVendor || 0) > 0 && !isPaid);

    if (statusFilter === 'lunas' && !isPaid) return false;
    if (statusFilter === 'sebagian' && !isPartial) return false;
    if (statusFilter === 'unpaid' && (isPaid || isPartial)) return false;

    // Production progress filter
    if (prodFilter !== 'all') {
      const pStat = getVendorProductionStatus(po);
      if (prodFilter !== pStat) return false;
    }

    // Search query filter (No PO, Vendor, Catatan, Item / File)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNo = (po.noPo || '').toLowerCase().includes(q);
      const matchVendor = (po.vendor || '').toLowerCase().includes(q);
      const matchCatatan = (po.catatan || '').toLowerCase().includes(q);
      const matchItem = (po.items || []).some((it) =>
        (it.prodName || '').toLowerCase().includes(q) ||
        (it.fileName || '').toLowerCase().includes(q) ||
        (it.ket || '').toLowerCase().includes(q)
      );
      if (!matchNo && !matchVendor && !matchCatatan && !matchItem) return false;
    }

    return true;
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof PoVendor] || '';
    let bVal: any = b[sortKey as keyof PoVendor] || '';

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const totalPages = Math.ceil(filteredPoList.length / itemsPerPage) || 1;
  const pagePoList = filteredPoList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, prodFilter, searchQuery]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleExportPoCSV = () => {
    if (filteredPoList.length === 0) return showToast('Tidak ada data PO Vendor untuk di-export', true);
    
    const headers = ['No PO', 'Tanggal PO', 'Vendor', 'Items', 'Total Modal', 'Dibayar Vendor', 'Sisa Vendor', 'Status Bayar Vendor', 'Target Selesai'];
    const rows = filteredPoList.map((po) => {
      const itemsText = po.items.map(it => `${it.prodName} x${it.qty}`).join('; ');
      return [
        `"${po.noPo}"`,
        `"${po.tglPo}"`,
        `"${po.vendor.replace(/"/g, '""')}"`,
        `"${itemsText.replace(/"/g, '""')}"`,
        po.modalTotal || 0,
        po.dibayarVendor || 0,
        Math.max((po.modalTotal || 0) - (po.dibayarVendor || 0), 0),
        `"${po.statusBayarVendor || 'Belum Bayar'}"`,
        `"${po.tglSelesai} ${po.jamSelesai}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_PO_Vendor_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Berhasil export ${filteredPoList.length} data PO Vendor ke CSV!`);
  };

  const openPayVendorModal = (po: PoVendor) => {
    setPayVendorPo(po);
    const sudahDibayar = po.dibayarVendor || 0;
    const modalTotal = po.modalTotal || 0;
    const sisa = Math.max(modalTotal - sudahDibayar, 0);

    // Jika sudah ada pembayaran (terutama jika sudah lunas atau overpaid),
    // aktifkan mode 'edit' (koreksi total) dengan default tagihan modal,
    // agar pengguna tidak tanpa sengaja menduplikasi pembayaran ganda!
    if (sudahDibayar > 0) {
      if (sudahDibayar >= modalTotal) {
        setPayModalMode('edit');
        setVendorPayAmount(modalTotal); // usulkan koreksi ke 1x tagihan (Rp 60.000)
      } else {
        setPayModalMode('add');
        setVendorPayAmount(sisa);
      }
    } else {
      setPayModalMode('add');
      setVendorPayAmount(modalTotal);
    }

    setVendorPayDate(po.tglBayarVendor || new Date().toISOString().split('T')[0]);
    const methods = (settings.paymentMethods || '').split(/,|\n/).map((s) => s.trim()).filter(Boolean);
    setVendorPayMethod(po.metodeBayarVendor || methods[0] || 'Transfer BCA');
    setVendorPayDriveUrl(po.buktiBayarVendorUrl || po.driveUrl || '');
    setVendorPayNote(po.catatanBayarVendor || '');
  };

  const handleSaveVendorPayment = async (sendWa: boolean = true) => {
    if (!payVendorPo) return;
    if (vendorPayAmount < 0) {
      return showToast('Nominal pembayaran vendor tidak valid!', true);
    }

    let dibayarNew = 0;
    if (payModalMode === 'edit') {
      dibayarNew = vendorPayAmount;
    } else {
      if (vendorPayAmount <= 0) {
        return showToast('Nominal tambahan pembayaran harus lebih dari Rp 0!', true);
      }
      dibayarNew = (payVendorPo.dibayarVendor || 0) + vendorPayAmount;
    }

    const sisaNew = Math.max((payVendorPo.modalTotal || 0) - dibayarNew, 0);
    const statusNew = dibayarNew <= 0 ? 'Belum Bayar' : sisaNew <= 0 ? 'Lunas' : 'Sebagian';

    const updatedPo: PoVendor = {
      ...payVendorPo,
      statusBayarVendor: statusNew,
      dibayarVendor: dibayarNew,
      sisaVendor: sisaNew,
      buktiBayarVendorUrl: vendorPayDriveUrl || payVendorPo.buktiBayarVendorUrl,
      tglBayarVendor: dibayarNew > 0 ? vendorPayDate : '',
      metodeBayarVendor: dibayarNew > 0 ? vendorPayMethod : '',
      catatanBayarVendor: vendorPayNote
    };

    await saveDocument('po_vendor', updatedPo);

    if (payModalMode === 'edit') {
      showToast(`Total pembayaran PO ${payVendorPo.noPo} berhasil dikoreksi menjadi ${formatRupiah(dibayarNew)}!`);
    } else {
      showToast(`Pembayaran ke Vendor ${payVendorPo.vendor} sebesar ${formatRupiah(vendorPayAmount)} berhasil dicatat!`);
    }

    if (sendWa && dibayarNew > 0) {
      // Auto generate WhatsApp confirmation to Vendor
      const v = vendors.find((x) => x.nama.toLowerCase() === payVendorPo.vendor.toLowerCase());
      let cleanWa = v && v.wa ? v.wa.replace(/[^0-9]/g, '') : '';
      if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);

      let msg = `Halo *${payVendorPo.vendor}*,\n\n`;
      msg += `Berikut kami sampaikan konfirmasi pembayaran untuk *PO / SPK No: ${payVendorPo.noPo}* dari *${settings.company || 'CTRL PRINT'}*:\n\n`;
      msg += `• Total Tagihan Modal PO: ${formatRupiah(payVendorPo.modalTotal)}\n`;
      msg += `• Total Terbayar: ${formatRupiah(dibayarNew)}\n`;
      msg += `• Status Pembayaran Vendor: *${statusNew.toUpperCase()}*\n`;
      msg += `• Tanggal Bayar: ${vendorPayDate}\n`;
      msg += `• Metode Pembayaran: ${vendorPayMethod}\n`;
      if (vendorPayDriveUrl) msg += `• Link Bukti Transfer / Google Drive: ${vendorPayDriveUrl}\n`;
      if (vendorPayNote) msg += `• Catatan: ${vendorPayNote}\n`;
      msg += `\nMohon dicek dan dikonfirmasi ya. Terima kasih banyak atas kerjasamanya! 🙏`;

      setPayVendorPo(null);
      openWhatsApp(v?.wa, msg);
    } else {
      setPayVendorPo(null);
    }
  };

  const handleResetVendorPayment = async (po: PoVendor) => {
    if (!confirm(`Hapus / Reset seluruh riwayat pembayaran untuk PO Vendor ${po.noPo}?\n\nStatus akan kembali menjadi "Belum Bayar" (Rp 0).`)) {
      return;
    }

    const updatedPo: PoVendor = {
      ...po,
      statusBayarVendor: 'Belum Bayar',
      dibayarVendor: 0,
      sisaVendor: po.modalTotal || 0,
      buktiBayarVendorUrl: '',
      tglBayarVendor: '',
      catatanBayarVendor: ''
    };

    await saveDocument('po_vendor', updatedPo);
    showToast(`Pembayaran PO Vendor ${po.noPo} berhasil direset ke Rp 0 (Belum Bayar).`);
    if (payVendorPo && payVendorPo.id === po.id) {
      setPayVendorPo(null);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setActiveDropId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    if (vendors.length === 0) {
      return showToast('Tambahkan data vendor terlebih dahulu di menu Vendor / Supplier!', true);
    }
    const defaultVendor = vendors[0];
    const { number: uniquePo } = generateUniquePoNumber(poList, counters.nextPoNumber || 1);
    setEditingPo(null);
    setNoPo(uniquePo);
    setVendorName(defaultVendor?.nama || '');
    setVendorEmail(defaultVendor?.email || '');
    setTglPo(new Date().toISOString().split('T')[0]);
    setTglSelesai(new Date().toISOString().split('T')[0]);
    setJamSelesai('15:00');
    setDriveUrl('');
    setModalTotal(0);
    setCatatan('');
    setPoItems([{ fileName: '', prodName: '', ket: '', qty: 1, satuan: 'Pcs' }]);
    setModalOpen(true);
  };

  const openEditModal = (po: PoVendor) => {
    const v = vendors.find((x) => x.nama.toLowerCase() === po.vendor.toLowerCase());
    setEditingPo(po);
    setNoPo(po.noPo);
    setVendorName(po.vendor);
    setVendorEmail(po.vendorEmail || v?.email || '');
    setTglPo(po.tglPo);
    setTglSelesai(po.tglSelesai);
    setJamSelesai(po.jamSelesai || '15:00');
    setDriveUrl(po.driveUrl || '');
    setModalTotal(po.modalTotal || 0);
    setCatatan(po.catatan || '');
    setPoItems(po.items || []);
    setModalOpen(true);
  };

  const handlePoItemChange = (index: number, field: keyof PoItem, value: any) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    setPoItems(updated);
  };

  const addPoItemRow = () => {
    setPoItems([...poItems, { fileName: '', prodName: '', ket: '', qty: 1, satuan: 'Pcs' }]);
  };

  const removePoItemRow = (index: number) => {
    if (poItems.length <= 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNoPo = (noPo || '').trim();
    if (!cleanNoPo || !vendorName.trim()) {
      return showToast('No. PO dan Nama Vendor wajib diisi!', true);
    }
    if (poItems.some((it) => !it.prodName && !it.fileName)) {
      return showToast('Minimal isi Nama File atau Nama Produk pada setiap baris item!', true);
    }

    // Check duplicate PO number
    const dupCheck = checkDuplicatePoNumber(cleanNoPo, poList, editingPo?.id);
    if (dupCheck.isDuplicate) {
      const conflict = dupCheck.conflictingPo;
      return showToast(
        `❌ Gagal: No. PO "${cleanNoPo}" sudah digunakan oleh Vendor ${conflict?.vendor || 'lain'} (${formatDate(conflict?.tglPo)}). Gunakan nomor PO unik!`,
        true
      );
    }

    const id = editingPo ? editingPo.id : String(Date.now());

    const data: PoVendor = {
      id,
      noPo: cleanNoPo,
      vendor: vendorName,
      vendorEmail: vendorEmail || undefined,
      tglPo,
      tglSelesai,
      jamSelesai,
      driveUrl,
      modalTotal,
      catatan,
      items: poItems,
      emailSentAt: editingPo?.emailSentAt,
      emailSentTo: editingPo?.emailSentTo,
      statusBayarVendor: editingPo?.statusBayarVendor,
      dibayarVendor: editingPo?.dibayarVendor,
      tglBayarVendor: editingPo?.tglBayarVendor,
      metodeBayarVendor: editingPo?.metodeBayarVendor,
      buktiBayarVendorUrl: editingPo?.buktiBayarVendorUrl,
      catatanBayarVendor: editingPo?.catatanBayarVendor
    };

    await saveDocument('po_vendor', data);

    // Auto-sync PO Modal cost to Pengeluaran
    if (modalTotal > 0) {
      const expId = `po_exp_${id}`;
      const itemDescList = poItems.map((i) => i.prodName || i.fileName).filter(Boolean).slice(0, 2).join(', ');
      await saveDocument('pengeluaran', {
        id: expId,
        tgl: tglPo,
        kategori: 'Beli Bahan / Vendor',
        vendor: vendorName,
        ket: `Biaya Modal PO Vendor ${cleanNoPo}${itemDescList ? ` (${itemDescList})` : ''}`,
        nominal: modalTotal
      });
    }

    if (!editingPo) {
      const nextCount = Math.max((counters.nextPoNumber || 1) + 1, 2);
      await saveCounters({
        ...counters,
        nextPoNumber: nextCount
      });
    }

    showToast('PO Vendor & SPK Berhasil Disimpan!');
    setModalOpen(false);
  };

  const handleDuplicatePo = async (po: PoVendor) => {
    const { number: newPoNum, nextCounter } = generateUniquePoNumber(poList, counters.nextPoNumber || 1);
    const newId = String(Date.now());
    const today = new Date().toISOString().split('T')[0];

    const duplicatedData: PoVendor = {
      ...po,
      id: newId,
      noPo: newPoNum,
      tglPo: today,
      tglSelesai: today
    };

    await saveDocument('po_vendor', duplicatedData);

    if (po.modalTotal && po.modalTotal > 0) {
      const itemDescList = (po.items || []).map((i) => i.prodName || i.fileName).filter(Boolean).slice(0, 2).join(', ');
      await saveDocument('pengeluaran', {
        id: `po_exp_${newId}`,
        tgl: today,
        kategori: 'Beli Bahan / Vendor',
        vendor: po.vendor,
        ket: `Biaya Modal PO Vendor ${newPoNum}${itemDescList ? ` (${itemDescList})` : ''}`,
        nominal: po.modalTotal
      });
    }

    await saveCounters({
      ...counters,
      nextPoNumber: nextCounter
    });

    showToast(`PO ${po.noPo} berhasil diduplikat menjadi nomor unik ${newPoNum}!`);
  };

  const handleDelete = async (po: PoVendor) => {
    if (confirm(`Hapus PO Vendor ${po.noPo}?`)) {
      await deleteDocument('po_vendor', po.id);
      showToast('PO Vendor Dihapus!');
    }
  };

  const handleCopyVendorPortalLink = (po: PoVendor) => {
    const portalUrl = `${window.location.origin}${window.location.pathname}?po=${encodeURIComponent(po.noPo)}`;
    navigator.clipboard.writeText(portalUrl);
    showToast(`Link Portal Vendor untuk PO ${po.noPo} berhasil disalin!`);
  };

  const handleKirimWAPO = (po: PoVendor) => {
    const v = vendors.find((x) => x.nama.toLowerCase() === po.vendor.toLowerCase());
    let cleanWa = v && v.wa ? v.wa.replace(/[^0-9]/g, '') : '';
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);

    const portalUrl = `${window.location.origin}${window.location.pathname}?po=${encodeURIComponent(po.noPo)}`;

    let msg = `*SPK & PURCHASE ORDER (PO)*\n`;
    msg += `*${settings.company || 'CTRL PRINT'}*\n\n`;
    msg += `Kepada Vendor: *${po.vendor}*\n`;
    msg += `No PO: *${po.noPo}*\n`;
    msg += `Estimasi Target: *${formatDate(po.tglSelesai)} ${po.jamSelesai || '15:00'} WITA*\n\n`;
    msg += `📲 *Link SPK & Akses File Cetak:*\n${portalUrl}\n\n`;
    msg += `_(Silakan buka link di atas untuk melihat rincian & download file cetak Google Drive di bagian bawah)_\n\n`;
    msg += `*Rincian Barang Cetakan:*\n`;
    po.items.forEach((it, idx) => {
      msg += `${idx + 1}. [File: ${it.fileName || '-'}] - ${it.prodName}\n   Spec: ${it.ket || '-'}\n   Qty: ${it.qty} ${it.satuan}\n`;
    });
    if (po.catatan) msg += `\n*Catatan Khusus:* ${po.catatan}\n`;
    msg += `\nMohon diproses sesuai target waktu di atas, terima kasih!`;

    openWhatsApp(v?.wa, msg);
  };

  const handleFollowUpWAPO = (po: PoVendor) => {
    const v = vendors.find((x) => x.nama.toLowerCase() === po.vendor.toLowerCase());
    const portalUrl = `${window.location.origin}${window.location.pathname}?po=${encodeURIComponent(po.noPo)}`;

    let msg = `Halo *${po.vendor}*,\n\n`;
    msg += `Izin menanyakan update status pengerjaan untuk *PO / SPK No: ${po.noPo}* dari *${settings.company || 'CTRL PRINT'}*.\n\n`;
    msg += `• Tanggal PO: ${formatDate(po.tglPo)}\n`;
    msg += `• Target Selesai: *${po.vendorDeadline ? `${formatDate(po.vendorDeadline)} ${po.vendorDeadlineTime || ''}` : `${formatDate(po.tglSelesai)} ${po.jamSelesai}`}*\n`;
    msg += `• Link Portal PO & File: ${portalUrl}\n`;
    msg += `\n*Rincian Item Pesanan:*\n`;
    po.items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.prodName} (${it.fileName || 'File'}) - Qty: ${it.qty} ${it.satuan}\n`;
    });
    msg += `\nMohon info perkembangan status cetak / pengerjaannya ya. Terima kasih! 🙏`;

    openWhatsApp(v?.wa, msg);
  };

  const handleOpenEmailModal = (po: PoVendor) => {
    const v = vendors.find((x) => x.nama.toLowerCase() === po.vendor.toLowerCase());
    const targetEmail = po.vendorEmail || v?.email || '';
    setEmailPoTarget(po);
    setEmailRecipient(targetEmail);
    setEmailSubject(`[PO & SPK] ${po.noPo} - ${settings.company || 'CTRL PRINT'} - ${po.vendor}`);
    setEmailCustomNote('');
    setIsSendingEmail(false);
  };

  const handleSendEmailVendor = async () => {
    if (!emailPoTarget) return;
    if (!emailRecipient || !emailRecipient.includes('@')) {
      return showToast('Masukkan alamat email vendor yang valid!', true);
    }

    setIsSendingEmail(true);
    try {
      const v = vendors.find((x) => x.nama.toLowerCase() === emailPoTarget.vendor.toLowerCase());
      const poWithNote = {
        ...emailPoTarget,
        catatan: emailCustomNote
          ? `${emailPoTarget.catatan ? emailPoTarget.catatan + '\n' : ''}${emailCustomNote}`
          : emailPoTarget.catatan
      };

      await sendPoVendorEmail({
        toEmail: emailRecipient,
        po: poWithNote,
        settings,
        customSubject: emailSubject || undefined,
        customMessage: emailCustomNote || undefined
      });

      // Update PO with email sent metadata
      const sentTime = new Date().toISOString();
      const updatedPo: PoVendor = {
        ...emailPoTarget,
        vendorEmail: emailRecipient,
        emailSentAt: sentTime,
        emailSentTo: emailRecipient
      };
      await saveDocument('po_vendor', updatedPo);

      showToast(`Email PO berhasil dikirim ke ${emailRecipient}!`);
      setEmailPoTarget(null);
    } catch (err: any) {
      console.error('Error sending PO email:', err);
      showToast(`Gagal mengirim email: ${err.message || 'Periksa koneksi Google Workspace'}`, true);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Header & Action Bar */}
      <div className="card-title" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Kelola PO & SPK Harian ke Vendor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleOpenRelocateModal}
              title="Pisahkan file cetak/desain vendor yang masih tercampur di folder Pembayaran Vendor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#2563EB',
                borderColor: '#93C5FD',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                fontWeight: 700,
                height: '38px',
                borderRadius: '10px',
                padding: '0 14px'
              }}
            >
              <FolderSync size={15} /> Pisahkan File Drive
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleExportPoCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10B981', borderColor: '#10B981', fontWeight: 700, height: '38px', borderRadius: '10px', padding: '0 14px' }}
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={openCreateModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, height: '38px', borderRadius: '10px', padding: '0 14px' }}
            >
              <Plus size={15} /> Buat PO Baru
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px', width: '100%' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '460px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor PO, vendor, file, produk, spek..."
              className="form-control"
              style={{ paddingLeft: '36px', paddingRight: searchQuery ? '36px' : '12px', height: '38px', borderRadius: '10px', fontSize: '12.5px' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Rows */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            {/* Status Pengerjaan Vendor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Status Pengerjaan:</span>
              <button
                className={`btn btn-sm ${prodFilter === 'all' ? 'btn-secondary' : 'btn-outline'}`}
                onClick={() => setProdFilter('all')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px' }}
              >
                Semua ({poList.length})
              </button>
              <button
                className={`btn btn-sm ${prodFilter === 'menunggu' ? 'btn-warning' : 'btn-outline'}`}
                onClick={() => setProdFilter('menunggu')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Clock size={12} strokeWidth={2} />
                <span>Menunggu ({poList.filter((p) => getVendorProductionStatus(p) === 'menunggu').length})</span>
              </button>
              <button
                className={`btn btn-sm ${prodFilter === 'proses' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setProdFilter('proses')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Wrench size={12} strokeWidth={2} />
                <span>Dikerjakan ({poList.filter((p) => getVendorProductionStatus(p) === 'proses').length})</span>
              </button>
              <button
                className={`btn btn-sm ${prodFilter === 'siap' ? 'btn-success' : 'btn-outline'}`}
                onClick={() => setProdFilter('siap')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <CheckCircle2 size={12} strokeWidth={2} />
                <span>Siap Diambil ({poList.filter((p) => getVendorProductionStatus(p) === 'siap').length})</span>
              </button>
            </div>

            {/* Status Bayar Vendor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Status Bayar:</span>
              <button
                className={`btn btn-sm ${statusFilter === 'all' ? 'btn-secondary' : 'btn-outline'}`}
                onClick={() => setStatusFilter('all')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px' }}
              >
                Semua
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'lunas' ? 'btn-success' : 'btn-outline'}`}
                onClick={() => setStatusFilter('lunas')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <CheckCircle2 size={12} strokeWidth={2} />
                <span>Lunas</span>
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'sebagian' ? 'btn-warning' : 'btn-outline'}`}
                onClick={() => setStatusFilter('sebagian')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Clock3 size={12} strokeWidth={2} />
                <span>Sebagian</span>
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'unpaid' ? 'btn-danger' : 'btn-outline'}`}
                onClick={() => setStatusFilter('unpaid')}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <AlertCircle size={12} strokeWidth={2} />
                <span>Belum Bayar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="No. PO / Tanggal & Tenggat" sortKey="noPo" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Vendor Tujuan" sortKey="vendor" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ width: '280px', maxWidth: '300px' }}>Rincian File &amp; Pesanan</th>
              <SortableHeader label="Modal & Status Bayar" sortKey="modalTotal" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredPoList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  Belum ada data PO Vendor. Klik "+ Buat PO Baru" untuk memulai.
                </td>
              </tr>
            ) : (
              pagePoList.map((po) => (
                <tr key={po.id} style={{ position: 'relative', zIndex: activeDropId === po.id ? 100 : 'auto' }}>
                  <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <a
                        href={`?po=${encodeURIComponent(po.noPo)}`}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                            return;
                          }
                          e.preventDefault();
                          if (onOpenVendorPortal) {
                            onOpenVendorPortal(po);
                          } else {
                            window.open(`?po=${encodeURIComponent(po.noPo)}`, '_blank');
                          }
                        }}
                        title="Lihat Portal Vendor"
                        style={{
                          color: '#0284c7',
                          fontWeight: 700,
                          textDecoration: 'none',
                          cursor: 'pointer',
                          display: 'inline-block',
                          fontSize: '12.5px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                          e.currentTarget.style.color = '#0369a1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                          e.currentTarget.style.color = '#0284c7';
                        }}
                      >
                        {po.noPo}
                      </a>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Tgl: {formatDate(po.tglPo)}
                    </div>

                    {/* Tenggat Selesai Minimalis */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#DC2626',
                        marginTop: '3px'
                      }}
                      title={`Tenggat Selesai: ${formatDate(po.tglSelesai)} Pukul ${po.jamSelesai || '15:00'} WITA`}
                    >
                      <Clock size={11} strokeWidth={2.2} />
                      <span>{formatDate(po.tglSelesai)}</span>
                      <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>{po.jamSelesai || '15:00'}</span>
                    </div>

                    {/* Status Pengerjaan Vendor & Catatan */}
                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      {po.vendorStatus === 'Siap Diambil' || po.vendorStatus === 'Selesai' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#047857',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700
                          }}
                        >
                          <CheckCircle2 size={10} strokeWidth={2.2} /> Siap Diambil
                        </span>
                      ) : po.vendorStatus === 'Sedang Dikerjakan' || po.vendorConfirmedAt ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'rgba(2, 132, 199, 0.12)',
                            color: '#0284C7',
                            border: '1px solid rgba(2, 132, 199, 0.25)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700
                          }}
                          title={`File cetak dibuka vendor: ${po.vendorConfirmedAt ? new Date(po.vendorConfirmedAt).toLocaleString('id-ID') : '-'}`}
                        >
                          <Wrench size={10} strokeWidth={2} /> Dikerjakan
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#B45309',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700
                          }}
                        >
                          <Clock size={10} strokeWidth={2} /> Menunggu
                        </span>
                      )}

                      {po.vendorNotes && (
                        <div
                          style={{
                            fontSize: '9px',
                            color: '#0369A1',
                            background: 'rgba(2, 132, 199, 0.08)',
                            border: '1px solid rgba(2, 132, 199, 0.2)',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            maxWidth: '170px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={`Catatan Vendor: ${po.vendorNotes}`}
                        >
                          <MessageSquareText size={9} strokeWidth={2} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{po.vendorNotes}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{po.vendor}</strong>
                    {po.vendorEmail && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                        <Mail size={10} /> {po.vendorEmail}
                      </div>
                    )}
                    {po.emailSentAt && (
                      <div style={{ fontSize: '9px', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px', background: '#D1FAE5', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                        <Check size={9} /> Email Terkirim ({formatDate(po.emailSentAt)})
                      </div>
                    )}
                    <br />
                    {po.driveUrl && (
                      <a
                        href={po.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '10px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                      >
                        <ExternalLink size={11} /> Buka Drive
                      </a>
                    )}
                  </td>
                  <td style={{ width: '280px', maxWidth: '300px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxWidth: '100%' }}>
                      {po.items.map((it, idx) => {
                        const mainFileName = it.fileName || it.prodName || 'Item Cetak';
                        const specDetail = it.fileName
                          ? `${it.prodName || ''}${it.ket ? ` (${it.ket})` : ''} - ${it.qty} ${it.satuan}`
                          : `${it.ket ? `(${it.ket}) - ` : ''}${it.qty} ${it.satuan}`;

                        return (
                          <div key={idx} style={{ minWidth: 0, maxWidth: '100%' }}>
                            {/* Baris Pertama: Nama File Utama (font-semibold & ellipsis) */}
                            <div
                              title={mainFileName}
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '5px',
                                minWidth: 0,
                                maxWidth: '100%'
                              }}
                            >
                              <span style={{ color: 'var(--primary, #2563EB)', fontWeight: 700, flexShrink: 0, fontSize: '11px', lineHeight: 1 }}>•</span>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                  fontSize: '11px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'block',
                                  flex: 1,
                                  minWidth: 0
                                }}
                              >
                                {mainFileName}
                              </span>
                            </div>

                            {/* Baris Kedua: Keterangan Detail Spesifikasi */}
                            <div
                              title={specDetail}
                              style={{
                                fontSize: '10px',
                                color: 'var(--text-muted, #64748B)',
                                paddingLeft: '10px',
                                marginTop: '1px',
                                lineHeight: 1.35,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%'
                              }}
                            >
                              {specDetail}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--primary)', fontSize: '12px' }}>{formatRupiah(po.modalTotal)}</strong>
                    <br />
                    {(() => {
                      const isLunas = po.statusBayarVendor === 'Lunas' || ((po.dibayarVendor || 0) >= (po.modalTotal || 0) && (po.modalTotal || 0) > 0);
                      const isSebagian = !isLunas && (po.dibayarVendor || 0) > 0;
                      const label = po.statusBayarVendor || (isLunas ? 'Lunas' : isSebagian ? 'Sebagian' : 'Belum Bayar');
                      const bg = isLunas ? '#D1FAE5' : isSebagian ? '#FEF3C7' : '#FEE2E2';
                      const color = isLunas ? '#065F46' : isSebagian ? '#92400E' : '#991B1B';
                      const border = isLunas ? '1px solid #A7F3D0' : isSebagian ? '1px solid #FDE68A' : '1px solid #FECACA';

                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPayVendorModal(po);
                          }}
                          title={`Status: ${label} • Klik untuk Catat / Koreksi Pembayaran Vendor`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            marginTop: '3px',
                            background: bg,
                            color: color,
                            border: border,
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.filter = 'brightness(0.96)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.filter = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <CreditCard size={11} />
                          <span>{label}</span>
                        </button>
                      );
                    })()}
                    {po.buktiBayarVendorUrl && (
                      <div style={{ marginTop: '2px' }}>
                        <a
                          href={po.buktiBayarVendorUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '9.5px', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                        >
                          <ExternalLink size={10} /> Bukti Bayar
                        </a>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div className="dropdown" style={{ display: 'inline-block' }}>
                      <button
                        type="button"
                        className="btn-kebab"
                        title="Menu Aksi PO"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropId(activeDropId === po.id ? null : po.id);
                        }}
                        style={{
                          padding: '5px 6px',
                          borderRadius: '7px',
                          border: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))'
                        }}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeDropId === po.id && (
                        <div className="dropdown-content show" style={{ minWidth: '220px', zIndex: 100, textAlign: 'left', padding: '6px' }}>
                          <button
                            onClick={() => {
                              setActiveDropId(null);
                              onPrintPO(po);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary, #2563EB)', fontWeight: 700 }}
                          >
                            <Printer size={14} color="var(--primary, #2563EB)" /> Cetak Dokumen SPK
                          </button>
                          <button
                            onClick={() => {
                              setActiveDropId(null);
                              handleKirimWAPO(po);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 700 }}
                          >
                            <MessageCircle size={14} color="#10B981" /> Kirim SPK via WhatsApp
                          </button>
                          <button
                            onClick={() => {
                              setActiveDropId(null);
                              handleFollowUpWAPO(po);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontWeight: 600 }}
                          >
                            <MessageSquare size={14} color="#2563EB" /> Follow Up Status (WA)
                          </button>
                          <button
                            onClick={() => {
                              setActiveDropId(null);
                              handleOpenEmailModal(po);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EA4335', fontWeight: 600 }}
                          >
                            <Mail size={14} color="#EA4335" /> Kirim Email ke Vendor
                          </button>
                          <button
                            onClick={() => {
                              setActiveDropId(null);
                              handleCopyVendorPortalLink(po);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <Copy size={14} /> Salin Link Portal Vendor
                          </button>
                          {(po.dibayarVendor || 0) > 0 && (
                            <button
                              onClick={() => {
                                setActiveDropId(null);
                                handleResetVendorPayment(po);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: 600 }}
                            >
                              <RotateCcw size={14} color="#EF4444" /> Reset Pembayaran (Rp 0)
                            </button>
                          )}
                          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                            <button
                              onClick={() => {
                                setActiveDropId(null);
                                openEditModal(po);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <Edit3 size={14} /> Edit Data PO
                            </button>
                            <button
                              onClick={() => {
                                setActiveDropId(null);
                                handleDuplicatePo(po);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <Copy size={14} /> Duplikat PO
                            </button>
                            <button
                              onClick={() => {
                                setActiveDropId(null);
                                handleDelete(po);
                              }}
                              style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color)' }}
                            >
                              <Trash2 size={14} /> Hapus PO
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                </tr>
              ))
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

      {/* Modal Form */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-card lg">
            <div className="card-title" style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> {editingPo ? `Edit PO: ${editingPo.noPo}` : 'Buat PO & SPK Vendor Baru'}
              </span>
              <button className="btn btn-danger btn-sm" onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ marginBottom: '8px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      No. PO / SPK Vendor
                      {duplicatePoCheck.isDuplicate ? (
                        <span style={{ color: '#DC2626', fontSize: '10.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AlertTriangle size={12} /> Nomor Duplikat
                        </span>
                      ) : noPo ? (
                        <span style={{ color: '#059669', fontSize: '10.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={12} /> Unik
                        </span>
                      ) : null}
                    </label>
                    {!editingPo && (
                      <button
                        type="button"
                        onClick={handleGenerateUniquePoNo}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: 0
                        }}
                      >
                        <RefreshCw size={12} /> Generate Baru
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={noPo}
                    onChange={(e) => setNoPo(e.target.value)}
                    placeholder="Contoh: PO/2026/0001"
                    style={{
                      fontWeight: 800,
                      color: duplicatePoCheck.isDuplicate ? '#DC2626' : 'var(--primary)',
                      border: duplicatePoCheck.isDuplicate ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
                      background: duplicatePoCheck.isDuplicate ? '#FEF2F2' : 'var(--bg-card)'
                    }}
                    required
                  />
                </div>

                {/* Warning banner if PO number already exists */}
                {duplicatePoCheck.isDuplicate && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
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
                      marginBottom: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                      <span>
                        <strong>Peringatan No. PO Sama!</strong> "{noPo}" sudah terdaftar pada vendor <strong>{duplicatePoCheck.conflictingPo?.vendor}</strong> ({formatDate(duplicatePoCheck.conflictingPo?.tglPo)}).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateUniquePoNo}
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

                <div className="form-group">
                  <label>Pilih Vendor / Supplier</label>
                  <select
                    value={vendorName}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setVendorName(selectedVal);
                      const foundV = vendors.find((v) => v.nama.toLowerCase() === selectedVal.toLowerCase());
                      if (foundV?.email) setVendorEmail(foundV.email);
                    }}
                    required
                  >
                    <option value="">-- Pilih Vendor --</option>
                    {vendors.map((v, vIdx) => (
                      <option key={v.id} value={v.nama}>
                        [{getVendorCode(v, vIdx + 1)}] {v.nama}{v.wa ? ` - ${v.wa}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Email Vendor (Untuk Kirim PO)</label>
                  <input
                    type="email"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    placeholder="vendor@email.com"
                  />
                </div>
                <div className="form-group">
                  <label>Tgl. PO</label>
                  <input type="date" value={tglPo} onChange={(e) => setTglPo(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Tenggat Selesai (Tanggal)</label>
                  <input type="date" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Tenggat Selesai (Jam)</label>
                  <input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} required />
                </div>
              </div>

              {/* Google Drive Browse / Upload File SPK */}
              <div style={{ marginBottom: '12px' }}>
                <GoogleDriveUploader
                  currentUrl={driveUrl}
                  onUrlGenerated={(url) => setDriveUrl(url)}
                  label="File Desain / Cetak Vendor (Folder: CTRL PRINT / File Cetak & PO Vendor)"
                  invoiceNo={editingPo ? editingPo.noPo : `PO-${new Date().getFullYear()}`}
                  customerName={vendorName || 'Vendor'}
                  contextCategory="file_po_vendor"
                  showToast={showToast}
                  showPreview={true}
                />
              </div>

              <div className="form-grid" style={{ marginBottom: '8px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Biaya / Modal PO (Opsional)</label>
                  <input
                    type="number"
                    value={modalTotal}
                    onChange={(e) => setModalTotal(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    style={{ fontWeight: 'bold', color: 'var(--danger)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label>Instruksi / Catatan SPK Umum</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Cetak bahan sesuai spesifikasi tiap nomor di bawah"
                />
              </div>

              <div style={{ fontWeight: 700, color: 'var(--primary)', margin: '12px 0 6px 0', fontSize: '11px' }}>
                Rincian Barang Pesanan PO:
              </div>

              <div className="table-responsive" style={{ marginBottom: '12px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Nama File di Drive</th>
                      <th style={{ width: '22%' }}>Nama Barang / Produk</th>
                      <th style={{ width: '26%' }}>Keterangan Lengkap</th>
                      <th style={{ width: '10%' }}>Qty</th>
                      <th style={{ width: '12%' }}>Satuan</th>
                      <th style={{ width: '8%' }}><X size={14} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            value={item.fileName || ''}
                            onChange={(e) => handlePoItemChange(idx, 'fileName', e.target.value)}
                            placeholder="Spanduk 3x1.jpg"
                            style={{ width: '100%', fontSize: '10px', padding: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            value={item.prodName}
                            onChange={(e) => handlePoItemChange(idx, 'prodName', e.target.value)}
                            placeholder="Cetak Spanduk Flexi"
                            style={{ width: '100%', fontSize: '10px', padding: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            value={item.ket || ''}
                            onChange={(e) => handlePoItemChange(idx, 'ket', e.target.value)}
                            placeholder="Finishing Mata Ayam / Lipat"
                            style={{ width: '100%', fontSize: '10px', padding: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handlePoItemChange(idx, 'qty', parseFloat(e.target.value) || 1)}
                            min="1"
                            style={{ width: '100%', fontSize: '10px', padding: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            list="list-satuan-umum"
                            value={item.satuan}
                            onChange={(e) => handlePoItemChange(idx, 'satuan', e.target.value)}
                            style={{ width: '100%', fontSize: '10px', padding: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-link"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => removePoItemRow(idx)}
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={addPoItemRow}
                style={{ width: '100%', borderStyle: 'dashed', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Tambah Item Barang
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', position: 'sticky', bottom: '-20px', background: 'var(--card-bg, #FFF)', zIndex: 5 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <Save size={16} /> Simpan PO &amp; SPK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Pembayaran Ke Vendor */}
      {payVendorPo && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '12px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '450px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="card-title" style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
                <CreditCard size={18} color="#10B981" /> Catat / Koreksi Pembayaran ({payVendorPo.noPo})
              </span>
              <button className="btn-link" onClick={() => setPayVendorPo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Info Box Tagihan Modal */}
            <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', lineHeight: 1.6 }}>
              <div>Vendor: <strong>{payVendorPo.vendor}</strong></div>
              <div>Total Tagihan Modal: <strong style={{ color: 'var(--primary)' }}>{formatRupiah(payVendorPo.modalTotal)}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>Sudah Dibayar:</span>
                <strong style={{ color: (payVendorPo.dibayarVendor || 0) > (payVendorPo.modalTotal || 0) ? '#EF4444' : '#10B981' }}>
                  {formatRupiah(payVendorPo.dibayarVendor)}
                </strong>
                {(payVendorPo.dibayarVendor || 0) > (payVendorPo.modalTotal || 0) && (
                  <span style={{ fontSize: '11px', background: '#FEE2E2', color: '#991B1B', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Lebih Bayar {formatRupiah((payVendorPo.dibayarVendor || 0) - (payVendorPo.modalTotal || 0))}
                  </span>
                )}
              </div>
              <div>Sisa Tertagih Vendor: <strong style={{ color: '#EF4444' }}>{formatRupiah(Math.max((payVendorPo.modalTotal || 0) - (payVendorPo.dibayarVendor || 0), 0))}</strong></div>
            </div>

            {/* Banner Peringatan Jika Terinput Ganda / Lebih Bayar */}
            {(payVendorPo.dibayarVendor || 0) > (payVendorPo.modalTotal || 0) && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#991B1B' }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertTriangle size={15} color="#DC2626" /> Terdeteksi Terinput 2x / Lebih Bayar!
                </div>
                <div style={{ fontSize: '11px', marginBottom: '8px', color: '#7F1D1D' }}>
                  Total sudah dibayar ({formatRupiah(payVendorPo.dibayarVendor)}) melebihi tagihan ({formatRupiah(payVendorPo.modalTotal)}). Klik tombol cepat di bawah untuk memperbaiki:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPayModalMode('edit');
                      setVendorPayAmount(payVendorPo.modalTotal || 0);
                    }}
                    style={{ background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckCircle2 size={13} /> Koreksi Jadi {formatRupiah(payVendorPo.modalTotal)} (1x Bayar)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetVendorPayment(payVendorPo)}
                    style={{ background: '#FFF', color: '#DC2626', border: '1px solid #DC2626', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={13} /> Reset ke Rp 0
                  </button>
                </div>
              </div>
            )}

            {/* Tab Pilihan Mode: Koreksi Total vs Tambah Pembayaran */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'var(--bg-input, #F1F5F9)', padding: '4px', borderRadius: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setPayModalMode('edit');
                  setVendorPayAmount(payVendorPo.modalTotal || 0);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: payModalMode === 'edit' ? '#2563EB' : 'transparent',
                  color: payModalMode === 'edit' ? '#FFF' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Edit3 size={13} /> Koreksi Total Terbayar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayModalMode('add');
                  const sisa = Math.max((payVendorPo.modalTotal || 0) - (payVendorPo.dibayarVendor || 0), 0);
                  setVendorPayAmount(sisa);
                }}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: payModalMode === 'add' ? '#10B981' : 'transparent',
                  color: payModalMode === 'add' ? '#FFF' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus size={13} /> Tambah Pembayaran (+)
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Tanggal Bayar</label>
              <input
                type="date"
                value={vendorPayDate}
                onChange={(e) => setVendorPayDate(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>
                  {payModalMode === 'edit' ? 'Total Sudah Dibayar yang Benar (Rp)' : 'Nominal Tambahan Pembayaran (Rp)'}
                </label>
                {payModalMode === 'edit' ? (
                  <button
                    type="button"
                    onClick={() => setVendorPayAmount(payVendorPo.modalTotal || 0)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Set Sesuai Tagihan ({formatRupiah(payVendorPo.modalTotal)})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVendorPayAmount(Math.max((payVendorPo.modalTotal || 0) - (payVendorPo.dibayarVendor || 0), 0))}
                    style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Set Sisa Tagihan ({formatRupiah(Math.max((payVendorPo.modalTotal || 0) - (payVendorPo.dibayarVendor || 0), 0))})
                  </button>
                )}
              </div>
              <input
                type="number"
                value={vendorPayAmount}
                onChange={(e) => setVendorPayAmount(parseFloat(e.target.value) || 0)}
                style={{ fontWeight: 'bold', fontSize: '16px', color: payModalMode === 'edit' ? '#2563EB' : '#10B981' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                {payModalMode === 'edit'
                  ? `Nilai ini akan langsung menggantikan Rp ${(payVendorPo.dibayarVendor || 0).toLocaleString()} (ketik 60000 agar menjadi Rp 60.000).`
                  : `Nilai ini akan ditambahkan ke Rp ${(payVendorPo.dibayarVendor || 0).toLocaleString()}.`}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Metode Pembayaran</label>
              <select
                value={vendorPayMethod}
                onChange={(e) => setVendorPayMethod(e.target.value)}
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

            <div style={{ marginBottom: '12px' }}>
              <GoogleDriveUploader
                currentUrl={vendorPayDriveUrl}
                onUrlGenerated={(url) => setVendorPayDriveUrl(url)}
                label="Bukti Transfer Vendor (Browse File / Google Drive)"
                invoiceNo={payVendorPo.noPo}
                customerName={payVendorPo.vendor}
                contextCategory="pembayaran_vendor"
                showToast={showToast}
                showPreview={false}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Catatan Pembayaran Vendor (Opsional)</label>
              <input
                type="text"
                value={vendorPayNote}
                onChange={(e) => setVendorPayNote(e.target.value)}
                placeholder="Misal: Pelunasan SPK Cetak / Koreksi pembayaran"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div>
                {(payVendorPo.dibayarVendor || 0) > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleResetVendorPayment(payVendorPo)}
                    style={{ color: '#EF4444', borderColor: '#FCA5A5', fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Hapus / Reset semua pembayaran untuk PO ini ke Rp 0"
                  >
                    <RotateCcw size={13} /> Reset ke Rp 0
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setPayVendorPo(null)}>Batal</button>
                {payModalMode === 'edit' && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleSaveVendorPayment(false)}
                    style={{ fontWeight: 600, fontSize: '12px' }}
                    title="Simpan perubahan tanpa membuka WhatsApp"
                  >
                    Simpan Saja
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleSaveVendorPayment(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <CheckCircle2 size={16} /> {payModalMode === 'edit' ? 'Simpan & Kirim WA' : 'Simpan & Auto Kirim WA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kirim Email PO ke Vendor (Gmail API) */}
      {emailPoTarget && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '12px' }}>
          <div className="modal-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '520px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div className="card-title" style={{ color: '#EA4335', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
                <Mail size={18} color="#EA4335" /> Kirim SPK / PO via Gmail ({emailPoTarget.noPo})
              </span>
              <button className="btn-link" onClick={() => setEmailPoTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(234,67,53,0.06)', border: '1px solid rgba(234,67,53,0.2)', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-main)' }}>
              Email akan dikirimkan langsung dari akun Gmail Google Workspace Anda ke vendor dengan template HTML SPK / PO yang rapi dan profesional.
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Vendor Penerima</label>
              <input
                type="text"
                value={emailPoTarget.vendor}
                disabled
                style={{ background: 'var(--bg-card)', opacity: 0.8 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Email Vendor Tujuan *</label>
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="nama@vendor.com"
                required
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Subjek Email</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Catatan Tambahan untuk Vendor (Opsional)</label>
              <textarea
                value={emailCustomNote}
                onChange={(e) => setEmailCustomNote(e.target.value)}
                rows={2}
                placeholder="Misal: Mohon diproses segera ya pak/bu, terima kasih."
                style={{ width: '100%', fontSize: '12px', padding: '8px' }}
              />
            </div>

            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong>Ringkasan Isi PO:</strong>
              <div style={{ marginTop: '4px' }}>
                • <strong>{emailPoTarget.items.length} item barang cetak</strong> | Tenggat: {formatDate(emailPoTarget.tglSelesai)} {emailPoTarget.jamSelesai}
                {emailPoTarget.driveUrl && <div>• Link Drive: <a href={emailPoTarget.driveUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{emailPoTarget.driveUrl}</a></div>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEmailPoTarget(null)} disabled={isSendingEmail}>
                Batal
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleSendEmailVendor}
                disabled={isSendingEmail}
                style={{
                  background: '#EA4335',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  border: 'none',
                  opacity: isSendingEmail ? 0.7 : 1,
                  cursor: isSendingEmail ? 'not-allowed' : 'pointer'
                }}
              >
                {isSendingEmail ? (
                  <>Mengirim Email...</>
                ) : (
                  <>
                    <Send size={15} /> Kirim Email Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pisahkan & Rapikan File Google Drive Vendor */}
      {showRelocateModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '860px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}
                >
                  <FolderSync size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                    Pisahkan &amp; Rapikan Berkas di Google Drive
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    Pindahkan berkas File Cetak / SPK Vendor dari folder Pembayaran Vendor ke folder khususnya
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => setShowRelocateModal(false)}
                disabled={isMovingFiles}
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Folder Mapping Information */}
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.04)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '12px',
                lineHeight: '1.5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FolderCheck size={16} /> Penataan Struktur Folder Otomatis:
                </strong>
                {pembayaranFolderInfo && (
                  <a
                    href={`https://drive.google.com/drive/folders/${pembayaranFolderInfo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-xs"
                    style={{ fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={12} /> Buka Folder Pembayaran di Drive
                  </a>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '6px' }}>
                <div style={{ background: '#FFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📁 Folder Sumber Asal:</div>
                  <div style={{ fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>CTRL PRINT / Pembayaran Vendor</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Khusus slip transfer bukti bayar tagihan vendor.</div>
                </div>
                <div style={{ background: '#FFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📁 Folder Tujuan Pemisahan:</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>CTRL PRINT / File Cetak &amp; PO Vendor</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Khusus berkas cetak, gambar/artwork, PDF, &amp; SPK vendor.</div>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {relocateError && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #F87171',
                  color: '#991B1B',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={16} />
                <span>{relocateError}</span>
              </div>
            )}

            {/* Moving Progress Indicator */}
            {isMovingFiles && moveProgress && (
              <div
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Sedang Memindahkan Berkas ke Folder 'File Cetak &amp; PO Vendor'...</span>
                  <span>{moveProgress.current} / {moveProgress.total}</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#DBEAFE', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: 'var(--primary)',
                      width: `${Math.round((moveProgress.current / moveProgress.total) * 100)}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Memproses: <strong>{moveProgress.fileName}</strong>
                </div>
              </div>
            )}

            {/* Scanning Loader */}
            {isScanningFiles ? (
              <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                <RefreshCw size={28} className="spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Memindai Folder 'Pembayaran Vendor' di Google Drive...</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Menganalisis berkas file cetak vs bukti transfer pembayaran...
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {/* Stats Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-main)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
                    <span>Total Berkas: <strong>{scannedFiles.length}</strong></span>
                    <span style={{ color: 'var(--primary)' }}>
                      File Cetak Terdeteksi: <strong>{scannedFiles.filter((f) => f.detectedType === 'file_cetak').length}</strong>
                    </span>
                    <span style={{ color: '#16A34A' }}>
                      Bukti Bayar (Tetap): <strong>{scannedFiles.filter((f) => f.detectedType === 'bukti_bayar').length}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllPrintFiles}
                      className="btn btn-outline btn-xs"
                      style={{ fontSize: '11px' }}
                    >
                      Pilih Semua File Cetak
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFileIdsToMove([])}
                      className="btn btn-outline btn-xs"
                      style={{ fontSize: '11px' }}
                    >
                      Batal Pilih
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenRelocateModal}
                      className="btn btn-outline btn-xs"
                      style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={11} /> Refresh
                    </button>
                  </div>
                </div>

                {/* File List Table */}
                {scannedFiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Folder <strong>Pembayaran Vendor</strong> saat ini bersih / belum memiliki berkas.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ width: '40px', padding: '10px 8px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={
                                selectedFileIdsToMove.length > 0 &&
                                selectedFileIdsToMove.length === scannedFiles.filter((f) => f.detectedType === 'file_cetak').length
                              }
                              onChange={(e) => {
                                if (e.target.checked) handleSelectAllPrintFiles();
                                else setSelectedFileIdsToMove([]);
                              }}
                              title="Pilih semua file cetak"
                            />
                          </th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Nama Berkas di Google Drive</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Klasifikasi</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Alasan Deteksi / Relasi PO</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>Lihat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedFiles.map((file) => {
                          const isSelected = selectedFileIdsToMove.includes(file.id);
                          const isPrint = file.detectedType === 'file_cetak';

                          return (
                            <tr
                              key={file.id}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                background: isSelected
                                  ? 'rgba(37, 99, 235, 0.04)'
                                  : 'transparent'
                              }}
                            >
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectFile(file.id)}
                                />
                              </td>
                              <td style={{ padding: '8px 12px', maxWidth: '320px' }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                  {file.name}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {file.mimeType} {file.size ? `• ${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {isPrint ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: 'rgba(37, 99, 235, 0.1)',
                                      color: 'var(--primary)'
                                    }}
                                  >
                                    📁 File Cetak Vendor
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: 'rgba(16, 185, 129, 0.1)',
                                      color: '#059669'
                                    }}
                                  >
                                    💳 Bukti Bayar
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {file.detectedReason}
                              </td>
                              <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Lihat berkas di Google Drive"
                                    style={{ color: 'var(--primary)' }}
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                marginTop: '16px',
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {selectedFileIdsToMove.length > 0
                  ? `📌 ${selectedFileIdsToMove.length} berkas dipilih untuk dipindahkan ke folder 'File Cetak & PO Vendor'.`
                  : 'Pilih minimal satu berkas cetak untuk dipindahkan.'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowRelocateModal(false)}
                  disabled={isMovingFiles}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExecuteMoveFiles}
                  disabled={isMovingFiles || selectedFileIdsToMove.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <FolderSync size={16} />
                  {isMovingFiles
                    ? 'Memindahkan Berkas...'
                    : `Pindahkan ${selectedFileIdsToMove.length} File Cetak Sekarang`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
