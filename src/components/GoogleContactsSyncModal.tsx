import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Search,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Check,
  Phone,
  Mail,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Customer } from '../types';
import {
  GoogleContact,
  GoogleAccountProfile,
  fetchAllGoogleContacts,
  createGoogleContact,
  getGoogleProfile,
  normalizePhone
} from '../services/googleContactsService';
import { getGoogleAccessToken, requestGoogleAccessToken } from '../lib/googleWorkspace';
import { saveDocument } from '../firebaseService';
import { getCustomerCode } from '../utils/idGenerator';

interface GoogleContactsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  showToast: (msg: string, isErr?: boolean) => void;
  initialTab?: 'import' | 'export';
}

export const GoogleContactsSyncModal: React.FC<GoogleContactsSyncModalProps> = ({
  isOpen,
  onClose,
  customers,
  showToast,
  initialTab = 'import'
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [googleProfile, setGoogleProfile] = useState<GoogleAccountProfile | null>(null);
  const [googleContacts, setGoogleContacts] = useState<GoogleContact[]>([]);
  const [hasLoadedContacts, setHasLoadedContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new' | 'existing'>('new');
  
  // Selection states for Import
  const [selectedContactNames, setSelectedContactNames] = useState<Set<string>>(new Set());

  // Selection states for Export
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // Export Confirmation Dialog State (Mandatory Google Workspace rule)
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentName: '' });

  // Import Progress State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      checkAuthAndLoad();
    }
  }, [isOpen, initialTab]);

  const checkAuthAndLoad = async () => {
    const token = getGoogleAccessToken();
    if (token) {
      try {
        const profile = await getGoogleProfile(token);
        setGoogleProfile(profile);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    try {
      const token = await requestGoogleAccessToken('ctrlprint.order@gmail.com');
      if (token) {
        const profile = await getGoogleProfile(token);
        setGoogleProfile(profile);
        showToast('Berhasil terhubung dengan Google Contacts!');
        await loadContacts(token);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungkan Google Contacts', true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async (token?: string) => {
    setIsLoading(true);
    try {
      const contacts = await fetchAllGoogleContacts(token);
      setGoogleContacts(contacts);
      setHasLoadedContacts(true);

      // Auto-select contacts that are new (not yet in CRM)
      const existingPhoneMap = new Set(
        customers.map((c) => normalizePhone(c.wa)).filter(Boolean)
      );
      const existingNameMap = new Set(
        customers.map((c) => c.nama.trim().toLowerCase())
      );

      const newKeys = new Set<string>();
      contacts.forEach((g) => {
        const pNorm = normalizePhone(g.wa);
        const isMatched =
          (pNorm && existingPhoneMap.has(pNorm)) ||
          existingNameMap.has(g.nama.trim().toLowerCase());
        if (!isMatched) {
          newKeys.add(g.resourceName || g.nama);
        }
      });
      setSelectedContactNames(newKeys);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat kontak dari Google', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-calculate matching status for import list
  const existingPhoneSet = useMemo(() => {
    return new Set(customers.map((c) => normalizePhone(c.wa)).filter(Boolean));
  }, [customers]);

  const existingNameSet = useMemo(() => {
    return new Set(customers.map((c) => c.nama.trim().toLowerCase()));
  }, [customers]);

  const processedImportContacts = useMemo(() => {
    return googleContacts.map((c) => {
      const pNorm = normalizePhone(c.wa);
      const matchedByPhone = pNorm && existingPhoneSet.has(pNorm);
      const matchedByName = existingNameSet.has(c.nama.trim().toLowerCase());
      const isAlreadyInCRM = Boolean(matchedByPhone || matchedByName);

      let matchedCustomer = null;
      if (matchedByPhone) {
        matchedCustomer = customers.find((cust) => normalizePhone(cust.wa) === pNorm);
      } else if (matchedByName) {
        matchedCustomer = customers.find((cust) => cust.nama.trim().toLowerCase() === c.nama.trim().toLowerCase());
      }

      return {
        ...c,
        isAlreadyInCRM,
        matchedCustomer
      };
    });
  }, [googleContacts, existingPhoneSet, existingNameSet, customers]);

  const filteredImportContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return processedImportContacts.filter((c) => {
      const matchSearch =
        !q ||
        c.nama.toLowerCase().includes(q) ||
        c.wa.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.alamat.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterType === 'new') return !c.isAlreadyInCRM;
      if (filterType === 'existing') return c.isAlreadyInCRM;
      return true;
    });
  }, [processedImportContacts, searchQuery, filterType]);

  const countNewContacts = useMemo(() => {
    return processedImportContacts.filter((c) => !c.isAlreadyInCRM).length;
  }, [processedImportContacts]);

  const countExistingContacts = useMemo(() => {
    return processedImportContacts.filter((c) => c.isAlreadyInCRM).length;
  }, [processedImportContacts]);

  // Export List preparation: Customers not yet in Google Contacts
  const processedExportCustomers = useMemo(() => {
    const googlePhoneSet = new Set(googleContacts.map((g) => normalizePhone(g.wa)).filter(Boolean));
    const googleNameSet = new Set(googleContacts.map((g) => g.nama.trim().toLowerCase()));

    return customers.map((c) => {
      const pNorm = normalizePhone(c.wa);
      const alreadyInGoogle =
        (pNorm && googlePhoneSet.has(pNorm)) ||
        googleNameSet.has(c.nama.trim().toLowerCase()) ||
        Boolean(c.googleSyncedAt);

      return {
        ...c,
        alreadyInGoogle
      };
    });
  }, [customers, googleContacts]);

  const filteredExportCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return processedExportCustomers.filter((c) => {
      if (!q) return true;
      return (
        c.nama.toLowerCase().includes(q) ||
        (c.wa || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.alamat || '').toLowerCase().includes(q)
      );
    });
  }, [processedExportCustomers, searchQuery]);

  // Handle Select All for Import
  const handleToggleSelectAllImport = () => {
    if (selectedContactNames.size === filteredImportContacts.length) {
      setSelectedContactNames(new Set());
    } else {
      const next = new Set<string>();
      filteredImportContacts.forEach((c) => next.add(c.resourceName || c.nama));
      setSelectedContactNames(next);
    }
  };

  const handleSelectOnlyNewImport = () => {
    const next = new Set<string>();
    processedImportContacts.forEach((c) => {
      if (!c.isAlreadyInCRM) {
        next.add(c.resourceName || c.nama);
      }
    });
    setSelectedContactNames(next);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    const toImport = processedImportContacts.filter((c) =>
      selectedContactNames.has(c.resourceName || c.nama)
    );

    if (toImport.length === 0) {
      return showToast('Pilih setidaknya 1 kontak untuk diimpor', true);
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: toImport.length });

    let successCount = 0;
    let baseCount = customers.length;

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i];
      setImportProgress({ current: i + 1, total: toImport.length });

      try {
        const id = String(Date.now() + Math.floor(Math.random() * 10000) + i);
        const code = getCustomerCode({ id }, baseCount + i + 1);

        const newCustomer: Customer = {
          id,
          code,
          nama: item.nama.trim(),
          wa: item.wa ? item.wa.trim() : '',
          email: item.email ? item.email.trim() : '',
          alamat: item.alamat ? item.alamat.trim() : (item.perusahaan ? `Perusahaan: ${item.perusahaan}` : ''),
          googleSyncedAt: new Date().toISOString(),
          googleResourceName: item.resourceName
        };

        await saveDocument('customer', newCustomer);
        successCount++;
      } catch (err) {
        console.error('Failed importing contact:', item.nama, err);
      }

      // Small tick
      if (i % 5 === 0) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    setIsImporting(false);
    showToast(`Berhasil mengimpor ${successCount} kontak ke Database Pelanggan!`);
    onClose();
  };

  // Handle Export Selection
  const handleToggleSelectAllExport = () => {
    if (selectedCustomerIds.size === filteredExportCustomers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      const next = new Set<string>();
      filteredExportCustomers.forEach((c) => next.add(c.id));
      setSelectedCustomerIds(next);
    }
  };

  const handleSelectOnlyUnsyncedExport = () => {
    const next = new Set<string>();
    processedExportCustomers.forEach((c) => {
      if (!c.alreadyInGoogle) {
        next.add(c.id);
      }
    });
    setSelectedCustomerIds(next);
  };

  // Prompt confirmation for Export (Required by Google Workspace safety guidelines)
  const handleOpenExportConfirm = () => {
    const toExport = customers.filter((c) => selectedCustomerIds.has(c.id));
    if (toExport.length === 0) {
      return showToast('Pilih setidaknya 1 pelanggan untuk diekspor', true);
    }
    setShowExportConfirm(true);
  };

  // Execute Export to Google Contacts
  const handleConfirmAndExecuteExport = async () => {
    const toExport = customers.filter((c) => selectedCustomerIds.has(c.id));
    if (toExport.length === 0) return;

    setShowExportConfirm(false);
    setIsExporting(true);
    setExportProgress({ current: 0, total: toExport.length, currentName: '' });

    try {
      const token = await requestGoogleAccessToken('ctrlprint.order@gmail.com');
      if (!token) {
        showToast('Tidak ada akses ke akun Google', true);
        setIsExporting(false);
        return;
      }

      let successCount = 0;
      let errCount = 0;

      for (let i = 0; i < toExport.length; i++) {
        const cust = toExport[i];
        setExportProgress({
          current: i + 1,
          total: toExport.length,
          currentName: cust.nama
        });

        try {
          const res = await createGoogleContact(cust, token);
          // Update customer record in Firestore to mark synced
          await saveDocument('customer', {
            ...cust,
            googleSyncedAt: new Date().toISOString(),
            googleResourceName: res.resourceName
          });
          successCount++;
        } catch (e: any) {
          console.error('Export error for', cust.nama, e);
          errCount++;
        }

        // Slight throttle
        await new Promise((r) => setTimeout(r, 180));
      }

      showToast(`Selesai: ${successCount} pelanggan berhasil disimpan ke Google Contacts!`);
      // Reload google contacts list to reflect new data
      await loadContacts(token);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor kontak', true);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const connectedEmail = googleProfile?.email || 'ctrlprint.order@gmail.com';
  const hasToken = !!getGoogleAccessToken();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: 'min(880px, 96vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Sinkronisasi Google Contacts
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Akun:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{connectedEmail}</span>
                {hasToken ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10B981', fontWeight: 700, fontSize: '11px' }}>
                    <CheckCircle2 size={12} /> Terhubung
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#F59E0B', fontWeight: 700, fontSize: '11px' }}>
                    <AlertCircle size={12} /> Perlu Verifikasi
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleConnectGoogle}
              disabled={isLoading}
              style={{ fontSize: '12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              {hasToken ? 'Refresh Akses' : 'Hubungkan Akun'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
            padding: '0 16px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'import' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'import' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'import' ? 800 : 600,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={16} />
            Tarik Kontak dari Google
            {hasLoadedContacts && (
              <span
                style={{
                  background: activeTab === 'import' ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                  color: activeTab === 'import' ? '#fff' : 'inherit',
                  fontSize: '11px',
                  padding: '1px 7px',
                  borderRadius: '10px'
                }}
              >
                {googleContacts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'export' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'export' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'export' ? 800 : 600,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Upload size={16} />
            Kirim Pelanggan ke Google Contacts
            <span
              style={{
                background: activeTab === 'export' ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                color: activeTab === 'export' ? '#fff' : 'inherit',
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '10px'
              }}
            >
              {customers.length}
            </span>
          </button>
        </div>

        {/* Tab 1: IMPORT FROM GOOGLE */}
        {activeTab === 'import' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Cari nama, WA, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px', borderRadius: '8px', width: '100%' }}
                  />
                </div>

                {hasLoadedContacts && (
                  <div style={{ display: 'flex', background: 'var(--bg-subtle, #f1f5f9)', borderRadius: '8px', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setFilterType('new')}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: filterType === 'new' ? 700 : 500,
                        background: filterType === 'new' ? '#fff' : 'transparent',
                        color: filterType === 'new' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        boxShadow: filterType === 'new' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Kontak Baru ({countNewContacts})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: filterType === 'all' ? 700 : 500,
                        background: filterType === 'all' ? '#fff' : 'transparent',
                        color: filterType === 'all' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        boxShadow: filterType === 'all' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Semua ({googleContacts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('existing')}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: filterType === 'existing' ? 700 : 500,
                        background: filterType === 'existing' ? '#fff' : 'transparent',
                        color: filterType === 'existing' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        boxShadow: filterType === 'existing' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Sudah Ada ({countExistingContacts})
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!hasLoadedContacts ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => loadContacts()}
                    disabled={isLoading}
                    style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Download size={14} />
                    {isLoading ? 'Mengambil Data...' : 'Muat Kontak Google'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleSelectOnlyNewImport}
                      style={{ height: '34px', fontSize: '12px' }}
                    >
                      Pilih Semua Baru
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => loadContacts()}
                      disabled={isLoading}
                      title="Perbarui daftar kontak Google"
                      style={{ height: '34px', padding: '0 8px' }}
                    >
                      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* List / Table */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', padding: '0' }}>
              {!hasLoadedContacts ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <Users size={44} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <h4 style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Tarik Data Kontak dari Google
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: '13px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Hubungkan dan muat buku kontak akun <strong>{connectedEmail}</strong> untuk mengimpor data pelanggan baru ke sistem CTRL PRINT.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => loadContacts()}
                    disabled={isLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                  >
                    <Download size={16} />
                    {isLoading ? 'Sedang Memuat...' : 'Mulai Muat Kontak'}
                  </button>
                </div>
              ) : filteredImportContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ margin: 0, fontSize: '13.5px' }}>
                    {searchQuery
                      ? 'Tidak ada kontak yang sesuai kata kunci pencarian.'
                      : filterType === 'new'
                      ? 'Semua kontak Google sudah terdaftar di database CTRL PRINT.'
                      : 'Tidak ada kontak ditemukan di Google Contacts.'}
                  </p>
                </div>
              ) : (
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle, #f8fafc)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredImportContacts.length > 0 &&
                            filteredImportContacts.every((c) =>
                              selectedContactNames.has(c.resourceName || c.nama)
                            )
                          }
                          onChange={handleToggleSelectAllImport}
                        />
                      </th>
                      <th>Nama Kontak</th>
                      <th>Nomor WhatsApp</th>
                      <th>Email</th>
                      <th>Alamat / Catatan</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredImportContacts.map((c) => {
                      const key = c.resourceName || c.nama;
                      const isChecked = selectedContactNames.has(key);

                      return (
                        <tr
                          key={key}
                          style={{
                            background: isChecked ? 'rgba(0, 82, 255, 0.03)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const next = new Set(selectedContactNames);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            setSelectedContactNames(next);
                          }}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedContactNames);
                                if (e.target.checked) next.add(key);
                                else next.delete(key);
                                setSelectedContactNames(next);
                              }}
                            />
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-main)' }}>{c.nama}</strong>
                            {c.perusahaan && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.perusahaan}</div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>
                            {c.wa ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10B981', fontWeight: 600 }}>
                                <Phone size={12} /> {c.wa}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>
                            {c.email ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                <Mail size={12} /> {c.email}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="col-truncate-md" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {c.alamat || '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {c.isAlreadyInCRM ? (
                              <span
                                style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#059669',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={`Cocok dengan kode: ${c.matchedCustomer?.code || c.matchedCustomer?.nama}`}
                              >
                                <Check size={11} /> Sudah Ada
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: 'rgba(0, 82, 255, 0.1)',
                                  color: 'var(--primary)',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                Kontak Baru
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Import Actions */}
            {hasLoadedContacts && (
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-card)'
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Terpilih: <strong>{selectedContactNames.size}</strong> kontak
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button type="button" className="btn btn-outline" onClick={onClose} disabled={isImporting}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleExecuteImport}
                    disabled={isImporting || selectedContactNames.size === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Download size={15} />
                    {isImporting
                      ? `Mengimpor (${importProgress.current}/${importProgress.total})...`
                      : `Impor ${selectedContactNames.size} Kontak ke Database`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: EXPORT TO GOOGLE CONTACTS */}
        {activeTab === 'export' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Cari pelanggan CTRL PRINT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px', borderRadius: '8px', width: '100%' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleSelectOnlyUnsyncedExport}
                  style={{ height: '34px', fontSize: '12px' }}
                >
                  Pilih yang Belum Disinkron
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenExportConfirm}
                  disabled={selectedCustomerIds.size === 0 || isExporting}
                  style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Upload size={14} />
                  Kirim ke Google ({selectedCustomerIds.size})
                </button>
              </div>
            </div>

            {/* Customers table */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', padding: '0' }}>
              {filteredExportCustomers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  Tidak ada data pelanggan yang cocok.
                </div>
              ) : (
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle, #f8fafc)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredExportCustomers.length > 0 &&
                            filteredExportCustomers.every((c) => selectedCustomerIds.has(c.id))
                          }
                          onChange={handleToggleSelectAllExport}
                        />
                      </th>
                      <th>Kode</th>
                      <th>Nama Pelanggan</th>
                      <th>Kontak WA</th>
                      <th>Email</th>
                      <th>Alamat</th>
                      <th style={{ textAlign: 'right', width: '140px' }}>Status Sinkron</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExportCustomers.map((c) => {
                      const isChecked = selectedCustomerIds.has(c.id);

                      return (
                        <tr
                          key={c.id}
                          style={{
                            background: isChecked ? 'rgba(0, 82, 255, 0.03)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const next = new Set(selectedCustomerIds);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            setSelectedCustomerIds(next);
                          }}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedCustomerIds);
                                if (e.target.checked) next.add(c.id);
                                else next.delete(c.id);
                                setSelectedCustomerIds(next);
                              }}
                            />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(0, 82, 255, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                              {c.code || '-'}
                            </span>
                          </td>
                          <td><strong style={{ color: 'var(--text-main)' }}>{c.nama}</strong></td>
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            {c.wa ? (
                              <span style={{ color: '#10B981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} /> {c.wa}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{c.email || '-'}</td>
                          <td className="col-truncate-md" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {c.alamat || '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {c.alreadyInGoogle ? (
                              <span
                                style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#059669',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={11} /> Tersinkron
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: 'rgba(100, 116, 139, 0.1)',
                                  color: 'var(--text-muted)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                Belum di Google
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Export Actions */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)'
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Terpilih: <strong>{selectedCustomerIds.size}</strong> pelanggan untuk disimpan ke Google Contacts
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={isExporting}>
                  Tutup
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenExportConfirm}
                  disabled={selectedCustomerIds.size === 0 || isExporting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Upload size={15} />
                  {isExporting
                    ? `Menyinkronkan (${exportProgress.current}/${exportProgress.total})...`
                    : `Simpan ${selectedCustomerIds.size} ke Google Contacts`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR WORKSPACE MUTATION */}
      {showExportConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
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
              maxWidth: '480px',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(0, 82, 255, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Upload size={22} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>
                  Konfirmasi Sinkronisasi Google Contacts
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Aplikasi akan menambahkan <strong>{selectedCustomerIds.size} data pelanggan</strong> dari database CTRL PRINT ke kontak Google pada akun <strong>{connectedEmail}</strong>.
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12.5px',
                color: 'var(--text-muted)'
              }}
            >
              Data nama, nomor WhatsApp, email, dan alamat akan disimpan ke Google Contacts sehingga dapat diakses langsung melalui Gmail dan smartphone Anda.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowExportConfirm(false)}
                disabled={isExporting}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAndExecuteExport}
                disabled={isExporting}
                style={{ fontWeight: 700 }}
              >
                {isExporting ? 'Memproses...' : 'Ya, Sinkronkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
