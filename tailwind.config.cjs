/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        afghan: {
          ink: '#12100c',
          green: '#174c2e',
          gold: '#c9962f',
          sand: '#f4efe4',
          clay: '#a85f32',
          sky: '#e8f4f8'
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 50px rgba(18, 16, 12, 0.12)'
      }
    }
  },
  plugins: []
};
