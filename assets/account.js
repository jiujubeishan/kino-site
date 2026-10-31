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

  const BUCKET = 'uploads';
  const MAX_MB = 50;

  function humanSize(bytes) {
    if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes > 1024) return Math.round(bytes / 1024) + ' KB';
    return bytes + ' B';
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
      </section>
      <section class="card auth-card uploader">
        <h3>我的上传</h3>
        <div class="meta">图片或文件都行，单个最大 ${MAX_MB} MB，存在云端，换设备也能看到。</div>
        <div class="tool-row">
          <input type="file" id="up-file" multiple>
        </div>
        <div class="out" id="up-msg"></div>
        <div class="files" id="up-list"><div class="meta">正在读取…</div></div>
      </section>
    `;
    $('#logout', box).onclick = async () => {
      await window.sb.auth.signOut();
      mount();
    };

    const list = $('#up-list', box);
    const msg = $('#up-msg', box);

    const storage = window.sb.storage.from(BUCKET);

    const publicUrl = (path) => storage.getPublicUrl(path).data.publicUrl;

    async function draw() {
      const { data, error } = await storage.list(u.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) {
        list.innerHTML = '<div class="meta">读不到列表：' + esc(error.message) + '（桶建了吗？）</div>';
        return;
      }
      const items = (data || []).filter((f) => f.name && f.id);
      if (!items.length) {
        list.innerHTML = '<div class="meta">还没传东西。</div>';
        return;
      }
      list.innerHTML = '';
      items.forEach((f) => {
        const path = u.id + '/' + f.name;
        const url = publicUrl(path);
        const row = document.createElement('div');
        row.className = 'file-row';
        const isImg = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.name);
        const shown = f.name.replace(/^\d+_/, '');
        if (isImg) {
          const img = document.createElement('img');
          img.src = url;
          img.loading = 'lazy';
          img.onclick = () => window.open(url, '_blank');
          row.append(img);
        } else {
          row.append(Object.assign(document.createElement('span'), { className: 'file-name', textContent: '📄 ' + shown }));
        }
        const meta = document.createElement('div');
        meta.className = 'file-meta';
        meta.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${esc(isImg ? shown : '打开')}</a>` +
          `<span>${f.metadata ? humanSize(f.metadata.size || 0) : ''}</span>`;
        const del = document.createElement('button');
        del.className = 'link';
        del.textContent = '删';
        del.onclick = async () => {
          const { error: e2 } = await storage.remove([path]);
          if (e2) { msg.textContent = '删除失败：' + e2.message; return; }
          draw();
        };
        meta.append(del);
        row.append(meta);
        list.append(row);
      });
    }

    $('#up-file', box).onchange = async (e) => {
      const files = [...e.target.files];
      if (!files.length) return;
      msg.textContent = '上传中…';
      for (const file of files) {
        if (file.size > MAX_MB * 1048576) { msg.textContent = file.name + ' 太大了，跳过。'; continue; }
        const safe = file.name.replace(/[^\w.\-]+/g, '_');
        const path = u.id + '/' + Date.now() + '_' + safe;
        const { error } = await storage.upload(path, file, { contentType: file.type || undefined });
        if (error) { msg.textContent = '上传失败：' + error.message; break; }
      }
      msg.textContent = '完成。';
      e.target.value = '';
      draw();
    };

    draw();
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
