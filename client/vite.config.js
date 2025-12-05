import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // eslint-disable-next-line no-undef
    'process.env.API_URL': JSON.stringify(process.env.API_URL),
    // eslint-disable-next-line no-undef
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
    // eslint-disable-next-line no-undef
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
  }
})
