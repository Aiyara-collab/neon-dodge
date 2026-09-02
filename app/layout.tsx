import type { Metadata } from 'next';
import './globals.css';

export function generateMetadata(): Metadata {
  const title = 'Neon Dodge | หลบให้ทัน เก็บให้ไว';
  const description = 'เกมอาร์เคด 60 วินาที เลื่อนซ้ายขวา หลบสิ่งกีดขวาง และเก็บดาว เล่นได้ทั้งมือถือและคีย์บอร์ด';
  const origin = process.env.SITE_URL || 'http://localhost:3000';
  const image = new URL('/og.png', origin).toString();
  return {
    metadataBase: new URL(origin), title, description,
    icons: { icon: '/favicon.svg' },
    openGraph: { title, description, type: 'website', locale: 'th_TH', images: [{ url: image, width: 1731, height: 909, alt: 'NEON DODGE — DODGE. COLLECT. SURVIVE.' }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
