/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Trust Blue) - darker shades
        primary: {
          DEFAULT: '#3B6AE6', // Slightly lighter for better contrast on dark
          hover: '#5B82F5',
          soft: '#1E3A8A', // Dark blue background
        },
        // Secondary (Property Green) - darker shades
        success: {
          DEFAULT: '#10B981', // Slightly lighter for contrast
          soft: '#064E3B', // Dark green background
        },
        // Neutrals - inverted for dark theme
        text: {
          DEFAULT: '#F1F5F9', // Light text on dark background
          muted: '#94A3B8', // Lighter muted text
        },
        border: {
          DEFAULT: '#475569', // Darker borders
        },
        bg: {
          DEFAULT: '#0F172A', // Dark background (slate-900)
        },
        surface: {
          DEFAULT: '#1E293B', // Dark surface (slate-800)
        },
        // Status - adjusted for dark theme
        warning: {
          DEFAULT: '#F59E0B',
        },
        error: {
          DEFAULT: '#EF4444', // Slightly brighter red for dark theme
        },
        info: {
          DEFAULT: '#3B82F6', // Slightly brighter blue
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-inter)', 'ui-monospace', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              '&:hover': {
                color: '#3B6AE6',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
