import React, { useState, useEffect } from 'react';
import { Voucher } from '../types';
import { subscribeCollection, saveDocument, deleteDocument } from '../firebaseService';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';
import {
  Ticket,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Calendar,
  Save,
  X,
  Search
} from 'lucide-react';

interface VoucherManagerProps {
  showToast: (msg: string, isErr?: boolean) => void;
}

export const VoucherManager: React.FC<VoucherManagerProps> = ({ showToast }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'nominal' | 'percent'>('nominal');
  const [value, setValue] = useState<number>(10000);
  const [minTransaction, setMinTransaction] = useState<number>(50000);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);
  const [quota, setQuota] = useState<number>(100);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCollection<Voucher>('vouchers', (data) => {
      setVouchers(data || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditingVoucher(null);
    setCode('');
    setDesc('');
    setType('nominal');
    setValue(10000);
    setMinTransaction(50000);
    setMaxDiscount(0);
    setQuota(100);
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setValidFrom(today);
    setValidUntil(nextMonth);
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setCode(v.code);
    setDesc(v.desc || '');
    setType(v.type);
    setValue(v.value);
    setMinTransaction(v.minTransaction || 0);
    setMaxDiscount(v.maxDiscount || 0);
    setQuota(v.quota || 100);
    setValidFrom(v.validFrom || '');
    setValidUntil(v.validUntil || '');
    setActive(v.active);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!formattedCode) return showToast('Kode voucher wajib diisi!', true);

    try {
      const id = editingVoucher ? editingVoucher.id : `vch_${Date.now()}`;
      const payload: Voucher = {
        id,
        code: formattedCode,
        desc,
        type,
        value: Number(value) || 0,
        minTransaction: Number(minTransaction) || 0,
        maxDiscount: Number(maxDiscount) || 0,
        quota: Number(quota) || 100,
        usedCount: editingVoucher ? (editingVoucher.usedCount || 0) : 0,
        validFrom,
        validUntil,
        active
      };

      await saveDocument('vouchers', payload);
      showToast(`Voucher ${formattedCode} berhasil disimpan!`);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan voucher!', true);
    }
  };

  const handleDelete = async (id: string, codeStr: string) => {
    if (!window.confirm(`Hapus voucher "${codeStr}"?`)) return;
    try {
      await deleteDocument('vouchers', id);
      showToast(`Voucher ${codeStr} telah dihapus.`);
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus voucher!', true);
    }
  };

  const filtered = vouchers.filter((v) =>
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.desc || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Ticket size={22} color="var(--primary)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Kelola Voucher Diskon & Promo Toko</h3>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Atur kode voucher promo kustom untuk Portal Pelanggan & Kasir Kasir Toko</div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Plus size={16} /> Buat Voucher Baru
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '14px', maxWidth: '320px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari kode voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '12px', width: '100%' }}
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode Voucher</th>
              <th>Tipe & Potongan</th>
              <th>Min. Transaksi</th>
              <th>Kuota & Terpakai</th>
              <th>Masa Berlaku</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  Memuat data voucher...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Belum ada voucher promo. Klik "+ Buat Voucher Baru" untuk menambahkan promo diskon.
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} color="var(--primary)" />
                      <strong style={{ fontSize: '13px', color: 'var(--primary)', letterSpacing: '0.5px' }}>{v.code}</strong>
                    </div>
                    {v.desc && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{v.desc}</div>}
                  </td>

                  <td>
                    <strong style={{ color: '#10B981', fontSize: '12.5px' }}>
                      {v.type === 'nominal' ? formatRupiah(v.value) : `${v.value}% Off`}
                    </strong>
                    {v.type === 'percent' && v.maxDiscount ? (
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Maks. {formatRupiah(v.maxDiscount)}</div>
                    ) : null}
                  </td>

                  <td style={{ fontSize: '12px' }}>
                    {formatRupiah(v.minTransaction)}
                  </td>

                  <td>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>
                      {v.usedCount || 0} / {v.quota || '∞'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Terpakai</div>
                  </td>

                  <td style={{ fontSize: '11px', color: 'var(--text-main)' }}>
                    <div>Dari: {formatDate(v.validFrom)}</div>
                    <div>S/d: {formatDate(v.validUntil)}</div>
                  </td>

                  <td>
                    {v.active ? (
                      <span className="badge badge-success" style={{ fontSize: '10.5px' }}>Aktif</span>
                    ) : (
                      <span className="badge badge-secondary" style={{ fontSize: '10.5px' }}>Non-Aktif</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEditModal(v)}
                        style={{ padding: '4px 8px' }}
                        title="Edit Voucher"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDelete(v.id, v.code)}
                        style={{ padding: '4px 8px', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                        title="Hapus Voucher"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Voucher */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', backgroundColor: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '520px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.35)', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ticket size={18} /> {editingVoucher ? 'Edit Voucher Diskon' : 'Buat Voucher Diskon Baru'}
              </span>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Kode Voucher (Contoh: PROMO50 / GRATISONGKIR)</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="KODE123"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Deskripsi Promo</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Potongan harga Rp 10.000 untuk cetak nota"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Tipe Potongan</label>
                  <select value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="nominal">Nominal (Rp)</option>
                    <option value="percent">Persentase (%)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Nilai Potongan</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Min. Order (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={minTransaction}
                    onChange={(e) => setMinTransaction(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Maks. Diskon Rp (Khusus %)</label>
                  <input
                    type="number"
                    min={0}
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    disabled={type !== 'percent'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Kuota Penggunaan</label>
                  <input
                    type="number"
                    min={1}
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>Mulai Berlaku</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '11.5px', fontWeight: 700 }}>S/d Tanggal</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span>Status Voucher Aktif</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> Simpan Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
