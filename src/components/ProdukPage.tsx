import React, { useState } from 'react';
import { Produk, Bahan, FinishingGroup } from '../types';
import { saveDocument, deleteDocument, convertToDirectImageUrl } from '../firebaseService';
import { Package, Search, Edit3, Trash2, Plus, Save, MoreVertical, Image as ImageIcon, Link2, Eye, EyeOff, Layers, Scissors } from 'lucide-react';
import { SortableHeader } from './SortableHeader';
import { getProductCode } from '../utils/idGenerator';
import { formatRupiah } from '../utils/currency';
import { FinishingManager } from './FinishingManager';
import { DEFAULT_FINISHING_GROUPS, getApplicableFinishingGroups } from '../data/defaultFinishings';

interface ProdukPageProps {
  products: Produk[];
  bahans: Bahan[];
  finishingGroups?: FinishingGroup[];
  showToast: (msg: string, isErr?: boolean) => void;
}

const CATEGORY_PRESETS = [
  'Digital A3+',
  'Outdoor Banner',
  'Indoor Display',
  'Stiker & Decal',
  'Offset & Sablon',
  'Merchandise & Souvenir',
  'Finishing & Jilid',
  'Lainnya'
];

export const ProdukPage: React.FC<ProdukPageProps> = ({ products, bahans, finishingGroups, showToast }) => {
  const [activeTab, setActiveTab] = useState<'katalog' | 'finishing'>('katalog');
  const allFinishingGroups = finishingGroups && finishingGroups.length > 0 ? finishingGroups : DEFAULT_FINISHING_GROUPS;

  const [editingProduct, setEditingProduct] = useState<Produk | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tipe, setTipe] = useState<'Barang' | 'Jasa'>('Barang');
  const [kategori, setKategori] = useState('Digital A3+');
  const [customKategori, setCustomKategori] = useState('');
  const [nama, setNama] = useState('');
  const [desc, setDesc] = useState('');
  const [satuan, setSatuan] = useState('Pcs');
  const [bahanId, setBahanId] = useState('');
  const [bahanQty, setBahanQty] = useState<number>(0);
  const [hpp, setHpp] = useState<number>(0);
  const [harga, setHarga] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [showInPortal, setShowInPortal] = useState<boolean>(true);
  const [finishingGroupIds, setFinishingGroupIds] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
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
    if (!nama || harga <= 0) {
      return showToast('Isi Nama Produk & Harga Jual > 0', true);
    }

    const finalKategori = kategori === 'CUSTOM' ? (customKategori.trim() || 'Lainnya') : kategori;

    const id = editingProduct ? editingProduct.id : String(Date.now());
    const existing = editingProduct ? editingProduct : {};
    const actualIndex = editingProduct ? products.findIndex((item) => item.id === editingProduct.id) : products.length;
    const sku = (existing as any).sku || (existing as any).code || getProductCode({ id }, (actualIndex >= 0 ? actualIndex : products.length) + 1);

    const data: Produk = {
      ...existing,
      id,
      sku,
      code: sku,
      tipe,
      kategori: finalKategori,
      nama,
      desc,
      satuan: satuan.trim() || 'Pcs',
      bahanId,
      bahanQty,
      hpp,
      harga,
      imageUrl: convertToDirectImageUrl(imageUrl),
      showInPortal,
      finishingGroupIds: finishingGroupIds.length > 0 ? finishingGroupIds : undefined
    };

    await saveDocument('produk', data);
    showToast('Produk Berhasil Disimpan!');
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setTipe('Barang');
    setKategori('Digital A3+');
    setCustomKategori('');
    setNama('');
    setDesc('');
    setSatuan('Pcs');
    setBahanId('');
    setBahanQty(0);
    setHpp(0);
    setHarga(0);
    setImageUrl('');
    setShowInPortal(true);
    setFinishingGroupIds([]);
  };

  const handleEdit = (p: Produk) => {
    setEditingProduct(p);
    setTipe((p.tipe as any) || 'Barang');
    
    const pKat = p.kategori || 'Digital A3+';
    if (CATEGORY_PRESETS.includes(pKat)) {
      setKategori(pKat);
      setCustomKategori('');
    } else {
      setKategori('CUSTOM');
      setCustomKategori(pKat);
    }

    setNama(p.nama);
    setDesc(p.desc || '');
    setSatuan(p.satuan || 'Pcs');
    setBahanId(p.bahanId || '');
    setBahanQty(p.bahanQty || 0);
    setHpp(p.hpp || 0);
    setHarga(p.harga);
    setImageUrl(p.imageUrl || '');
    setShowInPortal(p.showInPortal !== false);
    setFinishingGroupIds(p.finishingGroupIds || []);
    setShowModal(true);
  };

  const handleToggleShowInPortal = async (p: Produk) => {
    const nextVal = p.showInPortal === false ? true : false;
    await saveDocument('produk', { ...p, showInPortal: nextVal });
    showToast(nextVal ? `"${p.nama}" sekarang TAMPIL di Portal Pelanggan` : `"${p.nama}" DISIMPANKAN (Sembunyi) dari Portal Pelanggan`);
  };

  const handleDelete = async (p: Produk) => {
    if (confirm(`Hapus produk ${p.nama}?`)) {
      await deleteDocument('produk', p.id);
      showToast('Produk Dihapus!');
    }
  };

  // Get all unique categories for filter tabs
  const allCategories = ['Semua', ...Array.from(new Set([
    ...CATEGORY_PRESETS,
    ...products.map((p) => p.kategori).filter(Boolean) as string[]
  ]))];

  const filteredProducts = products.filter((p, idx) => {
    const code = getProductCode(p, idx + 1);
    const matchesSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.desc || '').toLowerCase().includes(searchTerm.toLowerCase());
    const pKat = p.kategori || 'Lainnya';
    const matchesKat = filterKategori === 'Semua' || pKat === filterKategori;
    return matchesSearch && matchesKat;
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof Produk] || '';
    let bVal: any = b[sortKey as keyof Produk] || '';

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('katalog')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 800,
            border: activeTab === 'katalog' ? 'none' : '1px solid var(--border-color)',
            background: activeTab === 'katalog' ? 'var(--primary, #2563EB)' : 'var(--bg-main, #F1F5F9)',
            color: activeTab === 'katalog' ? '#FFF' : 'var(--text-main)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={16} />
          <span>Katalog Produk &amp; Layanan ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finishing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 800,
            border: activeTab === 'finishing' ? 'none' : '1px solid var(--border-color)',
            background: activeTab === 'finishing' ? 'var(--primary, #2563EB)' : 'var(--bg-main, #F1F5F9)',
            color: activeTab === 'finishing' ? '#FFF' : 'var(--text-main)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={16} />
          <span>Master Finishing &amp; Add-on ({allFinishingGroups.length} Preset)</span>
        </button>
      </div>

      {activeTab === 'finishing' ? (
        <FinishingManager finishingGroups={allFinishingGroups} showToast={showToast} />
      ) : (
        <>
          {/* Header & Controls */}
          <div className="card-title" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '16px', fontWeight: 800 }}>Katalog Produk & Layanan Cetak</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Cari Nama / Spesifikasi..."
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
                  <Plus size={15} /> Tambah Produk Baru
                </button>
              </div>
            </div>

            {/* Category Filter Pills (Hidden Scrollbar) */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                width: '100%'
              }}
              className="no-scrollbar"
            >
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterKategori(cat)}
                  style={{
                    border: filterKategori === cat ? 'none' : '1px solid var(--border-color)',
                    background: filterKategori === cat ? 'var(--primary)' : 'var(--bg-main)',
                    color: filterKategori === cat ? '#FFF' : 'var(--text-main)',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

      {/* Full-width Product Table */}
      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Foto</th>
              <SortableHeader label="SKU / ID" sortKey="sku" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Kategori" sortKey="kategori" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Nama Produk" sortKey="nama" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Satuan" sortKey="satuan" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th>Spesifikasi</th>
              <th>Portal Web</th>
              <SortableHeader label="Modal HPP" sortKey="hpp" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Harga Jual" sortKey="harga" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const actualIndex = products.findIndex((item) => item.id === p.id);
              const pKat = p.kategori || 'Lainnya';
              const isVisibleInPortal = p.showInPortal !== false;
              return (
                <tr key={p.id} style={{ position: 'relative', zIndex: activeDropId === p.id ? 100 : 'auto' }}>
                  <td>
                    {p.imageUrl ? (
                      <img
                        src={convertToDirectImageUrl(p.imageUrl)}
                        alt={p.nama}
                        referrerPolicy="no-referrer"
                        style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          background: 'var(--bg-main)',
                          border: '1px dashed var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <ImageIcon size={16} />
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {getProductCode(p, (actualIndex >= 0 ? actualIndex : 0) + 1)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '10.5px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {pKat}
                    </span>
                  </td>
                  <td>
                    <strong>{p.nama}</strong>
                    {(() => {
                      const applicable = getApplicableFinishingGroups(p.kategori, p.finishingGroupIds, allFinishingGroups);
                      if (applicable.length > 0) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                background: 'rgba(37, 99, 235, 0.08)',
                                color: '#2563EB',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={applicable.map(a => a.nama).join(', ')}
                            >
                              <Layers size={10} /> {applicable.length} Finishing Tersedia
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                      {p.satuan || 'Pcs'}
                    </span>
                  </td>
                  <td>{p.desc || '-'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleShowInPortal(p)}
                      title="Klik untuk tampilkan / sembunyikan dari Portal Pelanggan"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: isVisibleInPortal ? '1px solid #10B981' : '1px solid #94A3B8',
                        background: isVisibleInPortal ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-main)',
                        color: isVisibleInPortal ? '#047857' : 'var(--text-muted)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isVisibleInPortal ? <Eye size={12} /> : <EyeOff size={12} />}
                      {isVisibleInPortal ? 'Tampil' : 'Sembunyi'}
                    </button>
                  </td>
                  <td>{formatRupiah(p.hpp)}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    {formatRupiah(p.harga)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="dropdown">
                      <button
                        className="btn-kebab"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropId(activeDropId === p.id ? null : p.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeDropId === p.id && (
                        <div className="dropdown-content show">
                          <button onClick={() => { setActiveDropId(null); handleEdit(p); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Edit3 size={14} /> Edit Produk
                          </button>
                          <button onClick={() => { setActiveDropId(null); handleToggleShowInPortal(p); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isVisibleInPortal ? <EyeOff size={14} /> : <Eye size={14} />} {isVisibleInPortal ? 'Sembunyikan di Portal' : 'Tampilkan di Portal'}
                          </button>
                          <button onClick={() => { setActiveDropId(null); handleDelete(p); }} style={{ color: 'var(--danger)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={14} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* MODAL POPUP: TAMBAH / EDIT PRODUK */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingProduct ? <Edit3 size={20} /> : <Plus size={20} />}
                {editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                style={{ padding: '4px 10px' }}
              >
                ✕ Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Tipe Produk</label>
                  <select value={tipe} onChange={(e) => setTipe(e.target.value as any)}>
                    <option value="Barang">Barang / Cetakan</option>
                    <option value="Jasa">Jasa / Layanan</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Kategori</label>
                  <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="CUSTOM">+ Custom Baru...</option>
                  </select>
                </div>
              </div>

              {kategori === 'CUSTOM' && (
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Nama Kategori Custom</label>
                  <input
                    type="text"
                    value={customKategori}
                    onChange={(e) => setCustomKategori(e.target.value)}
                    placeholder="Contoh: Acrylic / Merchandise"
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Nama Produk *</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                  placeholder="Spanduk Flexi 280gr / Kartu Nama"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Satuan</label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="Pcs / Lbr / m2 / Box"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Spesifikasi / Keterangan</label>
                  <input
                    type="text"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Ukuran / Resolusi / Bahan"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>URL Gambar / Foto Produk</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageUrl(convertToDirectImageUrl(val));
                  }}
                  placeholder="Paste URL / Link Google Drive publik..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Modal (HPP) Rp</label>
                  <input
                    type="number"
                    value={hpp}
                    onChange={(e) => setHpp(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Harga Jual Rp *</label>
                  <input
                    type="number"
                    value={harga}
                    onChange={(e) => setHarga(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              {/* Pilihan Finishing Percetakan Terhubung */}
              <div
                style={{
                  background: 'var(--bg-main, #F8FAFC)',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                      Preset Finishing &amp; Add-on Kasir
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {finishingGroupIds.length === 0 ? 'Otomatis ikut kategori' : `${finishingGroupIds.length} grup dipilih khusus`}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.35 }}>
                  Pilihan finishing yang dicentang akan otomatis muncul di kasir saat kasir mengklik &quot;+ Finishing&quot; pada item nota:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                  {allFinishingGroups.map((fg) => {
                    const currentKat = kategori === 'CUSTOM' ? customKategori : kategori;
                    const autoMatches = getApplicableFinishingGroups(currentKat, undefined, [fg]).length > 0;
                    const isExplicitlyChecked = finishingGroupIds.includes(fg.id);
                    const isEffective = finishingGroupIds.length > 0 ? isExplicitlyChecked : autoMatches;

                    return (
                      <label
                        key={fg.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isEffective ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                          border: isEffective ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid transparent',
                          fontSize: '11.5px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isEffective}
                          onChange={(e) => {
                            let currentIds = finishingGroupIds.length > 0
                              ? [...finishingGroupIds]
                              : getApplicableFinishingGroups(currentKat, undefined, allFinishingGroups).map((g) => g.id);

                            if (e.target.checked) {
                              if (!currentIds.includes(fg.id)) currentIds.push(fg.id);
                            } else {
                              currentIds = currentIds.filter((id) => id !== fg.id);
                            }
                            setFinishingGroupIds(currentIds);
                          }}
                          style={{ width: '15px', height: '15px', accentColor: '#2563EB' }}
                        />
                        <span style={{ fontWeight: isEffective ? 700 : 500, color: isEffective ? '#1E40AF' : 'var(--text-main)' }}>
                          {fg.nama}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          ({fg.options.length} opsi)
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: showInPortal ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  id="showInPortalCheck"
                  checked={showInPortal}
                  onChange={(e) => setShowInPortal(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10B981' }}
                />
                <label htmlFor="showInPortalCheck" style={{ fontSize: '12px', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                  Tampilkan di Portal Belanja Pelanggan (Web)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={16} /> Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
