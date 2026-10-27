import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Enable Permissive CORS for native APK, WebViews, and cross-origin clients
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// In-memory cache for API resilience
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh cache

// Registered FCM Push Tokens store
const registeredPushTokens: Array<{
  token: string;
  platform: string;
  registeredAt: string;
  topics?: string[];
}> = [];

// Fallback data when external upstream is unreachable
const fallbackCurrentRates = {
  id: 39,
  source_message_id: 102,
  rate_100_usd: 154050,
  sell: 154200,
  buy: 153800,
  gold21: 966000,
  euro_usd: 115.35,
  gbp_usd: 134.1,
  market_time: new Date().toISOString(),
  is_valid: 1,
  created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  channel: "dollariraqi",
  platform_message_id: 6403,
  published_at: new Date().toISOString(),
  warnings: [],
  cities: [
    { city_key: "baghdad", city_name: "بغداد", rate_type: "offer", rate: 154050 },
    { city_key: "erbil", city_name: "أربيل", rate_type: "offer", rate: 153900 },
    { city_key: "sulaymaniyah", city_name: "السليمانية", rate_type: "offer", rate: 154000 },
    { city_key: "karbala", city_name: "كربلاء", rate_type: "offer", rate: 154150 },
    { city_key: "najaf", city_name: "النجف", rate_type: "offer", rate: 154150 },
    { city_key: "basra", city_name: "البصرة", rate_type: "offer", rate: 154100 },
    { city_key: "kirkuk", city_name: "كركوك", rate_type: "offer", rate: 154100 },
    { city_key: "mosul", city_name: "الموصل", rate_type: "offer", rate: 154100 },
    { city_key: "duhok", city_name: "دهوك", rate_type: "offer", rate: 153950 }
  ],
  data_age_seconds: 120,
  source_label: "دولار عراق دوت كوم (dolariraq.com)"
};

async function fetchWithRetry(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Android; Mobile; rv:109.0) Gecko/109.0 DolarIraqNativeApp/2.0",
        "Accept": "application/json",
      },
    });
    clearTimeout(id);
    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Proxy API Routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Dolar Iraq API Gateway",
    time: new Date().toISOString(),
    registeredTokensCount: registeredPushTokens.length
  });
});

// Proxy for rates/current
app.get("/api/proxy/rates/current", async (_req, res) => {
  const cacheKey = "rates_current";
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    return res.json({ ...cache[cacheKey].data, _cached: true, _cachedAt: cache[cacheKey].timestamp });
  }

  try {
    const data = await fetchWithRetry("https://dolariraq.com/api/v2/rates/current");
    cache[cacheKey] = { data, timestamp: now };
    res.json(data);
  } catch (err: any) {
    console.warn("Error fetching current rates from live API, using cached or fallback:", err.message);
    if (cache[cacheKey]) {
      return res.json({ ...cache[cacheKey].data, _fallback: true, _warning: "استجابة من الذاكرة المؤقتة" });
    }
    res.json({ ...fallbackCurrentRates, _fallback: true });
  }
});

// Proxy for rates/history
app.get("/api/proxy/rates/history", async (req, res) => {
  const limit = req.query.limit || "30";
  const cacheKey = `rates_history_${limit}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS * 5) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const data = await fetchWithRetry(`https://dolariraq.com/api/v2/rates/history?limit=${limit}`);
    cache[cacheKey] = { data, timestamp: now };
    res.json(data);
  } catch (err: any) {
    console.warn("Error fetching rates history:", err.message);
    if (cache[cacheKey]) return res.json(cache[cacheKey].data);
    res.status(502).json({ error: "تعذر جلب السجل التاريخي حالياً", points: [] });
  }
});

// Proxy for cities
app.get("/api/proxy/cities", async (_req, res) => {
  const cacheKey = "cities";
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const data = await fetchWithRetry("https://dolariraq.com/api/v2/cities");
    cache[cacheKey] = { data, timestamp: now };
    res.json(data);
  } catch (err: any) {
    console.warn("Error fetching cities:", err.message);
    if (cache[cacheKey]) return res.json(cache[cacheKey].data);
    res.json({
      market_time: new Date().toISOString(),
      cities: fallbackCurrentRates.cities
    });
  }
});

// Proxy for articles
app.get("/api/proxy/articles", async (req, res) => {
  const limit = req.query.limit || "20";
  const cacheKey = `articles_${limit}`;
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS * 10) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const data = await fetchWithRetry(`https://dolariraq.com/api/v2/articles?limit=${limit}`);
    cache[cacheKey] = { data, timestamp: now };
    res.json(data);
  } catch (err: any) {
    console.warn("Error fetching articles:", err.message);
    if (cache[cacheKey]) return res.json(cache[cacheKey].data);
    res.json({ articles: [] });
  }
});

// Proxy for metals/gold
app.get("/api/proxy/metals/gold", async (_req, res) => {
  try {
    const data = await fetchWithRetry("https://dolariraq.com/api/v2/metals/gold");
    res.json(data);
  } catch (err: any) {
    res.json([{ date: new Date().toISOString().slice(0, 10), base: "XAU", quote: "IQD", rate: 5955734 }]);
  }
});

// Proxy for metals/silver
app.get("/api/proxy/metals/silver", async (_req, res) => {
  try {
    const data = await fetchWithRetry("https://dolariraq.com/api/v2/metals/silver");
    res.json(data);
  } catch (err: any) {
    res.json([{ date: new Date().toISOString().slice(0, 10), base: "XAG", quote: "IQD", rate: 90097 }]);
  }
});

// Proxy for currencies
app.get("/api/proxy/currencies", async (_req, res) => {
  try {
    const data = await fetchWithRetry("https://dolariraq.com/api/v2/currencies");
    res.json(data);
  } catch (err: any) {
    res.json([
      { date: new Date().toISOString().slice(0, 10), base: "IQD", quote: "USD", rate: 0.00065 },
      { date: new Date().toISOString().slice(0, 10), base: "IQD", quote: "EUR", rate: 0.00066 },
      { date: new Date().toISOString().slice(0, 10), base: "IQD", quote: "GBP", rate: 0.00056 },
      { date: new Date().toISOString().slice(0, 10), base: "IQD", quote: "TRY", rate: 0.024 },
      { date: new Date().toISOString().slice(0, 10), base: "IQD", quote: "AED", rate: 0.0028 }
    ]);
  }
});

// Proxy for Crypto Prices (BTC, ETH, USDT, SOL, BNB, TON, XRP, etc.)
const defaultCryptoList = [
  { id: "tether", symbol: "USDT", name: "Tether USD", nameAr: "تيثر دولار (USDT)", priceUsd: 1.00, change24h: 0.05, high24h: 1.002, low24h: 0.998 },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", nameAr: "بيتكوين", priceUsd: 87450, change24h: 2.14, high24h: 88200, low24h: 85600 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", nameAr: "إيثيريوم", priceUsd: 2280, change24h: 1.65, high24h: 2320, low24h: 2210 },
  { id: "solana", symbol: "SOL", name: "Solana", nameAr: "سولانا", priceUsd: 148.5, change24h: 4.25, high24h: 152.0, low24h: 142.3 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", nameAr: "بينانس كوين", priceUsd: 625.8, change24h: 0.85, high24h: 635.0, low24h: 618.0 },
  { id: "toncoin", symbol: "TON", name: "Toncoin", nameAr: "تون كوين (تيليجرام)", priceUsd: 3.85, change24h: -1.2, high24h: 3.98, low24h: 3.75 },
  { id: "ripple", symbol: "XRP", name: "XRP", nameAr: "ريبل", priceUsd: 2.15, change24h: 3.12, high24h: 2.24, low24h: 2.05 },
  { id: "cardano", symbol: "ADA", name: "Cardano", nameAr: "كاردانو", priceUsd: 0.74, change24h: -0.45, high24h: 0.77, low24h: 0.72 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", nameAr: "دوجكوين", priceUsd: 0.22, change24h: 5.4, high24h: 0.24, low24h: 0.21 },
];

app.get(["/api/proxy/crypto", "/api/crypto"], async (_req, res) => {
  const cacheKey = "crypto_rates";
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < 30 * 1000) {
    return res.json(cache[cacheKey].data);
  }

  try {
    // Attempt fetching live 24hr tickers from public Binance API
    const symbolsParam = encodeURIComponent('["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","TONUSDT","XRPUSDT","ADAUSDT","DOGEUSDT"]');
    const tickers = await fetchWithRetry(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`, 4000);
    
    if (Array.isArray(tickers)) {
      const tickerMap: Record<string, { price: number; change: number; high: number; low: number }> = {};
      tickers.forEach((t: any) => {
        tickerMap[t.symbol] = {
          price: parseFloat(t.lastPrice) || 0,
          change: parseFloat(t.priceChangePercent) || 0,
          high: parseFloat(t.highPrice) || 0,
          low: parseFloat(t.lowPrice) || 0,
        };
      });

      const liveList = defaultCryptoList.map(item => {
        const pair = `${item.symbol}USDT`;
        if (tickerMap[pair]) {
          return {
            ...item,
            priceUsd: tickerMap[pair].price,
            change24h: tickerMap[pair].change,
            high24h: tickerMap[pair].high,
            low24h: tickerMap[pair].low,
          };
        }
        return item;
      });

      cache[cacheKey] = { data: liveList, timestamp: now };
      return res.json(liveList);
    }
  } catch (err: any) {
    console.warn("Crypto live fetch fallback:", err.message);
  }

  if (cache[cacheKey]) {
    return res.json(cache[cacheKey].data);
  }
  return res.json(defaultCryptoList);
});

// Implementation of the Android FCM Registration Endpoint required by the spec:
// POST /api/v2/mobile/push/register
app.post(["/api/v2/mobile/push/register", "/api/push/register"], (req, res) => {
  const { token, platform = "android", topics = ["price_alerts", "daily_briefing", "articles"] } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, error: "FCM token is required" });
  }

  const existingIndex = registeredPushTokens.findIndex((t) => t.token === token);
  if (existingIndex >= 0) {
    registeredPushTokens[existingIndex] = {
      token,
      platform,
      registeredAt: new Date().toISOString(),
      topics
    };
  } else {
    registeredPushTokens.push({
      token,
      platform,
      registeredAt: new Date().toISOString(),
      topics
    });
  }

  console.log(`[FCM] Registered token for platform ${platform}: ${token.slice(0, 15)}... (Total: ${registeredPushTokens.length})`);
  res.json({
    success: true,
    message: "تم تسجيل جهاز Android في خدمة إشعارات دولار العراق بنجاح",
    registeredCount: registeredPushTokens.length,
    registeredAt: new Date().toISOString(),
    topics
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dolar Iraq Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
