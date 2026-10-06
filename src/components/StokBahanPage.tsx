import React, { useState } from 'react';
import { Bahan } from '../types';
import { saveDocument, deleteDocument } from '../firebaseService';
import { Layers, PackagePlus, Edit3, Trash2, Plus, Save, MoreVertical, AlertTriangle, Search, X } from 'lucide-react';
import { SortableHeader } from './SortableHeader';

interface StokBahanPageProps {
  bahans: Bahan[];
  showToast: (msg: string, isErr?: boolean) => void;
}

export const StokBahanPage: React.FC<StokBahanPageProps> = ({ bahans, showToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [satuan, setSatuan] = useState('');
  const [jumlah, setJumlah] = useState<number>(0);
  const [min, setMin] = useState<number>(0);
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

  const filteredBahans = bahans.filter((b) => {
    const term = searchTerm.toLowerCase();
    return b.nama.toLowerCase().includes(term) || (b.satuan || '').toLowerCase().includes(term);
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof Bahan] || '';
    let bVal: any = b[sortKey as keyof Bahan] || '';

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

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
    if (!nama.trim()) return showToast('Nama bahan wajib diisi', true);

    const id = editingIndex !== null ? bahans[editingIndex].id : String(Date.now());
    const data: Bahan = { id, nama: nama.trim(), satuan: satuan.trim() || 'Pcs', jumlah, min };

    await saveDocument('bahan_baku', data);
    showToast('Bahan Baku Berhasil Disimpan!');
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingIndex(null);
    setNama('');
    setSatuan('');
    setJumlah(0);
    setMin(0);
  };

  const handleEdit = (index: number) => {
    const b = bahans[index];
    setEditingIndex(index);
    setNama(b.nama);
    setSatuan(b.satuan);
    setJumlah(b.jumlah);
    setMin(b.min);
    setShowModal(true);
  };

  const handleDelete = async (b: Bahan) => {
    if (confirm(`Hapus bahan baku ${b.nama}?`)) {
      await deleteDocument('bahan_baku', b.id);
      showToast('Bahan Baku Dihapus!');
    }
  };

  const handleQuickAdd = async (b: Bahan) => {
    const promptVal = prompt(`Tambah Stok Cepat untuk ${b.nama}:`, '10');
    if (promptVal) {
      const added = parseFloat(promptVal) || 0;
      if (added > 0) {
        await saveDocument('bahan_baku', { ...b, jumlah: b.jumlah + added });
        showToast(`Stok ${b.nama} bertambah +${added}`);
      }
    }
  };

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Header with Title, Add Button, and Search */}
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Master Stok Bahan Baku</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <Plus size={16} /> Tambah Bahan Baru
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Cari Bahan Baku..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '30px', width: '100%' }}
          />
        </div>
      </div>

      {/* Full-width Bahan Baku Table */}
      <div className="table-responsive" style={{ overflow: 'visible' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="Nama Bahan" sortKey="nama" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Stok Tersedia" sortKey="jumlah" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Satuan" sortKey="satuan" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Min. Alert" sortKey="min" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th>Status Stok</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredBahans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Tidak ada bahan baku yang cocok dengan pencarian.' : 'Belum ada data bahan baku.'}
                </td>
              </tr>
            ) : (
              filteredBahans.map((b) => {
                const actualIndex = bahans.findIndex((item) => item.id === b.id);
                const low = b.jumlah <= b.min;
                return (
                  <tr key={b.id} style={{ position: 'relative', zIndex: activeDropId === b.id ? 100 : 'auto' }}>
                    <td><strong style={{ color: 'var(--text-main)' }}>{b.nama}</strong></td>
                    <td style={{ fontWeight: 800, fontSize: '13.5px', color: low ? 'var(--danger)' : 'var(--text-main)' }}>
                      {b.jumlah}
                    </td>
                    <td><span style={{ background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', border: '1px solid var(--border-color)' }}>{b.satuan}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.min}</td>
                    <td>
                      {low ? (
                        <span className="badge badge-unpaid" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> Stok Menipis
                        </span>
                      ) : (
                        <span className="badge badge-paid">Stok Aman</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="dropdown">
                        <button
                          className="btn-kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropId(activeDropId === b.id ? null : b.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeDropId === b.id && (
                          <div className="dropdown-content show">
                            <button onClick={() => { setActiveDropId(null); handleQuickAdd(b); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <PackagePlus size={14} /> Restok Cepat
                            </button>
                            <button onClick={() => { setActiveDropId(null); handleEdit(actualIndex); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit3 size={14} /> Edit Data
                            </button>
                            <button onClick={() => { setActiveDropId(null); handleDelete(b); }} style={{ color: 'var(--danger)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

      {/* Modal Add / Edit Bahan */}
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
              maxWidth: 'min(500px, 96vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingIndex !== null ? <Edit3 size={18} /> : <Plus size={18} />}
                {editingIndex !== null ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
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
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Nama Bahan Baku <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  placeholder="Contoh: Art Paper 260gr / Vinyl Glossy / Spanduk 280gr"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Satuan</label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    required
                    placeholder="Lembar / m² / Roll / Pcs"
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Stok Awal / Fisik</label>
                  <input
                    type="number"
                    value={jumlah}
                    onChange={(e) => setJumlah(parseFloat(e.target.value) || 0)}
                    required
                    step="any"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Batas Minimum Peringatan (Alert)</label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(parseFloat(e.target.value) || 0)}
                  required
                  placeholder="Contoh: 50"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Jika stok di bawah angka ini, sistem akan memberikan tanda peringatan Stok Menipis.
                </span>
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
                  <Save size={16} /> Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
