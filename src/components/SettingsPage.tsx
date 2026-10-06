import React, { useState, useEffect, useRef } from 'react';
import { Settings, CustomerTestimonial, Invoice, Customer } from '../types';
import { saveSettings, DEFAULT_SETTINGS, convertToDirectImageUrl, compressImageFile } from '../firebaseService';
import { VoucherManager } from './VoucherManager';
import { TestimonialManager } from './TestimonialManager';
import { DatabaseSettingsTab } from './DatabaseSettingsTab';
import { GoogleDriveBrowseUpload } from './GoogleDriveBrowseUpload';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';
import { RunningAnnouncementBar } from './RunningAnnouncementBar';
import defaultLogoImg from '../assets/images/ctrl_print_logo_1785948969417.jpg';
import { uploadDocumentToDriveFolder } from '../services/googleDriveService';
import {
  requestGoogleAccessToken,
  createCtrlSpreadsheet,
  getGoogleAccessToken,
  clearGoogleAccessToken
} from '../lib/googleWorkspace';
import {
  Clock,
  Info,
  Sliders,
  Image,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  Instagram,
  MapPin,
  CreditCard,
  FileText,
  Lock,
  Save,
  CheckCircle2,
  QrCode,
  Upload,
  Trash2,
  Tag,
  Eye,
  Type,
  Link2,
  ExternalLink,
  Table,
  Calendar as CalendarIcon,
  FolderOpen,
  MessageSquare,
  ShieldCheck,
  Download,
  UploadCloud,
  HardDrive,
  Star,
  Database,
  Megaphone
} from 'lucide-react';

interface SettingsPageProps {
  settings: Settings;
  testimonials?: CustomerTestimonial[];
  invoices?: Invoice[];
  customers?: Customer[];
  showToast: (msg: string, isErr?: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  testimonials,
  invoices,
  customers,
  showToast
}) => {
  const [company, setCompany] = useState(settings.company || 'CTRL PRINT');
  const [tagline, setTagline] = useState(settings.tagline || DEFAULT_SETTINGS.tagline || 'Percetakan & Digital Printing Profesional');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [email, setEmail] = useState(settings.email || '');
  const [instagram, setInstagram] = useState(settings.instagram || '');
  const [address, setAddress] = useState(settings.address || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(settings.googleMapsUrl || '');
  const [paymentMethods, setPaymentMethods] = useState(settings.paymentMethods || '');
  const [bank, setBank] = useState(settings.bank || '');
  const [tnc, setTnc] = useState(settings.tnc || '');
  const [user, setUser] = useState(settings.user || 'admin');
  const [pass, setPass] = useState(settings.pass || 'admin123');
  const [qrisUrl, setQrisUrl] = useState(settings.qrisUrl || '');
  const [qrisNms, setQrisNms] = useState(settings.qrisNms || 'CTRL PRINT OFFICIAL');
  const [aboutUs, setAboutUs] = useState(settings.aboutUs || DEFAULT_SETTINGS.aboutUs || '');
  const [operationalHours, setOperationalHours] = useState(settings.operationalHours || DEFAULT_SETTINGS.operationalHours || '');
  const [headerBannerUrl, setHeaderBannerUrl] = useState(settings.headerBannerUrl || '');
  const [headerBanners, setHeaderBanners] = useState<string[]>(settings.headerBanners || []);
  const [headerBannerHeight, setHeaderBannerHeight] = useState<number>(settings.headerBannerHeight || 240);
  const [newBannerInput, setNewBannerInput] = useState('');
  const [enableRunningText, setEnableRunningText] = useState(settings.enableRunningText ?? true);
  const [runningTextContent, setRunningTextContent] = useState(
    settings.runningTextContent ||
      DEFAULT_SETTINGS.runningTextContent ||
      'Selamat datang di CTRL PRINT! Melayani cetak spanduk kilat, stiker A3+ kiss cut, kartu nama, brosur, banner, hingga packaging berkualitas tinggi • Konsultasi gratis via WhatsApp • Siap kirim se-Indonesia!'
  );
  const [runningTextBadge, setRunningTextBadge] = useState(settings.runningTextBadge || '📢 INFO & PROMO');
  const [runningTextSpeed, setRunningTextSpeed] = useState<'slow' | 'normal' | 'fast'>(settings.runningTextSpeed || 'normal');
  const [staffLoginVisibility, setStaffLoginVisibility] = useState<'discreet' | 'hidden' | 'normal'>(settings.staffLoginVisibility || 'discreet');
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState(settings.googleSpreadsheetId || '');
  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState(settings.googleSpreadsheetUrl || '');
  const [autoSyncGoogleSheets, setAutoSyncGoogleSheets] = useState(settings.autoSyncGoogleSheets ?? true);
  const [googleDriveFolderStructure, setGoogleDriveFolderStructure] = useState(settings.googleDriveFolderStructure ?? true);
  const [waTemplateInvoice, setWaTemplateInvoice] = useState(settings.waTemplateInvoice || DEFAULT_SETTINGS.waTemplateInvoice || '');
  const [waTemplateReady, setWaTemplateReady] = useState(settings.waTemplateReady || DEFAULT_SETTINGS.waTemplateReady || '');
  const [waTemplateAccDesain, setWaTemplateAccDesain] = useState(settings.waTemplateAccDesain || DEFAULT_SETTINGS.waTemplateAccDesain || '');
  const [waTemplatePiutang, setWaTemplatePiutang] = useState(settings.waTemplatePiutang || DEFAULT_SETTINGS.waTemplatePiutang || '');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectedGoogle, setIsConnectedGoogle] = useState(!!getGoogleAccessToken());

  const [activeSettingsTab, setActiveSettingsTab] = useState<'branding' | 'contact' | 'payment' | 'google_wa' | 'admin' | 'vouchers' | 'testimonials' | 'database'>('branding');

  // Google Drive File Picker Modal State
  const [drivePickerState, setDrivePickerState] = useState<{
    isOpen: boolean;
    purpose: 'logo' | 'qris' | 'banner' | 'general';
    title: string;
  }>({
    isOpen: false,
    purpose: 'logo',
    title: 'Pilih File dari Google Drive'
  });

  const handleSelectFromDrive = (dataUrlOrDirectUrl: string, fileName?: string) => {
    if (!dataUrlOrDirectUrl) return;

    if (drivePickerState.purpose === 'logo') {
      setLogoUrl(dataUrlOrDirectUrl);
      showToast(`🎉 Logo berhasil ditarik dari Google Drive (${fileName || 'Gambar'})!`);
    } else if (drivePickerState.purpose === 'qris') {
      setQrisUrl(dataUrlOrDirectUrl);
      showToast(`🎉 Gambar QRIS berhasil ditarik dari Google Drive (${fileName || 'Gambar'})!`);
    } else if (drivePickerState.purpose === 'banner') {
      setHeaderBanners((prev) => [...prev, dataUrlOrDirectUrl]);
      if (!headerBannerUrl) {
        setHeaderBannerUrl(dataUrlOrDirectUrl);
      }
      showToast(`🎉 Banner promosi berhasil ditambahkan dari Google Drive (${fileName || 'Gambar'})!`);
    }
  };

  useEffect(() => {
    setCompany(settings.company || 'CTRL PRINT');
    setTagline(settings.tagline || DEFAULT_SETTINGS.tagline || 'Percetakan & Digital Printing Profesional');
    setLogoUrl(settings.logoUrl || '');
    setPhone(settings.phone || '');
    setEmail(settings.email || '');
    setInstagram(settings.instagram || '');
    setAddress(settings.address || '');
    setGoogleMapsUrl(settings.googleMapsUrl || '');
    setPaymentMethods(settings.paymentMethods || '');
    setBank(settings.bank || '');
    setTnc(settings.tnc || '');
    setUser(settings.user || 'admin');
    setPass(settings.pass || 'admin123');
    setQrisUrl(settings.qrisUrl || '');
    setQrisNms(settings.qrisNms || 'CTRL PRINT OFFICIAL');
    setAboutUs(settings.aboutUs || DEFAULT_SETTINGS.aboutUs || '');
    setOperationalHours(settings.operationalHours || DEFAULT_SETTINGS.operationalHours || '');
    setHeaderBannerUrl(settings.headerBannerUrl || '');
    setHeaderBanners(settings.headerBanners || []);
    setHeaderBannerHeight(settings.headerBannerHeight || 240);
    setEnableRunningText(settings.enableRunningText ?? true);
    setRunningTextContent(settings.runningTextContent || DEFAULT_SETTINGS.runningTextContent || '');
    setRunningTextBadge(settings.runningTextBadge || '📢 INFO & PROMO');
    setRunningTextSpeed(settings.runningTextSpeed || 'normal');
    setStaffLoginVisibility(settings.staffLoginVisibility || 'discreet');
    setGoogleSpreadsheetId(settings.googleSpreadsheetId || '');
    setGoogleSpreadsheetUrl(settings.googleSpreadsheetUrl || '');
    setAutoSyncGoogleSheets(settings.autoSyncGoogleSheets ?? true);
    setGoogleDriveFolderStructure(settings.googleDriveFolderStructure ?? true);
    setWaTemplateInvoice(settings.waTemplateInvoice || DEFAULT_SETTINGS.waTemplateInvoice || '');
    setWaTemplateReady(settings.waTemplateReady || DEFAULT_SETTINGS.waTemplateReady || '');
    setWaTemplateAccDesain(settings.waTemplateAccDesain || DEFAULT_SETTINGS.waTemplateAccDesain || '');
    setWaTemplatePiutang(settings.waTemplatePiutang || DEFAULT_SETTINGS.waTemplatePiutang || '');
  }, [settings]);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const token = await requestGoogleAccessToken();
      setIsConnectedGoogle(true);
      showToast('Berhasil terhubung dengan Akun Google!');
      
      // If spreadsheet doesn't exist, offer to auto-create it
      if (!googleSpreadsheetId) {
        showToast('Membuat Google Spreadsheet baru untuk pembukuan CTRL PRINT...');
        const created = await createCtrlSpreadsheet(token, `CTRL PRINT - Rekap Penjualan & Order (${company})`);
        setGoogleSpreadsheetId(created.spreadsheetId);
        setGoogleSpreadsheetUrl(created.spreadsheetUrl);
        showToast('Google Spreadsheet berhasil dibuat dan ditautkan!');
      }
    } catch (err: any) {
      console.error('Error connecting Google Workspace:', err);
      showToast(err.message || 'Gagal menghubungkan Google Workspace.', true);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleDisconnectGoogle = () => {
    clearGoogleAccessToken();
    setIsConnectedGoogle(false);
    showToast('Koneksi Google Access Token telah diputus.');
  };

  // Instant Local Upload with client-side auto compression + optional Google Drive sync
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('Memproses & mengompres logo...', false);
        // Instant high-quality compression to ensure fast loading and fail-safe saving
        const compressedDataUrl = await compressImageFile(file, 600, 0.85);
        setLogoUrl(compressedDataUrl);
        showToast('🎉 Logo berhasil dimuat & dikompres otomatis!');

        // If Google Workspace is connected, also mirror to Drive
        if (isConnectedGoogle) {
          uploadDocumentToDriveFolder(file, `Logo_${(company || 'CTRL_PRINT').replace(/\s+/g, '_')}_${Date.now()}`, undefined, 'logos')
            .then((res) => {
              console.log('Logo mirrored to Drive:', res.viewUrl);
            })
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Error processing logo:', err);
        showToast(err.message || 'Gagal memproses file logo.', true);
      }
    }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showToast('Memproses & mengompres gambar QRIS...', false);
        const compressedDataUrl = await compressImageFile(file, 800, 0.85);
        setQrisUrl(compressedDataUrl);
        showToast('🎉 Gambar QRIS berhasil disimpan!');

        if (isConnectedGoogle) {
          uploadDocumentToDriveFolder(file, `QRIS_${(company || 'CTRL_PRINT').replace(/\s+/g, '_')}_${Date.now()}`, undefined, 'general')
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Error processing QRIS:', err);
        showToast(err.message || 'Gagal memproses file QRIS.', true);
      }
    }
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      showToast(`Memproses ${fileList.length} file banner...`, false);
      try {
        const compressedList = await Promise.all(
          fileList.map((f) => compressImageFile(f, 1200, 0.82))
        );
        setHeaderBanners((prev) => [...prev, ...compressedList]);
        if (!headerBannerUrl && compressedList.length > 0) {
          setHeaderBannerUrl(compressedList[0]);
        }
        showToast(`🎉 ${compressedList.length} banner berhasil ditambahkan & disimpan!`);
      } catch (err: any) {
        console.error('Error processing banners:', err);
        showToast(err.message || 'Gagal memproses banner.', true);
      }
      e.target.value = '';
    }
  };

  // Export Settings as JSON Backup file
  const handleExportBackup = () => {
    try {
      const currentSettings: Settings = {
        company,
        tagline,
        logoUrl,
        phone,
        email,
        instagram,
        address,
        googleMapsUrl,
        paymentMethods,
        bank,
        tnc,
        user,
        pass,
        qrisUrl,
        qrisNms,
        aboutUs,
        operationalHours,
        headerBannerUrl: headerBanners.length > 0 ? headerBanners[0] : headerBannerUrl,
        headerBanners,
        headerBannerHeight,
        enableRunningText,
        runningTextContent,
        runningTextBadge,
        runningTextSpeed,
        staffLoginVisibility,
        googleSpreadsheetId,
        googleSpreadsheetUrl,
        autoSyncGoogleSheets,
        googleDriveFolderStructure,
        waTemplateInvoice,
        waTemplateReady,
        waTemplateAccDesain,
        waTemplatePiutang
      };
      const blob = new Blob([JSON.stringify(currentSettings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_pengaturan_${(company || 'ctrl_print').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📦 File cadangan (backup) pengaturan berhasil diunduh!');
    } catch (err) {
      showToast('Gagal mengekspor file cadangan!', true);
    }
  };

  // Import / Restore Settings from JSON Backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && typeof parsed === 'object') {
            if (parsed.company !== undefined) setCompany(parsed.company);
            if (parsed.tagline !== undefined) setTagline(parsed.tagline);
            if (parsed.logoUrl !== undefined) setLogoUrl(parsed.logoUrl);
            if (parsed.phone !== undefined) setPhone(parsed.phone);
            if (parsed.email !== undefined) setEmail(parsed.email);
            if (parsed.instagram !== undefined) setInstagram(parsed.instagram);
            if (parsed.address !== undefined) setAddress(parsed.address);
            if (parsed.googleMapsUrl !== undefined) setGoogleMapsUrl(parsed.googleMapsUrl);
            if (parsed.paymentMethods !== undefined) setPaymentMethods(parsed.paymentMethods);
            if (parsed.bank !== undefined) setBank(parsed.bank);
            if (parsed.tnc !== undefined) setTnc(parsed.tnc);
            if (parsed.user !== undefined) setUser(parsed.user);
            if (parsed.pass !== undefined) setPass(parsed.pass);
            if (parsed.qrisUrl !== undefined) setQrisUrl(parsed.qrisUrl);
            if (parsed.qrisNms !== undefined) setQrisNms(parsed.qrisNms);
            if (parsed.aboutUs !== undefined) setAboutUs(parsed.aboutUs);
            if (parsed.operationalHours !== undefined) setOperationalHours(parsed.operationalHours);
            if (parsed.headerBannerUrl !== undefined) setHeaderBannerUrl(parsed.headerBannerUrl);
            if (parsed.headerBanners !== undefined) setHeaderBanners(parsed.headerBanners);
            if (parsed.headerBannerHeight !== undefined) setHeaderBannerHeight(parsed.headerBannerHeight);
            if (parsed.enableRunningText !== undefined) setEnableRunningText(parsed.enableRunningText);
            if (parsed.runningTextContent !== undefined) setRunningTextContent(parsed.runningTextContent);
            if (parsed.runningTextBadge !== undefined) setRunningTextBadge(parsed.runningTextBadge);
            if (parsed.runningTextSpeed !== undefined) setRunningTextSpeed(parsed.runningTextSpeed);
            if (parsed.staffLoginVisibility !== undefined) setStaffLoginVisibility(parsed.staffLoginVisibility);
            if (parsed.waTemplateInvoice !== undefined) setWaTemplateInvoice(parsed.waTemplateInvoice);
            if (parsed.waTemplateReady !== undefined) setWaTemplateReady(parsed.waTemplateReady);
            if (parsed.waTemplateAccDesain !== undefined) setWaTemplateAccDesain(parsed.waTemplateAccDesain);
            if (parsed.waTemplatePiutang !== undefined) setWaTemplatePiutang(parsed.waTemplatePiutang);

            await saveSettings({ ...DEFAULT_SETTINGS, ...settings, ...parsed });
            showToast('🎉 Pengaturan berhasil dipulihkan dari file cadangan!');
          }
        } catch (err) {
          showToast('File JSON cadangan tidak valid atau rusak.', true);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const handleAddBannerUrl = () => {
    if (!newBannerInput.trim()) return;
    const raw = newBannerInput.trim();
    const converted = convertToDirectImageUrl(raw);
    setHeaderBanners((prev) => [...prev, converted]);
    if (!headerBannerUrl) setHeaderBannerUrl(converted);
    setNewBannerInput('');
    if (raw.includes('drive.google.com')) {
      showToast('Link Google Drive berhasil dikonversi & ditambahkan!');
    } else {
      showToast('Link gambar banner berhasil ditambahkan!');
    }
  };

  const handleRemoveBanner = (index: number) => {
    const updated = headerBanners.filter((_, i) => i !== index);
    setHeaderBanners(updated);
    if (updated.length > 0) {
      setHeaderBannerUrl(updated[0]);
    } else {
      setHeaderBannerUrl('');
    }
    showToast('Gambar banner dihapus.');
  };

  const handleResetBanners = () => {
    setHeaderBanners([]);
    setHeaderBannerUrl('');
    showToast('Banner header direset ke tampilan default!');
  };

  const handleResetLogo = () => {
    setLogoUrl(DEFAULT_SETTINGS.logoUrl || '');
    showToast('Logo direset ke Logo Resmi CTRL PRINT!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated: Settings = {
        company,
        tagline,
        logoUrl,
        phone,
        email,
        instagram,
        address,
        googleMapsUrl,
        paymentMethods,
        bank,
        tnc,
        user,
        pass,
        qrisUrl,
        qrisNms,
        aboutUs,
        operationalHours,
        headerBannerUrl: headerBanners.length > 0 ? headerBanners[0] : headerBannerUrl,
        headerBanners,
        headerBannerHeight,
        enableRunningText,
        runningTextContent,
        runningTextBadge,
        runningTextSpeed,
        staffLoginVisibility,
        googleSpreadsheetId,
        googleSpreadsheetUrl,
        autoSyncGoogleSheets,
        googleDriveFolderStructure,
        waTemplateInvoice,
        waTemplateReady,
        waTemplateAccDesain,
        waTemplatePiutang
      };
      await saveSettings(updated);
      showToast('Pengaturan Berhasil Disimpan!');
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      showToast('Gagal menyimpan pengaturan!', true);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontWeight: 800, fontSize: '15px' }}>
          <Sliders size={20} />
          <span>Pengaturan Sistem & Branding Usaha</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportBackup}
            style={{ fontSize: '11px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Download salinan seluruh data pengaturan ke file JSON"
          >
            <Download size={13} /> Cadangkan (JSON)
          </button>
          
          <input
            type="file"
            ref={backupInputRef}
            onChange={handleImportBackup}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => backupInputRef.current?.click()}
            style={{ fontSize: '11px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Pulihkan data pengaturan dari file JSON cadangan"
          >
            <UploadCloud size={13} /> Pulihkan (JSON)
          </button>

          <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
            <ShieldCheck size={14} /> Cloud & Local Cache Aktif
          </span>
        </div>
      </div>

      {/* Navigasi Kategori Tab Pengaturan */}
      <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('branding')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'branding' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'branding' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Image size={14} /> Identitas & Banner Portal
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('contact')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'contact' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'contact' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Phone size={14} /> Kontak & Workshop
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('payment')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'payment' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'payment' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <CreditCard size={14} /> Pembayaran & QRIS
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('google_wa')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'google_wa' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'google_wa' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Table size={14} /> Google Workspace & WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('admin')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'admin' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'admin' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Lock size={14} /> Akun Admin
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('vouchers')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'vouchers' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'vouchers' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Tag size={14} /> Kupon & Voucher
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('testimonials')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'testimonials' ? 'var(--primary)' : 'transparent',
            color: activeSettingsTab === 'testimonials' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Star size={14} fill={activeSettingsTab === 'testimonials' ? '#FFF' : 'transparent'} /> Testimoni & Ulasan
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('database')}
          className="btn btn-sm"
          style={{
            background: activeSettingsTab === 'database' ? '#10B981' : 'transparent',
            color: activeSettingsTab === 'database' ? '#FFF' : 'var(--text-main)',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 12px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Database size={14} /> Database & Supabase
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: activeSettingsTab === 'branding' || activeSettingsTab === 'google_wa' ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
          
          {/* Section 1: Logo & Branding */}
          {(activeSettingsTab === 'branding') && (
            <>
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Image size={16} /> Identitas & Logo Usaha
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                  <div style={{ width: '84px', height: '84px', background: '#FFF', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', flexShrink: 0 }}>
                    {logoUrl ? (
                      <img
                        src={convertToDirectImageUrl(logoUrl)}
                        alt="Logo Preview"
                        referrerPolicy="no-referrer"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = defaultLogoImg;
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#94A3B8', textAlign: 'center' }}>Tanpa Logo</span>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-outline btn-sm"
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        <Upload size={13} /> Unggah dari Komputer
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setDrivePickerState({
                          isOpen: true,
                          purpose: 'logo',
                          title: 'Pilih Logo Toko dari Google Drive'
                        })}
                        style={{
                          fontSize: '11px',
                          padding: '5px 12px',
                          background: 'rgba(15, 157, 88, 0.08)',
                          borderColor: '#0F9D58',
                          color: '#0F9D58',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700
                        }}
                      >
                        <HardDrive size={13} /> 📁 Browse dari Google Drive
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleResetLogo}
                        style={{ fontSize: '10.5px', padding: '5px 10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}
                      >
                        <RefreshCw size={11} /> Reset Default
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Atau tempel Link Gambar / Drive langsung..."
                        style={{ fontSize: '11px', padding: '6px 10px', flex: 1 }}
                      />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      💡 <b>Solusi praktis:</b> Klik <b>Browse dari Google Drive</b> untuk memilih file logo langsung dari akun Google Drive Anda tanpa perlu upload ulang.
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={14} /> Nama Usaha / Toko Cetak
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    placeholder="CTRL PRINT"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Type size={14} /> Slogan / Tagline Usaha
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Percetakan & Digital Printing Profesional"
                  />
                </div>
              </div>

              {/* Section 1.5: Banner Header Custom Portal Pelanggan */}
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Image size={18} /> Banner Header Custom (Portal Pelanggan)
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#2563EB', background: 'rgba(37, 99, 235, 0.1)', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    {headerBanners.length > 0 ? `${headerBanners.length} Gambar Banner Aktif` : 'Menggunakan Banner Promosi Default'}
                  </span>
                </div>

                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '12px', lineHeight: '1.5' }}>
                  Atur gambar slide banner promosi yang tampil di halaman depan Portal Pelanggan. Anda bisa mengunggah file dari komputer atau menempelkan <b>Link Google Drive / URL Gambar Publik</b>.
                </p>

                {/* Google Drive Guide Info Box */}
                <div style={{ background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#1E40AF', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={14} color="#2563EB" /> Panduan Praktis: Menggunakan Gambar dari Google Drive
                  </div>
                  <div style={{ lineHeight: '1.5' }}>
                    1. Upload foto banner ke Google Drive Anda.<br />
                    2. Klik kanan file &rarr; <b>Bagikan</b> &rarr; Ubah Akses ke <b>"Siapa saja yang memiliki link"</b>.<br />
                    3. Salin link Google Drive tersebut, lalu tempel di kolom <b>"Link URL Gambar / Google Drive"</b> di bawah.<br />
                    <i>Sistem akan otomatis mengubah link Google Drive menjadi URL Gambar Direct yang dapat langsung tampil!</i>
                  </div>
                </div>

                {/* Upload File, Drive Browse & Link Input Container */}
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Upload size={13} /> Unggah File Banner / Browse
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <label
                          className="btn btn-outline btn-sm"
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          <Upload size={13} /> Unggah File Komputer
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleBannerFileUpload}
                            style={{ display: 'none' }}
                          />
                        </label>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setDrivePickerState({
                            isOpen: true,
                            purpose: 'banner',
                            title: 'Pilih Gambar Banner dari Google Drive'
                          })}
                          style={{
                            fontSize: '11px',
                            padding: '6px 12px',
                            background: 'rgba(15, 157, 88, 0.08)',
                            borderColor: '#0F9D58',
                            color: '#0F9D58',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700
                          }}
                        >
                          <HardDrive size={13} /> 📁 Browse dari Drive
                        </button>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                        Pilih foto banner dari Google Drive atau upload file JPG/PNG.
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Link2 size={13} /> Tempel Link URL Gambar / Drive Manual
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="url"
                          value={newBannerInput}
                          onChange={(e) => setNewBannerInput(e.target.value)}
                          placeholder="https://drive.google.com/file/d/... atau URL gambar"
                          style={{ fontSize: '11.5px', flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleAddBannerUrl}
                          style={{ fontSize: '11px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                        >
                          Tambah Link
                        </button>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        Mendukung link Google Drive, Imgur, atau URL gambar publik apapun.
                      </span>
                    </div>
                  </div>

                  {/* Height adjustment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={13} /> Tinggi Banner Header (px):
                    </label>
                    <input
                      type="range"
                      min="160"
                      max="400"
                      step="10"
                      value={headerBannerHeight}
                      onChange={(e) => setHeaderBannerHeight(Number(e.target.value))}
                      style={{ width: '160px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', minWidth: '45px' }}>
                      {headerBannerHeight} px
                    </span>
                  </div>
                </div>

                {/* List Preview of Uploaded Banner Images */}
                {headerBanners.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Daftar Gambar Banner Slider ({headerBanners.length}):</span>
                      <button
                        type="button"
                        onClick={handleResetBanners}
                        style={{ fontSize: '10.5px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                      >
                        <Trash2 size={12} /> Hapus Semua & Reset Default
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {headerBanners.map((url, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            background: '#0F172A',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                          }}
                        >
                          <img
                            src={convertToDirectImageUrl(url)}
                            alt={`Banner ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#FFF',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}
                          >
                            Slide #{idx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBanner(idx)}
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#FFF',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                            }}
                            title="Hapus gambar ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--bg-main)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                      textAlign: 'center',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    Belum ada gambar banner custom. Portal Pelanggan saat ini menggunakan banner promosi bertema gradient bawaan sistem.
                  </div>
                )}
              </div>

              {/* Section 1.6: Running Text / Pengumuman Berjalan (Di Antara Header & Kategori) */}
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Megaphone size={18} /> Running Text / Pengumuman Berjalan (Portal Pelanggan)
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: enableRunningText ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', color: enableRunningText ? '#059669' : '#64748B', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${enableRunningText ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.2)'}` }}>
                    <input
                      type="checkbox"
                      checked={enableRunningText}
                      onChange={(e) => setEnableRunningText(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    {enableRunningText ? 'Aktif (Tampil di Web)' : 'Nonaktif (Disembunyikan)'}
                  </label>
                </div>

                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '14px', lineHeight: '1.5' }}>
                  Teks pengumuman berjalan (*marquee ticker*) yang tampil tepat <strong>di antara header atas dan bar menu kategori</strong> pada Portal Pelanggan. Memiliki fitur <em>pause saat disentuh/hover mouse</em> sehingga pelanggan nyaman membaca.
                </p>

                {/* Live Preview Box */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={12} color="#2563EB" /> Pratinjau Langsung (Live Preview)
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                    {enableRunningText ? (
                      <RunningAnnouncementBar
                        enabled={true}
                        content={runningTextContent}
                        badge={runningTextBadge}
                        speed={runningTextSpeed}
                        allowDismiss={false}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Running text sedang <strong>dinonaktifkan</strong>. Centang tombol aktif di atas untuk menampilkannya.
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>
                      Teks Lencana / Badge Kiri:
                    </label>
                    <input
                      type="text"
                      value={runningTextBadge}
                      onChange={(e) => setRunningTextBadge(e.target.value)}
                      placeholder="Contoh: 📢 INFO & PROMO / ⚡ PENGUMUMAN"
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>
                      Kecepatan Berjalan:
                    </label>
                    <select
                      value={runningTextSpeed}
                      onChange={(e) => setRunningTextSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="slow">Lambat (45s) — Cocok untuk teks panjang</option>
                      <option value="normal">Normal (28s) — Rekomendasi seimbang</option>
                      <option value="fast">Cepat (18s) — Cocok untuk teks ringkas</option>
                    </select>
                  </div>
                </div>

                {/* Content Textarea */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, margin: 0 }}>
                      Isi Pesan Running Text:
                    </label>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Tips: Gunakan tanda titik tengah "•" sebagai pemisah poin
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={runningTextContent}
                    onChange={(e) => setRunningTextContent(e.target.value)}
                    placeholder="Ketik teks pengumuman yang ingin dijalankan di portal pelanggan..."
                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    ⚡ Contoh Template Siap Pakai (Klik untuk Menggunakan):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '10.5px', padding: '3px 8px' }}
                      onClick={() => {
                        setRunningTextBadge('🎉 PROMO SPESIAL');
                        setRunningTextContent('Diskon Cetak Spanduk & Banner 10% minggu ini! • Dapatkan gratis laminasi stiker untuk pesanan di atas 10 lembar A3+ • Konsultasi gratis via WA!');
                      }}
                    >
                      🎉 Promo Diskon
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '10.5px', padding: '3px 8px' }}
                      onClick={() => {
                        setRunningTextBadge('📢 JADWAL BUKA');
                        setRunningTextContent('Workshop buka setiap Senin - Sabtu pukul 08.00 - 21.00 WIB • Melayani cetak kilat Same-Day Service • Batas terima file jam 16.00 WIB');
                      }}
                    >
                      📢 Jam Operasional
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '10.5px', padding: '3px 8px' }}
                      onClick={() => {
                        setRunningTextBadge('⚡ INFO FILE CETAK');
                        setRunningTextContent('Gunakan format PDF/TIFF mode CMYK resolusi minimal 300 DPI untuk hasil cetak tajam & akurat • Kirim file via Google Drive / WhatsApp kami');
                      }}
                    >
                      ⚡ Ketentuan File
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '10.5px', padding: '3px 8px' }}
                      onClick={() => {
                        setRunningTextBadge('🚚 PENGIRIMAN');
                        setRunningTextContent('Pesanan selesai siap diambil di workshop atau dikirim instan (Gojek/Grab) & ekspedisi ke seluruh wilayah • Tracking nota langsung di web ini!');
                      }}
                    >
                      🚚 Info Pengiriman
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 1.7: Keamanan & Visibilitas Tombol Login Staf */}
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} /> Keamanan & Tampilan Tombol Login Staf (Portal Pelanggan)
                </div>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '14px', lineHeight: '1.5' }}>
                  Atur agar tombol akses login staf kasir/admin tidak mencolok bagi pelanggan umum sehingga mencegah orang iseng mencoba login atau menebak kata sandi.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  {/* Option 1: Discreet / Samar (Recommended) */}
                  <div
                    onClick={() => setStaffLoginVisibility('discreet')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1.5px solid ${staffLoginVisibility === 'discreet' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: staffLoginVisibility === 'discreet' ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: staffLoginVisibility === 'discreet' ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🛡️ Samar / Disamarkan
                      </span>
                      <span style={{ fontSize: '10px', background: '#10B981', color: '#FFF', padding: '1px 6px', borderRadius: '12px', fontWeight: 700 }}>
                        REKOMENDASI
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.45' }}>
                      Tombol biru "Login Staf" di header atas <strong>dihapus</strong>. Hanya menyisakan teks tanda versi samar <code>v2.5</code> di footer paling bawah yang tidak memancing perhatian pengunjung.
                    </p>
                  </div>

                  {/* Option 2: Hidden / Sembunyikan Total */}
                  <div
                    onClick={() => setStaffLoginVisibility('hidden')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1.5px solid ${staffLoginVisibility === 'hidden' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: staffLoginVisibility === 'hidden' ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: staffLoginVisibility === 'hidden' ? 'var(--primary)' : 'var(--text-main)' }}>
                        🔒 Sembunyi Total
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.45' }}>
                      Benar-benar <strong>tidak menampilkan tombol login apapun</strong> di header maupun footer. Hanya staf yang tahu cara membuka dengan tombol pintas.
                    </p>
                  </div>

                  {/* Option 3: Normal / Terbuka */}
                  <div
                    onClick={() => setStaffLoginVisibility('normal')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1.5px solid ${staffLoginVisibility === 'normal' ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: staffLoginVisibility === 'normal' ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: staffLoginVisibility === 'normal' ? 'var(--primary)' : 'var(--text-main)' }}>
                        👁️ Normal / Terlihat
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.45' }}>
                      Menampilkan tombol biru "Login Staf" yang mencolok di header atas dan tombol login di footer.
                    </p>
                  </div>
                </div>

                {/* Helpful Staff Shortcuts Info Box */}
                <div style={{ background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '11.5px', color: 'var(--text-main)' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                    💡 Cara Staf Membuka Modal Login Saat Tombol Tersembunyi:
                  </div>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, lineHeight: '1.6', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <li><strong>Tombol Pintas Keyboard:</strong> Tekan kombinasi tombol <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>Alt + L</kbd> atau <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>Ctrl + Shift + L</kbd> di halaman mana saja.</li>
                    <li><strong>Ketuk Cepat Logo Toko:</strong> Klik atau ketuk logo <strong>{company || 'CTRL PRINT'}</strong> sebanyak <strong>4 kali berturut-turut</strong> (sangat mudah digunakan di smartphone atau tablet kasir).</li>
                    {staffLoginVisibility === 'discreet' && (
                      <li><strong>Teks Samar di Footer:</strong> Klik tulisan samar <code style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>v2.5</code> di samping teks hak cipta paling bawah.</li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Section 2: Profil & Kontak Toko */}
          {(activeSettingsTab === 'contact') && (
            <>
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={16} /> Profil & Kontak Toko
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} /> Nomor HP / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="08123456789"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={13} /> Email Toko
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ctrlprint@gmail.com"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Instagram size={13} /> Instagram Toko
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@ctrlprint.id"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> Alamat Lengkap Workshop & Lokasi Cetak
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Jl. Sultan Hasanuddin No. 15, Kota Balikpapan – Kalimantan Timur 76133"
                    style={{ width: '100%', fontSize: '12px', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                    Alamat ini akan ditampilkan di nota cetak, invoice PDF, dan bagian kontak footer Portal Pelanggan.
                  </span>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                      <ExternalLink size={13} style={{ color: '#EA4335' }} /> Link Google Maps Workshop (Petunjuk Arah)
                    </label>
                    {(googleMapsUrl || address) && (
                      <a
                        href={googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company} ${address}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#EA4335', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        <span>Tes Buka Maps</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/..."
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                    (Opsional) Tempel link Google Maps resmi toko. Jika dikosongkan, sistem akan otomatis membuat link pencarian Maps dari alamat di atas.
                  </span>
                </div>
              </div>

              {/* Section 4: Informasi Footer Portal Pelanggan */}
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={18} /> Footer Portal Pelanggan (Tentang Kami & Jam Operasional)
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                    <Building2 size={14} /> Tentang Kami (Deskripsi Ringkas Toko di Footer Portal)
                  </label>
                  <textarea
                    value={aboutUs}
                    onChange={(e) => setAboutUs(e.target.value)}
                    rows={3}
                    placeholder="Deskripsi singkat profil usaha yang akan tampil pada footer portal pelanggan..."
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                    <Clock size={14} /> Jam Operasional Toko
                  </label>
                  <textarea
                    value={operationalHours}
                    onChange={(e) => setOperationalHours(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Senin - Sabtu: 08.00 - 21.00 WITA &#10;Minggu & Libur: 10.00 - 17.00 WITA"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Section 3: Pembayaran & Syarat Nota */}
          {(activeSettingsTab === 'payment') && (
            <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} /> Pembayaran & QRIS Statis Toko
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    0% Biaya Admin (Nol MDR)
                  </span>
                </div>
              </div>

              {/* QRIS Statis Upload Box */}
              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <QrCode size={16} style={{ color: '#059669' }} /> Gambar Barcode QRIS Statis Toko
                  </label>
                  {qrisUrl ? (
                    <span style={{ fontSize: '10.5px', color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> QRIS Aktif
                    </span>
                  ) : (
                    <span style={{ fontSize: '10.5px', color: '#64748B', background: 'rgba(100, 116, 139, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      Belum Upload
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Image Preview Box */}
                  <div style={{ width: '140px', height: '140px', background: '#FFF', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    {qrisUrl ? (
                      <img
                        src={qrisUrl}
                        alt="QRIS Preview"
                        referrerPolicy="no-referrer"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94A3B8', padding: '10px' }}>
                        <QrCode size={40} style={{ opacity: 0.4, margin: '0 auto 4px auto' }} />
                        <div style={{ fontSize: '10px', fontWeight: 600 }}>Belum Ada Gambar</div>
                      </div>
                    )}
                  </div>

                  {/* Upload Action Area */}
                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                      Unggah foto/screenshot QRIS Statis dari bank/e-wallet toko Anda (PNG/JPG). Barcode ini akan tampil besar & jelas di <strong>Nota A5</strong>, <strong>Portal Pelanggan</strong>, dan <strong>Draf Pesan WA AI</strong> tanpa dipotong fee MDR.
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-primary btn-sm"
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '11.5px',
                          fontWeight: 600
                        }}
                      >
                        <Upload size={14} /> {qrisUrl ? 'Ganti QRIS (Upload)' : 'Upload Foto QRIS'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrisUpload}
                          style={{ display: 'none' }}
                        />
                      </label>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setDrivePickerState({
                          isOpen: true,
                          purpose: 'qris',
                          title: 'Pilih Gambar QRIS dari Google Drive'
                        })}
                        style={{
                          fontSize: '11.5px',
                          padding: '6px 14px',
                          background: 'rgba(15, 157, 88, 0.08)',
                          borderColor: '#0F9D58',
                          color: '#0F9D58',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700
                        }}
                      >
                        <HardDrive size={14} /> 📁 Browse dari Drive
                      </button>

                      {qrisUrl && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setQrisUrl('');
                            showToast('Gambar QRIS berhasil dihapus');
                          }}
                          style={{
                            fontSize: '11.5px',
                            padding: '6px 12px',
                            color: '#EF4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={13} /> Hapus QRIS
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ marginTop: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600 }}>Nama Merchant / NMS (Tampil di Nota & Portal)</label>
                      <input
                        type="text"
                        value={qrisNms}
                        onChange={(e) => setQrisNms(e.target.value)}
                        placeholder="Contoh: CTRL PRINT BALIKPAPAN"
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={13} /> Opsi Metode Pembayaran (Pisahkan koma)
                </label>
                <input
                  type="text"
                  value={paymentMethods}
                  onChange={(e) => setPaymentMethods(e.target.value)}
                  placeholder="Cash, Transfer BCA, QRIS"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={13} /> Informasi Rekening Bank (Tampil di Nota)
                </label>
                <textarea
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  rows={2}
                  placeholder="BCA 123456789 a.n CTRL PRINT&#10;MANDIRI 987654321 a.n CTRL PRINT"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={13} /> Syarat & Ketentuan (T&C Nota Invoice)
                </label>
                <textarea
                  value={tnc}
                  onChange={(e) => setTnc(e.target.value)}
                  rows={2}
                  placeholder="1. DP min 50%. 2. Barang diambil max 14 hari."
                />
              </div>
            </div>
          )}

          {/* Section 4: Google Workspace & WhatsApp */}
          {(activeSettingsTab === 'google_wa') && (
            <>
              {/* Google Workspace */}
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Table size={16} color="#0F9D58" />
                    <span>Google Workspace (Sheets, Drive, Calendar & Gmail PO)</span>
                  </div>
                  <span style={{ fontSize: '10px', color: isConnectedGoogle ? '#059669' : '#64748B', background: isConnectedGoogle ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    {isConnectedGoogle ? '✓ Terhubung' : 'Belum Terhubung'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Hubungkan akun Google Anda untuk sinkronisasi otomatis seluruh invoice kasir ke <strong>Google Sheets</strong>, upload dokumen/logo ke <strong>Google Drive</strong>, jadwal deadline job ke <strong>Google Calendar</strong>, serta pengiriman PO Vendor langsung via <strong>Gmail</strong>.
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {!isConnectedGoogle ? (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingGoogle}
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Link2 size={14} />
                      <span>{isConnectingGoogle ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <RefreshCw size={14} />
                        <span>Buat/Perbarui Spreadsheet Baru</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectGoogle}
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '8px 14px', color: '#EF4444', borderColor: '#EF4444' }}
                      >
                        Putuskan Koneksi
                      </button>
                    </>
                  )}
                </div>

                {googleSpreadsheetUrl && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#166534', fontWeight: 600 }}>
                      <Table size={16} />
                      <span>Spreadsheet Aktif Terhubung</span>
                    </div>
                    <a
                      href={googleSpreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#0052FF', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <span>Buka di Google Sheets</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11.5px' }}>ID Spreadsheet Google Sheets</label>
                  <input
                    type="text"
                    value={googleSpreadsheetId}
                    onChange={(e) => {
                      setGoogleSpreadsheetId(e.target.value);
                      if (e.target.value.trim()) {
                        setGoogleSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${e.target.value.trim()}/edit`);
                      }
                    }}
                    placeholder="Misal: 1BxiMVs0XRX5nZy1WOm82xG-V8G8Xz..."
                    style={{ fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    checked={autoSyncGoogleSheets}
                    onChange={(e) => setAutoSyncGoogleSheets(e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>Otomatis simpan baris baru ke Google Sheets setiap kasir cetak invoice</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    checked={googleDriveFolderStructure}
                    onChange={(e) => setGoogleDriveFolderStructure(e.target.checked)}
                  />
                  <span style={{ fontWeight: 600 }}>Otomatis susun folder Google Drive berdasarkan Kategori Konteks (CTRL PRINT &gt; Desain ACC / Bukti Bayar / Vendor / Nota &gt; Periode)</span>
                </label>

                {/* Direct Google Drive File & Document Uploader */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <div
                    style={{
                      background: 'rgba(37, 99, 235, 0.04)',
                      border: '1px solid rgba(37, 99, 235, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '10px',
                      lineHeight: '1.6'
                    }}
                  >
                    <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '3px' }}>
                      📁 Panduan Struktur Folder Otomatis di Google Drive:
                    </strong>
                    Berkas di Google Drive dikelompokkan otomatis di bawah folder induk <strong>CTRL PRINT</strong>:
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      <li><strong>Desain &amp; ACC:</strong> Berkas cetak pesanan, link desain kasir, dan proofing ACC pelanggan.</li>
                      <li><strong>Bukti Transfer Customer:</strong> Slip pembayaran transfer yang diunggah customer.</li>
                      <li><strong>Pembayaran Vendor:</strong> Bukti pembayaran / slip transfer pelunasan tagihan ke vendor luar.</li>
                      <li><strong>File Cetak &amp; PO Vendor:</strong> Berkas desain cetak, gambar/artwork, PDF, dan SPK pekerjaan vendor luar.</li>
                      <li><strong>Branding &amp; Logo:</strong> Logo resmi toko dan banner carousel.</li>
                      <li><strong>Scan Nota &amp; Pengeluaran:</strong> Bukti kas keluar dan struk belanja operasional.</li>
                      <li><strong>Dokumen &amp; Lampiran:</strong> Folder serbaguna / umum untuk dokumen arsip dan berkas lain-lain.</li>
                    </ul>
                  </div>

                  <GoogleDriveBrowseUpload
                    showToast={showToast}
                    targetCategory="general"
                    defaultFolderName="CTRL PRINT / Dokumen & Lampiran"
                    allowSetAsLogo={(url) => {
                      setLogoUrl(url);
                      showToast('Logo toko berhasil diperbarui dari file Google Drive!');
                    }}
                    onUploaded={(url, info) => {
                      showToast(`File "${info.name}" siap digunakan!`);
                    }}
                  />
                </div>
              </div>

              {/* WhatsApp Templates */}
              <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="#25D366" />
                    <span>Template Pesan WhatsApp Otomatis</span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#166534', background: '#DCFCE7', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Dynamic Variables
                  </span>
                </div>

                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.5' }}>
                  Sesuaikan kata-kata pesan WhatsApp yang dikirimkan ke pelanggan. Gunakan variabel dinamis seperti <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{namaCust}'}</code>, <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{noInv}'}</code>, <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{grandTotal}'}</code>, <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{sisaBayar}'}</code>, <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{linkPortal}'}</code>, <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{linkAcc}'}</code>, <code style={{ color: '#0052FF', background: 'var(--bg-main)', padding: '2px 5px', borderRadius: '4px' }}>{'{toko}'}</code>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📄 Template 1: Kirim Nota & Rincian Pesanan Baru</span>
                    </label>
                    <textarea
                      value={waTemplateInvoice}
                      onChange={(e) => setWaTemplateInvoice(e.target.value)}
                      rows={4}
                      style={{ fontSize: '11.5px', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✅ Template 2: Pesanan Selesai & Siap Diambil</span>
                    </label>
                    <textarea
                      value={waTemplateReady}
                      onChange={(e) => setWaTemplateReady(e.target.value)}
                      rows={3}
                      style={{ fontSize: '11.5px', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎨 Template 3: Permintaan Review / ACC Desain Online</span>
                    </label>
                    <textarea
                      value={waTemplateAccDesain}
                      onChange={(e) => setWaTemplateAccDesain(e.target.value)}
                      rows={3}
                      style={{ fontSize: '11.5px', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💳 Template 4: Pengingat / Follow-Up Sisa Tagihan (Piutang)</span>
                    </label>
                    <textarea
                      value={waTemplatePiutang}
                      onChange={(e) => setWaTemplatePiutang(e.target.value)}
                      rows={3}
                      style={{ fontSize: '11.5px', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Section 5: Akses Security Admin */}
          {(activeSettingsTab === 'admin') && (
            <div className="card" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} /> Kredensial Akses Admin
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Username Admin</label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Password Admin</label>
                  <input
                    type="text"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '14px', background: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                <span>Gunakan kombinasi username & password ini untuk login sebagai admin di perangkat baru.</span>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Save Action */}
        {activeSettingsTab !== 'vouchers' && activeSettingsTab !== 'testimonials' && activeSettingsTab !== 'database' && (
          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '8px' }}
            >
              <Save size={18} /> Simpan Seluruh Pengaturan
            </button>
          </div>
        )}
      </form>

      {/* Database & Supabase Integration Section */}
      {activeSettingsTab === 'database' && (
        <DatabaseSettingsTab showToast={showToast} />
      )}

      {/* Voucher Diskon Management Section */}
      {activeSettingsTab === 'vouchers' && (
        <VoucherManager showToast={showToast} />
      )}

      {/* Testimoni & Ulasan Moderation Section */}
      {activeSettingsTab === 'testimonials' && (
        <TestimonialManager
          settings={settings}
          testimonials={testimonials}
          invoices={invoices}
          customers={customers}
          showToast={showToast}
        />
      )}

      {/* Google Drive Image & File Picker Modal */}
      {drivePickerState.isOpen && (
        <GoogleDrivePickerModal
          isOpen={drivePickerState.isOpen}
          title={drivePickerState.title}
          filterMimeType="images"
          onClose={() => setDrivePickerState((prev) => ({ ...prev, isOpen: false }))}
          onSelectFile={(file) => {
            if (file.dataUrl) {
              handleSelectFromDrive(file.dataUrl, file.name);
            } else if (file.directViewUrl || file.viewUrl) {
              handleSelectFromDrive(file.directViewUrl || file.viewUrl, file.name);
            }
          }}
          onSelectImage={(dataUrl) => {
            handleSelectFromDrive(dataUrl);
          }}
        />
      )}
    </div>
  );
};
