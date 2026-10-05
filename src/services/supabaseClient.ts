import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd2Z5aGx6d2hhbHdhb2hsbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTkyMDAsImV4cCI6MjA3MDIzNTIwMH0.public_anon_key_placeholder';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
