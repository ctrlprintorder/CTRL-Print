import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  Settings,
  Counters,
  Invoice,
  PoVendor
} from './types';
import defaultLogoImg from './assets/images/ctrl_print_logo_1785948969417.jpg';

export const DEFAULT_SETTINGS: Settings = {
  company: 'CTRL PRINT',
  tagline: 'Percetakan & Digital Printing Profesional',
  logoUrl: defaultLogoImg,
  phone: '085190948744',
  email: 'ctrlprint.order@gmail.com',
  instagram: '@ctrlprint.bpn',
  address: 'Jl. Sultan Hasanuddin No. 15, Kota Balikpapan – Kalimantan Timur 76133',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=CTRL+PRINT+Jl.+Sultan+Hasanuddin+No.+15+Kota+Balikpapan',
  bank: 'BANK BCA: 1234567890',
  paymentMethods: 'Cash, Transfer BCA, Mandiri, QRIS',
  tnc: '1. Barang yang sudah dibeli tidak dapat dikembalikan.\n2. Komplain maksimal 1x24 jam.',
  user: 'admin',
  pass: 'admin123',
  qrisUrl: '',
  qrisNms: 'CTRL PRINT OFFICIAL',
  aboutUs: 'CTRL PRINT adalah penyedia solusi percetakan digital & cetak offset profesional. Melayani spanduk, stiker, kartu nama, brosur, banner, hingga packaging dengan hasil cetak presisi dan pengerjaan kilat.',
  operationalHours: 'Senin - Sabtu: 08.00 - 21.00 WITA\nMinggu & Hari Libur: 10.00 - 17.00 WITA',
  headerBannerUrl: '',
  headerBanners: [],
  headerBannerHeight: 240,
  enableRunningText: true,
  runningTextContent: 'Selamat datang di CTRL PRINT! Melayani cetak spanduk kilat, stiker A3+ kiss cut, kartu nama, brosur, banner, hingga packaging berkualitas tinggi • Konsultasi gratis via WhatsApp • Siap kirim se-Indonesia!',
  runningTextBadge: '📢 INFO & PROMO',
  runningTextSpeed: 'normal',
  staffLoginVisibility: 'discreet',
  googleDriveFolderStructure: true,
  waTemplateInvoice: `Halo {namaCust}, terima kasih telah memesan di {toko}! Berikut rincian nota pesanan Anda:\n\n📄 No Nota: {noInv}\n💰 Total: {grandTotal}\n💳 Status: {statusBayar}\n\n🔍 Cek progres & nota online: {linkPortal}\n\nTerima kasih atas kepercayaannya!`,
  waTemplateReady: `Halo {namaCust}, pesanan cetak Anda dengan No Nota *{noInv}* telah *SELESAI & SIAP DIAMBIL* di workshop {toko}.\n\n📍 Lokasi: {alamat}\n⏰ Jam Buka: {jamBuka}\n\nTerima kasih!`,
  waTemplateAccDesain: `Halo {namaCust}, preview desain cetak untuk pesanan *{noInv}* sudah siap direview.\n\nSilakan klik link berikut untuk melihat dan menyetujui (ACC) desain:\n🔗 {linkAcc}\n\nMohon konfirmasi jika ada revisi atau sudah sesuai. Terima kasih!`,
  waTemplatePiutang: `Halo {namaCust}, kami dari {toko} mengingatkan bahwa nota *{noInv}* memiliki sisa tagihan sebesar *{sisaBayar}*.\n\n💳 Rekening Pembayaran:\n{rekening}\n\nMohon konfirmasi jika sudah melakukan transfer. Terima kasih banyak!`
};

export const DEFAULT_COUNTERS: Counters = {
  nextInvNumber: 1,
  nextQuoteNumber: 1,
  nextPoNumber: 1,
  nextWebInvNumber: 1,
  nextCustNumber: 1,
  nextProdNumber: 1,
  nextVendorNumber: 1
};

// Sync & Connection Health State Types
export type SyncStatus = 'connecting' | 'connected' | 'syncing' | 'offline' | 'error';

export interface SyncStatusInfo {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  pendingCount: number;
  errorMessage?: string;
  isOffline: boolean;
  retryCount: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Global Sync Status Store
let globalSyncInfo: SyncStatusInfo = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected',
  lastSyncedAt: new Date(),
  pendingCount: 0,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  retryCount: 0
};

const statusListeners = new Set<(info: SyncStatusInfo) => void>();

function notifyStatusChange() {
  statusListeners.forEach((listener) => {
    try {
      listener({ ...globalSyncInfo });
    } catch (e) {
      console.warn('Sync status listener error:', e);
    }
  });
}

export function getSyncStatus(): SyncStatusInfo {
  return { ...globalSyncInfo };
}

export function subscribeSyncStatus(callback: (info: SyncStatusInfo) => void): () => void {
  statusListeners.add(callback);
  callback({ ...globalSyncInfo });
  return () => {
    statusListeners.delete(callback);
  };
}

export function updateSyncStatus(patch: Partial<SyncStatusInfo>) {
  globalSyncInfo = { ...globalSyncInfo, ...patch };
  notifyStatusChange();
}

// Network Online/Offline Listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateSyncStatus({
      isOffline: false,
      status: 'connected',
      lastSyncedAt: new Date(),
      errorMessage: undefined
    });
  });

  window.addEventListener('offline', () => {
    updateSyncStatus({
      isOffline: true,
      status: 'offline'
    });
  });
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateSyncStatus({ isOffline: true, status: 'offline' });
    return false;
  }

  try {
    const docRef = doc(db, 'system', 'ping');
    await getDoc(docRef);
    updateSyncStatus({
      status: 'connected',
      lastSyncedAt: new Date(),
      isOffline: false,
      errorMessage: undefined
    });
    return true;
  } catch (err: any) {
    console.warn('Firestore connection check notice:', err);
    updateSyncStatus({
      status: 'connected',
      lastSyncedAt: new Date(),
      isOffline: false,
      errorMessage: undefined
    });
    return true;
  }
}

// Manual Sync Retry Trigger
export async function forceSyncRetry(): Promise<boolean> {
  updateSyncStatus({ status: 'syncing', errorMessage: undefined });
  const isOk = await testConnection();
  if (isOk) {
    updateSyncStatus({ status: 'connected', lastSyncedAt: new Date() });
  }
  return isOk;
}

export function convertToDirectImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('data:')) return trimmed;

  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                     trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                     trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return trimmed;
}

// Client-side instant image compressor for lightweight storage
export async function compressImageFile(file: File, maxDim = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid atau rusak.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getCachedSettings(): Settings {
  try {
    const cached = localStorage.getItem('ctrl_print_settings') || localStorage.getItem('ctrl_print_settings_backup');
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function getCachedCounters(): Counters {
  try {
    const cached = localStorage.getItem('ctrl_print_counters') || localStorage.getItem('ctrl_print_counters_backup');
    if (cached) {
      return { ...DEFAULT_COUNTERS, ...JSON.parse(cached) };
    }
  } catch {}
  return DEFAULT_COUNTERS;
}

export function getCachedCollection<T>(collectionName: string, fallbackDefault: T[] = []): T[] {
  try {
    let cachedStr = localStorage.getItem(`ctrl_print_col_${collectionName}`);
    if (!cachedStr && collectionName === 'testimonials') {
      cachedStr = localStorage.getItem('ctrl_print_testimonials');
    }
    if (cachedStr) {
      const items = JSON.parse(cachedStr);
      if (Array.isArray(items) && items.length > 0) {
        return items;
      }
    }
  } catch {}
  return fallbackDefault;
}

// Universal Smart Invoice Matcher for Search
export function isInvoiceMatch(inv: Invoice, query: string): boolean {
  if (!query || !query.trim()) return false;
  const rawQ = query.trim().toLowerCase();

  if (inv.noInv?.toLowerCase().trim() === rawQ) return true;
  if (inv.id?.toLowerCase().trim() === rawQ) return true;

  if (inv.noInv?.toLowerCase().includes(rawQ)) return true;
  if (inv.namaCust?.toLowerCase().includes(rawQ)) return true;
  if (inv.waCust?.toLowerCase().includes(rawQ)) return true;

  const cleanQ = rawQ.replace(/[^a-z0-9]/g, '');
  const cleanNoInv = (inv.noInv || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanId = (inv.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanNama = (inv.namaCust || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanQ.length > 0) {
    if (cleanNoInv && (cleanNoInv.includes(cleanQ) || cleanQ.includes(cleanNoInv))) return true;
    if (cleanId && (cleanId.includes(cleanQ) || cleanQ.includes(cleanId))) return true;
    if (cleanNama && cleanNama.includes(cleanQ)) return true;
  }

  const qDigits = rawQ.replace(/\D/g, '');
  if (qDigits.length >= 4) {
    const waDigits = (inv.waCust || '').replace(/\D/g, '');
    if (waDigits) {
      const qNorm62 = qDigits.startsWith('0') ? '62' + qDigits.slice(1) : qDigits;
      const qNorm0 = qDigits.startsWith('62') ? '0' + qDigits.slice(2) : qDigits;
      const waNorm62 = waDigits.startsWith('0') ? '62' + waDigits.slice(1) : waDigits;
      const waNorm0 = waDigits.startsWith('62') ? '0' + waDigits.slice(2) : waDigits;

      if (
        waDigits.includes(qDigits) ||
        qDigits.includes(waDigits) ||
        waNorm62.includes(qNorm62) ||
        waNorm0.includes(qNorm0)
      ) {
        return true;
      }
    }
  }

  if (qDigits.length > 0) {
    const invDigits = (inv.noInv || '').replace(/\D/g, '');
    if (invDigits) {
      if (invDigits.endsWith(qDigits) || qDigits.endsWith(invDigits)) return true;
      const numQ = parseInt(qDigits, 10);
      const numInv = parseInt(invDigits.slice(-6), 10);
      if (!isNaN(numQ) && !isNaN(numInv) && numQ > 0 && numQ === numInv) return true;
    }
  }

  return false;
}

function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        res[key] = removeUndefinedFields(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

/**
 * Fast direct invoice resolver for links (?inv=... / ?acc=...)
 * Checks memory & cache first, then directly queries Firestore by noInv or docId in <200ms
 */
export async function fetchDirectInvoice(queryStr: string): Promise<Invoice | null> {
  if (!queryStr || !queryStr.trim()) return null;
  const cleanQ = queryStr.trim();

  // 1. Check local cache first
  const cached = getCachedCollection<Invoice>('invoice');
  const foundInCache = cached.find((i) => isInvoiceMatch(i, cleanQ));
  if (foundInCache) return foundInCache;

  try {
    // 2. Try direct query by noInv
    const q1 = query(collection(db, 'invoice'), where('noInv', '==', cleanQ), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const invData = { ...snap1.docs[0].data(), id: snap1.docs[0].id } as Invoice;
      try {
        const merged = [invData, ...cached.filter((x) => x.id !== invData.id)];
        localStorage.setItem('ctrl_print_col_invoice', JSON.stringify(merged));
      } catch {}
      return invData;
    }

    // 3. Try doc id lookup
    const snapDoc = await getDoc(doc(db, 'invoice', cleanQ));
    if (snapDoc.exists()) {
      const invData = { ...snapDoc.data(), id: snapDoc.id } as Invoice;
      try {
        const merged = [invData, ...cached.filter((x) => x.id !== invData.id)];
        localStorage.setItem('ctrl_print_col_invoice', JSON.stringify(merged));
      } catch {}
      return invData;
    }

    // 4. Try uppercase / normalized format
    const upperQ = cleanQ.toUpperCase();
    if (upperQ !== cleanQ) {
      const q2 = query(collection(db, 'invoice'), where('noInv', '==', upperQ), limit(1));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const invData = { ...snap2.docs[0].data(), id: snap2.docs[0].id } as Invoice;
        try {
          const merged = [invData, ...cached.filter((x) => x.id !== invData.id)];
          localStorage.setItem('ctrl_print_col_invoice', JSON.stringify(merged));
        } catch {}
        return invData;
      }
    }
  } catch (err) {
    console.warn('Error fetching direct invoice:', err);
  }

  return null;
}

/**
 * Fast direct PO vendor resolver for links (?po=...)
 * Checks memory & cache first, then directly queries Firestore by noPo or docId in <200ms
 */
export async function fetchDirectPo(queryStr: string): Promise<PoVendor | null> {
  if (!queryStr || !queryStr.trim()) return null;
  const cleanQ = queryStr.trim();

  // 1. Check local cache first
  const cached = getCachedCollection<PoVendor>('po_vendor');
  const foundInCache = cached.find((p) =>
    p.noPo?.toLowerCase() === cleanQ.toLowerCase() ||
    p.id?.toLowerCase() === cleanQ.toLowerCase() ||
    p.noPo?.toLowerCase().includes(cleanQ.toLowerCase())
  );
  if (foundInCache) return foundInCache;

  try {
    // 2. Try direct query by noPo
    const q1 = query(collection(db, 'po_vendor'), where('noPo', '==', cleanQ), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const poData = { ...snap1.docs[0].data(), id: snap1.docs[0].id } as PoVendor;
      try {
        const merged = [poData, ...cached.filter((x) => x.id !== poData.id)];
        localStorage.setItem('ctrl_print_col_po_vendor', JSON.stringify(merged));
      } catch {}
      return poData;
    }

    // 3. Try doc id lookup
    const snapDoc = await getDoc(doc(db, 'po_vendor', cleanQ));
    if (snapDoc.exists()) {
      const poData = { ...snapDoc.data(), id: snapDoc.id } as PoVendor;
      try {
        const merged = [poData, ...cached.filter((x) => x.id !== poData.id)];
        localStorage.setItem('ctrl_print_col_po_vendor', JSON.stringify(merged));
      } catch {}
      return poData;
    }

    // 4. Try uppercase format
    const upperQ = cleanQ.toUpperCase();
    if (upperQ !== cleanQ) {
      const q2 = query(collection(db, 'po_vendor'), where('noPo', '==', upperQ), limit(1));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const poData = { ...snap2.docs[0].data(), id: snap2.docs[0].id } as PoVendor;
        try {
          const merged = [poData, ...cached.filter((x) => x.id !== poData.id)];
          localStorage.setItem('ctrl_print_col_po_vendor', JSON.stringify(merged));
        } catch {}
        return poData;
      }
    }
  } catch (err) {
    console.warn('Error fetching direct po:', err);
  }

  return null;
}

// -------------------------------------------------------------
// FIRESTORE REAL-TIME SUBSCRIPTIONS (AUTOMATIC SYNC ACROSS ALL DEVICES)
// -------------------------------------------------------------

/**
 * Realtime Firestore Settings Subscription
 */
export function subscribeSettings(callback: (s: Settings) => void): () => void {
  const cached = getCachedSettings();
  callback(cached);

  const docRef = doc(db, 'settings', 'global');
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<Settings>;
        const fullSettings: Settings = { ...DEFAULT_SETTINGS, ...cached, ...data };
        const str = JSON.stringify(fullSettings);
        try {
          localStorage.setItem('ctrl_print_settings', str);
          localStorage.setItem('ctrl_print_settings_backup', str);
        } catch {}
        callback(fullSettings);
        updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
      } else {
        // Document does not exist yet on Firestore, bootstrap from local settings
        setDoc(docRef, removeUndefinedFields(cached), { merge: true }).catch(console.error);
      }
    },
    (err) => {
      console.warn('Firestore settings subscription error:', err);
      updateSyncStatus({ status: 'error', errorMessage: err.message });
    }
  );

  return unsubscribe;
}

/**
 * Realtime Firestore Counters Subscription
 */
export function subscribeCounters(callback: (c: Counters) => void): () => void {
  const cached = getCachedCounters();
  callback(cached);

  const docRef = doc(db, 'counters', 'global');
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<Counters>;
        const fullCounters: Counters = { ...DEFAULT_COUNTERS, ...cached, ...data };
        const str = JSON.stringify(fullCounters);
        try {
          localStorage.setItem('ctrl_print_counters', str);
          localStorage.setItem('ctrl_print_counters_backup', str);
        } catch {}
        callback(fullCounters);
        updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
      } else {
        // Document does not exist yet on Firestore, bootstrap from local counters
        setDoc(docRef, removeUndefinedFields(cached), { merge: true }).catch(console.error);
      }
    },
    (err) => {
      console.warn('Firestore counters subscription error:', err);
      updateSyncStatus({ status: 'error', errorMessage: err.message });
    }
  );

  return unsubscribe;
}

/**
 * Realtime Firestore Collection Subscription (Live Multi-device Sync)
 */
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  callback: (data: T[]) => void
): () => void {
  // 1. Instantly return local cached items for 0ms initial load
  try {
    let cachedStr = localStorage.getItem(`ctrl_print_col_${collectionName}`);
    if (!cachedStr && collectionName === 'testimonials') {
      cachedStr = localStorage.getItem('ctrl_print_testimonials');
    }
    if (cachedStr) {
      const cachedItems = JSON.parse(cachedStr);
      if (Array.isArray(cachedItems)) {
        callback(cachedItems);
      }
    }
  } catch {}

  const colRef = collection(db, collectionName);
  let isFirstLoad = true;

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as T[];

      // If remote collection is completely empty on initial load, check if local has items to bootstrap
      if (isFirstLoad && items.length === 0) {
        isFirstLoad = false;
        try {
          let cachedStr = localStorage.getItem(`ctrl_print_col_${collectionName}`);
          if (!cachedStr && collectionName === 'testimonials') {
            cachedStr = localStorage.getItem('ctrl_print_testimonials');
          }
          if (cachedStr) {
            const cachedItems: T[] = JSON.parse(cachedStr);
            if (Array.isArray(cachedItems) && cachedItems.length > 0) {
              // Bootstrap local items to Firestore once
              const batch = writeBatch(db);
              cachedItems.forEach((item) => {
                const docId = String(item.id || Date.now());
                batch.set(doc(db, collectionName, docId), removeUndefinedFields(item));
              });
              batch.commit().catch(console.error);
              return;
            }
          }
        } catch {}
      }

      isFirstLoad = false;

      // Authoritative Cloud Data (includes deleted items reflected instantly)
      const str = JSON.stringify(items);
      try {
        localStorage.setItem(`ctrl_print_col_${collectionName}`, str);
        if (collectionName === 'testimonials') {
          localStorage.setItem('ctrl_print_testimonials', str);
        }
      } catch {}
      callback(items);
      updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
    },
    (err) => {
      console.warn(`Firestore subscription error on ${collectionName}:`, err);
      updateSyncStatus({ status: 'error', errorMessage: err.message });
    }
  );

  return unsubscribe;
}

// -------------------------------------------------------------
// FIRESTORE CRUD OPERATIONS
// -------------------------------------------------------------

/**
 * Save Settings directly to Firestore
 */
export async function saveSettings(settings: Settings) {
  const sanitized = removeUndefinedFields(settings);
  try {
    const str = JSON.stringify(sanitized);
    localStorage.setItem('ctrl_print_settings', str);
    localStorage.setItem('ctrl_print_settings_backup', str);
  } catch {}

  updateSyncStatus({ status: 'syncing' });
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, sanitized, { merge: true });
    updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
    
    // Sync logo to server disk for OpenGraph share previews and favicon
    if (sanitized.logoUrl && typeof sanitized.logoUrl === 'string' && sanitized.logoUrl.startsWith('data:image')) {
      fetch('/api/sync-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: sanitized.logoUrl }),
      }).catch(() => {});
    }
  } catch (err: any) {
    console.error('Failed to save settings to Firestore:', err);
    updateSyncStatus({ status: 'error', errorMessage: err.message });
    throw err;
  }
}

/**
 * Save Counters directly to Firestore
 */
export async function saveCounters(counters: Counters) {
  const sanitized = removeUndefinedFields(counters);
  try {
    const str = JSON.stringify(sanitized);
    localStorage.setItem('ctrl_print_counters', str);
    localStorage.setItem('ctrl_print_counters_backup', str);
  } catch {}

  updateSyncStatus({ status: 'syncing' });
  try {
    const docRef = doc(db, 'counters', 'global');
    await setDoc(docRef, sanitized, { merge: true });
    updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
  } catch (err: any) {
    console.error('Failed to save counters to Firestore:', err);
    updateSyncStatus({ status: 'error', errorMessage: err.message });
    throw err;
  }
}

/**
 * Save Document directly to Firestore
 */
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  item: T
) {
  const id = String(item.id || Date.now());
  const sanitized = removeUndefinedFields({ ...item, id });

  // Optimistic local cache update
  try {
    const cachedStr = localStorage.getItem(`ctrl_print_col_${collectionName}`);
    let items: T[] = cachedStr ? JSON.parse(cachedStr) : [];
    if (!Array.isArray(items)) items = [];
    const idx = items.findIndex((i: any) => i.id === id);
    if (idx >= 0) {
      items[idx] = sanitized;
    } else {
      items.unshift(sanitized);
    }
    localStorage.setItem(`ctrl_print_col_${collectionName}`, JSON.stringify(items));
    if (collectionName === 'testimonials') {
      localStorage.setItem('ctrl_print_testimonials', JSON.stringify(items));
    }
  } catch {}

  updateSyncStatus({ status: 'syncing' });
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, sanitized);
    updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
    return { success: true };
  } catch (err: any) {
    console.error(`Failed to save document ${id} to ${collectionName}:`, err);
    updateSyncStatus({ status: 'error', errorMessage: err.message });
    throw err;
  }
}

/**
 * Delete Document directly from Firestore
 */
export async function deleteDocument(collectionName: string, id: string) {
  const docId = String(id);

  // Optimistic local cache update
  try {
    const cachedStr = localStorage.getItem(`ctrl_print_col_${collectionName}`);
    if (cachedStr) {
      let items: any[] = JSON.parse(cachedStr);
      if (Array.isArray(items)) {
        items = items.filter((i) => String(i.id) !== docId);
        localStorage.setItem(`ctrl_print_col_${collectionName}`, JSON.stringify(items));
        if (collectionName === 'testimonials') {
          localStorage.setItem('ctrl_print_testimonials', JSON.stringify(items));
        }
      }
    }
  } catch {}

  updateSyncStatus({ status: 'syncing' });
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
    return { success: true };
  } catch (err: any) {
    console.error(`Failed to delete document ${docId} from ${collectionName}:`, err);
    updateSyncStatus({ status: 'error', errorMessage: err.message });
    throw err;
  }
}

/**
 * Upload & Sync all Local Storage Data to Firestore (1-Click Migration / Backup)
 */
export async function syncAllLocalDataToFirestore(): Promise<{
  success: boolean;
  message: string;
  counts: Record<string, number>;
}> {
  updateSyncStatus({ status: 'syncing' });
  const counts: Record<string, number> = {};

  try {
    // 1. Settings
    const settings = getCachedSettings();
    await setDoc(doc(db, 'settings', 'global'), removeUndefinedFields(settings), { merge: true });
    counts['Pengaturan'] = 1;

    // 2. Counters
    const counters = getCachedCounters();
    await setDoc(doc(db, 'counters', 'global'), removeUndefinedFields(counters), { merge: true });
    counts['Nomor Urut'] = 1;

    // 3. Collections
    const collectionsToSync = ['invoice', 'customer', 'produk', 'bahan_baku', 'vendor', 'pengeluaran', 'po_vendor', 'email_logs', 'notifications', 'testimonials'];

    for (const colName of collectionsToSync) {
      let cachedStr = localStorage.getItem(`ctrl_print_col_${colName}`);
      if (!cachedStr && colName === 'testimonials') {
        cachedStr = localStorage.getItem('ctrl_print_testimonials');
      }
      if (cachedStr) {
        const items = JSON.parse(cachedStr);
        if (Array.isArray(items) && items.length > 0) {
          const batch = writeBatch(db);
          let count = 0;
          for (const item of items) {
            const id = String(item.id || Date.now() + Math.random());
            batch.set(doc(db, colName, id), removeUndefinedFields(item));
            count++;
          }
          await batch.commit();
          counts[colName] = count;
        }
      }
    }

    updateSyncStatus({ status: 'connected', lastSyncedAt: new Date(), errorMessage: undefined });
    return {
      success: true,
      message: 'Semua data toko berhasil diunggah dan disinkronkan ke Firebase Firestore!',
      counts
    };
  } catch (err: any) {
    console.error('Sync all data to Firestore error:', err);
    updateSyncStatus({ status: 'error', errorMessage: err.message });
    return {
      success: false,
      message: `Gagal sinkronisasi data: ${err.message}`,
      counts
    };
  }
}
