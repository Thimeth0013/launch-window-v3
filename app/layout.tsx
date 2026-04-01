// app/layout.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Launch Window",
  description: "Track upcoming space launches",
};

function LoadingFallback() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="font-mono text-[#18BBF7] text-sm uppercase tracking-[0.5em] animate-pulse">
          Syncing Mission Telemetry
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-[#FF6B35] rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-[#18BBF7] rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-3 h-3 bg-[#FF6B35] rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}