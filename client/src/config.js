// Configuration file for environment variables
const config = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || '',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }
};

export default config;
