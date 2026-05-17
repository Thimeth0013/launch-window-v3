import AppHeader from '@/components/sections/AppHeader';
import ArticlesFeed from '@/components/sections/ArticlesFeed';
import Particles from '@/components/Particles';
import { ensureFreshArticles, getLatestArticles } from '@/app/lib/services/articleService';

export const revalidate = 600;

async function getArticles() {
  try {
    await ensureFreshArticles();
    return await getLatestArticles(25);
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return [];
  }
}

export default async function ArticlesPage() {
  const articles = (await getArticles()) as any;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-[#FF6B35] selection:text-black pb-24 overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles
          particleColors={["#ffffff"]}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover
          alphaParticles={true}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>
      <AppHeader />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">
        <ArticlesFeed articles={articles} />
      </div>
    </div>
  );
}
