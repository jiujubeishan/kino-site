/* Supabase 客户端初始化。key 是 publishable/anon，公开可见是设计如此，权限靠 RLS 管。 */
(function () {
  const SUPABASE_URL = 'https://hpzdkraybjuiwjbbtqbm.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwemRrcmF5Ymp1aXdqYmJ0cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NTgyODQsImV4cCI6MjEwOTAzNDI4NH0.v4PS0xySnSkYLEUav_8XuM28rUcA7nNxemJchXnZ2BY';

  if (!window.supabase || !window.supabase.createClient) {
    window.sb = null;
    return;
  }
  try {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } catch (e) {
    window.sb = null;
  }
})();
