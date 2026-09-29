/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 29 ก.ย. 69: ได้โดเมน watchlist.onthebridge.in.th แล้ว — ลิงก์เก่าที่แชร์ไว้เป็น
  // onthebridge-playlist.vercel.app ให้เด้งไปโดเมนใหม่ (308 ถาวร) แต่ preview
  // deployment (onthebridge-playlist-xxxxx.vercel.app) ไม่โดนกระทบ เพราะ match
  // เฉพาะ host ที่เป็น alias หลักเป๊ะๆ เท่านั้น
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'onthebridge-playlist.vercel.app' }],
        destination: 'https://watchlist.onthebridge.in.th/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
