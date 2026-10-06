import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Search,
  Eye,
  FileText,
  Share2,
  AlertCircle,
  Copy,
  Check,
  FolderKanban,
  Edit3,
  RefreshCw,
  Send,
  Upload,
  User,
  Phone,
  Layers,
  HelpCircle,
  Info,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  MapPin,
  RotateCcw,
  PenTool,
  Printer,
  ArrowRight
} from 'lucide-react';
import { Invoice, Settings } from '../types';
import { saveDocument, convertToDirectImageUrl, isInvoiceMatch, fetchDirectInvoice } from '../firebaseService';
import { openWhatsApp } from '../utils/whatsapp';
import { GoogleDriveUploader } from './GoogleDriveUploader';
import { GoogleDrivePreviewEmbed } from './GoogleDrivePreviewEmbed';
import { getDriveInfo, parseGoogleDriveUrl, GoogleDriveInfo } from '../utils/googleDrive';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';

export { parseGoogleDriveUrl };

interface AccDesainPageProps {
  invoices: Invoice[];
  settings: Settings;
  showToast: (msg: string, isErr?: boolean) => void;
  isAdmin?: boolean;
  customerInvoice?: Invoice | null;
  onClearCustomerInvoice?: () => void;
}

interface RevisionPin {
  id: string;
  xPercent: number;
  yPercent: number;
  note: string;
}

export function AccDesainPage({
  invoices,
  settings,
  showToast,
  isAdmin = true,
  customerInvoice = null,
  onClearCustomerInvoice
}: AccDesainPageProps) {
  // Admin Filter Tabs: 'menunggu' (Approval Pending) | 'revisi' (Needs Revision) | 'acc' (Approved/Ready) | 'semua' (All)
  const [filterStatus, setFilterStatus] = useState<'menunggu' | 'revisi' | 'acc' | 'semua'>('menunggu');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Invoice for Full Inspection / ACC Action Modal
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);

  // Customer verification state for public/customer mode (starts clean, requires manual input unless explicit URL param)
  const [targetInvNoFromUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('acc') || p.get('inv') || p.get('invNo') || p.get('noInv') || null;
    }
    return null;
  });
  const [isLoadingDirect, setIsLoadingDirect] = useState<boolean>(() => {
    if (customerInvoice) return false;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return Boolean(p.get('acc') || p.get('inv') || p.get('invNo') || p.get('noInv'));
    }
    return false;
  });
  const [verifiedCustInv, setVerifiedCustInv] = useState<Invoice | null>(customerInvoice || null);
  const [singleInput, setSingleInput] = useState('');
  const [matchingCustInvoices, setMatchingCustInvoices] = useState<Invoice[]>([]);
  const [verifyError, setVerifyError] = useState('');

  // Proofing Interactive Zoom & View Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [previewMode, setPreviewMode] = useState<'embed' | 'image'>('embed');
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);

  // Visual Revision Pin State (Customer Interactive Annotation)
  const [isPinModeActive, setIsPinModeActive] = useState<boolean>(false);
  const [revisionPins, setRevisionPins] = useState<RevisionPin[]>([]);
  const [activePinDraft, setActivePinDraft] = useState<{ x: number; y: number } | null>(null);
  const [pinDraftText, setPinDraftText] = useState<string>('');

  // Admin edit link modal state
  const [editLinkModalOpen, setEditLinkModalOpen] = useState(false);
  const [inputDriveUrl, setInputDriveUrl] = useState('');
  const [inputNote, setInputNote] = useState('');

  // Modal for creating independent ACC & Drive connector document
  const [newAccModalOpen, setNewAccModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustWa, setNewCustWa] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newSelectedInvId, setNewSelectedInvId] = useState('');
  const [newDriveUrl, setNewDriveUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Customer Action Modals
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveSignerName, setApproveSignerName] = useState('');
  const [approveNote, setApproveNote] = useState('');

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedRevisionTags, setSelectedRevisionTags] = useState<string[]>([]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-detect ONLY from explicit URL query param (e.g. direct shared WhatsApp proof link)
  useEffect(() => {
    // Clear legacy remembered session so customer always starts clean
    try {
      localStorage.removeItem('ctrl_print_last_acc_no');
    } catch {}

    if (customerInvoice) {
      setVerifiedCustInv(customerInvoice);
      setSelectedInv(customerInvoice);
      setIsLoadingDirect(false);
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const qAcc = urlParams.get('acc');
      const qInv = urlParams.get('inv') || urlParams.get('invNo') || urlParams.get('noInv');
      const qWa = urlParams.get('wa');

      // Detect from any valid param alias
      const targetInvNo = qAcc || qInv;

      if (targetInvNo) {
        if (invoices.length > 0) {
          const found = invoices.find((i) => isInvoiceMatch(i, targetInvNo));
          if (found) {
            setVerifiedCustInv(found);
            setSelectedInv(found);
            setIsLoadingDirect(false);
            return;
          }
        }

        // Fast direct fetch to avoid gap
        fetchDirectInvoice(targetInvNo)
          .then((directInv) => {
            if (directInv) {
              setVerifiedCustInv(directInv);
              setSelectedInv(directInv);
            }
          })
          .finally(() => {
            setIsLoadingDirect(false);
          });
      } else {
        setIsLoadingDirect(false);
      }

      if (qWa && invoices.length > 0) {
        const cleanWa = qWa.replace(/[^0-9]/g, '');
        const matches = invoices.filter((i) => {
          const invWa = (i.waCust || '').replace(/[^0-9]/g, '');
          return invWa && (invWa.endsWith(cleanWa) || cleanWa.endsWith(invWa));
        });
        if (matches.length === 1) {
          setVerifiedCustInv(matches[0]);
          setSelectedInv(matches[0]);
          return;
        } else if (matches.length > 1) {
          setMatchingCustInvoices(matches);
          return;
        }
      }
    } catch {
      setIsLoadingDirect(false);
    }
  }, [customerInvoice, invoices]);

  // Keep verifiedCustInv updated when invoices state refreshes
  useEffect(() => {
    if (verifiedCustInv) {
      const fresh = invoices.find((i) => i.id === verifiedCustInv.id);
      if (fresh) {
        setVerifiedCustInv(fresh);
        if (selectedInv?.id === fresh.id) {
          setSelectedInv(fresh);
        }
      }
    }
  }, [invoices]);

  const handleVerifyCustomerAccess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerifyError('');
    setMatchingCustInvoices([]);

    const query = singleInput.trim();
    if (!query) {
      setVerifyError('Silakan masukkan Nomor Invoice atau Nomor WhatsApp Anda.');
      return;
    }

    const cleanDigits = query.replace(/[^0-9]/g, '');

    // 1. Check exact/partial invoice match
    const matchByInv = invoices.filter((inv) => isInvoiceMatch(inv, query));
    if (matchByInv.length === 1) {
      const matched = matchByInv[0];
      setVerifiedCustInv(matched);
      setSelectedInv(matched);
      showToast(`Akses diterima. Menampilkan hasil desain untuk Nota #${matched.noInv}`);
      return;
    } else if (matchByInv.length > 1) {
      setMatchingCustInvoices(matchByInv);
      return;
    }

    // 2. Check WhatsApp phone match
    if (cleanDigits.length >= 4) {
      const matchByWa = invoices.filter((inv) => {
        const cleanSaved = (inv.waCust || '').replace(/[^0-9]/g, '');
        return cleanSaved && (cleanSaved.includes(cleanDigits) || cleanDigits.includes(cleanSaved) || cleanSaved.endsWith(cleanDigits));
      });

      if (matchByWa.length === 1) {
        const matched = matchByWa[0];
        setVerifiedCustInv(matched);
        setSelectedInv(matched);
        showToast(`Akses diterima. Menampilkan hasil desain untuk ${matched.namaCust} (#${matched.noInv})`);
        return;
      } else if (matchByWa.length > 1) {
        setMatchingCustInvoices(matchByWa);
        return;
      }
    }

    setVerifyError('Nomor Invoice atau WhatsApp tidak ditemukan dalam data pesanan kami. Silakan cek kembali nomor nota Anda.');
  };

  const handleCreateAutoDriveFolder = async () => {
    setIsCreatingFolder(true);
    try {
      const invNo = newSelectedInvId ? invoices.find((i) => i.id === newSelectedInvId)?.noInv || 'DRAFT' : 'PROOFCETAK';
      const custName = newCustName.trim() || 'Pelanggan';

      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceNo: invNo, customerName: custName })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.folderUrl) {
          setNewDriveUrl(data.folderUrl);
          showToast(`✅ ${data.message || 'Folder Google Drive berhasil dibuat!'}`);
        }
      } else {
        showToast('Gagal menghubungkan ke Google Drive API. Menggunakan fallback URL.', true);
      }
    } catch (err: any) {
      showToast('Error saat membuat folder Google Drive: ' + err.message, true);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSaveNewAccDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() && !newSelectedInvId) {
      showToast('Masukkan Nama Customer atau Pilih Nota terkait', true);
      return;
    }

    const linkedInv = newSelectedInvId ? invoices.find((i) => i.id === newSelectedInvId) : null;
    const noInv = linkedInv ? linkedInv.noInv : `ACC-${Date.now().toString().slice(-6)}`;
    const id = linkedInv ? linkedInv.id : String(Date.now());
    const custName = linkedInv ? linkedInv.namaCust : newCustName.trim();
    const custWa = linkedInv ? linkedInv.waCust : newCustWa.trim();

    const historyItem = {
      date: new Date().toLocaleString('id-ID'),
      action: 'Dokumen ACC & File Drive Proofing Diterbitkan',
      note: newNotes.trim() || `Judul: ${newJobTitle || 'Proofing Cetak'}`,
      user: 'Tim Desainer',
      fileUrl: newDriveUrl.trim()
    };

    const newDriveInfo = getDriveInfo(newDriveUrl);

    if (linkedInv) {
      const updatedInv: Invoice = {
        ...linkedInv,
        accDesainUrl: newDriveInfo.drive_view_url || newDriveUrl.trim() || linkedInv.accDesainUrl,
        drive_file_id: newDriveInfo.drive_file_id || linkedInv.drive_file_id || undefined,
        drive_view_url: newDriveInfo.drive_view_url || linkedInv.drive_view_url || undefined,
        drive_embed_url: newDriveInfo.drive_embed_url || linkedInv.drive_embed_url || undefined,
        fileUrl: newDriveInfo.drive_view_url || newDriveUrl.trim() || linkedInv.fileUrl,
        proofImageUrl: undefined,
        accDesainNotes: newNotes.trim() || linkedInv.accDesainNotes,
        accDesainStatus: 'Menunggu ACC',
        proofStatus: 'pending',
        accDesainHistory: [historyItem, ...(linkedInv.accDesainHistory || [])]
      };
      await saveDocument('invoice', updatedInv);
    } else {
      const standaloneAccDoc: Invoice = {
        id,
        tipeDoc: 'ACC_Doc',
        noInv,
        tglInv: new Date().toLocaleDateString('id-ID'),
        tempoInv: new Date().toLocaleDateString('id-ID'),
        namaCust: custName,
        waCust: custWa,
        kasir: 'Tim Desain',
        items: [
          {
            prodId: String(Date.now()),
            nama: newJobTitle.trim() || 'Desain & Proofing Cetak',
            qty: 1,
            satuan: 'Pcs',
            hpp: 0,
            harga: 0,
            diskon: 0,
            subtotal: 0
          }
        ],
        diskonTambahan: 0,
        totalHPP: 0,
        grandTotal: 0,
        dibayar: 0,
        sisaTertagih: 0,
        statusBayar: 'Lunas',
        statusJob: 'Desain',
        accDesainUrl: newDriveInfo.drive_view_url || newDriveUrl.trim(),
        drive_file_id: newDriveInfo.drive_file_id || undefined,
        drive_view_url: newDriveInfo.drive_view_url || undefined,
        drive_embed_url: newDriveInfo.drive_embed_url || undefined,
        fileUrl: newDriveInfo.drive_view_url || newDriveUrl.trim(),
        accDesainNotes: newNotes.trim(),
        accDesainStatus: 'Menunggu ACC',
        proofStatus: 'pending',
        accDesainHistory: [historyItem]
      };
      await saveDocument('invoice', standaloneAccDoc);
    }

    showToast(`✅ Dokumen ACC Desain #${noInv} Berhasil Dibuat & Siap Dikirim ke Pelanggan!`);
    setNewAccModalOpen(false);
    setNewCustName('');
    setNewCustWa('');
    setNewJobTitle('');
    setNewSelectedInvId('');
    setNewDriveUrl('');
    setNewNotes('');
  };

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return invoices.filter((inv) => {
      // Must have at least a driveUrl, fileUrl, accDesainUrl, proofImageUrl, or be in a design status
      const hasDesignFile = Boolean(
        inv.accDesainUrl ||
        inv.fileUrl ||
        inv.proofImageUrl ||
        inv.items?.some((i) => i.fileUrl)
      );

      // Search term match
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        isInvoiceMatch(inv, term) ||
        inv.items.some((i) => i.nama.toLowerCase().includes(term));

      if (!matchSearch) return false;

      const currentStatus = inv.accDesainStatus || (inv.proofStatus === 'approved' ? 'ACC Disetujui' : inv.proofStatus === 'rejected' ? 'Minta Revisi' : 'Menunggu ACC');

      if (filterStatus === 'menunggu') return currentStatus === 'Menunggu ACC';
      if (filterStatus === 'revisi') return currentStatus === 'Minta Revisi' || inv.proofStatus === 'rejected';
      if (filterStatus === 'acc') return currentStatus === 'ACC Disetujui' || currentStatus === 'Siap Cetak' || inv.proofStatus === 'approved';

      return true;
    });
  }, [invoices, searchTerm, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    let total = 0;
    let meunggu = 0;
    let acc = 0;
    let revisi = 0;

    invoices.forEach((inv) => {
      total++;
      const st = inv.accDesainStatus || (inv.proofStatus === 'approved' ? 'ACC Disetujui' : inv.proofStatus === 'rejected' ? 'Minta Revisi' : 'Menunggu ACC');
      if (st === 'Menunggu ACC') meunggu++;
      if (st === 'ACC Disetujui' || st === 'Siap Cetak' || inv.proofStatus === 'approved') acc++;
      if (st === 'Minta Revisi' || inv.proofStatus === 'rejected') revisi++;
    });

    return { total, meunggu, acc, revisi };
  }, [invoices]);

  const handleOpenEditLink = (inv: Invoice) => {
    setSelectedInv(inv);
    setInputDriveUrl(inv.accDesainUrl || inv.fileUrl || inv.proofImageUrl || '');
    setInputNote(inv.accDesainNotes || '');
    setEditLinkModalOpen(true);
  };

  const handleSaveDriveLink = async () => {
    if (!selectedInv) return;
    if (!inputDriveUrl.trim()) {
      showToast('Masukkan link file Google Drive terlebih dahulu', true);
      return;
    }

    const driveInfo = getDriveInfo(inputDriveUrl);

    const updatedHistory = selectedInv.accDesainHistory || [];
    updatedHistory.unshift({
      date: new Date().toLocaleString('id-ID'),
      action: 'File Desain / Proofing Google Drive Diperbarui',
      note: inputNote.trim() || 'Link Google Drive terpasang',
      user: 'Tim Desainer',
      fileUrl: driveInfo.drive_view_url || inputDriveUrl.trim()
    });

    const updatedInv: Invoice = {
      ...selectedInv,
      accDesainUrl: driveInfo.drive_view_url || inputDriveUrl.trim(),
      drive_file_id: driveInfo.drive_file_id || undefined,
      drive_view_url: driveInfo.drive_view_url || undefined,
      drive_embed_url: driveInfo.drive_embed_url || undefined,
      fileUrl: driveInfo.drive_view_url || inputDriveUrl.trim(),
      proofImageUrl: undefined,
      accDesainStatus: 'Menunggu ACC',
      accDesainNotes: inputNote.trim() || selectedInv.accDesainNotes,
      proofStatus: 'pending',
      accDesainHistory: updatedHistory,
      statusJob: selectedInv.statusJob === 'Pending' ? 'Desain' : selectedInv.statusJob
    };

    await saveDocument('invoice', updatedInv);
    setSelectedInv(updatedInv);
    setEditLinkModalOpen(false);
    showToast(`✅ Link Google Drive #${selectedInv.noInv} tersimpan! Status: Menunggu ACC.`);
  };

  const handleApproveDesign = async () => {
    if (!selectedInv) return;

    const signer = approveSignerName.trim() || selectedInv.namaCust || (isAdmin ? 'Admin / Staff' : 'Customer');
    const updatedHistory = selectedInv.accDesainHistory || [];
    updatedHistory.unshift({
      date: new Date().toLocaleString('id-ID'),
      action: 'DESAIN DISETUJUI (ACC CETAK)',
      note: `${approveNote.trim() ? `Catatan: "${approveNote.trim()}" • ` : ''}Tanda Tangan / Persetujuan: ${signer}`,
      user: signer
    });

    const updatedInv: Invoice = {
      ...selectedInv,
      accDesainStatus: 'ACC Disetujui',
      proofStatus: 'approved',
      proofApprovedAt: new Date().toLocaleString('id-ID'),
      statusJob: 'Produksi',
      accDesainHistory: updatedHistory
    };

    await saveDocument('invoice', updatedInv);
    setSelectedInv(updatedInv);
    setVerifiedCustInv(updatedInv);
    setApproveModalOpen(false);
    setApproveNote('');
    setApproveSignerName('');
    showToast(`🎉 ACC Desain #${selectedInv.noInv} Berhasil Disetujui! Status otomatis pindah ke Antrean Cetak.`);

    // Send WA Notification if customer number available
    if (selectedInv.waCust) {
      let msg = `*KONFIRMASI ACC DESAIN - ${settings.company || 'CTRL PRINT'}*\n\n`;
      msg += `Halo Kak *${selectedInv.namaCust}*,\n`;
      msg += `Terima kasih! Pesanan No. *#${selectedInv.noInv}* telah *DISETUJUI (ACC DESAIN SIAP CETAK)* pada ${new Date().toLocaleString('id-ID')}.\n\n`;
      msg += `✅ *Status Pesanan:* Sedang Masuk Antrean Cetak & Produksi\n`;
      if (signer) msg += `✍️ *Penyetuju:* ${signer}\n`;
      if (approveNote.trim()) msg += `📝 *Catatan:* ${approveNote.trim()}\n`;
      msg += `\nKami akan segera mengabarkan saat pesanan Anda selesai dicetak. Terima kasih! 🙏`;

      openWhatsApp(selectedInv.waCust, msg);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedInv) return;

    let fullRevisionText = '';
    if (selectedRevisionTags.length > 0) {
      fullRevisionText += `[Kategori: ${selectedRevisionTags.join(', ')}]\n`;
    }
    if (revisionNotes.trim()) {
      fullRevisionText += revisionNotes.trim();
    }
    if (revisionPins.length > 0) {
      fullRevisionText += `\n\n📌 Titik Anotasi Pin Gambar:\n` + revisionPins.map((p, idx) => `• Titik #${idx + 1} (${p.xPercent}% x ${p.yPercent}%): ${p.note}`).join('\n');
    }

    if (!fullRevisionText.trim()) {
      showToast('Mohon masukkan rincian catatan revisi yang diperlukan', true);
      return;
    }

    const userLabel = isAdmin ? 'Admin / Staff' : selectedInv.namaCust || 'Customer';
    const updatedHistory = selectedInv.accDesainHistory || [];
    updatedHistory.unshift({
      date: new Date().toLocaleString('id-ID'),
      action: 'MINTA REVISI DESAIN',
      note: fullRevisionText,
      user: userLabel
    });

    const updatedInv: Invoice = {
      ...selectedInv,
      accDesainStatus: 'Minta Revisi',
      proofStatus: 'rejected',
      accDesainNotes: fullRevisionText,
      accDesainHistory: updatedHistory,
      statusJob: 'Desain'
    };

    await saveDocument('invoice', updatedInv);
    setSelectedInv(updatedInv);
    setVerifiedCustInv(updatedInv);
    setRevisionModalOpen(false);
    setRevisionNotes('');
    setSelectedRevisionTags([]);
    setRevisionPins([]);
    setIsPinModeActive(false);
    showToast(`⚠️ Permintaan revisi #${selectedInv.noInv} tersimpan. Tim desainer akan segera memprosesnya.`);

    // Send WA Notification to shop
    let msg = `*CATATAN REVISI DESAIN - #${selectedInv.noInv}*\n\n`;
    msg += `• Customer: ${selectedInv.namaCust} (${selectedInv.waCust || '-'})\n`;
    msg += `• Detail Revisi:\n"${fullRevisionText}"\n\n`;
    msg += `Mohon desainer segera mengecek dan memperbarui revisi Google Drive. Terima kasih!`;

    openWhatsApp(settings.phone, msg);
  };

  const handleDeleteAccPortal = async (inv: Invoice) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus/membersihkan portal & link ACC Desain untuk Faktur No. #${inv.noInv}? Link file dan status ACC Desain akan dibersihkan.`)) {
      return;
    }

    const updatedHistory = inv.accDesainHistory || [];
    updatedHistory.unshift({
      date: new Date().toLocaleString('id-ID'),
      action: 'PORTAL ACC DESAIN DIHAPUS',
      note: 'Admin menghapus link & portal ACC Desain',
      user: isAdmin ? 'Admin Staff' : 'Sistem'
    });

    const updatedInv: Invoice = {
      ...inv,
      accDesainUrl: '',
      accDesainStatus: undefined,
      accDesainNotes: '',
      proofStatus: undefined,
      accDesainHistory: updatedHistory
    };

    await saveDocument('invoice', updatedInv);
    if (selectedInv?.id === inv.id) {
      setSelectedInv(null);
    }
    showToast(`🗑️ Portal ACC Desain untuk Faktur #${inv.noInv} berhasil dibersihkan.`);
  };

  const handleShareAccLink = (inv: Invoice) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}?inv=${encodeURIComponent(inv.noInv)}&tab=acc-desain`;

    navigator.clipboard.writeText(shareUrl);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
    showToast(`Link ACC Desain #${inv.noInv} berhasil disalin!`);

    if (inv.waCust) {
      let msg = `*PRATINJAU & ACC DESAIN CETAK - ${settings.company || 'CTRL PRINT'}*\n\n`;
      msg += `Halo Kak *${inv.namaCust}*,\n`;
      msg += `Berikut hasil desain untuk pesanan No. *#${inv.noInv}*.\n\n`;
      if (inv.accDesainUrl) msg += `📂 *Link File Desain:* ${inv.accDesainUrl}\n\n`;
      msg += `Mohon periksa tulisan, nomor HP, dan tata letak melalui Portal ACC Cepat kami:\n`;
      msg += `👉 ${shareUrl}\n\n`;
      msg += `• Klik *SETUJU & CETAK (ACC)* jika desain sudah sesuai.\n`;
      msg += `• Klik *MINTA REVISI* jika ada bagian tulisan/gambar yang ingin diubah.\n\n`;
      msg += `Terima kasih! 🙏`;

      openWhatsApp(inv.waCust, msg);
    }
  };

  // Add Annotation Pin on Image
  const handleImageCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinModeActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setActivePinDraft({ x, y });
    setPinDraftText('');
  };

  const handleSavePinDraft = () => {
    if (!activePinDraft || !pinDraftText.trim()) {
      setActivePinDraft(null);
      return;
    }
    const newPin: RevisionPin = {
      id: String(Date.now()),
      xPercent: activePinDraft.x,
      yPercent: activePinDraft.y,
      note: pinDraftText.trim()
    };
    setRevisionPins((prev) => [...prev, newPin]);
    setActivePinDraft(null);
    setPinDraftText('');
    showToast(`📍 Titik revisi #${revisionPins.length + 1} ditambahkan!`);
  };

  const handleToggleRevisionTag = (tag: string) => {
    setSelectedRevisionTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Quick preset tags for revisions
  const revisionTagOptions = [
    'Typo Nama / Ejaan',
    'Ganti Nomor Kontak / WA',
    'Ubah Warna / Background',
    'Ganti Foto / Logo Sponsor',
    'Ubah Ukuran / Skala Objek',
    'Pindahkan Posisi Teks'
  ];

  // =========================================================
  // 1. CUSTOMER 1-SCREEN PROOFING VIEW (WHEN NON-ADMIN)
  // =========================================================
  if (!isAdmin) {
    if (!verifiedCustInv) {
      if (isLoadingDirect && targetInvNoFromUrl) {
        return (
          <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 16px' }}>
            <div
              className="card"
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 12px 35px rgba(0, 82, 255, 0.08)',
                borderRadius: '20px',
                background: 'var(--card-bg, #FFFFFF)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '3px solid rgba(37, 99, 235, 0.15)',
                  borderTopColor: '#2563EB',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <div>
                <h3 className="font-heading" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                  Membuka Pratinjau Desain #{targetInvNoFromUrl}...
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Menghubungkan langsung ke server CTRL PRINT Cloud...
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={{ maxWidth: '520px', margin: '30px auto', padding: '0 16px' }}>
          <div
            className="card"
            style={{
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow: '0 12px 35px rgba(0, 82, 255, 0.08)',
              borderRadius: '20px',
              background: 'var(--card-bg, #FFFFFF)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: '#EFF6FF',
                color: '#0052FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '2px solid rgba(0, 82, 255, 0.15)'
              }}
            >
              <ShieldCheck size={34} />
            </div>
            <h3 className="font-heading" style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
              Portal ACC Desain &amp; Proofing
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Masukkan <strong>Nomor Nota</strong> (contoh: <code>INV/2026/0001</code>) atau <strong>Nomor WhatsApp</strong> Anda untuk memeriksa hasil desain sebelum dicetak.
            </p>

            <form onSubmit={handleVerifyCustomerAccess} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  Nomor Invoice ATAU Nomor WhatsApp <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: INV/2026/0001 atau 08123456789"
                  value={singleInput}
                  onChange={(e) => setSingleInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontWeight: 600
                  }}
                  required
                  autoFocus
                />
              </div>

              {verifyError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 600 }}>
                  ⚠️ {verifyError}
                </div>
              )}

              {/* Multiple Matching Orders Picker */}
              {matchingCustInvoices.length > 0 && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '12px', marginTop: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A', marginBottom: '8px' }}>
                    Ditemukan {matchingCustInvoices.length} pesanan dengan nomor tersebut:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchingCustInvoices.map((item) => (
                      <button
                        key={item.id || item.noInv}
                        type="button"
                        onClick={() => {
                          setVerifiedCustInv(item);
                          setSelectedInv(item);
                          showToast(`✅ Membuka desain untuk Nota #${item.noInv}`);
                        }}
                        style={{
                          background: '#FFF',
                          border: '1px solid #93C5FD',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0052FF' }}>#{item.noInv}</strong>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{item.namaCust} • {item.items?.map((i) => i.nama).join(', ')}</div>
                        </div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0052FF' }}>Pilih →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  background: '#0052FF',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🔓 Buka Pratinjau Desain</span>
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Customer is verified! Render 1-Screen Super Fast Proofing Interface
    const inv = verifiedCustInv;
    const driveInfo = parseGoogleDriveUrl(inv.accDesainUrl || inv.fileUrl || inv.proofImageUrl);
    const statusAcc = inv.accDesainStatus || (inv.proofStatus === 'approved' ? 'ACC Disetujui' : inv.proofStatus === 'rejected' ? 'Minta Revisi' : 'Menunggu ACC');
    const isApproved = statusAcc === 'ACC Disetujui' || statusAcc === 'Siap Cetak' || inv.proofStatus === 'approved';

    let badgeBg = '#FEF3C7';
    let badgeColor = '#D97706';
    let badgeIcon = <Clock size={14} />;

    if (isApproved) {
      badgeBg = '#D1FAE5';
      badgeColor = '#059669';
      badgeIcon = <CheckCircle2 size={14} />;
    } else if (statusAcc === 'Minta Revisi' || inv.proofStatus === 'rejected') {
      badgeBg = '#FEE2E2';
      badgeColor = '#DC2626';
      badgeIcon = <XCircle size={14} />;
    }

    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '50px' }}>
        {/* Customer Action Bar (Static at top) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            marginBottom: '16px',
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(0, 82, 255, 0.25)', borderRadius: '10px', color: '#60A5FA' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 700 }}>PROOFING DESAIN CETAK</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                Nota #{inv.noInv} • {inv.namaCust}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: badgeBg,
                color: badgeColor,
                fontSize: '11.5px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {badgeIcon}
              <span>{statusAcc}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerifiedCustInv(null);
                setSelectedInv(null);
                setSingleInput('');
                setMatchingCustInvoices([]);
                setVerifyError('');
                try {
                  localStorage.removeItem('ctrl_print_last_acc_no');
                } catch {}
                if (onClearCustomerInvoice) onClearCustomerInvoice();
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#CBD5E1',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Ganti Nota
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {isApproved ? (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: '#ECFDF5',
              border: '1.5px solid #10B981',
              color: '#065F46',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)'
            }}
          >
            <CheckCircle2 size={28} style={{ color: '#10B981', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '14.5px', display: 'block' }}>🎉 Desain Telah Disetujui (ACC Cetak)!</strong>
              <span style={{ fontSize: '12px', color: '#047857' }}>
                Pesanan Anda telah masuk ke antrean cetak / produksi. Tim kami sedang memproses pesanan Anda dengan cermat.
              </span>
            </div>
          </div>
        ) : statusAcc === 'Minta Revisi' ? (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: '#FEF2F2',
              border: '1.5px solid #EF4444',
              color: '#991B1B',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            <XCircle size={26} style={{ color: '#EF4444', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '14px', display: 'block' }}>⚠️ Permintaan Revisi Sedang Dikerjakan Desainer</strong>
              <span style={{ fontSize: '12px', color: '#B91C1C' }}>
                {inv.accDesainNotes ? `Catatan: "${inv.accDesainNotes}"` : 'Desainer sedang memperbaiki desain sesuai masukan Anda.'}
              </span>
            </div>
          </div>
        ) : null}

        {/* Main Proofing Card */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '18px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
            background: 'var(--card-bg, #FFFFFF)',
            marginBottom: '20px'
          }}
        >
          {/* Order Specs & Instructions Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Item yang Dicetak:</span>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '2px 0 4px 0', color: 'var(--text-main)' }}>
                {inv.items?.map((i) => i.nama).join(', ') || 'Pesanan Cetak'}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Jumlah: {inv.items?.map((i) => `${i.qty} ${i.satuan}`).join(', ')} • Tgl: {formatDate(inv.tglInv)}
              </div>
            </div>

            {/* Viewer Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(0.7, prev - 0.2))}
                title="Zoom Out"
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', fontWeight: 700 }}
              >
                <ZoomOut size={14} /> -
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                title="Reset Zoom"
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700 }}
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                title="Zoom In"
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', fontWeight: 700 }}
              >
                <ZoomIn size={14} /> +
              </button>
              {driveInfo.directImageUrl && (
                <button
                  type="button"
                  onClick={() => setIsPinModeActive(!isPinModeActive)}
                  style={{
                    background: isPinModeActive ? '#EF4444' : 'var(--bg-main)',
                    color: isPinModeActive ? '#FFF' : 'var(--text-main)',
                    border: isPinModeActive ? '1px solid #EF4444' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Klik pada gambar untuk menandai titik revisi"
                >
                  <MapPin size={14} /> {isPinModeActive ? 'Batal Pin' : 'Tandai Titik Revisi'}
                </button>
              )}
            </div>
          </div>

          {/* Designer Instructions Box */}
          {inv.accDesainNotes && statusAcc !== 'Minta Revisi' && (
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12.5px',
                color: '#1E3A8A',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <Info size={16} style={{ color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Instruksi Desainer:</strong> "{inv.accDesainNotes}"
              </div>
            </div>
          )}

          {/* Proofing Interactive Viewer */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              minHeight: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPinModeActive && driveInfo.directImageUrl ? (
              <div
                onClick={handleImageCanvasClick}
                style={{
                  position: 'relative',
                  width: '100%',
                  cursor: 'crosshair',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease'
                }}
              >
                <img
                  src={driveInfo.directImageUrl}
                  alt={`Proof #${inv.noInv}`}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />

                {/* Render Revision Pins */}
                {revisionPins.map((pin, idx) => (
                  <div
                    key={pin.id}
                    style={{
                      position: 'absolute',
                      left: `${pin.xPercent}%`,
                      top: `${pin.yPercent}%`,
                      transform: 'translate(-50%, -100%)',
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    <div
                      style={{
                        background: '#EF4444',
                        color: '#FFF',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                      }}
                    >
                      #{idx + 1} {pin.note}
                    </div>
                    <MapPin size={22} style={{ color: '#EF4444', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
                <GoogleDrivePreviewEmbed
                  url={inv.accDesainUrl || inv.drive_view_url || inv.fileUrl}
                  fileId={inv.drive_file_id}
                  height="480px"
                  showFallbackButton={true}
                  emptyMessage="File Desain Sedang Disiapkan oleh Desainer"
                />
              </div>
            )}

            {/* Pin Draft Input Overlay */}
            {activePinDraft && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  zIndex: 20
                }}
              >
                <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '360px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} color="#EF4444" /> Beri Catatan Pada Titik Ini:
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: Nomor HP typo, ganti jadi 0812..."
                    value={pinDraftText}
                    onChange={(e) => setPinDraftText(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '10px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePinDraft();
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setActivePinDraft(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 10px' }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSavePinDraft}
                      style={{ fontSize: '12px', padding: '6px 12px', background: '#EF4444', borderColor: '#EF4444', fontWeight: 700 }}
                    >
                      Simpan Titik
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Revision Pins List */}
          {revisionPins.length > 0 && (
            <div style={{ marginTop: '14px', padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#991B1B', marginBottom: '6px' }}>
                📌 {revisionPins.length} Titik Revisi yang Anda Tandai:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {revisionPins.map((p, i) => (
                  <div key={p.id} style={{ fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', padding: '4px 8px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                    <span><strong>#{i + 1}:</strong> {p.note}</span>
                    <button
                      type="button"
                      onClick={() => setRevisionPins((prev) => prev.filter((x) => x.id !== p.id))}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 800, fontSize: '11px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TWO PROMINENT ACTION BUTTONS */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-color)' }}>
            {isApproved ? (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRevisionModalOpen(true)}
                  style={{ fontSize: '12px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', padding: '6px 14px' }}
                >
                  Masih ada perubahan mendadak? Ajukan revisi tambahan
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {/* BIG GREEN BUTTON: ACC & PRINT */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInv(inv);
                    setApproveSignerName(inv.namaCust || '');
                    setApproveModalOpen(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  <CheckCircle2 size={24} />
                  <span>SETUJU &amp; CETAK (ACC)</span>
                </button>

                {/* BIG RED BUTTON: REQUEST REVISION */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInv(inv);
                    setRevisionModalOpen(true);
                  }}
                  style={{
                    background: '#FEF2F2',
                    color: '#DC2626',
                    border: '2px solid #FCA5A5',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'transform 0.15s ease, background 0.15s ease'
                  }}
                >
                  <XCircle size={22} />
                  <span>MINTA REVISI DESAIN</span>
                </button>
              </div>
            )}
          </div>

          {/* Timeline History Collapsible */}
          {inv.accDesainHistory && inv.accDesainHistory.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                RIWAYAT PERJALANAN DESAIN:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {inv.accDesainHistory.map((h, i) => (
                  <div key={i} style={{ fontSize: '11.5px', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{h.action}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>{h.date} • {h.user || 'Sistem'}</div>
                    {h.note && <div style={{ color: 'var(--text-main)', marginTop: '2px', fontStyle: 'italic' }}>"{h.note}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Approve Modal for Customer */}
        {approveModalOpen && selectedInv && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(5px)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div className="card" style={{ width: '100%', maxWidth: '460px', borderRadius: '18px', padding: '24px', textAlign: 'center', background: '#FFF' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <CheckCircle2 size={34} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                Konfirmasi Persetujuan Desain (ACC)
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                Dengan menyetujui, file pesanan <strong>#{selectedInv.noInv}</strong> akan langsung dikirim ke mesin cetak. Pastikan nomor kontak dan ejaan teks sudah benar.
              </p>

              <div style={{ textAlign: 'left', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Nama Penyetuju / ACC:
                </label>
                <input
                  type="text"
                  placeholder="Nama Anda..."
                  value={approveSignerName}
                  onChange={(e) => setApproveSignerName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 600 }}
                />
              </div>

              <div style={{ textAlign: 'left', marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Catatan Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Warna dan teks sudah sesuai, siap cetak."
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setApproveModalOpen(false)}
                  style={{ padding: '12px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApproveDesign}
                  style={{
                    background: '#10B981',
                    color: '#FFF',
                    border: 'none',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Ya, Setuju &amp; Cetak
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revision Modal for Customer */}
        {revisionModalOpen && selectedInv && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(5px)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div className="card" style={{ width: '100%', maxWidth: '500px', borderRadius: '18px', padding: '24px', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', background: '#FEF2F2', borderRadius: '10px', color: '#EF4444' }}>
                  <XCircle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Minta Revisi Desain
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Faktur #{selectedInv.noInv}</span>
                </div>
              </div>

              {/* Preset Tags for Fast Picking */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  PILIH BAGIAN YANG INGIN DIUBAH (OPSIONAL):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {revisionTagOptions.map((tag) => {
                    const isSelected = selectedRevisionTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleRevisionTag(tag)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
                          background: isSelected ? '#FEF2F2' : 'var(--bg-main)',
                          color: isSelected ? '#DC2626' : 'var(--text-main)',
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Tuliskan Rincian Perubahan <span style={{ color: '#EF4444' }}>*</span>:
                </label>
                <textarea
                  placeholder="Contoh:&#10;1. Ubah nomor HP di bawah logo jadi 08123456789&#10;2. Warna background tolong dibuat lebih cerah"
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '12.5px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRevisionModalOpen(false)}
                  style={{ padding: '12px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRequestRevision}
                  style={{
                    background: '#EF4444',
                    color: '#FFF',
                    border: 'none',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Kirim Revisi ke Desainer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // 2. ADMIN & DESIGNER WORKSPACE (WHEN ISADMIN === TRUE)
  // =========================================================
  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1938 0%, #132754 50%, #0052FF 100%)',
          padding: '22px 26px',
          borderRadius: '18px',
          color: '#FFFFFF',
          marginBottom: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 82, 255, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                background: 'rgba(255, 184, 0, 0.2)',
                border: '1px solid #FFB800',
                color: '#FFB800',
                fontSize: '10.5px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '20px',
                letterSpacing: '0.5px'
              }}
            >
              ALUR DESAIN &amp; PROOFING CEPAT
            </span>
            <span style={{ fontSize: '11.5px', color: '#CBD5E1' }}>• CTRL PRINT SYSTEM</span>
          </div>
          <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            🎨 Portal ACC Desain &amp; Proofing Pelanggan
          </h2>
          <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: '2px 0 0 0', maxWidth: '620px' }}>
            Kirim pratinjau desain ke WhatsApp pelanggan, terima ACC tanda tangan digital 1-klik, dan pantau catatan revisi secara terstruktur.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setNewAccModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, background: '#FFB800', color: '#0F172A', borderColor: '#FFB800', padding: '9px 16px', borderRadius: '12px' }}
        >
          <FolderKanban size={17} /> + Buat Dokumen ACC / Link Baru
        </button>
      </div>

      {/* 3 Main Workflow Tabs (Menunggu | Perlu Revisi | ACC Disetujui | Semua) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '18px'
        }}
      >
        {/* TAB 1: MENUNGGU ACC */}
        <div
          onClick={() => setFilterStatus('menunggu')}
          style={{
            background: filterStatus === 'menunggu' ? '#FEF3C7' : 'var(--bg-main)',
            border: filterStatus === 'menunggu' ? '2px solid #F59E0B' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: filterStatus === 'menunggu' ? '#92400E' : 'var(--text-muted)' }}>
              ⏳ Menunggu Approval
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
              {stats.meunggu}
            </div>
          </div>
          <Clock size={24} style={{ color: '#F59E0B', opacity: 0.8 }} />
        </div>

        {/* TAB 2: PERLU REVISI */}
        <div
          onClick={() => setFilterStatus('revisi')}
          style={{
            background: filterStatus === 'revisi' ? '#FEE2E2' : 'var(--bg-main)',
            border: filterStatus === 'revisi' ? '2px solid #EF4444' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: filterStatus === 'revisi' ? '#991B1B' : 'var(--text-muted)' }}>
              🔄 Perlu Revisi Desain
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
              {stats.revisi}
            </div>
          </div>
          <XCircle size={24} style={{ color: '#EF4444', opacity: 0.8 }} />
        </div>

        {/* TAB 3: ACC SIAP CETAK */}
        <div
          onClick={() => setFilterStatus('acc')}
          style={{
            background: filterStatus === 'acc' ? '#D1FAE5' : 'var(--bg-main)',
            border: filterStatus === 'acc' ? '2px solid #10B981' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: filterStatus === 'acc' ? '#065F46' : 'var(--text-muted)' }}>
              ✅ ACC Siap Cetak
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {stats.acc}
            </div>
          </div>
          <CheckCircle2 size={24} style={{ color: '#10B981', opacity: 0.8 }} />
        </div>

        {/* TAB 4: SEMUA ARSIP */}
        <div
          onClick={() => setFilterStatus('semua')}
          style={{
            background: filterStatus === 'semua' ? 'var(--card-bg)' : 'var(--bg-main)',
            border: filterStatus === 'semua' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
              📁 Semua Pesanan
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {stats.total}
            </div>
          </div>
          <Layers size={24} style={{ color: 'var(--primary)', opacity: 0.8 }} />
        </div>
      </div>

      {/* Search Input Filter */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari No Inv, Nama Pelanggan, No WA, atau Nama Produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px', fontSize: '13px', height: '38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
          />
        </div>
      </div>

      {/* Designer Job Cards Grid */}
      {filteredJobs.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FolderKanban size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-main)' }}>
            Tidak Ada Pesanan pada Kategori Ini
          </h4>
          <p style={{ fontSize: '12.5px', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            {searchTerm
              ? `Pencarian "${searchTerm}" tidak ditemukan.`
              : 'Semua pesanan pada tab ini sudah tertangani atau belum memiliki file proofing terpasang.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
          {filteredJobs.map((inv) => {
            const driveInfo = parseGoogleDriveUrl(inv.accDesainUrl || inv.fileUrl || inv.proofImageUrl);
            const statusAcc = inv.accDesainStatus || (inv.proofStatus === 'approved' ? 'ACC Disetujui' : inv.proofStatus === 'rejected' ? 'Minta Revisi' : 'Menunggu ACC');
            const isApproved = statusAcc === 'ACC Disetujui' || statusAcc === 'Siap Cetak' || inv.proofStatus === 'approved';

            let badgeBg = '#FEF3C7';
            let badgeColor = '#D97706';
            let badgeIcon = <Clock size={13} />;

            if (isApproved) {
              badgeBg = '#D1FAE5';
              badgeColor = '#059669';
              badgeIcon = <CheckCircle2 size={13} />;
            } else if (statusAcc === 'Minta Revisi' || inv.proofStatus === 'rejected') {
              badgeBg = '#FEE2E2';
              badgeColor = '#DC2626';
              badgeIcon = <XCircle size={13} />;
            }

            return (
              <div
                key={inv.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: statusAcc === 'Minta Revisi' ? '1.5px solid #FCA5A5' : isApproved ? '1.5px solid #A7F3D0' : '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                {/* Thumbnail Header */}
                <div
                  style={{
                    height: '150px',
                    background: '#0F172A',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {driveInfo.isValid && driveInfo.directImageUrl ? (
                    <img
                      src={driveInfo.directImageUrl}
                      alt={`Preview ${inv.noInv}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#64748B', padding: '20px' }}>
                      <FolderKanban size={34} style={{ marginBottom: '4px', opacity: 0.6 }} />
                      <div style={{ fontSize: '11px' }}>Pratinjau File Google Drive</div>
                    </div>
                  )}

                  {/* Status Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    {badgeIcon}
                    <span>{statusAcc}</span>
                  </div>

                  {/* Invoice Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    #{inv.noInv}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>{inv.namaCust}</strong>
                        {inv.waCust && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Phone size={10} /> {inv.waCust}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatDate(inv.tglInv)}</span>
                    </div>

                    {/* Print Items */}
                    <div style={{ background: 'var(--bg-main)', padding: '8px 10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border-color)', fontSize: '11.5px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>ITEM CETAK:</div>
                      {inv.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)', fontWeight: 600 }}>
                          <span>• {it.nama}</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{it.qty} {it.satuan}</span>
                        </div>
                      ))}
                    </div>

                    {/* Prominent Revision Box if Status is Minta Revisi */}
                    {statusAcc === 'Minta Revisi' && inv.accDesainNotes && (
                      <div
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '11.5px',
                          color: '#991B1B',
                          marginBottom: '8px'
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: '10.5px', color: '#DC2626', marginBottom: '2px' }}>
                          ⚠️ CATATAN REVISI PELANGGAN:
                        </strong>
                        "{inv.accDesainNotes}"
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                    {/* Primary Button: Kirim Link WA */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleShareAccLink(inv)}
                      style={{ fontSize: '11.5px', padding: '8px 10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                    >
                      {copiedId === inv.id ? <Check size={14} /> : <Share2 size={14} />}
                      {copiedId === inv.id ? 'Link Tersalin!' : 'Kirim Link ACC ke WA Pelanggan'}
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setSelectedInv(inv)}
                        style={{ fontSize: '11.5px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 700 }}
                      >
                        <Eye size={12} /> Pratinjau &amp; ACC
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleOpenEditLink(inv)}
                        style={{ fontSize: '11.5px', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Edit3 size={12} /> Atur File Drive
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADMIN FULL PREVIEW & QUICK APPROVAL */}
      {/* ========================================================= */}
      {selectedInv && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 'min(960px, 96vw)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              padding: 0,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                color: '#FFFFFF',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 700 }}>PRATINJAU DESAIN GOOGLE DRIVE</div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                  Faktur #{selectedInv.noInv} - {selectedInv.namaCust}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInv(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="drive-modal-grid">
              {/* Left Column: Embed */}
              <div style={{ background: '#0F172A', display: 'flex', flexDirection: 'column', minHeight: '360px', position: 'relative', overflow: 'hidden' }}>
                <GoogleDrivePreviewEmbed
                  url={selectedInv.accDesainUrl || selectedInv.drive_view_url || selectedInv.fileUrl}
                  fileId={selectedInv.drive_file_id}
                  height="100%"
                  showFallbackButton={true}
                  emptyMessage="Belum Ada Link Google Drive Terpasang"
                  className="w-full h-full"
                />
              </div>

              {/* Right Column: Admin Actions & Notes */}
              <div style={{ padding: '16px', background: 'var(--bg-main)', overflowY: 'auto', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS ACC:</span>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        marginTop: '4px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background:
                          selectedInv.accDesainStatus === 'ACC Disetujui' || selectedInv.proofStatus === 'approved'
                            ? '#D1FAE5'
                            : selectedInv.accDesainStatus === 'Minta Revisi' || selectedInv.proofStatus === 'rejected'
                            ? '#FEE2E2'
                            : '#FEF3C7',
                        color:
                          selectedInv.accDesainStatus === 'ACC Disetujui' || selectedInv.proofStatus === 'approved'
                            ? '#065F46'
                            : selectedInv.accDesainStatus === 'Minta Revisi' || selectedInv.proofStatus === 'rejected'
                            ? '#991B1B'
                            : '#B45309',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldCheck size={15} />
                      {selectedInv.accDesainStatus || 'Menunggu ACC'}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>RINCIAN ITEM:</span>
                    <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selectedInv.items.map((it, idx) => (
                        <div key={idx} style={{ padding: '5px 8px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <strong style={{ display: 'block', color: 'var(--text-main)' }}>{it.nama}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            Jumlah: {it.qty} {it.satuan} {it.finishingType ? `• Finishing: ${it.finishingType}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedInv.accDesainNotes && (
                    <div style={{ marginBottom: '12px', padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '11.5px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', display: 'block', fontSize: '10.5px' }}>CATATAN / REVISI:</span>
                      "{selectedInv.accDesainNotes}"
                    </div>
                  )}

                  {/* History Logs */}
                  {selectedInv.accDesainHistory && selectedInv.accDesainHistory.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700 }}>RIWAYAT STATUS:</span>
                      <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                        {selectedInv.accDesainHistory.map((h, i) => (
                          <div key={i} style={{ fontSize: '10.5px', padding: '4px 8px', background: 'var(--bg-card)', borderRadius: '6px', borderLeft: '2px solid var(--primary)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{h.action}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>{h.date} • {h.user || 'Sistem'}</div>
                            {h.note && <div style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>"{h.note}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Controls */}
                <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setApproveSignerName('Admin / Desainer');
                      setApproveModalOpen(true);
                    }}
                    style={{ background: '#10B981', borderColor: '#10B981', padding: '8px 12px', fontSize: '12px', fontWeight: 800, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={15} /> Tandai ACC (Siap Cetak)
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setRevisionModalOpen(true)}
                    style={{ color: '#EF4444', borderColor: '#FCA5A5', padding: '7px 12px', fontSize: '11.5px', fontWeight: 700, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <XCircle size={14} /> Catat Permintaan Revisi
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleOpenEditLink(selectedInv)}
                      style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Edit3 size={12} /> Ubah Link Drive
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleDeleteAccPortal(selectedInv)}
                      style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#DC2626', borderColor: '#FECACA' }}
                    >
                      <Trash2 size={12} /> Hapus Portal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT GOOGLE DRIVE LINK */}
      {/* ========================================================= */}
      {editLinkModalOpen && selectedInv && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 'min(540px, 96vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                  📂 Atur &amp; Upload File Google Drive
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Faktur #{selectedInv.noInv} - {selectedInv.namaCust}
                </span>
              </div>
              <button type="button" onClick={() => setEditLinkModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <GoogleDriveUploader
                currentUrl={inputDriveUrl}
                onUrlGenerated={(url) => setInputDriveUrl(url)}
                label="File Desain / Proofing Google Drive"
                invoiceNo={selectedInv.noInv}
                customerName={selectedInv.namaCust}
                contextCategory="desain_acc"
                showToast={showToast}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                Catatan Desainer untuk Pelanggan (Opsional):
              </label>
              <textarea
                placeholder="Contoh: Silakan cek ejaan nama, ukuran 3x1m, dan nomor kontak sponsor."
                value={inputNote}
                onChange={(e) => setInputNote(e.target.value)}
                rows={2}
                style={{ fontSize: '12px', padding: '8px 12px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditLinkModalOpen(false)}>
                Batal
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveDriveLink} style={{ fontWeight: 700 }}>
                Simpan Link &amp; Terbitkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BUAT DOKUMEN ACC & DRIVE BARU */}
      {/* ========================================================= */}
      {newAccModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '22px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderKanban size={19} /> Buat Dokumen ACC / Link Baru
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Pilih nota yang sudah ada atau buat pratinjau standalone untuk customer baru.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setNewAccModalOpen(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewAccDoc}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Pilih Nota Terkait (Opsional):
                </label>
                <select
                  value={newSelectedInvId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setNewSelectedInvId(id);
                    if (id) {
                      const inv = invoices.find((i) => i.id === id);
                      if (inv) {
                        setNewCustName(inv.namaCust);
                        setNewCustWa(inv.waCust || '');
                        if (inv.accDesainUrl) setNewDriveUrl(inv.accDesainUrl);
                      }
                    }
                  }}
                  style={{ fontSize: '12.5px', padding: '8px 12px', width: '100%' }}
                >
                  <option value="">-- Dibuat Sebelum Transaksi (Belum Ada Nota) --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Faktur #{inv.noInv} - {inv.namaCust} ({formatDate(inv.tglInv)}) - {formatRupiah(inv.grandTotal)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Nama Customer <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bpk. Hendra"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    style={{ fontSize: '12.5px', padding: '8px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    No. WhatsApp Customer
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={newCustWa}
                    onChange={(e) => setNewCustWa(e.target.value)}
                    style={{ fontSize: '12.5px', padding: '8px 12px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Judul / Deskripsi Desain Cetak:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Spanduk Idul Fitri 3x1m & Kartu Nama"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  style={{ fontSize: '12.5px', padding: '8px 12px' }}
                />
              </div>

              {/* Google Drive Upload */}
              <div style={{ marginBottom: '14px', background: 'rgba(0, 82, 255, 0.04)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0, 82, 255, 0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>File Desain Google Drive:</span>
                  <button
                    type="button"
                    onClick={handleCreateAutoDriveFolder}
                    disabled={isCreatingFolder}
                    style={{ background: 'none', border: 'none', color: '#0052FF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isCreatingFolder ? '⏳ Membuat Folder...' : '📁 Buat Folder Otomatis'}
                  </button>
                </div>
                <GoogleDriveUploader
                  currentUrl={newDriveUrl}
                  onUrlGenerated={(url) => setNewDriveUrl(url)}
                  label="Unggah File / Sematkan URL Drive"
                  invoiceNo={newSelectedInvId ? invoices.find((i) => i.id === newSelectedInvId)?.noInv : 'DRAFT'}
                  customerName={newCustName || 'Pelanggan'}
                  showToast={showToast}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Instruksi Desainer / Catatan Proofing:
                </label>
                <textarea
                  placeholder="Contoh: Mohon periksa kembali ejaan nama dan ukuran sebelum disetujui."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setNewAccModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={16} /> Simpan &amp; Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
