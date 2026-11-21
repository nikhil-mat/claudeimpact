import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F7F8FA',
          muted: '#EBEDF0',
        },
        ink: {
          DEFAULT: '#1A1D21',
          light: '#5E6368',
          faint: '#8C9196',
        },
        accent: {
          citizen: '#1565C0',
          ward: '#2E7D32',
          corporator: '#0D3B66',
        },
        flag: '#C4320A',
        positive: '#2E7D32',
        progress: '#D4760A',
        info: '#1565C0',
        edge: {
          DEFAULT: '#DDE1E6',
          focus: '#1565C0',
        },
        overdue: '#FFF3E0',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
