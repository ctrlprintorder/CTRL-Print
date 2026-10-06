import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  Eye,
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileText,
  User,
  Paperclip,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Plus,
  Bell,
  Play,
  Inbox,
  CheckCheck,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Info
} from 'lucide-react';
import { EmailLog, Invoice, PoVendor, Customer, Vendor, Settings } from '../types';
import { sendCustomEmail, sendCustomerInvoiceEmail, sendPoVendorEmail, markEmailAsRead } from '../services/gmailService';
import { saveDocument, deleteDocument } from '../firebaseService';
import { requestGoogleAccessToken, getGoogleAccessToken } from '../lib/googleWorkspace';
import { pushNotification } from '../services/notificationService';
import { formatDate } from '../utils/date';

interface EmailManagerPageProps {
  settings: Settings;
  invoices: Invoice[];
  poList: PoVendor[];
  customers: Customer[];
  vendors: Vendor[];
  emailLogs: EmailLog[];
  showToast: (msg: string, isErr?: boolean) => void;
  onNavigateTab?: (tab: string, param?: string) => void;
  selectedLogId?: string | null;
  initialSelectedLogId?: string | null;
}

export const EmailManagerPage: React.FC<EmailManagerPageProps> = ({
  settings,
  invoices,
  poList,
  customers,
  vendors,
  emailLogs,
  showToast,
  onNavigateTab,
  selectedLogId,
  initialSelectedLogId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [viewingLog, setViewingLog] = useState<EmailLog | null>(null);

  const activeSelectedId = selectedLogId || initialSelectedLogId;

  // Compose State
  const [emailType, setEmailType] = useState<'invoice' | 'po_vendor' | 'custom' | 'quotation' | 'order_ready' | 'acc_desain'>('custom');
  const [recipientCategory, setRecipientCategory] = useState<'customer' | 'vendor' | 'manual'>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');

  const [toEmail, setToEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  // When selectedLogId or initialSelectedLogId prop is passed, auto-select it
  useEffect(() => {
    if (activeSelectedId && emailLogs.length > 0) {
      const found = emailLogs.find((l) => l.id === activeSelectedId);
      if (found) {
        setViewingLog(found);
      }
    }
  }, [activeSelectedId, emailLogs]);

  // Sync recipient input based on selections
  useEffect(() => {
    if (recipientCategory === 'customer' && selectedCustomerId) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        setRecipientName(cust.nama || '');
        setToEmail(cust.email || '');
      }
    } else if (recipientCategory === 'vendor' && selectedVendorId) {
      const v = vendors.find((vend) => vend.id === selectedVendorId);
      if (v) {
        setRecipientName(v.nama || '');
        setToEmail(v.email || '');
      }
    }
  }, [recipientCategory, selectedCustomerId, selectedVendorId, customers, vendors]);

  // Auto fill subject & message templates
  useEffect(() => {
    const company = settings.company || 'CTRL PRINT';
    if (emailType === 'invoice' && selectedInvoiceId) {
      const inv = invoices.find((i) => i.id === selectedInvoiceId);
      if (inv) {
        setSubject(`[INVOICE #${inv.noInv}] ${company} - Tagihan & Nota Resmi`);
        setRecipientName(inv.namaCust || '');
        setToEmail(inv.emailCust || '');
        setMessageText(
          `Halo Bapak/Ibu ${inv.namaCust},\n\nTerima kasih atas pesanan Anda di ${company}.\nBerikut kami lampirkan rincian Faktur #${inv.noInv} dengan total tagihan sebesar Rp ${(inv.sisaTertagih ?? inv.grandTotal).toLocaleString('id-ID')}.\n\nAnda dapat mengecek status pesanan, pembayaran, dan mengunduh berkas secara langsung melalui tautan di bawah.`
        );
        setAttachmentUrl(inv.driveFolderUrl || inv.buktiBayarUrl || '');
      }
    } else if (emailType === 'po_vendor' && selectedPoId) {
      const po = poList.find((p) => p.id === selectedPoId);
      if (po) {
        setSubject(`[PURCHASE ORDER #${po.noPo}] ${company} - SPK Order Cetak (${po.vendor})`);
        setRecipientName(po.vendor || '');
        setToEmail(po.vendorEmail || '');
        setMessageText(
          `Halo Tim ${po.vendor},\n\nBerikut kami kirimkan Purchase Order (PO/SPK) #${po.noPo} untuk pengerjaan cetak sebanyak ${po.items?.length || 0} item barang.\nTenggat Waktu: ${formatDate(po.tglSelesai)} ${po.jamSelesai || ''}.\n\nMohon segera diproses dan konfirmasi penerimaannya.`
        );
        setAttachmentUrl(po.driveUrl || '');
      }
    } else if (emailType === 'order_ready') {
      setSubject(`[PESANAN SELESAI] Pesanan Cetak Anda Sudah Siap Diambil - ${company}`);
      setMessageText(
        `Halo Pelanggan Setia ${company},\n\nKabar gembira! Pesanan cetak Anda telah selesai diproduksi dan siap untuk diambil di workshop kami atau dikirim ke lokasi Anda.\n\nAlamat Workshop:\n${settings.address || 'Workshop Percetakan'}\nTelp/WA: ${settings.phone || '-'}\n\nTerima kasih telah mempercayakan cetakan Anda kepada kami.`
      );
    } else if (emailType === 'quotation') {
      setSubject(`[PENAWARAN HARGA] Surat Penawaran Resmi - ${company}`);
      setMessageText(
        `Halo ${recipientName || 'Bapak/Ibu'},\n\nTerima kasih telah menghubungi ${company}.\nMenindaklanjuti permintaan estimasi biaya cetak Anda, bersama ini kami lampirkan rincian penawaran harga terbaik untuk proyek Anda.\n\nSilakan tinjau dan hubungi kami jika ada pertanyaan atau spesifikasi khusus yang diinginkan.`
      );
    } else if (emailType === 'acc_desain') {
      setSubject(`[APPROVAL DESAIN] Konfirmasi & ACC Desain Cetak - ${company}`);
      setMessageText(
        `Halo ${recipientName || 'Bapak/Ibu'},\n\nTim desainer kami telah menyelesaikan rancangan desain cetak Anda.\nMohon periksa kembali tata letak, ejaan teks, ukuran, dan warna sebelum kami naikkan ke proses cetak massal.\n\nKlik tautan yang tersedia untuk menyetujui (ACC) atau mengajukan revisi secara interaktif.`
      );
    }
  }, [emailType, selectedInvoiceId, selectedPoId, settings, invoices, poList, recipientName]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return emailLogs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        log.recipientEmail.toLowerCase().includes(q) ||
        (log.recipientName && log.recipientName.toLowerCase().includes(q)) ||
        log.subject.toLowerCase().includes(q) ||
        (log.referenceNo && log.referenceNo.toLowerCase().includes(q));

      const matchType = filterType === 'all' || log.type === filterType;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'read' && (log.status === 'read' || !!log.readAt)) ||
        (filterStatus === 'sent' && log.status === 'sent' && !log.readAt) ||
        (filterStatus === 'failed' && log.status === 'failed');

      return matchQuery && matchType && matchStatus;
    });
  }, [emailLogs, searchQuery, filterType, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = emailLogs.length;
    const read = emailLogs.filter((l) => l.status === 'read' || !!l.readAt).length;
    const sent = emailLogs.filter((l) => l.status === 'sent' && !l.readAt).length;
    const rate = total > 0 ? Math.round((read / total) * 100) : 0;
    return { total, read, sent, rate };
  }, [emailLogs]);

  // Handle Send Email
  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || !toEmail.includes('@')) {
      showToast('Harap masukkan alamat email tujuan yang valid!', true);
      return;
    }
    if (!subject.trim()) {
      showToast('Subjek email tidak boleh kosong!', true);
      return;
    }

    setIsSending(true);
    showToast('Mengirim email via Google Workspace Gmail...');

    try {
      if (emailType === 'invoice' && selectedInvoiceId) {
        const inv = invoices.find((i) => i.id === selectedInvoiceId);
        if (inv) {
          await sendCustomerInvoiceEmail({
            toEmail,
            invoice: inv,
            settings,
            customMessage: messageText,
            customSubject: subject
          });
        } else {
          await sendCustomEmail({
            toEmail,
            recipientName,
            subject,
            messageText,
            type: 'invoice',
            referenceNo: selectedInvoiceId,
            attachmentUrl: attachmentUrl || undefined,
            settings
          });
        }
      } else if (emailType === 'po_vendor' && selectedPoId) {
        const po = poList.find((p) => p.id === selectedPoId);
        if (po) {
          await sendPoVendorEmail({
            toEmail,
            po,
            settings,
            customMessage: messageText,
            customSubject: subject
          });
        } else {
          await sendCustomEmail({
            toEmail,
            recipientName,
            subject,
            messageText,
            type: 'po_vendor',
            referenceNo: selectedPoId,
            attachmentUrl: attachmentUrl || undefined,
            settings
          });
        }
      } else {
        await sendCustomEmail({
          toEmail,
          recipientName,
          subject,
          messageText,
          type: emailType,
          referenceNo: selectedInvoiceId || selectedPoId || undefined,
          attachmentUrl: attachmentUrl || undefined,
          settings
        });
      }

      showToast(`🎉 Email berhasil dikirim ke ${toEmail}!`);
      setShowComposeModal(false);
      // Reset form
      setSubject('');
      setMessageText('');
      setAttachmentUrl('');
      setSelectedInvoiceId('');
      setSelectedPoId('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      showToast(error.message || 'Gagal mengirim email.', true);
    } finally {
      setIsSending(false);
    }
  };

  // Test Open Simulator
  const handleSimulateOpen = async (log: EmailLog) => {
    showToast(`Mensimulasikan pembacaan email #${log.id}...`);
    try {
      await markEmailAsRead(log, {
        userAgent: 'Chrome on Mobile Simulator',
        ipAddress: '180.252.110.12',
        note: 'Dibaca oleh penerima'
      });
      showToast(`🎉 Email "${log.subject}" ditandai DIBACA dan notifikasi telah dikirim ke bar notifikasi!`);
      if (viewingLog && viewingLog.id === log.id) {
        setViewingLog({
          ...viewingLog,
          status: 'read',
          readAt: new Date().toLocaleString('id-ID'),
          readCount: (viewingLog.readCount || 0) + 1
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal simulasi baca email.', true);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm('Hapus log riwayat email ini?')) {
      try {
        await deleteDocument('email_logs', logId);
        showToast('Log email berhasil dihapus.');
        if (viewingLog?.id === logId) {
          setViewingLog(null);
        }
      } catch (err: any) {
        showToast('Gagal menghapus log email.', true);
      }
    }
  };

  return (
    <div id="email-manager-page" style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', borderRadius: '12px', color: '#FFF' }}>
              <Mail size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main, #0F172A)' }}>
                Email & Notifikasi Real-time
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                Kirim invoice, SPK vendor, & penawaran via Google Workspace Gmail dengan pelacak status baca otomatis.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            id="btn-google-auth-email"
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              try {
                await requestGoogleAccessToken();
                showToast('Akun Google Workspace terhubung!');
              } catch (e: any) {
                showToast(e.message || 'Gagal login Google Workspace', true);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', padding: '9px 15px' }}
          >
            <ShieldCheck size={16} style={{ color: '#10B981' }} />
            <span>Koneksi Gmail</span>
          </button>

          <button
            id="btn-open-compose-modal"
            type="button"
            className="btn btn-primary"
            onClick={() => setShowComposeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Plus size={16} /> Tulis Email Baru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card-bg, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted, #64748B)', fontSize: '13px', fontWeight: 600 }}>
            <span>Total Email Terkirim</span>
            <Send size={18} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: 'var(--text-main, #0F172A)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Melalui Gmail API Google Workspace
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted, #64748B)', fontSize: '13px', fontWeight: 600 }}>
            <span>Telah Dibaca / Dibuka</span>
            <CheckCheck size={18} style={{ color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#10B981' }}>
            {stats.read}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
            Notifikasi masuk ke status bar saat dibuka
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted, #64748B)', fontSize: '13px', fontWeight: 600 }}>
            <span>Tingkat Keterbukaan (Open Rate)</span>
            <TrendingUp size={18} style={{ color: '#F59E0B' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#F59E0B' }}>
            {stats.rate}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            {stats.sent} email menunggu dibaca
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1D4ED8', fontSize: '13px', fontWeight: 700 }}>
            <Bell size={16} /> Pelacak Notifikasi Otomatis
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-main, #1E293B)', margin: '8px 0 0', lineHeight: 1.5 }}>
            Setiap email yang dibuka pelanggan atau vendor memicu sinyal pembacaan langsung dan membunyikan lonceng notifikasi di bilah atas.
          </p>
        </div>
      </div>

      {/* Main Grid: Logs Table & Detail Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: viewingLog ? '1fr 420px' : '1fr', gap: '20px' }}>
        {/* Left: Email Logs Table */}
        <div style={{ background: 'var(--card-bg, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Controls Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted, #94A3B8)' }} />
                <input
                  type="text"
                  placeholder="Cari penerima, email, subjek, invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    background: 'var(--input-bg, #F8FAFC)'
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  background: 'var(--input-bg, #FFFFFF)',
                  fontWeight: 600
                }}
              >
                <option value="all">Semua Status</option>
                <option value="read">📬 Sudah Dibaca</option>
                <option value="sent">✉️ Terkirim (Belum Dibaca)</option>
              </select>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  background: 'var(--input-bg, #FFFFFF)',
                  fontWeight: 600
                }}
              >
                <option value="all">Semua Jenis Email</option>
                <option value="invoice">Faktur / Invoice</option>
                <option value="po_vendor">PO SPK Vendor</option>
                <option value="acc_desain">ACC Desain</option>
                <option value="quotation">Penawaran Harga</option>
                <option value="order_ready">Pesanan Siap</option>
                <option value="custom">Pesan Khusus</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>
              Menampilkan {filteredLogs.length} dari {emailLogs.length} email
            </div>
          </div>

          {/* List Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted, #F8FAFC)', borderBottom: '1px solid var(--border-color, #E2E8F0)', color: 'var(--text-muted, #64748B)', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Penerima</th>
                  <th style={{ padding: '12px 16px' }}>Subjek & Pesan</th>
                  <th style={{ padding: '12px 16px' }}>Tipe</th>
                  <th style={{ padding: '12px 16px' }}>Waktu Kirim</th>
                  <th style={{ padding: '12px 16px' }}>Waktu Dibaca</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted, #94A3B8)' }}>
                      <Inbox size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main, #334155)' }}>Belum ada log email</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>Klik tombol "Tulis Email Baru" untuk mengirim faktur atau pesan ke pelanggan.</div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isRead = log.status === 'read' || !!log.readAt;
                    const isSelected = viewingLog?.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setViewingLog(log)}
                        style={{
                          borderBottom: '1px solid var(--border-color, #F1F5F9)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          {isRead ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              <CheckCheck size={13} /> Dibaca {log.readCount && log.readCount > 1 ? `(${log.readCount}x)` : ''}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              <Send size={11} /> Terkirim
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                            {log.recipientName || '-'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>
                            {log.recipientEmail}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main, #1E293B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.subject}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #94A3B8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.bodyText || 'Format HTML'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#F1F5F9',
                              color: '#475569'
                            }}
                          >
                            {log.type === 'invoice' ? 'Faktur' : log.type === 'po_vendor' ? 'PO SPK' : log.type === 'acc_desain' ? 'ACC Desain' : log.type === 'quotation' ? 'Penawaran' : log.type === 'order_ready' ? 'Pesanan Siap' : 'Kustom'}
                            {log.referenceNo ? ` #${log.referenceNo}` : ''}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted, #64748B)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {log.sentAt}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {isRead ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>
                              {log.readAt || 'Baru saja'}
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>
                              Menunggu dibuka...
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              title="Lihat Rincian Email"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingLog(log);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-color, #E2E8F0)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: '#2563EB'
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              title="Simulasikan / Uji Penerima Membaca Email"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSimulateOpen(log);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #A7F3D0',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: '#059669'
                              }}
                            >
                              <Play size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Email Detail Drawer / Preview */}
        {viewingLog && (
          <div style={{ background: 'var(--card-bg, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '20px', height: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #E2E8F0)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Rincian Email
                </div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0 0', color: 'var(--text-main, #0F172A)' }}>
                  {viewingLog.subject}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94A3B8' }}
              >
                &times;
              </button>
            </div>

            {/* Status Card */}
            <div style={{ background: viewingLog.status === 'read' || viewingLog.readAt ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${viewingLog.status === 'read' || viewingLog.readAt ? '#BBF7D0' : '#BFDBFE'}`, borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: viewingLog.status === 'read' || viewingLog.readAt ? '#15803D' : '#1D4ED8', fontSize: '13px' }}>
                  {viewingLog.status === 'read' || viewingLog.readAt ? <CheckCheck size={16} /> : <Clock size={16} />}
                  <span>{viewingLog.status === 'read' || viewingLog.readAt ? 'Email Telah Dibaca Penerima' : 'Email Terkirim & Menunggu Dibuka'}</span>
                </div>
                {!(viewingLog.status === 'read' || viewingLog.readAt) && (
                  <button
                    type="button"
                    onClick={() => handleSimulateOpen(viewingLog)}
                    style={{
                      background: '#10B981',
                      color: '#FFF',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Uji Buka & Notifikasi
                  </button>
                )}
              </div>
              {viewingLog.readAt && (
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '6px' }}>
                  🕒 Dibuka pada: <strong>{viewingLog.readAt}</strong> {viewingLog.readCount ? `(dibuka ${viewingLog.readCount} kali)` : ''}
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div style={{ fontSize: '12px', display: 'grid', gap: '10px', marginBottom: '16px', color: 'var(--text-main, #334155)' }}>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Penerima:</span>{' '}
                <strong>{viewingLog.recipientName || '-'}</strong> &lt;{viewingLog.recipientEmail}&gt;
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Pengirim:</span> {viewingLog.senderEmail || settings.email || 'ctrlprint.order@gmail.com'}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted, #64748B)' }}>Waktu Kirim:</span> {viewingLog.sentAt}
              </div>
              {viewingLog.referenceNo && (
                <div>
                  <span style={{ color: 'var(--text-muted, #64748B)' }}>Referensi Dokumen:</span>{' '}
                  <span style={{ fontWeight: 700, color: '#2563EB' }}>#{viewingLog.referenceNo}</span>
                </div>
              )}
              {viewingLog.attachmentUrl && (
                <div>
                  <span style={{ color: 'var(--text-muted, #64748B)' }}>Lampiran:</span>{' '}
                  <a href={viewingLog.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: '#2563EB', wordBreak: 'break-all', textDecoration: 'underline' }}>
                    Buka Google Drive File
                  </a>
                </div>
              )}
            </div>

            {/* Body Preview */}
            <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '8px' }}>
                Isi Pesan Email:
              </div>
              <div style={{ background: 'var(--bg-muted, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '8px', padding: '12px', fontSize: '13px', maxHeight: '250px', overflowY: 'auto', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {viewingLog.bodyText || (viewingLog.bodyHtml ? 'Konten berformat HTML (Faktur/PO resmi)' : '-')}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              {viewingLog.referenceNo && onNavigateTab && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    if (viewingLog.type === 'invoice') {
                      onNavigateTab('riwayat-invoice', viewingLog.referenceNo);
                    } else if (viewingLog.type === 'po_vendor') {
                      onNavigateTab('po-vendor', viewingLog.referenceNo);
                    }
                  }}
                  style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <FileText size={14} /> Buka Dokumen #{viewingLog.referenceNo}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteLog(viewingLog.id)}
                style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Hapus Log
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: 'var(--card-bg, #FFFFFF)', borderRadius: '16px', maxWidth: '680px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>✉️ Tulis & Kirim Email Resmi</h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                  Dilengkapi pelacak pembacaan otomatis & notifikasi instan ke bilah status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '22px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email Type Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '6px', display: 'block' }}>
                  Jenis Email / Template
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { id: 'invoice', label: '📄 Faktur Pelanggan' },
                    { id: 'po_vendor', label: '📑 PO SPK Vendor' },
                    { id: 'acc_desain', label: '🎨 ACC Desain' },
                    { id: 'order_ready', label: '📦 Pesanan Siap' },
                    { id: 'quotation', label: '💼 Penawaran' },
                    { id: 'custom', label: '✉️ Pesan Bebas' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEmailType(t.id as any)}
                      style={{
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontWeight: emailType === t.id ? 700 : 500,
                        borderRadius: '8px',
                        border: emailType === t.id ? '2px solid #2563EB' : '1px solid var(--border-color, #CBD5E1)',
                        background: emailType === t.id ? '#EFF6FF' : 'var(--bg-muted, #F8FAFC)',
                        color: emailType === t.id ? '#1D4ED8' : 'var(--text-main, #334155)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Selector based on type */}
              {emailType === 'invoice' && (
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                    Pilih Faktur / Invoice Pelanggan *
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    required
                  >
                    <option value="">-- Pilih dari Riwayat Invoice --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.noInv} - {inv.namaCust} (Rp {inv.grandTotal.toLocaleString('id-ID')}) {inv.statusBayar || 'Belum Lunas'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {emailType === 'po_vendor' && (
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', marginBottom: '6px', display: 'block' }}>
                    Pilih Purchase Order (PO Vendor) *
                  </label>
                  <select
                    value={selectedPoId}
                    onChange={(e) => setSelectedPoId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    required
                  >
                    <option value="">-- Pilih dari Daftar PO Vendor --</option>
                    {poList.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.noPo} - {p.vendor} ({p.items?.length || 0} items) - {p.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '4px', display: 'block' }}>
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Pelanggan / Vendor"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '4px', display: 'block' }}>
                    Alamat Email Tujuan *
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '4px', display: 'block' }}>
                  Subjek Email *
                </label>
                <input
                  type="text"
                  placeholder="Subjek email resmi..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', fontSize: '13px', fontWeight: 600 }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '4px', display: 'block' }}>
                  Isi Pesan / Catatan Khusus
                </label>
                <textarea
                  rows={5}
                  placeholder="Tuliskan pesan Anda di sini..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>

              {/* Attachment Drive URL */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748B)', marginBottom: '4px', display: 'block' }}>
                  Lampiran Link Google Drive (Opsional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip size={16} style={{ color: '#64748B' }} />
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Footer / Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowComposeModal(false)}
                  disabled={isSending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFF',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.7 : 1
                  }}
                >
                  {isSending ? (
                    <>Mengirim via Gmail API...</>
                  ) : (
                    <>
                      <Send size={15} /> Kirim Email Sekarang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
