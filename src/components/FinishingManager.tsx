import React, { useState } from 'react';
import { FinishingGroup, FinishingOption } from '../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  FolderPlus,
  Scissors
} from 'lucide-react';
import { formatRupiah } from '../utils/currency';
import { saveDocument, deleteDocument } from '../firebaseService';
import { DEFAULT_FINISHING_GROUPS } from '../data/defaultFinishings';

interface FinishingManagerProps {
  finishingGroups: FinishingGroup[];
  showToast: (msg: string, isErr?: boolean) => void;
}

const COMMON_CATEGORIES = [
  'SEMUA',
  'Stiker & Decal',
  'Outdoor Banner',
  'Indoor Display',
  'Digital A3+',
  'Offset & Sablon',
  'Finishing & Jilid',
  'Merchandise & Souvenir',
  'Lainnya'
];

export const FinishingManager: React.FC<FinishingManagerProps> = ({
  finishingGroups,
  showToast
}) => {
  const [selectedGroup, setSelectedGroup] = useState<FinishingGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group Form States
  const [groupNama, setGroupNama] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupTipePilihan, setGroupTipePilihan] = useState<'single' | 'multiple'>('single');
  const [groupCategories, setGroupCategories] = useState<string[]>(['Stiker & Decal']);
  const [optionsList, setOptionsList] = useState<FinishingOption[]>([]);

  // Option Form Inside Modal
  const [newOptName, setNewOptName] = useState('');
  const [newOptPrice, setNewOptPrice] = useState<number>(0);
  const [newOptCalc, setNewOptCalc] = useState<'per_satuan' | 'flat' | 'per_meter'>('per_satuan');
  const [newOptDesc, setNewOptDesc] = useState('');

  const handleOpenAdd = () => {
    setSelectedGroup(null);
    setGroupNama('');
    setGroupDesc('');
    setGroupTipePilihan('single');
    setGroupCategories(['Stiker & Decal']);
    setOptionsList([
      { id: 'opt_' + Date.now() + '_1', nama: 'Tanpa Finishing (Standar)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Opsi bawaan polos' },
      { id: 'opt_' + Date.now() + '_2', nama: 'Finishing Baru', harga: 2000, tipeHitung: 'per_satuan', keterangan: '' }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: FinishingGroup) => {
    setSelectedGroup(group);
    setGroupNama(group.nama);
    setGroupDesc(group.deskripsi || '');
    setGroupTipePilihan(group.tipePilihan || 'single');
    setGroupCategories(group.kategoriProduk || []);
    setOptionsList([...group.options]);
    setIsModalOpen(true);
  };

  const handleToggleCategory = (cat: string) => {
    if (cat === 'SEMUA') {
      setGroupCategories(['SEMUA']);
      return;
    }
    const withoutSemua = groupCategories.filter((c) => c !== 'SEMUA');
    if (withoutSemua.includes(cat)) {
      setGroupCategories(withoutSemua.filter((c) => c !== cat));
    } else {
      setGroupCategories([...withoutSemua, cat]);
    }
  };

  const handleAddOption = () => {
    if (!newOptName.trim()) {
      showToast('Masukkan nama opsi finishing terlebih dahulu', true);
      return;
    }
    const newOpt: FinishingOption = {
      id: 'opt_' + Date.now(),
      nama: newOptName.trim(),
      harga: Number(newOptPrice) || 0,
      tipeHitung: newOptCalc,
      keterangan: newOptDesc.trim() || undefined
    };
    setOptionsList([...optionsList, newOpt]);
    setNewOptName('');
    setNewOptPrice(0);
    setNewOptDesc('');
  };

  const handleRemoveOption = (index: number) => {
    setOptionsList(optionsList.filter((_, i) => i !== index));
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNama.trim()) {
      showToast('Nama grup finishing wajib diisi', true);
      return;
    }
    if (optionsList.length === 0) {
      showToast('Tambahkan minimal 1 opsi finishing', true);
      return;
    }

    const id = selectedGroup ? selectedGroup.id : 'fg_' + Date.now();
    const data: FinishingGroup = {
      id,
      nama: groupNama.trim(),
      deskripsi: groupDesc.trim() || undefined,
      tipePilihan: groupTipePilihan,
      kategoriProduk: groupCategories.length > 0 ? groupCategories : ['SEMUA'],
      options: optionsList
    };

    try {
      await saveDocument('finishing_groups', data);
      showToast(`Grup finishing "${data.nama}" berhasil disimpan!`);
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Gagal menyimpan grup finishing: ' + (err.message || 'Error'), true);
    }
  };

  const handleDeleteGroup = async (group: FinishingGroup) => {
    if (window.confirm(`Yakin ingin menghapus grup finishing "${group.nama}"?`)) {
      try {
        await deleteDocument('finishing_groups', group.id);
        showToast(`Grup finishing "${group.nama}" berhasil dihapus.`);
      } catch (err: any) {
        showToast('Gagal menghapus: ' + (err.message || 'Error'), true);
      }
    }
  };

  const handleSeedDefaults = async () => {
    if (window.confirm('Muat ulang 9 Master Preset Finishing Standar Percetakan ke database? Opsi default akan diperbarui secara otomatis.')) {
      try {
        for (const g of DEFAULT_FINISHING_GROUPS) {
          await saveDocument('finishing_groups', g);
        }
        showToast('🎉 Berhasil memuat 9 Master Preset Finishing Percetakan lengkap!');
      } catch (err: any) {
        showToast('Gagal memuat preset: ' + (err.message || 'Error'), true);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Actions */}
      <div
        style={{
          background: 'var(--bg-main, #F8FAFC)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#2563EB' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
              Master Pilihan Finishing &amp; Add-on Cetak
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Kelola pilihan finishing (potong, laminasi, mata ayam, jilid, foil emas, dudukan kalender, dll.) yang otomatis muncul di kasir saat produk terkait dipilih.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleSeedDefaults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              background: 'rgba(37, 99, 235, 0.08)',
              color: '#2563EB',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Muat ulang pustaka preset finishing standar industri percetakan"
          >
            <RotateCcw size={14} /> Muat Standar Percetakan
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563EB',
              color: '#FFF',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Plus size={15} /> Buat Grup Finishing Baru
          </button>
        </div>
      </div>

      {/* Grid of Finishing Groups */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px'
        }}
      >
        {finishingGroups.map((group) => (
          <div
            key={group.id}
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div>
              {/* Header card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {group.nama}
                  </h4>
                  {group.deskripsi && (
                    <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {group.deskripsi}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(group)}
                    style={{
                      padding: '5px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #E2E8F0)',
                      background: 'var(--bg-main, #F8FAFC)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                    title="Edit Grup"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group)}
                    style={{
                      padding: '5px',
                      borderRadius: '6px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#EF4444',
                      cursor: 'pointer'
                    }}
                    title="Hapus Grup"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Categories & Type Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '10px 0' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: group.tipePilihan === 'single' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: group.tipePilihan === 'single' ? '#2563EB' : '#10B981'
                  }}
                >
                  {group.tipePilihan === 'single' ? 'Radio (Pilih 1 Opsi)' : 'Multi-Check (Bisa Banyak)'}
                </span>

                {group.kategoriProduk?.map((cat) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: 'var(--bg-main, #F1F5F9)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color, #E2E8F0)'
                    }}
                  >
                    🏷️ {cat}
                  </span>
                ))}
              </div>

              {/* List of Options Preview */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color, #E2E8F0)',
                  paddingTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}
              >
                {group.options.slice(0, 5).map((opt) => (
                  <div
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      padding: '3px 0'
                    }}
                  >
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                      • {opt.nama}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: opt.harga > 0 ? '#059669' : 'var(--text-muted)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {opt.harga > 0
                        ? `+${formatRupiah(opt.harga)}${opt.tipeHitung === 'flat' ? ' flat' : ''}`
                        : 'Rp 0'}
                    </span>
                  </div>
                ))}
                {group.options.length > 5 && (
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                    + {group.options.length - 5} opsi lainnya...
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-color, #E2E8F0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}
            >
              <span>Total {group.options.length} Opsi</span>
              <button
                type="button"
                onClick={() => handleOpenEdit(group)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: 0
                }}
              >
                Kelola Opsi &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Group */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              color: 'var(--text-main, #0F172A)',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '92vh',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color, #E2E8F0)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color, #E2E8F0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-main, #F8FAFC)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} style={{ color: '#2563EB' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedGroup ? `Edit Grup: ${selectedGroup.nama}` : 'Buat Grup Finishing Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveGroup} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Nama Grup Finishing *</label>
                    <input
                      type="text"
                      value={groupNama}
                      onChange={(e) => setGroupNama(e.target.value)}
                      placeholder="Contoh: ✂️ Pilihan Potong Stiker"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700 }}>Tipe Pemilihan</label>
                    <select
                      value={groupTipePilihan}
                      onChange={(e) => setGroupTipePilihan(e.target.value as any)}
                    >
                      <option value="single">Single Choice (Hanya bisa pilih 1 opsi)</option>
                      <option value="multiple">Multiple Choice (Bisa centang banyak opsi)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>Deskripsi / Petunjuk untuk Kasir &amp; Operator</label>
                  <input
                    type="text"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Contoh: Pilih jenis potongan pola atau sisir lurus..."
                  />
                </div>

                {/* Categories Association */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 700 }}>
                    Tautkan ke Kategori Produk (Otomatis Tampil Saat Kategori Ini Dipilih):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {COMMON_CATEGORIES.map((cat) => {
                      const active = groupCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: active ? 700 : 500,
                            border: '1px solid',
                            borderColor: active ? '#2563EB' : 'var(--border-color, #E2E8F0)',
                            background: active ? '#2563EB' : 'var(--bg-main, #F1F5F9)',
                            color: active ? '#FFF' : 'var(--text-main)',
                            cursor: 'pointer'
                          }}
                        >
                          {active ? '✓ ' : '+ '}{cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Section: Daftar Opsi Finishing */}
                <div
                  style={{
                    borderTop: '1px solid var(--border-color, #E2E8F0)',
                    paddingTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--text-main)' }}>
                      Daftar Opsi Finishing ({optionsList.length} Pilihan)
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Atur nama opsi &amp; biaya tambahan
                    </span>
                  </div>

                  {/* List of current options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {optionsList.map((opt, idx) => (
                      <div
                        key={opt.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-main, #F8FAFC)',
                          border: '1px solid var(--border-color, #E2E8F0)'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>
                            {opt.nama}
                          </div>
                          {opt.keterangan && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {opt.keterangan}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '12px', color: opt.harga > 0 ? '#059669' : 'var(--text-muted)' }}>
                            {opt.harga > 0 ? `+${formatRupiah(opt.harga)}` : 'Gratis'}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                            {opt.tipeHitung === 'flat' ? 'Flat / Nota' : 'per Satuan'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            color: '#EF4444',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Hapus Opsi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Input Box: Tambah Opsi Baru */}
                  <div
                    style={{
                      background: 'rgba(37, 99, 235, 0.04)',
                      border: '1px dashed rgba(37, 99, 235, 0.3)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginTop: '6px'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB' }}>
                      + Tambah Baris Opsi Baru:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Nama Opsi</label>
                        <input
                          type="text"
                          value={newOptName}
                          onChange={(e) => setNewOptName(e.target.value)}
                          placeholder="Misal: Die Cut Custom"
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Biaya Tambahan (Rp)</label>
                        <input
                          type="number"
                          value={newOptPrice}
                          onChange={(e) => setNewOptPrice(Number(e.target.value))}
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                          min="0"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Metode Hitung</label>
                        <select
                          value={newOptCalc}
                          onChange={(e) => setNewOptCalc(e.target.value as any)}
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        >
                          <option value="per_satuan">Per Satuan / Lembar</option>
                          <option value="flat">Flat (Sekali Transaksi)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2563EB',
                          color: '#FFF',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          height: '35px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} /> Tambah
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newOptDesc}
                        onChange={(e) => setNewOptDesc(e.target.value)}
                        placeholder="Keterangan singkat (opsional)..."
                        style={{ padding: '5px 8px', fontSize: '11px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-color, #E2E8F0)',
                  background: 'var(--bg-main, #F8FAFC)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563EB',
                    color: '#FFF',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <Save size={16} /> Simpan Grup Finishing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
