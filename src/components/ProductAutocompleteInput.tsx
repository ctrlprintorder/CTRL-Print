import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Produk } from '../types';
import { getProductCode } from '../utils/idGenerator';
import { formatRupiah } from '../utils/currency';
import { Search, ChevronDown, Check, X, Box, Tag } from 'lucide-react';

interface ProductAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct: (product: Produk) => void;
  products: Produk[];
  placeholder?: string;
  selectedProductId?: string;
  selectedProductCode?: string;
}

export const ProductAutocompleteInput: React.FC<ProductAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectProduct,
  products,
  placeholder = 'Pilih katalog atau ketik produk baru...',
  selectedProductId,
  selectedProductCode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [openUpwards, setOpenUpwards] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) {
      return products;
    }

    return products.filter((p, pIdx) => {
      const code = getProductCode(p, pIdx + 1, products).toLowerCase();
      const rawCode = (p.sku || p.code || p.id || '').toLowerCase();
      const name = (p.nama || '').toLowerCase();
      const desc = (p.desc || '').toLowerCase();
      const kat = (p.kategori || '').toLowerCase();

      return (
        code.includes(q) ||
        rawCode.includes(q) ||
        name.includes(q) ||
        desc.includes(q) ||
        kat.includes(q)
      );
    });
  }, [value, products]);

  // Adjust dropdown direction (upwards/downwards) when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320 && rect.top > 320) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.product-option-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (product: Produk) => {
    onSelectProduct(product);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            padding: '7px 54px 7px 9px',
            fontSize: '12px',
            width: '100%',
            borderRadius: '6px',
            border: isOpen ? '1px solid var(--primary, #0284c7)' : '1px solid var(--border-color)',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            fontWeight: 500,
            outline: 'none',
            boxShadow: isOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s'
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                inputRef.current?.focus();
              }}
              title="Hapus / Reset"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '3px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            title="Buka Katalog Produk"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '3px',
              cursor: 'pointer',
              color: isOpen ? 'var(--primary, #0284c7)' : 'var(--text-muted)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s'
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            left: 0,
            [openUpwards ? 'bottom' : 'top']: 'calc(100% + 4px)',
            minWidth: '360px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            padding: '4px 0'
          }}
        >
          {/* Header count info */}
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-main, #f8fafc)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Box size={12} /> Katalog Produk ({filteredProducts.length})
            </span>
            {value && (
              <span style={{ fontSize: '10.5px' }}>
                Ketik untuk menyaring
              </span>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '12px', margin: '0 0 6px 0' }}>Tidak ada produk yang cocok dengan "{value}"</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  fontSize: '11px',
                  color: 'var(--primary, #0284c7)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Gunakan teks ini sebagai nama produk manual
              </button>
            </div>
          ) : (
            filteredProducts.map((p, pIdx) => {
              const actualIndex = products.findIndex((x) => x.id === p.id);
              const code = getProductCode(p, (actualIndex >= 0 ? actualIndex : pIdx) + 1, products);
              const isSelected = p.id === selectedProductId || (selectedProductCode && code === selectedProductCode);
              const isHighlighted = pIdx === highlightedIndex;

              return (
                <div
                  key={p.id}
                  className="product-option-item"
                  onMouseDown={(e) => {
                    // Use onMouseDown to trigger before input blur
                    e.preventDefault();
                    handleSelect(p);
                  }}
                  onMouseEnter={() => setHighlightedIndex(pIdx)}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    background: isHighlighted
                      ? 'rgba(2, 132, 199, 0.08)'
                      : isSelected
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'transparent',
                    borderBottom: '1px solid var(--border-color, #f1f5f9)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'background 0.1s'
                  }}
                >
                  {/* Top line: SKU Badge + Nama Produk + Kategori */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(2, 132, 199, 0.12)',
                          color: isSelected ? '#047857' : '#0369a1',
                          border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(2, 132, 199, 0.25)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        [{code}]
                      </span>
                      <strong
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {p.nama}
                      </strong>
                    </div>

                    {p.kategori && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-main, #f1f5f9)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {p.kategori}
                      </span>
                    )}
                  </div>

                  {/* Bottom line: Deskripsi / Ukuran + Harga Jual */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}
                    >
                      {p.desc ? p.desc : '(Tanpa spesifikasi khusus)'}
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                        color: '#059669',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {formatRupiah(p.harga || 0)}
                      {p.satuan ? ` / ${p.satuan}` : ''}
                      {isSelected && <Check size={12} style={{ color: '#059669', strokeWidth: 3 }} />}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
