import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  FileText,
  Truck,
  ExternalLink,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  CalendarCheck,
  Building2,
  Phone
} from 'lucide-react';
import { Invoice, Settings, PoVendor } from '../types';
import {
  getIndonesianHolidays,
  fetchGoogleCalendarEvents,
  CalendarEventItem,
  IndonesianHoliday
} from '../services/googleCalendarService';
import { getGoogleAccessToken, requestGoogleAccessToken, createCalendarEvent } from '../lib/googleWorkspace';
import { openWhatsApp } from '../utils/whatsapp';
import { formatDate } from '../utils/date';

interface CalendarWidgetProps {
  invoices: Invoice[];
  poVendors?: PoVendor[];
  settings?: Settings;
  showToast?: (msg: string, isErr?: boolean) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  invoices,
  poVendors = [],
  settings,
  showToast
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0 - 11
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Google Calendar Sync State
  const [googleEvents, setGoogleEvents] = useState<CalendarEventItem[]>([]);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState<boolean>(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(!!getGoogleAccessToken());

  // Add Quick Google Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventTime, setNewEventTime] = useState<string>('09:00');
  const [newEventDesc, setNewEventDesc] = useState<string>('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);

  // Sync Google Calendar events for the active month view
  const syncGoogleCalendar = async (forceAuth = false) => {
    let token = getGoogleAccessToken();
    if (!token && forceAuth) {
      try {
        setIsSyncingGoogle(true);
        token = await requestGoogleAccessToken();
        setIsGoogleConnected(!!token);
      } catch (err: any) {
        if (showToast) showToast('Gagal menghubungkan Google Calendar.', true);
        setIsSyncingGoogle(false);
        return;
      }
    }

    if (!token) {
      setIsGoogleConnected(false);
      return;
    }

    setIsGoogleConnected(true);
    setIsSyncingGoogle(true);

    try {
      const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDayDate = new Date(currentYear, currentMonth + 1, 0).getDate();
      const lastDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayDate).padStart(2, '0')}`;

      const events = await fetchGoogleCalendarEvents(token, firstDay, lastDay);
      setGoogleEvents(events);
      if (showToast && forceAuth) {
        showToast(`Google Calendar tersinkronisasi! (${events.length} agenda ditemukan)`);
      }
    } catch (err) {
      console.warn('Error syncing Google Calendar:', err);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  useEffect(() => {
    syncGoogleCalendar(false);
  }, [currentYear, currentMonth]);

  // Indonesian holidays for the current year
  const holidays: IndonesianHoliday[] = useMemo(() => {
    return getIndonesianHolidays(currentYear);
  }, [currentYear]);

  // Build 35 or 42 grid cells for the month
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSunday: boolean;
    }[] = [];

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSunday: new Date(prevYear, prevMonth, dayNum).getDay() === 0
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSunday: new Date(currentYear, currentMonth, d).getDay() === 0
      });
    }

    // Next month filler days to complete grid (up to multiple of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSunday: new Date(nextYear, nextMonth, n).getDay() === 0
      });
    }

    return cells;
  }, [currentYear, currentMonth, today]);

  // Navigate Months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);
  };

  // Group events by date string
  const dateDataMap = useMemo(() => {
    const map = new Map<string, {
      holidays: IndonesianHoliday[];
      invoicesDue: Invoice[];
      poDue: PoVendor[];
      googleEvents: CalendarEventItem[];
    }>();

    // Fill holidays
    holidays.forEach(h => {
      const existing = map.get(h.date) || { holidays: [], invoicesDue: [], poDue: [], googleEvents: [] };
      existing.holidays.push(h);
      map.set(h.date, existing);
    });

    // Fill Invoices with deadline
    invoices.forEach(inv => {
      const due = inv.tempoInv || inv.tglInv;
      if (due) {
        const datePart = due.split('T')[0];
        const existing = map.get(datePart) || { holidays: [], invoicesDue: [], poDue: [], googleEvents: [] };
        existing.invoicesDue.push(inv);
        map.set(datePart, existing);
      }
    });

    // Fill Vendor POs with deadline
    poVendors.forEach(po => {
      if (po.tglSelesai) {
        const datePart = po.tglSelesai.split('T')[0];
        const existing = map.get(datePart) || { holidays: [], invoicesDue: [], poDue: [], googleEvents: [] };
        existing.poDue.push(po);
        map.set(datePart, existing);
      }
    });

    // Fill Google Events
    googleEvents.forEach(ge => {
      const existing = map.get(ge.date) || { holidays: [], invoicesDue: [], poDue: [], googleEvents: [] };
      if (!existing.googleEvents.some(e => e.id === ge.id)) {
        existing.googleEvents.push(ge);
      }
      map.set(ge.date, existing);
    });

    return map;
  }, [holidays, invoices, poVendors, googleEvents]);

  // Selected date details
  const activeDayDetails = useMemo(() => {
    if (!selectedDate) return null;
    return dateDataMap.get(selectedDate) || {
      holidays: [],
      invoicesDue: [],
      poDue: [],
      googleEvents: []
    };
  }, [selectedDate, dateDataMap]);

  // Holidays in active month for summary
  const monthHolidays = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return holidays.filter(h => h.date.startsWith(prefix));
  }, [currentYear, currentMonth, holidays]);

  const handleCreateGoogleCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newEventTitle.trim()) return;

    let token = getGoogleAccessToken();
    if (!token) {
      try {
        token = await requestGoogleAccessToken();
      } catch {
        if (showToast) showToast('Akses Google Calendar dibutuhkan.', true);
        return;
      }
    }

    if (!token) return;

    try {
      setIsSubmittingEvent(true);
      const startDateTime = `${selectedDate}T${newEventTime || '09:00'}:00+08:00`;
      const endDateTime = `${selectedDate}T${newEventTime ? `${parseInt(newEventTime.split(':')[0]) + 1}:${newEventTime.split(':')[1]}` : '10:00'}:00+08:00`;

      await createCalendarEvent(token, {
        summary: newEventTitle.trim(),
        description: newEventDesc.trim() || `Agenda CTRL PRINT`,
        startDateTime,
        endDateTime,
        location: settings?.address || 'Workshop CTRL PRINT'
      });

      if (showToast) showToast(`Agenda "${newEventTitle.trim()}" berhasil ditambahkan ke Google Calendar!`);
      setNewEventTitle('');
      setNewEventDesc('');
      setShowAddEventModal(false);
      syncGoogleCalendar(false);
    } catch (err: any) {
      console.error('Error adding event to Google Calendar:', err);
      if (showToast) showToast(err.message || 'Gagal menambahkan event ke Google Calendar', true);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 0, padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Kalender & Jadwal Kerja
              <span style={{ fontSize: '11px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                1 Bulan Penuh
              </span>
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Hari Libur Nasional Indonesia & Sync Google Calendar
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleGoToday}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}
          >
            Hari Ini
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => syncGoogleCalendar(true)}
            disabled={isSyncingGoogle}
            title="Sync Google Calendar"
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={isSyncingGoogle ? 'spin' : ''} />
            <span>{isGoogleConnected ? 'Sync G-Cal' : 'Hubungkan G-Cal'}</span>
          </button>
        </div>
      </div>

      {/* Month Navigation Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', padding: '4px' }}
          aria-label="Bulan Sebelumnya"
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', padding: '4px' }}
          aria-label="Bulan Berikutnya"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ minWidth: '320px' }}>
          {/* Day of Week Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, idx) => (
              <div
                key={d}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 0',
                  color: idx === 0 ? '#EF4444' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarCells.map((cell) => {
              const dayData = dateDataMap.get(cell.dateStr);
              const hasHoliday = dayData && dayData.holidays.length > 0;
              const hasInvoices = dayData && dayData.invoicesDue.length > 0;
              const hasPo = dayData && dayData.poDue.length > 0;
              const hasGoogle = dayData && dayData.googleEvents.length > 0;
              const isSelected = selectedDate === cell.dateStr;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  style={{
                    minHeight: '52px',
                    padding: '4px 5px',
                    borderRadius: '8px',
                    background: isSelected
                      ? 'rgba(0, 82, 255, 0.08)'
                      : cell.isToday
                      ? 'rgba(37, 99, 235, 0.04)'
                      : hasHoliday
                      ? '#FEF2F2'
                      : cell.isCurrentMonth
                      ? 'var(--bg-card)'
                      : 'rgba(0,0,0,0.015)',
                    border: isSelected
                      ? '1.5px solid #0052FF'
                      : cell.isToday
                      ? '1.5px solid #3B82F6'
                      : hasHoliday
                      ? '1px solid #FECACA'
                      : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    opacity: cell.isCurrentMonth ? 1 : 0.45
                  }}
                  title={
                    hasHoliday
                      ? dayData?.holidays.map(h => h.name).join(', ')
                      : undefined
                  }
                >
                  {/* Top Bar: Date Number & Indicators */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: cell.isToday || isSelected ? 800 : 600,
                        color: cell.isToday
                          ? '#FFFFFF'
                          : hasHoliday || cell.isSunday
                          ? '#DC2626'
                          : 'var(--text-main)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: cell.isToday ? '20px' : 'auto',
                        height: cell.isToday ? '20px' : 'auto',
                        borderRadius: '50%',
                        background: cell.isToday ? '#0052FF' : 'transparent'
                      }}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Holiday Dot */}
                    {hasHoliday && !cell.isToday && (
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#EF4444',
                          display: 'inline-block'
                        }}
                      />
                    )}
                  </div>

                  {/* Badges / Micro Tags */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {hasHoliday && (
                      <div
                        style={{
                          fontSize: '8.5px',
                          fontWeight: 700,
                          color: '#DC2626',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.1'
                        }}
                      >
                        {dayData.holidays[0].name.replace('Hari Raya ', '').replace('Tahun Baru ', 'TB ')}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                      {hasInvoices && (
                        <span
                          style={{
                            fontSize: '8.5px',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '1px 3px',
                            borderRadius: '3px',
                            fontWeight: 700
                          }}
                        >
                          {dayData.invoicesDue.length} Inv
                        </span>
                      )}

                      {hasPo && (
                        <span
                          style={{
                            fontSize: '8.5px',
                            background: '#FFFBEB',
                            color: '#B45309',
                            padding: '1px 3px',
                            borderRadius: '3px',
                            fontWeight: 700
                          }}
                        >
                          {dayData.poDue.length} PO
                        </span>
                      )}

                      {hasGoogle && (
                        <span
                          style={{
                            fontSize: '8.5px',
                            background: '#ECFDF5',
                            color: '#047857',
                            padding: '1px 3px',
                            borderRadius: '3px',
                            fontWeight: 700
                          }}
                        >
                          GCal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Month Holidays List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span> Hari Libur
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3B82F6' }}></span> Nota Order
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' }}></span> PO Vendor
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }}></span> Google Calendar
          </span>
        </div>

        {monthHolidays.length > 0 && (
          <span style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 600 }}>
            {monthHolidays.length} Hari Libur di {MONTH_NAMES[currentMonth]}
          </span>
        )}
      </div>

      {/* Selected Day Details Drawer / Popover */}
      {selectedDate && (
        <div
          style={{
            background: 'var(--bg-main)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>
              <CalendarCheck size={16} />
              <span>
                Detail Agenda: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' })}, {formatDate(selectedDate)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddEventModal(true)}
                style={{ fontSize: '10.5px', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={12} /> Tambah Agenda G-Cal
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Holiday Alert if active */}
          {activeDayDetails?.holidays.map((h, i) => (
            <div key={i} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', color: '#991B1B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔴</span>
              <span>{h.name} (Hari Libur Nasional)</span>
            </div>
          ))}

          {/* Invoices Due List */}
          {activeDayDetails && activeDayDetails.invoicesDue.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={12} /> Tenggat Nota Transaksi ({activeDayDetails.invoicesDue.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {activeDayDetails.invoicesDue.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-card)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{inv.noInv}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>•</span>
                      <span>{inv.namaCust}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: inv.statusBayar === 'Paid' || inv.statusBayar === 'Lunas' ? '#059669' : '#D97706' }}>
                        Rp {(inv.total || 0).toLocaleString('id-ID')}
                      </span>
                      {inv.waCust && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(inv.waCust, `Halo Kak ${inv.namaCust}, menginfokan terkait pesanan ${inv.noInv}...`)}
                          style={{ background: '#DCFCE7', color: '#15803D', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          <Phone size={10} /> WA
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor PO Due List */}
          {activeDayDetails && activeDayDetails.poDue.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={12} /> Jadwal Selesai PO Vendor ({activeDayDetails.poDue.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                {activeDayDetails.poDue.map((po) => (
                  <div
                    key={po.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-card)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#B45309' }}>{po.noPo}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>•</span>
                      <span>{po.vendorName}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                      {po.jamSelesai ? `Pukul ${po.jamSelesai}` : 'Hari Ini'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google Calendar Events */}
          {activeDayDetails && activeDayDetails.googleEvents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarIcon size={12} /> Agenda Google Calendar ({activeDayDetails.googleEvents.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeDayDetails.googleEvents.map((ge) => (
                  <div
                    key={ge.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ECFDF5',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #A7F3D0',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#065F46' }}>{ge.title}</span>
                      {ge.time && <span style={{ color: '#047857', marginLeft: '6px', fontSize: '10.5px' }}>({ge.time})</span>}
                    </div>
                    {ge.link && (
                      <a
                        href={ge.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10.5px' }}
                      >
                        Buka <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State for Selected Date */}
          {activeDayDetails &&
            activeDayDetails.holidays.length === 0 &&
            activeDayDetails.invoicesDue.length === 0 &&
            activeDayDetails.poDue.length === 0 &&
            activeDayDetails.googleEvents.length === 0 && (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                Tidak ada catatan libur atau deadline order pada tanggal ini.
              </div>
            )}
        </div>
      )}

      {/* Quick Add Google Event Modal */}
      {showAddEventModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              padding: '20px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={16} /> Tambah Agenda Google Calendar
              </div>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoogleCalendarEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Tanggal Agenda</label>
                <input type="text" value={formatDate(selectedDate)} disabled style={{ background: 'var(--bg-main)' }} />
              </div>

              <div className="form-group">
                <label>Judul Agenda / Pengingat *</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Contoh: Pengiriman Spanduk Event Acara"
                  required
                />
              </div>

              <div className="form-group">
                <label>Waktu / Jam</label>
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Deskripsi Tambahan (Opsional)</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  rows={2}
                  placeholder="Catatan pengerjaan / lokasi customer..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowAddEventModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmittingEvent}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingEvent ? <RefreshCw size={12} className="spin" /> : <CalendarCheck size={12} />}
                  <span>Simpan ke Google Calendar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
