// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import PageTransition from "@/components/PageTransition";
import AppFooter from "@/components/sections/AppFooter";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '700'],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: "Launch Window",
  description: "Track upcoming space launches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        inter.variable,
        spaceGrotesk.variable,
        jetbrainsMono.variable
      )}
    >
      <body>
        {/* `page-frame` is a stable wrapper that PageTransition animates
            during route changes. AppFooter sits inside it so the footer
            participates in the same transform as the rest of the page. */}
        <div id="page-frame" className="relative">
          {children}
          <AppFooter />
        </div>
        <PageTransition />
      </body>
    </html>
  );
}
