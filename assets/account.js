/* 「我的」页：邮箱注册 / 登录 / 退出。靠 Supabase Auth，账号存在云端。 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function html() {
    return `
      <h1>我的</h1>
      <p class="lead">注册个号，笔记和记录就能跟着你走。</p>
      <div id="account-box"><div class="meta">正在检查登录状态…</div></div>
    `;
  }

  function renderLoggedOut(box, message) {
    box.innerHTML = `
      <section class="card auth-card">
        <div class="auth-tabs">
          <button class="tab on" data-mode="login">登录</button>
          <button class="tab" data-mode="signup">注册</button>
        </div>
        <form id="auth-form" class="auth-form">
          <label>邮箱 <input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label>
          <label>密码 <input type="password" name="password" autocomplete="current-password" required minlength="6" placeholder="至少 6 位"></label>
          <button class="primary" type="submit" id="auth-submit">登录</button>
        </form>
        <div class="out" id="auth-msg">${message ? esc(message) : ''}</div>
      </section>
    `;

    let mode = 'login';
    const form = $('#auth-form', box);
    const msg = $('#auth-msg', box);
    const submit = $('#auth-submit', box);

    box.querySelectorAll('.tab').forEach((tab) => {
      tab.onclick = () => {
        mode = tab.dataset.mode;
        box.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t === tab));
        submit.textContent = mode === 'login' ? '登录' : '注册';
        form.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
        msg.textContent = '';
      };
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;
      submit.disabled = true;
      submit.textContent = mode === 'login' ? '登录中…' : '注册中…';
      try {
        if (mode === 'login') {
          const { error } = await window.sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          msg.textContent = '登录成功，正在加载…';
        } else {
          const { data, error } = await window.sb.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin + location.pathname + '#/account' }
          });
          if (error) throw error;
          if (data.session) msg.textContent = '注册成功，已经登录。';
          else msg.textContent = '注册成功！去邮箱点确认链接，然后回来登录。';
        }
        if (mode === 'login') mount();
      } catch (err) {
        msg.textContent = '出错：' + (err.message || String(err));
      } finally {
        submit.disabled = false;
        submit.textContent = mode === 'login' ? '登录' : '注册';
      }
    };
  }

  function renderLoggedIn(box, session) {
    const u = session.user;
    const since = u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '—';
    box.innerHTML = `
      <section class="card auth-card">
        <div class="who">
          <div class="avatar">${esc((u.email || '?')[0].toUpperCase())}</div>
          <div>
            <div class="who-mail">${esc(u.email || '')}</div>
            <div class="meta">注册于 ${since}</div>
          </div>
        </div>
        <div class="tool-row">
          <button id="logout">退出登录</button>
        </div>
        <div class="out" id="auth-msg"></div>
      </section>
    `;
    $('#logout', box).onclick = async () => {
      await window.sb.auth.signOut();
      mount();
    };
  }

  async function mount() {
    const box = $('#account-box');
    if (!box) return;
    if (!window.sb) {
      box.innerHTML = '<section class="card"><p>Supabase 没加载成功，检查一下 assets/sb.js 和网络。</p></section>';
      return;
    }
    const { data, error } = await window.sb.auth.getSession();
    if (error) {
      box.innerHTML = '<section class="card"><p>读不到登录状态：' + esc(error.message) + '</p></section>';
      return;
    }
    if (data.session) renderLoggedIn(box, data.session);
    else renderLoggedOut(box, '');
  }

  window.Account = { html, mount };
})();
