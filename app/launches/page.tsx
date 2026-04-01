// app/launches/page.tsx
import Link from 'next/link';
import LaunchList from '@/components/sections/LaunchList';
import { ChevronLeft } from 'lucide-react';
import LightPillar from '@/components/LightPillar'; 

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
    <div className="relative min-h-screen bg-black py-16 overflow-hidden">
      
      {/* BACKGROUND: Fixed position, full screen, behind content */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-80">
        <LightPillar
          topColor="#ffffff"
          bottomColor="#949494"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      {/* FOREGROUND CONTENT: Relative position to sit above the background */}
      <div className="relative z-10">
        <div className="fixed top-4 left-4 md:top-12 md:left-12 z-50">
          <Link
            href="/"
            className="group flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/10 p-3 transition-all hover:bg-white hover:text-black"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="max-w-8xl mx-auto mt-10 px-8 md:px-12">
          <LaunchList initialLaunches={launches} />
        </div>
      </div>
      
    </div>
  );
}