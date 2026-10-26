import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/content/site";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import "./globals.css";

const switzer = localFont({
  src: [
    { path: "../fonts/switzer-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/switzer-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-switzer",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/GeistMono-Regular.woff2",
  weight: "400",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  icons: {
    icon: [
      { url: "/favicon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${switzer.variable} ${geistMono.variable}`}>
      <body>
        <div className="site">
          <Nav />
          <main className="site-main">{children}</main>
          <div className="grow" />
          <Footer />
        </div>
      </body>
    </html>
  );
}
