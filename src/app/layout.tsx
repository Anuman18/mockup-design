import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Eventelligence | Event Layout Generator & AI Visualizer",
  description: "Create realistic event visualizations by combining pre-uploaded venue images, stage templates, and branding elements using AI image generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light scroll-smooth">
      <body className={`${inter.variable} ${outfit.variable} antialiased bg-slate-50 text-slate-800 min-h-screen selection:bg-violet-600 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
