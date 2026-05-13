import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/db/mongodb';
import Article from '../../../lib/db/models/Article';

export const revalidate = 1800;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const articleId = parseInt(id, 10);

    if (Number.isNaN(articleId)) {
      return NextResponse.json({ message: 'Invalid article id' }, { status: 400 });
    }

    const article = await Article.findOne({ id: articleId }).select('-_id').lean();

    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('❌ [ARTICLE_DETAIL_ERROR]:', error);
    return NextResponse.json(
      { message: 'Error fetching article', error: error.message },
      { status: 500 }
    );
  }
}
