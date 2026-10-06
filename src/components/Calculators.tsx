import React, { useState } from 'react';
import {
  Calculator,
  Maximize2,
  BookOpen,
  Layers,
  Copy,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { formatRupiah } from '../utils/currency';

interface CalculatorsProps {
  showToast: (msg: string, isErr?: boolean) => void;
}

export const Calculators: React.FC<CalculatorsProps> = ({ showToast }) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stiker' | 'banner' | 'buku'>('stiker');
  const [copied, setCopied] = useState(false);

  // Calc 1: Sticker / Kertas Layout
  const [medP, setMedP] = useState('48');
  const [medL, setMedL] = useState('32');
  const [stkP, setStkP] = useState('5');
  const [stkL, setStkL] = useState('5');
  const [stkTarget, setStkTarget] = useState('100');
  const [stkSpace, setStkSpace] = useState('0.2');

  // Calc 2: Banner / Flexi Area m2
  const [m2P, setM2P] = useState('2');
  const [m2L, setM2L] = useState('1');
  const [m2Qty, setM2Qty] = useState('1');
  const [m2Price, setM2Price] = useState('35000');

  // Calc 3: Book / Jilid
  const [bkQty, setBkQty] = useState('20');
  const [bkPages, setBkPages] = useState('80');
  const [bkCostPage, setBkCostPage] = useState('200');
  const [bkCostBind, setBkCostBind] = useState('6000');

  // 1. Calculation: Sticker
  const mp = parseFloat(medP) || 0;
  const ml = parseFloat(medL) || 0;
  const sp = parseFloat(stkP) || 0;
  const sl = parseFloat(stkL) || 0;
  const target = parseFloat(stkTarget) || 0;
  const space = parseFloat(stkSpace) || 0;

  const spFix = sp + space;
  const slFix = sl + space;

  let muatPerLembar = 0;
  let lembarButuh = 0;
  let totalDapat = 0;

  if (mp > 0 && ml > 0 && spFix > 0 && slFix > 0) {
    const layoutA = Math.floor(mp / spFix) * Math.floor(ml / slFix);
    const layoutB = Math.floor(mp / slFix) * Math.floor(ml / spFix);
    muatPerLembar = Math.max(layoutA, layoutB);
    if (muatPerLembar > 0 && target > 0) {
      lembarButuh = Math.ceil(target / muatPerLembar);
      totalDapat = lembarButuh * muatPerLembar;
    }
  }

  // 2. Calculation: Banner
  const bp = parseFloat(m2P) || 0;
  const bl = parseFloat(m2L) || 0;
  const bqty = parseFloat(m2Qty) || 0;
  const bprice = parseFloat(m2Price) || 0;

  const luasPerPcs = bp * bl;
  const totalLuasM2 = luasPerPcs * bqty;
  const totalHargaBanner = totalLuasM2 * bprice;

  // 3. Calculation: Book
  const bkq = parseFloat(bkQty) || 0;
  const bkp = parseFloat(bkPages) || 0;
  const bkcp = parseFloat(bkCostPage) || 0;
  const bkcb = parseFloat(bkCostBind) || 0;

  const hargaPerBuku = bkp * bkcp + bkcb;
  const totalBiayaBuku = hargaPerBuku * bkq;

  const handleCopyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Hasil kalkulasi disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="card"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '13px' }}>
          <Calculator size={18} />
          <span>Kalkulator Cepat Cetak & Layout Muatan</span>
          <span style={{ fontSize: '10px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Pro / Auto-Calculate
          </span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ padding: '3px 8px', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{panelOpen ? 'Sembunyikan' : 'Buka Kalkulator'}</span>
        </button>
      </div>

      {panelOpen && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          {/* Sub-Tab Switcher */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('stiker')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'stiker' ? 'var(--primary)' : 'var(--bg-main)',
                color: activeTab === 'stiker' ? '#FFF' : 'var(--text-main)',
                fontWeight: activeTab === 'stiker' ? 700 : 500,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <Layers size={14} /> 1. Layout Muatan Stiker / Kertas
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('banner')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'banner' ? 'var(--primary)' : 'var(--bg-main)',
                color: activeTab === 'banner' ? '#FFF' : 'var(--text-main)',
                fontWeight: activeTab === 'banner' ? 700 : 500,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <Maximize2 size={14} /> 2. Luas Banner & Spanduk (m²)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('buku')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'buku' ? 'var(--primary)' : 'var(--bg-main)',
                color: activeTab === 'buku' ? '#FFF' : 'var(--text-main)',
                fontWeight: activeTab === 'buku' ? 700 : 500,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <BookOpen size={14} /> 3. Hitung Cetak Buku & Jilid
            </button>
          </div>

          {/* TAB 1: STIKER / LAYOUT */}
          {activeTab === 'stiker' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                {/* Quick Presets */}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Preset Media Cetak:
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => { setMedP('48'); setMedL('32'); }}
                  >
                    A3+ (32x48)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => { setMedP('29.7'); setMedL('21'); }}
                  >
                    A4 (21x29.7)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => { setMedP('33'); setMedL('21.5'); }}
                  >
                    F4 (21.5x33)
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group">
                    <label>Panjang Media (cm)</label>
                    <input type="number" value={medP} onChange={(e) => setMedP(e.target.value)} step="any" />
                  </div>
                  <div className="form-group">
                    <label>Lebar Media (cm)</label>
                    <input type="number" value={medL} onChange={(e) => setMedL(e.target.value)} step="any" />
                  </div>
                  <div className="form-group">
                    <label>Panjang Stiker (cm)</label>
                    <input type="number" value={stkP} onChange={(e) => setStkP(e.target.value)} step="any" placeholder="5" />
                  </div>
                  <div className="form-group">
                    <label>Lebar Stiker (cm)</label>
                    <input type="number" value={stkL} onChange={(e) => setStkL(e.target.value)} step="any" placeholder="5" />
                  </div>
                  <div className="form-group">
                    <label>Target Pcs Dibutuhkan</label>
                    <input type="number" value={stkTarget} onChange={(e) => setStkTarget(e.target.value)} placeholder="100" />
                  </div>
                  <div className="form-group">
                    <label>Jarak / Bleed (cm)</label>
                    <input type="number" value={stkSpace} onChange={(e) => setStkSpace(e.target.value)} step="0.05" />
                  </div>
                </div>
              </div>

              {/* Output Summary Card */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} /> HASIL LAYOUT MUATAN OTOMATIS
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Muat Per Lembar:</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                        {muatPerLembar} <span style={{ fontSize: '10px' }}>pcs</span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Lembar Cetak Dibutuhkan:</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                        {lembarButuh} <span style={{ fontSize: '10px' }}>lembar</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    Target Order: <strong>{target} pcs</strong> ({stkP}x{stkL} cm)<br />
                    Media: {medP}x{medL} cm | Jarak: {stkSpace} cm<br />
                    Total hasil didapat: <strong>{totalDapat} pcs</strong> (sisa lebih: {totalDapat - target} pcs)
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    handleCopyResult(
                      `Layout Stiker (${stkP}x${stkL}cm) di Media ${medP}x${medL}cm: Muat ${muatPerLembar} pcs/lembar. Untuk order ${target} pcs membutuhkan ${lembarButuh} lembar cetak.`
                    )
                  }
                  style={{ width: '100%', marginTop: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin Detail Layout Stiker'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BANNER / M2 */}
          {activeTab === 'banner' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Preset Ukuran Banner:
                </div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => { setM2P('1'); setM2L('1'); }}>1x1 m</button>
                  <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => { setM2P('2'); setM2L('1'); }}>2x1 m</button>
                  <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => { setM2P('3'); setM2L('1'); }}>3x1 m</button>
                  <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '10px', padding: '2px 6px' }} onClick={() => { setM2P('2'); setM2L('3'); }}>2x3 m</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group">
                    <label>Panjang (Meter)</label>
                    <input type="number" value={m2P} onChange={(e) => setM2P(e.target.value)} step="0.01" placeholder="2.5" />
                  </div>
                  <div className="form-group">
                    <label>Lebar (Meter)</label>
                    <input type="number" value={m2L} onChange={(e) => setM2L(e.target.value)} step="0.01" placeholder="1.2" />
                  </div>
                  <div className="form-group">
                    <label>Jumlah Pcs / Buah</label>
                    <input type="number" value={m2Qty} onChange={(e) => setM2Qty(e.target.value)} placeholder="1" />
                  </div>
                  <div className="form-group">
                    <label>Harga per m² (Rp)</label>
                    <input type="number" value={m2Price} onChange={(e) => setM2Price(e.target.value)} placeholder="35000" />
                  </div>
                </div>
              </div>

              {/* Output Banner Card */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Maximize2 size={14} /> HASIL ESTIMASI LUAS BANNER
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Luas Total:</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                        {totalLuasM2.toFixed(2)} <span style={{ fontSize: '10px' }}>m²</span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimasi Total Harga:</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
                        {formatRupiah(totalHargaBanner)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    Ukuran per Pcs: {m2P} x {m2L} m ({luasPerPcs.toFixed(2)} m²)<br />
                    Jumlah: {m2Qty} Pcs | Tarif: {formatRupiah(bprice)} / m²
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    handleCopyResult(
                      `Banner Flexi ${m2P}x${m2L}m (${m2Qty} Pcs) - Luas: ${totalLuasM2.toFixed(2)} m² | Total Est: ${formatRupiah(totalHargaBanner)}`
                    )
                  }
                  style={{ width: '100%', marginTop: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin Detail Luas Banner'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BUKU / JILID */}
          {activeTab === 'buku' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group">
                    <label>Jumlah Oplas (Buku)</label>
                    <input type="number" value={bkQty} onChange={(e) => setBkQty(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Total Halaman Isi</label>
                    <input type="number" value={bkPages} onChange={(e) => setBkPages(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Biaya Cetak per Halaman</label>
                    <input type="number" value={bkCostPage} onChange={(e) => setBkCostPage(e.target.value)} placeholder="200" />
                  </div>
                  <div className="form-group">
                    <label>Cover + Jilid per Buku</label>
                    <input type="number" value={bkCostBind} onChange={(e) => setBkCostBind(e.target.value)} placeholder="6000" />
                  </div>
                </div>
              </div>

              {/* Output Book Card */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} /> HASIL ESTIMASI CETAK BUKU
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Biaya Satuan Buku:</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                        {formatRupiah(hargaPerBuku)}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total ({bkQty} Buku):</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
                        {formatRupiah(totalBiayaBuku)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-main)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    Buku: {bkPages} hal. ({bkp} x {formatRupiah(bkcp)}) + Jilid {formatRupiah(bkcb)}<br />
                    Oplas Cetak: {bkQty} Eksemplar
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    handleCopyResult(
                      `Cetak Buku (${bkPages} Hal) - ${bkQty} Eks @ ${formatRupiah(hargaPerBuku)} | Total: ${formatRupiah(totalBiayaBuku)}`
                    )
                  }
                  style={{ width: '100%', marginTop: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin Detail Estimasi Buku'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
