// Configuration file that reads environment variables at build time
// This allows using env vars without VITE_ prefix

const config = {
    apiUrl: process.env.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
    supabase: {
        url: process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }
};

export default config;
