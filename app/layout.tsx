import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';

export const metadata: Metadata = {
  title: 'OnTheBridge Watchlist',
  description: 'บันทึกหนัง ซีรีส์ สารคดี และเพลงที่อยากดู-อยากฟังไว้ในที่เดียว แล้วตามไปดูที่แพลตฟอร์มของแต่ละค่าย — ฟรี',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
