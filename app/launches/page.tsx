// app/launches/page.tsx
import LaunchList from '@/components/sections/LaunchList';
import Particles from '@/components/Particles';
import AppHeader from '@/components/sections/AppHeader';

export const revalidate = 60;

interface Launch {
  id: string;
  slug: string;
  name: string;
  date: string;
  status: { name: string; abbrev: string; };
  image?: { image_url: string; thumbnail_url: string; };
  launch_service_provider?: { name: string; logo?: { image_url: string; }; };
  pad?: { name: string; location?: { name: string; }; };
  mission?: { name: string; description: string; };
}

async function getLaunches(): Promise<Launch[]> {
  try {
    const connectDB = (await import('../lib/db/mongodb')).default;
    const LaunchModel = (await import('../lib/db/models/Launch')).default;
    const LaunchSync = (await import('../lib/db/models/LaunchSync')).default;
    const { fetchUpcomingLaunches } = await import('../lib/services/launchService');

    await connectDB();
    const ONE_HOUR = 60 * 60 * 1000;
    const GRACE_PERIOD = 6 * 60 * 60 * 1000;
    const LOOKBACK_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = new Date();

    let globalSync = await LaunchSync.findOne({ syncId: 'GLOBAL_LAUNCH_SYNC' });

    if (!globalSync || (now.getTime() - new Date(globalSync.lastUpdated).getTime()) > ONE_HOUR) {
      try {
        await fetchUpcomingLaunches();
        await LaunchSync.findOneAndUpdate(
          { syncId: 'GLOBAL_LAUNCH_SYNC' },
          { lastUpdated: now },
          { upsert: true }
        );
      } catch (e) { console.error('Sync failed', e); }
    }

    // Fetch both upcoming and recent past launches
    const lookbackThreshold = new Date(now.getTime() - LOOKBACK_PERIOD);

    const launches = await LaunchModel.find({
      date: { $gte: lookbackThreshold }
    })
      .sort({ date: 1 }) // Sort ascending - client will handle filtering
      .limit(100) // Increased limit to get more completed launches
      .select('-_id') // Exclude MongoDB _id
      .lean();

    return JSON.parse(JSON.stringify(launches)); // Ensure clean serialization
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

export default async function LaunchesPage() {
  const launches = await getLaunches();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">

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

      {/* FOREGROUND CONTENT: Relative position to sit above the background */}
      <div className="relative z-10">
        <div className="max-w-8xl mx-auto py-12 md:py-16 px-8 md:px-12">
          <LaunchList initialLaunches={launches} />
        </div>
      </div>

    </div>
  );
}