/**
 * Google Calendar & Indonesian National Holidays Service
 * Provides full Indonesian holiday calendar support and Google Calendar Sync
 */

import { getGoogleAccessToken } from '../lib/googleWorkspace';

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  time?: string;
  description?: string;
  type: 'holiday' | 'google' | 'invoice_deadline' | 'po_deadline';
  badgeColor?: string;
  link?: string;
}

export interface IndonesianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isCutiBersama?: boolean;
}

/**
 * Verified Indonesian National Holidays (Hari Libur Nasional Indonesia)
 */
export const INDONESIAN_HOLIDAYS_MAP: Record<string, IndonesianHoliday[]> = {
  '2025': [
    { date: '2025-01-01', name: 'Tahun Baru 2025 Masehi' },
    { date: '2025-01-27', name: 'Isra Mi\'raj Nabi Muhammad SAW' },
    { date: '2025-01-29', name: 'Tahun Baru Imlek 2576 Kongzili' },
    { date: '2025-03-29', name: 'Hari Suci Nyepi Tahun Baru Saka 1947' },
    { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 Hijriah (Hari 1)' },
    { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 Hijriah (Hari 2)' },
    { date: '2025-04-18', name: 'Wafat Yesus Kristus' },
    { date: '2025-04-20', name: 'Hari Kebangkitan Yesus Kristus (Paskah)' },
    { date: '2025-05-01', name: 'Hari Buruh Internasional' },
    { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE' },
    { date: '2025-05-29', name: 'Kenaikan Yesus Kristus' },
    { date: '2025-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2025-06-06', name: 'Hari Raya Idul Adha 1446 Hijriah' },
    { date: '2025-06-27', name: '1 Muharam Tahun Baru Islam 1447 H' },
    { date: '2025-08-17', name: 'Hari Kemerdekaan RI' },
    { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2025-12-25', name: 'Hari Raya Natal' }
  ],
  '2026': [
    { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi' },
    { date: '2026-01-16', name: 'Isra Mi\'raj Nabi Muhammad SAW' },
    { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili' },
    { date: '2026-03-03', name: 'Hari Suci Nyepi Tahun Baru Saka 1948' },
    { date: '2026-03-20', name: 'Hari Raya Idul Fitri 1447 Hijriah (Hari 1)' },
    { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 Hijriah (Hari 2)' },
    { date: '2026-04-03', name: 'Wafat Yesus Kristus (Jumat Agung)' },
    { date: '2026-04-05', name: 'Hari Paskah' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional' },
    { date: '2026-05-14', name: 'Kenaikan Yesus Kristus' },
    { date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 Hijriah' },
    { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2026-06-16', name: 'Tahun Baru Islam 1448 Hijriah' },
    { date: '2026-08-17', name: 'Hari Kemerdekaan RI ke-81' },
    { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2026-12-25', name: 'Hari Raya Natal' }
  ],
  '2027': [
    { date: '2027-01-01', name: 'Tahun Baru 2027 Masehi' },
    { date: '2027-01-06', name: 'Isra Mi\'raj Nabi Muhammad SAW' },
    { date: '2027-02-06', name: 'Tahun Baru Imlek 2578 Kongzili' },
    { date: '2027-03-10', name: 'Hari Raya Idul Fitri 1448 Hijriah' },
    { date: '2027-03-11', name: 'Hari Raya Idul Fitri 1448 Hijriah (Hari 2)' },
    { date: '2027-03-22', name: 'Hari Suci Nyepi Saka 1949' },
    { date: '2027-03-26', name: 'Wafat Yesus Kristus' },
    { date: '2027-05-01', name: 'Hari Buruh Internasional' },
    { date: '2027-05-06', name: 'Kenaikan Yesus Kristus' },
    { date: '2027-05-17', name: 'Hari Raya Idul Adha 1448 Hijriah' },
    { date: '2027-05-20', name: 'Hari Raya Waisak 2571 BE' },
    { date: '2027-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2027-06-06', name: 'Tahun Baru Islam 1449 Hijriah' },
    { date: '2027-08-15', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2027-08-17', name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: '2027-12-25', name: 'Hari Raya Natal' }
  ]
};

/**
 * Get Indonesian Holidays for a given year
 */
export function getIndonesianHolidays(year: number): IndonesianHoliday[] {
  const yearStr = String(year);
  return INDONESIAN_HOLIDAYS_MAP[yearStr] || [
    { date: `${year}-01-01`, name: `Tahun Baru ${year} Masehi` },
    { date: `${year}-05-01`, name: 'Hari Buruh Internasional' },
    { date: `${year}-06-01`, name: 'Hari Lahir Pancasila' },
    { date: `${year}-08-17`, name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: `${year}-12-25`, name: 'Hari Raya Natal' }
  ];
}

/**
 * Fetch Google Calendar events for the primary calendar within a time range
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  startDateStr: string, // YYYY-MM-DD
  endDateStr: string // YYYY-MM-DD
): Promise<CalendarEventItem[]> {
  if (!accessToken) return [];

  const timeMin = new Date(`${startDateStr}T00:00:00Z`).toISOString();
  const timeMax = new Date(`${endDateStr}T23:59:59Z`).toISOString();

  const events: CalendarEventItem[] = [];

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          const start = item.start?.dateTime || item.start?.date;
          if (start) {
            const dateOnly = start.split('T')[0];
            const timeOnly = item.start?.dateTime ? start.split('T')[1]?.slice(0, 5) : undefined;
            events.push({
              id: item.id || `gcal-${Math.random()}`,
              title: item.summary || 'Agenda Google Calendar',
              date: dateOnly,
              time: timeOnly,
              description: item.description,
              type: 'google',
              link: item.htmlLink,
              badgeColor: '#10B981'
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching Google Calendar primary events:', err);
  }

  // Also try fetching public Indonesian holiday calendar from Google
  try {
    const holidayCalId = encodeURIComponent('id.indonesian#holiday@group.v.calendar.google.com');
    const holUrl = `https://www.googleapis.com/calendar/v3/calendars/${holidayCalId}/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`;

    const holRes = await fetch(holUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (holRes.ok) {
      const holData = await holRes.json();
      if (Array.isArray(holData.items)) {
        holData.items.forEach((item: any) => {
          const start = item.start?.date || item.start?.dateTime;
          if (start) {
            const dateOnly = start.split('T')[0];
            // Check if already in list to avoid duplicates
            if (!events.some((e) => e.date === dateOnly && e.title.toLowerCase() === (item.summary || '').toLowerCase())) {
              events.push({
                id: item.id || `gcal-hol-${Math.random()}`,
                title: item.summary || 'Hari Libur',
                date: dateOnly,
                type: 'holiday',
                badgeColor: '#EF4444'
              });
            }
          }
        });
      }
    }
  } catch {
    // Ignore optional public calendar errors, fallback map is used
  }

  return events;
}
