import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../lib/db/mongodb';
import Article from '../../lib/db/models/Article';
import { ensureFreshArticles } from '../../lib/services/articleService';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    await ensureFreshArticles();
    await connectDB();

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '25', 10), 100);
    const featuredOnly = request.nextUrl.searchParams.get('featured') === 'true';

    const query: any = {};
    if (featuredOnly) query.featured = true;

    const articles = await Article.find(query)
      .sort({ published_at: -1 })
      .limit(limit)
      .select('-_id')
      .lean();

    return NextResponse.json(articles, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Article-Count': articles.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ [ARTICLES_ROUTE_ERROR]:', error.message);
    try {
      await connectDB();
      const fallback = await Article.find({})
        .sort({ published_at: -1 })
        .limit(25)
        .select('-_id')
        .lean();
      return NextResponse.json(fallback, {
        status: 200,
        headers: { 'X-Cache-Fallback': 'true' },
      });
    } catch (dbError: any) {
      return NextResponse.json(
        { message: 'Failed to fetch articles', error: dbError.message },
        { status: 500 }
      );
    }
  }
}
