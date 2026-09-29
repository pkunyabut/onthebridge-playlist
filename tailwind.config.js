/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Noto Sans Thai"', 'sans-serif'],
      },
      // T5 (29 ก.ย. 69): brand/cinema/imdb เดิมเป็นสีอำพัน/เทาเข้มทั่วไป ไม่ผูกกับแบรนด์ OnTheBridge
      // แก้ให้ไล่เฉดมาจากสีแบรนด์ที่เดียว: navy #0E2439 (H209°) · ทอง #C9A227 (H46°)
      // — brand.500 = ทองแบรนด์เป๊ะ, cinema.900 ≈ --cinema-bg ใน globals.css, imdb.yellow = ทองแบรนด์เดียวกัน (เลิกใช้เหลือง IMDb เดิม)
      colors: {
        brand: {
          50: '#fcf8ee',
          100: '#f7eed4',
          200: '#eedeaa',
          300: '#e4ca76',
          400: '#dcb94c',
          500: '#c9a227',
          600: '#ab8a21',
          700: '#896e1b',
          800: '#6f5a16',
          900: '#554511',
        },
        cinema: {
          950: '#03090f',
          900: '#050e17',
          800: '#081726',
          700: '#0d243a',
          600: '#12314f',
          500: '#163e64',
        },
        imdb: {
          yellow: '#c9a227',
          dark: '#081726',
        },
      },
      boxShadow: {
        'gold': '0 4px 20px -2px rgba(201, 162, 39, 0.25)',
        'gold-lg': '0 8px 32px -4px rgba(201, 162, 39, 0.35)',
        'cinema': '0 4px 24px -2px rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(201, 162, 39, 0.15)',
        'imdb-hover': '0 12px 40px -8px rgba(201, 162, 39, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
