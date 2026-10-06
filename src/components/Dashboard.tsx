import React, { useState, useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import {
  TrendingUp,
  Wallet,
  CreditCard,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  Percent,
  TrendingDown,
  Printer,
  Palette,
  PackageCheck,
  Scissors,
  Truck,
  ExternalLink,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { Invoice, Pengeluaran, Settings, PoVendor } from '../types';
import { openWhatsApp } from '../utils/whatsapp';
import { formatRupiah } from '../utils/currency';
import { formatDate } from '../utils/date';
import { CalendarWidget } from './CalendarWidget';

interface DashboardProps {
  invoices: Invoice[];
  expenses: Pengeluaran[];
  poVendors?: PoVendor[];
  settings?: Settings;
  showToast?: (msg: string, isErr?: boolean) => void;
  onNavigateTab?: (tab: string, filterParam?: string) => void;
}

type PeriodFilter = 'hari-ini' | 'minggu-ini' | 'bulan-ini' | 'tahun-ini' | 'semua' | 'custom';
type ChartViewMode = 'bulanan' | 'harian';

declare global {
  interface Window {
    Chart: any;
  }
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  expenses,
  poVendors = [],
  settings,
  showToast,
  onNavigateTab
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  // Privacy Toggle
  const [showNominal, setShowNominal] = useState<boolean>(true);

  // Filter Period State (default: 'bulan-ini')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('bulan-ini');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Chart View Mode: Monthly vs Daily Breakdown
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('bulanan');

  // Action Center Filter Tab: 'piutang' | 'acc-desain' | 'siap-ambil'
  const [actionTab, setActionTab] = useState<'piutang' | 'acc-desain' | 'siap-ambil'>('piutang');

  // Selected Status Filter in Production Pipeline
  const [selectedPipelineStatus, setSelectedPipelineStatus] = useState<string | null>(null);

  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  // Helper to validate valid sales invoice
  const isConfirmedSalesInvoice = (inv: Invoice) => {
    if (inv.tipeDoc === 'Quotation') return false;
    if (inv.tipeDoc === 'WebOrder') return false;
    if (inv.tipeDoc === 'ACC_Doc') return false;
    if ((inv.noInv?.startsWith('WEB-') || inv.noInv?.startsWith('ORD-')) && !inv.isWebVerified) return false;
    return true;
  };

  // Helper date range calculator
  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (periodFilter === 'hari-ini') {
      // today only
    } else if (periodFilter === 'minggu-ini') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(today.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (periodFilter === 'bulan-ini') {
      start = new Date(currYear, currMonth, 1);
      end = new Date(currYear, currMonth + 1, 0, 23, 59, 59, 999);
    } else if (periodFilter === 'tahun-ini') {
      start = new Date(currYear, 0, 1);
      end = new Date(currYear, 11, 31, 23, 59, 59, 999);
    } else if (periodFilter === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    } else if (periodFilter === 'semua') {
      start = new Date(2000, 0, 1);
      end = new Date(2100, 11, 31, 23, 59, 59, 999);
    }

    return { start, end };
  }, [periodFilter, customStartDate, customEndDate, currYear, currMonth]);

  // Check if an ISO or string date is in range
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    if (periodFilter === 'semua') return true;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= dateRangeBounds.start && d <= dateRangeBounds.end;
  };

  // Filtered dataset according to date range
  const filteredData = useMemo(() => {
    const filteredInvoices = invoices.filter((inv) => {
      if (!isConfirmedSalesInvoice(inv)) return false;
      return isDateInRange(inv.tglInv);
    });

    const filteredExpenses = expenses.filter((e) => isDateInRange(e.tgl));
    const filteredPoVendors = poVendors.filter((p) => isDateInRange(p.tglPo));

    return { filteredInvoices, filteredExpenses, filteredPoVendors };
  }, [invoices, expenses, poVendors, dateRangeBounds, periodFilter]);

  // Aggregate Metrics for Selected Period
  const metrics = useMemo(() => {
    let totalPaid = 0;
    let totalPiutang = 0;
    let totalGrandTotal = 0;
    let totalHPP = 0;
    let totalExpenses = 0;
    let totalPoCost = 0;
    let paidInvoicesCount = 0;
    let unpaidInvoicesCount = 0;

    filteredData.filteredInvoices.forEach((inv) => {
      totalPaid += inv.dibayar || 0;
      totalGrandTotal += inv.grandTotal || 0;
      totalHPP += inv.totalHPP || 0;

      const sisa = Math.max(inv.sisaTertagih || 0, 0);
      if (sisa > 0 && inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas') {
        totalPiutang += sisa;
        unpaidInvoicesCount++;
      } else {
        paidInvoicesCount++;
      }
    });

    filteredData.filteredExpenses.forEach((e) => {
      totalExpenses += e.nominal || 0;
    });

    filteredData.filteredPoVendors.forEach((p) => {
      totalPoCost += p.totalBiaya || 0;
    });

    const totalBebanOperasional = totalExpenses;
    const realNetProfit = totalPaid - totalHPP - totalBebanOperasional;
    const grossProfit = totalPaid - totalHPP;
    const netProfitMargin = totalPaid > 0 ? (realNetProfit / totalPaid) * 100 : 0;
    const grossProfitMargin = totalPaid > 0 ? (grossProfit / totalPaid) * 100 : 0;

    return {
      totalPaid,
      totalPiutang,
      totalGrandTotal,
      totalHPP,
      totalExpenses: totalBebanOperasional,
      totalPoCost,
      realNetProfit,
      grossProfit,
      netProfitMargin,
      grossProfitMargin,
      totalCount: filteredData.filteredInvoices.length,
      paidCount: paidInvoicesCount,
      unpaidCount: unpaidInvoicesCount
    };
  }, [filteredData]);

  // Overdue and Actionable Invoices (All active, not just in filtered period)
  const actionItems = useMemo(() => {
    const overdueInvoices: Invoice[] = [];
    const accPendingInvoices: Invoice[] = [];
    const readyToPickupInvoices: Invoice[] = [];

    invoices.forEach((inv) => {
      if (!isConfirmedSalesInvoice(inv)) return;

      // 1. Piutang & Overdue
      const sisa = Math.max(inv.sisaTertagih || 0, 0);
      if (sisa > 0 && inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas') {
        overdueInvoices.push(inv);
      }

      // 2. ACC Desain Pending / Minta Revisi
      const isAccAwaiting =
        inv.accDesainStatus === 'Menunggu ACC' ||
        inv.accDesainStatus === 'Minta Revisi' ||
        inv.proofStatus === 'rejected' ||
        (inv.accDesainUrl && inv.accDesainStatus !== 'ACC Disetujui');
      if (isAccAwaiting) {
        accPendingInvoices.push(inv);
      }

      // 3. Siap Diambil / Siap Kirim
      if (inv.statusJob === 'Siap Kirim' || inv.statusJob === 'Finishing') {
        readyToPickupInvoices.push(inv);
      }
    });

    // Sort overdue by urgency
    overdueInvoices.sort((a, b) => {
      const aOverdue = a.tempoInv && a.tempoInv < todayStr ? 1 : 0;
      const bOverdue = b.tempoInv && b.tempoInv < todayStr ? 1 : 0;
      return bOverdue - aOverdue;
    });

    return {
      overdueInvoices,
      accPendingInvoices,
      readyToPickupInvoices
    };
  }, [invoices, todayStr]);

  // Production Pipeline Stages Breakdown
  const pipelineStats = useMemo(() => {
    let pending = 0;
    let desain = 0;
    let menungguAcc = 0;
    let produksi = 0;
    let finishing = 0;
    let siapKirim = 0;
    let selesai = 0;

    invoices.forEach((inv) => {
      if (!isConfirmedSalesInvoice(inv)) return;

      const st = inv.statusJob || 'Pending';
      const accSt = inv.accDesainStatus;

      if (st === 'Selesai') {
        selesai++;
      } else if (st === 'Siap Kirim') {
        siapKirim++;
      } else if (st === 'Finishing') {
        finishing++;
      } else if (st === 'Produksi') {
        produksi++;
      } else if (accSt === 'Menunggu ACC' || accSt === 'Minta Revisi') {
        menungguAcc++;
      } else if (st === 'Desain') {
        desain++;
      } else {
        pending++;
      }
    });

    const activeTotal = pending + desain + menungguAcc + produksi + finishing + siapKirim;

    return {
      pending,
      desain,
      menungguAcc,
      produksi,
      finishing,
      siapKirim,
      selesai,
      activeTotal
    };
  }, [invoices]);

  // Top Selling Items Breakdown
  const topProducts = useMemo(() => {
    const map: { [name: string]: { name: string; qty: number; totalRevenue: number; satuan: string } } = {};

    filteredData.filteredInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        const key = it.nama?.trim() || 'Item Custom';
        if (!map[key]) {
          map[key] = { name: key, qty: 0, totalRevenue: 0, satuan: it.satuan || 'Pcs' };
        }
        map[key].qty += it.qty || 1;
        map[key].totalRevenue += it.subtotal || 0;
      });
    });

    const sorted = Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
    return sorted.slice(0, 5);
  }, [filteredData]);

  // Render Interactive Chart.js Canvas
  useEffect(() => {
    if (!chartCanvasRef.current) return;

    let labels: string[] = [];
    let omsetDataset: number[] = [];
    let piutangDataset: number[] = [];
    let bebanDataset: number[] = [];
    let labaDataset: number[] = [];

    if (chartViewMode === 'bulanan') {
      // 12 Months breakdown of current year
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      omsetDataset = new Array(12).fill(0);
      piutangDataset = new Array(12).fill(0);
      bebanDataset = new Array(12).fill(0);

      invoices.forEach((inv) => {
        if (isConfirmedSalesInvoice(inv) && inv.tglInv) {
          const d = new Date(inv.tglInv);
          if (d.getFullYear() === currYear) {
            const m = d.getMonth();
            omsetDataset[m] += inv.dibayar || 0;
            if (inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas') {
              piutangDataset[m] += Math.max(inv.sisaTertagih || 0, 0);
            }
          }
        }
      });

      expenses.forEach((e) => {
        if (e.tgl) {
          const d = new Date(e.tgl);
          if (d.getFullYear() === currYear) {
            bebanDataset[d.getMonth()] += e.nominal || 0;
          }
        }
      });

      labaDataset = omsetDataset.map((paid, idx) => Math.max(paid - bebanDataset[idx], 0));
    } else {
      // Daily breakdown of current month (1..daysInMonth)
      const daysInMonth = new Date(currYear, currMonth + 1, 0).getDate();
      labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
      omsetDataset = new Array(daysInMonth).fill(0);
      piutangDataset = new Array(daysInMonth).fill(0);
      bebanDataset = new Array(daysInMonth).fill(0);

      invoices.forEach((inv) => {
        if (isConfirmedSalesInvoice(inv) && inv.tglInv) {
          const d = new Date(inv.tglInv);
          if (d.getFullYear() === currYear && d.getMonth() === currMonth) {
            const dayIdx = d.getDate() - 1;
            if (dayIdx >= 0 && dayIdx < daysInMonth) {
              omsetDataset[dayIdx] += inv.dibayar || 0;
              if (inv.statusBayar !== 'Paid' && inv.statusBayar !== 'Lunas') {
                piutangDataset[dayIdx] += Math.max(inv.sisaTertagih || 0, 0);
              }
            }
          }
        }
      });

      expenses.forEach((e) => {
        if (e.tgl) {
          const d = new Date(e.tgl);
          if (d.getFullYear() === currYear && d.getMonth() === currMonth) {
            const dayIdx = d.getDate() - 1;
            if (dayIdx >= 0 && dayIdx < daysInMonth) {
              bebanDataset[dayIdx] += e.nominal || 0;
            }
          }
        }
      });

      labaDataset = omsetDataset.map((paid, idx) => Math.max(paid - bebanDataset[idx], 0));
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartCanvasRef.current.getContext('2d');
    if (ctx) {
      chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Omset Terbayar (Kas Masuk)',
              data: omsetDataset,
              backgroundColor: '#2563EB',
              borderRadius: 6,
              barPercentage: 0.7,
              categoryPercentage: 0.8
            },
            {
              label: 'Piutang Belum Lunas',
              data: piutangDataset,
              backgroundColor: '#F59E0B',
              borderRadius: 6,
              barPercentage: 0.7,
              categoryPercentage: 0.8
            },
            {
              label: 'Beban Pengeluaran',
              data: bebanDataset,
              backgroundColor: '#EF4444',
              borderRadius: 6,
              barPercentage: 0.7,
              categoryPercentage: 0.8
            },
            {
              type: 'line',
              label: 'Estimasi Laba Bersih',
              data: labaDataset,
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2.5,
              tension: 0.35,
              pointRadius: 3.5,
              pointHoverRadius: 6,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { size: 11, family: 'Plus Jakarta Sans, sans-serif' },
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y || 0;
                  return `${label}: Rp ${value.toLocaleString('id-ID')}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.04)'
              },
              ticks: {
                font: { size: 10.5 },
                callback: (val: number) => {
                  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`;
                  if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}rb`;
                  return 'Rp ' + val;
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 }
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [invoices, expenses, chartViewMode, currYear, currMonth]);

  const formatAmount = (val: number | string) => {
    return showNominal ? formatRupiah(val) : 'Rp ••••••••';
  };

  const handleKirimWA = (inv: Invoice) => {
    const sisa = Math.max(inv.sisaTertagih || 0, 0);
    const rawMsg = `Halo Kak *${inv.namaCust}*,\n\nSalam hangat dari *${settings?.company || 'CTRL PRINT'}*.\nIzin menginfokan pengingat tagihan *No. #${inv.noInv}* sebesar *Rp ${sisa.toLocaleString('id-ID')}* yang belum lunas.\n\nMohon bantuannya untuk melakukan konfirmasi atau pelunasan. Terima kasih banyak! 🙏`;
    openWhatsApp(inv.waCust, rawMsg);
  };

  const handleKirimAccWA = (inv: Invoice) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}?invNo=${encodeURIComponent(inv.noInv)}&tab=acc-desain`;
    const rawMsg = `Halo Kak *${inv.namaCust}*,\n\nBerikut link portal persetujuan proofing desain untuk pesanan *#${inv.noInv}*:\n👉 ${shareUrl}\n\nMohon dicek kembali teks dan layout sebelum kami proses cetak. Terima kasih! 🙏`;
    openWhatsApp(inv.waCust, rawMsg);
  };

  // Helper date description label
  const periodLabel = useMemo(() => {
    if (periodFilter === 'hari-ini') return 'Hari Ini';
    if (periodFilter === 'minggu-ini') return 'Minggu Ini';
    if (periodFilter === 'bulan-ini') return `Bulan Ini (${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    if (periodFilter === 'tahun-ini') return `Tahun Ini (${currYear})`;
    if (periodFilter === 'custom' && customStartDate && customEndDate) return `${customStartDate} s/d ${customEndDate}`;
    return 'Semua Periode';
  }, [periodFilter, customStartDate, customEndDate, currYear]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ============================================================ */}
      {/* 1. TOP HEADER & INTERACTIVE PERIOD FILTER BAR                 */}
      {/* ============================================================ */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px 20px',
          marginBottom: 0,
          borderRadius: '16px',
          background: 'var(--card-bg, #FFFFFF)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Ringkasan Kinerja &amp; Keuangan Percetakan
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Periode Aktif:</span>
              <strong style={{ color: '#2563EB' }}>{periodLabel}</strong>
              <span>•</span>
              <span>{filteredData.filteredInvoices.length} Faktur Penjualan</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {/* Quick Period Buttons */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-main)',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid var(--border-color)',
              gap: '2px'
            }}
          >
            {(['hari-ini', 'minggu-ini', 'bulan-ini', 'tahun-ini', 'semua'] as PeriodFilter[]).map((mode) => {
              const labelMap: Record<PeriodFilter, string> = {
                'hari-ini': 'Hari Ini',
                'minggu-ini': 'Minggu',
                'bulan-ini': 'Bulan Ini',
                'tahun-ini': 'Tahun Ini',
                'semua': 'Semua',
                'custom': 'Kustom'
              };
              const isActive = periodFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPeriodFilter(mode)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11.5px',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: '7px',
                    border: 'none',
                    background: isActive ? '#2563EB' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {labelMap[mode]}
                </button>
              );
            })}
          </div>

          {/* Privacy Show/Hide Eye Toggle */}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowNominal(!showNominal)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              padding: '7px 12px',
              borderRadius: '10px',
              fontWeight: 600
            }}
          >
            {showNominal ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showNominal ? 'Sembunyikan Angka' : 'Tampilkan Angka'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TOP 4 REFINED FINANCIAL & PROFIT METRIC CARDS             */}
      {/* ============================================================ */}
      <div
        className="dashboard-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: 0
        }}
      >
        {/* Card 1: Total Omzet Terbayar */}
        <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div className="metric-label">Total Omset Terbayar (Kas Masuk)</div>
              <div className="metric-value" style={{ color: 'var(--text-main)', marginTop: '4px' }}>
                {formatAmount(metrics.totalPaid)}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <DollarSign size={19} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <span>Volume Order: {formatAmount(metrics.totalGrandTotal)}</span>
            <span style={{ fontWeight: 700, color: '#2563EB' }}>{metrics.paidCount} Lunas</span>
          </div>
        </div>

        {/* Card 2: Total Piutang Belum Lunas */}
        <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div className="metric-label">Total Piutang Belum Lunas</div>
              <div className="metric-value" style={{ color: '#D97706', marginTop: '4px' }}>
                {formatAmount(metrics.totalPiutang)}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CreditCard size={19} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <span>{metrics.unpaidCount} Transaksi Belum Lunas</span>
            {actionItems.overdueInvoices.length > 0 && (
              <span style={{ color: '#EF4444', fontWeight: 800 }}>⚠️ {actionItems.overdueInvoices.length} Jatuh Tempo</span>
            )}
          </div>
        </div>

        {/* Card 3: Total Pengeluaran & Beban Usaha */}
        <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div className="metric-label">Total Beban &amp; Pengeluaran</div>
              <div className="metric-value" style={{ color: '#EF4444', marginTop: '4px' }}>
                {formatAmount(metrics.totalExpenses)}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#FEF2F2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ArrowDownRight size={19} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <span>HPP Produk: {formatAmount(metrics.totalHPP)}</span>
            <span>{filteredData.filteredExpenses.length} Biaya Terbit</span>
          </div>
        </div>

        {/* Card 4: Perkiraan Laba Bersih Riil */}
        <div
          className="metric-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: metrics.realNetProfit >= 0 ? 'var(--card-bg)' : '#FFF1F2',
            border: metrics.realNetProfit < 0 ? '1px solid #FECDD3' : undefined
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div className="metric-label">Perkiraan Laba Bersih Riil</div>
              <div
                className="metric-value"
                style={{
                  color: metrics.realNetProfit >= 0 ? '#059669' : '#DC2626',
                  marginTop: '4px'
                }}
              >
                {formatAmount(metrics.realNetProfit)}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: metrics.realNetProfit >= 0 ? '#ECFDF5' : '#FEE2E2',
                color: metrics.realNetProfit >= 0 ? '#059669' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Wallet size={19} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <span>Kas Masuk - HPP - Beban</span>
            <span
              style={{
                background: metrics.realNetProfit >= 0 ? '#D1FAE5' : '#FEE2E2',
                color: metrics.realNetProfit >= 0 ? '#065F46' : '#991B1B',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '10.5px'
              }}
            >
              Margin {metrics.netProfitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PRODUCTION PIPELINE & BOTTLENECK TRACKER                  */}
      {/* ============================================================ */}
      <div
        className="card"
        style={{
          marginBottom: 0,
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          background: 'var(--card-bg, #FFFFFF)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#2563EB' }} />
            <div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Alur Antrean Produksi Percetakan (Live Pipeline)
              </span>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {pipelineStats.activeTotal} pesanan aktif dalam proses pengerjaan
              </div>
            </div>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateTab('riwayat-invoice')}
              style={{ fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span>Lihat Antrean Job Cetak</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Visual Pipeline Segmented Bar */}
        <div
          style={{
            display: 'flex',
            height: '10px',
            borderRadius: '9999px',
            overflow: 'hidden',
            background: 'var(--bg-main)',
            marginBottom: '16px',
            gap: '2px'
          }}
        >
          {pipelineStats.pending > 0 && (
            <div style={{ flex: pipelineStats.pending, background: '#94A3B8' }} title={`Pending: ${pipelineStats.pending}`} />
          )}
          {pipelineStats.desain > 0 && (
            <div style={{ flex: pipelineStats.desain, background: '#6366F1' }} title={`Desain: ${pipelineStats.desain}`} />
          )}
          {pipelineStats.menungguAcc > 0 && (
            <div style={{ flex: pipelineStats.menungguAcc, background: '#F59E0B' }} title={`Menunggu ACC: ${pipelineStats.menungguAcc}`} />
          )}
          {pipelineStats.produksi > 0 && (
            <div style={{ flex: pipelineStats.produksi, background: '#2563EB' }} title={`Produksi: ${pipelineStats.produksi}`} />
          )}
          {pipelineStats.finishing > 0 && (
            <div style={{ flex: pipelineStats.finishing, background: '#A855F7' }} title={`Finishing: ${pipelineStats.finishing}`} />
          )}
          {pipelineStats.siapKirim > 0 && (
            <div style={{ flex: pipelineStats.siapKirim, background: '#10B981' }} title={`Siap Kirim: ${pipelineStats.siapKirim}`} />
          )}
        </div>

        {/* Pipeline Stage Interactive Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px'
          }}
        >
          {/* Stage 1: Pending */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('riwayat-invoice', 'Pending')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'transform 0.1s ease'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Pending Order
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {pipelineStats.pending} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>job</span>
            </div>
          </div>

          {/* Stage 2: Desain */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('riwayat-invoice', 'Desain')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '11px', color: '#4338CA', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Palette size={12} /> Desain / Layout
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#312E81', marginTop: '4px' }}>
              {pipelineStats.desain} <span style={{ fontSize: '11px', fontWeight: 500 }}>job</span>
            </div>
          </div>

          {/* Stage 3: Menunggu ACC */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('acc-desain')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Menunggu ACC
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#78350F', marginTop: '4px' }}>
              {pipelineStats.menungguAcc} <span style={{ fontSize: '11px', fontWeight: 500 }}>job</span>
            </div>
          </div>

          {/* Stage 4: Produksi / Cetak */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('riwayat-invoice', 'Produksi')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Printer size={12} /> Antrean Cetak
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E3A8A', marginTop: '4px' }}>
              {pipelineStats.produksi} <span style={{ fontSize: '11px', fontWeight: 500 }}>job</span>
            </div>
          </div>

          {/* Stage 5: Finishing */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('riwayat-invoice', 'Finishing')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: '#FAF5FF',
              border: '1px solid #E9D5FF',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '11px', color: '#7E22CE', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Scissors size={12} /> Finishing &amp; Potong
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#581C87', marginTop: '4px' }}>
              {pipelineStats.finishing} <span style={{ fontSize: '11px', fontWeight: 500 }}>job</span>
            </div>
          </div>

          {/* Stage 6: Siap Kirim / Ambil */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('riwayat-invoice', 'Siap Kirim')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Truck size={12} /> Siap Diambil
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#064E3B', marginTop: '4px' }}>
              {pipelineStats.siapKirim} <span style={{ fontSize: '11px', fontWeight: 500 }}>job</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. PERFORMANCE CHARTS & CALENDAR GRID ROW                     */}
      {/* ============================================================ */}
      <div
        className="dashboard-charts-cal-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '18px',
          alignItems: 'stretch'
        }}
      >
        {/* Financial & Sales Chart Card */}
        <div
          className="card"
          style={{
            marginBottom: 0,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                Grafik Performa Keuangan Percetakan
              </span>
            </div>

            {/* Switch Chart: Monthly vs Daily */}
            <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setChartViewMode('bulanan')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: chartViewMode === 'bulanan' ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  background: chartViewMode === 'bulanan' ? '#2563EB' : 'transparent',
                  color: chartViewMode === 'bulanan' ? '#FFFFFF' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                12 Bulan
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('harian')}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: chartViewMode === 'harian' ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  background: chartViewMode === 'harian' ? '#2563EB' : 'transparent',
                  color: chartViewMode === 'harian' ? '#FFFFFF' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Harian Bulan Ini
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '320px', flex: 1, minHeight: '280px' }}>
            <canvas ref={chartCanvasRef}></canvas>
          </div>
        </div>

        {/* Full 1-Month Calendar Widget (Sync Google Calendar & Hari Libur) */}
        <CalendarWidget
          invoices={invoices}
          poVendors={poVendors}
          settings={settings}
          showToast={showToast}
        />
      </div>

      {/* ============================================================ */}
      {/* 5. ACTION CENTER (PERLU TINDAKAN CEPAT) & TOP PRODUCTS ROW   */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '18px'
        }}
      >
        {/* Action Center Tabs Card */}
        <div
          className="card"
          style={{
            marginBottom: 0,
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg, #FFFFFF)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: '#EF4444' }} />
              <span>Pusat Tindakan Cepat (Action Items)</span>
            </div>
          </div>

          {/* Sub Tab Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-main)',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid var(--border-color)',
              marginBottom: '14px',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => setActionTab('piutang')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11.5px',
                fontWeight: actionTab === 'piutang' ? 700 : 500,
                borderRadius: '8px',
                border: 'none',
                background: actionTab === 'piutang' ? '#EF4444' : 'transparent',
                color: actionTab === 'piutang' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Tagihan Tempo ({actionItems.overdueInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActionTab('acc-desain')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11.5px',
                fontWeight: actionTab === 'acc-desain' ? 700 : 500,
                borderRadius: '8px',
                border: 'none',
                background: actionTab === 'acc-desain' ? '#2563EB' : 'transparent',
                color: actionTab === 'acc-desain' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              ACC Desain ({actionItems.accPendingInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActionTab('siap-ambil')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '11.5px',
                fontWeight: actionTab === 'siap-ambil' ? 700 : 500,
                borderRadius: '8px',
                border: 'none',
                background: actionTab === 'siap-ambil' ? '#10B981' : 'transparent',
                color: actionTab === 'siap-ambil' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Siap Kirim ({actionItems.readyToPickupInvoices.length})
            </button>
          </div>

          {/* List Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {actionTab === 'piutang' && (
              <>
                {actionItems.overdueInvoices.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <CheckCircle2 size={26} style={{ color: '#10B981', margin: '0 auto 8px auto', display: 'block' }} />
                    Semua tagihan telah lunas. Tidak ada piutang tertunggak!
                  </div>
                ) : (
                  actionItems.overdueInvoices.slice(0, 5).map((inv) => {
                    const isOverdue = inv.tempoInv && inv.tempoInv < todayStr;
                    return (
                      <div
                        key={inv.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: isOverdue ? '#FFF1F2' : 'var(--bg-main)',
                          border: `1px solid ${isOverdue ? '#FECDD3' : 'var(--border-color)'}`
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>#{inv.noInv}</strong>
                            {isOverdue && (
                              <span style={{ fontSize: '10px', fontWeight: 800, background: '#EF4444', color: '#FFF', padding: '1px 6px', borderRadius: '4px' }}>
                                Jatuh Tempo
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, marginTop: '2px' }}>
                            {inv.namaCust}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Tempo: {formatDate(inv.tempoInv)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#DC2626' }}>
                              {formatRupiah(inv.sisaTertagih)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sisa Tagihan</div>
                          </div>

                          {inv.waCust && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleKirimWA(inv)}
                              style={{ padding: '7px 10px', borderRadius: '8px' }}
                              title="Kirim Pesan Pengingat Tagihan via WA"
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {actionTab === 'acc-desain' && (
              <>
                {actionItems.accPendingInvoices.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <CheckCircle2 size={26} style={{ color: '#10B981', margin: '0 auto 8px auto', display: 'block' }} />
                    Semua proofing desain telah direspon atau disetujui.
                  </div>
                ) : (
                  actionItems.accPendingInvoices.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>#{inv.noInv}</strong>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              background: inv.accDesainStatus === 'Minta Revisi' ? '#EF4444' : '#F59E0B',
                              color: '#FFF',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            {inv.accDesainStatus || 'Menunggu ACC'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, marginTop: '2px' }}>
                          {inv.namaCust}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {inv.items?.map((i) => i.nama).join(', ')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {inv.waCust && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleKirimAccWA(inv)}
                            style={{ padding: '6px 8px', borderRadius: '8px', fontSize: '11px' }}
                            title="Kirim Link ACC via WA"
                          >
                            <MessageSquare size={13} /> Link WA
                          </button>
                        )}
                        {onNavigateTab && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onNavigateTab('acc-desain', inv.noInv)}
                            style={{ padding: '6px 8px', borderRadius: '8px', fontSize: '11px' }}
                          >
                            Buka Portal
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {actionTab === 'siap-ambil' && (
              <>
                {actionItems.readyToPickupInvoices.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <CheckCircle2 size={26} style={{ color: '#10B981', margin: '0 auto 8px auto', display: 'block' }} />
                    Tidak ada pesanan yang sedang menunggu pengambilan.
                  </div>
                ) : (
                  actionItems.readyToPickupInvoices.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '13px', color: '#065F46' }}>#{inv.noInv}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, marginTop: '2px' }}>
                          {inv.namaCust}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {inv.items?.map((i) => `${i.qty} ${i.nama}`).join(', ')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: inv.statusBayar === 'Lunas' ? '#10B981' : '#F59E0B',
                            color: '#FFFFFF'
                          }}
                        >
                          {inv.statusBayar === 'Lunas' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Top Selling Products Breakdown Card */}
        <div
          className="card"
          style={{
            marginBottom: 0,
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            background: 'var(--card-bg, #FFFFFF)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PackageCheck size={18} style={{ color: '#2563EB' }} />
              <span>Produk &amp; Layanan Terlaris</span>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{periodLabel}</span>
          </div>

          {topProducts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Belum ada data penjualan produk pada rentang waktu ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topProducts.map((prod, idx) => {
                const maxRevenue = topProducts[0]?.totalRevenue || 1;
                const percent = Math.min(100, Math.round((prod.totalRevenue / maxRevenue) * 100));

                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                        #{idx + 1} {prod.name}
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB' }}>
                        {formatAmount(prod.totalRevenue)}
                      </div>
                    </div>

                    {/* Progress Bar & Subtitle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', borderRadius: '4px', background: 'var(--bg-main)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: idx === 0 ? '#2563EB' : idx === 1 ? '#3B82F6' : '#60A5FA',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, minWidth: '48px', textAlign: 'right' }}>
                        {prod.qty} {prod.satuan}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
