import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OnTheBridge Playlist',
  description: 'จัดรายการภาพยนตร์ ซีส์ สารคดี และเพลง ข้ามแพลตฟอร์ม — ฟรี',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
