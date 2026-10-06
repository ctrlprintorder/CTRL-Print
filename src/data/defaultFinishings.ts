import { FinishingGroup, SelectedFinishingItem } from '../types';

export const DEFAULT_FINISHING_GROUPS: FinishingGroup[] = [
  // 1. Finishing Khusus Stiker & Decal
  {
    id: 'fg_stiker_cut',
    nama: 'Tipe Potong Stiker (Cutting)',
    deskripsi: 'Pilihan jenis potongan mesin cutting untuk stiker lembaran A3+ / rol',
    tipePilihan: 'single',
    kategoriProduk: ['Stiker & Decal', 'Digital A3+'],
    options: [
      { id: 'cut_none', nama: 'Tanpa Potong (Lembaran Utuh)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Dikirim lembaran utuh tanpa dipotong' },
      { id: 'cut_kiss', nama: 'Kiss Cut (Setengah Putus / Siap Kopek)', harga: 3500, tipeHitung: 'per_satuan', keterangan: 'Stiker dipotong sesuai pola tapi dasar kertas tetap utuh' },
      { id: 'cut_die', nama: 'Die Cut (Potong Putus Tembus Satuan)', harga: 5000, tipeHitung: 'per_satuan', keterangan: 'Stiker dan alas belakang dipotong tembus satuan' },
      { id: 'cut_kotak', nama: 'Potong Kotak Mesin Sisir', harga: 1000, tipeHitung: 'per_satuan', keterangan: 'Potong lurus kotak persegi rapi dengan pisau potong' },
    ]
  },
  {
    id: 'fg_stiker_lam',
    nama: 'Laminasi Stiker (Dingin/Cold)',
    deskripsi: 'Lapisan pelindung stiker anti-air & anti-gores UV outdoor',
    tipePilihan: 'single',
    kategoriProduk: ['Stiker & Decal', 'Digital A3+'],
    options: [
      { id: 'lam_none', nama: 'Tanpa Laminasi (Standar)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Hasil cetak asli bahan' },
      { id: 'lam_cold_glossy', nama: 'Laminasi Dingin Glossy (Kilap)', harga: 2500, tipeHitung: 'per_satuan', keterangan: 'Mengkilap cerah dan tahan air' },
      { id: 'lam_cold_doff', nama: 'Laminasi Dingin Doff (Matte Halus)', harga: 3000, tipeHitung: 'per_satuan', keterangan: 'Matte lembut elegan tidak memantulkan cahaya' },
      { id: 'lam_glitter', nama: 'Laminasi Pasir / Glitter Sparkling', harga: 5000, tipeHitung: 'per_satuan', keterangan: 'Permukaan bertekstur kerlap-kerlip mewah' },
      { id: 'lam_hologram', nama: 'Laminasi Hologram Rainbow Rainbow', harga: 6000, tipeHitung: 'per_satuan', keterangan: 'Efek pelangi saat terkena pantulan cahaya' },
      { id: 'lam_3d', nama: 'Laminasi 3D Dimensi', harga: 6000, tipeHitung: 'per_satuan', keterangan: 'Efek optik kedalaman visual' },
    ]
  },

  // 2. Finishing Spanduk & Banner Outdoor
  {
    id: 'fg_banner_tepi',
    nama: 'Finishing Tepi Spanduk / Banner',
    deskripsi: 'Pilihan pengerjaan tepi bahan flexi spanduk baliho',
    tipePilihan: 'single',
    kategoriProduk: ['Outdoor Banner', 'Indoor Display'],
    options: [
      { id: 'ban_mata_4', nama: 'Mata Ayam 4 Pojok (Ring Lubang Besi)', harga: 2000, tipeHitung: 'per_satuan', keterangan: 'Lubang ring besi di keempat sudut untuk tali' },
      { id: 'ban_mata_meter', nama: 'Mata Ayam Keliling (per 1 Meter)', harga: 4000, tipeHitung: 'per_satuan', keterangan: 'Ring keliling setiap jarak 1 meter spanduk' },
      { id: 'ban_selongsong', nama: 'Selongsong Kiri-Kanan / Atas-Bawah', harga: 5000, tipeHitung: 'per_satuan', keterangan: 'Lipatan berongga untuk memasukkan bambu/pipa/kayu' },
      { id: 'ban_lipat_lem', nama: 'Lipat Lem Saja (Tanpa Ring Mata Ayam)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Tepi dilipat dan dilem kuat tanpa ring' },
      { id: 'ban_potong_pas', nama: 'Potong Pas Gambar (Bersih Keliling)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Dipotong pas batas cetak gambar' },
      { id: 'ban_lebihan', nama: 'Lebihan Bahan Putih Keliling (Bentang Frame)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Diberi sisa bahan putih 3-5 cm untuk dipasang di rangka billboard' },
    ]
  },
  {
    id: 'fg_banner_stand',
    nama: 'Stand & Rangka Display Banner',
    deskripsi: 'Pilihan standing display untuk banner promosi',
    tipePilihan: 'multiple',
    kategoriProduk: ['Outdoor Banner', 'Indoor Display', 'Merchandise & Souvenir'],
    options: [
      { id: 'stand_x_banner', nama: 'X-Banner Stand Fiber Hitam 60x160', harga: 25000, tipeHitung: 'per_satuan', keterangan: 'Kaki fiber X kokoh dengan sarung pembungkus' },
      { id: 'stand_y_banner', nama: 'Y-Banner Stand Alumunium 60x160', harga: 35000, tipeHitung: 'per_satuan', keterangan: 'Rangka besi Y lebih stabil untuk indoor' },
      { id: 'stand_rollup_60', nama: 'Roll Up Banner Alumunium 60x160', harga: 75000, tipeHitung: 'per_satuan', keterangan: 'Sistem gulung otomatis portabel praktis' },
      { id: 'stand_rollup_80', nama: 'Roll Up Banner Alumunium 80x200', harga: 95000, tipeHitung: 'per_satuan', keterangan: 'Ukuran besar 80x200 roll up mewah' },
      { id: 'stand_tripod', nama: 'Tripod Banner Stand Dua Sisi (Double Side)', harga: 65000, tipeHitung: 'per_satuan', keterangan: 'Tiang besi tripod kokoh adjustable tinggi' },
      { id: 'stand_door_frame', nama: 'Door Frame Banner Stand Besi 60x160', harga: 120000, tipeHitung: 'per_satuan', keterangan: 'Rangka besi tebal dengan pemberat air' },
    ]
  },

  // 3. Laminasi Kertas / Dokumen / Brosur
  {
    id: 'fg_kertas_lam',
    nama: 'Laminasi Kertas (Thermal / Panas)',
    deskripsi: 'Laminasi panas plastik BOPP untuk Art Paper, Ivory, Kartu Nama, Brosur',
    tipePilihan: 'single',
    kategoriProduk: ['Digital A3+', 'Offset & Sablon', 'Finishing & Jilid'],
    options: [
      { id: 'lam_kertas_none', nama: 'Tanpa Laminasi (Standard Print)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Permukaan kertas bawaan tanpa pelapis' },
      { id: 'lam_kertas_g1', nama: 'Laminasi Panas Glossy 1 Sisi', harga: 2000, tipeHitung: 'per_satuan', keterangan: 'Sisi depan mengkilap' },
      { id: 'lam_kertas_d1', nama: 'Laminasi Panas Doff 1 Sisi', harga: 2500, tipeHitung: 'per_satuan', keterangan: 'Sisi depan matte halus' },
      { id: 'lam_kertas_g2', nama: 'Laminasi Panas Glossy 2 Sisi (Bolak-Balik)', harga: 4000, tipeHitung: 'per_satuan', keterangan: 'Kedua sisi mengkilap' },
      { id: 'lam_kertas_d2', nama: 'Laminasi Panas Doff 2 Sisi (Bolak-Balik)', harga: 5000, tipeHitung: 'per_satuan', keterangan: 'Kedua sisi matte halus mewah' },
      { id: 'lam_kertas_velvet', nama: 'Laminasi Soft Touch / Velvet Eksklusif', harga: 6000, tipeHitung: 'per_satuan', keterangan: 'Tekstur beludru super lembut untuk kemasan premium' },
    ]
  },

  // 4. Lipat & Garis (Creasing / Folding)
  {
    id: 'fg_kertas_lipat',
    nama: 'Lipat & Garis (Creasing / V-Fold)',
    deskripsi: 'Proses rel atau lipat otomatis untuk brosur, undangan, pamflet',
    tipePilihan: 'single',
    kategoriProduk: ['Digital A3+', 'Offset & Sablon', 'Finishing & Jilid'],
    options: [
      { id: 'lipat_none', nama: 'Tanpa Lipat (Rata)', harga: 0, tipeHitung: 'per_satuan', keterangan: 'Dikirim lembaran rata' },
      { id: 'lipat_2', nama: 'Lipat 2 (Bifold / V-Fold)', harga: 500, tipeHitung: 'per_satuan', keterangan: 'Brosur dilipat jadi 2 sisi/halaman' },
      { id: 'lipat_3_c', nama: 'Lipat 3 (Trifold / C-Fold)', harga: 800, tipeHitung: 'per_satuan', keterangan: 'Brosur dilipat melipat ke dalam 3 kolom' },
      { id: 'lipat_3_z', nama: 'Lipat 3 Zig-zag (Z-Fold)', harga: 800, tipeHitung: 'per_satuan', keterangan: 'Brosur dilipat zig-zag bolak-balik' },
      { id: 'creasing_saja', nama: 'Rel / Creasing Garis Lipat Saja (Belum Dilipat)', harga: 500, tipeHitung: 'per_satuan', keterangan: 'Diberi tanda parit tekan agar kertas tidak pecah saat dilipat sendiri' },
    ]
  },

  // 5. Jilid Buku, Majalah, Modul & Nota
  {
    id: 'fg_buku_jilid',
    nama: 'Tipe Jilid Buku, Nota & Modul',
    deskripsi: 'Finishing penjilidan untuk buku, nota ncr, katalog, laporan, modul',
    tipePilihan: 'single',
    kategoriProduk: ['Finishing & Jilid', 'Digital A3+', 'Offset & Sablon'],
    options: [
      { id: 'jilid_blok_lem', nama: 'Jilid Blok Lem Atas / Samping (Buku Nota)', harga: 2500, tipeHitung: 'per_satuan', keterangan: 'Lem punggung praktis mudah disobek per set' },
      { id: 'jilid_kawat_lakban', nama: 'Jilid Jahit Kawat (Staples) + Lakban Hitam', harga: 4000, tipeHitung: 'per_satuan', keterangan: 'Staples tengah/samping diperkuat lakban hitam tebal' },
      { id: 'jilid_spiral_kawat', nama: 'Jilid Spiral Kawat Hitam / Putih', harga: 8000, tipeHitung: 'per_satuan', keterangan: 'Kawat ring ganda bisa dibuka 360 derajat + mika pelindung' },
      { id: 'jilid_spiral_plastik', nama: 'Jilid Spiral Plastik (Ring Comb)', harga: 5000, tipeHitung: 'per_satuan', keterangan: 'Ring gigi plastik fleksibel' },
      { id: 'jilid_perfect_binding', nama: 'Jilid Lem Panas (Perfect Binding Buku)', harga: 10000, tipeHitung: 'per_satuan', keterangan: 'Punggung kotak rata standar novel dan majalah cetak' },
      { id: 'jilid_hardcover', nama: 'Jilid Hardcover Skripsi / Agenda Eksklusif', harga: 25000, tipeHitung: 'per_satuan', keterangan: 'Cover board tebal dilapisi linen/art paper + pita pembatas' },
    ]
  },

  // 6. Fitur Khusus Nota & Dokumen (Nomorator & Porporasi)
  {
    id: 'fg_nota_fitur',
    nama: 'Fitur Khusus Nota & Tiket (Nomorator / Porporasi)',
    deskripsi: 'Penomoran berurutan dan garis cacah sobekan tiket/kupon/nota',
    tipePilihan: 'multiple',
    kategoriProduk: ['Finishing & Jilid', 'Offset & Sablon', 'Digital A3+'],
    options: [
      { id: 'fitur_nomorator', nama: 'Nomorator Otomatis (Cetak No. Urut Merah)', harga: 2500, tipeHitung: 'per_satuan', keterangan: 'Cetak no. urut (misal: 0001 s/d 1000) tinta merah mencolok' },
      { id: 'fitur_porporasi', nama: 'Porporasi (Garis Lubang Titik-titik Sobek)', harga: 2000, tipeHitung: 'per_satuan', keterangan: 'Cacah perforasi agar mudah disobek rapi' },
      { id: 'fitur_susun_ncr', nama: 'Susun Rangkap Lembar NCR (Play)', harga: 1000, tipeHitung: 'per_satuan', keterangan: 'Pengurutan lembar putih, merah, kuning, hijau per set' },
    ]
  },

  // 7. Finishing Kalender (Meja & Dinding)
  {
    id: 'fg_kalender',
    nama: 'Finishing Kalender (Dinding & Meja)',
    deskripsi: 'Gantungan kalender dinding atau dudukan board kalender meja custom',
    tipePilihan: 'single',
    kategoriProduk: ['Finishing & Jilid', 'Digital A3+', 'Merchandise & Souvenir', 'Offset & Sablon'],
    options: [
      { id: 'kal_klem_seng', nama: 'Klem Seng Kalender Dinding (Jepit Kaleng)', harga: 2500, tipeHitung: 'per_satuan', keterangan: 'Jepit lempengan seng atas + gantungan dinding' },
      { id: 'kal_spiral_hanger', nama: 'Jilid Spiral Kawat + Hanger Gantungan Dinding', harga: 6000, tipeHitung: 'per_satuan', keterangan: 'Spiral kawat dengan kawat gantungan melengkung di tengah' },
      { id: 'kal_board_linen', nama: 'Dudukan Board Linen Tebal (Kalender Meja Standar)', harga: 12000, tipeHitung: 'per_satuan', keterangan: 'Kaki segitiga hardcover lapis linen hitam kuat & mewah' },
      { id: 'kal_board_ivory', nama: 'Dudukan Softcover Ivory Lipat (Kalender Meja Ekonomis)', harga: 6000, tipeHitung: 'per_satuan', keterangan: 'Kaki lipat bahan ivory 350gr ekonomis' },
    ]
  },

  // 8. Efek Cetak Khusus: Foil Emas, Perak, Spot UV & Emboss
  {
    id: 'fg_mewah_foil',
    nama: 'Efek Cetak Khusus (Foil / Spot UV / Emboss)',
    deskripsi: 'Aksen berkilau emas, perak, timbul untuk kartu nama, undangan & box',
    tipePilihan: 'multiple',
    kategoriProduk: ['Digital A3+', 'Offset & Sablon', 'Merchandise & Souvenir'],
    options: [
      { id: 'foil_emas', nama: 'Poly Emas (Gold Foil Hotprint)', harga: 15000, tipeHitung: 'flat', keterangan: 'Aksen kilau emas metalik mengkilap' },
      { id: 'foil_perak', nama: 'Poly Perak (Silver Foil Hotprint)', harga: 15000, tipeHitung: 'flat', keterangan: 'Aksen kilau perak metalik elegan' },
      { id: 'spot_uv', nama: 'Spot UV Varnish (Efek Kilap Timbul Parsial)', harga: 20000, tipeHitung: 'flat', keterangan: 'Kilap gloss timbul pada logo atau tulisan tertentu' },
      { id: 'emboss_timbul', nama: 'Emboss / Deboss (Efek Timbul Tekstur)', harga: 15000, tipeHitung: 'flat', keterangan: 'Kertas ditekan hingga timbul bertekstur raba' },
      { id: 'sudut_bulat', nama: 'Sudut Bulat Rounding (Rounded Corner 4 Sisi)', harga: 3000, tipeHitung: 'per_satuan', keterangan: 'Keempat sudut dipotong melengkung halus' },
      { id: 'box_kartu_nama', nama: 'Box Plastik Bening Kartu Nama Tebal', harga: 2500, tipeHitung: 'per_satuan', keterangan: 'Kotak plastik mika keras wadah kartu nama isi 100 pcs' },
      { id: 'plastik_opp', nama: 'Plastik Seal OPP Bening Satuan (Kemasan)', harga: 300, tipeHitung: 'per_satuan', keterangan: 'Plastik lem pembungkus satuan bersih anti kotor' },
    ]
  },

  // 9. Finishing Akrilik & Merchandise Custom
  {
    id: 'fg_merchandise',
    nama: 'Aksesoris & Finishing Akrilik / Merchandise',
    deskripsi: 'Perlengkapan gantungan, dudukan kayu, peniti untuk souvenir',
    tipePilihan: 'multiple',
    kategoriProduk: ['Merchandise & Souvenir', 'Indoor Display'],
    options: [
      { id: 'merch_laser_cut', nama: 'Cutting Mesin Laser Custom Shape Akrilik', harga: 5000, tipeHitung: 'per_satuan', keterangan: 'Potong akrilik mengikuti lekuk pola desain' },
      { id: 'merch_ring_putar', nama: 'Gantungan Kunci Ring Putar Besi Tebal', harga: 2000, tipeHitung: 'per_satuan', keterangan: 'Ring putar besi anti karat kokoh' },
      { id: 'merch_ballchain', nama: 'Rantai Biji Lada Warna (Ball Chain)', harga: 1000, tipeHitung: 'per_satuan', keterangan: 'Gantungan rantai biji lada warna-warni' },
      { id: 'merch_stand_kayu', nama: 'Stand Kayu Natural Dudukan Plakat / Akrilik', harga: 8000, tipeHitung: 'per_satuan', keterangan: 'Dudukan balok kayu jati belanda halus berparit' },
      { id: 'merch_pin_peniti', nama: 'Pin Peniti Plastik / Gantungan Pembuka Botol', harga: 1500, tipeHitung: 'per_satuan', keterangan: 'Bahan belakang pin bros peniti' },
      { id: 'merch_magnet', nama: 'Tempelan Magnet Kulkas Karet Neodymium', harga: 2000, tipeHitung: 'per_satuan', keterangan: 'Magnet daya rekat tinggi untuk kulkas' },
    ]
  }
];

/**
 * Helper to match finishing groups applicable for a given product
 */
export function getApplicableFinishingGroups(
  productKategori?: string,
  productFinishingIds?: string[],
  allGroups: FinishingGroup[] = DEFAULT_FINISHING_GROUPS
): FinishingGroup[] {
  // If product explicitly defines specific finishingGroupIds, use those
  if (productFinishingIds && productFinishingIds.length > 0) {
    return allGroups.filter((g) => productFinishingIds.includes(g.id));
  }

  // Otherwise, match based on Category keywords or 'SEMUA'
  const cleanCat = (productKategori || '').toLowerCase().trim();
  if (!cleanCat) return [];

  return allGroups.filter((g) => {
    if (g.kategoriProduk.includes('SEMUA')) return true;

    return g.kategoriProduk.some((cat) => {
      const gCat = cat.toLowerCase().trim();
      if (cleanCat.includes(gCat) || gCat.includes(cleanCat)) return true;

      // Smart semantic mapping
      if (cleanCat.includes('stiker') || cleanCat.includes('sticker') || cleanCat.includes('decal') || cleanCat.includes('label')) {
        return g.id === 'fg_stiker_cut' || g.id === 'fg_stiker_lam';
      }
      if (cleanCat.includes('spanduk') || cleanCat.includes('banner') || cleanCat.includes('baliho') || cleanCat.includes('flexi')) {
        return g.id === 'fg_banner_tepi' || g.id === 'fg_banner_stand';
      }
      if (cleanCat.includes('brosur') || cleanCat.includes('flyer') || cleanCat.includes('poster') || cleanCat.includes('katalog')) {
        return g.id === 'fg_kertas_lam' || g.id === 'fg_kertas_lipat';
      }
      if (cleanCat.includes('nota') || cleanCat.includes('buku') || cleanCat.includes('ncr') || cleanCat.includes('kwitansi') || cleanCat.includes('karcis') || cleanCat.includes('tiket')) {
        return g.id === 'fg_buku_jilid' || g.id === 'fg_nota_fitur';
      }
      if (cleanCat.includes('kalender') || cleanCat.includes('calendar')) {
        return g.id === 'fg_kalender';
      }
      if (cleanCat.includes('kartu') || cleanCat.includes('nama') || cleanCat.includes('undangan') || cleanCat.includes('invitation')) {
        return g.id === 'fg_mewah_foil' || g.id === 'fg_kertas_lam';
      }
      if (cleanCat.includes('akrilik') || cleanCat.includes('acrylic') || cleanCat.includes('merchandise') || cleanCat.includes('plakat') || cleanCat.includes('souvenir') || cleanCat.includes('pin') || cleanCat.includes('ganci')) {
        return g.id === 'fg_merchandise';
      }
      if (cleanCat.includes('a3') || cleanCat.includes('digital') || cleanCat.includes('print')) {
        return g.id === 'fg_kertas_lam' || g.id === 'fg_stiker_cut';
      }
      return false;
    });
  });
}

/**
 * Calculates additional finishing cost and returns detailed breakdown
 */
export function calculateFinishingAddition(
  selected: SelectedFinishingItem[] = [],
  basePrice: number = 0,
  qty: number = 1
): {
  perUnitAdd: number;
  flatAdd: number;
  newUnitPrice: number;
  subtotalWithFinishing: number;
  summary: string;
} {
  let perUnitAdd = 0;
  let flatAdd = 0;

  for (const item of selected) {
    if (item.tipeHitung === 'flat') {
      flatAdd += Number(item.harga) || 0;
    } else {
      perUnitAdd += Number(item.harga) || 0;
    }
  }

  const effectiveQty = qty > 0 ? qty : 1;
  const unitFlatAllocation = flatAdd > 0 ? flatAdd / effectiveQty : 0;
  const newUnitPrice = basePrice + perUnitAdd + unitFlatAllocation;
  const subtotalWithFinishing = (effectiveQty * (basePrice + perUnitAdd)) + flatAdd;
  const summary = formatFinishingSummary(selected);

  return {
    perUnitAdd,
    flatAdd,
    newUnitPrice,
    subtotalWithFinishing,
    summary
  };
}

/**
 * Returns clean summary text for invoice display
 * e.g. "Kiss Cut (+Rp 3.500), Laminasi Doff (+Rp 3.000)"
 */
export function formatFinishingSummary(selected: SelectedFinishingItem[] = []): string {
  if (!selected || selected.length === 0) return '';
  return selected
    .map((s) => {
      const priceStr = s.harga > 0 ? ` (+Rp ${s.harga.toLocaleString('id-ID')}${s.tipeHitung === 'flat' ? ' flat' : ''})` : '';
      return `${s.optionName}${priceStr}`;
    })
    .join(' • ');
}
