import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  History,
  MoreVertical,
  X,
  Save,
  MessageSquare,
  Download,
  Upload,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { Customer, Invoice } from '../types';
import { saveDocument, deleteDocument } from '../firebaseService';
import { SortableHeader } from './SortableHeader';
import { getCustomerCode } from '../utils/idGenerator';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';
import { GoogleContactsSyncModal } from './GoogleContactsSyncModal';
import { createGoogleContact } from '../services/googleContactsService';
import { getGoogleAccessToken, requestGoogleAccessToken } from '../lib/googleWorkspace';

interface CustomerPageProps {
  customers: Customer[];
  invoices: Invoice[];
  showToast: (msg: string, isErr?: boolean) => void;
}

export const CustomerPage: React.FC<CustomerPageProps> = ({ customers, invoices, showToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [syncToGoogle, setSyncToGoogle] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>('nama');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Google Contacts Sync modal state
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [googleSyncInitialTab, setGoogleSyncInitialTab] = useState<'import' | 'export'>('import');

  // Single Customer Export confirmation state
  const [customerToExport, setCustomerToExport] = useState<Customer | null>(null);
  const [isExportingSingle, setIsExportingSingle] = useState(false);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setActiveDropId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [historyCustName, setHistoryCustName] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return showToast('Nama Pelanggan wajib diisi', true);

    const isEdit = editingIndex !== null;
    const existing = isEdit ? customers[editingIndex] : null;
    const id = existing ? existing.id : String(Date.now());
    const code = existing?.code || getCustomerCode({ id }, customers.length + 1);

    const data: Customer = {
      id,
      code,
      nama: nama.trim(),
      wa: wa.trim(),
      email: email.trim(),
      alamat: alamat.trim(),
      googleSyncedAt: existing?.googleSyncedAt,
      googleResourceName: existing?.googleResourceName
    };

    // If user asked to sync to Google Contacts upon save
    if (syncToGoogle) {
      try {
        const token = await requestGoogleAccessToken('ctrlprint.order@gmail.com');
        if (token) {
          const res = await createGoogleContact(data, token);
          data.googleSyncedAt = new Date().toISOString();
          data.googleResourceName = res.resourceName;
          showToast('Data pelanggan dan kontak Google berhasil disimpan!');
        }
      } catch (err: any) {
        console.warn('Google contact creation warning:', err);
        showToast('Data disimpan di sistem (gagal sync Google: ' + (err.message || 'error') + ')', true);
      }
    } else {
      showToast('Data Pelanggan Berhasil Disimpan!');
    }

    await saveDocument('customer', data);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingIndex(null);
    setNama('');
    setWa('');
    setEmail('');
    setAlamat('');
    setSyncToGoogle(false);
  };

  const handleEdit = (index: number) => {
    const c = customers[index];
    setEditingIndex(index);
    setNama(c.nama);
    setWa(c.wa || '');
    setEmail(c.email || '');
    setAlamat(c.alamat || '');
    setSyncToGoogle(false);
    setShowModal(true);
  };

  const handleDelete = async (c: Customer) => {
    if (confirm(`Hapus pelanggan ${c.nama}?`)) {
      await deleteDocument('customer', c.id);
      showToast('Pelanggan Dihapus!');
    }
  };

  // Handle single customer export to Google Contacts with confirmation
  const handleConfirmSingleExport = async () => {
    if (!customerToExport) return;
    setIsExportingSingle(true);
    try {
      const token = await requestGoogleAccessToken('ctrlprint.order@gmail.com');
      if (!token) {
        showToast('Akses Google tidak tersedia', true);
        setIsExportingSingle(false);
        return;
      }

      const res = await createGoogleContact(customerToExport, token);
      await saveDocument('customer', {
        ...customerToExport,
        googleSyncedAt: new Date().toISOString(),
        googleResourceName: res.resourceName
      });
      showToast(`Kontak "${customerToExport.nama}" berhasil disimpan ke Google Contacts!`);
      setCustomerToExport(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan kontak ke Google', true);
    } finally {
      setIsExportingSingle(false);
    }
  };

  const filteredCustomers = customers.filter((c, idx) => {
    const code = getCustomerCode(c, idx + 1);
    const term = searchTerm.toLowerCase();
    return (
      c.nama.toLowerCase().includes(term) ||
      code.toLowerCase().includes(term) ||
      (c.wa || '').includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.alamat || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof Customer] || '';
    let bVal: any = b[sortKey as keyof Customer] || '';

    return sortOrder === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const custOrders = historyCustName
    ? invoices.filter((x) => x.namaCust.toLowerCase() === historyCustName.toLowerCase())
    : [];

  const syncedCount = customers.filter((c) => Boolean(c.googleSyncedAt)).length;

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Header with Title, Search, and Action Buttons */}
      <div className="card-title" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <span style={{ fontSize: '16px', fontWeight: 800 }}>Database Pelanggan & Klien</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                ({customers.length} kontak)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari Pelanggan / Kontak..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px', width: '100%', height: '38px', borderRadius: '10px' }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, height: '38px', borderRadius: '10px', padding: '0 14px' }}
            >
              <Plus size={15} /> Tambah Pelanggan Baru
            </button>
          </div>
        </div>

        {/* Google Contacts Sync Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '10px 14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                flexShrink: 0
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Google Contacts Sync
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#059669',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontWeight: 700
                  }}
                >
                  ctrlprint.order@gmail.com
                </span>
                {syncedCount > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({syncedCount} pelanggan tersinkron)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Sinkronisasi dua arah dengan buku kontak Google untuk WhatsApp & panggilan HP
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setGoogleSyncInitialTab('import');
                setShowGoogleSyncModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', fontSize: '12.5px', fontWeight: 700 }}
            >
              <Download size={14} /> Tarik Kontak dari Google
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setGoogleSyncInitialTab('export');
                setShowGoogleSyncModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', fontSize: '12.5px', fontWeight: 700 }}
            >
              <Upload size={14} /> Sinkronkan ke Google
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Customer Table */}
      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="ID Pelanggan" sortKey="code" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Nama / Perusahaan" sortKey="nama" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Kontak WA / Email" sortKey="wa" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Alamat Kirim" sortKey="alamat" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ textAlign: 'center', width: '110px' }}>Google Sync</th>
              <th style={{ textAlign: 'right', width: '80px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Tidak ada pelanggan yang cocok dengan pencarian.' : 'Belum ada data pelanggan.'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => {
                const actualIndex = customers.findIndex((item) => item.id === c.id);
                return (
                  <tr key={c.id} style={{ position: 'relative', zIndex: activeDropId === c.id ? 100 : 'auto' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(0, 82, 255, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {getCustomerCode(c, actualIndex + 1)}
                      </span>
                    </td>
                    <td className="col-truncate-md">
                      <strong style={{ color: 'var(--text-main)' }}>{c.nama}</strong>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div>
                        {c.wa ? (
                          <a
                            href={`https://wa.me/${c.wa.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#10B981', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <MessageSquare size={13} /> {c.wa}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                        {c.email && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={11} /> {c.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="col-truncate-lg" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.alamat || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.googleSyncedAt ? (
                        <span
                          title={`Tersinkron dengan kontak Google`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#059669',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          <CheckCircle2 size={12} /> Sync
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="dropdown">
                        <button
                          className="btn-kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropId(activeDropId === c.id ? null : c.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeDropId === c.id && (
                          <div className="dropdown-content show">
                            <button onClick={() => { setActiveDropId(null); setHistoryCustName(c.nama); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <History size={14} /> Riwayat Transaksi
                            </button>
                            <button onClick={() => { setActiveDropId(null); handleEdit(actualIndex); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit3 size={14} /> Edit Data
                            </button>
                            <button
                              onClick={() => {
                                setActiveDropId(null);
                                setCustomerToExport(c);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Upload size={14} /> Simpan ke Google Contacts
                            </button>
                            <button onClick={() => { setActiveDropId(null); handleDelete(c); }} style={{ color: 'var(--danger)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Trash2 size={14} /> Hapus
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

      {/* Modal Add / Edit Customer */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
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
              maxWidth: 'min(520px, 96vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingIndex !== null ? <Edit3 size={18} /> : <Plus size={18} />}
                {editingIndex !== null ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Nama Lengkap / Instansi <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  placeholder="Contoh: Budi Santoso / PT Print Mandiri"
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Nomor WhatsApp</label>
                <input
                  type="text"
                  value={wa}
                  onChange={(e) => setWa(e.target.value)}
                  placeholder="081234567890"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Alamat Email (Opsional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelanggan@perusahaan.com"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Alamat Pengiriman</label>
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={2}
                  placeholder="Jl. Merdeka No. 12..."
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div
                style={{
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  id="syncToGoogleBox"
                  checked={syncToGoogle}
                  onChange={(e) => setSyncToGoogle(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="syncToGoogleBox" style={{ fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', margin: 0, color: 'var(--text-main)' }}>
                  Simpan juga ke kontak Google (ctrlprint.order@gmail.com)
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                  <Save size={16} /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal History Order Pelanggan */}
      {historyCustName && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
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
              maxWidth: 'min(750px, 96vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '16px', fontWeight: 800 }}>Riwayat Transaksi: <span style={{ color: 'var(--primary)' }}>{historyCustName}</span></span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryCustName(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. Nota</th>
                    <th>Rincian Pesanan</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {custOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Belum ada riwayat transaksi nota untuk pelanggan ini.
                      </td>
                    </tr>
                  ) : (
                    custOrders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(o.tglInv)}</td>
                        <td><strong style={{ color: 'var(--primary)' }}>{o.noInv}</strong></td>
                        <td style={{ fontSize: '12px' }}>
                          {o.items.map((it) => `${it.nama} (${it.qty} ${it.satuan})`).join(', ')}
                        </td>
                        <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatRupiah(o.grandTotal || 0)}</td>
                        <td>
                          <span className={`badge badge-${o.statusBayar.toLowerCase()}`}>
                            {o.statusBayar}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE CUSTOMER EXPORT CONFIRMATION DIALOG (Mandatory Google Workspace Rule) */}
      {customerToExport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
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
              maxWidth: '460px',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(0, 82, 255, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Upload size={20} />
              </div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Simpan ke Google Contacts
              </h4>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 16px' }}>
              Anda akan menyimpan data kontak berikut ke Google Contacts pada akun <strong>ctrlprint.order@gmail.com</strong>:
            </p>

            <div
              style={{
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '18px',
                fontSize: '12.5px'
              }}
            >
              <div><strong>Nama:</strong> {customerToExport.nama}</div>
              {customerToExport.wa && <div><strong>WhatsApp:</strong> {customerToExport.wa}</div>}
              {customerToExport.email && <div><strong>Email:</strong> {customerToExport.email}</div>}
              {customerToExport.alamat && <div><strong>Alamat:</strong> {customerToExport.alamat}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCustomerToExport(null)}
                disabled={isExportingSingle}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSingleExport}
                disabled={isExportingSingle}
                style={{ fontWeight: 700 }}
              >
                {isExportingSingle ? 'Menyimpan...' : 'Ya, Simpan ke Google'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Google Contacts Sync Modal */}
      <GoogleContactsSyncModal
        isOpen={showGoogleSyncModal}
        onClose={() => setShowGoogleSyncModal(false)}
        customers={customers}
        showToast={showToast}
        initialTab={googleSyncInitialTab}
      />
    </div>
  );
};
