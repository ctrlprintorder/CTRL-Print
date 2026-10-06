export interface ParsedInvoiceData {
  customerName?: string;
  customerPhone?: string;
  items?: Array<{
    title: string;
    qty: number;
    price: number;
    subtotal?: number;
    note?: string;
  }>;
  dp?: number;
  grandTotal?: number;
  isLunas?: boolean;
  paymentMethod?: string;
  notes?: string;
}

export interface ItemSuggestion {
  suggestedDescription: string;
  recommendedPrice: number;
  unitName: string;
  materials?: string[];
  finishings?: string[];
}

export interface BusinessInsightsData {
  healthScore: number;
  headline: string;
  insights: string[];
  recommendations: string[];
  promotionalIdeas?: string[];
}

// 1. Scan/Parse Nota Gambar atau Teks
export async function parseInvoiceWithAI(
  imageBase64?: string,
  textContent?: string,
  mimeType = 'image/jpeg'
): Promise<ParsedInvoiceData> {
  const res = await fetch('/api/gemini/parse-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ imageBase64, textContent, mimeType }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gagal memproses nota dengan AI');
  }
  return data.data;
}

// 2. Generator Pesan WhatsApp Pelanggan
export async function generateWaMessageWithAI(
  invoice: any,
  type: 'order_created' | 'payment_reminder' | 'design_acc' | 'shipping' | 'thank_you' | 'ready_for_pickup' = 'order_created',
  customNote = '',
  bankInfo = '',
  qrisNms = ''
): Promise<string> {
  const res = await fetch('/api/gemini/generate-wa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ invoice, type, customNote, bankInfo, qrisNms }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gagal membuat pesan WhatsApp AI');
  }
  return data.message;
}

// 3. Saran Deskripsi & Spesifikasi Produk
export async function suggestItemDescriptionWithAI(
  title: string,
  category?: string
): Promise<ItemSuggestion> {
  const res = await fetch('/api/gemini/suggest-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ title, category }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gagal mengambil saran produk');
  }
  return data.data;
}

// 4. Analisis Performa Bisnis
export async function getBusinessInsightsWithAI(
  summary: any,
  recentInvoicesCount = 0
): Promise<BusinessInsightsData> {
  const res = await fetch('/api/gemini/business-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ summary, recentInvoicesCount }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gagal menganalisis data bisnis');
  }
  return data.data;
}

// 5. Asisten Chat
export async function chatWithAIAssistant(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  contextData: any
): Promise<string> {
  const res = await fetch('/api/gemini/assistant-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ messages, contextData }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gagal mengirim pesan ke AI Assistant');
  }
  return data.message;
}

export interface MarketingCaptionData {
  hook: string;
  caption: string;
  hashtags: string[];
  visualIdea: string;
}

// 6. AI Generator Caption & Konten Promosi Medsos
export async function generateMarketingCaptionWithAI(
  productName: string,
  platform = 'Instagram',
  tone = 'Promosional / Diskon',
  targetAudience = 'UMKM & Umum',
  promoDetails = ''
): Promise<MarketingCaptionData> {
  const res = await fetch('/api/gemini/generate-marketing-caption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ productName, platform, tone, targetAudience, promoDetails }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Gagal menghasilkan caption promosi AI');
  }
  return data.data;
}

