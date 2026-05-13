const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const APOD_CACHE_SECONDS = 60 * 60; // 1h — APOD changes once daily

export interface Apod {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version?: string;
  copyright?: string;
  thumbnail_url?: string;
}

// NASA APOD is fetched server-side with Next.js fetch caching. A failure (rate
// limit, network, key missing) returns null so the homepage can degrade
// gracefully without breaking the rest of the layout.
export async function getApod(): Promise<Apod | null> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  [APOD] NASA_API_KEY not set — skipping fetch');
    return null;
  }

  try {
    const res = await fetch(
      `${APOD_URL}?api_key=${apiKey}&thumbs=true`,
      { next: { revalidate: APOD_CACHE_SECONDS } }
    );

    if (!res.ok) {
      console.warn(`⚠️  [APOD] ${res.status} ${res.statusText}`);
      return null;
    }

    return (await res.json()) as Apod;
  } catch (err: any) {
    console.warn(`⚠️  [APOD] fetch failed: ${err?.message || 'unknown'}`);
    return null;
  }
}
