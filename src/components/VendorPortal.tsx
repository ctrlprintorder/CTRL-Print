import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock3,
  MessageCircle,
  Copy,
  Check,
  Search,
  ArrowLeft,
  Eye,
  Info,
  Package,
  Layers,
  Wrench,
  Send
} from 'lucide-react';
import { PoVendor, Settings } from '../types';
import { saveDocument, convertToDirectImageUrl, fetchDirectPo } from '../firebaseService';
import { pushNotification } from '../services/notificationService';
import { openWhatsApp } from '../utils/whatsapp';
import { formatDate } from '../utils/date';
import defaultLogoImg from '../assets/images/ctrl_print_logo_1785948969417.jpg';

const formatTanggalIndo = (tglStr?: string) => {
  if (!tglStr) return '-';
  try {
    const parts = tglStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    const d = new Date(tglStr);
    return isNaN(d.getTime()) ? tglStr : d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return tglStr;
  }
};

interface VendorPortalProps {
  poList: PoVendor[];
  poQuery?: string;
  settings: Settings;
  onBackToAdmin?: () => void;
  showToast: (msg: string, isErr?: boolean) => void;
}

export const VendorPortal: React.FC<VendorPortalProps> = ({
  poList,
  poQuery = '',
  settings,
  onBackToAdmin,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState(poQuery);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPoNo, setCopiedPoNo] = useState(false);
  const [directFetchedPo, setDirectFetchedPo] = useState<PoVendor | null>(null);
  const [isDirectFetching, setIsDirectFetching] = useState<boolean>(Boolean(poQuery.trim()));

  // Find target PO
  const targetPo = React.useMemo(() => {
    if (!searchTerm.trim()) return null;
    const q = searchTerm.trim().toLowerCase();
    const fromList = poList.find(
      (p) =>
        p.noPo.toLowerCase() === q ||
        p.id.toLowerCase() === q ||
        p.noPo.toLowerCase().includes(q)
    );
    if (fromList) return fromList;
    if (directFetchedPo && (
      directFetchedPo.noPo.toLowerCase() === q ||
      directFetchedPo.id.toLowerCase() === q ||
      directFetchedPo.noPo.toLowerCase().includes(q)
    )) {
      return directFetchedPo;
    }
    return null;
  }, [poList, searchTerm, directFetchedPo]);

  // Fast direct fetch PO if not present in current list
  useEffect(() => {
    if (searchTerm.trim() && !targetPo) {
      setIsDirectFetching(true);
      fetchDirectPo(searchTerm.trim())
        .then((po) => {
          if (po) setDirectFetchedPo(po);
        })
        .finally(() => {
          setIsDirectFetching(false);
        });
    } else if (targetPo) {
      setIsDirectFetching(false);
    }
  }, [searchTerm, targetPo]);

  // State for optional vendor note and submitting state
  const [vendorNote, setVendorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync vendor note when targetPo changes
  useEffect(() => {
    if (targetPo) {
      setVendorNote(targetPo.vendorNotes || '');
    }
  }, [targetPo]);

  // Open Google Drive file/folder directly & update status to 'Sedang Dikerjakan'
  const handleOpenFileDrive = async () => {
    if (!targetPo) return;
    if (!targetPo.driveUrl) {
      return showToast('Link Google Drive belum dicantumkan oleh admin toko.', true);
    }

    // Open drive immediately in new tab
    window.open(targetPo.driveUrl, '_blank');

    // If first time accessing, mark as 'Sedang Dikerjakan' and push notification
    if (!targetPo.vendorConfirmedAt && targetPo.vendorStatus !== 'Siap Diambil' && targetPo.vendorStatus !== 'Selesai') {
      try {
        const nowIso = new Date().toISOString();
        const updatedPo: PoVendor = {
          ...targetPo,
          vendorStatus: 'Sedang Dikerjakan',
          vendorConfirmedAt: nowIso
        };
        await saveDocument('po_vendor', updatedPo);

        await pushNotification({
          type: 'general',
          category: 'order',
          title: `⚡ Vendor ${targetPo.vendor} Telah Membuka File Cetak PO ${targetPo.noPo}`,
          desc: `Vendor telah mengakses file cetak Google Drive untuk PO #${targetPo.noPo}.`,
          linkTab: 'po-vendor',
          linkParam: targetPo.noPo,
          referenceId: targetPo.id,
          referenceNo: targetPo.noPo,
          badge: 'PO Vendor'
        });
      } catch (err) {
        console.warn('Silent note on open drive:', err);
      }
    }
  };

  // Optional: vendor can save a quick note
  const handleSaveVendorNote = async () => {
    if (!targetPo) return;
    setIsSubmitting(true);
    try {
      const updatedPo: PoVendor = {
        ...targetPo,
        vendorNotes: vendorNote.trim() || undefined
      };
      await saveDocument('po_vendor', updatedPo);
      if (vendorNote.trim()) {
        await pushNotification({
          type: 'general',
          category: 'order',
          title: `💬 Catatan dari Vendor ${targetPo.vendor} (PO ${targetPo.noPo})`,
          desc: vendorNote.trim(),
          linkTab: 'po-vendor',
          linkParam: targetPo.noPo,
          referenceId: targetPo.id,
          referenceNo: targetPo.noPo,
          badge: 'PO Vendor'
        });
      }
      showToast('Catatan berhasil disimpan!');
    } catch (err: any) {
      showToast(`Gagal menyimpan catatan: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsReady = async () => {
    if (!targetPo) return;
    if (
      !confirm(
        `Tandai pesanan PO ${targetPo.noPo} sudah selesai dicetak dan siap diambil/dikirim?`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const updatedPo: PoVendor = {
        ...targetPo,
        vendorStatus: 'Siap Diambil',
        vendorCompletedAt: nowIso
      };

      await saveDocument('po_vendor', updatedPo);

      await pushNotification({
        type: 'job_completed',
        category: 'order',
        title: `📦 Pesanan PO ${targetPo.noPo} SIAP DIAMBIL!`,
        desc: `Vendor ${targetPo.vendor} telah menyelesaikan pesanan pada ${new Date().toLocaleTimeString(
          'id-ID',
          { hour: '2-digit', minute: '2-digit' }
        )} WITA.`,
        linkTab: 'po-vendor',
        linkParam: targetPo.noPo,
        referenceId: targetPo.id,
        referenceNo: targetPo.noPo,
        badge: 'Siap Diambil'
      });

      showToast('Pesanan berhasil ditandai SIAP DIAMBIL! Tim toko telah diberi notifikasi.');
    } catch (err: any) {
      console.error('Error marking ready:', err);
      showToast(`Gagal memperbarui status: ${err.message}`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?po=${targetPo?.noPo || searchTerm}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Link Portal Vendor berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleContactStore = () => {
    const wa = settings.phone || '';
    const cleanWa = wa.replace(/[^0-9]/g, '');
    const msg = `Halo ${settings.company || 'CTRL PRINT'}, saya dari Vendor *${
      targetPo?.vendor || ''
    }* ingin menanyakan perihal PO *#${targetPo?.noPo || searchTerm}*:\n`;
    openWhatsApp(cleanWa, msg);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F0F7FF 0%, #F8FAFC 260px, #F1F5F9 100%)',
        color: '#0F172A',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '20px 14px 64px 14px'
      }}
    >
      {/* Top Bar for Admin Preview */}
      {onBackToAdmin && (
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto 16px auto',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1E40AF' }}>
            <Eye size={16} />
            <span>
              <strong>Mode Pratinjau Admin:</strong> Portal Vendor
            </span>
          </div>
          <button
            onClick={onBackToAdmin}
            style={{
              background: '#2563EB',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}
          >
            <ArrowLeft size={14} /> Kembali ke Admin
          </button>
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Header Toko */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -2px rgba(37, 99, 235, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                  border: '1px solid #DBEAFE',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={settings.logoUrl ? convertToDirectImageUrl(settings.logoUrl) : defaultLogoImg}
                  alt={settings.company || 'CTRL PRINT'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultLogoImg;
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>{settings.company || 'CTRL PRINT'}</span>
                  <span style={{ fontSize: '10.5px', background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                    PORTAL VENDOR
                  </span>
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  Portal Akses File Cetak &amp; Status Pengerjaan Vendor
                </p>
              </div>
            </div>

            {targetPo && (
              <button
                onClick={handleCopyLink}
                style={{
                  background: '#F8FAFC',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                {copiedLink ? <Check size={14} color="#10B981" /> : <Copy size={14} color="#2563EB" />}
                <span style={{ color: copiedLink ? '#059669' : '#1E293B' }}>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
              </button>
            )}
          </div>

          {/* Search PO Form if no PO or want to switch */}
          {!targetPo && (
            <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: 600 }}>
                Cari Nomor PO / SPK:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Contoh: POV-2026-0001"
                  style={{
                    flex: 1,
                    background: '#F8FAFC',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 18px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Search size={15} /> Buka PO
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading PO State during direct fetch */}
        {isDirectFetching && !targetPo && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px'
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
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16.5px', fontWeight: 800, color: '#0F172A' }}>
                Membuka Surat Perintah Kerja (PO) #{searchTerm}...
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Menghubungkan langsung ke server CTRL PRINT Cloud...
              </p>
            </div>
          </div>
        )}

        {/* PO Not Found State */}
        {!isDirectFetching && !targetPo && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEF2F2',
                color: '#EF4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                border: '1px solid #FEE2E2'
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Nomor PO Belum Ditemukan
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '400px', marginInline: 'auto', lineHeight: 1.5 }}>
              Pastikan Anda membuka link PO resmi yang dikirimkan oleh admin {settings.company || 'CTRL PRINT'} melalui WhatsApp atau masukkan nomor PO dengan benar di atas.
            </p>
          </div>
        )}

        {/* Target PO Found Details */}
        {targetPo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status & Deadline Header Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px -2px rgba(37, 99, 235, 0.06)'
              }}
            >
              {/* Top Row: No PO & Status Badge */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '14px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #F1F5F9'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Purchase Order (SPK)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#2563EB' }}>
                      #{targetPo.noPo}
                    </h2>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(targetPo.noPo);
                        setCopiedPoNo(true);
                        setTimeout(() => setCopiedPoNo(false), 2000);
                      }}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '3px 6px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Salin Nomor PO"
                    >
                      {copiedPoNo ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  {targetPo.vendorStatus === 'Siap Diambil' || targetPo.vendorStatus === 'Selesai' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 700
                      }}
                    >
                      <CheckCircle2 size={15} strokeWidth={2.2} /> Selesai &amp; Siap Diambil
                    </span>
                  ) : targetPo.vendorStatus === 'Sedang Dikerjakan' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 700
                      }}
                    >
                      <Wrench size={14} strokeWidth={2} /> Sedang Dikerjakan
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#F8FAFC',
                        color: '#475569',
                        border: '1px solid #CBD5E1',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12.5px',
                        fontWeight: 700
                      }}
                    >
                      <Clock size={14} strokeWidth={2} /> Siap Diproses
                    </span>
                  )}
                </div>
              </div>

              {/* Vendor & General Metadata Grid with Admin-Set Deadline */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  fontSize: '12.5px'
                }}
              >
                <div>
                  <div style={{ color: '#64748B', marginBottom: '2px', fontSize: '11.5px' }}>Vendor Penerima:</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>{targetPo.vendor}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', marginBottom: '2px', fontSize: '11.5px' }}>Tanggal Diterbitkan:</div>
                  <div style={{ fontWeight: 600, color: '#334155' }}>{formatDate(targetPo.tglPo)}</div>
                </div>
                <div
                  style={{
                    gridColumn: '1 / -1',
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                    border: '1px solid #93C5FD',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tenggat Waktu Selesai (Ditetapkan Toko):
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#1D4ED8', marginTop: '3px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <Calendar size={16} />
                      <span>{formatDate(targetPo.tglSelesai)}</span>
                      <span style={{ color: '#93C5FD' }}>&bull;</span>
                      <Clock size={16} />
                      <span>Pukul {targetPo.jamSelesai || '15:00'} WITA</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#1E40AF', background: '#FFFFFF', padding: '5px 10px', borderRadius: '8px', fontWeight: 600, border: '1px solid #BFDBFE' }}>
                    Mohon siap sebelum jam ini
                  </span>
                </div>
              </div>
            </div>

            {/* List of Items to Print */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px -2px rgba(37, 99, 235, 0.06)'
              }}
            >
              <h3
                style={{
                  margin: '0 0 14px 0',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Layers size={18} color="#2563EB" /> Rincian Barang Cetakan &amp; Spesifikasi ({targetPo.items?.length || 0} Item)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {targetPo.items && targetPo.items.length > 0 ? (
                  targetPo.items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        {/* File Name Tag */}
                        {it.fileName && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              marginBottom: '6px'
                            }}
                          >
                            <FileText size={12} /> File: {it.fileName}
                          </div>
                        )}

                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                          {idx + 1}. {it.prodName}
                        </div>

                        {it.ket && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#475569',
                              marginTop: '4px',
                              paddingLeft: '12px',
                              borderLeft: '2px solid #93C5FD'
                            }}
                          >
                            Spek / Finishing: <strong style={{ color: '#1E293B' }}>{it.ket}</strong>
                          </div>
                        )}
                      </div>

                      {/* Quantity Badge */}
                      <div
                        style={{
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <div style={{ fontSize: '10px', color: '#1D4ED8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Jumlah
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB' }}>
                          {it.qty} {it.satuan}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12.5px', color: '#64748B' }}>Tidak ada item tertera.</div>
                )}
              </div>

              {/* Special Notes from Store */}
              {targetPo.catatan && (
                <div
                  style={{
                    marginTop: '16px',
                    background: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '12.5px',
                    color: '#92400E'
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '3px', color: '#B45309' }}>
                    ⚠️ Catatan Khusus dari Toko:
                  </strong>
                  {targetPo.catatan}
                </div>
              )}
            </div>

            {/* Bagian Aksi & Tombol di Bawah (Akses File Cetak & Status) */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '22px 20px',
                border: '1px solid #BFDBFE',
                boxShadow: '0 4px 20px -2px rgba(37, 99, 235, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15.5px',
                    fontWeight: 800,
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ExternalLink size={18} color="#2563EB" /> Akses File Cetak &amp; Status Pengerjaan
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748B' }}>
                  Unduh atau buka file cetak resolusi tinggi melalui Google Drive di bawah ini.
                </p>
              </div>

              {/* Tombol Utama Buka Google Drive */}
              {targetPo.driveUrl ? (
                <div>
                  <button
                    id="btn-vendor-open-drive"
                    type="button"
                    onClick={handleOpenFileDrive}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 20px',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ExternalLink size={20} />
                    <span>Buka / Download File Cetak di Google Drive</span>
                  </button>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11.5px', color: '#2563EB', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Info size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span>Mengklik tombol ini otomatis mencatat status <strong>&ldquo;Sedang Dikerjakan&rdquo;</strong> ke toko.</span>
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '12.5px',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0 }} />
                  <span>Link Google Drive belum dicantumkan pada PO ini. Silakan hubungi admin toko.</span>
                </div>
              )}

              {/* Tombol Tandai Selesai / Siap Diambil */}
              {targetPo.vendorStatus !== 'Siap Diambil' && targetPo.vendorStatus !== 'Selesai' ? (
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px', fontWeight: 500 }}>
                    Pesanan sudah selesai dicetak dan siap diambil oleh kurir/tim toko?
                  </div>
                  <button
                    id="btn-vendor-mark-ready"
                    type="button"
                    onClick={handleMarkAsReady}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      background: isSubmitting
                        ? '#6EE7B7'
                        : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <CheckCircle2 size={17} strokeWidth={2.2} />
                    {isSubmitting ? 'Menyimpan Status...' : 'Tandai Pesanan Sudah Selesai & Siap Diambil'}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#065F46',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <CheckCircle2 size={22} style={{ flexShrink: 0, color: '#059669' }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#065F46' }}>Pesanan Telah Ditandai SIAP DIAMBIL</div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      Terima kasih atas kerjasamanya! Tim toko telah menerima notifikasi bahwa pesanan siap diambil.
                    </div>
                  </div>
                </div>
              )}

              {/* Catatan Tambahan dari Vendor (Opsional) */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: 600 }}>
                  Catatan Tambahan dari Vendor (Opsional):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={vendorNote}
                    onChange={(e) => setVendorNote(e.target.value)}
                    placeholder="Contoh: Bahan ready, langsung naik mesin / perkiraan beres sore ini"
                    style={{
                      flex: 1,
                      background: '#F8FAFC',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveVendorNote}
                    disabled={isSubmitting}
                    style={{
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={12} strokeWidth={2} />
                    <span>{isSubmitting ? '...' : 'Simpan Catatan'}</span>
                  </button>
                </div>
                {targetPo.vendorNotes && targetPo.vendorNotes !== vendorNote && (
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                    Catatan tersimpan: "{targetPo.vendorNotes}"
                  </div>
                )}
              </div>
            </div>

            {/* Quick Contact Toko Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid #BBF7D0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.05)'
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Ada pertanyaan mengenai spesifikasi atau file?
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Hubungi tim {settings.company || 'CTRL PRINT'} langsung via WhatsApp
                </div>
              </div>
              <button
                onClick={handleContactStore}
                style={{
                  background: '#16A34A',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                }}
              >
                <MessageCircle size={15} /> Chat WhatsApp Toko
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: '#64748B' }}>
          <div>{settings.company || 'CTRL PRINT'} &bull; Sistem Manajemen Percetakan &amp; Vendor</div>
          {settings.phone && <div style={{ marginTop: '2px' }}>Telp / WA: {settings.phone}</div>}
        </div>
      </div>
    </div>
  );
};
