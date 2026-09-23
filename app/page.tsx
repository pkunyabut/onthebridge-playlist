import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      icon: '🎬',
      title: 'ภาพยนตร์ & ซีส์',
      desc: 'บันทึกหนังและซีส์จาก Netflix, Disney+, HBO Max, Prime Video',
    },
    {
      icon: '🎵',
      title: 'เพลง',
      desc: 'จัดรายการเพลงจาก Spotify และ Apple Music',
    },
    {
      icon: '📺',
      title: 'สารคดี & ทอล์คโชว์',
      desc: 'เก็บสารคดีและทอล์คโชว์จาก YouTube และแพลตฟอร์มอื่นๆ',
    },
    {
      icon: '📋',
      title: 'จัดเป็นเพลย์ลิสต์',
      desc: 'สร้างเพลย์ลิสต์ตามอารมณ์ โรงหนัง หรือตามธีม',
    },
    {
      icon: '🤖',
      title: 'แนะนำด้วย AI',
      desc: 'AI วิเคราะห์รายการของคุณแล้วแนะนำเนื้อหาใหม่ๆ',
    },
    {
      icon: '📱',
      title: 'ใช้งานฟรี',
      desc: 'ไม่มีค่าใช้จ่าย ใช้งานได้ทุกแพลตฟอร์ม',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
              OnTheBridge Playlist
            </span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          จัดรายการ
          <span className="text-brand-600 dark:text-brand-400">ภาพยนตร์ ซีส์ สารคดี</span>
          <br />
          และเพลง ข้ามแพลตฟอร์ม
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          เก็บรายการที่อยากดูและฟังจากทุกแพลตฟอร์มไว้ในที่เดียว
          พร้อม AI ที่แนะนำรายการใหม่ๆ ตามรสนิยมของคุณ
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-brand-600/20"
          >
            เริ่มใช้งานฟรี
          </Link>
          <a
            href="#features"
            className="px-8 py-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-lg transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            ดูเพิ่มเติม
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          ฟีเจอร์ทั้งหมด
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section className="bg-brand-50 dark:bg-slate-800 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            รองรับทุกแพลตฟอร์ม
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            เก็บรายการจากแพลตฟอร์มยอดนิยม
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {['Netflix', 'Disney+', 'HBO Max', 'Prime Video', 'YouTube', 'Spotify', 'Apple Music'].map((platform) => (
              <span
                key={platform}
                className="px-4 py-2 bg-white dark:bg-slate-700 rounded-full text-gray-700 dark:text-gray-200 font-medium shadow-sm"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          เริ่มจัดรายการของคุณวันนี้
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          สมัครฟรี ไม่ต้องใช้บัตรเครดิต
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-brand-600/20"
        >
          สมัครใช้งานฟรี
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-slate-700 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>OnTheBridge Playlist © 2569</p>
          <p className="mt-1">สร้างด้วย ❤️ เพื่อคนไทยทุกคน</p>
        </div>
      </footer>
    </div>
  );
}
