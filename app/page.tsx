import { getUpcomingLaunches, fetchUpcomingLaunches } from "@/app/lib/services/launchService";
import { ensureFreshArticles, getLatestArticles } from "@/app/lib/services/articleService";
import { getApod, type Apod } from "@/app/lib/services/nasaService";
import AppHeader from "@/components/sections/AppHeader";
import LandingClientView from "@/components/sections/LandingClientView";

// Render on every request rather than serving a 60s-stale ISR snapshot.
// The underlying data layer still has its own freshness gates (ensureFreshLaunches
// = 1h, ensureFreshArticles = 1h, getApod = Next.js fetch cache), so this only
// re-renders the page — it doesn't blast TSD/SNAPI on every visit.
export const dynamic = 'force-dynamic';

async function getLatestLaunch() {
  try {
    let launches = await getUpcomingLaunches(1);
    if (!launches || launches.length === 0) {
      await fetchUpcomingLaunches();
      launches = await getUpcomingLaunches(1);
    }
    return launches[0] || null;
  } catch (error) {
    console.error('Failed to fetch launch:', error);
    return null;
  }
}

async function getHomepageArticle() {
  try {
    await ensureFreshArticles();
    const articles = await getLatestArticles(1);
    return articles[0] || null;
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return null;
  }
}

export default async function Home() {
  const [launch, article, apod] = await Promise.all([
    getLatestLaunch(),
    getHomepageArticle(),
    getApod(),
  ]);

  const safeLaunch = launch ? JSON.parse(JSON.stringify(launch)) : null;
  const safeArticle = article ? JSON.parse(JSON.stringify(article)) : null;
  const safeApod = apod ? JSON.parse(JSON.stringify(apod)) : null;

  return (
    <div className="min-h-screen w-full bg-black text-white selection:bg-[#FF6B35] selection:text-black flex flex-col">
      <AppHeader />
      <main className="flex-1 w-full flex flex-col">
        <LandingClientView apod={safeApod} launch={safeLaunch} article={safeArticle} />
      </main>
    </div>
  );
}
