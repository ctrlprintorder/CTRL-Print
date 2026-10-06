import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "20mb" }));

// 0. API Health Check Endpoints (Required for Cloud Run, Ingress, and Container Probes)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
};

app.get("/health", healthHandler);
app.get("/_health", healthHandler);
app.get("/api/health", healthHandler);
app.head("/health", (req, res) => res.status(200).end());
app.head("/api/health", (req, res) => res.status(200).end());

app.use("/api", (req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Logo and favicon static direct handler with cache headers
app.get(["/logo.jpg", "/favicon.png"], (req, res, next) => {
  const isFavicon = req.path.includes("favicon");
  const fileName = isFavicon ? "favicon.png" : "logo.jpg";
  const possiblePaths = [
    path.join(process.cwd(), "public", fileName),
    path.join(process.cwd(), "dist", fileName),
    path.resolve(__dirname, fileName),
  ];
  const foundPath = possiblePaths.find((p) => fs.existsSync(p));
  if (foundPath) {
    res.setHeader("Content-Type", isFavicon ? "image/png" : "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
    return res.sendFile(foundPath);
  }
  next();
});

// API endpoint to sync logo when updated in settings
app.post("/api/sync-logo", (req, res) => {
  try {
    const { logoUrl } = req.body;
    if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("data:image")) {
      const parts = logoUrl.split(",");
      if (parts[1]) {
        const buffer = Buffer.from(parts[1], "base64");
        const publicLogoPath = path.join(process.cwd(), "public", "logo.jpg");
        const publicFaviconPath = path.join(process.cwd(), "public", "favicon.png");
        const distLogoPath = path.join(process.cwd(), "dist", "logo.jpg");
        const distFaviconPath = path.join(process.cwd(), "dist", "favicon.png");
        
        fs.writeFileSync(publicLogoPath, buffer);
        fs.writeFileSync(publicFaviconPath, buffer);
        if (fs.existsSync(path.join(process.cwd(), "dist"))) {
          fs.writeFileSync(distLogoPath, buffer);
          fs.writeFileSync(distFaviconPath, buffer);
        }
        return res.json({ success: true, size: buffer.length });
      }
    }
    return res.status(400).json({ error: "Invalid logo format" });
  } catch (err: any) {
    console.error("Error syncing logo:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Lazy initializer for Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. AI Parse Invoice (OCR/Scan & Extraction)
app.post("/api/gemini/parse-invoice", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", textContent } = req.body;
    const ai = getGeminiClient();

    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType,
        },
      });
      parts.push({
        text: "Ekstrak seluruh informasi nota/faktur/resi percetakan ini menjadi data terstruktur JSON.",
      });
    } else if (textContent) {
      parts.push({
        text: `Ekstrak informasi dari teks nota berikut menjadi JSON terstruktur:\n${textContent}`,
      });
    } else {
      return res.status(400).json({ error: "Mohon sediakan gambar atau teks nota." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction:
          "Anda adalah asisten AI kasir/admin toko percetakan CTRL PRINT. Analisis berkas nota/faktur/kuitansi/struk atau pesan order dari pelanggan dan ekstrak detailnya secara akurat dalam Bahasa Indonesia.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING, description: "Nama pelanggan / pembeli" },
            customerPhone: { type: Type.STRING, description: "Nomor WhatsApp / telepon pelanggan" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Nama produk/layanan cetak (misal: Banner Flexi 280, Brosur A4)" },
                  qty: { type: Type.NUMBER, description: "Jumlah/kuantitas item" },
                  price: { type: Type.NUMBER, description: "Harga satuan dalam Rupiah" },
                  subtotal: { type: Type.NUMBER, description: "Total harga item (qty x price)" },
                  note: { type: Type.STRING, description: "Catatan atau spesifikasi ukuran/finishing" },
                },
                required: ["title", "qty", "price"],
              },
            },
            dp: { type: Type.NUMBER, description: "Jumlah Uang Muka (DP) yang dibayar jika ada" },
            grandTotal: { type: Type.NUMBER, description: "Grand total harga nota" },
            isLunas: { type: Type.BOOLEAN, description: "Apakah status nota sudah lunas" },
            paymentMethod: { type: Type.STRING, description: "Metode pembayaran (Transfer, Cash, QRIS, BCA, dll)" },
            notes: { type: Type.STRING, description: "Catatan tambahan nota jika ada" },
          },
          required: ["customerName", "items", "grandTotal"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error parsing invoice with Gemini:", error);
    return res.status(500).json({ error: error.message || "Gagal memproses nota dengan AI." });
  }
});

// 2. AI Generator Pesan WhatsApp Pelanggan
app.post("/api/gemini/generate-wa", async (req, res) => {
  try {
    const { invoice, type = "order_created", customNote = "", bankInfo = "", qrisNms = "" } = req.body;
    const ai = getGeminiClient();

    const prompt = `Buatkan draf pesan WhatsApp yang sopan, ramah, dan profesional dari Toko Percetakan "CTRL PRINT" untuk pelanggan.
Detail Nota:
- No Invoice: ${invoice?.noInv || "-"}
- Nama Pelanggan: ${invoice?.namaCust || invoice?.customerName || "Pelanggan"}
- Status Pembayaran: ${(invoice?.sisaTertagih || 0) <= 0 ? "LUNAS" : "BELUM LUNAS"}
- Sisa Belum Dibayar: Rp ${(invoice?.sisaTertagih || 0).toLocaleString("id-ID")}
- Total Nota: Rp ${(invoice?.grandTotal || 0).toLocaleString("id-ID")}
- Jenis Pesan: ${type} (pilihan: order_created [Konfirmasi Nota] / payment_reminder [Tagihan & DP] / design_acc [Proofing/ACC Desain] / shipping [Pengiriman & No Resi] / thank_you [Ucapan Terima Kasih])
- Info Rekening / Bank: ${bankInfo || "Transfer Bank / QRIS Statis CTRL PRINT"}
- Merchant QRIS: ${qrisNms || "CTRL PRINT OFFICIAL (0% Biaya Admin)"}
- Catatan Tambahan: ${customNote}

Persyaratan pesan:
1. Gunakan Bahasa Indonesia yang hangat, sopan, dan rapi dengan emoji yang relevan.
2. Jika jenis pesan adalah design_acc (Proofing Desain), minta pelanggan mengecek ejaan, warna, & ukuran gambar proof, lalu minta konfirmasi 'ACC DESAIN' untuk dikirim ke mesin/vendor cetak.
3. Jika jenis pesan adalah shipping (Pengiriman), infokan bahwa barang cetakan sudah selesai diproduksi dan sedang dikirim via kurir/ekspedisi (sertakan nomor resi/driver jika ada di Catatan Tambahan).
4. Jika jenis pesan adalah payment_reminder (Pengingat Tagihan/DP) atau order_created, cantumkan petunjuk pembayaran transfer/QRIS Statis Toko tanpa biaya admin dan sisa tagihan.
5. Jangan sertakan placeholder bracket []; berikan teks siap kirim langsung!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return res.json({ success: true, message: response.text });
  } catch (error: any) {
    console.error("Error generating WA message:", error);
    return res.status(500).json({ error: error.message || "Gagal membuat pesan WhatsApp AI." });
  }
});

// 3. AI Deskripsi & Spesifikasi Produk Cetak
app.post("/api/gemini/suggest-description", async (req, res) => {
  try {
    const { title, category } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Berikan saran spesifikasi teknis cetak standar, spesifikasi bahan (paper/flexi/sticker), finishing rekomendasi, dan perkiraan harga pasaran percetakan di Indonesia untuk item berikut:
Nama Produk: "${title}"
Kategori: "${category || "Umum"}"`,
      config: {
        systemInstruction:
          "Anda adalah spesialis produksi dan estimator percetakan berpengalaman di Indonesia. Berikan rekomendasi spesifikasi teknis singkat, praktis, dan harga acuan yang pas untuk item transaksi.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedDescription: { type: Type.STRING, description: "Draf deskripsi/spesifikasi item lengkap (bahan, ukuran, finishing)" },
            recommendedPrice: { type: Type.NUMBER, description: "Rekomendasi harga satuan standar (Rupiah)" },
            unitName: { type: Type.STRING, description: "Satuan (pcs, lembar, m2, box, pack, set)" },
            materials: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opsi pilihan bahan baku populer" },
            finishings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Opsi finishing (Laminasi Doff/Glossy, Mata Ayam, Potong Pas, Lipat, dll)" },
          },
          required: ["suggestedDescription", "recommendedPrice", "unitName"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error suggesting item description:", error);
    return res.status(500).json({ error: error.message || "Gagal menghasilkan saran deskripsi." });
  }
});

// 4. AI Analisis Bisnis & Replikasi Strategi Percetakan
app.post("/api/gemini/business-insights", async (req, res) => {
  try {
    const { summary, recentInvoicesCount = 0 } = req.body;
    const ai = getGeminiClient();

    const prompt = `Analisis performa bisnis percetakan CTRL PRINT berdasarkan data saat ini:
- Total Omzet: Rp ${(summary?.totalOmset || 0).toLocaleString("id-ID")}
- Total Piutang (Belum Dibayar): Rp ${(summary?.totalPiutang || 0).toLocaleString("id-ID")}
- Total Pengeluaran: Rp ${(summary?.totalPengeluaran || 0).toLocaleString("id-ID")}
- Estimasi Profit Bersih: Rp ${(summary?.profitBersih || 0).toLocaleString("id-ID")}
- Jumlah Transaksi Nota: ${recentInvoicesCount}

Berikan analisis performa bisnis yang tajam, saran tindakan strategis untuk meningkatkan arus kas (cashflow), tips penagihan piutang, dan rekomendasi item/promosi percetakan yang menguntungkan.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER, description: "Skor kesehatan bisnis (1 - 100)" },
            headline: { type: Type.STRING, description: "Kesimpulan ringkas 1 kalimat kondisi bisnis" },
            insights: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 poin analisis finansial & operasional" },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 langkah aksi langsung yang direkomendasikan" },
            promotionalIdeas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 ide promo/paket hemat cetak untuk menggenjot penjualan" },
          },
          required: ["healthScore", "headline", "insights", "recommendations"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error analyzing business insights:", error);
    return res.status(500).json({ error: error.message || "Gagal menganalisis data bisnis." });
  }
});

// 5. AI Asisten Chat & Konsultasi Percetakan
app.post("/api/gemini/assistant-chat", async (req, res) => {
  try {
    const { messages = [], contextData = {} } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `Anda adalah "CTRL AI Assistant", asisten pintar khusus pemilik toko percetakan & digital printing.
Anda memiliki akses ke ringkasan data usaha real-time berikut:
- Omzet Total: Rp ${(contextData.totalOmset || 0).toLocaleString("id-ID")}
- Belum Dibayar (Piutang): Rp ${(contextData.totalPiutang || 0).toLocaleString("id-ID")}
- Pengeluaran: Rp ${(contextData.totalPengeluaran || 0).toLocaleString("id-ID")}
- Estimasi Laba Bersih: Rp ${(contextData.profitBersih || 0).toLocaleString("id-ID")}

Tugas Anda:
1. Menjawab pertanyaan pengguna seputar bisnis percetakan, manajemen nota, perhitungan profit, pilihan bahan/mesin cetak, hingga strategi pemasaran.
2. Menjawab pertanyaan seputar data keuangan usaha dengan ramah, profesional, serta memberikan solusi konkret.
3. Selalu menjawab dalam Bahasa Indonesia yang ramah, ringkas, dan jelas.`;

    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: { systemInstruction },
    });

    return res.json({ success: true, message: response.text });
  } catch (error: any) {
    console.error("Error in assistant chat:", error);
    return res.status(500).json({ error: error.message || "Gagal menjawab pertanyaan AI." });
  }
});

// 6. AI Generator Caption & Konten Promosi Medsos
app.post("/api/gemini/generate-marketing-caption", async (req, res) => {
  try {
    const { productName, platform = "Instagram", tone = "Promosional / Diskon", targetAudience = "UMKM & Umum", promoDetails = "" } = req.body;
    const ai = getGeminiClient();

    const prompt = `Buatkan draf konten promosi media sosial untuk toko percetakan "CTRL PRINT".
Detail Input:
- Produk Cetak / Layanan: ${productName}
- Platform Target: ${platform}
- Gaya / Tone Bicara: ${tone}
- Target Pembeli: ${targetAudience}
- Detail Promo / Harga Khusus / Catatan: ${promoDetails || "Tanpa promo khusus"}

Buatkan dalam bentuk JSON terstruktur yang menarik dan ramah pengguna dengan skema berikut:
1. hook: Kalimat judul pengait pertama yang membuat orang berhenti scroll (punchy & catchy).
2. caption: Teks utama caption yang rapi, dengan baris baru dan emoji yang estetik, menjelaskan keunggulan bahan cetak, kerapian, kecepatan pengerjaan, dan Call-to-Action (CTA) pemesanan via WA.
3. hashtags: Array string 8-12 hashtag populer untuk bisnis cetak di Indonesia (contoh: #PercetakanOnline, #CetakBanner, dll).
4. visualIdea: Ide foto / video Reels / TikTok singkat yang disarankan untuk diambil dari workshop percetakan.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah Digital Content Marketer & Copywriter ahli khusus bisnis percetakan dan media promosi di Indonesia.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING, description: "Judul pengait utama" },
            caption: { type: Type.STRING, description: "Teks lengkap caption medsos" },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar hashtag relevan" },
            visualIdea: { type: Type.STRING, description: "Ide visual foto / video Reels" },
          },
          required: ["hook", "caption", "hashtags", "visualIdea"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Error generating marketing caption:", error);
    return res.status(500).json({ error: error.message || "Gagal membuat caption promosi AI." });
  }
});

// 7. Google Drive Direct Automatic File Sync & Storage API
app.post("/api/drive/create-folder", async (req, res) => {
  try {
    const { invoiceNo = "INV/NEW", customerName = "Pelanggan" } = req.body;
    const cleanInvCode = String(invoiceNo).replace(/[^a-zA-Z0-9_-]/g, "_");
    const folderName = `[CTRLPRINT] Faktur #${invoiceNo} - ${customerName}`;

    // Get OAuth token if available from env or headers
    const oauthToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN || req.headers.authorization?.replace("Bearer ", "");

    if (oauthToken) {
      try {
        const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${oauthToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: "application/vnd.google-apps.folder"
          })
        });

        if (createRes.ok) {
          const folderData = await createRes.json();
          const folderId = folderData.id;

          // Set public view permissions on the folder
          await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${oauthToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              role: "reader",
              type: "anyone"
            })
          });

          const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

          return res.json({
            success: true,
            folderId,
            folderName,
            folderUrl,
            message: `Folder Google Drive '${folderName}' berhasil dibuat secara otomatis!`
          });
        }
      } catch (err) {
        console.warn("Error calling Google Drive API directly, using fallback link structure:", err);
      }
    }

    // Dedicated fallback folder link (opens Google Drive search for folder name so it never 404s)
    const fallbackFolderUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(folderName)}`;

    return res.json({
      success: true,
      folderId: `search_${cleanInvCode}`,
      folderName,
      folderUrl: fallbackFolderUrl,
      message: `Google Drive disiapkan untuk #${invoiceNo}. Klik untuk membuka Penjelajah Drive.`
    });
  } catch (error: any) {
    console.error("Error creating Google Drive folder:", error);
    return res.status(500).json({ error: error.message || "Gagal membuat folder Google Drive." });
  }
});

app.post("/api/drive/upload", async (req, res) => {
  return res.status(400).json({
    error: "Pengunggahan file menggunakan integrasi langsung Google Drive API tanpa Base64. Harap gunakan uploadFileSmart atau GoogleDriveBrowseUpload."
  });
});

// Email Open Tracking In-Memory Event Cache
const emailOpenEvents = new Map<string, { logId: string; openedAt: string; ip: string; userAgent: string }>();

// Tracking Pixel 1x1 GIF
const TRANSPARENT_GIF_1X1 = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

app.get("/api/email/track-open/:logId", (req, res) => {
  const { logId } = req.params;
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";

  if (logId) {
    emailOpenEvents.set(logId, {
      logId,
      openedAt: new Date().toISOString(),
      ip: typeof ip === "string" ? ip.split(",")[0].trim() : "",
      userAgent: typeof userAgent === "string" ? userAgent : ""
    });
    console.log(`[Email Tracker] Email ${logId} opened by recipient (IP: ${ip})`);
  }

  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.end(TRANSPARENT_GIF_1X1);
});

app.get("/api/email/open-events", (req, res) => {
  const events = Array.from(emailOpenEvents.values());
  return res.json({ success: true, events });
});

app.delete("/api/email/open-events/:logId", (req, res) => {
  const { logId } = req.params;
  emailOpenEvents.delete(logId);
  return res.json({ success: true });
});

// Serve frontend assets via Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      path.join(process.cwd(), "dist"),
      path.resolve(__dirname),
      path.resolve(__dirname, "dist"),
      path.resolve(__dirname, "../dist"),
    ];
    const distPath =
      possibleDistPaths.find((p) => fs.existsSync(path.join(p, "index.html"))) ||
      path.join(process.cwd(), "dist");

    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        return res.status(500).send("Application dist files not found. Please ensure build completed.");
      }
      try {
        let html = fs.readFileSync(indexPath, "utf-8");
        const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
        const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
        if (host) {
          const baseUrl = `${protocol}://${host}`;
          html = html.replace(
            /https:\/\/ctrl-print-sales-vendor-system-195509372761\.us-west1\.run\.app\/logo\.jpg\?v=2/g,
            `${baseUrl}/logo.jpg?v=2`
          );
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
      } catch (err) {
        return res.sendFile(indexPath);
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("Shutting down server gracefully...");
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

startServer();
