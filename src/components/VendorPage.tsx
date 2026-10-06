import React, { useState } from 'react';
import { Vendor } from '../types';
import { saveDocument, deleteDocument } from '../firebaseService';
import { openWhatsApp } from '../utils/whatsapp';
import { Factory, Search, MoreVertical, Edit3, Trash2, Plus, Save, MessageSquare, Mail, X } from 'lucide-react';
import { SortableHeader } from './SortableHeader';
import { getVendorCode } from '../utils/idGenerator';

interface VendorPageProps {
  vendors: Vendor[];
  showToast: (msg: string, isErr?: boolean) => void;
}

export const VendorPage: React.FC<VendorPageProps> = ({ vendors, showToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [wa, setWa] = useState('');
  const [kategori, setKategori] = useState('');
  const [alamat, setAlamat] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>('nama');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return showToast('Nama Vendor wajib diisi', true);

    const isEdit = editingIndex !== null;
    const existing = isEdit ? vendors[editingIndex] : null;
    const id = existing ? existing.id : String(Date.now());
    const code = existing?.code || getVendorCode({ id }, vendors.length + 1);

    const data: Vendor = {
      id,
      code,
      nama: nama.trim(),
      email: email.trim(),
      wa: wa.trim(),
      kategori: kategori.trim(),
      alamat: alamat.trim()
    };

    await saveDocument('vendor', data);
    showToast('Data Vendor Berhasil Disimpan!');
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingIndex(null);
    setNama('');
    setEmail('');
    setWa('');
    setKategori('');
    setAlamat('');
  };

  const handleEdit = (index: number) => {
    const v = vendors[index];
    setEditingIndex(index);
    setNama(v.nama);
    setEmail(v.email || '');
    setWa(v.wa || '');
    setKategori(v.kategori || '');
    setAlamat(v.alamat || '');
    setShowModal(true);
  };

  const handleDelete = async (v: Vendor) => {
    if (confirm(`Hapus vendor ${v.nama}?`)) {
      await deleteDocument('vendor', v.id);
      showToast('Vendor Dihapus!');
    }
  };

  const filteredVendors = vendors.filter((v, idx) => {
    const code = getVendorCode(v, idx + 1);
    const term = searchTerm.toLowerCase();
    return (
      v.nama.toLowerCase().includes(term) ||
      code.toLowerCase().includes(term) ||
      (v.wa || '').includes(term) ||
      (v.kategori || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof Vendor] || '';
    let bVal: any = b[sortKey as keyof Vendor] || '';

    return sortOrder === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Header with Title, Add Button, and Search */}
      <div className="card-title" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Database Vendor & Suplier Offsite</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari Vendor / Layanan..."
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
              <Plus size={15} /> Tambah Vendor Baru
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Vendor Table */}
      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="Kode Vendor" sortKey="code" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Nama Vendor" sortKey="nama" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Kontak WA" sortKey="wa" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Kategori Jasa" sortKey="kategori" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Alamat Workshop" sortKey="alamat" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Tidak ada vendor yang cocok dengan pencarian.' : 'Belum ada data vendor atau suplier.'}
                </td>
              </tr>
            ) : (
              filteredVendors.map((v) => {
                const actualIndex = vendors.findIndex((item) => item.id === v.id);
                return (
                  <tr key={v.id} style={{ position: 'relative', zIndex: activeDropId === v.id ? 100 : 'auto' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(0, 82, 255, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {getVendorCode(v, actualIndex + 1)}
                      </span>
                    </td>
                    <td className="col-truncate-md">
                      <strong style={{ color: 'var(--text-main)' }}>{v.nama}</strong>
                      {v.email && (
                        <div style={{ fontSize: '11px', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <Mail size={11} /> {v.email}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {v.wa ? (
                        <a
                          href={`https://wa.me/${v.wa.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#10B981', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MessageSquare size={13} /> {v.wa}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {v.kategori ? (
                        <span style={{ background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', border: '1px solid var(--border-color)' }}>
                          {v.kategori}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="col-truncate-lg" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.alamat || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="dropdown">
                        <button
                          className="btn-kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropId(activeDropId === v.id ? null : v.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeDropId === v.id && (
                          <div className="dropdown-content show">
                            {v.wa && (
                              <button
                                onClick={() => {
                                  setActiveDropId(null);
                                  const rawMsg = `Halo *${v.nama}*,\nIzin follow up mengenai pekerjaan cetak vendor.`;
                                  openWhatsApp(v.wa, rawMsg);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 700 }}
                              >
                                <MessageSquare size={14} color="#10B981" /> Chat / Follow Up WA
                              </button>
                            )}
                            <button onClick={() => { setActiveDropId(null); handleEdit(actualIndex); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit3 size={14} /> Edit Vendor
                            </button>
                            <button onClick={() => { setActiveDropId(null); handleDelete(v); }} style={{ color: 'var(--danger)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

      {/* Modal Add / Edit Vendor */}
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
                {editingIndex !== null ? 'Edit Data Vendor' : 'Tambah Vendor / Suplier Baru'}
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
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Nama Vendor / Rekanan <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  placeholder="Contoh: PT Sublim Prima Mandiri / Toko Akrilik Jaya"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={wa}
                    onChange={(e) => setWa(e.target.value)}
                    placeholder="08123456789"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Email Vendor (untuk PO Otomatis)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@gmail.com"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Kategori Jasa / Spesialisasi</label>
                <input
                  type="text"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  placeholder="Sublim / Laser Akrilik / Kertas"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Alamat Workshop / Kantor (Opsional)</label>
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={2}
                  placeholder="Jl. Percetakan No. 10..."
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
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
                  <Save size={16} /> Simpan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
