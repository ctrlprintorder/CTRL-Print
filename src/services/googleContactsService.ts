/**
 * Google Contacts (People API v1) Integration Service for CTRL PRINT
 * Enables bidirectional sync between Google Contacts (ctrlprint.order@gmail.com)
 * and Database Pelanggan & Klien.
 */

import { Customer } from '../types';
import { getGoogleAccessToken, requestGoogleAccessToken } from '../lib/googleWorkspace';

export interface GoogleContact {
  resourceName: string; // e.g. "people/c123456789"
  etag: string;
  nama: string;
  wa: string;
  email: string;
  alamat: string;
  perusahaan: string;
  photoUrl?: string;
}

export interface GoogleAccountProfile {
  email: string;
  name: string;
  photoUrl?: string;
}

/**
 * Standardize phone string for comparison and deduplication
 */
export function normalizePhone(raw?: string): string {
  if (!raw) return '';
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  } else if (clean.startsWith('8')) {
    clean = '0' + clean;
  }
  return clean;
}

/**
 * Fetch connected Google Profile info to display account connection state
 */
export async function getGoogleProfile(token?: string): Promise<GoogleAccountProfile | null> {
  const accessToken = token || getGoogleAccessToken();
  if (!accessToken) return null;

  try {
    const res = await fetch('https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return null;
      }
      return null;
    }

    const data = await res.json();
    const email = data.emailAddresses?.[0]?.value || '';
    const name = data.names?.[0]?.displayName || '';
    const photoUrl = data.photos?.[0]?.url || '';

    return { email, name, photoUrl };
  } catch (err) {
    console.error('Error fetching Google Profile:', err);
    return null;
  }
}

/**
 * Fetch all contacts from user's Google Contacts
 */
export async function fetchAllGoogleContacts(token?: string): Promise<GoogleContact[]> {
  const accessToken = token || (await requestGoogleAccessToken('ctrlprint.order@gmail.com'));
  if (!accessToken) {
    throw new Error('Akses Google tidak tersedia. Silakan hubungkan akun Google.');
  }

  const allContacts: GoogleContact[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,addresses,organizations,photos,metadata');
    url.searchParams.set('pageSize', '250');
    url.searchParams.set('sortOrder', 'FIRST_NAME_ASCENDING');
    if (nextPageToken) {
      url.searchParams.set('pageToken', nextPageToken);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gagal mengambil kontak dari Google (HTTP ${res.status})`);
    }

    const data = await res.json();
    const connections = data.connections || [];

    for (const item of connections) {
      const nama =
        item.names?.[0]?.displayName ||
        `${item.names?.[0]?.givenName || ''} ${item.names?.[0]?.familyName || ''}`.trim();

      // Skip empty unnamed items
      if (!nama && !item.phoneNumbers?.length && !item.emailAddresses?.length) {
        continue;
      }

      const rawPhone = item.phoneNumbers?.[0]?.value || '';
      const email = item.emailAddresses?.[0]?.value || '';
      const alamat = item.addresses?.[0]?.formattedValue || item.addresses?.[0]?.streetAddress || '';
      const perusahaan = item.organizations?.[0]?.name || '';
      const photoUrl = item.photos?.[0]?.url;

      allContacts.push({
        resourceName: item.resourceName,
        etag: item.etag,
        nama: nama || 'Tanpa Nama',
        wa: rawPhone,
        email,
        alamat,
        perusahaan,
        photoUrl,
      });
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return allContacts;
}

/**
 * Add a customer into Google Contacts
 */
export async function createGoogleContact(
  customer: { nama: string; wa?: string; email?: string; alamat?: string; code?: string },
  token?: string
): Promise<GoogleContact> {
  const accessToken = token || (await requestGoogleAccessToken('ctrlprint.order@gmail.com'));
  if (!accessToken) {
    throw new Error('Akses Google tidak tersedia.');
  }

  const payload: any = {
    names: [
      {
        givenName: customer.nama,
      },
    ],
  };

  if (customer.wa && customer.wa.trim()) {
    payload.phoneNumbers = [
      {
        value: customer.wa.trim(),
        type: 'mobile',
      },
    ];
  }

  if (customer.email && customer.email.trim()) {
    payload.emailAddresses = [
      {
        value: customer.email.trim(),
        type: 'work',
      },
    ];
  }

  if (customer.alamat && customer.alamat.trim()) {
    payload.addresses = [
      {
        formattedValue: customer.alamat.trim(),
        type: 'work',
      },
    ];
  }

  payload.userDefined = [
    { key: 'Aplikasi', value: 'CTRL PRINT' },
    { key: 'KodePelanggan', value: customer.code || '' },
  ];

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal membuat kontak di Google (HTTP ${res.status})`);
  }

  const created = await res.json();
  return {
    resourceName: created.resourceName,
    etag: created.etag,
    nama: customer.nama,
    wa: customer.wa || '',
    email: customer.email || '',
    alamat: customer.alamat || '',
    perusahaan: '',
  };
}

/**
 * Batch export multiple customers into Google Contacts with progress callback
 */
export async function batchExportCustomersToGoogle(
  customersToExport: Customer[],
  token: string,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < customersToExport.length; i++) {
    const c = customersToExport[i];
    if (onProgress) {
      onProgress(i + 1, customersToExport.length, c.nama);
    }

    try {
      await createGoogleContact(c, token);
      successCount++;
    } catch (err: any) {
      errorCount++;
      errors.push(`${c.nama}: ${err.message || 'Gagal sinkron'}`);
    }

    // Gentle delay to avoid Google People API rate limit bursts
    if (i < customersToExport.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { successCount, errorCount, errors };
}
