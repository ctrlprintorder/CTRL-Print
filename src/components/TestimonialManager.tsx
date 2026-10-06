import React, { useState, useEffect } from 'react';
import { CustomerTestimonial, Settings, Invoice, Customer } from '../types';
import {
  saveDocument,
  deleteDocument,
  subscribeCollection,
  saveSettings
} from '../firebaseService';
import { formatDate } from '../utils/date';
import { DEFAULT_TESTIMONIALS } from './CustomerPortal';
import {
  Star,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Filter,
  Check,
  X,
  Save,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

interface TestimonialManagerProps {
  settings: Settings;
  testimonials?: CustomerTestimonial[];
  invoices?: Invoice[];
  customers?: Customer[];
  showToast: (msg: string, isErr?: boolean) => void;
}

export const TestimonialManager: React.FC<TestimonialManagerProps> = ({
  settings,
  testimonials: testimonialsProp,
  invoices = [],
  customers = [],
  showToast
}) => {
  const [testimonials, setTestimonials] = useState<CustomerTestimonial[]>(() => {
    if (testimonialsProp && testimonialsProp.length > 0) return testimonialsProp;
    try {
      let saved = localStorage.getItem('ctrl_print_col_testimonials');
      if (!saved) saved = localStorage.getItem('ctrl_print_testimonials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TESTIMONIALS;
  });

  useEffect(() => {
    if (testimonialsProp && testimonialsProp.length > 0) {
      setTestimonials(testimonialsProp);
    }
  }, [testimonialsProp]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<'all' | '5' | '4plus' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [filterCategory, setFilterCategory] = useState('Semua');

  const [autoFilterLowRating, setAutoFilterLowRating] = useState<boolean>(
    settings.autoFilterLowRating ?? true
  );

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTesti, setEditingTesti] = useState<CustomerTestimonial | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    name: string;
    business: string;
    city: string;
    product: string;
    category: string;
    rating: number;
    comment: string;
    verified: boolean;
    date: string;
    isHidden: boolean;
    invoiceNo: string;
  }>({
    name: '',
    business: '',
    city: '',
    product: '',
    category: 'Stiker & Label',
    rating: 5,
    comment: '',
    verified: true,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    isHidden: false,
    invoiceNo: ''
  });

  // Subscribe to real-time testimonials
  useEffect(() => {
    const unsub = subscribeCollection<CustomerTestimonial>('testimonials', (items) => {
      setTestimonials(items);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Save auto filter setting
  const handleToggleAutoFilter = async (enabled: boolean) => {
    setAutoFilterLowRating(enabled);
    try {
      const updated = { ...settings, autoFilterLowRating: enabled };
      await saveSettings(updated);
      showToast(
        enabled
          ? '🛡️ Filter aktif: Ulasan dengan rating rendah (< 4 bintang) otomatis disembunyikan dari portal pelanggan!'
          : 'Filter dinonaktifkan: Semua ulasan akan ditampilkan sesuai status manual masing-masing.'
      );
    } catch (e: any) {
      showToast('Gagal menyimpan pengaturan filter.', true);
    }
  };

  // Toggle Visibility for single testimonial
  const handleToggleVisibility = async (t: CustomerTestimonial) => {
    const currentHidden = t.isHidden || t.status === 'hidden';
    const updatedTesti: CustomerTestimonial = {
      ...t,
      isHidden: !currentHidden,
      status: !currentHidden ? 'hidden' : 'approved'
    };

    const newItems = testimonials.map((item) => (item.id === t.id ? updatedTesti : item));
    setTestimonials(newItems);
    try {
      localStorage.setItem('ctrl_print_testimonials', JSON.stringify(newItems));
      await saveDocument('testimonials', updatedTesti);
      showToast(
        !currentHidden
          ? `🔒 Ulasan dari "${t.name}" berhasil disembunyikan dari portal pelanggan.`
          : `✅ Ulasan dari "${t.name}" sekarang TAMPIL di portal pelanggan.`
      );
    } catch (err: any) {
      showToast('Gagal mengubah status ulasan.', true);
    }
  };

  // Delete testimonial
  const handleDeleteTestimonial = async (id: string, name: string) => {
    if (!window.confirm(`Hapus ulasan dari "${name}" secara permanen?`)) return;

    const newItems = testimonials.filter((t) => t.id !== id);
    setTestimonials(newItems);
    try {
      localStorage.setItem('ctrl_print_testimonials', JSON.stringify(newItems));
      await deleteDocument('testimonials', id);
      showToast(`🗑️ Ulasan dari "${name}" berhasil dihapus.`);
    } catch (err) {
      showToast('Gagal menghapus ulasan.', true);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (t: CustomerTestimonial) => {
    setEditingTesti(t);
    setFormData({
      name: t.name || '',
      business: t.business || '',
      city: t.city || '',
      product: t.product || '',
      category: t.category || 'Stiker & Label',
      rating: t.rating || 5,
      comment: t.comment || '',
      verified: t.verified ?? true,
      date: t.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      isHidden: !!(t.isHidden || t.status === 'hidden'),
      invoiceNo: t.invoiceNo || ''
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingTesti(null);
    setFormData({
      name: '',
      business: '',
      city: '',
      product: 'Pesanan Cetak Custom',
      category: 'Stiker & Label',
      rating: 5,
      comment: '',
      verified: true,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      isHidden: false,
      invoiceNo: ''
    });
    setIsAddModalOpen(true);
  };

  // Submit Form (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.comment.trim()) {
      showToast('Nama pelanggan dan isi ulasan wajib diisi!', true);
      return;
    }

    const colors = ['#0052FF', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    if (editingTesti) {
      // Edit mode
      const updated: CustomerTestimonial = {
        ...editingTesti,
        name: formData.name.trim(),
        business: formData.business.trim() || undefined,
        city: formData.city.trim() || undefined,
        product: formData.product.trim() || 'Pesanan Cetak Custom',
        category: formData.category,
        rating: Number(formData.rating),
        comment: formData.comment.trim(),
        verified: formData.verified,
        date: formData.date || editingTesti.date,
        isHidden: formData.isHidden,
        status: formData.isHidden ? 'hidden' : 'approved',
        invoiceNo: formData.invoiceNo.trim() || undefined
      };

      const newItems = testimonials.map((t) => (t.id === editingTesti.id ? updated : t));
      setTestimonials(newItems);
      try {
        await saveDocument('testimonials', updated);
        showToast('🎉 Ulasan berhasil diperbarui!');
      } catch {
        showToast('Gagal menyimpan perubahan ulasan.', true);
      }
      setEditingTesti(null);
    } else {
      // Create mode
      const newTesti: CustomerTestimonial = {
        id: `t_${Date.now()}`,
        name: formData.name.trim(),
        business: formData.business.trim() || undefined,
        city: formData.city.trim() || undefined,
        product: formData.product.trim() || 'Pesanan Cetak Custom',
        category: formData.category,
        rating: Number(formData.rating),
        comment: formData.comment.trim(),
        verified: formData.verified,
        date: formData.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        avatarColor: randomColor,
        isHidden: formData.isHidden,
        status: formData.isHidden ? 'hidden' : 'approved',
        invoiceNo: formData.invoiceNo.trim() || undefined
      };

      const newItems = [newTesti, ...testimonials];
      setTestimonials(newItems);
      try {
        await saveDocument('testimonials', newTesti);
        showToast('🎉 Testimoni baru berhasil ditambahkan!');
      } catch {
        showToast('Gagal menambahkan ulasan.', true);
      }
      setIsAddModalOpen(false);
    }
  };

  // Reset to default best 5-star testimonials
  const handleResetDefaults = async () => {
    if (!window.confirm('Muat ulang kumpulan ulasan bawaan (5-Star Curated Testimonials)? Data ulasan bawaan akan dipulihkan.')) return;

    setTestimonials(DEFAULT_TESTIMONIALS);
    try {
      localStorage.setItem('ctrl_print_testimonials', JSON.stringify(DEFAULT_TESTIMONIALS));
      for (const t of DEFAULT_TESTIMONIALS) {
        await saveDocument('testimonials', t);
      }
      showToast('🎉 Kumpulan ulasan bawaan terbaik berhasil dipulihkan!');
    } catch {
      showToast('Gagal memulihkan ulasan bawaan.', true);
    }
  };

  // Filter calculations
  const filteredList = testimonials.filter((t) => {
    const isHidden = t.isHidden || t.status === 'hidden';

    // Status filter
    if (filterStatus === 'visible' && isHidden) return false;
    if (filterStatus === 'hidden' && !isHidden) return false;

    // Rating filter
    if (filterRating === '5' && t.rating !== 5) return false;
    if (filterRating === '4plus' && t.rating < 4) return false;
    if (filterRating === 'low' && t.rating >= 4) return false;

    // Category filter
    if (filterCategory !== 'Semua' && t.category !== filterCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchComment = t.comment.toLowerCase().includes(q);
      const matchProduct = t.product.toLowerCase().includes(q);
      const matchBusiness = (t.business || '').toLowerCase().includes(q);
      const matchCity = (t.city || '').toLowerCase().includes(q);
      const matchInv = (t.invoiceNo || '').toLowerCase().includes(q);
      if (!matchName && !matchComment && !matchProduct && !matchBusiness && !matchCity && !matchInv) return false;
    }

    return true;
  });

  const totalVisible = testimonials.filter((t) => !t.isHidden && t.status !== 'hidden').length;
  const totalHidden = testimonials.filter((t) => t.isHidden || t.status === 'hidden').length;
  const totalLow = testimonials.filter((t) => t.rating < 4).length;
  const avgRating =
    totalVisible > 0
      ? (
          testimonials
            .filter((t) => !t.isHidden && t.status !== 'hidden')
            .reduce((acc, t) => acc + (t.rating || 5), 0) / totalVisible
        ).toFixed(1)
      : '5.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. HEADER CARD & STATS */}
      <div
        className="card"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.4) 0%, var(--bg-card) 60%)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
              <Star size={13} fill="#F59E0B" color="#F59E0B" /> Manajemen &amp; Filter Moderasi Ulasan
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Testimoni &amp; Ulasan Pelanggan
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Saring, edit bintang &amp; komentar, sembunyikan ulasan yang tidak diinginkan, atau tambahkan testimoni kepuasan pelanggan secara manual.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetDefaults}
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Pulihkan testimoni bawaan 5 bintang"
            >
              <RotateCcw size={13} /> Reset Rekomendasi
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Plus size={14} /> Tambah Testimoni Baru
            </button>
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Star size={20} fill="#F59E0B" color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Rata-Rata Rating Portal</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{avgRating} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ 5.0</span></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Eye size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Ulasan Aktif (Tampil)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>{totalVisible} Ulasan</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: totalHidden > 0 ? '#FEE2E2' : '#F1F5F9', color: totalHidden > 0 ? '#DC2626' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <EyeOff size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Disembunyikan (Filter)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: totalHidden > 0 ? '#DC2626' : 'var(--text-main)' }}>{totalHidden} Ulasan</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AUTO-FILTER & PROTECTION SHIELD SETTING */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          background: autoFilterLowRating ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
          border: autoFilterLowRating ? '1.5px solid #10B981' : '1px solid var(--border-color)',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: autoFilterLowRating ? '#10B981' : 'var(--bg-main)',
              color: autoFilterLowRating ? '#FFF' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Proteksi Anti-Review Jelek Otomatis
              {autoFilterLowRating && (
                <span style={{ fontSize: '10px', background: '#10B981', color: '#FFF', padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>
                  AKTIF
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Jika diaktifkan, ulasan pelanggan baru dengan rating rendah (&lt; 4 bintang) akan otomatis <strong>disembunyikan secara instan</strong> sehingga tidak akan tampil di portal publik sebelum diedit/disetujui.
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoFilterLowRating}
              onChange={(e) => handleToggleAutoFilter(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10B981' }}
            />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: autoFilterLowRating ? '#047857' : 'var(--text-main)' }}>
              {autoFilterLowRating ? 'Filter Otomatis Menyala' : 'Aktifkan Filter Otomatis'}
            </span>
          </label>
        </div>
      </div>

      {/* 3. FILTER BAR & SEARCH CONTROLS */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cari nama, komentar, produk, atau kota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                fontSize: '12.5px',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filterStatus === 'all' ? 'var(--primary)' : 'transparent',
                color: filterStatus === 'all' ? '#FFF' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Semua ({testimonials.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('visible')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filterStatus === 'visible' ? '#10B981' : 'transparent',
                color: filterStatus === 'visible' ? '#FFF' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eye size={12} /> Tampil ({totalVisible})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('hidden')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filterStatus === 'hidden' ? '#EF4444' : 'transparent',
                color: filterStatus === 'hidden' ? '#FFF' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <EyeOff size={12} /> Disembunyikan ({totalHidden})
            </button>
          </div>
        </div>

        {/* Rating Pills & Category Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
          {/* Star Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700, alignSelf: 'center', marginRight: '4px' }}>
              Filter Rating:
            </span>
            <button
              type="button"
              onClick={() => setFilterRating('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: filterRating === 'all' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                background: filterRating === 'all' ? 'var(--primary-light)' : 'transparent',
                color: filterRating === 'all' ? 'var(--primary)' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: filterRating === 'all' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              Semua Bintang
            </button>
            <button
              type="button"
              onClick={() => setFilterRating('5')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: filterRating === '5' ? '1px solid #D97706' : '1px solid var(--border-color)',
                background: filterRating === '5' ? '#FEF3C7' : 'transparent',
                color: filterRating === '5' ? '#D97706' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: filterRating === '5' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Star size={12} fill="#F59E0B" color="#F59E0B" /> 5 Bintang Saja
            </button>
            <button
              type="button"
              onClick={() => setFilterRating('4plus')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: filterRating === '4plus' ? '1px solid #059669' : '1px solid var(--border-color)',
                background: filterRating === '4plus' ? '#D1FAE5' : 'transparent',
                color: filterRating === '4plus' ? '#059669' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: filterRating === '4plus' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              ⭐️ 4 Bintang ke Atas
            </button>
            <button
              type="button"
              onClick={() => setFilterRating('low')}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: filterRating === 'low' ? '1px solid #DC2626' : '1px solid var(--border-color)',
                background: filterRating === 'low' ? '#FEE2E2' : 'transparent',
                color: filterRating === 'low' ? '#DC2626' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: filterRating === 'low' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <AlertTriangle size={12} /> Bintang 1-3 ({totalLow})
            </button>
          </div>

          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700 }}>Kategori:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                fontSize: '11.5px',
                color: 'var(--text-main)'
              }}
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Stiker & Label">Stiker &amp; Label</option>
              <option value="Spanduk & Banner">Spanduk &amp; Banner</option>
              <option value="Kartu Nama & Brosur">Kartu Nama &amp; Brosur</option>
              <option value="Kemasan & Souvenir">Kemasan &amp; Souvenir</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. TESTIMONIALS LIST GRID */}
      {filteredList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '14px' }}>
          <MessageSquare size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px auto' }} />
          <h4 style={{ margin: 0, fontSize: '14.5px', color: 'var(--text-main)' }}>Tidak Ada Ulasan Ditemukan</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Coba sesuaikan filter status, rating, atau kata kunci pencarian.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearchQuery('');
              setFilterRating('all');
              setFilterStatus('all');
              setFilterCategory('Semua');
            }}
            style={{ marginTop: '12px', fontSize: '12px' }}
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredList.map((t) => {
            const isHidden = t.isHidden || t.status === 'hidden';

            return (
              <div
                key={t.id}
                className="card"
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  border: isHidden ? '1.5px dashed #EF4444' : '1px solid var(--border-color)',
                  background: isHidden ? 'rgba(239, 68, 68, 0.03)' : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Top Bar: Stars, Date, & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={15}
                          fill={i < t.rating ? '#F59E0B' : 'transparent'}
                          color={i < t.rating ? '#F59E0B' : 'var(--border-color)'}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatDate(t.date)}</span>
                      {isHidden ? (
                        <span
                          style={{
                            fontSize: '10px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <EyeOff size={10} /> DISEMBUNYIKAN
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            background: '#DCFCE7',
                            color: '#16A34A',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Eye size={10} /> TAMPIL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Badge */}
                  <div style={{ marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block'
                      }}
                    >
                      📦 {t.product} ({t.category})
                    </span>
                  </div>

                  {/* Comment Text */}
                  <p
                    style={{
                      margin: '0 0 10px 0',
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                      color: isHidden ? 'var(--text-muted)' : 'var(--text-main)',
                      fontStyle: 'italic'
                    }}
                  >
                    "{t.comment}"
                  </p>
                </div>

                {/* Bottom Section: Customer Info & Action Buttons */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-color)',
                      marginBottom: '10px'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: t.avatarColor || 'var(--primary)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {t.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ fontSize: '12px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.name}
                        </strong>
                        {t.verified && (
                          <CheckCircle2 size={13} style={{ color: '#10B981', flexShrink: 0 }} title="Pembeli Terverifikasi" />
                        )}
                        {t.invoiceNo && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              background: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563EB',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                            title={`Terkait Nota #${t.invoiceNo}`}
                          >
                            #{t.invoiceNo}
                          </span>
                        )}
                      </div>
                      {(t.business || t.city) && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.business ? `${t.business}${t.city ? `, ${t.city}` : ''}` : t.city}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(t)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: isHidden ? '1px solid #10B981' : '1px solid #EF4444',
                        background: isHidden ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: isHidden ? '#059669' : '#DC2626',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                      title={isHidden ? 'Tampilkan di Portal Pelanggan' : 'Sembunyikan dari Portal Pelanggan'}
                    >
                      {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{isHidden ? 'Tampilkan' : 'Sembunyikan'}</span>
                    </button>

                    {/* Edit Review */}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenEdit(t)}
                      style={{ padding: '6px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Edit bintang, nama, atau teks ulasan"
                    >
                      <Edit3 size={13} /> Edit
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTestimonial(t.id, t.name)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: '#EF4444',
                        cursor: 'pointer'
                      }}
                      title="Hapus permanen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: ADD / EDIT TESTIMONIAL */}
      {(isAddModalOpen || editingTesti) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => {
            setIsAddModalOpen(false);
            setEditingTesti(null);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              position: 'relative',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                  <Star size={20} fill="#F59E0B" color="#F59E0B" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    {editingTesti ? 'Edit Ulasan Pelanggan' : 'Tambah Testimoni Pelanggan Baru'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {editingTesti ? 'Ubah rating bintang, kata-kata ulasan, atau nama pembeli' : 'Masukkan testimoni kepuasan pelanggan secara manual'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTesti(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Star Rating Picker */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Rating Bintang Kepuasan: <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Star
                          size={24}
                          fill={star <= formData.rating ? '#F59E0B' : 'transparent'}
                          color={star <= formData.rating ? '#F59E0B' : 'var(--border-color)'}
                        />
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#D97706' }}>
                    {formData.rating === 5 ? '⭐⭐⭐⭐⭐ (Sempurna / 5.0)' : formData.rating === 4 ? '⭐⭐⭐⭐ (Puas / 4.0)' : `${formData.rating} Bintang`}
                  </span>
                </div>
              </div>

              {/* Customer Name & Verified */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nama Pelanggan <span style={{ color: '#EF4444' }}>*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hendra Wijaya"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nama Usaha / Instansi (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Dapur Bunda / PT Maju"
                    value={formData.business}
                    onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* City & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Kota / Wilayah:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Balikpapan / Surabaya"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Kategori Produk:
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '12.5px', color: 'var(--text-main)' }}
                  >
                    <option value="Stiker & Label">Stiker &amp; Label</option>
                    <option value="Spanduk & Banner">Spanduk &amp; Banner</option>
                    <option value="Kartu Nama & Brosur">Kartu Nama &amp; Brosur</option>
                    <option value="Kemasan & Souvenir">Kemasan &amp; Souvenir</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Product Ordered & Invoice No */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nama Produk yang Dipesan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Stiker Vinyl A3+ Kiss Cut / Spanduk Flexi"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    No. Nota Terkait (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-2026-001"
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Comment */}
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 700 }}>
                  Isi Ulasan / Testimoni: <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tulis testimoni ulasan pelanggan..."
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  style={{ fontSize: '12.5px', lineHeight: 1.5 }}
                />
              </div>

              {/* Toggles: Verified & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formData.verified}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    style={{ accentColor: '#10B981' }}
                  />
                  <span>Pembeli Terverifikasi (Verified Buyer)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={formData.isHidden}
                    onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
                    style={{ accentColor: '#EF4444' }}
                  />
                  <span style={{ color: formData.isHidden ? '#DC2626' : 'inherit' }}>
                    Sembunyikan dari Portal
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTesti(null);
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Save size={15} /> {editingTesti ? 'Simpan Perubahan' : 'Tambah Testimoni'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
