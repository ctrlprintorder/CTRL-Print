export interface Settings {
  company: string;
  tagline?: string;
  logoUrl?: string;
  phone: string;
  email?: string;
  instagram?: string;
  address: string;
  googleMapsUrl?: string;
  bank: string;
  paymentMethods: string;
  tnc: string;
  user: string;
  pass: string;
  qrisUrl?: string;
  qrisNms?: string;
  aboutUs?: string;
  operationalHours?: string;
  headerBannerUrl?: string;
  headerBanners?: string[];
  headerBannerHeight?: number;
  enableRunningText?: boolean;
  runningTextContent?: string;
  runningTextBadge?: string;
  runningTextSpeed?: 'slow' | 'normal' | 'fast';
  staffLoginVisibility?: 'discreet' | 'hidden' | 'normal';
  minTestimonialRating?: number;
  autoFilterLowRating?: boolean;
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  autoSyncGoogleSheets?: boolean;
  googleDriveFolderId?: string;
  googleDriveFolderStructure?: boolean;
  waTemplateInvoice?: string;
  waTemplateReady?: string;
  waTemplateAccDesain?: string;
  waTemplatePiutang?: string;
}

export interface Bahan {
  id: string;
  nama: string;
  satuan: string;
  jumlah: number;
  min: number;
}

export interface FinishingOption {
  id: string;
  nama: string;
  harga: number;
  tipeHitung: 'per_satuan' | 'flat' | 'per_meter';
  keterangan?: string;
}

export interface FinishingGroup {
  id: string;
  nama: string;
  deskripsi?: string;
  tipePilihan: 'single' | 'multiple';
  wajib?: boolean;
  kategoriProduk: string[]; // e.g. ['Stiker & Decal'], ['Outdoor Banner'], or ['SEMUA']
  options: FinishingOption[];
}

export interface SelectedFinishingItem {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  harga: number;
  tipeHitung: 'per_satuan' | 'flat' | 'per_meter';
}

export interface Produk {
  id: string;
  sku?: string;
  code?: string;
  tipe: 'Barang' | 'Jasa' | string;
  kategori?: string;
  nama: string;
  desc?: string;
  satuan?: string;
  bahanId?: string;
  bahanQty?: number;
  hpp: number;
  harga: number;
  imageUrl?: string;
  showInPortal?: boolean;
  portalNotes?: string;
  finishingGroupIds?: string[];
}

export interface Vendor {
  id: string;
  code?: string;
  nama: string;
  email?: string;
  wa?: string;
  kategori?: string;
  alamat?: string;
}

export interface Customer {
  id: string;
  code?: string;
  nama: string;
  wa?: string;
  email?: string;
  alamat?: string;
  googleSyncedAt?: string;
  googleResourceName?: string;
}

export interface Voucher {
  id: string;
  code: string;
  desc?: string;
  type: 'nominal' | 'percent';
  value: number;
  minTransaction?: number;
  maxDiscount?: number;
  quota?: number;
  usedCount?: number;
  validFrom?: string;
  validUntil?: string;
  active: boolean;
}

export interface InvoiceItem {
  prodId?: string;
  productId?: string;
  product_id?: string;
  prodCode?: string;
  nama: string;
  desc?: string;
  qty: number;
  satuan: string;
  bahanId?: string;
  bahanQty?: number;
  hpp: number;
  harga: number;
  baseHarga?: number; // harga asli produk sebelum ditambah biaya finishing
  diskon: number;
  subtotal: number;
  fileUrl?: string;
  drive_file_id?: string;
  drive_view_url?: string;
  drive_embed_url?: string;
  panjangCm?: number;
  lebarCm?: number;
  finishingType?: string; // e.g. 'mata_ayam', 'lipat', 'potong'
  selectedFinishings?: SelectedFinishingItem[];
  finishingDetailsText?: string; // teks ringkas opsi finishing terpilih
}

export interface HistoryBayar {
  tgl: string;
  nominal: number;
  note?: string;
  metode?: string;
  buktiUrl?: string;
}

export interface Invoice {
  id: string;
  tipeDoc: 'Invoice' | 'Quotation' | string;
  noInv: string;
  tglInv: string;
  tempoInv: string;
  customerId?: string;
  customer_id?: string;
  customerCode?: string;
  namaCust: string;
  waCust?: string;
  emailCust?: string;
  alamatCust?: string;
  kasir?: string;
  items: InvoiceItem[];
  diskonTambahan: number;
  voucherCode?: string;
  voucherDiscount?: number;
  totalHPP: number;
  grandTotal: number;
  dibayar: number;
  bayarNote?: string;
  ongkir?: number;
  subtotalSum?: number;
  sisaTertagih: number;
  statusBayar: 'Paid' | 'Partial' | 'Unpaid' | string;
  statusJob: 'Pending' | 'Desain' | 'Produksi' | 'Finishing' | 'Siap Kirim' | 'Selesai' | string;
  historyBayar?: HistoryBayar[];
  buktiBayarUrl?: string;
  tglBuktiBayar?: string;
  catatanBuktiBayar?: string;
  estimasiPengerjaan?: string;
  isWebVerified?: boolean;
  // Pre-flight & Proofing & ACC Desain
  proofImageUrl?: string;
  drive_file_id?: string;
  drive_view_url?: string;
  drive_embed_url?: string;
  proofStatus?: 'pending' | 'approved' | 'rejected' | string;
  proofApprovedAt?: string;
  preflightLogs?: string[];
  fileUrl?: string;
  accDesainUrl?: string;
  accDesainStatus?: 'Menunggu ACC' | 'ACC Disetujui' | 'Minta Revisi' | 'Siap Cetak' | string;
  accDesainNotes?: string;
  accDesainHistory?: Array<{ date: string; action: string; note?: string; user?: string; fileUrl?: string }>;
  // Surat Jalan & Quotation Extra Info
  suratJalanNo?: string;
  suratJalanDate?: string;
  driverName?: string;
  driverPhone?: string;
  ekspedisi?: string;
  noResi?: string;
  suratJalanNotes?: string;
  penerimaNama?: string;
  quoteValidityDays?: number;
  quoteSubject?: string;
}

export interface Pengeluaran {
  id: string;
  tgl: string;
  kategori: string;
  vendor?: string;
  ket: string;
  nominal: number;
}

export interface PoItem {
  fileName?: string;
  prodName: string;
  ket?: string;
  qty: number;
  satuan: string;
}

export interface PoVendor {
  id: string;
  noPo: string;
  vendor: string;
  vendorEmail?: string;
  tglPo: string;
  tglSelesai: string;
  jamSelesai: string;
  driveUrl: string;
  modalTotal: number;
  catatan?: string;
  items: PoItem[];
  statusBayarVendor?: 'Lunas' | 'Sebagian' | 'Belum Bayar' | string;
  dibayarVendor?: number;
  sisaVendor?: number;
  buktiBayarVendorUrl?: string;
  tglBayarVendor?: string;
  metodeBayarVendor?: string;
  catatanBayarVendor?: string;
  emailSentAt?: string;
  emailSentTo?: string;
  // Vendor Portal tracking fields
  vendorDeadline?: string;
  vendorDeadlineTime?: string;
  vendorStatus?: 'Menunggu Konfirmasi' | 'Dikonfirmasi' | 'Sedang Dikerjakan' | 'Selesai' | 'Siap Diambil' | string;
  vendorConfirmedAt?: string;
  vendorNotes?: string;
  vendorCompletedAt?: string;
}

export interface Counters {
  nextInvNumber: number;
  nextQuoteNumber: number;
  nextPoNumber: number;
  nextWebInvNumber?: number;
  nextCustNumber?: number;
  nextProdNumber?: number;
  nextVendorNumber?: number;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  type: 'invoice' | 'po_vendor' | 'custom' | 'quotation' | 'payment_receipt' | 'acc_desain' | 'order_ready' | string;
  referenceId?: string;
  referenceNo?: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  readAt?: string;
  readCount?: number;
  ipAddress?: string;
  senderEmail?: string;
  attachmentUrl?: string;
  metadata?: Record<string, any>;
}

export interface AppNotification {
  id: string;
  type: 'email_read' | 'email_sent' | 'order_online' | 'bukti_bayar' | 'acc_desain_approved' | 'acc_desain_revision' | 'acc_desain_new' | 'stok_menipis' | 'job_completed' | 'general';
  title: string;
  desc: string;
  timestamp: string;
  isRead: boolean;
  linkTab?: string;
  linkParam?: string;
  referenceId?: string;
  referenceNo?: string;
  badge?: string;
  category: 'email' | 'order' | 'acc_desain' | 'stok' | 'system';
  data?: any;
}

export interface CustomerTestimonial {
  id: string;
  name: string;
  business?: string;
  city?: string;
  product: string;
  category: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  avatarColor?: string;
  status?: 'approved' | 'hidden' | 'pending';
  isHidden?: boolean;
  invoiceNo?: string;
}
