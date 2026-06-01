/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#C8A882',
        background: '#FAF8F4',
        surface: '#FFFFFF',
        cream: '#F5F1EA',
        text: '#2A2520',
        subtext: '#7A7268',
        border: '#EDE7DD',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          'system-ui',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'sans-serif',
        ],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        label: '0.18em',
      },
      maxWidth: {
        mobile: '390px',
      },
      boxShadow: {
        nav: '0 -1px 12px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}

