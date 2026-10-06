import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  DollarSign,
  Send,
  Share2,
  Copy,
  AlertCircle,
  Package,
  ArrowLeft,
  PhoneCall,
  CreditCard,
  Building2,
  Scissors,
  Palette,
  Truck,
  Mail,
  Instagram,
  ShoppingBag,
  Tag,
  MessageCircle,
  Layers,
  ZoomIn,
  X,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Lock,
  Edit3,
  Save,
  ShieldCheck,
  QrCode,
  Upload,
  Check,
  Calculator,
  Plus,
  Minus,
  ExternalLink,
  ShoppingCart,
  Trash2,
  User as UserIcon,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Ticket,
  FolderKanban,
  Star,
  ThumbsUp,
  Quote,
  Heart,
  Award,
  MessageSquare,
  Store,
  Pause,
  Play,
  LayoutGrid,
  ArrowUp,
  Sparkles
} from 'lucide-react';
import { Invoice, Produk, Settings, Counters, Voucher, CustomerTestimonial } from '../types';
import { saveDocument, saveCounters, subscribeCollection, convertToDirectImageUrl, isInvoiceMatch, fetchDirectInvoice } from '../firebaseService';
import defaultLogoImg from '../assets/images/ctrl_print_logo_1785948969417.jpg';
import { formatRupiah, formatNumber } from '../utils/currency';
import { formatDate } from '../utils/date';
import { openWhatsApp, formatWhatsAppUrl } from '../utils/whatsapp';
import { SyncStatusBadge } from './SyncStatusBadge';
import { AccDesainPage } from './AccDesainPage';
import { GoogleDrivePreviewEmbed } from './GoogleDrivePreviewEmbed';
import { getDriveInfo } from '../utils/googleDrive';
import { uploadFileSmart } from '../lib/googleWorkspace';
import { GoogleDriveUploadProgress, UploadProgressInfo } from './GoogleDriveUploadProgress';
import { generateUniqueInvoiceNumber } from '../utils/idGenerator';
import { RunningAnnouncementBar } from './RunningAnnouncementBar';

export interface CartItem {
  id: string;
  prodId: string;
  nama: string;
  unit: string;
  price: number;
  qty: number;
  specs: string;
  driveUrl: string;
  hpp: number;
  subtotal: number;
}

export const DEFAULT_TESTIMONIALS: CustomerTestimonial[] = [
  {
    id: 't1',
    name: 'Hendra Wijaya',
    business: 'Dapur Bunda Catering',
    city: 'Surabaya',
    product: 'Stiker Kemasan Frozen Food (Vinyl Die-Cut)',
    category: 'Stiker & Label',
    rating: 5,
    comment: 'Hasil cetak stiker vinyl die cut sangat rapi dan tahan freezer/air. Warna tajam sesuai desain mockup. Pengerjaan kilat cuma 1 hari langsung dikirim!',
    date: '14 Feb 2025',
    verified: true,
    avatarColor: '#0052FF'
  },
  {
    id: 't2',
    name: 'Rian Pratama',
    business: 'Kopi Senja Utama',
    city: 'Bandung',
    product: 'Spanduk Banner Grand Opening (Flexi Korea 380g)',
    category: 'Spanduk & Banner',
    rating: 5,
    comment: 'Bahan flexi korea tebal dan warna pekat sekali. Mata ayam terpasang rapi di setiap sudut, packing sangat aman dengan selongsong tebal.',
    date: '10 Feb 2025',
    verified: true,
    avatarColor: '#10B981'
  },
  {
    id: 't3',
    name: 'Sarah Anindita',
    business: 'PT Cahaya Solusindo',
    city: 'Jakarta Selatan',
    product: 'Kartu Nama Art Carton 260g + Laminasi Doff',
    category: 'Kartu Nama & Brosur',
    rating: 5,
    comment: 'Tekstur laminasi doff halus dan terasa sangat premium. Dipakai saat meeting bersama klien langsung terlihat profesional dan bonafide. Recommended!',
    date: '06 Feb 2025',
    verified: true,
    avatarColor: '#8B5CF6'
  },
  {
    id: 't4',
    name: 'dr. Melati Kusuma',
    business: 'Klinik Harmoni Medika',
    city: 'Yogyakarta',
    product: 'Brosur Lipat 3 A4 (Art Paper 150g)',
    category: 'Kartu Nama & Brosur',
    rating: 5,
    comment: 'Hasil lipatan presisi, gambar dan infografis tercetak tajam tanpa blur sama sekali. Respon admin WA juga sangat ramah dan sangat kooperatif.',
    date: '02 Feb 2025',
    verified: true,
    avatarColor: '#EC4899'
  },
  {
    id: 't5',
    name: 'Budi Santoso',
    business: 'Panitia Seminar Nasional ITB',
    city: 'Bandung',
    product: 'Plakat Akrilik Custom & Lanyard ID Card',
    category: 'Kemasan & Souvenir',
    rating: 5,
    comment: 'Cetak UV di akrilik bening jernih dan tebal. Pesan 120 pcs selesai tepat 2 hari sebelum hari-H acara. Kualitas sangat memuaskan!',
    date: '28 Jan 2025',
    verified: true,
    avatarColor: '#F59E0B'
  },
  {
    id: 't6',
    name: 'Nisa Azzahra',
    business: 'Zahra Modest Wear',
    city: 'Malang',
    product: 'Paper Bag Kraft & Hangtag Baju Hijab',
    category: 'Kemasan & Souvenir',
    rating: 5,
    comment: 'Paper bag kraft tebal dengan tali kur rapi dan hangtag gold foil cantik sekali. Kualitas packaging bikin nilai jual produk hijab saya naik kelas.',
    date: '22 Jan 2025',
    verified: true,
    avatarColor: '#06B6D4'
  }
];

interface FlyingCartItem {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  name: string;
  imageUrl?: string;
  qty: number;
}

interface CustomerPortalProps {
  invoices: Invoice[];
  products?: Produk[];
  counters?: Counters;
  settings: Settings;
  testimonials?: CustomerTestimonial[];
  onPrintDoc?: (type: 'A5' | 'TH' | 'DO', inv: Invoice) => void;
  onBackToAdmin?: () => void;
  onOpenStaffLogin?: () => void;
  showToast?: (msg: string, isErr?: boolean) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  invoices,
  products = [],
  counters,
  settings,
  testimonials: testimonialsProp,
  onPrintDoc,
  onBackToAdmin,
  onOpenStaffLogin,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'katalog' | 'lacak' | 'faq' | 'desain'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get('tab');
      const invParam = p.get('inv') || p.get('invNo') || p.get('noInv') || p.get('acc');
      if (tabParam === 'acc-desain' || tabParam === 'desain' || tabParam === 'proofing' || p.get('acc')) {
        return 'desain';
      }
      if (tabParam === 'lacak' || (invParam && !tabParam)) {
        return 'lacak';
      }
      if (tabParam === 'faq') return 'faq';
    }
    return 'katalog';
  });

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('inv') || p.get('invNo') || p.get('noInv') || p.get('acc') || '';
    }
    return '';
  });

  const [hasSearched, setHasSearched] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return Boolean(p.get('inv') || p.get('invNo') || p.get('noInv') || p.get('acc'));
    }
    return false;
  });

  const [searchedQuery, setSearchedQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('inv') || p.get('invNo') || p.get('noInv') || p.get('acc') || '';
    }
    return '';
  });

  const [isDirectLoadingInvoice, setIsDirectLoadingInvoice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return Boolean(p.get('inv') || p.get('invNo') || p.get('noInv') || p.get('acc'));
    }
    return false;
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(() => {
    if (typeof window !== 'undefined' && invoices.length > 0) {
      const p = new URLSearchParams(window.location.search);
      const target = p.get('inv') || p.get('invNo') || p.get('noInv') || p.get('acc');
      if (target) {
        return invoices.find((i) => isInvoiceMatch(i, target)) || null;
      }
    }
    return null;
  });
  const [copied, setCopied] = useState(false);

  // Discreet Staff Login Shortcuts: Alt+L or Ctrl+Shift+L, and 4x Logo clicks
  const logoClickCountRef = useRef(0);
  const logoClickTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disallow triggering inside input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }
      if (
        (e.altKey && (e.key === 'l' || e.key === 'L')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) ||
        (e.metaKey && e.shiftKey && (e.key === 'l' || e.key === 'L'))
      ) {
        e.preventDefault();
        onOpenStaffLogin?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenStaffLogin]);

  const handleLogoClick = () => {
    setActiveTab('katalog');
    if (!onOpenStaffLogin) return;
    logoClickCountRef.current += 1;
    if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);
    if (logoClickCountRef.current >= 4) {
      logoClickCountRef.current = 0;
      onOpenStaffLogin();
    } else {
      logoClickTimerRef.current = setTimeout(() => {
        logoClickCountRef.current = 0;
      }, 1800);
    }
  };

  useEffect(() => {
    // Customer portal initialization
  }, []);

  // Banner Slider setup
  const defaultBanners = [
    {
      id: 'b1',
      badge: 'PROMO SPESIAL CETAK DIGITAL',
      title: 'Digital & Offset Printing Berkualitas',
      highlight: 'Solusi Cetak Cepat & Akurat',
      subtitle: 'Spanduk, Kartu Nama, Brosur, Stiker, Souvenir & Packaging UMKM',
      bgGradient: 'linear-gradient(135deg, #0052FF 0%, #0043D6 55%, #002B99 100%)',
      btnText: 'Belanja Sekarang →',
      category: 'Semua'
    },
    {
      id: 'b2',
      badge: 'EXPRESS OUTDOOR PRINTING',
      title: 'Spanduk & Banner Kilat Siap Kirim',
      highlight: 'Hasil Cetak Tajam & Tahan Cuaca',
      subtitle: 'Bahan Flexi Standard 280g & Korea 380g High Resolution',
      bgGradient: 'linear-gradient(135deg, #0043D6 0%, #0052FF 50%, #1665FF 100%)',
      btnText: 'Cetak Spanduk Kilat →',
      category: 'Spanduk & Banner'
    },
    {
      id: 'b3',
      badge: 'PRODUK BEST SELLER UMKM',
      title: 'Label Stiker & Kemasan Produk',
      highlight: 'Die Cut & Kiss Cut Presisi Tinggi',
      subtitle: 'Bahan Chromo, Vinyl Anti Air, Transparan & Gold Foil',
      bgGradient: 'linear-gradient(135deg, #0A1C40 0%, #0052FF 60%, #1665FF 100%)',
      btnText: 'Order Stiker Custom →',
      category: 'Stiker & Label'
    },
    {
      id: 'b4',
      badge: 'PAKET BRANDING & PROMOSI',
      title: 'Kartu Nama, Brosur & Marketing Kit',
      highlight: 'Kertas Art Carton Premium',
      subtitle: 'Finishing Laminasi Doff / Glossy Tampil Mewah & Terpercaya',
      bgGradient: 'linear-gradient(135deg, #003ECC 0%, #0052FF 50%, #2563EB 100%)',
      btnText: 'Lihat Katalog Promo →',
      category: 'Semua'
    }
  ];

  const customBanners = (settings.headerBanners && settings.headerBanners.length > 0)
    ? settings.headerBanners.map(convertToDirectImageUrl)
    : (settings.headerBannerUrl ? [convertToDirectImageUrl(settings.headerBannerUrl)] : []);

  const totalBannerSlides = customBanners.length > 0 ? customBanners.length : defaultBanners.length;

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (totalBannerSlides <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalBannerSlides);
    }, 5000);
    return () => clearInterval(timer);
  }, [totalBannerSlides]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalBannerSlides);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalBannerSlides) % totalBannerSlides);
  };

  // Catalog filtering states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on outside click or Escape key
  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryMenuOpen]);

  // Testimonials States
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

  // Real-time Firestore sync for testimonials
  useEffect(() => {
    const unsub = subscribeCollection<CustomerTestimonial>('testimonials', (items) => {
      setTestimonials(items);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const [testiCategoryFilter, setTestiCategoryFilter] = useState('Semua');
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [testiViewMode, setTestiViewMode] = useState<'marquee' | 'grid'>('marquee');
  const marqueeTrackRef = useRef<HTMLDivElement>(null);
  const [isAddTestiModalOpen, setIsAddTestiModalOpen] = useState(false);
  const [newTestiName, setNewTestiName] = useState('');
  const [newTestiBusiness, setNewTestiBusiness] = useState('');
  const [newTestiCity, setNewTestiCity] = useState('');
  const [newTestiProduct, setNewTestiProduct] = useState('');
  const [newTestiCategory, setNewTestiCategory] = useState('Stiker & Label');
  const [newTestiRating, setNewTestiRating] = useState(5);
  const [newTestiComment, setNewTestiComment] = useState('');
  const [newTestiInvoiceNo, setNewTestiInvoiceNo] = useState('');

  // Visible testimonials filtered by Admin settings (Auto-filter bad/low reviews or hidden)
  const visibleTestimonials = testimonials.filter((t) => {
    if (t.isHidden || t.status === 'hidden') return false;
    if ((settings.autoFilterLowRating ?? true) && t.rating < 4 && t.status !== 'approved') return false;
    return true;
  });

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestiName.trim() || !newTestiComment.trim()) {
      if (showToast) showToast('Nama dan Ulasan wajib diisi!', true);
      return;
    }

    const colors = ['#0052FF', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const isLowRating = newTestiRating < 4;
    const shouldHide = (settings.autoFilterLowRating ?? true) && isLowRating;

    const newTestimonial: CustomerTestimonial = {
      id: `t_${Date.now()}`,
      name: newTestiName.trim(),
      business: newTestiBusiness.trim() || undefined,
      city: newTestiCity.trim() || undefined,
      product: newTestiProduct.trim() || 'Pesanan Cetak Custom',
      category: newTestiCategory,
      rating: newTestiRating,
      comment: newTestiComment.trim(),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      verified: true,
      avatarColor: randomColor,
      isHidden: shouldHide,
      status: shouldHide ? 'hidden' : 'approved',
      invoiceNo: newTestiInvoiceNo.trim() || undefined
    };

    const updated = [newTestimonial, ...testimonials];
    setTestimonials(updated);

    // Save to Firestore for cross-device sync & Admin moderation
    try {
      await saveDocument('testimonials', newTestimonial);
    } catch {}

    // Reset form & close modal
    setNewTestiName('');
    setNewTestiBusiness('');
    setNewTestiCity('');
    setNewTestiProduct('');
    setNewTestiInvoiceNo('');
    setNewTestiRating(5);
    setNewTestiComment('');
    setIsAddTestiModalOpen(false);

    if (shouldHide) {
      if (showToast) showToast('🎉 Terima kasih! Ulasan Anda telah kami terima untuk diverifikasi.');
    } else {
      if (showToast) showToast('🎉 Terima kasih! Testimoni & ulasan Anda berhasil dipublikasikan.');
    }
  };

  // Shopping Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartNamaCust, setCartNamaCust] = useState('');
  const [cartWaCust, setCartWaCust] = useState('');
  const [cartAlamatCust, setCartAlamatCust] = useState('');
  const [cartCatatan, setCartCatatan] = useState('');
  const [cartDeliveryMethod, setCartDeliveryMethod] = useState<'toko' | 'instan' | 'ekspedisi'>('toko');

  // Interactive Fly-to-Cart Animation States
  const [flyingItems, setFlyingItems] = useState<FlyingCartItem[]>([]);
  const [isCartBumping, setIsCartBumping] = useState(false);
  const [recentAddedBadge, setRecentAddedBadge] = useState<{ show: boolean; text: string } | null>(null);

  const removeFlyingItem = (id: string) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  };

  const triggerFlyAnimation = (
    sourceElemOrEvent?: React.MouseEvent | HTMLElement | null,
    itemInfo?: { name: string; imageUrl?: string; qty?: number }
  ) => {
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (sourceElemOrEvent) {
      if ('clientX' in sourceElemOrEvent && sourceElemOrEvent.clientX > 0) {
        startX = sourceElemOrEvent.clientX;
        startY = sourceElemOrEvent.clientY;
      } else if ('getBoundingClientRect' in sourceElemOrEvent) {
        const rect = (sourceElemOrEvent as HTMLElement).getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
    }

    // Target cart button in header
    let endX = window.innerWidth - 70;
    let endY = 40;
    const cartBtn = document.getElementById('portal-cart-btn');
    if (cartBtn) {
      const cartRect = cartBtn.getBoundingClientRect();
      endX = cartRect.left + cartRect.width / 2;
      endY = cartRect.top + cartRect.height / 2;
    }

    const newFlyId = 'fly_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newFlyingItem: FlyingCartItem = {
      id: newFlyId,
      startX,
      startY,
      endX,
      endY,
      name: itemInfo?.name || 'Produk',
      imageUrl: itemInfo?.imageUrl,
      qty: itemInfo?.qty || 1
    };

    setFlyingItems((prev) => [...prev, newFlyingItem]);

    // Automatically remove after animation completes
    setTimeout(() => {
      removeFlyingItem(newFlyId);
    }, 700);

    // When the flying element reaches the cart (~600ms)
    setTimeout(() => {
      setIsCartBumping(true);
      setRecentAddedBadge({ show: true, text: `+${itemInfo?.qty || 1}` });

      setTimeout(() => {
        setIsCartBumping(false);
      }, 700);

      setTimeout(() => {
        setRecentAddedBadge(null);
      }, 1600);
    }, 600);
  };

  // Quick Payment & Confirmation Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem('ctrl_print_cart');
    } catch {}
  }, []);

  const handleQuickAddToCart = (prod: any, e?: React.MouseEvent) => {
    const priceVal = prod.harga ?? prod.hargaJual ?? 0;
    const unitVal = prod.satuan || 'Pcs';
    const defaultQty = prod.defaultQty || 1;
    const prodDesc = prod.desc || prod.portalNotes || prod.keterangan || '-';

    const newItem: CartItem = {
      id: String(Date.now()),
      prodId: prod.id || '',
      nama: prod.nama,
      unit: unitVal,
      price: priceVal,
      qty: defaultQty,
      specs: prodDesc,
      driveUrl: '',
      hpp: prod.hpp || 0,
      subtotal: priceVal * defaultQty
    };

    setCart((prev) => [...prev, newItem]);
    triggerFlyAnimation(e || (e?.currentTarget as any), {
      name: prod.nama,
      imageUrl: prod.gambar || prod.imageUrl || prod.fotoUrl,
      qty: defaultQty
    });
    if (showToast) showToast(`🛒 "${prod.nama}" masuk ke Keranjang Belanja!`);
  };

  const handleRemoveCartItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const newQty = Math.max(1, i.qty + delta);
          return {
            ...i,
            qty: newQty,
            subtotal: i.price * newQty
          };
        }
        return i;
      })
    );
  };

  const handleAddConfiguredToCart = (e?: React.MouseEvent) => {
    if (!orderProduct) return;
    const priceVal = orderProduct.harga ?? orderProduct.hargaJual ?? 0;
    const unitVal = orderProduct.satuan || 'Pcs';
    const defaultProductDesc = orderProduct.desc || orderProduct.portalNotes || orderProduct.keterangan || '-';

    const newItem: CartItem = {
      id: String(Date.now()),
      prodId: orderProduct.id || '',
      nama: orderProduct.nama,
      unit: unitVal,
      price: priceVal,
      qty: orderQty,
      specs: orderSpecs.trim() || defaultProductDesc,
      driveUrl: orderDriveUrl.trim(),
      hpp: orderProduct.hpp || 0,
      subtotal: priceVal * orderQty
    };

    setCart((prev) => [...prev, newItem]);
    triggerFlyAnimation(e || (e?.currentTarget as any), {
      name: orderProduct.nama,
      imageUrl: orderProduct.gambar || orderProduct.imageUrl || orderProduct.fotoUrl,
      qty: orderQty
    });
    setOrderModalOpen(false);
    if (showToast) showToast(`🛒 "${orderProduct.nama}" ditambahkan ke Keranjang!`);
  };

  // Order Calculator & Online Order Modal States
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderProduct, setOrderProduct] = useState<any | null>(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderSpecs, setOrderSpecs] = useState('');
  const [orderDriveUrl, setOrderDriveUrl] = useState('');
  const [orderUploadMode, setOrderUploadMode] = useState<'file_siap_cetak' | 'butuh_desain'>('file_siap_cetak');
  const [orderDeliveryMethod, setOrderDeliveryMethod] = useState<'toko' | 'instan' | 'ekspedisi'>('toko');
  const [orderNamaCust, setOrderNamaCust] = useState('');
  const [orderWaCust, setOrderWaCust] = useState('');
  const [orderAlamatCust, setOrderAlamatCust] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessInv, setOrderSuccessInv] = useState<Invoice | null>(null);

  // Voucher Integration States
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [cartVoucherCode, setCartVoucherCode] = useState('');
  const [cartAppliedVoucher, setCartAppliedVoucher] = useState<Voucher | null>(null);
  const [cartVoucherDiscount, setCartVoucherDiscount] = useState(0);

  const [orderVoucherCode, setOrderVoucherCode] = useState('');
  const [orderAppliedVoucher, setOrderAppliedVoucher] = useState<Voucher | null>(null);
  const [orderVoucherDiscount, setOrderVoucherDiscount] = useState(0);

  useEffect(() => {
    const unsub = subscribeCollection<Voucher>('vouchers', (data) => {
      setVouchers(data || []);
    });
    return () => unsub();
  }, []);

  const validateVoucherCode = (code: string, subtotal: number) => {
    const targetCode = code.trim().toUpperCase();
    if (!targetCode) return { valid: false, message: 'Kode voucher wajib diisi!' };

    const v = vouchers.find((x) => x.code.toUpperCase() === targetCode);
    if (!v) return { valid: false, message: `Kode voucher "${targetCode}" tidak ditemukan!` };
    if (!v.active) return { valid: false, message: `Voucher "${targetCode}" sedang tidak aktif!` };

    const todayStr = new Date().toISOString().split('T')[0];
    if (v.validFrom && todayStr < v.validFrom) return { valid: false, message: `Voucher "${targetCode}" baru berlaku mulai ${v.validFrom}` };
    if (v.validUntil && todayStr > v.validUntil) return { valid: false, message: `Voucher "${targetCode}" telah kadaluarsa sejak ${v.validUntil}` };

    if (v.quota !== undefined && v.quota > 0 && (v.usedCount || 0) >= v.quota) {
      return { valid: false, message: `Kuota voucher "${targetCode}" sudah habis!` };
    }

    if (v.minTransaction && subtotal < v.minTransaction) {
      return { valid: false, message: `Minimal transaksi ${formatRupiah(v.minTransaction)} untuk voucher ini!` };
    }

    let disc = 0;
    if (v.type === 'nominal') {
      disc = v.value;
    } else {
      disc = Math.round((subtotal * v.value) / 100);
      if (v.maxDiscount && disc > v.maxDiscount) disc = v.maxDiscount;
    }
    disc = Math.min(disc, subtotal);

    return { valid: true, voucher: v, discount: disc, message: `🎉 Voucher "${v.code}" berhasil dipasang! Hemat ${formatRupiah(disc)}` };
  };

  const handleApplyCartVoucher = (codeToApply?: string) => {
    const rawTotal = cart.reduce((acc, i) => acc + i.subtotal, 0);
    const res = validateVoucherCode(codeToApply || cartVoucherCode, rawTotal);
    if (!res.valid) {
      if (showToast) showToast(res.message, true);
      else alert(res.message);
      return;
    }
    setCartAppliedVoucher(res.voucher!);
    setCartVoucherCode(res.voucher!.code);
    setCartVoucherDiscount(res.discount!);
    if (showToast) showToast(res.message);
  };

  const handleRemoveCartVoucher = () => {
    setCartAppliedVoucher(null);
    setCartVoucherCode('');
    setCartVoucherDiscount(0);
    if (showToast) showToast('Voucher dilepas dari keranjang');
  };

  const handleApplyOrderVoucher = (codeToApply?: string) => {
    const priceVal = orderProduct?.harga ?? orderProduct?.hargaJual ?? 0;
    const subtotal = priceVal * orderQty;
    const res = validateVoucherCode(codeToApply || orderVoucherCode, subtotal);
    if (!res.valid) {
      if (showToast) showToast(res.message, true);
      else alert(res.message);
      return;
    }
    setOrderAppliedVoucher(res.voucher!);
    setOrderVoucherCode(res.voucher!.code);
    setOrderVoucherDiscount(res.discount!);
    if (showToast) showToast(res.message);
  };

  const handleRemoveOrderVoucher = () => {
    setOrderAppliedVoucher(null);
    setOrderVoucherCode('');
    setOrderVoucherDiscount(0);
    if (showToast) showToast('Voucher dilepas');
  };

  const handleCheckoutCartOnline = async () => {
    if (cart.length === 0) return;
    if (!cartNamaCust.trim()) {
      alert('Silakan isi Nama Pemesan!');
      return;
    }
    if (!cartWaCust.trim()) {
      alert('Silakan isi Nomor WhatsApp!');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const yearMonth = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const nextWebNum = counters?.nextWebInvNumber || 1;
      const nextWebInvNo = `WEB-${yearMonth}-${String(nextWebNum).padStart(3, '0')}`;

      const items = cart.map((c) => {
        const itemDrive = getDriveInfo(c.driveUrl);
        return {
          prodId: c.prodId,
          nama: c.nama,
          desc: (c.specs || '-') + (c.driveUrl ? ` | Link File: ${c.driveUrl}` : ''),
          qty: c.qty,
          satuan: c.unit,
          hpp: c.hpp || 0,
          harga: c.price,
          diskon: 0,
          subtotal: c.subtotal,
          drive_file_id: itemDrive.drive_file_id || undefined,
          drive_view_url: itemDrive.drive_view_url || undefined,
          drive_embed_url: itemDrive.drive_embed_url || undefined,
          fileUrl: itemDrive.drive_view_url || (c.driveUrl ? c.driveUrl.trim() : undefined)
        };
      });

      const totalHPP = cart.reduce((acc, c) => acc + (c.hpp || 0) * c.qty, 0);
      const rawSubtotal = cart.reduce((acc, c) => acc + c.subtotal, 0);
      const grandTotal = Math.max(rawSubtotal - cartVoucherDiscount, 0);
      const firstCartDrive = cart.find(c => Boolean(c.driveUrl))?.driveUrl;
      const mainDriveInfo = getDriveInfo(firstCartDrive);

      const deliveryLabel = 
        cartDeliveryMethod === 'toko' ? '🏬 Ambil di Toko' :
        cartDeliveryMethod === 'instan' ? '🛵 Kurir Instan (Gojek/Grab/Lalamove)' : '📦 Ekspedisi Luar Kota';

      const fullAlamat = `[Metode: ${deliveryLabel}] ${cartAlamatCust.trim()}${cartCatatan.trim() ? ` (Catatan: ${cartCatatan.trim()})` : ''}`.trim();

      const newInv: Invoice = {
        id: String(Date.now()),
        tipeDoc: 'WebOrder',
        isWebVerified: false,
        noInv: nextWebInvNo,
        tglInv: new Date().toISOString().split('T')[0],
        tempoInv: new Date().toISOString().split('T')[0],
        namaCust: cartNamaCust.trim(),
        waCust: cartWaCust.trim(),
        alamatCust: fullAlamat,
        items: items,
        diskonTambahan: 0,
        voucherCode: cartAppliedVoucher?.code || cartVoucherCode || '',
        voucherDiscount: cartVoucherDiscount,
        totalHPP: totalHPP,
        grandTotal: grandTotal,
        dibayar: 0,
        sisaTertagih: grandTotal,
        statusBayar: 'Menunggu Verifikasi Admin',
        statusJob: 'Menunggu Verifikasi',
        estimasiPengerjaan: '1-3 Hari Kerja (Menunggu Konfirmasi)',
        accDesainUrl: mainDriveInfo.drive_view_url || (firstCartDrive ? firstCartDrive.trim() : undefined),
        drive_file_id: mainDriveInfo.drive_file_id || undefined,
        drive_view_url: mainDriveInfo.drive_view_url || undefined,
        drive_embed_url: mainDriveInfo.drive_embed_url || undefined,
        fileUrl: mainDriveInfo.drive_view_url || (firstCartDrive ? firstCartDrive.trim() : undefined),
        accDesainStatus: firstCartDrive ? 'Menunggu ACC' : undefined,
        historyBayar: []
      };

      await saveDocument('invoice', newInv);
      if (cartAppliedVoucher) {
        await saveDocument('vouchers', {
          ...cartAppliedVoucher,
          usedCount: (cartAppliedVoucher.usedCount || 0) + 1
        });
      }

      if (counters) {
        await saveCounters({
          ...counters,
          nextWebInvNumber: nextWebNum + 1
        });
      }

      setCart([]);
      setIsCartOpen(false);
      handleRemoveCartVoucher();
      setOrderSuccessInv(newInv);
      setOrderModalOpen(true);

      if (showToast) showToast(`Pesanan #${nextWebInvNo} berhasil dikirim. Status: Menunggu Verifikasi Admin.`);
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Gagal mengirim pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCheckoutCartWA = () => {
    if (cart.length === 0) return;
    const waPhone = settings.phone ? settings.phone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = waPhone.startsWith('0') ? '62' + waPhone.slice(1) : waPhone;
    const rawSubtotal = cart.reduce((acc, c) => acc + c.subtotal, 0);
    const grandTotal = Math.max(rawSubtotal - cartVoucherDiscount, 0);

    let msg = `*PESANAN KERANJANG CETAK - ${settings.company || 'CTRL PRINT'}*\n\n`;
    msg += `*Rincian Item (${cart.length} Jenis Produk):*\n`;

    cart.forEach((c, idx) => {
      msg += `${idx + 1}. *${c.nama}*\n`;
      msg += `   • Qty: ${formatNumber(c.qty)} ${c.unit}\n`;
      msg += `   • Harga: ${formatRupiah(c.price)} / ${c.unit}\n`;
      msg += `   • Subtotal: ${formatRupiah(c.subtotal)}\n`;
      if (c.specs) msg += `   • Spesifikasi: ${c.specs}\n`;
      if (c.driveUrl) msg += `   • Link File: ${c.driveUrl}\n`;
      msg += `\n`;
    });

    const deliveryLabel = 
      cartDeliveryMethod === 'toko' ? '🏬 Ambil di Toko / Workshop' :
      cartDeliveryMethod === 'instan' ? '🛵 Kurir Instan (Gojek/Grab/Lalamove - COD Ongkir)' : '📦 Ekspedisi Luar Kota (JNE/J&T/Kargo)';

    if (cartVoucherDiscount > 0) {
      msg += `*Diskon Voucher Promo (${cartVoucherCode}): -${formatRupiah(cartVoucherDiscount)}*\n`;
    }
    msg += `*ESTIMASI GRAND TOTAL: ${formatRupiah(grandTotal)}*\n\n`;
    msg += `*Metode Pengambilan:* ${deliveryLabel}\n`;
    msg += `*Data Pemesan:*\n`;
    msg += `• Nama: ${cartNamaCust.trim() || '-'}\n`;
    msg += `• No. WA: ${cartWaCust.trim() || '-'}\n`;
    if (cartAlamatCust.trim()) msg += `• Alamat/Catatan: ${cartAlamatCust.trim()}\n`;

    msg += `\nMohon petunjuk ketersediaan & pembayarannya ya. Terima kasih! 🙏`;

    openWhatsApp(settings.phone, msg);
  };

  // Admin Portal Editing States
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editingDescText, setEditingDescText] = useState('');

  const isAdmin = Boolean(onBackToAdmin);

  // All matching invoices based on current search query
  const matchingInvoices = React.useMemo(() => {
    if (!searchedQuery.trim() || !hasSearched) return [];
    return invoices.filter((inv) => isInvoiceMatch(inv, searchedQuery));
  }, [invoices, searchedQuery, hasSearched]);

  // Keep selected invoice synchronized with latest real-time invoices list from props
  const activeInvoice = selectedInvoice
    ? invoices.find(
        (i) => i.id === selectedInvoice.id || isInvoiceMatch(i, selectedInvoice.noInv)
      ) || selectedInvoice
    : (matchingInvoices.length > 0 ? matchingInvoices[0] : null);

  useEffect(() => {
    // Read query params from URL
    const params = new URLSearchParams(window.location.search);
    const invNo = params.get('inv') || params.get('invNo') || params.get('noInv') || params.get('acc');
    const tabParam = params.get('tab');

    if (tabParam === 'katalog' || tabParam === 'order') {
      setActiveTab(tabParam === 'order' ? 'order_online' : 'katalog');
    } else if (tabParam === 'acc-desain' || tabParam === 'desain' || tabParam === 'proofing' || params.get('acc')) {
      setActiveTab('desain');
    }

    if (invNo) {
      if (invoices.length > 0) {
        const found = invoices.find((i) => isInvoiceMatch(i, invNo));
        if (found) {
          setSelectedInvoice(found);
          setSearchQuery(found.noInv);
          setSearchedQuery(found.noInv);
          setHasSearched(true);
          setIsDirectLoadingInvoice(false);
          if (tabParam === 'acc-desain' || tabParam === 'desain' || tabParam === 'proofing' || params.get('acc')) {
            setActiveTab('desain');
          } else {
            setActiveTab('lacak');
          }
          return;
        }
      }

      // Fast direct query to Firestore if not found in current props
      fetchDirectInvoice(invNo)
        .then((directInv) => {
          if (directInv) {
            setSelectedInvoice(directInv);
            setSearchQuery(directInv.noInv);
            setSearchedQuery(directInv.noInv);
            setHasSearched(true);
            if (tabParam === 'acc-desain' || tabParam === 'desain' || tabParam === 'proofing' || params.get('acc')) {
              setActiveTab('desain');
            } else {
              setActiveTab('lacak');
            }
          }
        })
        .finally(() => {
          setIsDirectLoadingInvoice(false);
        });
    } else {
      setIsDirectLoadingInvoice(false);
    }
  }, [invoices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setHasSearched(true);
    setSearchedQuery(q);

    const matched = invoices.filter((inv) => isInvoiceMatch(inv, q));

    if (matched.length > 0) {
      setSelectedInvoice(matched[0]);
    } else {
      setSelectedInvoice(null);
    }
  };

  const [buktiBayarInputUrl, setBuktiBayarInputUrl] = useState('');
  const [isBuktiInputOpen, setIsBuktiInputOpen] = useState(false);
  const [isUploadingBukti, setIsUploadingBukti] = useState(false);
  const [buktiUploadProgress, setBuktiUploadProgress] = useState<UploadProgressInfo>({
    status: 'idle',
    percent: 0,
    fileName: ''
  });

  const handleBrowseAndUploadBukti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeInvoice) return;

    try {
      setIsUploadingBukti(true);
      setBuktiUploadProgress({
        status: 'uploading',
        percent: 5,
        fileName: file.name
      });
      if (showToast) showToast(`Mengunggah "${file.name}" ke Google Drive...`, false);

      const safeInvNo = (activeInvoice.noInv || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uploadFileName = `Bukti_Transfer_${safeInvNo}_${timestamp}_${file.name}`;

      const uploaded = await uploadFileSmart(file, uploadFileName, {
        invoiceNo: activeInvoice.noInv,
        customerName: activeInvoice.namaCust,
        category: 'bukti_transfer_customer',
        onProgress: (pct) => {
          setBuktiUploadProgress(prev => ({
            ...prev,
            status: 'uploading',
            percent: pct
          }));
        }
      });

      setBuktiUploadProgress({
        status: 'success',
        percent: 100,
        fileName: file.name,
        viewUrl: uploaded.viewUrl
      });

      setBuktiBayarInputUrl(uploaded.viewUrl);

      // Otomatis simpan ke invoice
      const updated: Invoice = {
        ...activeInvoice,
        buktiBayarUrl: uploaded.viewUrl,
        tglBuktiBayar: new Date().toLocaleString('id-ID'),
        catatanBuktiBayar: uploaded.isGoogleDrive
          ? `Diupload langsung ke Google Drive (${uploaded.name})`
          : `Lampiran Bukti Transfer (${uploaded.name})`
      };
      await saveDocument('invoice', updated);
      setSelectedInvoice(updated);
      setIsBuktiInputOpen(false);

      if (showToast) showToast('🎉 Berhasil upload & simpan bukti transfer ke Google Drive!');
    } catch (err: any) {
      console.error('Error uploading bukti:', err);
      setBuktiUploadProgress({
        status: 'error',
        percent: 0,
        fileName: file.name,
        errorMessage: err.message || 'Gagal upload file bukti transfer ke Google Drive.'
      });
      if (showToast) showToast(err.message || 'Gagal upload file bukti transfer.', true);
    } finally {
      setIsUploadingBukti(false);
      // Reset input value to allow re-upload of same file name
      e.target.value = '';
    }
  };

  const [isUploadingOrderFile, setIsUploadingOrderFile] = useState(false);
  const [orderUploadProgress, setOrderUploadProgress] = useState<UploadProgressInfo>({
    status: 'idle',
    percent: 0,
    fileName: ''
  });

  const handleUploadOrderFileToDrive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingOrderFile(true);
      setOrderUploadProgress({
        status: 'uploading',
        percent: 5,
        fileName: file.name
      });
      if (showToast) showToast(`Mengunggah file desain "${file.name}" ke Google Drive...`, false);

      const safeProdName = (orderProduct?.nama || 'Item').replace(/[^a-zA-Z0-9-_]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uploadFileName = `Desain_${safeProdName}_${timestamp}_${file.name}`;

      const uploaded = await uploadFileSmart(file, uploadFileName, {
        customerName: orderNamaCust,
        category: 'desain_acc',
        onProgress: (pct) => {
          setOrderUploadProgress(prev => ({
            ...prev,
            status: 'uploading',
            percent: pct
          }));
        }
      });

      setOrderUploadProgress({
        status: 'success',
        percent: 100,
        fileName: file.name,
        viewUrl: uploaded.viewUrl
      });

      setOrderDriveUrl(uploaded.viewUrl);
      if (showToast) showToast('🎉 File desain berhasil diunggah ke Google Drive!');
    } catch (err: any) {
      console.error('Error uploading order file:', err);
      setOrderUploadProgress({
        status: 'error',
        percent: 0,
        fileName: file.name,
        errorMessage: err.message || 'Gagal upload file desain.'
      });
      if (showToast) showToast(err.message || 'Gagal upload file desain.', true);
    } finally {
      setIsUploadingOrderFile(false);
      e.target.value = '';
    }
  };

  const handleSaveBuktiBayarUrl = async () => {
    if (!activeInvoice) return;
    const trimmed = buktiBayarInputUrl.trim();
    if (!trimmed) {
      if (showToast) showToast('Masukkan link Google Drive / URL bukti transfer terlebih dahulu!', true);
      return;
    }
    const driveInfo = getDriveInfo(trimmed);
    const updated: Invoice = {
      ...activeInvoice,
      buktiBayarUrl: driveInfo.drive_view_url || trimmed,
      tglBuktiBayar: new Date().toLocaleString('id-ID'),
      catatanBuktiBayar: 'Diupload oleh Pelanggan via Google Drive Link'
    };
    await saveDocument('invoice', updated);
    setSelectedInvoice(updated);
    setIsBuktiInputOpen(false);
    setBuktiBayarInputUrl('');
    if (showToast) showToast('✅ Link bukti transfer Google Drive berhasil dikirim!');
  };

  const handleOpenOrderModal = (prod: any) => {
    setOrderProduct(prod);
    setOrderQty(prod.defaultQty || 1);
    setOrderSpecs(prod.desc || prod.portalNotes || prod.keterangan || '');
    setOrderDriveUrl('');
    handleRemoveOrderVoucher();
    setOrderSuccessInv(null);
    setOrderModalOpen(true);
  };

  const handleSendOrderWA = () => {
    const waPhone = settings.phone ? settings.phone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = waPhone.startsWith('0') ? '62' + waPhone.slice(1) : waPhone;
    const priceVal = orderProduct?.harga ?? orderProduct?.hargaJual ?? 0;
    const unitVal = orderProduct?.satuan || 'Pcs';
    const subtotal = priceVal * orderQty;
    const grandTotal = Math.max(subtotal - orderVoucherDiscount, 0);

    const deliveryLabel = 
      orderDeliveryMethod === 'toko' ? '🏬 Ambil di Toko / Workshop' :
      orderDeliveryMethod === 'instan' ? '🛵 Kurir Instan (Gojek/Grab/Lalamove - COD Ongkir)' : '📦 Ekspedisi Luar Kota (JNE/J&T/Kargo)';

    let msg = `*PESANAN CETAK ONLINE - ${settings.company || 'CTRL PRINT'}*\n\n`;
    msg += `• *Produk:* ${orderProduct?.nama || 'Custom Order'}\n`;
    msg += `• *Jumlah:* ${formatNumber(orderQty)} ${unitVal}\n`;
    msg += `• *Subtotal:* ${formatRupiah(subtotal)}\n`;
    if (orderVoucherDiscount > 0) {
      msg += `• *Diskon Voucher (${orderVoucherCode}):* -${formatRupiah(orderVoucherDiscount)}\n`;
    }
    msg += `• *Estimasi Total:* ${formatRupiah(grandTotal)}\n`;
    if (orderSpecs.trim()) msg += `• *Spesifikasi / Brief:* ${orderSpecs.trim()}\n`;
    if (orderDriveUrl.trim()) msg += `• *Link File Cetak:* ${orderDriveUrl.trim()}\n`;
    else if (orderUploadMode === 'butuh_desain') msg += `• *Status Desain:* Butuh Jasa Desain / Setting dari Toko\n`;
    
    msg += `\n*Metode Pengambilan:* ${deliveryLabel}\n`;
    msg += `*Data Pemesan:*\n`;
    msg += `• Nama: ${orderNamaCust.trim() || '-'}\n`;
    msg += `• No. WA: ${orderWaCust.trim() || '-'}\n`;
    if (orderAlamatCust.trim()) msg += `• Alamat / Catatan: ${orderAlamatCust.trim()}\n`;

    msg += `\nMohon informasi & petunjuk pembayarannya ya. Terima kasih! 🙏`;

    openWhatsApp(settings.phone, msg);
  };

  const handleCreateOnlineDraftOrder = async () => {
    if (!orderNamaCust.trim()) {
      alert('Silakan isi Nama Pemesan!');
      return;
    }
    if (!orderWaCust.trim()) {
      alert('Silakan isi Nomor WhatsApp Pemesan!');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const { number: nextInvNo, nextCounter } = generateUniqueInvoiceNumber('WebOrder', invoices, counters?.nextWebInvNumber || 1);

      const priceVal = orderProduct?.harga ?? orderProduct?.hargaJual ?? 0;
      const unitVal = orderProduct?.satuan || 'Pcs';
      const subtotal = priceVal * orderQty;
      const grandTotal = Math.max(subtotal - orderVoucherDiscount, 0);

      const deliveryLabel = 
        orderDeliveryMethod === 'toko' ? '🏬 Ambil di Toko' :
        orderDeliveryMethod === 'instan' ? '🛵 Kurir Instan (Gojek/Grab/Lalamove)' : '📦 Ekspedisi Luar Kota';

      let specDetail = orderSpecs.trim() || (orderProduct?.desc || orderProduct?.portalNotes || orderProduct?.keterangan || '-');
      if (orderDriveUrl.trim()) {
        specDetail += ` | File Link: ${orderDriveUrl.trim()}`;
      } else if (orderUploadMode === 'butuh_desain') {
        specDetail += ` | [Butuh Jasa Desain/Setting]`;
      }

      const finalDriveUrl = orderDriveUrl.trim();
      const singleDriveInfo = getDriveInfo(finalDriveUrl);

      const fullAlamat = `[Metode: ${deliveryLabel}] ${orderAlamatCust.trim()}`.trim();

      const newInv: Invoice = {
        id: String(Date.now()),
        tipeDoc: 'WebOrder',
        isWebVerified: false,
        noInv: nextInvNo,
        tglInv: new Date().toISOString().split('T')[0],
        tempoInv: new Date().toISOString().split('T')[0],
        namaCust: orderNamaCust.trim(),
        waCust: orderWaCust.trim(),
        alamatCust: fullAlamat,
        accDesainUrl: singleDriveInfo.drive_view_url || (finalDriveUrl || undefined),
        drive_file_id: singleDriveInfo.drive_file_id || undefined,
        drive_view_url: singleDriveInfo.drive_view_url || undefined,
        drive_embed_url: singleDriveInfo.drive_embed_url || undefined,
        fileUrl: singleDriveInfo.drive_view_url || (finalDriveUrl || undefined),
        accDesainStatus: finalDriveUrl ? 'Menunggu ACC' : undefined,
        items: [
          {
            prodId: orderProduct?.id || '',
            nama: orderProduct?.nama || 'Custom Order Cetak',
            desc: specDetail,
            qty: orderQty,
            satuan: unitVal,
            hpp: orderProduct?.hpp || 0,
            harga: priceVal,
            diskon: 0,
            subtotal: subtotal,
            drive_file_id: singleDriveInfo.drive_file_id || undefined,
            drive_view_url: singleDriveInfo.drive_view_url || undefined,
            drive_embed_url: singleDriveInfo.drive_embed_url || undefined,
            fileUrl: singleDriveInfo.drive_view_url || (finalDriveUrl || undefined)
          }
        ],
        diskonTambahan: 0,
        voucherCode: orderAppliedVoucher?.code || orderVoucherCode || '',
        voucherDiscount: orderVoucherDiscount,
        totalHPP: (orderProduct?.hpp || 0) * orderQty,
        grandTotal: grandTotal,
        dibayar: 0,
        sisaTertagih: grandTotal,
        statusBayar: 'Menunggu Verifikasi Admin',
        statusJob: 'Menunggu Verifikasi',
        estimasiPengerjaan: '1-3 Hari Kerja (Menunggu Konfirmasi)',
        historyBayar: []
      };

      await saveDocument('invoice', newInv);
      if (orderAppliedVoucher) {
        await saveDocument('vouchers', {
          ...orderAppliedVoucher,
          usedCount: (orderAppliedVoucher.usedCount || 0) + 1
        });
      }
      if (counters) {
        await saveCounters({
          ...counters,
          nextWebInvNumber: nextCounter
        });
      }

      setOrderSuccessInv(newInv);

      if (showToast) showToast(`Pesanan #${nextInvNo} berhasil dibuat. Status: Menunggu Verifikasi Admin.`);
    } catch (err) {
      console.error('Failed to create online order:', err);
      alert('Gagal membuat pesanan online. Silakan coba lagi.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleShowPortal = async (prod: any) => {
    const updated = {
      ...prod,
      showInPortal: prod.showInPortal === false ? true : false
    };
    await saveDocument('produk', updated);
    if (showToast) showToast(`Status tampilan portal produk ${prod.nama} diperbarui!`);
  };

  const handleStartEditDesc = (prod: any) => {
    setEditingProdId(prod.id);
    setEditingDescText(prod.desc || prod.portalNotes || prod.keterangan || '');
  };

  const handleSaveDesc = async (prod: any) => {
    const updated = {
      ...prod,
      desc: editingDescText.trim()
    };
    await saveDocument('produk', updated);
    setEditingProdId(null);
    if (showToast) showToast('Deskripsi produk berhasil diperbarui!');
  };

  const getStepProgress = (statusJob?: string) => {
    const s = (statusJob || '').toLowerCase().trim();
    if (['pending', 'pesanan masuk', 'antrian', 'baru', 'menunggu verifikasi'].includes(s)) return 1;
    if (['desain', 'proses desain', 'layout', 'setting'].includes(s)) return 2;
    if (['produksi', 'cetak', 'sedang dicetak', 'proses cetak'].includes(s)) return 3;
    if (['finishing', 'potong', 'laminasi'].includes(s)) return 4;
    if (['selesai', 'siap kirim', 'siap diambil', 'siap ambil', 'selesai siap ambil'].includes(s)) return 5;
    return 1;
  };

  const handleCopyLink = () => {
    if (!activeInvoice) return;
    const url = `${window.location.origin}${window.location.pathname}?inv=${activeInvoice.noInv}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContactWA = () => {
    if (!activeInvoice) return;
    const rawMsg = `Halo ${settings.company || 'CTRL PRINT'}, saya mau konfirmasi/tanya terkait pesanan No. Nota: ${activeInvoice.noInv} an. ${activeInvoice.namaCust}.`;
    openWhatsApp(settings.phone, rawMsg);
  };

  const currentStep = activeInvoice ? getStepProgress(activeInvoice.statusJob) : 0;

  const steps = [
    { title: 'Pesanan Masuk', desc: 'Order & File Diterima', icon: FileText },
    { title: 'Setting / Desain', desc: 'Pengecekan Layout', icon: Palette },
    { title: 'Sedang Dicetak', desc: 'Proses Cetak Mesin', icon: Printer },
    { title: 'Finishing', desc: 'Potong / Laminasi', icon: Scissors },
    { title: 'Selesai', desc: 'Pesanan Selesai', icon: CheckCircle2 }
  ];

  // Categories list
  const categories = useMemo(() => {
    const defaultPresets = [
      'Digital A3+',
      'Outdoor Banner',
      'Indoor Display',
      'Stiker & Decal',
      'Offset & Sablon',
      'Merchandise & Souvenir',
      'Finishing & Jilid'
    ];
    const fromProducts = products
      .map((p: any) => (p.kategori || p.tipe || '').trim())
      .filter(Boolean);
    const catSet = new Set<string>();
    fromProducts.forEach((c) => catSet.add(c));
    defaultPresets.forEach((c) => catSet.add(c));
    return ['Semua', ...Array.from(catSet)];
  }, [products]);

  const filteredProducts = products.filter((p: any) => {
    if (!isAdmin && p.showInPortal === false) return false;
    const pCat = p.kategori || p.tipe || 'Lainnya';
    const pDesc = p.desc || p.portalNotes || p.keterangan || '';
    const matchCat = selectedCategory === 'Semua' || pCat === selectedCategory;
    const matchQuery =
      !catalogSearch.trim() ||
      p.nama.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      pDesc.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchQuery;
  });

  const totalCartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalCartAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="customer-portal-container">
      
      {/* 1. TOP HEADER BAR (Stays in its place at top, scrolls with document) */}
      <header className="customer-portal-header">
        <div className="customer-portal-header-top-row">
          {/* Brand Logo & Name (4x click opens staff login) */}
          <div className="customer-portal-brand" onClick={handleLogoClick}>
            {settings.logoUrl ? (
              <img
                src={convertToDirectImageUrl(settings.logoUrl)}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="customer-portal-logo"
                style={{
                  height: '38px',
                  width: '38px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  padding: '2px',
                  flexShrink: 0
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultLogoImg;
                }}
              />
            ) : (
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #0052FF 0%, #0043D6 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 82, 255, 0.2)', flexShrink: 0 }}>
                <Printer size={18} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                <h2 className="font-heading portal-brand-name" style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {settings.company || 'CTRL PRINT'}
                </h2>
                <SyncStatusBadge compact />
              </div>
              <span className="portal-brand-tagline" style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {settings.tagline || 'Percetakan & Digital Printing'}
              </span>
            </div>
          </div>

          {/* Search Bar Center (Sejajar dengan Logo dan Tombol Aksi) */}
          <div className="customer-portal-search">
            <input
              type="text"
              id="customer-portal-search-input"
              placeholder="Cari produk cetak... (Spanduk, Stiker, Brosur)"
              value={catalogSearch}
              onChange={(e) => {
                setCatalogSearch(e.target.value);
                if (activeTab !== 'katalog') setActiveTab('katalog');
              }}
              style={{
                width: '100%',
                padding: '8px 36px 8px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                fontSize: '12px',
                color: 'var(--text-main)',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-xs)',
                height: '38px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setActiveTab('katalog')}
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'var(--primary, #2563EB)',
                color: '#FFF',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              title="Cari"
            >
              <Search size={13} />
            </button>
          </div>

          {/* Right Actions Bar */}
          <div className="customer-portal-actions">
            {onBackToAdmin ? (
              <button
                type="button"
                className="btn btn-outline btn-sm portal-staff-btn"
                onClick={onBackToAdmin}
                style={{ fontSize: '11.5px', borderRadius: '9999px', padding: '6px 10px' }}
              >
                <ArrowLeft size={13} /> <span className="portal-btn-label">Back to POS</span>
              </button>
            ) : onOpenStaffLogin && (settings.staffLoginVisibility === 'normal') ? (
              <button
                type="button"
                id="btn-open-staff-login"
                className="portal-staff-btn"
                onClick={onOpenStaffLogin}
                style={{
                  border: '1.5px solid #2563EB',
                  background: 'rgba(37, 99, 235, 0.08)',
                  color: '#2563EB',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title="Masuk ke Sistem POS & Kasir Toko"
              >
                <ShieldCheck size={14} style={{ color: '#2563EB' }} /> <span className="portal-btn-label">Login Staf</span>
              </button>
            ) : null}

            {/* Cart Widget Button */}
            <div style={{ position: 'relative' }}>
              {recentAddedBadge?.show && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '0',
                    background: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.45)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 60,
                    animation: 'float-up-fade 0.85s ease-out forwards',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Check size={11} strokeWidth={3} /> {recentAddedBadge.text} Masuk!
                </div>
              )}

              <button
                type="button"
                id="portal-cart-btn"
                className={`portal-cart-btn ${isCartBumping ? 'cart-bumping' : ''}`}
                onClick={() => setIsCartOpen(true)}
                style={{
                  background: cart.length > 0 ? '#EFF6FF' : 'var(--bg-main)',
                  border: cart.length > 0 ? '1.5px solid #3B82F6' : '1px solid var(--border-color)',
                  borderRadius: '9999px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: cart.length > 0 ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
                  flexShrink: 0
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ShoppingCart size={16} style={{ color: cart.length > 0 ? '#2563EB' : 'var(--text-main)' }} />
                  {cart.length > 0 && (
                    <span
                      className={isCartBumping ? 'cart-badge-popping' : ''}
                      style={{
                        position: 'absolute',
                        top: '-7px',
                        right: '-9px',
                        background: '#EF4444',
                        color: '#FFF',
                        fontSize: '9px',
                        fontWeight: 800,
                        borderRadius: '10px',
                        padding: '1px 4px',
                        border: '1.5px solid #FFF'
                      }}
                    >
                      {cart.length}
                    </span>
                  )}
                </div>
                <div className="portal-cart-text" style={{ textAlign: 'left', lineHeight: '1.2' }}>
                  <span style={{ fontSize: '8.5px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                    Keranjang ({cart.length})
                  </span>
                  <span className="font-heading" style={{ fontSize: '11px', fontWeight: 800, color: cart.length > 0 ? '#1D4ED8' : 'var(--text-main)' }}>
                    {formatRupiah(totalCartAmount)}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* RUNNING ANNOUNCEMENT BAR (Between Header & Category/Subnav) */}
      <RunningAnnouncementBar
        enabled={settings.enableRunningText !== false}
        content={settings.runningTextContent}
        badge={settings.runningTextBadge}
        speed={settings.runningTextSpeed}
      />

      {/* 2. SUB NAVIGATION BAR (Kategori & Quick Links) */}
      <nav className="customer-portal-subnav">
        {/* Category Dropdown Pill (Outside scroll container to prevent clipping) */}
        <div ref={categoryMenuRef} className="customer-portal-cat-wrapper">
          <button
            type="button"
            className={`customer-portal-tab-btn customer-portal-cat-btn ${isCategoryMenuOpen ? 'active-open' : ''}`}
            onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
            aria-expanded={isCategoryMenuOpen}
            title="Pilih Kategori Produk"
          >
            <Layers size={15} />
            <span>Kategori</span>
            <ChevronDown
              size={14}
              style={{
                transform: isCategoryMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </button>

          {isCategoryMenuOpen && (
            <div className="customer-portal-cat-dropdown">
              <div
                style={{
                  padding: '6px 10px 6px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--text-muted, #64748B)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--border-color, #E2E8F0)',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Kategori Produk</span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {categories.length - 1} Kategori
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '280px', overflowY: 'auto' }}>
                {categories.map((cat) => {
                  const count =
                    cat === 'Semua'
                      ? products.length
                      : products.filter((p: any) => (p.kategori || p.tipe || 'Lainnya') === cat).length;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setActiveTab('katalog');
                        setIsCategoryMenuOpen(false);
                      }}
                      className={`customer-portal-cat-dropdown-item ${isSelected ? 'selected' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary, #2563EB)' : 'var(--border-color, #CBD5E1)',
                            flexShrink: 0
                          }}
                        />
                        <span>{cat}</span>
                      </div>
                      {count > 0 && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: isSelected ? '#DBEAFE' : 'var(--bg-main, #F1F5F9)',
                            color: isSelected ? '#1E40AF' : 'var(--text-muted, #64748B)'
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Divider between Kategori and tabs */}
        <div className="customer-portal-subnav-divider" />

        <div className="customer-portal-subnav-scroll">

          <button
            type="button"
            className={`customer-portal-tab-btn ${activeTab === 'katalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('katalog')}
          >
            <ShoppingBag size={15} />
            <span>Katalog &amp; Belanja</span>
          </button>

          <button
            type="button"
            className={`customer-portal-tab-btn ${activeTab === 'desain' ? 'active' : ''}`}
            onClick={() => setActiveTab('desain')}
          >
            <Palette size={15} />
            <span>Portal ACC Desain</span>
          </button>

          <button
            type="button"
            className={`customer-portal-tab-btn ${activeTab === 'lacak' ? 'active' : ''}`}
            onClick={() => setActiveTab('lacak')}
          >
            <Search size={15} />
            <span>Lacak Status Order</span>
          </button>

          <button
            type="button"
            className={`customer-portal-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            <HelpCircle size={15} />
            <span>FAQ &amp; Panduan</span>
          </button>
        </div>
      </nav>

      {/* 3. HERO PROMO BANNER SLIDER (CAROUSEL) - SHOWN ON KATALOG TAB */}
      {activeTab === 'katalog' && (
        <div className="customer-portal-hero-banner">
          {/* Active Banner Slide */}
          {customBanners.length > 0 ? (
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0F172A',
                overflow: 'hidden'
              }}
            >
              <img
                src={customBanners[currentSlide % customBanners.length]}
                alt="Header Banner"
                referrerPolicy="no-referrer"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '380px',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'opacity 0.4s ease'
                }}
              />
            </div>
          ) : (
            <div
              className="customer-portal-hero-content"
              style={{
                background: defaultBanners[currentSlide % defaultBanners.length].bgGradient
              }}
            >
              {/* Promo Badge */}
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFF',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontFamily: 'Plus Jakarta Sans, sans-serif'
                }}
              >
                {defaultBanners[currentSlide % defaultBanners.length].badge}
              </span>

              {/* Title & Subtitle */}
              <h1 className="customer-portal-hero-title font-heading">
                {defaultBanners[currentSlide % defaultBanners.length].title}
              </h1>
              <p className="customer-portal-hero-subtitle">
                {defaultBanners[currentSlide % defaultBanners.length].subtitle}
              </p>

              {/* CTA Button */}
              <button
                type="button"
                className="customer-portal-hero-btn"
                onClick={() => {
                  setSelectedCategory(defaultBanners[currentSlide % defaultBanners.length].category);
                  const catalogEl = document.getElementById('product-catalog-grid');
                  if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {defaultBanners[currentSlide % defaultBanners.length].btnText}
              </button>
            </div>
          )}

          {/* Circular Navigation Chevrons - Shown if there are multiple slides */}
          {totalBannerSlides > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevSlide}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 10
                }}
                title="Banner Sebelumnya"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                type="button"
                onClick={handleNextSlide}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 10
                }}
                title="Banner Selanjutnya"
              >
                <ChevronRight size={22} />
              </button>

              {/* Slide Indicator Dots */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 10
                }}
              >
                {Array.from({ length: totalBannerSlides }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    style={{
                      width: idx === (currentSlide % totalBannerSlides) ? '22px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: idx === (currentSlide % totalBannerSlides) ? '#FFF' : 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 1: KATALOG PRODUK & PRICELIST */}
      {activeTab === 'katalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Catalog Controls Card */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={16} /> Katalog Produk Cetak & Pricelist
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Pilih produk cetak di bawah ini. Klik <strong>"Pesan & Hitung Biaya"</strong> untuk menghitung harga & pesan langsung!
                </p>
              </div>

              {/* Search Bar Catalog */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Cari nama / ket produk..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 28px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    fontSize: '11.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: selectedCategory === cat ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    background: selectedCategory === cat ? 'var(--primary-light)' : 'var(--bg-main)',
                    color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Tag size={11} /> {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Package size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>
                {products.length === 0 ? 'Belum Ada Produk Tersedia' : 'Produk Tidak Ditemukan'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {products.length === 0
                  ? 'Katalog produk saat ini belum diisi oleh pihak toko.'
                  : 'Coba ubah kata kunci pencarian atau kategori yang dipilih.'}
              </p>
            </div>
          ) : (
            <div
              id="product-catalog-grid"
              className="product-catalog-grid"
            >
              {filteredProducts.map((p: any) => {
                const pPrice = p.harga ?? p.hargaJual ?? 0;
                const pCat = p.tipe || p.kategori || 'Lainnya';
                const pDesc = p.desc || p.keterangan || '';
                const pUnit = p.satuan || 'Pcs';
                const img = convertToDirectImageUrl(p.imageUrl || p.gambarUrl || '');

                return (
                  <div
                    key={p.id}
                    className="card product-catalog-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '0',
                      overflow: 'hidden',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      background: 'var(--bg-card, #FFFFFF)'
                    }}
                  >
                    {/* Compact Image Container with 4:3 Aspect Ratio */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '4 / 3',
                        background: '#0F172A',
                        overflow: 'hidden',
                        cursor: img ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        if (img) setSelectedProductModal(p);
                      }}
                    >
                      {img ? (
                        <>
                          <img
                            src={img}
                            alt={p.nama}
                            referrerPolicy="no-referrer"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.35s ease'
                            }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(15, 23, 42, 0.75)',
                              backdropFilter: 'blur(6px)',
                              color: '#FFF',
                              padding: '3px 7px',
                              borderRadius: '14px',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                            }}
                          >
                            <ZoomIn size={11} /> Lihat
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                            gap: '4px',
                            background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
                            padding: '10px',
                            textAlign: 'center'
                          }}
                        >
                          <ShoppingBag size={28} style={{ opacity: 0.5, color: '#94A3B8' }} />
                          <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#CBD5E1', opacity: 0.8 }}>
                            {settings.company || 'CTRL PRINT'}
                          </span>
                        </div>
                      )}

                      {/* Category Badge Overlay */}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          left: '6px',
                          fontSize: '9px',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          fontWeight: 800,
                          letterSpacing: '0.4px',
                          background: 'rgba(37, 99, 235, 0.9)',
                          color: '#FFFFFF',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}
                      >
                        {pCat}
                      </span>
                    </div>

                    {/* Card Content Body */}
                    <div className="product-catalog-card-body" style={{ padding: '10px 11px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        {/* Admin Controls Bar if in Admin Mode */}
                        {isAdmin && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '3px 6px', borderRadius: '5px', marginBottom: '6px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <ShieldCheck size={11} /> Admin
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleShowPortal(p)}
                              style={{
                                border: 'none',
                                background: p.showInPortal !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: p.showInPortal !== false ? '#10B981' : '#EF4444',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Klik untuk tampilkan/sembunyikan dari katalog pelanggan"
                            >
                              {p.showInPortal !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                              <span>{p.showInPortal !== false ? 'Tampil' : 'Sembunyi'}</span>
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Satuan: {pUnit}
                          </span>
                          {isAdmin && editingProdId !== p.id && (
                            <button
                              type="button"
                              onClick={() => handleStartEditDesc(p)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                              title="Edit Deskripsi Produk"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                        </div>

                        <h4 className="font-heading" style={{ margin: '0 0 3px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={p.nama}>
                          {p.nama}
                        </h4>

                        {/* Inline Description Editing for Admin */}
                        {isAdmin && editingProdId === p.id ? (
                          <div style={{ marginBottom: '8px' }}>
                            <textarea
                              rows={2}
                              value={editingDescText}
                              onChange={(e) => setEditingDescText(e.target.value)}
                              style={{ width: '100%', fontSize: '11px', padding: '5px', borderRadius: '6px', border: '1px solid var(--accent-blue)', marginBottom: '4px' }}
                              placeholder="Tulis deskripsi produk..."
                            />
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setEditingProdId(null)}
                                style={{ fontSize: '9.5px', padding: '2px 6px' }}
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveDesc(p)}
                                style={{ fontSize: '9.5px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Save size={11} /> Simpan
                              </button>
                            </div>
                          </div>
                        ) : pDesc ? (
                          <p
                            style={{
                              margin: '0 0 6px 0',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              lineHeight: 1.35,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {pDesc}
                          </p>
                        ) : (
                          <p style={{ margin: '0 0 6px 0', fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Spesifikasi & kualitas terjamin.
                          </p>
                        )}
                      </div>

                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Mulai Dari:</span>
                          <span className="font-heading" style={{ fontSize: '13px', fontWeight: 800, color: '#047857' }}>
                            {formatRupiah(pPrice)}
                            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}> /{pUnit}</span>
                          </span>
                        </div>

                        {/* Store Action Buttons */}
                        <div className="product-catalog-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={(e) => handleQuickAddToCart(p, e)}
                            style={{
                              justifyContent: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '5px 4px',
                              fontWeight: 700,
                              fontSize: '10.5px',
                              borderRadius: '7px',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-main)',
                              whiteSpace: 'nowrap'
                            }}
                            title="Tambah langsung ke Keranjang Belanja"
                          >
                            <Plus size={12} /> +Keranjang
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenOrderModal(p)}
                            style={{
                              justifyContent: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '5px 4px',
                              fontWeight: 700,
                              fontSize: '10.5px',
                              borderRadius: '7px',
                              background: 'var(--primary)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <ShoppingCart size={12} /> Pesan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: TESTIMONI CUSTOMER / ULASAN PELANGGAN SETIA                      */}
          {/* ========================================================================= */}
          <div
            id="customer-testimonials-section"
            className="card"
            style={{
              marginTop: '12px',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            {/* Header Testimoni */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Star size={13} fill="#F59E0B" color="#F59E0B" /> Testimoni &amp; Ulasan Nyata
                </div>
                <h3 className="font-heading" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Apa Kata Pelanggan Kami?</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Pengalaman nyata ribuan pelanggan yang mempercayakan kebutuhan cetak bisnis &amp; personal di {settings.company || 'CTRL PRINT'}.
                </p>
              </div>

              {/* Action Button: Tulis Testimoni */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAddTestiModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  boxShadow: '0 4px 12px rgba(0, 82, 255, 0.2)'
                }}
              >
                <Plus size={15} /> Tulis Ulasan / Testimoni Anda
              </button>
            </div>

            {/* Score & Highlights Banner */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', flexShrink: 0 }}>
                  <Star size={24} fill="#F59E0B" color="#F59E0B" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    {visibleTestimonials.length > 0
                      ? (visibleTestimonials.reduce((acc, t) => acc + (t.rating || 5), 0) / visibleTestimonials.length).toFixed(1)
                      : '5.0'} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>/ 5.0</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Berdasarkan <strong>{visibleTestimonials.length} ulasan</strong> terverifikasi
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', flexShrink: 0 }}>
                  <ThumbsUp size={22} color="#16A34A" />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    99.8% Kepuasan
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Cepat, presisi, &amp; warna akurat
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
                  <Award size={22} color="#2563EB" />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    100% Garansi
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Jaminan cetak ulang bila cacat
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonials Category Filter & Marquee Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['Semua', 'Stiker & Label', 'Spanduk & Banner', 'Kartu Nama & Brosur', 'Kemasan & Souvenir'].map((cat) => {
                  const count = cat === 'Semua' ? visibleTestimonials.length : visibleTestimonials.filter(t => t.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTestiCategoryFilter(cat)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: testiCategoryFilter === cat ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        background: testiCategoryFilter === cat ? 'var(--primary-light)' : 'transparent',
                        color: testiCategoryFilter === cat ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: testiCategoryFilter === cat ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Marquee & View Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {testiViewMode === 'marquee' && (
                  <button
                    type="button"
                    onClick={() => setIsMarqueePaused(!isMarqueePaused)}
                    className="btn btn-outline btn-sm"
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={isMarqueePaused ? 'Lanjutkan Putar Marquee' : 'Jeda Gerakan Marquee'}
                  >
                    {isMarqueePaused ? <Play size={12} /> : <Pause size={12} />}
                    <span>{isMarqueePaused ? 'Putar' : 'Jeda'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTestiViewMode(testiViewMode === 'marquee' ? 'grid' : 'marquee')}
                  className="btn btn-outline btn-sm"
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title={testiViewMode === 'marquee' ? 'Buka semua dalam format grid' : 'Kembali ke mode geser 1 baris'}
                >
                  <LayoutGrid size={12} />
                  <span>{testiViewMode === 'marquee' ? 'Mode Grid' : 'Mode Marquee'}</span>
                </button>
              </div>
            </div>

            {/* Hint Notice */}
            {testiViewMode === 'marquee' && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span><strong>Ulasan Pelanggan:</strong> Arahkan kursor atau sentuh kartu ulasan untuk menjeda dan membaca.</span>
              </div>
            )}

            {/* Testimonials Display (Marquee or Grid) */}
            {(() => {
              const displayTestimonials = visibleTestimonials.filter(
                (t) => testiCategoryFilter === 'Semua' || t.category === testiCategoryFilter
              );

              if (displayTestimonials.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                    <MessageSquare size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Belum ada ulasan untuk kategori ini</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Jadilah yang pertama menuliskan ulasan untuk produk ini!</div>
                  </div>
                );
              }

              // Card Renderer
              const renderCard = (t: CustomerTestimonial, key: string, isMarquee = false) => (
                <div
                  key={key}
                  className={isMarquee ? 'testimonial-card-marquee' : ''}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                    ...(isMarquee ? {} : { height: '100%' })
                  }}
                >
                  <div>
                    {/* Header: Stars & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            fill={i < t.rating ? '#F59E0B' : 'transparent'}
                            color={i < t.rating ? '#F59E0B' : 'var(--border-color)'}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{t.date}</span>
                    </div>

                    {/* Product Tag */}
                    <div style={{ marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}
                      >
                        📦 {t.product}
                      </span>
                    </div>

                    {/* Comment Text with Quotes */}
                    <p
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: 'var(--text-main)',
                        margin: '0 0 12px 0',
                        fontStyle: 'normal',
                        display: '-webkit-box',
                        WebkitLineClamp: isMarquee ? 3 : 6,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      "{t.comment}"
                    </p>
                  </div>

                  {/* Footer: User Identity & Verified Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed var(--border-color)'
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
                        fontSize: '11.5px',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {t.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <strong style={{ fontSize: '11.5px', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {t.name}
                        </strong>
                        {t.verified && (
                          <CheckCircle2 size={12} style={{ color: '#10B981', flexShrink: 0 }} title="Pembeli Terverifikasi" />
                        )}
                        {t.invoiceNo && (
                          <span
                            style={{
                              fontSize: '9px',
                              background: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563EB',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                            title={`Ulasan dari Nota: ${t.invoiceNo}`}
                          >
                            #{t.invoiceNo}
                          </span>
                        )}
                      </div>
                      {(t.business || t.city) && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {t.business ? `${t.business}${t.city ? `, ${t.city}` : ''}` : t.city}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );

              // 1. Marquee Auto-Scroll Mode (Default: 1 compact row)
              if (testiViewMode === 'marquee') {
                let baseList = [...displayTestimonials];
                while (baseList.length < 5) {
                  baseList = [...baseList, ...displayTestimonials];
                }
                const marqueeItems = [...baseList, ...baseList];
                const duration = Math.max(28, Math.min(80, (marqueeItems.length / 2) * 5));

                return (
                  <div className="testimonial-marquee-wrapper">
                    <div
                      className={`testimonial-marquee-track ${isMarqueePaused ? 'is-paused' : ''}`}
                      style={{ animationDuration: `${duration}s` }}
                    >
                      {marqueeItems.map((t, idx) => renderCard(t, `marquee-${t.id}-${idx}`, true))}
                    </div>
                  </div>
                );
              }

              // 2. Full Grid Mode (Expanded)
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '14px'
                  }}
                >
                  {displayTestimonials.map((t, idx) => renderCard(t, `grid-${t.id}-${idx}`, false))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* DIRECT DEEP-LINK LOADING INDICATOR */}
      {isDirectLoadingInvoice && !activeInvoice && (
        <div
          style={{
            maxWidth: '520px',
            margin: '40px auto',
            padding: '36px 24px',
            background: 'var(--card-bg, #FFFFFF)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '3px solid rgba(37, 99, 235, 0.15)',
              borderTopColor: '#2563EB',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16.5px', fontWeight: 800, color: 'var(--text-main)' }}>
              Membuka Dokumen {activeTab === 'desain' ? 'ACC Desain' : 'Pesanan'} #{searchQuery || '...'}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Menghubungkan langsung ke server CTRL PRINT Cloud...
            </p>
          </div>
        </div>
      )}

      {/* VIEW: ACC DESAIN PORTAL */}
      {activeTab === 'desain' && (
        <div style={{ marginTop: '10px' }}>
          <AccDesainPage
            invoices={invoices}
            settings={settings}
            showToast={showToast || (() => {})}
            isAdmin={false}
            customerInvoice={activeInvoice}
            onClearCustomerInvoice={() => setSelectedInvoice(null)}
          />
        </div>
      )}

      {/* VIEW 2: FAQ & PANDUAN CETAK */}
      {activeTab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={22} /> Panduan & Pertanyaan Umum (FAQ)
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Informasi lengkap seputar pemesanan online, format file cetak, lama pengerjaan, dan pengiriman.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} /> Format File Apakah yang Diterima?
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Kami menerima format file <strong>PDF, TIFF, CDR, AI, PSD, PNG, & JPG</strong> beresolusi tinggi (minimal 300 DPI) dengan mode warna <strong>CMYK</strong> untuk hasil cetak warna paling presisi.
                </p>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Berapa Lama Proses Cetak?
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Proses cetak standar berkisar <strong>1 hari kerja</strong> tergantung pada jenis bahan, volume pesanan, dan tingkat kesulitan finishing (laminasi, die cut, lipat, dll).
                </p>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={16} /> Bagaimana Cara Memesan Cetak?
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Pilih produk favorit Anda di menu <strong>Katalog & Belanja</strong>, klik <strong>"+ Keranjang"</strong> atau <strong>"Hitung & Beli"</strong> untuk menyesuaikan ukuran & spesifikasi, lalu selesaikan pesanan secara langsung!
                </p>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} /> Layanan Pengiriman & Pengambilan
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Pesanan yang sudah selesai dicetak dapat diambil langsung di outlet toko kami atau dikirim melalui kurir instan (Gojek / Grab) maupun ekspedisi pengiriman seluruh Indonesia.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: LACAK STATUS ORDER & NOTA */}
      {activeTab === 'lacak' && (
        <>
          {/* Search Card */}
          <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} /> Lacak Status Progres & Nota Digital
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Masukkan Nomor Nota (contoh: <strong>INV-202608-001</strong>) atau Nomor WhatsApp Anda di bawah ini:
            </p>

            <form onSubmit={handleSearch}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Ketik Nomor Nota / No. WA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '12px 20px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Search size={16} /> Cari Order
                </button>
              </div>
            </form>
          </div>

          {/* Multiple Matching Invoices Selector Bar */}
          {matchingInvoices.length > 1 && (
            <div className="card" style={{ padding: '16px', marginBottom: '20px', background: 'var(--bg-main)', border: '1px solid var(--primary)' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Ditemukan {matchingInvoices.length} nota pesanan untuk "{searchedQuery}". Silakan pilih nota yang ingin dilacak:
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {matchingInvoices.map((inv) => {
                  const isSelected = activeInvoice?.id === inv.id || activeInvoice?.noInv === inv.noInv;
                  return (
                    <button
                      key={inv.id || inv.noInv}
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-card, #FFF)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        textAlign: 'left'
                      }}
                    >
                      <div><strong>{inv.noInv}</strong> ({formatDate(inv.tglInv)})</div>
                      <div style={{ fontSize: '11px', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', marginTop: '2px' }}>
                        {inv.namaCust} • {formatRupiah(inv.grandTotal)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result Card */}
          {activeInvoice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Step Progress Tracker Card */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Status Pengerjaan Pesanan
                      </span>
                      {activeInvoice.statusJob && activeInvoice.statusJob !== 'Selesai' && (
                        <span className="status-live-dot" style={{ background: '#0052FF' }} title="Pengerjaan Aktif" />
                      )}
                    </div>
                    <h3 style={{ margin: '3px 0 0 0', fontSize: '18px', fontWeight: 800, color: activeInvoice.statusJob === 'Selesai' ? '#10B981' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {activeInvoice.statusJob === 'Selesai' ? <CheckCircle2 size={20} style={{ color: '#10B981' }} /> : null}
                      {activeInvoice.statusJob || 'Pending'}
                    </h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${activeInvoice.statusBayar === 'Paid' || activeInvoice.statusBayar === 'Lunas' ? 'badge-paid' : 'badge-unpaid'}`}>
                      {activeInvoice.statusBayar === 'Paid' || activeInvoice.statusBayar === 'Lunas' ? 'LUNAS' : `SISA TAGIHAN: ${formatRupiah(activeInvoice.sisaTertagih)}`}
                    </span>
                  </div>
                </div>

                {(activeInvoice.statusJob === 'Menunggu Verifikasi' || activeInvoice.statusBayar === 'Menunggu Verifikasi Admin') && (
                  <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '12.5px', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} /> Pesanan Sedang Diverifikasi Admin
                    </div>
                    Pesanan Anda telah kami terima dan sedang dalam tahap verifikasi file & kalkulasi biaya tambahan oleh tim admin. Rincian final & tagihan pembayaran akan langsung diperbarui di halaman ini begitu verifikasi selesai.
                  </div>
                )}

                {/* Progress Bar Timeline with Animated Track */}
                <div className="tracking-steps-container" style={{ position: 'relative', marginTop: '14px', marginBottom: '10px' }}>
                  {/* Background Track Line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '10%',
                      right: '10%',
                      height: '4px',
                      background: 'var(--border-color)',
                      borderRadius: '2px',
                      zIndex: 0
                    }}
                  >
                    {/* Active Progress Fill with Smooth Transition */}
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(0, Math.min(100, ((currentStep - 1) / 4) * 100))}%`,
                        background: currentStep >= 5 ? '#10B981' : 'linear-gradient(90deg, #10B981 0%, #0052FF 100%)',
                        borderRadius: '2px',
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  </div>

                  <div className="tracking-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', position: 'relative', zIndex: 1 }}>
                    {steps.map((st, idx) => {
                      const stepNum = idx + 1;
                      const isDone = currentStep > stepNum;
                      const isCurrent = currentStep === stepNum;
                      const IconComp = st.icon;

                      return (
                        <div key={st.title} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                          <div
                            className={isCurrent ? (stepNum === 5 ? 'status-step-done-ring' : 'status-step-active-ring') : ''}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: isCurrent ? (stepNum === 5 ? '#10B981' : 'var(--primary)') : isDone ? '#10B981' : 'var(--bg-main)',
                              color: isCurrent || isDone ? '#FFF' : 'var(--text-muted)',
                              border: isCurrent
                                ? (stepNum === 5 ? '2px solid #10B981' : '2px solid var(--primary)')
                                : isDone
                                ? '2px solid #10B981'
                                : '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 8px auto',
                              transition: 'all 0.3s ease',
                              cursor: 'default'
                            }}
                          >
                            <div className={isCurrent ? 'status-animate-icon' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isDone ? <CheckCircle2 size={20} /> : <IconComp size={20} />}
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? (stepNum === 5 ? '#10B981' : 'var(--primary)') : 'var(--text-main)' }}>
                            {st.title}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'none' }}>
                            {st.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invoice Main Details */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nomor Dokumen:</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>{activeInvoice.noInv}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tanggal Transaksi:</span>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatDate(activeInvoice.tglInv)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimasi Pengerjaan:</span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {activeInvoice.estimasiPengerjaan || '1-3 Hari Kerja'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nama Pelanggan:</span>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{activeInvoice.namaCust}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No. WhatsApp:</span>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{activeInvoice.waCust || '-'}</div>
                  </div>
                </div>

                {/* Item List Table */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Rincian Item Pesanan
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Item / Layanan</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Harga</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInvoice.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px' }}>
                              <div style={{ fontWeight: 700 }}>{item.nama}</div>
                              {item.desc && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.desc}</div>}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty} {item.satuan}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatRupiah(item.harga)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{formatRupiah(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Footer */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', fontSize: '13px' }}>
                    <div>Total Tagihan: <strong>{formatRupiah(activeInvoice.grandTotal)}</strong></div>
                    <div>Sudah Dibayar: <strong style={{ color: '#10B981' }}>{formatRupiah(activeInvoice.dibayar)}</strong></div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: activeInvoice.sisaTertagih <= 0 ? '#10B981' : '#EF4444' }}>
                      Sisa Belum Dibayar: {formatRupiah(Math.max(activeInvoice.sisaTertagih, 0))}
                    </div>
                  </div>
                </div>

                {/* Integrated ACC Desain & Proofing File Section for Customer */}
                {(activeInvoice.accDesainUrl || activeInvoice.fileUrl || activeInvoice.proofImageUrl || activeInvoice.accDesainStatus) && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1.5px solid var(--primary-light, #3B82F6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} /> File ACC Desain & Proofing Cetak
                      </h4>
                      <span className={`badge ${
                        activeInvoice.accDesainStatus === 'ACC Disetujui' || activeInvoice.proofStatus === 'approved' ? 'badge-paid' :
                        activeInvoice.accDesainStatus === 'Minta Revisi' || activeInvoice.proofStatus === 'rejected' ? 'badge-unpaid' : 'badge-pending'
                      }`}>
                        {activeInvoice.accDesainStatus || (activeInvoice.proofStatus === 'approved' ? 'ACC Disetujui' : activeInvoice.proofStatus === 'rejected' ? 'Minta Revisi' : 'Menunggu ACC')}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Silakan periksa ejaan, warna, ukuran, dan tata letak gambar proofing di bawah ini. Jika sudah sesuai, klik <strong>"ACC SETUJU - SIAP CETAK"</strong> agar pesanan langsung masuk ke antrean mesin cetak.
                    </p>

                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                      {(activeInvoice.accDesainUrl || activeInvoice.drive_view_url || activeInvoice.fileUrl) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <GoogleDrivePreviewEmbed
                            url={activeInvoice.accDesainUrl || activeInvoice.drive_view_url || activeInvoice.fileUrl}
                            fileId={activeInvoice.drive_file_id}
                            height="450px"
                            showFallbackButton={true}
                            emptyMessage="File proofing sedang disiapkan oleh desainer admin."
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                          File proofing sedang disiapkan oleh desainer admin. Mohon ditunggu.
                        </div>
                      )}

                      {activeInvoice.accDesainNotes && (
                        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', fontSize: '11.5px', color: 'var(--text-main)' }}>
                          <strong>Catatan Desainer:</strong> {activeInvoice.accDesainNotes}
                        </div>
                      )}
                    </div>

                    {/* Action buttons: Hidden if design is already approved / ACC Disetujui */}
                    {(activeInvoice.accDesainStatus === 'ACC Disetujui' || activeInvoice.accDesainStatus === 'Disetujui' || activeInvoice.accDesainStatus === 'ACC' || activeInvoice.accDesainStatus === 'Siap Cetak' || activeInvoice.proofStatus === 'approved') ? (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: '#ECFDF5',
                          border: '1.5px solid #10B981',
                          color: '#065F46',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
                        }}
                      >
                        <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                        <span>Desain telah di-ACC &amp; disetujui (Siap Cetak). Pesanan sedang diproses ke antrean cetak. Terima kasih!</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={async () => {
                            const updated = {
                              ...activeInvoice,
                              accDesainStatus: 'ACC Disetujui',
                              proofStatus: 'approved',
                              statusJob: 'Produksi',
                              proofApprovedAt: new Date().toLocaleString('id-ID')
                            };
                            await saveDocument('invoice', updated);
                            if (showToast) showToast('🎉 Desain berhasil di-ACC! Pesanan siap masuk ke antrean cetak.');
                          }}
                          style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <CheckCircle2 size={16} /> ACC SETUJU - SIAP CETAK
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={async () => {
                            const note = prompt('Masukkan catatan revisi desain (apa yang ingin diubah/diperbaiki):');
                            if (note) {
                              const updated = {
                                ...activeInvoice,
                                accDesainStatus: 'Minta Revisi',
                                proofStatus: 'rejected',
                                accDesainNotes: `[Revisi Customer]: ${note}`
                              };
                              await saveDocument('invoice', updated);
                              if (showToast) showToast(' Catatan revisi berhasil dikirim ke desainer!');
                            }
                          }}
                          style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Edit3 size={16} /> MINTA REVISI DESAIN
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Bukti Pembayaran Section */}
                {activeInvoice.sisaTertagih > 0 && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={16} /> Konfirmasi Pembayaran & Transfer
                    </h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Gunakan rekening resmi atau QRIS toko di bawah ini, lalu upload foto/screenshot bukti transfer untuk diperiksa kasir.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>REKENING BANK:</span>
                        <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px', whiteSpace: 'pre-line' }}>
                          {settings.bank || 'Sesuai instruksi toko'}
                        </div>
                      </div>

                      {settings.qrisUrl && (
                        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={settings.qrisUrl} alt="QRIS" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '4px' }} />
                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>QRIS STATIS:</span>
                            <div style={{ fontSize: '11px', fontWeight: 700 }}>{settings.qrisNms || settings.company}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Google Drive Direct Upload & Link Input for Bukti Transfer */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* 1. Direct Browse & Upload to Google Drive */}
                        <label
                          className="btn btn-primary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: isUploadingBukti ? 'not-allowed' : 'pointer',
                            opacity: isUploadingBukti ? 0.7 : 1,
                            background: 'linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)',
                            border: 'none',
                            color: '#FFF'
                          }}
                        >
                          <Upload size={14} />
                          <span>{isUploadingBukti ? 'Mengunggah ke Google Drive...' : '📁 Browse File / Foto Bukti Transfer (Auto Google Drive)'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleBrowseAndUploadBukti}
                            disabled={isUploadingBukti}
                            style={{ display: 'none' }}
                          />
                        </label>

                        {/* 2. Toggle Manual Link Input */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setIsBuktiInputOpen(!isBuktiInputOpen)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>{isBuktiInputOpen ? 'Tutup Tempel Link' : '🔗 Tempel Link Manual'}</span>
                        </button>

                        {activeInvoice.buktiBayarUrl && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Bukti Transfer Terhubung ({activeInvoice.tglBuktiBayar || 'Tersedia'})
                            </span>
                            <a
                              href={activeInvoice.buktiBayarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline btn-xs"
                              style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <ExternalLink size={11} /> Lihat di Google Drive
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Upload Progress Bar for Bukti Transfer */}
                      {buktiUploadProgress.status !== 'idle' && (
                        <div style={{ marginTop: '6px' }}>
                          <GoogleDriveUploadProgress
                            info={buktiUploadProgress}
                            onDismiss={() => setBuktiUploadProgress({ status: 'idle', percent: 0, fileName: '' })}
                          />
                        </div>
                      )}

                      {isBuktiInputOpen && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', background: 'var(--bg-card)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Tempel link Google Drive / URL bukti transfer..."
                            value={buktiBayarInputUrl}
                            onChange={(e) => setBuktiBayarInputUrl(e.target.value)}
                            style={{ flex: 1, fontSize: '12px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={handleSaveBuktiBayarUrl}
                            style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                          >
                            Simpan Bukti
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {onPrintDoc && (
                    <button
                      className="btn btn-primary"
                      onClick={() => onPrintDoc('A5', activeInvoice)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 600 }}
                    >
                      <Printer size={15} /> Cetak / Lihat Dokumen
                    </button>
                  )}

                  <button
                    className="btn btn-outline"
                    onClick={handleCopyLink}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 600 }}
                  >
                    <Share2 size={15} /> {copied ? 'Link Tersalin!' : 'Salin Link Lacak'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setNewTestiName(activeInvoice.namaCust || '');
                      setNewTestiProduct(activeInvoice.items?.[0]?.nama || 'Pesanan Cetak');
                      setNewTestiCategory(
                        (activeInvoice.items?.[0]?.kategori?.includes('Spanduk') || activeInvoice.items?.[0]?.kategori?.includes('Banner')) ? 'Spanduk & Banner' :
                        (activeInvoice.items?.[0]?.kategori?.includes('Kartu') || activeInvoice.items?.[0]?.kategori?.includes('Brosur')) ? 'Kartu Nama & Brosur' :
                        (activeInvoice.items?.[0]?.kategori?.includes('Kemasan') || activeInvoice.items?.[0]?.kategori?.includes('Souvenir')) ? 'Kemasan & Souvenir' : 'Stiker & Label'
                      );
                      setNewTestiInvoiceNo(activeInvoice.noInv || '');
                      setIsAddTestiModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      background: 'rgba(245, 158, 11, 0.12)',
                      borderColor: '#F59E0B',
                      color: '#B45309'
                    }}
                    title="Beri testimoni kepuasan untuk pesanan nota ini"
                  >
                    <Star size={15} fill="#F59E0B" color="#F59E0B" /> Beri Ulasan Nota
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={handleContactWA}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', fontSize: '12.5px', fontWeight: 600 }}
                  >
                    <PhoneCall size={15} /> Chat WA Toko
                  </button>
                </div>
              </div>
            </div>
          ) : hasSearched ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)', fontWeight: 800 }}>
                Pesanan Tidak Ditemukan
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0 auto' }}>
                Tidak ada data nota atau transaksi untuk kata kunci "<strong>{searchedQuery || searchQuery}</strong>".
                Silakan periksa kembali penulisan Nomor Nota atau Nomor WhatsApp Anda, lalu klik tombol <strong>"Cari Order"</strong>.
              </p>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Search size={44} style={{ color: 'var(--primary)', margin: '0 auto 12px auto', opacity: 0.8 }} />
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--primary)', fontWeight: 800 }}>
                Silakan Masukkan Nomor Nota / WhatsApp Anda
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '480px', margin: '8px auto 0 auto', lineHeight: '1.5' }}>
                Ketik Nomor Nota (contoh: <strong>INV-202608-001</strong>) atau Nomor WhatsApp Pelanggan pada kolom di atas, lalu klik tombol <strong style={{ color: 'var(--primary)' }}>"Cari Order"</strong> untuk melihat progres pengerjaan cetak & status nota digital.
              </p>
            </div>
          )}
        </>
      )}

      {selectedProductModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedProductModal(null)}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFF)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProductModal(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.6)',
                color: '#FFF',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            <div style={{ width: '100%', height: '280px', background: '#0F172A', overflow: 'hidden' }}>
              <img
                src={convertToDirectImageUrl(selectedProductModal.imageUrl || selectedProductModal.gambarUrl || '')}
                alt={selectedProductModal.nama}
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ padding: '20px' }}>
              <span
                className="badge badge-paid"
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '8px' }}
              >
                {selectedProductModal.tipe || selectedProductModal.kategori || 'Produk'}
              </span>

              <h3 style={{ margin: '8px 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                {selectedProductModal.nama}
              </h3>

              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {selectedProductModal.desc || selectedProductModal.keterangan || 'Spesifikasi & kualitas cetak terjamin.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Harga Jual / Satuan:</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }}>
                  {formatRupiah(selectedProductModal.harga || selectedProductModal.hargaJual)}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}> /{selectedProductModal.satuan || 'Pcs'}</span>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={(e) => {
                    const p = selectedProductModal;
                    setSelectedProductModal(null);
                    handleQuickAddToCart(p, e);
                  }}
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px',
                    fontWeight: 700,
                    fontSize: '13px',
                    borderRadius: '10px'
                  }}
                >
                  <Plus size={16} /> + Keranjang
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const p = selectedProductModal;
                    setSelectedProductModal(null);
                    handleOpenOrderModal(p);
                  }}
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '11px',
                    fontWeight: 700,
                    fontSize: '13px',
                    borderRadius: '10px'
                  }}
                >
                  <ShoppingCart size={16} /> Pesan & Hitung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE ORDER CALCULATOR & DIRECT ORDER FORM */}
      {orderModalOpen && orderProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => {
            if (!isSubmittingOrder) setOrderModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFF)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              position: 'relative',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOrderModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--bg-main)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {orderSuccessInv ? (
              /* Success Screen */
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle2 size={36} />
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                  Pesanan Berhasil Dikirim!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                  Nomor Nota Resmi Anda: <strong style={{ color: 'var(--primary)' }}>{orderSuccessInv.noInv}</strong>
                </p>

                <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', textAlign: 'left', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: 800, fontSize: '12.5px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} /> Pesanan Menunggu Verifikasi Admin
                  </div>
                  Tim admin kami akan memeriksa detail file & estimasi biaya tambahan (seperti ongkir pengiriman dll). Setelah diverifikasi, rincian biaya final & instruksi pembayaran akan dikonfirmasi.
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '20px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Total Tagihan:</span>
                    <strong style={{ color: '#10B981', fontSize: '14px' }}>{formatRupiah(orderSuccessInv.grandTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Pemesan:</span>
                    <strong>{orderSuccessInv.namaCust} ({orderSuccessInv.waCust})</strong>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>REKENING PEMBAYARAN TOKO:</span>
                    <div style={{ whiteSpace: 'pre-line', fontWeight: 700, marginTop: '2px' }}>
                      {settings.bank || 'Silakan konfirmasi ke kasir via WA'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {settings.phone && (
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        const rawMsg = `Halo ${settings.company || 'CTRL PRINT'}, saya telah mengirim pesanan baru no. nota: ${orderSuccessInv.noInv} an. ${orderSuccessInv.namaCust}. Mohon diverifikasi detail file & total biaya. Terima kasih!`;
                        openWhatsApp(settings.phone, rawMsg);
                      }}
                      style={{ padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}
                    >
                      <MessageCircle size={18} /> Konfirmasi / Verifikasi via WhatsApp
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setOrderModalOpen(false);
                        setOrderSuccessInv(null);
                      }}
                      style={{ flex: 1, padding: '10px', fontSize: '12.5px' }}
                    >
                      Tutup
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedInvoice(orderSuccessInv);
                        setSearchQuery(orderSuccessInv.noInv);
                        setSearchedQuery(orderSuccessInv.noInv);
                        setHasSearched(true);
                        setActiveTab('lacak');
                        setOrderModalOpen(false);
                        setOrderSuccessInv(null);
                      }}
                      style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12.5px' }}
                    >
                      <Search size={16} /> Lacak Status Order Ini
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Order Calculator & Details Form */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calculator size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--primary)' }}>
                      Kalkulator & Order {orderProduct.nama}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Harga Satuan: {formatRupiah(orderProduct.harga || orderProduct.hargaJual)} / {orderProduct.satuan || 'Pcs'}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Subtotal */}
                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                    Hitung Jumlah / Quantity Cetak:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                      style={{ padding: '8px 12px' }}
                    >
                      <Minus size={16} />
                    </button>

                    <input
                      type="number"
                      min={1}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ flex: 1, textAlign: 'center', padding: '8px', fontSize: '16px', fontWeight: 800, borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                    />

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setOrderQty(orderQty + 1)}
                      style={{ padding: '8px 12px' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subtotal:</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>
                        {formatRupiah((orderProduct.harga || orderProduct.hargaJual || 0) * orderQty)}
                      </span>
                    </div>

                    {orderVoucherDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>Diskon Voucher Promo ({orderVoucherCode}):</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
                          - {formatRupiah(orderVoucherDiscount)}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-color)', marginTop: '2px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-main)' }}>Estimasi Total Biaya:</span>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                        {formatRupiah(Math.max(((orderProduct.harga || orderProduct.hargaJual || 0) * orderQty) - orderVoucherDiscount, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Catatan Spesifikasi (Ukuran / Bahan / Finishing):
                  </label>
                  <input
                    type="text"
                    value={orderSpecs}
                    onChange={(e) => setOrderSpecs(e.target.value)}
                    placeholder="Contoh: Laminasi Glossy, Potong Kotak, Kertas 260gr..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                  />
                </div>

                {/* Voucher Input for Direct Order */}
                <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <Ticket size={14} /> Voucher Promo Diskon Toko
                  </label>

                  {orderAppliedVoucher ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#D1FAE5', border: '1px solid #10B981', borderRadius: '6px' }}>
                      <div>
                        <strong style={{ color: '#065F46', fontSize: '12px' }}>🎟️ {orderAppliedVoucher.code}</strong>
                        <span style={{ fontSize: '11px', color: '#047857', marginLeft: '6px' }}>(-{formatRupiah(orderVoucherDiscount)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveOrderVoucher}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Kode Promo (PROMO50)"
                        value={orderVoucherCode}
                        onChange={(e) => setOrderVoucherCode(e.target.value.toUpperCase())}
                        style={{ flex: 1, padding: '7px 10px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleApplyOrderVoucher()}
                        style={{ padding: '7px 12px', fontSize: '11.5px', fontWeight: 700 }}
                      >
                        Gunakan
                      </button>
                    </div>
                  )}

                  {vouchers.filter(v => v.active).length > 0 && !orderAppliedVoucher && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleApplyOrderVoucher(e.target.value);
                      }}
                      defaultValue=""
                      style={{ marginTop: '6px', fontSize: '11px', padding: '4px 8px', width: '100%' }}
                    >
                      <option value="">-- Pilih Promo Toko yang Tersedia --</option>
                      {vouchers.filter(v => v.active).map(v => (
                        <option key={v.id} value={v.code}>
                          {v.code} - {v.type === 'nominal' ? `Potongan ${formatRupiah(v.value)}` : `Diskon ${v.value}%`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Smart File Upload / Design Brief Selector */}
                <div style={{ marginBottom: '14px', background: 'var(--bg-main)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setOrderUploadMode('file_siap_cetak')}
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        borderRadius: '8px',
                        border: orderUploadMode === 'file_siap_cetak' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                        background: orderUploadMode === 'file_siap_cetak' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                        color: orderUploadMode === 'file_siap_cetak' ? '#2563EB' : 'var(--text-main)',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Upload size={13} /> Punya File Siap Cetak
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderUploadMode('butuh_desain')}
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        borderRadius: '8px',
                        border: orderUploadMode === 'butuh_desain' ? '2px solid #7C3AED' : '1px solid var(--border-color)',
                        background: orderUploadMode === 'butuh_desain' ? 'rgba(124,58,237,0.08)' : 'var(--bg-card)',
                        color: orderUploadMode === 'butuh_desain' ? '#7C3AED' : 'var(--text-main)',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Palette size={13} /> Butuh Jasa Setting / Desain
                    </button>
                  </div>

                  {orderUploadMode === 'file_siap_cetak' ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700 }}>
                          File Desain Cetak (Google Drive / Upload):
                        </label>
                        <label
                          style={{
                            fontSize: '11px',
                            color: '#0052FF',
                            fontWeight: 700,
                            cursor: isUploadingOrderFile ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#EFF6FF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #BFDBFE'
                          }}
                        >
                          <Upload size={12} />
                          <span>{isUploadingOrderFile ? 'Mengupload...' : '📁 Browse File ke Drive'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.zip,.rar,.cdr,.ai,.psd,.tiff"
                            onChange={handleUploadOrderFileToDrive}
                            disabled={isUploadingOrderFile}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <input
                        type="url"
                        value={orderDriveUrl}
                        onChange={(e) => setOrderDriveUrl(e.target.value)}
                        placeholder="Paste link Google Drive, Canva, atau Dropbox di sini..."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '12px' }}
                      />
                      {orderUploadProgress.status !== 'idle' && (
                        <div style={{ marginTop: '6px' }}>
                          <GoogleDriveUploadProgress
                            info={orderUploadProgress}
                            onDismiss={() => setOrderUploadProgress({ status: 'idle', percent: 0, fileName: '' })}
                          />
                        </div>
                      )}
                      {orderDriveUrl ? (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> File siap dicetak & terhubung ke Google Drive
                        </div>
                      ) : (
                        <p style={{ margin: '4px 0 0 0', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          💡 Tips: Format siap cetak ideal adalah PDF/X, TIFF, CDR, AI, atau PNG 300 DPI warna CMYK.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
                        Jelaskan Konsep / Teks / Kebutuhan Desain:
                      </label>
                      <textarea
                        rows={2}
                        value={orderSpecs}
                        onChange={(e) => setOrderSpecs(e.target.value)}
                        placeholder="Contoh: Banner warung makan, tema warna merah-kuning, sertakan logo & daftar menu..."
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '12px' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          Punya foto referensi / sketsa logo?
                        </span>
                        <label
                          style={{
                            fontSize: '11px',
                            color: '#7C3AED',
                            fontWeight: 700,
                            cursor: isUploadingOrderFile ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#F5F3FF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #DDD6FE'
                          }}
                        >
                          <Upload size={12} />
                          <span>{isUploadingOrderFile ? 'Mengupload...' : 'Upload Gambar Referensi'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleUploadOrderFileToDrive}
                            disabled={isUploadingOrderFile}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      {orderDriveUrl && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Gambar referensi tersimpan di drive
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Method Options for Direct Order */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    <Truck size={14} color="#2563EB" /> Pilihan Metode Pengambilan / Pengiriman <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setOrderDeliveryMethod('toko')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: orderDeliveryMethod === 'toko' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                        background: orderDeliveryMethod === 'toko' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', color: orderDeliveryMethod === 'toko' ? '#2563EB' : 'var(--text-muted)' }}>
                        <Store size={16} />
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: orderDeliveryMethod === 'toko' ? '#2563EB' : 'var(--text-main)' }}>
                        Ambil di Toko
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#10B981', fontWeight: 700 }}>
                        Gratis (Pickup)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderDeliveryMethod('instan')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: orderDeliveryMethod === 'instan' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                        background: orderDeliveryMethod === 'instan' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', color: orderDeliveryMethod === 'instan' ? '#2563EB' : 'var(--text-muted)' }}>
                        <Truck size={16} />
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: orderDeliveryMethod === 'instan' ? '#2563EB' : 'var(--text-main)' }}>
                        Kurir Instan
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                        Gojek/Grab (COD)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderDeliveryMethod('ekspedisi')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: orderDeliveryMethod === 'ekspedisi' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                        background: orderDeliveryMethod === 'ekspedisi' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', color: orderDeliveryMethod === 'ekspedisi' ? '#2563EB' : 'var(--text-muted)' }}>
                        <Package size={16} />
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: orderDeliveryMethod === 'ekspedisi' ? '#2563EB' : 'var(--text-main)' }}>
                        Ekspedisi
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                        JNE/J&T/Kargo
                      </div>
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Nama Pemesan <span style={{ color: '#EF4444' }}>*</span>:
                    </label>
                    <input
                      type="text"
                      value={orderNamaCust}
                      onChange={(e) => setOrderNamaCust(e.target.value)}
                      placeholder="Nama Anda"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      No. WhatsApp <span style={{ color: '#EF4444' }}>*</span>:
                    </label>
                    <input
                      type="text"
                      value={orderWaCust}
                      onChange={(e) => setOrderWaCust(e.target.value)}
                      placeholder="08123456789"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    {orderDeliveryMethod === 'toko' ? 'Catatan Pengambilan (Opsional):' : 'Alamat Pengiriman & Titik Antar:'} {orderDeliveryMethod !== 'toko' && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={orderAlamatCust}
                    onChange={(e) => setOrderAlamatCust(e.target.value)}
                    placeholder={orderDeliveryMethod === 'toko' ? 'Misal: Diambil sore jam 16:00' : 'Alamat jalan, nomor rumah, kelurahan...'}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={(e) => handleAddConfiguredToCart(e)}
                      style={{ padding: '10px', fontWeight: 700, fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: '#2563EB', color: '#2563EB' }}
                    >
                      <Plus size={16} /> + Ke Keranjang
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateOnlineDraftOrder}
                      disabled={isSubmittingOrder}
                      style={{ padding: '10px', fontWeight: 700, fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Send size={16} /> {isSubmittingOrder ? 'Memproses...' : 'Kirim Order Online'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSendOrderWA}
                    style={{ width: '100%', padding: '9px', fontWeight: 600, fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  >
                    <MessageCircle size={15} /> Tanya / Pesan via WA Toko
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: SHOPPING CART DRAWER / MODAL */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingCart size={22} style={{ color: '#38BDF8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#38BDF8' }}>
                    Keranjang Pesanan Cetak
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {cart.length} Jenis Produk Terpilih
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#FFF',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Content Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={48} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Keranjang Belanja Anda Kosong</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Pilih produk cetak dari katalog untuk menambahkan ke keranjang.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* List of Cart Items */}
                  {cart.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 800 }}>Item #{idx + 1}</span>
                          <h4 style={{ margin: '2px 0 0 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                            {item.nama}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          title="Hapus dari keranjang"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Specs and Drive link */}
                      {item.specs && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px' }}>
                          <strong>Spesifikasi:</strong> {item.specs}
                        </div>
                      )}
                      {item.driveUrl && (
                        <div style={{ fontSize: '11px', color: '#2563EB', wordBreak: 'break-all' }}>
                          <strong>Link File:</strong> {item.driveUrl}
                        </div>
                      )}

                      {/* Quantity and Subtotal bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jumlah:</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.id, -1)}
                            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '4px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800 }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setCart((prev) =>
                                prev.map((ci) => (ci.id === item.id ? { ...ci, qty: val, subtotal: ci.price * val } : ci))
                              );
                            }}
                            style={{ width: '54px', textAlign: 'center', padding: '2px 4px', fontSize: '12.5px', fontWeight: 800, borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.id, 1)}
                            style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: '4px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800 }}
                          >
                            +
                          </button>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unit}</span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                            {formatRupiah(item.price)} / {item.unit}
                          </span>
                          <strong style={{ fontSize: '14px', color: '#10B981' }}>
                            {formatRupiah(item.subtotal)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Customer Details Form */}
                  <div style={{ marginTop: '10px', padding: '14px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={15} /> Data Pemesan & Catatan
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          Nama Pemesan <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contoh: Budi Santoso"
                          value={cartNamaCust}
                          onChange={(e) => setCartNamaCust(e.target.value)}
                          style={{ fontSize: '12px', padding: '8px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          No. WhatsApp <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Contoh: 081234567890"
                          value={cartWaCust}
                          onChange={(e) => setCartWaCust(e.target.value)}
                          style={{ fontSize: '12px', padding: '8px' }}
                        />
                      </div>
                    </div>

                    {/* Delivery Method Options */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', color: 'var(--text-main)' }}>
                        <Truck size={14} color="#2563EB" /> Pilihan Metode Pengambilan / Pengiriman <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setCartDeliveryMethod('toko')}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            border: cartDeliveryMethod === 'toko' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                            background: cartDeliveryMethod === 'toko' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', color: cartDeliveryMethod === 'toko' ? '#2563EB' : 'var(--text-muted)' }}>
                            <Store size={18} />
                          </div>
                          <div style={{ fontSize: '11.5px', fontWeight: 800, color: cartDeliveryMethod === 'toko' ? '#2563EB' : 'var(--text-main)' }}>
                            Ambil di Toko
                          </div>
                          <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                            Gratis (Pickup)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCartDeliveryMethod('instan')}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            border: cartDeliveryMethod === 'instan' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                            background: cartDeliveryMethod === 'instan' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', color: cartDeliveryMethod === 'instan' ? '#2563EB' : 'var(--text-muted)' }}>
                            <Truck size={18} />
                          </div>
                          <div style={{ fontSize: '11.5px', fontWeight: 800, color: cartDeliveryMethod === 'instan' ? '#2563EB' : 'var(--text-main)' }}>
                            Kurir Instan
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Gojek / Grab / Lalamove
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCartDeliveryMethod('ekspedisi')}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '10px',
                            border: cartDeliveryMethod === 'ekspedisi' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                            background: cartDeliveryMethod === 'ekspedisi' ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', color: cartDeliveryMethod === 'ekspedisi' ? '#2563EB' : 'var(--text-muted)' }}>
                            <Package size={18} />
                          </div>
                          <div style={{ fontSize: '11.5px', fontWeight: 800, color: cartDeliveryMethod === 'ekspedisi' ? '#2563EB' : 'var(--text-main)' }}>
                            Ekspedisi
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            JNE / J&T / Kargo
                          </div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        {cartDeliveryMethod === 'toko' ? 'Catatan Pengambilan / Jam Datang (Opsional)' : 'Alamat Lengkap Pengiriman & Titik Antar'} {cartDeliveryMethod !== 'toko' && <span style={{ color: '#EF4444' }}>*</span>}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={cartDeliveryMethod === 'toko' ? 'Misal: Diambil sore jam 16:00' : 'Alamat jalan, nomor rumah, kelurahan, kecamatan...'}
                        value={cartAlamatCust}
                        onChange={(e) => setCartAlamatCust(e.target.value)}
                        style={{ fontSize: '12px', padding: '8px' }}
                      />
                    </div>

                    {/* Voucher Input for Cart */}
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <Ticket size={14} /> Memiliki Kode Voucher Diskon / Promo?
                      </label>

                      {cartAppliedVoucher ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#D1FAE5', border: '1px solid #10B981', borderRadius: '8px' }}>
                          <div>
                            <strong style={{ color: '#065F46', fontSize: '12.5px' }}>🎟️ Voucher: {cartAppliedVoucher.code}</strong>
                            <div style={{ fontSize: '11px', color: '#047857' }}>Hemat {formatRupiah(cartVoucherDiscount)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCartVoucher}
                            style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Kode Promo (PROMO50)"
                            value={cartVoucherCode}
                            onChange={(e) => setCartVoucherCode(e.target.value.toUpperCase())}
                            style={{ flex: 1, padding: '7px 10px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700 }}
                          />
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handleApplyCartVoucher()}
                            style={{ padding: '7px 12px', fontSize: '11.5px', fontWeight: 700 }}
                          >
                            Gunakan
                          </button>
                        </div>
                      )}

                      {vouchers.filter(v => v.active).length > 0 && !cartAppliedVoucher && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleApplyCartVoucher(e.target.value);
                          }}
                          defaultValue=""
                          style={{ marginTop: '6px', fontSize: '11px', padding: '4px 8px', width: '100%' }}
                        >
                          <option value="">-- Atau Pilih Voucher Promo Tersedia --</option>
                          {vouchers.filter(v => v.active).map(v => (
                            <option key={v.id} value={v.code}>
                              {v.code} - {v.type === 'nominal' ? `Potongan Rp ${v.value.toLocaleString('id-ID')}` : `Diskon ${v.value}%`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Footer Actions */}
            {cart.length > 0 && (
              <div style={{ padding: '16px 20px', background: 'var(--bg-main)', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subtotal Produk:</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                      Rp {cart.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {cartVoucherDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>Diskon Voucher Promo:</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
                        - Rp {cartVoucherDiscount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>Total Biaya Akhir:</span>
                    <strong style={{ fontSize: '18px', color: '#10B981', fontWeight: 800 }}>
                      Rp {Math.max(cart.reduce((acc, i) => acc + i.subtotal, 0) - cartVoucherDiscount, 0).toLocaleString('id-ID')}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCheckoutCartWA}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '12.5px', fontWeight: 700 }}
                  >
                    <MessageCircle size={16} color="#10B981" /> Order via WA
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCheckoutCartOnline}
                    disabled={isSubmittingOrder}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '12.5px', fontWeight: 700 }}
                  >
                    <Send size={16} /> {isSubmittingOrder ? 'Memproses...' : 'Kirim Order Online'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TULIS ULASAN / TESTIMONI */}
      {isAddTestiModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            className="modal-card"
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                  <Star size={20} fill="#F59E0B" color="#F59E0B" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    Tulis Ulasan &amp; Testimoni
                  </h4>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Bagikan pengalaman Anda berbelanja &amp; mencetak di {settings.company || 'CTRL PRINT'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => setIsAddTestiModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddTestimonial} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Rating Stars Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Berapa Bintang Kepuasan Anda? <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewTestiRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <Star
                          size={26}
                          fill={star <= newTestiRating ? '#F59E0B' : 'transparent'}
                          color={star <= newTestiRating ? '#F59E0B' : 'var(--border-color)'}
                        />
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#D97706', marginLeft: '6px' }}>
                    {newTestiRating === 5 ? '⭐⭐⭐⭐⭐ Sangat Puas' : newTestiRating === 4 ? '⭐⭐⭐⭐ Puas' : newTestiRating === 3 ? '⭐⭐⭐ Cukup' : `${newTestiRating} Bintang`}
                  </span>
                </div>
              </div>

              {/* Name & Business */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nama Anda / Inisial <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Hendra Wijaya"
                    value={newTestiName}
                    onChange={(e) => setNewTestiName(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Nama Usaha / Brand (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Dapur Bunda / PT Maju"
                    value={newTestiBusiness}
                    onChange={(e) => setNewTestiBusiness(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* City & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Kota / Wilayah (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Surabaya / Jakarta"
                    value={newTestiCity}
                    onChange={(e) => setNewTestiCity(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    Kategori Produk
                  </label>
                  <select
                    value={newTestiCategory}
                    onChange={(e) => setNewTestiCategory(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '12.5px' }}
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
                    Nama Produk yang Dicetak / Dipesan
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Stiker Vinyl A3+ Kiss Cut / Spanduk Flexi"
                    value={newTestiProduct}
                    onChange={(e) => setNewTestiProduct(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>
                    No. Nota / Invoice (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: INV-2026-001"
                    value={newTestiInvoiceNo}
                    onChange={(e) => setNewTestiInvoiceNo(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Testimonial Message */}
              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: 700 }}>
                  Ulasan / Testimoni Anda <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ceritakan kepuasan Anda mengenai kualitas warna cetak, kecepatan pengerjaan, keramahan admin CS, atau keamanan packing..."
                  value={newTestiComment}
                  onChange={(e) => setNewTestiComment(e.target.value)}
                  style={{ fontSize: '12.5px', lineHeight: 1.5 }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsAddTestiModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Send size={15} /> Publikasikan Testimoni
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: KONFIRMASI PEMBAYARAN & BUKTI TRANSFER */}
      {isPaymentModalOpen && (
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
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              position: 'relative',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--bg-main)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--primary)' }}>
                  Konfirmasi Pembayaran
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Kirim bukti transfer untuk percepatan proses cetak
                </span>
              </div>
            </div>

            {/* Bank Accounts Info Box */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Building2 size={14} /> Rekening Pembayaran Resmi Toko:
              </div>
              <div style={{ whiteSpace: 'pre-line', color: 'var(--text-main)', fontWeight: 600, fontSize: '12.5px' }}>
                {settings.bank || 'BCA: 1234567890 a/n Percetakan\nMandiri: 987654321 a/n Percetakan'}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const noInv = (form.elements.namedItem('payInv') as HTMLInputElement)?.value || '';
                const nama = (form.elements.namedItem('payName') as HTMLInputElement)?.value || '';
                const bank = (form.elements.namedItem('payBank') as HTMLInputElement)?.value || '';
                const nominal = (form.elements.namedItem('payAmount') as HTMLInputElement)?.value || '';
                const catatan = (form.elements.namedItem('payNote') as HTMLInputElement)?.value || '';

                const waPhone = settings.phone || '';
                const cleanPhone = waPhone.replace(/[^0-9]/g, '');
                const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

                const msg = `*KONFIRMASI PEMBAYARAN PESANAN CETAK*\n-----------------------------------\n` +
                  `*No. Nota:* ${noInv}\n` +
                  `*Nama Pengirim:* ${nama}\n` +
                  `*Bank Tujuan/Asal:* ${bank}\n` +
                  `*Nominal Transfer:* Rp ${nominal}\n` +
                  (catatan ? `*Catatan:* ${catatan}\n` : '') +
                  `-----------------------------------\n` +
                  `Mohon dicek dan diverifikasi. Terima kasih!`;

                window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                setIsPaymentModalOpen(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Nomor Nota / No. Pesanan <span style={{ color: '#EF4444' }}>*</span>:
                </label>
                <input
                  name="payInv"
                  type="text"
                  required
                  defaultValue={activeInvoice?.noInv || ''}
                  placeholder="Contoh: INV-202608-001 atau ORD-001"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Nama Pengirim Rekening <span style={{ color: '#EF4444' }}>*</span>:
                  </label>
                  <input
                    name="payName"
                    type="text"
                    required
                    defaultValue={activeInvoice?.namaCust || ''}
                    placeholder="Nama di rekening bank"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Bank Pengirim & Tujuan <span style={{ color: '#EF4444' }}>*</span>:
                  </label>
                  <input
                    name="payBank"
                    type="text"
                    required
                    placeholder="BCA ke BCA Toko / Mandiri / QRIS"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Nominal Transfer (Rp) <span style={{ color: '#EF4444' }}>*</span>:
                </label>
                <input
                  name="payAmount"
                  type="text"
                  required
                  defaultValue={activeInvoice?.grandTotal ? String(activeInvoice.grandTotal) : ''}
                  placeholder="Contoh: 150000"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '13px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Catatan Tambahan (Opsional):
                </label>
                <input
                  name="payNote"
                  type="text"
                  placeholder="Misal: Sudah transfer via m-Banking BCA jam 14.15"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: '#10B981', borderColor: '#10B981' }}
                >
                  <Send size={15} /> Kirim Konfirmasi ke WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PORTAL FOOTER */}
      <footer
        style={{
          marginTop: '48px',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px' }}>
          
          {/* Section 1: Profil */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {settings.logoUrl ? (
                <img
                  src={convertToDirectImageUrl(settings.logoUrl)}
                  alt={settings.company || 'CTRL PRINT'}
                  referrerPolicy="no-referrer"
                  style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultLogoImg;
                  }}
                />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} />
                </div>
              )}
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {settings.company || 'CTRL PRINT'}
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Layanan Percetakan Digital
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', textAlign: 'justify', textJustify: 'inter-word' }}>
              {settings.aboutUs || 'Layanan percetakan digital profesional di Balikpapan. Menghadirkan solusi cetak kilat dan berkualitas untuk kebutuhan bisnis, promosi, dan personal Anda.'}
            </p>
          </div>

          {/* Section 2: Kontak & Workshop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              Kontak & Workshop
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              {settings.phone && (
                <a
                  href={formatWhatsAppUrl(settings.phone)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                    width: 'fit-content'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#10B981')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                >
                  <MessageCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                  <span>{settings.phone}</span>
                </a>
              )}

              {settings.email && (
                <a
                  href={`mailto:${settings.email}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                    width: 'fit-content'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                >
                  <Mail size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>{settings.email}</span>
                </a>
              )}

              {settings.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-main)',
                    textDecoration: 'none',
                    width: 'fit-content'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E1306C')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
                >
                  <Instagram size={14} style={{ color: '#E1306C', flexShrink: 0 }} />
                  <span>{settings.instagram}</span>
                </a>
              )}

              {settings.address && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <MapPin size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                    <span>{settings.address}</span>
                  </div>
                  <a
                    href={settings.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.company || 'CTRL PRINT'} ${settings.address}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px',
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      marginLeft: '22px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      width: 'fit-content'
                    }}
                  >
                    <span>Google Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Jam Operasional & Pembayaran */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              Jam Operasional
            </h4>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}
            >
              {settings.operationalHours || 'Senin - Jumat : 09.00 – 17.00 WITA\nSabtu : 09.00 – 15.00 WITA\nMinggu & Tanggal Merah : Libur'}
            </div>

            {settings.paymentMethods && (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '3px' }}>
                  Metode Pembayaran:
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: 500 }}>
                  {settings.paymentMethods}
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Bottom Bar: Copyright & Navigation */}
        <div
          style={{
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11.5px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>© {new Date().getFullYear()} <strong>{settings.company || 'CTRL PRINT'}</strong>. Hak Cipta Dilindungi.</span>
            {!onBackToAdmin && onOpenStaffLogin && (settings.staffLoginVisibility === 'discreet' || !settings.staffLoginVisibility) && (
              <button
                type="button"
                onClick={onOpenStaffLogin}
                title="Sistem Internal (Pintasan: Alt+L)"
                aria-label="Staff Access"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '1px 4px',
                  margin: 0,
                  color: 'var(--text-muted)',
                  opacity: 0.25,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  transition: 'opacity 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.25')}
              >
                <Lock size={9} />
                <span>v2.5</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('katalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: activeTab === 'katalog' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'katalog' ? 700 : 500
                }}
              >
                Katalog
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('lacak');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: activeTab === 'lacak' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'lacak' ? 700 : 500
                }}
              >
                Lacak Nota
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('desain');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: activeTab === 'desain' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'desain' ? 700 : 500
                }}
              >
                ACC Desain
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('faq');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: activeTab === 'faq' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: activeTab === 'faq' ? 700 : 500
                }}
              >
                FAQ
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="Kembali ke Bagian Atas"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--text-muted)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <ArrowUp size={11} /> Ke Atas
            </button>

            {!onBackToAdmin && onOpenStaffLogin && settings.staffLoginVisibility === 'normal' && (
              <button
                type="button"
                onClick={onOpenStaffLogin}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '5px'
                }}
              >
                <ShieldCheck size={12} style={{ color: 'var(--primary)' }} /> Staff Login
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* FLYING PRODUCT TO CART ANIMATION LAYER */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
        {flyingItems.map((item) => (
          <div
            key={item.id}
            className="flying-cart-item"
            style={{
              '--start-x': `${item.startX - 20}px`,
              '--start-y': `${item.startY - 20}px`,
              '--end-x': `${item.endX - 16}px`,
              '--end-y': `${item.endY - 16}px`
            } as React.CSSProperties}
          >
            <div
              style={{
                position: 'relative',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.45), 0 0 0 2.5px #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <ShoppingCart size={20} color="#FFFFFF" />
              )}
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  background: '#10B981',
                  color: '#FFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  padding: '1px 5px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  border: '1.5px solid #FFF',
                  lineHeight: 1
                }}
              >
                +{item.qty || 1}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
