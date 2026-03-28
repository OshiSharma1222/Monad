/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:          '#080808',
        surface:     '#101010',
        border:      '#1c1c1c',
        'border-hi': '#2e2e2e',
        accent:      '#e02020',
        'accent-dim':'#280a0a',
        success:     '#18c964',
        'success-dim':'#061a0f',
        primary:     '#efefef',
        muted:       '#555555',
        'muted-hi':  '#888888',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', '"Courier New"', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.25' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.35' },
        },
        flashBg: {
          '0%':   { backgroundColor: '#061a0f' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        blink:    'blink 2s infinite',
        pulse:    'pulse 0.8s infinite',
        'blink-fast': 'blink 1.4s infinite',
        'flash-bg':   'flashBg 1.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
