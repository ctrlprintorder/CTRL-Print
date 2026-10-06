import React, { useState, useEffect } from 'react';
import {
  FinishingGroup,
  FinishingOption,
  SelectedFinishingItem,
  InvoiceItem
} from '../types';
import {
  X,
  Check,
  Scissors,
  Layers,
  HelpCircle,
  PlusCircle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { formatRupiah } from '../utils/currency';
import { calculateFinishingAddition, formatFinishingSummary } from '../data/defaultFinishings';

interface FinishingSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InvoiceItem;
  itemIndex: number;
  applicableGroups: FinishingGroup[];
  onApply: (
    index: number,
    selected: SelectedFinishingItem[],
    newUnitPrice: number,
    finishingSummary: string
  ) => void;
}

export const FinishingSelectorModal: React.FC<FinishingSelectorModalProps> = ({
  isOpen,
  onClose,
  item,
  itemIndex,
  applicableGroups,
  onApply
}) => {
  const [selectedList, setSelectedList] = useState<SelectedFinishingItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Initialize with currently selected finishings or empty
      setSelectedList(item.selectedFinishings ? [...item.selectedFinishings] : []);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const basePrice = item.baseHarga !== undefined && item.baseHarga > 0
    ? item.baseHarga
    : (item.harga || 0);

  const isOptionSelected = (groupId: string, optionId: string) => {
    return selectedList.some((s) => s.groupId === groupId && s.optionId === optionId);
  };

  const handleToggleOption = (group: FinishingGroup, option: FinishingOption) => {
    if (group.tipePilihan === 'single') {
      // Replace existing selection in this group
      const filtered = selectedList.filter((s) => s.groupId !== group.id);
      if (option.harga === 0 && option.nama.toLowerCase().includes('tanpa')) {
        // Option is "Tanpa Finishing" (Rp 0), we can either include it with Rp 0 or keep as record
        filtered.push({
          groupId: group.id,
          groupName: group.nama,
          optionId: option.id,
          optionName: option.nama,
          harga: 0,
          tipeHitung: option.tipeHitung
        });
      } else {
        filtered.push({
          groupId: group.id,
          groupName: group.nama,
          optionId: option.id,
          optionName: option.nama,
          harga: option.harga,
          tipeHitung: option.tipeHitung
        });
      }
      setSelectedList(filtered);
    } else {
      // Multiple selection (checkboxes)
      const exists = selectedList.some((s) => s.groupId === group.id && s.optionId === option.id);
      if (exists) {
        setSelectedList(selectedList.filter((s) => !(s.groupId === group.id && s.optionId === option.id)));
      } else {
        setSelectedList([
          ...selectedList,
          {
            groupId: group.id,
            groupName: group.nama,
            optionId: option.id,
            optionName: option.nama,
            harga: option.harga,
            tipeHitung: option.tipeHitung
          }
        ]);
      }
    }
  };

  const handleClearGroup = (groupId: string) => {
    setSelectedList(selectedList.filter((s) => s.groupId !== groupId));
  };

  const handleResetAll = () => {
    setSelectedList([]);
  };

  const { perUnitAdd, flatAdd } = calculateFinishingAddition(selectedList);
  const calculatedUnitPrice = basePrice + perUnitAdd;
  const calculatedSubtotal = ((item.qty || 1) * calculatedUnitPrice) + flatAdd;

  const handleSave = () => {
    const summary = formatFinishingSummary(selectedList);
    onApply(itemIndex, selectedList, calculatedUnitPrice, summary);
    onClose();
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          color: 'var(--text-main, #0F172A)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Pilihan Finishing &amp; Add-on Cetak
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Item: <strong style={{ color: '#2563EB' }}>{item.nama || 'Produk Cetak'}</strong>
                {item.satuan ? ` (${item.qty || 1} ${item.satuan})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px'
            }}
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content - Scrollable */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {applicableGroups.length === 0 ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                background: 'var(--bg-main, #F8FAFC)',
                borderRadius: '12px',
                border: '1px dashed var(--border-color, #E2E8F0)'
              }}
            >
              <Scissors size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px auto', opacity: 0.6 }} />
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
                Tidak Ada Preset Finishing Khusus untuk Kategori Ini
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                Anda dapat menambahkan master preset finishing di menu <strong>Katalog Produk &gt; Master Finishing</strong>, atau memasukkan catatan spesifikasi manual pada kolom deskripsi item.
              </p>
            </div>
          ) : (
            applicableGroups.map((group) => {
              const selectedInGroup = selectedList.filter((s) => s.groupId === group.id);

              return (
                <div
                  key={group.id}
                  style={{
                    background: 'var(--bg-main, #F8FAFC)',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '12px',
                    padding: '14px 16px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)' }}>
                        {group.nama}
                      </div>
                      {group.deskripsi && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {group.deskripsi}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: group.tipePilihan === 'single' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: group.tipePilihan === 'single' ? '#2563EB' : '#10B981'
                        }}
                      >
                        {group.tipePilihan === 'single' ? 'Pilih 1 Opsi' : 'Bisa Pilih Banyak'}
                      </span>
                      {selectedInGroup.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClearGroup(group.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger, #EF4444)',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 4px'
                          }}
                        >
                          Hapus Pilihan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '8px'
                    }}
                  >
                    {group.options.map((option) => {
                      const isSelected = isOptionSelected(group.id, option.id);

                      return (
                        <div
                          key={option.id}
                          onClick={() => handleToggleOption(group, option)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: isSelected ? '1.5px solid #2563EB' : '1px solid var(--border-color, #E2E8F0)',
                            background: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-card, #FFFFFF)'
                          }}
                        >
                          <div
                            style={{
                              marginTop: '2px',
                              width: '16px',
                              height: '16px',
                              borderRadius: group.tipePilihan === 'single' ? '50%' : '4px',
                              border: isSelected ? '5px solid #2563EB' : '1.5px solid var(--border-color, #CBD5E1)',
                              background: '#FFF',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px'
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: isSelected ? 800 : 600,
                                  color: isSelected ? '#1E40AF' : 'var(--text-main)',
                                  lineHeight: 1.3
                                }}
                              >
                                {option.nama}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  whiteSpace: 'nowrap',
                                  color: option.harga > 0 ? '#059669' : 'var(--text-muted)'
                                }}
                              >
                                {option.harga > 0
                                  ? `+${formatRupiah(option.harga)}${option.tipeHitung === 'flat' ? ' flat' : ''}`
                                  : 'Gratis'}
                              </span>
                            </div>
                            {option.keterangan && (
                              <div
                                style={{
                                  fontSize: '10.5px',
                                  color: 'var(--text-muted)',
                                  marginTop: '3px',
                                  lineHeight: 1.3
                                }}
                              >
                                {option.keterangan}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Live Calculations & Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color, #E2E8F0)',
            background: 'var(--bg-main, #F8FAFC)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Price Breakdown Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Harga Dasar: </span>
                <strong>{formatRupiah(basePrice)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>+ Finishing / Satuan: </span>
                <strong style={{ color: perUnitAdd > 0 ? '#059669' : 'inherit' }}>
                  +{formatRupiah(perUnitAdd)}
                </strong>
              </div>
              {flatAdd > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>+ Biaya Flat: </span>
                  <strong style={{ color: '#059669' }}>+{formatRupiah(flatAdd)}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Satuan Baru:</span>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#2563EB' }}>
                {formatRupiah(calculatedUnitPrice)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <button
              type="button"
              onClick={handleResetAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #E2E8F0)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} /> Kosongkan Finishing
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
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
                type="button"
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                }}
              >
                <Check size={16} /> Terapkan ke Nota
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
