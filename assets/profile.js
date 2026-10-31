/* 用户资料：显示名与头像都存在 Supabase Auth 的 user_metadata 里，不用建表。 */
(function () {
  function of(user) {
    const meta = (user && user.user_metadata) || {};
    const fallback = ((user && user.email) || '').split('@')[0] || '某人';
    return {
      name: (meta.display_name || '').trim() || fallback,
      avatar: (meta.avatar_url || '').trim()
    };
  }

  function initial(user) {
    const n = of(user).name;
    return (n[0] || '?').toUpperCase();
  }

  async function current() {
    if (!window.sb) return null;
    const { data } = await window.sb.auth.getSession();
    return data && data.session ? of(data.session.user) : null;
  }

  window.Profile = { of, initial, current };
})();
