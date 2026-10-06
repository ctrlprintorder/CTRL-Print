import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  ShoppingBag,
  Package,
  Wallet,
  Tag,
  Store,
  Users,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Download,
  LogOut,
  Menu as MenuIcon,
  Settings2,
  CheckCircle2,
  Lock,
  User as UserIcon,
  Globe,
  Search,
  ShieldCheck,
  X,
  Bell,
  CreditCard,
  Check,
  FolderKanban,
  Palette,
  ExternalLink,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Info,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  Settings,
  Counters,
  Invoice,
  Produk,
  Bahan,
  Vendor,
  Customer,
  Pengeluaran,
  PoVendor,
  EmailLog,
  AppNotification,
  CustomerTestimonial,
  FinishingGroup
} from './types';
import {
  subscribeSettings,
  subscribeCounters,
  subscribeCollection,
  saveDocument,
  DEFAULT_SETTINGS,
  DEFAULT_COUNTERS,
  getCachedSettings,
  getCachedCounters,
  getCachedCollection,
  convertToDirectImageUrl
} from './firebaseService';
import defaultLogoImg from './assets/images/ctrl_print_logo_1785948969417.jpg';

import { Calculators } from './components/Calculators';
import { Dashboard } from './components/Dashboard';
import { TransaksiForm } from './components/TransaksiForm';
import { RiwayatJob } from './components/RiwayatJob';
import { PoVendorPage } from './components/PoVendorPage';
import { StokBahanPage } from './components/StokBahanPage';
import { PengeluaranPage } from './components/PengeluaranPage';
import { ProdukPage } from './components/ProdukPage';
import { VendorPage } from './components/VendorPage';
import { CustomerPage } from './components/CustomerPage';
import { SettingsPage } from './components/SettingsPage';
import { PrintDocument } from './components/PrintDocument';
import { CustomerPortal } from './components/CustomerPortal';
import { VendorPortal } from './components/VendorPortal';
import { AIAssistantTab } from './components/AIAssistantTab';
import { AccDesainPage } from './components/AccDesainPage';
import { EmailManagerPage } from './components/EmailManagerPage';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { Bot, Mail, AlertTriangle, CheckCircle, Clock3 } from 'lucide-react';
import { markEmailAsRead } from './services/gmailService';
import {
  playNotificationSound,
  pushNotification,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  syncReadNotifsToCloud
} from './services/notificationService';
import { formatDate } from './utils/date';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ctrl_print_logged') === 'true';
    } catch {
      return false;
    }
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [publicPortalMode, setPublicPortalMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (
        p.get('inv') ||
        p.get('invNo') ||
        p.get('noInv') ||
        p.get('acc') ||
        p.get('tab') === 'acc-desain' ||
        p.get('tab') === 'desain' ||
        p.get('tab') === 'lacak' ||
        p.get('portal') === 'customer'
      ) {
        return true;
      }
    }
    return false;
  });
  const [vendorPortalPo, setVendorPortalPo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('po')) return p.get('po');
      if (p.get('portal') === 'vendor') return '';
    }
    return null;
  });
  const [showStaffLoginModal, setShowStaffLoginModal] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'buat-invoice' | 'riwayat-invoice' | 'acc-desain' | 'po-vendor' | 'stok-bahan' | 'pengeluaran' | 'produk' | 'vendor' | 'customer' | 'settings' | 'customer-portal' | 'ai-assistant' | 'email-manager'
  >(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tabParam = p.get('tab');
      if (tabParam === 'acc-desain' || tabParam === 'desain') return 'acc-desain';
      if (tabParam === 'buat-invoice') return 'buat-invoice';
      if (tabParam === 'riwayat-invoice') return 'riwayat-invoice';
      if (tabParam === 'po-vendor') return 'po-vendor';
    }
    return 'dashboard';
  });

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; isErr?: boolean } | null>(null);

  // Firestore Real-time Collections State (initialized with local cache for instantaneous rendering)
  const [settings, setSettings] = useState<Settings>(getCachedSettings);
  const [counters, setCounters] = useState<Counters>(getCachedCounters);
  const [invoices, setInvoices] = useState<Invoice[]>(() => getCachedCollection<Invoice>('invoice'));
  const [products, setProducts] = useState<Produk[]>(() => getCachedCollection<Produk>('produk'));
  const [bahans, setBahans] = useState<Bahan[]>(() => getCachedCollection<Bahan>('bahan_baku'));
  const [vendors, setVendors] = useState<Vendor[]>(() => getCachedCollection<Vendor>('vendor'));
  const [customers, setCustomers] = useState<Customer[]>(() => getCachedCollection<Customer>('customer'));
  const [expenses, setExpenses] = useState<Pengeluaran[]>(() => getCachedCollection<Pengeluaran>('pengeluaran'));
  const [poList, setPoList] = useState<PoVendor[]>(() => getCachedCollection<PoVendor>('po_vendor'));
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => getCachedCollection<EmailLog>('email_logs'));
  const [dbNotifications, setDbNotifications] = useState<AppNotification[]>(() => getCachedCollection<AppNotification>('notifications'));
  const [testimonials, setTestimonials] = useState<CustomerTestimonial[]>(() => getCachedCollection<CustomerTestimonial>('testimonials'));
  const [finishingGroups, setFinishingGroups] = useState<FinishingGroup[]>(() => getCachedCollection<FinishingGroup>('finishing_groups'));
  const [selectedEmailLogId, setSelectedEmailLogId] = useState<string | null>(null);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<'all' | 'email' | 'order' | 'acc_desain' | 'stok'>('all');

  const emailLogsRef = React.useRef<EmailLog[]>(emailLogs);
  useEffect(() => {
    emailLogsRef.current = emailLogs;
  }, [emailLogs]);

  // Active Edit / Print state
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printState, setPrintState] = useState<{
    type: 'A5' | 'TH' | 'DO' | 'PO' | 'LABEL' | null;
    inv: Invoice | null;
    po: PoVendor | null;
  }>({ type: null, inv: null, po: null });

  const [menuDropOpen, setMenuDropOpen] = useState(false);
  const [notifDropOpen, setNotifDropOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState('');

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ctrl_print_read_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isNotificationSoundEnabled());

  // Refs to detect live incoming events from Firestore after initial load
  const isInitialInvoiceLoad = React.useRef(true);
  const invoiceSnapshotMapRef = React.useRef<Map<string, { buktiBayarUrl?: string; accDesainStatus?: string }>>(new Map());
  const isInitialDbNotifsLoad = React.useRef(true);
  const knownDbNotifIdsRef = React.useRef<Set<string>>(new Set());

  const handleMarkNotifRead = (id: string) => {
    const updated = Array.from(new Set([...readNotifIds, id]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('ctrl_print_read_notifs', JSON.stringify(updated));
    } catch {}
    // Sync read status to Cloud (Firestore) so all other devices see it as read
    syncReadNotifsToCloud(updated).catch(() => {});

    // If it's a persistent document in notifications collection, update it as read in Firestore
    const dn = dbNotifications.find((d) => d.id === id);
    if (dn && !dn.isRead) {
      saveDocument('notifications', { ...dn, isRead: true }).catch(() => {});
    }
  };

  const handleMarkAllNotifsRead = (notifList: Array<{ id: string }>) => {
    const ids = notifList.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...ids]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('ctrl_print_read_notifs', JSON.stringify(updated));
    } catch {}
    // Sync read status to Cloud (Firestore) so all other devices see it as read
    syncReadNotifsToCloud(updated).catch(() => {});

    // Mark any persistent notifications as read in Firestore
    notifList.forEach((n) => {
      const dn = dbNotifications.find((d) => d.id === n.id);
      if (dn && !dn.isRead) {
        saveDocument('notifications', { ...dn, isRead: true }).catch(() => {});
      }
    });
  };

  // Compute all notifications comprehensively across entire application
  const notifications = React.useMemo(() => {
    type UnifiedNotif = {
      id: string;
      type: 'email_read' | 'email_sent' | 'order_online' | 'bukti_bayar' | 'acc_desain' | 'stok_menipis' | 'general';
      category: 'email' | 'order' | 'acc_desain' | 'stok' | 'system';
      title: string;
      desc: string;
      time: string;
      isRead: boolean;
      badge?: string;
      linkTab: 'email-manager' | 'riwayat-invoice' | 'acc-desain' | 'stok-bahan' | 'dashboard';
      linkParam?: string;
      referenceId?: string;
      referenceNo?: string;
    };

    const list: UnifiedNotif[] = [];

    // 1. Notifications from Firestore collection 'notifications'
    dbNotifications.forEach((dn) => {
      const isRead = readNotifIds.includes(dn.id) || dn.isRead;
      if (!isRead) {
        list.push({
          id: dn.id,
          type: (dn.type as any) || 'general',
          category: dn.category || 'system',
          title: dn.title,
          desc: dn.desc,
          time: dn.timestamp,
          isRead: false,
          badge: dn.badge,
          linkTab: (dn.linkTab as any) || 'email-manager',
          linkParam: dn.linkParam || dn.referenceNo,
          referenceId: dn.referenceId,
          referenceNo: dn.referenceNo
        });
      }
    });

    // 2. Email Read / Sent notifications from emailLogs
    emailLogs.forEach((log) => {
      if (log.status === 'read' || log.readAt) {
        const id = `notif-email-read-${log.id}`;
        if (!readNotifIds.includes(id)) {
          list.push({
            id,
            type: 'email_read',
            category: 'email',
            title: '📬 Email Telah Dibaca & Dibuka',
            desc: `"${log.subject}" telah dibaca oleh ${log.recipientName ? `${log.recipientName} (${log.recipientEmail})` : log.recipientEmail}`,
            time: log.readAt || log.sentAt,
            isRead: false,
            badge: log.readCount && log.readCount > 1 ? `Dibaca ${log.readCount}x` : 'Dibaca',
            linkTab: 'email-manager',
            linkParam: log.id,
            referenceId: log.id,
            referenceNo: log.referenceNo
          });
        }
      }
    });

    // 3. Web Order Notifications
    invoices.forEach((inv) => {
      const isWebOrder = inv.noInv.startsWith('WEB-') || inv.noInv.startsWith('ORD-');
      if (isWebOrder) {
        const id = `notif-web-${inv.id}`;
        if (!readNotifIds.includes(id)) {
          list.push({
            id,
            type: 'order_online',
            category: 'order',
            title: '🛒 Pesanan Web Online Masuk',
            desc: `#${inv.noInv} an. ${inv.namaCust} (Rp ${inv.grandTotal.toLocaleString('id-ID')})`,
            time: formatDate(inv.tglInv),
            isRead: false,
            badge: 'Online',
            linkTab: 'riwayat-invoice',
            linkParam: inv.noInv,
            referenceId: inv.id,
            referenceNo: inv.noInv
          });
        }
      }

      // 4. Bukti Transfer Notification
      if (inv.buktiBayarUrl && inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas') {
        const id = `notif-proof-${inv.id}`;
        if (!readNotifIds.includes(id)) {
          list.push({
            id,
            type: 'bukti_bayar',
            category: 'order',
            title: '💳 Bukti Transfer Diupload',
            desc: `#${inv.noInv} an. ${inv.namaCust} (${inv.catatanBuktiBayar || 'Menunggu Verifikasi'})`,
            time: formatDate(inv.tglBuktiBayar || inv.tglInv),
            isRead: false,
            badge: 'Bukti Bayar',
            linkTab: 'riwayat-invoice',
            linkParam: inv.noInv,
            referenceId: inv.id,
            referenceNo: inv.noInv
          });
        }
      }

      // 5. ACC Desain Status Notifications
      if (inv.accDesainStatus === 'Minta Revisi') {
        const id = `notif-rev-${inv.id}`;
        if (!readNotifIds.includes(id)) {
          list.push({
            id,
            type: 'acc_desain',
            category: 'acc_desain',
            title: '⚠️ Revisi Desain Diajukan',
            desc: `#${inv.noInv} an. ${inv.namaCust} meminta revisi desain`,
            time: formatDate(inv.tglInv),
            isRead: false,
            badge: 'Revisi',
            linkTab: 'acc-desain',
            linkParam: inv.noInv,
            referenceId: inv.id,
            referenceNo: inv.noInv
          });
        }
      } else if (inv.accDesainStatus === 'Disetujui' || inv.accDesainStatus === 'ACC') {
        const id = `notif-acc-${inv.id}`;
        if (!readNotifIds.includes(id)) {
          list.push({
            id,
            type: 'acc_desain',
            category: 'acc_desain',
            title: '✅ Desain Disetujui (ACC)',
            desc: `#${inv.noInv} an. ${inv.namaCust} telah menyetujui ACC desain!`,
            time: formatDate(inv.tglInv),
            isRead: false,
            badge: 'ACC OK',
            linkTab: 'acc-desain',
            linkParam: inv.noInv,
            referenceId: inv.id,
            referenceNo: inv.noInv
          });
        }
      }
    });

    // 6. Stok Bahan Menipis Notifications
    bahans.forEach((bahan) => {
      const minThreshold = bahan.minStok || 5;
      if (bahan.stok <= minThreshold) {
        const id = `notif-stok-${bahan.id}`;
        if (!readNotifIds.includes(id)) {
          list.push({
            id,
            type: 'stok_menipis',
            category: 'stok',
            title: '⚠️ Stok Bahan Baku Menipis',
            desc: `${bahan.nama} tersisa ${bahan.stok} ${bahan.satuan || 'unit'} (Min: ${minThreshold})`,
            time: 'Perlu Restok',
            isRead: false,
            badge: 'Stok Kritis',
            linkTab: 'stok-bahan',
            linkParam: bahan.nama,
            referenceId: bahan.id
          });
        }
      }
    });

    // Deduplicate by ID
    const uniqueMap = new Map<string, UnifiedNotif>();
    list.forEach((item) => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values());
  }, [dbNotifications, emailLogs, invoices, bahans, readNotifIds]);

  const filteredNotifications = React.useMemo(() => {
    if (notifCategoryFilter === 'all') return notifications;
    return notifications.filter((n) => n.category === notifCategoryFilter);
  }, [notifications, notifCategoryFilter]);

  const unreadNotifCount = notifications.length;

  // Check login session & dark mode
  useEffect(() => {
    if (localStorage.getItem('ctrl_print_logged') === 'true') {
      setIsLoggedIn(true);
    }
    if (localStorage.getItem('ctrl_print_dark_mode') === 'true') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }

    const params = new URLSearchParams(window.location.search);
    const poParam = params.get('po');
    const portalParam = params.get('portal');
    const invParam = params.get('inv') || params.get('invNo') || params.get('noInv') || params.get('acc');
    const tabParam = params.get('tab');

    if (poParam) {
      setVendorPortalPo(poParam);
    } else if (portalParam === 'vendor') {
      setVendorPortalPo('');
    }

    if (invParam || portalParam === 'customer' || tabParam === 'acc-desain' || tabParam === 'desain' || tabParam === 'lacak') {
      setPublicPortalMode(true);
    }

    if (tabParam === 'acc-desain' || tabParam === 'desain') {
      setActiveTab('acc-desain');
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setMenuDropOpen(false);
        setNotifDropOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsub1 = subscribeSettings(setSettings);
    const unsub2 = subscribeCounters(setCounters);
    const unsub3 = subscribeCollection<Invoice>('invoice', (data) => {
      const sorted = [...data].sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true }));
      setInvoices(sorted);

      if (isInitialInvoiceLoad.current) {
        isInitialInvoiceLoad.current = false;
        const initMap = new Map<string, { buktiBayarUrl?: string; accDesainStatus?: string }>();
        data.forEach((inv) => {
          initMap.set(inv.id, {
            buktiBayarUrl: inv.buktiBayarUrl,
            accDesainStatus: inv.accDesainStatus
          });
        });
        invoiceSnapshotMapRef.current = initMap;
      } else {
        // Real-time incoming events on standby devices!
        data.forEach((inv) => {
          const prev = invoiceSnapshotMapRef.current.get(inv.id);
          if (!prev) {
            // New invoice created in Firestore (e.g. customer placed order in web portal)
            const isWebOrder = inv.noInv?.startsWith('WEB-') || inv.noInv?.startsWith('ORD-');
            if (isWebOrder) {
              playNotificationSound('order');
              showToast(`🛒 Pesanan Baru Masuk! #${inv.noInv} an. ${inv.namaCust}`);
            }
          } else {
            // Customer uploaded payment proof
            if (!prev.buktiBayarUrl && inv.buktiBayarUrl && inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas') {
              playNotificationSound('order');
              showToast(`💳 Bukti Transfer Baru! #${inv.noInv} an. ${inv.namaCust}`);
            }
            // Customer updated ACC status
            if (prev.accDesainStatus !== inv.accDesainStatus && inv.accDesainStatus) {
              if (inv.accDesainStatus === 'ACC Disetujui' || inv.accDesainStatus === 'Disetujui' || inv.accDesainStatus === 'ACC') {
                playNotificationSound('general');
                showToast(`✅ Desain Disetujui (ACC)! #${inv.noInv} an. ${inv.namaCust}`);
              } else if (inv.accDesainStatus === 'Minta Revisi') {
                playNotificationSound('alert');
                showToast(`⚠️ Permintaan Revisi Desain! #${inv.noInv} an. ${inv.namaCust}`);
              }
            }
          }
        });

        // Update map for next cycle
        const nextMap = new Map<string, { buktiBayarUrl?: string; accDesainStatus?: string }>();
        data.forEach((inv) => {
          nextMap.set(inv.id, {
            buktiBayarUrl: inv.buktiBayarUrl,
            accDesainStatus: inv.accDesainStatus
          });
        });
        invoiceSnapshotMapRef.current = nextMap;
      }
    });
    const unsub4 = subscribeCollection<Produk>('produk', setProducts);
    const unsub5 = subscribeCollection<Bahan>('bahan_baku', setBahans);
    const unsub6 = subscribeCollection<Vendor>('vendor', setVendors);
    const unsub7 = subscribeCollection<Customer>('customer', setCustomers);
    const unsub8 = subscribeCollection<Pengeluaran>('pengeluaran', setExpenses);
    const unsub9 = subscribeCollection<PoVendor>('po_vendor', (data) =>
      setPoList([...data].sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true })))
    );
    const unsub10 = subscribeCollection<EmailLog>('email_logs', (data) =>
      setEmailLogs([...data].sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true })))
    );
    const unsub11 = subscribeCollection<AppNotification>('notifications', (data) => {
      const sorted = [...data].sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true }));
      setDbNotifications(sorted);

      if (isInitialDbNotifsLoad.current) {
        isInitialDbNotifsLoad.current = false;
        knownDbNotifIdsRef.current = new Set(data.map((d) => d.id));
      } else {
        data.forEach((dn) => {
          if (!knownDbNotifIdsRef.current.has(dn.id)) {
            playNotificationSound(dn.type === 'order_online' ? 'order' : 'general');
            showToast(`🔔 ${dn.title}: ${dn.desc}`);
          }
        });
        knownDbNotifIdsRef.current = new Set(data.map((d) => d.id));
      }
    });
    const unsub12 = subscribeCollection<CustomerTestimonial>('testimonials', (data) => {
      setTestimonials(data);
    });
    const unsub14 = subscribeCollection<FinishingGroup>('finishing_groups', setFinishingGroups);
    // 13. Cross-device read state subscription (real-time read state across all devices)
    const unsub13 = subscribeCollection<{ id: string; readIds?: string[]; updatedAt?: string }>(
      'notifications_meta',
      (data) => {
        const readStateDoc = data.find((d) => d.id === 'read_state');
        if (readStateDoc && Array.isArray(readStateDoc.readIds)) {
          setReadNotifIds((prev) => {
            const merged = Array.from(new Set([...prev, ...readStateDoc.readIds!]));
            try {
              localStorage.setItem('ctrl_print_read_notifs', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    );

    // Event listener for in-app instant notifications
    const handleNewNotif = (e: any) => {
      const notifDetail = e.detail;
      if (notifDetail) {
        showToast(`🔔 ${notifDetail.title}: ${notifDetail.desc}`);
      }
    };
    window.addEventListener('ctrl_new_notification', handleNewNotif);

    // Polling backend for opened email pixel tracking events
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/email/open-events');
        if (res.ok) {
          const json = await res.json();
          if (json.events && json.events.length > 0) {
            for (const ev of json.events) {
              // Acknowledge open event on server
              await fetch(`/api/email/open-events/${ev.logId}`, { method: 'DELETE' }).catch(() => {});
              
              // Find matching email in state or logs
              const targetLog = emailLogsRef.current.find((l) => l.id === ev.logId);
              if (targetLog && targetLog.status !== 'read') {
                await markEmailAsRead(targetLog, {
                  ipAddress: ev.ip,
                  userAgent: ev.userAgent,
                  note: 'Dibuka oleh penerima'
                });
                showToast(`📬 Email dibuka oleh penerima: "${targetLog.subject}"!`);
              }
            }
          }
        }
      } catch (err) {
        // Safe polling ignore
      }
    }, 4000);

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsub13(); unsub14();
      window.removeEventListener('ctrl_new_notification', handleNewNotif);
      clearInterval(pollInterval);
    };
  }, []);

  // Dynamic Favicon and Apple Touch Icon synchronization with settings
  useEffect(() => {
    const rawLogo = settings.logoUrl;
    const targetUrl = rawLogo ? convertToDirectImageUrl(rawLogo) : '/logo.jpg';

    let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = targetUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = targetUrl;
  }, [settings.logoUrl]);

  const showToast = (msg: string, isErr?: boolean) => {
    setToast({ msg, isErr });
    setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('ctrl_print_dark_mode', String(newMode));
    if (newMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMsg(null);
    const validUser = settings.user || 'admin';
    const validPass = settings.pass || 'admin123';

    if (loginUser.trim() === validUser && loginPass.trim() === validPass) {
      localStorage.setItem('ctrl_print_logged', 'true');
      setIsLoggedIn(true);
      setPublicPortalMode(false);
      setShowStaffLoginModal(false);
      setLoginErrorMsg(null);
      showToast('Akses Diberikan! Terhubung ke Database Online.');
    } else {
      setLoginErrorMsg('Username atau Password yang Anda masukkan salah!');
      showToast('Username atau Password Salah!', true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ctrl_print_logged');
    setIsLoggedIn(false);
    setPublicPortalMode(true);
    setShowStaffLoginModal(false);
    showToast('Logout Berhasil');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setActiveTab('buat-invoice');
  };

  const handlePrintDoc = (tipe: 'A5' | 'TH' | 'DO' | 'LABEL', inv: Invoice) => {
    setPrintState({ type: tipe, inv, po: null });
  };

  const handlePrintPO = (po: PoVendor) => {
    setPrintState({ type: 'PO', inv: null, po });
  };

  const exportCSVAll = () => {
    let csv = "data:text/csv;charset=utf-8,No Nota,Tipe,Tanggal,Jatuh Tempo,Pelanggan,WhatsApp,Total,Dibayar,Sisa,Status Bayar,Status Job\n";
    invoices.forEach((inv) => {
      csv += `"${inv.noInv}","${inv.tipeDoc}","${inv.tglInv}","${inv.tempoInv}","${inv.namaCust}","${inv.waCust || ''}",${inv.grandTotal},${inv.dibayar},${inv.sisaTertagih},"${inv.statusBayar}","${inv.statusJob}"\n`;
    });
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = `Data_Penjualan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // If in Vendor Portal mode (via ?po=... or admin preview)
  if (vendorPortalPo !== null) {
    return (
      <VendorPortal
        poList={poList}
        poQuery={vendorPortalPo}
        settings={settings}
        onBackToAdmin={isLoggedIn ? () => {
          setVendorPortalPo(null);
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('po');
            url.searchParams.delete('portal');
            window.history.replaceState({}, document.title, url.pathname);
          } catch {}
        } : undefined}
        showToast={showToast}
      />
    );
  }

  if (publicPortalMode || !isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '10px 0 24px 0', position: 'relative' }}>
        {printState.type && (
          <PrintDocument
            printType={printState.type}
            invoice={printState.inv}
            poVendor={printState.po}
            settings={settings}
            onClosePrint={() => setPrintState({ type: null, inv: null, po: null })}
          />
        )}
        <CustomerPortal
          invoices={invoices}
          products={products}
          counters={counters}
          settings={settings}
          testimonials={testimonials}
          onPrintDoc={handlePrintDoc}
          onBackToAdmin={isLoggedIn ? () => setPublicPortalMode(false) : undefined}
          onOpenStaffLogin={() => setShowStaffLoginModal(true)}
          showToast={showToast}
        />

        {/* Staff Login Modal Overlay */}
        {showStaffLoginModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 99999,
              padding: '16px'
            }}
            onClick={() => setShowStaffLoginModal(false)}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                width: '100%',
                maxWidth: '360px',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowStaffLoginModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Akses Staff / Admin POS
                </h3>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Masukan kredensial resmi untuk kelola transaksi & POS
                </p>
              </div>

              {loginErrorMsg && (
                <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', color: '#991B1B', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', fontWeight: 600 }}>
                  ⚠️ {loginErrorMsg}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <UserIcon size={13} /> Username
                  </label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => {
                      setLoginUser(e.target.value);
                      if (loginErrorMsg) setLoginErrorMsg(null);
                    }}
                    placeholder="Username admin / kasir"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <Lock size={13} /> Password
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      value={loginPass}
                      onChange={(e) => {
                        setLoginPass(e.target.value);
                        if (loginErrorMsg) setLoginErrorMsg(null);
                      }}
                      placeholder="Password"
                      required
                      style={{ paddingRight: '36px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      tabIndex={-1}
                      title={showLoginPass ? 'Sembunyikan Password' : 'Lihat Password'}
                    >
                      {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, borderRadius: '8px' }}
                >
                  <Lock size={15} /> Masuk ke POS Admin
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Toast Notification */}
      {toast && (
        <div id="toast" className={toast.isErr ? 'error' : ''}>
          {toast.msg}
        </div>
      )}

      {/* Print Overlay Container */}
      {printState.type && (
        <PrintDocument
          printType={printState.type}
          invoice={printState.inv}
          poVendor={printState.po}
          settings={settings}
          onClosePrint={() => setPrintState({ type: null, inv: null, po: null })}
        />
      )}

      <div className="layout-container">
        {/* Mobile Sidebar Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(2px)',
              zIndex: 999
            }}
          />
        )}

        {/* Sidebar */}
        <div className={`sidebar-container ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <aside className="sidebar">
            <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {settings.logoUrl ? (
                  <div className="sidebar-brand-logo-container">
                    <img
                      src={convertToDirectImageUrl(settings.logoUrl)}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultLogoImg;
                      }}
                    />
                  </div>
                ) : (
                  <div className="brand-accent"></div>
                )}
                <span>{settings.company || 'CTRL PRINT'}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="btn-close-sidebar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: mobileSidebarOpen ? 'flex' : 'none',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Tutup Menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="sidebar-nav">
              <div className="nav-section-title">OPERASIONAL</div>
              <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </button>
              <button className={`nav-link ${activeTab === 'buat-invoice' ? 'active' : ''}`} onClick={() => { setActiveTab('buat-invoice'); setMobileSidebarOpen(false); }}>
                <FilePlus size={16} />
                <span>Transaksi Baru</span>
              </button>
              <button className={`nav-link ${activeTab === 'riwayat-invoice' ? 'active' : ''}`} onClick={() => { setActiveTab('riwayat-invoice'); setMobileSidebarOpen(false); }}>
                <ClipboardList size={16} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span>Riwayat & Job Board</span>
                  {invoices.filter((i) => i.buktiBayarUrl && i.statusBayar !== 'Paid' && i.statusBayar !== 'Lunas').length > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                      {invoices.filter((i) => i.buktiBayarUrl && i.statusBayar !== 'Paid' && i.statusBayar !== 'Lunas').length} New
                    </span>
                  )}
                </span>
              </button>
              <button className={`nav-link ${activeTab === 'po-vendor' ? 'active' : ''}`} onClick={() => { setActiveTab('po-vendor'); setMobileSidebarOpen(false); }}>
                <ShoppingBag size={16} />
                <span>PO & SPK Vendor</span>
              </button>
              <button className={`nav-link ${activeTab === 'acc-desain' ? 'active' : ''}`} onClick={() => { setActiveTab('acc-desain'); setMobileSidebarOpen(false); }}>
                <Palette size={16} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span>Portal & ACC Desain</span>
                  {invoices.filter((i) => i.accDesainStatus === 'Menunggu ACC' || i.accDesainStatus === 'Minta Revisi').length > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#F59E0B', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                      {invoices.filter((i) => i.accDesainStatus === 'Menunggu ACC' || i.accDesainStatus === 'Minta Revisi').length} Pending
                    </span>
                  )}
                </span>
              </button>

              <div className="nav-section-title" style={{ marginTop: '10px' }}>KATALOG & MASTER</div>
              <button className={`nav-link ${activeTab === 'produk' ? 'active' : ''}`} onClick={() => { setActiveTab('produk'); setMobileSidebarOpen(false); }}>
                <Tag size={16} />
                <span>Produk & Jasa</span>
              </button>
              <button className={`nav-link ${activeTab === 'stok-bahan' ? 'active' : ''}`} onClick={() => { setActiveTab('stok-bahan'); setMobileSidebarOpen(false); }}>
                <Package size={16} />
                <span>Bahan Baku</span>
              </button>
              <button className={`nav-link ${activeTab === 'vendor' ? 'active' : ''}`} onClick={() => { setActiveTab('vendor'); setMobileSidebarOpen(false); }}>
                <Store size={16} />
                <span>Vendor / Suplier</span>
              </button>
              <button className={`nav-link ${activeTab === 'customer' ? 'active' : ''}`} onClick={() => { setActiveTab('customer'); setMobileSidebarOpen(false); }}>
                <Users size={16} />
                <span>Pelanggan</span>
              </button>

              <div className="nav-section-title" style={{ marginTop: '10px' }}>KEUANGAN & FITUR</div>
              <button className={`nav-link ${activeTab === 'pengeluaran' ? 'active' : ''}`} onClick={() => { setActiveTab('pengeluaran'); setMobileSidebarOpen(false); }}>
                <Wallet size={16} />
                <span>Pengeluaran</span>
              </button>
              <button
                className={`nav-link ${activeTab === 'email-manager' ? 'active' : ''}`}
                onClick={() => { setActiveTab('email-manager'); setMobileSidebarOpen(false); }}
                style={{
                  background: activeTab === 'email-manager' ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  color: activeTab === 'email-manager' ? '#2563EB' : 'inherit'
                }}
              >
                <Mail size={16} color={activeTab === 'email-manager' ? '#2563EB' : 'currentColor'} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span style={{ fontWeight: 600 }}>Email & Tracking</span>
                  {emailLogs.filter((l) => l.status === 'read').length > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#10B981', color: '#FFF', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                      {emailLogs.filter((l) => l.status === 'read').length} Read
                    </span>
                  )}
                </span>
              </button>
              <button
                className={`nav-link ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ai-assistant'); setMobileSidebarOpen(false); }}
                style={{
                  background: activeTab === 'ai-assistant' ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(67, 56, 202, 0.15) 100%)' : 'transparent',
                  color: activeTab === 'ai-assistant' ? '#2563EB' : 'inherit'
                }}
              >
                <Bot size={16} color="#2563EB" />
                <span style={{ fontWeight: 700 }}>AI Advisor & Chat</span>
              </button>
            </nav>
          </aside>
        </div>

        {/* Main Content */}
        <div className="main-wrapper">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
              <button className="menu-toggle" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} aria-label="Toggle Menu">
                <MenuIcon size={18} />
              </button>

              {/* Minimalist Breadcrumb / Page Title */}
              <div className="topbar-title-block" style={{ minWidth: 0, overflow: 'hidden' }}>
                <span className="topbar-title-text" style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTab === 'dashboard' && 'Dashboard & Analitik'}
                  {activeTab === 'buat-invoice' && 'Kasir & Transaksi Baru'}
                  {activeTab === 'riwayat-invoice' && 'Riwayat Transaksi & Job Board'}
                  {activeTab === 'po-vendor' && 'Surat Perintah Kerja (PO)'}
                  {activeTab === 'acc-desain' && 'Portal ACC Desain'}
                  {activeTab === 'produk' && 'Katalog Produk & Jasa'}
                  {activeTab === 'stok-bahan' && 'Manajemen Stok Bahan'}
                  {activeTab === 'vendor' && 'Daftar Vendor & Mitra'}
                  {activeTab === 'customer' && 'Database Pelanggan'}
                  {activeTab === 'pengeluaran' && 'Biaya Operasional'}
                  {activeTab === 'email-manager' && 'Email & Log Notifikasi'}
                  {activeTab === 'ai-assistant' && 'AI Assistant Percetakan'}
                  {activeTab === 'settings' && 'Pengaturan Sistem'}
                </span>
              </div>
            </div>

            <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {/* Cloud Database Sync Status */}
              <SyncStatusBadge compact={true} />

              {/* Quick Dark Mode Switcher */}
              <button
                type="button"
                className="btn btn-outline"
                onClick={toggleDarkMode}
                style={{
                  width: '34px',
                  height: '34px',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px'
                }}
                title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Notification Center Dropdown */}
              <div className="dropdown" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-outline topbar-icon-btn"
                  style={{
                    padding: '6px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: unreadNotifCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    borderColor: unreadNotifCount > 0 ? '#EF4444' : 'var(--border-color)',
                    color: unreadNotifCount > 0 ? '#EF4444' : 'inherit'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotifDropOpen(!notifDropOpen);
                    setMenuDropOpen(false);
                  }}
                  title="Pusat Notifikasi Order Online & Upload Bukti Bayar"
                >
                  <Bell size={15} />
                  <span className="topbar-btn-label" style={{ fontWeight: 600 }}>Notifikasi</span>
                  {unreadNotifCount > 0 && (
                    <span
                      style={{
                        background: '#EF4444',
                        color: '#FFF',
                        borderRadius: '10px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        minWidth: '16px',
                        textAlign: 'center'
                      }}
                    >
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                {notifDropOpen && (
                  <div
                    className="dropdown-content show"
                    style={{
                      right: 0,
                      width: '380px',
                      maxWidth: '92vw',
                      maxHeight: '480px',
                      overflowY: 'auto',
                      padding: '12px',
                      borderRadius: '12px',
                      boxShadow: '0 12px 35px rgba(0,0,0,0.22)',
                      background: 'var(--bg-card, #FFFFFF)',
                      zIndex: 1000,
                      border: '1px solid var(--border-color)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                        <Bell size={15} style={{ color: '#2563EB' }} /> Pusat Notifikasi ({notifications.length})
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !soundEnabled;
                            setSoundEnabled(next);
                            setNotificationSoundEnabled(next);
                            if (next) {
                              playNotificationSound('order', true);
                              showToast('🔊 Suara notifikasi diaktifkan');
                            } else {
                              showToast('🔇 Suara notifikasi dibisukan');
                            }
                          }}
                          style={{
                            background: soundEnabled ? 'rgba(37, 99, 235, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                            border: `1px solid ${soundEnabled ? 'rgba(37, 99, 235, 0.25)' : 'var(--border-color)'}`,
                            color: soundEnabled ? '#2563EB' : 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={soundEnabled ? 'Klik untuk membisukan suara notifikasi' : 'Klik untuk mengaktifkan suara notifikasi'}
                        >
                          {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                          <span>{soundEnabled ? 'Suara ON' : 'Bisu'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playNotificationSound('order', true);
                            showToast('Uji coba suara notifikasi berhasil!');
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '3px 7px',
                            borderRadius: '6px'
                          }}
                          title="Tes Bunyi Notifikasi"
                        >
                          Tes
                        </button>
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMarkAllNotifsRead(notifications)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563EB',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '3px 4px'
                            }}
                            title="Tandai semua notifikasi sudah dibaca di semua perangkat"
                          >
                            Bersihkan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      {[
                        { key: 'all', label: 'Semua' },
                        { key: 'email', label: '📬 Email' },
                        { key: 'order', label: '🛒 Order' },
                        { key: 'acc_desain', label: '🎨 Desain' },
                        { key: 'stok', label: '⚠️ Stok' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setNotifCategoryFilter(tab.key as any)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            border: '1px solid',
                            borderColor: notifCategoryFilter === tab.key ? '#2563EB' : 'var(--border-color)',
                            background: notifCategoryFilter === tab.key ? '#2563EB' : 'transparent',
                            color: notifCategoryFilter === tab.key ? '#FFF' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {filteredNotifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                          <CheckCircle size={24} style={{ opacity: 0.4 }} />
                        </div>
                        Tidak ada notifikasi baru untuk kategori ini.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              handleMarkNotifRead(notif.id);
                              if (notif.linkTab === 'riwayat-invoice' && notif.linkParam) {
                                setJobSearchTerm(notif.linkParam);
                              }
                              if (notif.linkTab === 'email-manager' && notif.linkParam) {
                                setSelectedEmailLogId(notif.linkParam);
                              }
                              setActiveTab(notif.linkTab as any);
                              setNotifDropOpen(false);
                            }}
                            style={{
                              padding: '10px',
                              borderRadius: '8px',
                              background:
                                notif.type === 'email_read'
                                  ? 'rgba(16, 185, 129, 0.08)'
                                  : notif.type === 'stok_menipis'
                                  ? 'rgba(239, 68, 68, 0.08)'
                                  : 'rgba(37, 99, 235, 0.08)',
                              borderLeft: `3px solid ${
                                notif.type === 'email_read'
                                  ? '#10B981'
                                  : notif.type === 'stok_menipis'
                                  ? '#EF4444'
                                  : '#2563EB'
                              }`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  color:
                                    notif.type === 'email_read'
                                      ? '#059669'
                                      : notif.type === 'stok_menipis'
                                      ? '#DC2626'
                                      : notif.type === 'order_online'
                                      ? '#2563EB'
                                      : '#D97706',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {notif.type === 'email_read' && <Mail size={12} />}
                                {notif.type === 'order_online' && <ShoppingBag size={12} />}
                                {notif.type === 'bukti_bayar' && <CreditCard size={12} />}
                                {notif.type === 'acc_desain' && <Palette size={12} />}
                                {notif.type === 'stok_menipis' && <Package size={12} />}
                                {notif.title}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {notif.badge && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      padding: '1px 5px',
                                      borderRadius: '6px',
                                      fontWeight: 800,
                                      background: notif.type === 'email_read' ? '#10B981' : '#2563EB',
                                      color: '#FFF'
                                    }}
                                  >
                                    {notif.badge}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNotifRead(notif.id);
                                  }}
                                  title="Hapus notifikasi ini"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    lineHeight: 1,
                                    borderRadius: '4px'
                                  }}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-main)', fontWeight: 600 }}>
                              {notif.desc}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{notif.time}</span>
                              <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700 }}>
                                Buka Detail &rarr;
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('email-manager');
                          setNotifDropOpen(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Mail size={13} /> Kelola Email & Log Notifikasi Lengkap &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu System Dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-outline topbar-icon-btn"
                  style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuDropOpen(!menuDropOpen);
                    setNotifDropOpen(false);
                  }}
                >
                  <Settings2 size={15} />
                  <span className="topbar-btn-label">Menu System</span>
                </button>
                {menuDropOpen && (
                  <div className="dropdown-content show">
                    <button onClick={() => { setMenuDropOpen(false); setPublicPortalMode(true); }}>
                      <Globe size={15} /> Buka Portal Customer (Publik)
                    </button>
                    <button onClick={() => { setMenuDropOpen(false); setActiveTab('settings'); }}>
                      <SettingsIcon size={15} /> Pengaturan
                    </button>
                    <button onClick={() => { setMenuDropOpen(false); toggleDarkMode(); }}>
                      {isDarkMode ? <><Sun size={15} /> Mode Terang</> : <><Moon size={15} /> Mode Gelap</>}
                    </button>
                    <button onClick={() => { setMenuDropOpen(false); exportCSVAll(); }}>
                      <Download size={15} /> Export Penjualan (CSV)
                    </button>
                    <button onClick={() => { setMenuDropOpen(false); handleLogout(); }} style={{ color: 'var(--danger)' }}>
                      <LogOut size={15} /> Logout Admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="content-area">
            {activeTab === 'dashboard' && (
              <div className="tab-content active">
                <Dashboard
                  invoices={invoices}
                  expenses={expenses}
                  poVendors={poList}
                  settings={settings}
                  showToast={showToast}
                  onNavigateTab={(tab, param) => {
                    if (param) setJobSearchTerm(param);
                    setActiveTab(tab as any);
                  }}
                />
              </div>
            )}

            {activeTab === 'buat-invoice' && (
              <div className="tab-content active">
                <Calculators showToast={showToast} />
                <TransaksiForm
                  invoices={invoices}
                  customers={customers}
                  products={products}
                  bahans={bahans}
                  counters={counters}
                  settings={settings}
                  editingInvoice={editingInvoice}
                  finishingGroups={finishingGroups}
                  onFinish={() => {
                    setEditingInvoice(null);
                    setActiveTab('riwayat-invoice');
                  }}
                  onCancelEdit={() => setEditingInvoice(null)}
                  showToast={showToast}
                />
              </div>
            )}

            {activeTab === 'riwayat-invoice' && (
              <div className="tab-content active">
                <RiwayatJob
                  invoices={invoices}
                  counters={counters}
                  settings={settings}
                  onEditInvoice={handleEditInvoice}
                  onPrintDoc={handlePrintDoc}
                  showToast={showToast}
                  initialSearchTerm={jobSearchTerm}
                />
              </div>
            )}

            {activeTab === 'po-vendor' && (
              <div className="tab-content active">
                <PoVendorPage
                  poList={poList}
                  vendors={vendors}
                  counters={counters}
                  settings={settings}
                  onPrintPO={handlePrintPO}
                  onOpenVendorPortal={(po) => setVendorPortalPo(po.noPo)}
                  showToast={showToast}
                />
              </div>
            )}

            {activeTab === 'acc-desain' && (
              <div className="tab-content active">
                <AccDesainPage
                  invoices={invoices}
                  settings={settings}
                  showToast={showToast}
                  isAdmin={isLoggedIn}
                />
              </div>
            )}

            {activeTab === 'stok-bahan' && (
              <div className="tab-content active">
                <StokBahanPage bahans={bahans} showToast={showToast} />
              </div>
            )}

            {activeTab === 'pengeluaran' && (
              <div className="tab-content active">
                <PengeluaranPage expenses={expenses} vendors={vendors} showToast={showToast} />
              </div>
            )}

            {activeTab === 'produk' && (
              <div className="tab-content active">
                <ProdukPage products={products} bahans={bahans} finishingGroups={finishingGroups} showToast={showToast} />
              </div>
            )}

            {activeTab === 'vendor' && (
              <div className="tab-content active">
                <VendorPage vendors={vendors} showToast={showToast} />
              </div>
            )}

            {activeTab === 'customer' && (
              <div className="tab-content active">
                <CustomerPage customers={customers} invoices={invoices} showToast={showToast} />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="tab-content active">
                <SettingsPage
                  settings={settings}
                  testimonials={testimonials}
                  invoices={invoices}
                  customers={customers}
                  showToast={showToast}
                />
              </div>
            )}

            {activeTab === 'customer-portal' && (
              <div className="tab-content active">
                <CustomerPortal
                  invoices={invoices}
                  products={products}
                  counters={counters}
                  settings={settings}
                  testimonials={testimonials}
                  onPrintDoc={handlePrintDoc}
                  showToast={showToast}
                />
              </div>
            )}

            {activeTab === 'email-manager' && (
              <div className="tab-content active">
                <EmailManagerPage
                  settings={settings}
                  emailLogs={emailLogs}
                  invoices={invoices}
                  poList={poList}
                  customers={customers}
                  vendors={vendors}
                  showToast={showToast}
                  initialSelectedLogId={selectedEmailLogId || undefined}
                />
              </div>
            )}

            {activeTab === 'ai-assistant' && (
              <div className="tab-content active">
                <AIAssistantTab
                  summary={{
                    totalOmset: invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0),
                    totalPiutang: invoices.reduce((acc, inv) => acc + (inv.sisaTertagih || 0), 0),
                    totalPengeluaran: expenses.reduce((acc, exp) => acc + (exp.nominal || 0), 0),
                    profitBersih:
                      invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0) -
                      expenses.reduce((acc, exp) => acc + (exp.nominal || 0), 0),
                  }}
                  invoiceCount={invoices.length}
                  showToast={showToast}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar for Handphones */}
      <nav className="mobile-bottom-bar" aria-label="Navigasi Cepat Mobile">
        <button
          type="button"
          className={`mobile-bottom-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-tab ${activeTab === 'buat-invoice' ? 'active' : ''}`}
          onClick={() => setActiveTab('buat-invoice')}
        >
          <FilePlus size={18} />
          <span>Kasir POS</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-tab ${activeTab === 'riwayat-invoice' ? 'active' : ''}`}
          onClick={() => setActiveTab('riwayat-invoice')}
        >
          <ClipboardList size={18} />
          <span>Job Board</span>
        </button>
        <button
          type="button"
          className={`mobile-bottom-tab ${activeTab === 'customer-portal' ? 'active' : ''}`}
          onClick={() => setActiveTab('customer-portal')}
        >
          <Globe size={18} />
          <span>Web Order</span>
        </button>
        <button
          type="button"
          className="mobile-bottom-tab"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <MenuIcon size={18} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
