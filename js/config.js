// DEV = true  → Test-Datenbank
// DEV = false → Produktiv-Datenbank
const DEV = false;

const SUPABASE_URL = DEV
  ? 'https://dgegpbiaxrcievgfmguf.supabase.co'
  : 'https://dxoxeiaxudvvngobicfq.supabase.co';

const SUPABASE_ANON_KEY = DEV
  ? 'sb_publishable_-Z9drAFUWspxwYoWHEumAg_EX2HQUk5'
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4b3hlaWF4dWR2dm5nb2JpY2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODk0MDUsImV4cCI6MjA5MTU2NTQwNX0.m4DpOnaEJSLCM6UUmWo4qaU9Un2xSVXEJXJ_JMyfEa8';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: window.sessionStorage }
});