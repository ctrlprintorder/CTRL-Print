import {
  Produk,
  Bahan,
  Vendor,
  Customer,
  Invoice,
  Counters,
  Settings,
  CustomerTestimonial,
  FinishingGroup
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_COUNTERS } from '../firebaseService';
import { DEFAULT_FINISHING_GROUPS } from './defaultFinishings';

export const SEED_PRODUCTS: Produk[] = [
  {
    id: 'prod_1',
    code: 'PRD-0001',
    nama: 'Spanduk Outdoor Flexi 280gsm',
    tipe: 'Barang',
    kategori: 'Outdoor Banner',
    desc: 'Spanduk outdoor standar ekonomis tahan panas & hujan. Cocok untuk warung, spanduk jualan, ucapan selamat, dan event.',
    satuan: 'm2',
    hpp: 12000,
    harga: 25000,
    showInPortal: true,
    portalNotes: 'Bisa request mata ayam di sudut atau keliling.',
    finishingGroupIds: ['fg_banner_tepi', 'fg_banner_stand']
  },
  {
    id: 'prod_2',
    code: 'PRD-0002',
    nama: 'Spanduk Tebal Flexi Korchin 440gsm',
    tipe: 'Barang',
    kategori: 'Outdoor Banner',
    desc: 'Bahan tebal premium tahan cuaca ekstrem lebih dari 1 tahun. Hasil cetak lebih tajam dan warna pekat.',
    satuan: 'm2',
    hpp: 22000,
    harga: 45000,
    showInPortal: true,
    portalNotes: 'Sangat direkomendasikan untuk baliho besar dan papan nama toko jangka panjang.',
    finishingGroupIds: ['fg_banner_tepi', 'fg_banner_stand']
  },
  {
    id: 'prod_3',
    code: 'PRD-0003',
    nama: 'Stiker Vinyl Glossy A3+ (Kiss Cut)',
    tipe: 'Barang',
    kategori: 'Stiker & Decal',
    desc: 'Stiker bahan plastik elastis tahan air (waterproof) dan tidak mudah sobek. Sudah dipotong sesuai pola (Kiss Cut siap kopek).',
    satuan: 'Lembar A3+',
    hpp: 6500,
    harga: 15000,
    showInPortal: true,
    portalNotes: 'Area cetak bersih 31 x 47 cm. Cocok untuk label botol, frozen food, dan kemasan.',
    finishingGroupIds: ['fg_stiker_cut', 'fg_stiker_lam']
  },
  {
    id: 'prod_4',
    code: 'PRD-0004',
    nama: 'Stiker Bontax / Cromo A3+',
    tipe: 'Barang',
    kategori: 'Stiker & Decal',
    desc: 'Stiker berbasis kertas dengan daya rekat sangat kuat. Pilihan paling hemat untuk label box makanan kering & packaging.',
    satuan: 'Lembar A3+',
    hpp: 4000,
    harga: 10000,
    showInPortal: true,
    portalNotes: 'Tersedia opsi potong kotak atau kiss cut pola.',
    finishingGroupIds: ['fg_stiker_cut', 'fg_stiker_lam']
  },
  {
    id: 'prod_5',
    code: 'PRD-0005',
    nama: 'Stiker Transparan A3+ Kiss Cut',
    tipe: 'Barang',
    kategori: 'Stiker & Decal',
    desc: 'Stiker bening tembus pandang anti air. Memberi kesan elegan tanpa background pada botol atau jar kaca.',
    satuan: 'Lembar A3+',
    hpp: 7000,
    harga: 16000,
    showInPortal: true,
    finishingGroupIds: ['fg_stiker_cut', 'fg_stiker_lam']
  },
  {
    id: 'prod_6',
    code: 'PRD-0006',
    nama: 'X-Banner Stand 60x160 (Albatros + Rangka)',
    tipe: 'Barang',
    kategori: 'Indoor Display',
    desc: 'Paket komplit banner bahan Albatros halus tidak melengkung + laminasi Doff/Glossy + rangka X-Banner fiber kokoh.',
    satuan: 'Set',
    hpp: 45000,
    harga: 85000,
    showInPortal: true,
    finishingGroupIds: ['fg_banner_stand']
  },
  {
    id: 'prod_7',
    code: 'PRD-0007',
    nama: 'Roll Up Banner Alumunium 60x160',
    tipe: 'Barang',
    kategori: 'Indoor Display',
    desc: 'Standing banner sistem tarik otomatis dari bawah ke atas. Rangka alumunium tebal mewah & portabel include tas jinjing.',
    satuan: 'Set',
    hpp: 110000,
    harga: 185000,
    showInPortal: true,
    finishingGroupIds: ['fg_banner_stand']
  },
  {
    id: 'prod_8',
    code: 'PRD-0008',
    nama: 'Kartu Nama Full Color 2 Sisi + Box',
    tipe: 'Barang',
    kategori: 'Digital A3+',
    desc: 'Kertas Art Carton 260gsm cetak bolak-balik full color resolusi tinggi. 1 Box isi 100 lembar + box mika bening.',
    satuan: 'Box (100 Pcs)',
    hpp: 18000,
    harga: 40000,
    showInPortal: true,
    finishingGroupIds: ['fg_stiker_lam']
  },
  {
    id: 'prod_9',
    code: 'PRD-0009',
    nama: 'Brosur Lipat 3 Art Paper 150gsm (A4)',
    tipe: 'Barang',
    kategori: 'Digital A3+',
    desc: 'Bahan kertas licin kilap Art Paper 150gsm cetak 2 sisi full color sudah dilipat rapi model lipat C / lipat Z.',
    satuan: 'Pcs',
    hpp: 1600,
    harga: 3500,
    showInPortal: true
  },
  {
    id: 'prod_10',
    code: 'PRD-0010',
    nama: 'Poster A3+ Art Carton 260gsm',
    tipe: 'Barang',
    kategori: 'Digital A3+',
    desc: 'Poster tebal kaku ukuran A3+ (32 x 48 cm) tajam memukau untuk dinding, menu kafe, atau promosi kasir.',
    satuan: 'Lembar A3+',
    hpp: 3500,
    harga: 8000,
    showInPortal: true,
    finishingGroupIds: ['fg_stiker_lam']
  },
  {
    id: 'prod_11',
    code: 'PRD-0011',
    nama: 'Nota NCR 2 Ply 1/4 Folio (50 Set)',
    tipe: 'Barang',
    kategori: 'Offset & Sablon',
    desc: 'Buku nota tembus tanpa karbon. Rangkap 2 (Putih & Merah/Kuning). Isi 50 set per buku + nomorator & porporasi sobek.',
    satuan: 'Buku',
    hpp: 7500,
    harga: 15000,
    showInPortal: true
  },
  {
    id: 'prod_12',
    code: 'PRD-0012',
    nama: 'Plakat Akrilik Custom UV Print Tebal 5mm',
    tipe: 'Barang',
    kategori: 'Merchandise & Souvenir',
    desc: 'Akrilik bening tebal 5mm dipotong pola presisi dengan mesin laser, dicetak UV flatbed tajam & tahan gores + tatakan alas.',
    satuan: 'Pcs',
    hpp: 45000,
    harga: 95000,
    showInPortal: true
  },
  {
    id: 'prod_13',
    code: 'PRD-0013',
    nama: 'Tali Lanyard ID Card Custom Print 2cm',
    tipe: 'Barang',
    kategori: 'Merchandise & Souvenir',
    desc: 'Bahan tali tissue lembut print sublimasi full color 2 sisi lengkap dengan stopper plastik & pengait besi nikel.',
    satuan: 'Pcs',
    hpp: 7500,
    harga: 15000,
    showInPortal: true
  },
  {
    id: 'prod_14',
    code: 'PRD-0014',
    nama: 'Paper Bag Kraft Cokelat Cetak Sablon',
    tipe: 'Barang',
    kategori: 'Merchandise & Souvenir',
    desc: 'Paper bag ramah lingkungan bahan Samson Kraft tebal dengan tali kur rapi. Sablon 1 warna 1 sisi logo toko Anda.',
    satuan: 'Pcs',
    hpp: 3500,
    harga: 6500,
    showInPortal: true
  }
];

export const SEED_BAHAN: Bahan[] = [
  { id: 'b_1', nama: 'Rol Flexi Frontlite 280gsm (3.2m x 50m)', satuan: 'Rol', jumlah: 8, min: 2 },
  { id: 'b_2', nama: 'Rol Flexi Korchin 440gsm (3.2m x 50m)', satuan: 'Rol', jumlah: 5, min: 2 },
  { id: 'b_3', nama: 'Kertas Stiker Vinyl Glossy A3+', satuan: 'Rim', jumlah: 24, min: 5 },
  { id: 'b_4', nama: 'Kertas Stiker Cromo / Bontax A3+', satuan: 'Rim', jumlah: 30, min: 5 },
  { id: 'b_5', nama: 'Kertas Art Carton 260gsm A3+', satuan: 'Rim', jumlah: 42, min: 10 },
  { id: 'b_6', nama: 'Kertas Art Paper 150gsm A3+', satuan: 'Rim', jumlah: 35, min: 8 },
  { id: 'b_7', nama: 'Rangka X-Banner Fiber 60x160', satuan: 'Pcs', jumlah: 45, min: 10 },
  { id: 'b_8', nama: 'Rangka Roll Up Alumunium 60x160', satuan: 'Pcs', jumlah: 18, min: 5 },
  { id: 'b_9', nama: 'Tinta Eco Solvent CMYK', satuan: 'Liter', jumlah: 16, min: 4 }
];

export const SEED_VENDORS: Vendor[] = [
  {
    id: 'vend_1',
    code: 'VND-0001',
    nama: 'CV Sumber Kertas Nusantara',
    kategori: 'Bahan Baku & Kertas',
    wa: '081234500111',
    email: 'order@sumberkertas.co.id',
    alamat: 'Jl. MT Haryono No. 102, Balikpapan'
  },
  {
    id: 'vend_2',
    code: 'VND-0002',
    nama: 'PT Flexi Grafika Mandiri',
    kategori: 'Outdoor Banner & Tinta',
    wa: '085211223344',
    email: 'sales@flexigrafika.com',
    alamat: 'Kawasan Industri Balikpapan Blok D-4'
  },
  {
    id: 'vend_3',
    code: 'VND-0003',
    nama: 'Workshop Akrilik & Laser Nusantara',
    kategori: 'Akrilik & Plakat',
    wa: '081399887766',
    email: 'akrilik.nusantara@gmail.com',
    alamat: 'Jl. Soekarno Hatta KM 2.5, Balikpapan'
  },
  {
    id: 'vend_4',
    code: 'VND-0004',
    nama: 'Sentra Sablon DTF & Souvenir Balikpapan',
    kategori: 'Merchandise & Sablon',
    wa: '082188776655',
    email: 'sentrasablon.bpn@gmail.com',
    alamat: 'Jl. Ahmad Yani No. 56, Balikpapan'
  }
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    code: 'CUST-0001',
    nama: 'Budi Santoso',
    wa: '081234567890',
    email: 'budi.santoso@gmail.com',
    alamat: 'Jl. MT Haryono No. 45, RT 12, Balikpapan Selatan',
    googleSyncedAt: new Date().toISOString()
  },
  {
    id: 'cust_2',
    code: 'CUST-0002',
    nama: 'PT Balikpapan Prima Mandiri',
    wa: '085244556677',
    email: 'procurement@balikpapanprima.co.id',
    alamat: 'Kawasan Industri Kariangau Blok C No. 8, Balikpapan Barat',
    googleSyncedAt: new Date().toISOString()
  },
  {
    id: 'cust_3',
    code: 'CUST-0003',
    nama: 'Siti Rahma (Zahra Modest Wear)',
    wa: '081347889900',
    email: 'zahra.hijab.bpn@gmail.com',
    alamat: 'Ruko Bandar Balikpapan Blok B-12, Jl. Jendral Sudirman',
    googleSyncedAt: new Date().toISOString()
  },
  {
    id: 'cust_4',
    code: 'CUST-0004',
    nama: 'Panitia Seminar Pemkot Balikpapan',
    wa: '082155667788',
    email: 'seminar.balikpapan@gmail.com',
    alamat: 'Gedung Kesenian Balikpapan, Jl. Syarifuddin Yoes',
    googleSyncedAt: new Date().toISOString()
  },
  {
    id: 'cust_5',
    code: 'CUST-0005',
    nama: 'Dr. Hendra Wijaya (Klinik Pratama Sehat)',
    wa: '08115432100',
    email: 'kliniksehat.bpn@yahoo.com',
    alamat: 'Jl. Ruhui Rahayu No. 12, Gunung Bahagia, Balikpapan',
    googleSyncedAt: new Date().toISOString()
  }
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv_1001',
    noInv: 'INV-202609-001',
    tipeDoc: 'Invoice',
    tglInv: '2026-09-25',
    tempoInv: '2026-09-28',
    customerId: 'cust_1',
    customerCode: 'CUST-0001',
    namaCust: 'Budi Santoso',
    waCust: '081234567890',
    emailCust: 'budi.santoso@gmail.com',
    alamatCust: 'Jl. MT Haryono No. 45, Balikpapan',
    kasir: 'Admin Kasir',
    items: [
      {
        prodId: 'prod_1',
        prodCode: 'PRD-0001',
        nama: 'Spanduk Outdoor Flexi 280gsm (Ukuran 3x1 m)',
        qty: 2,
        satuan: 'Pcs',
        hpp: 36000,
        harga: 75000,
        diskon: 0,
        subtotal: 150000,
        finishingType: 'mata_ayam',
        finishingDetailsText: 'Mata Ayam 4 Pojok'
      },
      {
        prodId: 'prod_3',
        prodCode: 'PRD-0003',
        nama: 'Stiker Vinyl Glossy A3+ (Kiss Cut Bulat 4cm)',
        qty: 10,
        satuan: 'Lembar A3+',
        hpp: 65000,
        harga: 150000,
        diskon: 0,
        subtotal: 150000,
        finishingType: 'cut_kiss',
        finishingDetailsText: 'Kiss Cut Siap Kopek'
      }
    ],
    diskonTambahan: 0,
    totalHPP: 101000,
    grandTotal: 300000,
    dibayar: 300000,
    sisaTertagih: 0,
    statusBayar: 'Lunas',
    statusJob: 'Selesai',
    historyBayar: [
      {
        tgl: '2026-09-25 10:15',
        nominal: 300000,
        metode: 'Transfer BCA',
        note: 'Lunas via m-BCA'
      }
    ]
  },
  {
    id: 'inv_1002',
    noInv: 'INV-202609-002',
    tipeDoc: 'Invoice',
    tglInv: '2026-09-26',
    tempoInv: '2026-09-30',
    customerId: 'cust_2',
    customerCode: 'CUST-0002',
    namaCust: 'PT Balikpapan Prima Mandiri',
    waCust: '085244556677',
    emailCust: 'procurement@balikpapanprima.co.id',
    alamatCust: 'Kawasan Industri Kariangau Blok C No. 8',
    kasir: 'Admin Kasir',
    items: [
      {
        prodId: 'prod_7',
        prodCode: 'PRD-0007',
        nama: 'Roll Up Banner Alumunium 60x160 (Safety Induction)',
        qty: 2,
        satuan: 'Set',
        hpp: 220000,
        harga: 370000,
        diskon: 0,
        subtotal: 370000
      },
      {
        prodId: 'prod_8',
        prodCode: 'PRD-0008',
        nama: 'Kartu Nama Direksi Art Carton 260gsm + Doff',
        qty: 5,
        satuan: 'Box',
        hpp: 90000,
        harga: 200000,
        diskon: 0,
        subtotal: 200000,
        finishingDetailsText: 'Laminasi Doff 2 Sisi'
      }
    ],
    diskonTambahan: 20000,
    totalHPP: 310000,
    grandTotal: 550000,
    dibayar: 250000,
    sisaTertagih: 300000,
    statusBayar: 'DP',
    statusJob: 'Diproses',
    historyBayar: [
      {
        tgl: '2026-09-26 14:30',
        nominal: 250000,
        metode: 'Transfer Mandiri',
        note: 'DP 50%'
      }
    ]
  },
  {
    id: 'inv_1003',
    noInv: 'INV-202609-003',
    tipeDoc: 'Invoice',
    tglInv: '2026-09-27',
    tempoInv: '2026-10-02',
    customerId: 'cust_3',
    customerCode: 'CUST-0003',
    namaCust: 'Siti Rahma (Zahra Modest Wear)',
    waCust: '081347889900',
    emailCust: 'zahra.hijab.bpn@gmail.com',
    alamatCust: 'Ruko Bandar Balikpapan Blok B-12',
    kasir: 'Admin Kasir',
    items: [
      {
        prodId: 'prod_14',
        prodCode: 'PRD-0014',
        nama: 'Paper Bag Kraft Cokelat Sablon 1 Warna',
        qty: 100,
        satuan: 'Pcs',
        hpp: 350000,
        harga: 650000,
        diskon: 0,
        subtotal: 650000
      },
      {
        prodId: 'prod_4',
        prodCode: 'PRD-0004',
        nama: 'Hangtag Label Baju Art Carton 260gsm + Lubang',
        qty: 5,
        satuan: 'Lembar A3+',
        hpp: 20000,
        harga: 50000,
        diskon: 0,
        subtotal: 50000
      }
    ],
    diskonTambahan: 0,
    totalHPP: 370000,
    grandTotal: 700000,
    dibayar: 700000,
    sisaTertagih: 0,
    statusBayar: 'Lunas',
    statusJob: 'Siap Diambil',
    historyBayar: [
      {
        tgl: '2026-09-27 16:00',
        nominal: 700000,
        metode: 'QRIS Statis',
        note: 'QRIS CTRL PRINT'
      }
    ]
  }
];

export const SEED_COUNTERS: Counters = {
  nextInvNumber: 4,
  nextQuoteNumber: 1,
  nextPoNumber: 1,
  nextWebInvNumber: 1,
  nextCustNumber: 6,
  nextProdNumber: 15,
  nextVendorNumber: 5
};
