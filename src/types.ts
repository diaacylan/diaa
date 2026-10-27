export interface CityRate {
  city_key: string;
  city_name: string;
  rate_type: string;
  rate: number;
}

export interface CurrentRatesResponse {
  id?: number;
  source_message_id?: number;
  rate_100_usd: number;
  sell: number;
  buy: number;
  gold21?: number;
  euro_usd?: number;
  gbp_usd?: number;
  market_time: string;
  is_valid?: number;
  created_at?: string;
  channel?: string;
  platform_message_id?: number;
  published_at?: string;
  warnings?: string[];
  cities: CityRate[];
  data_age_seconds?: number;
  source_label?: string;
  _cached?: boolean;
  _cachedAt?: number;
  _fallback?: boolean;
  _warning?: string;
}

export interface HistoryPoint {
  id?: number;
  rate_100_usd: number;
  sell: number;
  buy: number;
  gold21?: number;
  market_time: string;
}

export interface HistoryResponse {
  points: HistoryPoint[];
}

export interface ArticleItem {
  id: number;
  date: string;
  modified?: string;
  slug: string;
  link: string;
  title: string;
  excerpt_html?: string;
  content_html?: string;
  featured_media?: number;
}

export interface ArticlesResponse {
  articles: ArticleItem[];
}

export interface MetalRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export interface CurrencyRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export interface CryptoRate {
  id: string;
  symbol: string;
  name: string;
  nameAr: string;
  priceUsd: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  icon?: string;
}

export type TabType = 'home' | 'governorates' | 'calculator' | 'articles' | 'more' | 'history' | 'markets';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationSettings {
  enabled: boolean;
  priceAlerts: boolean;
  dailyBriefing: boolean;
  newArticles: boolean;
  fcmToken?: string;
  registeredAt?: string;
}
