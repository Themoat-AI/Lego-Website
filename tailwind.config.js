module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        lego: '0 18px 45px rgba(24, 67, 139, 0.18)'
      },
      colors: {
        brick: {
          50: '#f5f7ff',
          100: '#ebf1ff',
          200: '#d7e5ff',
          300: '#b8d0ff',
          400: '#8faefc',
          500: '#5f7ef2',
          600: '#3d5ed9',
          700: '#2a459d',
          800: '#1e2f6c',
          900: '#101f4d'
        }
      }
    }
  },
  plugins: []
};
