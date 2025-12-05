import { createClient } from '@supabase/supabase-js';
import config from '../config';

const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);
