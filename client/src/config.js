// Configuration file that reads environment variables at build time
// This allows using env vars without VITE_ prefix
// eslint-disable-next-line no-undef
const config = {
    // eslint-disable-next-line no-undef
    apiUrl: process.env.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
    supabase: {
        // eslint-disable-next-line no-undef
        url: process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
        // eslint-disable-next-line no-undef
        anonKey: process.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }
};

export default config;
