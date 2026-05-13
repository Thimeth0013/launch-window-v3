import axios from 'axios';
import connectDB from '../db/mongodb';
import Article from '../db/models/Article';
import ArticleSync from '../db/models/ArticleSync';

const SNAPI_BASE = 'https://api.spaceflightnewsapi.net/v4';
const ARTICLE_SYNC_TTL_MS = 60 * 60 * 1000;
const ARTICLE_FETCH_LIMIT = 25;

interface ApiArticle {
  id: number;
  title: string;
  authors?: Array<{ name?: string; socials?: Record<string, string> }>;
  url?: string;
  image_url?: string;
  news_site?: string;
  summary?: string;
  published_at: string;
  updated_at?: string;
  featured?: boolean;
  launches?: Array<{ launch_id?: string; provider?: string }>;
  events?: Array<{ event_id?: number; provider?: string }>;
}

const fetchWithRetry = async (url: string, config: any, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error: any) {
      lastError = error;
      if (error.response?.status >= 400 && error.response?.status < 500) throw error;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
};

export const fetchLatestArticles = async () => {
  await connectDB();

  console.log('📰 [ARTICLE_SYNC] Fetching articles from SNAPI v4...');

  const response = await fetchWithRetry(
    `${SNAPI_BASE}/articles/`,
    {
      params: {
        limit: ARTICLE_FETCH_LIMIT,
        ordering: '-published_at',
      },
      timeout: 30000,
    }
  );

  const apiArticles: ApiArticle[] = response.data.results || [];
  console.log(`📰 [ARTICLE_SYNC] Processing ${apiArticles.length} articles...`);

  for (const apiArticle of apiArticles) {
    try {
      await Article.findOneAndUpdate(
        { id: apiArticle.id },
        {
          ...apiArticle,
          published_at: new Date(apiArticle.published_at),
          updated_at: apiArticle.updated_at ? new Date(apiArticle.updated_at) : null,
        },
        { upsert: true, new: true }
      );
    } catch (error: any) {
      console.error(`❌ [ARTICLE_ERROR] Failed to save article ${apiArticle.id}: ${error.message}`);
    }
  }

  console.log(`✅ [ARTICLE_SYNC] Completed processing ${apiArticles.length} articles`);
  return apiArticles;
};

// Lazy hourly sync gate — mirrors ensureFreshLaunches.
// Failures are swallowed so a flaky SNAPI never 500s a page. The sync timestamp
// is advanced even on failure so a 429 enforces a real 1h cool-down instead of
// every page request hammering the upstream API.
export const ensureFreshArticles = async () => {
  await connectDB();
  const now = new Date();
  const sync = await ArticleSync.findOne({ syncId: 'GLOBAL_ARTICLE_SYNC' });

  if (sync && now.getTime() - new Date(sync.lastUpdated).getTime() <= ARTICLE_SYNC_TTL_MS) {
    return;
  }

  console.log('⏱️ [ARTICLE_LAZY_SYNC] Article sync stale. Refreshing...');
  let syncOk = false;
  try {
    await fetchLatestArticles();
    syncOk = true;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 429) {
      console.warn('⚠️ [ARTICLE_SYNC] SNAPI rate-limited (429). Backing off 1h.');
    } else {
      console.warn(`⚠️ [ARTICLE_SYNC] Sync failed: ${error?.message || 'unknown'}. Serving cached data.`);
    }
  }

  await ArticleSync.findOneAndUpdate(
    { syncId: 'GLOBAL_ARTICLE_SYNC' },
    { lastUpdated: now },
    { upsert: true, new: true }
  );

  if (syncOk) {
    console.log(`✅ [ARTICLE_SYNC_COMPLETE] at ${now.toISOString()}`);
  }
};

export const getLatestArticles = async (limit = 25) => {
  await connectDB();
  const articles = await Article.find({})
    .sort({ published_at: -1 })
    .limit(limit)
    .select('-_id')
    .lean();
  return articles;
};

export const getArticleById = async (id: number) => {
  await connectDB();
  return Article.findOne({ id }).select('-_id').lean();
};
