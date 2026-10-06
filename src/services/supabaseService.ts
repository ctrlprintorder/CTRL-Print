import { getSupabaseClient, isSupabaseConfigured, getStoredSupabaseConfig } from '../lib/supabase';
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
  Voucher
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_COUNTERS,
  getCachedSettings,
  getCachedCounters
} from '../firebaseService';

// Helper to convert camelCase object to snake_case for PostgreSQL
export function toSnakeCaseKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Helper to convert snake_case object to camelCase for TS
export function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function objectToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj; // keep array contents as-is for jsonb fields
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        const snake = toSnakeCaseKey(key);
        res[snake] = obj[key];
      }
    }
    return res;
  }
  return obj;
}

export function objectToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      if (key === 'created_at' || key === 'updated_at') continue;
      const camel = toCamelCaseKey(key);
      res[camel] = obj[key];
    }
    return res;
  }
  return obj;
}

// Transform specific item to Supabase table row
export function transformToDbRow(tableName: string, item: any): any {
  if (tableName === 'settings' || tableName === 'counters') {
    return {
      id: 'global',
      data: item,
      updated_at: new Date().toISOString()
    };
  }

  const row = objectToSnakeCase(item);
  row.id = String(item.id || Date.now());
  row.updated_at = new Date().toISOString();
  return row;
}

// Transform DB row to TS item
export function transformFromDbRow(tableName: string, row: any): any {
  if (tableName === 'settings' || tableName === 'counters') {
    return row.data;
  }
  return objectToCamelCase(row);
}

// Test Connection
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; count?: number }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase URL atau Anon Key belum diisi.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Gagal menginisialisasi client Supabase.' };
  }

  try {
    const { data, error } = await client.from('settings').select('id').limit(1);
    if (error) {
      // Check if table missing
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: false,
          message: `Koneksi berhasil, namun tabel belum dibuat di Supabase. Silakan jalankan script SQL di Supabase SQL Editor!`
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Terhubung ke database PostgreSQL Supabase dengan sukses!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menghubungi server Supabase.' };
  }
}

// Fetch all rows from a Supabase table
export async function fetchSupabaseTable<T extends { id: string }>(tableName: string): Promise<T[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.from(tableName).select('*');
    if (error) {
      console.warn(`Supabase fetch error for ${tableName}:`, error);
      return [];
    }
    if (!data) return [];
    return data.map((row) => transformFromDbRow(tableName, row) as T);
  } catch (err) {
    console.error(`Error fetching table ${tableName}:`, err);
    return [];
  }
}

// Save a single document to Supabase
export async function saveSupabaseDocument<T extends { id: string }>(
  tableName: string,
  item: T
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const row = transformToDbRow(tableName, item);
    const { error } = await client.from(tableName).upsert(row, { onConflict: 'id' });
    if (error) {
      console.error(`Supabase save error for ${tableName}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`Supabase save exception for ${tableName}:`, err);
    return { success: false, error: err.message };
  }
}

// Delete a document from Supabase
export async function deleteSupabaseDocument(
  tableName: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client.from(tableName).delete().eq('id', String(id));
    if (error) {
      console.error(`Supabase delete error for ${tableName}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Save Settings to Supabase
export async function saveSupabaseSettings(settings: Settings): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = {
      id: 'global',
      data: settings,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('settings').upsert(row, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

// Save Counters to Supabase
export async function saveSupabaseCounters(counters: Counters): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = {
      id: 'global',
      data: counters,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('counters').upsert(row, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

// Comprehensive 1-Click Sync from Local Data to Supabase PostgreSQL
export async function syncAllLocalDataToSupabase(
  onProgress?: (msg: string, percent: number) => void
): Promise<{ success: boolean; message: string; details?: any }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase belum dikonfigurasi. Masukkan URL dan Anon Key terlebih dahulu.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Client Supabase tidak valid.' };
  }

  const stats: Record<string, number> = {};

  try {
    onProgress?.('Memeriksa koneksi database Supabase...', 5);
    const connCheck = await testSupabaseConnection();
    if (!connCheck.success) {
      return { success: false, message: connCheck.message };
    }

    // 1. Settings
    onProgress?.('Menyinkronkan Pengaturan Bisnis & Template WA...', 10);
    const currentSettings = getCachedSettings();
    await saveSupabaseSettings(currentSettings);
    stats['settings'] = 1;

    // 2. Counters
    onProgress?.('Menyinkronkan Nomor Nota & Counter...', 20);
    const currentCounters = getCachedCounters();
    await saveSupabaseCounters(currentCounters);
    stats['counters'] = 1;

    // 3. Customers
    onProgress?.('Menyinkronkan Data Pelanggan...', 30);
    const customersStr = localStorage.getItem('ctrl_print_col_customer');
    const customers: Customer[] = customersStr ? JSON.parse(customersStr) : [];
    if (customers.length > 0) {
      const rows = customers.map((c) => transformToDbRow('customer', c));
      const { error } = await client.from('customer').upsert(rows, { onConflict: 'id' });
      if (error) console.warn('Customer sync error:', error);
      stats['customer'] = customers.length;
    }

    // 4. Vendors
    onProgress?.('Menyinkronkan Data Vendor...', 40);
    const vendorsStr = localStorage.getItem('ctrl_print_col_vendor');
    const vendors: Vendor[] = vendorsStr ? JSON.parse(vendorsStr) : [];
    if (vendors.length > 0) {
      const rows = vendors.map((v) => transformToDbRow('vendor', v));
      await client.from('vendor').upsert(rows, { onConflict: 'id' });
      stats['vendor'] = vendors.length;
    }

    // 5. Bahan Baku / Inventory
    onProgress?.('Menyinkronkan Stok & Bahan Baku...', 50);
    const bahansStr = localStorage.getItem('ctrl_print_col_bahan_baku');
    const bahans: Bahan[] = bahansStr ? JSON.parse(bahansStr) : [];
    if (bahans.length > 0) {
      const rows = bahans.map((b) => transformToDbRow('bahan_baku', b));
      await client.from('bahan_baku').upsert(rows, { onConflict: 'id' });
      stats['bahan_baku'] = bahans.length;
    }

    // 6. Produk
    onProgress?.('Menyinkronkan Katalog Produk & Layanan...', 60);
    const produkStr = localStorage.getItem('ctrl_print_col_produk');
    const products: Produk[] = produkStr ? JSON.parse(produkStr) : [];
    if (products.length > 0) {
      const rows = products.map((p) => transformToDbRow('produk', p));
      await client.from('produk').upsert(rows, { onConflict: 'id' });
      stats['produk'] = products.length;
    }

    // 7. Invoices
    onProgress?.('Menyinkronkan Seluruh Nota & Riwayat Job...', 70);
    const invStr = localStorage.getItem('ctrl_print_col_invoice');
    const invoices: Invoice[] = invStr ? JSON.parse(invStr) : [];
    if (invoices.length > 0) {
      // Chunk upsert to prevent request size limit if hundreds of invoices exist
      const chunkSize = 25;
      for (let i = 0; i < invoices.length; i += chunkSize) {
        const chunk = invoices.slice(i, i + chunkSize);
        const rows = chunk.map((inv) => transformToDbRow('invoice', inv));
        const { error } = await client.from('invoice').upsert(rows, { onConflict: 'id' });
        if (error) console.error('Invoice batch sync error:', error);
      }
      stats['invoice'] = invoices.length;
    }

    // 8. Pengeluaran
    onProgress?.('Menyinkronkan Catatan Pengeluaran...', 80);
    const expStr = localStorage.getItem('ctrl_print_col_pengeluaran');
    const expenses: Pengeluaran[] = expStr ? JSON.parse(expStr) : [];
    if (expenses.length > 0) {
      const rows = expenses.map((e) => transformToDbRow('pengeluaran', e));
      await client.from('pengeluaran').upsert(rows, { onConflict: 'id' });
      stats['pengeluaran'] = expenses.length;
    }

    // 9. PO Vendor
    onProgress?.('Menyinkronkan Data SPK & PO Vendor...', 90);
    const poStr = localStorage.getItem('ctrl_print_col_po_vendor');
    const poList: PoVendor[] = poStr ? JSON.parse(poStr) : [];
    if (poList.length > 0) {
      const rows = poList.map((p) => transformToDbRow('po_vendor', p));
      await client.from('po_vendor').upsert(rows, { onConflict: 'id' });
      stats['po_vendor'] = poList.length;
    }

    onProgress?.('Sinkronisasi selesai 100%!', 100);
    return {
      success: true,
      message: `Berhasil memigrasikan dan menyinkronkan seluruh data ke database PostgreSQL Supabase!`,
      details: stats
    };
  } catch (err: any) {
    console.error('Error during full sync to Supabase:', err);
    return {
      success: false,
      message: `Terjadi kendala saat migrasi: ${err.message || String(err)}`
    };
  }
}
