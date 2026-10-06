import React, { useState } from 'react';
import { Pengeluaran, Vendor } from '../types';
import { saveDocument, deleteDocument } from '../firebaseService';
import { TrendingDown, MoreVertical, Edit3, Trash2, Plus, Save, FileSpreadsheet, Search, X } from 'lucide-react';
import { SortableHeader } from './SortableHeader';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';

interface PengeluaranPageProps {
  expenses: Pengeluaran[];
  vendors: Vendor[];
  showToast: (msg: string, isErr?: boolean) => void;
}

export const PengeluaranPage: React.FC<PengeluaranPageProps> = ({
  expenses,
  vendors,
  showToast
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tgl, setTgl] = useState(new Date().toISOString().split('T')[0]);
  const [kategori, setKategori] = useState('Beli Bahan / Vendor');
  const [vendorName, setVendorName] = useState('');
  const [ket, setKet] = useState('');
  const [nominal, setNominal] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>('tgl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const filteredExpenses = expenses.filter((ex) => {
    const term = searchTerm.toLowerCase();
    return (
      (ex.ket || '').toLowerCase().includes(term) ||
      (ex.vendor || '').toLowerCase().includes(term) ||
      (ex.kategori || '').toLowerCase().includes(term) ||
      (ex.tgl || '').includes(term)
    );
  }).sort((a, b) => {
    let aVal: any = a[sortKey as keyof Pengeluaran] || '';
    let bVal: any = b[sortKey as keyof Pengeluaran] || '';

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
    if (!ket.trim() || nominal <= 0) {
      return showToast('Isi Keterangan & Nominal > 0', true);
    }

    // Auto save vendor if new
    if (vendorName.trim() && !vendors.find((v) => v.nama.toLowerCase() === vendorName.trim().toLowerCase())) {
      await saveDocument('vendor', {
        id: String(Date.now()),
        nama: vendorName.trim(),
        kategori: 'Lainnya'
      });
    }

    const id = editingIndex !== null ? expenses[editingIndex].id : String(Date.now());
    const data: Pengeluaran = { id, tgl, kategori, vendor: vendorName.trim(), ket: ket.trim(), nominal };

    await saveDocument('pengeluaran', data);
    showToast('Pengeluaran Berhasil Disimpan!');
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingIndex(null);
    setTgl(new Date().toISOString().split('T')[0]);
    setKategori('Beli Bahan / Vendor');
    setVendorName('');
    setKet('');
    setNominal(0);
  };

  const handleEdit = (index: number) => {
    const ex = expenses[index];
    setEditingIndex(index);
    setTgl(ex.tgl);
    setKategori(ex.kategori);
    setVendorName(ex.vendor || '');
    setKet(ex.ket);
    setNominal(ex.nominal);
    setShowModal(true);
  };

  const handleDelete = async (ex: Pengeluaran) => {
    if (confirm(`Hapus pengeluaran "${ex.ket}"?`)) {
      await deleteDocument('pengeluaran', ex.id);
      showToast('Pengeluaran Dihapus!');
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) return showToast('Tidak ada data pengeluaran untuk di-export', true);
    
    const headers = ['Tanggal', 'Kategori', 'Vendor / Penerima', 'Keterangan', 'Total Nominal (Rp)'];
    const rows = expenses.map((ex) => [
      `"${ex.tgl}"`,
      `"${ex.kategori}"`,
      `"${(ex.vendor || '').replace(/"/g, '""')}"`,
      `"${ex.ket.replace(/"/g, '""')}"`,
      ex.nominal || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Pengeluaran_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Berhasil export ${expenses.length} data pengeluaran ke CSV!`);
  };

  const totalPengeluaran = expenses.reduce((acc, curr) => acc + (curr.nominal || 0), 0);

  return (
    <div className="card" style={{ width: '100%' }}>
      {/* Header with Title, Add Button, Search, and Export */}
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={20} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '16px', fontWeight: 800 }}>Daftar Pengeluaran & Operasional</span>
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
            <Plus size={16} /> Catat Pengeluaran Baru
          </button>
          <span style={{ fontSize: '12.5px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', padding: '3px 10px', borderRadius: '6px', fontWeight: 800 }}>
            Total: {formatRupiah(totalPengeluaran)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Cari Pengeluaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '30px', width: '100%' }}
            />
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleExportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10B981', borderColor: '#10B981', fontWeight: 700 }}
          >
            <FileSpreadsheet size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Full-width Pengeluaran Table */}
      <div className="table-responsive" style={{ overflow: 'visible' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <SortableHeader label="Tanggal" sortKey="tgl" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Kategori" sortKey="kategori" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Vendor / Penerima" sortKey="vendor" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Keterangan" sortKey="ket" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Total (Rp)" sortKey="nominal" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort} />
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Tidak ada pengeluaran yang cocok dengan pencarian.' : 'Belum ada catatan pengeluaran.'}
                </td>
              </tr>
            ) : (
              filteredExpenses.map((ex) => {
                const actualIndex = expenses.findIndex((item) => item.id === ex.id);
                return (
                  <tr key={ex.id} style={{ position: 'relative', zIndex: activeDropId === ex.id ? 100 : 'auto' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(ex.tgl)}</td>
                    <td>
                      <span style={{ background: 'rgba(0, 82, 255, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700 }}>
                        {ex.kategori}
                      </span>
                    </td>
                    <td>{ex.vendor || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td><strong style={{ color: 'var(--text-main)' }}>{ex.ket}</strong></td>
                    <td style={{ color: 'var(--danger)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {formatRupiah(ex.nominal)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="dropdown">
                        <button
                          className="btn-kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropId(activeDropId === ex.id ? null : ex.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeDropId === ex.id && (
                          <div className="dropdown-content show">
                            <button onClick={() => { setActiveDropId(null); handleEdit(actualIndex); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit3 size={14} /> Edit Data
                            </button>
                            <button onClick={() => { setActiveDropId(null); handleDelete(ex); }} style={{ color: 'var(--danger)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

      {/* Modal Catat / Edit Pengeluaran */}
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
                {editingIndex !== null ? 'Edit Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Tanggal</label>
                  <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Kategori Beban</label>
                  <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                    <option>Beli Bahan / Vendor</option>
                    <option>Listrik & Air</option>
                    <option>Gaji Karyawan</option>
                    <option>Maintenance Mesin</option>
                    <option>Sewa & Utilitas</option>
                    <option>Lain-lain</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Vendor / Penerima (Opsional)</label>
                <input
                  type="text"
                  list="list-vendor-beli"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Pilih/Ketik nama vendor atau pihak penerima..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Deskripsi / Keterangan <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  value={ket}
                  onChange={(e) => setKet(e.target.value)}
                  placeholder="Contoh: Cetak Spanduk Flexi 5x2m ke Vendor X"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700 }}>Nominal Pengeluaran (Rp) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="number"
                  value={nominal || ''}
                  onChange={(e) => setNominal(parseFloat(e.target.value) || 0)}
                  required
                  min="1"
                  placeholder="0"
                  style={{ fontSize: '15px', fontWeight: 800 }}
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
                  <Save size={16} /> Simpan Pengeluaran
                </button>
              </div>
            </form>

            <datalist id="list-vendor-beli">
              {vendors.map((v) => (
                <option key={v.id} value={v.nama} />
              ))}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
};
