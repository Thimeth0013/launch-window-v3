// app/loading.tsx (Special Next.js file - automatically wraps routes in Suspense)
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="font-mono text-[#18BBF7] text-sm uppercase tracking-[0.5em] animate-pulse">
          Syncing Launches
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-[#FF6B35] animate-bounce" />
          <div className="w-3 h-3 bg-[#18BBF7] animate-bounce [animation-delay:150ms]" />
          <div className="w-3 h-3 bg-[#FF6B35] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}