import AppHeader from '@/components/sections/AppHeader';
import Particles from '@/components/Particles';
import { getStarshipDashboard } from '@/app/lib/services/starshipService';
import StarshipClientView from './StarshipClientView';

export const revalidate = 600;

export default async function StarshipPage() {
  const data = await getStarshipDashboard();

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-[#FF6B35] selection:text-black pb-24 overflow-clip">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles
          particleColors={['#ffffff']}
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

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-24 md:pt-32">
        {!data ? (
          <div className="flex items-center justify-center py-40 border border-dashed border-zinc-900 bg-[#050505]">
            <p className="font-mono text-sm text-zinc-600 uppercase tracking-[0.3em]">
              Telemetry unavailable
            </p>
          </div>
        ) : (
          <StarshipClientView data={data} />
        )}
      </div>
    </div>
  );
}
