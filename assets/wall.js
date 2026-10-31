/* 公开墙：谁都能传，谁都能看。文件存在 Supabase Storage 的 wall/ 目录下。 */
(function () {
  const BUCKET = 'uploads';
  const PREFIX = 'wall';
  const MAX_MB = 50;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function humanSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes || 0) + ' B';
  }

  function html() {
    return `
      <h1>墙墙</h1>
      <p class="lead">一块公开的墙。谁都能贴，谁都能看。贴错了可以删（登录后）。</p>
      <section class="card wall-upload">
        <div class="tool-row">
          <input type="file" id="wall-file" multiple>
        </div>
        <div class="meta">图片、文档、压缩包都行，单个最大 ${MAX_MB} MB。</div>
        <div class="out" id="wall-msg"></div>
        <div class="wall-post">
          <input id="wall-title" type="text" placeholder="标题（可留空）" maxlength="120">
          <textarea id="wall-text" rows="4" placeholder="也可以只写字，直接贴在墙上……"></textarea>
          <div class="tool-row">
            <button class="primary" id="wall-post">发到墙上</button>
            <span class="meta" id="wall-post-msg"></span>
          </div>
        </div>
      </section>
      <div class="wall-search">
        <input id="wall-search" type="search" placeholder="搜文件名、笔记标题或正文…" autocomplete="off">
        <span class="meta" id="wall-hit"></span>
      </div>
      <h2>贴的文件</h2>
      <div class="files wall-grid" id="wall-list"><div class="meta">正在读取…</div></div>
      <h2>大家写的</h2>
      <div class="grid" id="wall-notes"><div class="meta">正在读…</div></div>
      <div class="lightbox" id="wall-lb" hidden><img alt=""><div class="lb-tip">点任意处关闭</div></div>
    `;
  }

  async function mount() {
    const list = document.querySelector('#wall-list');
    const msg = document.querySelector('#wall-msg');
    const input = document.querySelector('#wall-file');
    const lb = document.querySelector('#wall-lb');
    const searchEl = document.querySelector('#wall-search');
    const hitEl = document.querySelector('#wall-hit');
    const titleEl = document.querySelector('#wall-title');
    const textEl = document.querySelector('#wall-text');
    const postBtn = document.querySelector('#wall-post');
    const postMsg = document.querySelector('#wall-post-msg');
    let fileCards = [];
    let noteCards = [];

    function noteActions(note) {
      return '<button class="link" data-act="del" data-id="' + note.id + '">删</button>';
    }

    function applyFilter() {
      const q = (searchEl && searchEl.value || '').trim().toLowerCase();
      let hit = 0;
      let total = 0;
      fileCards.concat(noteCards).forEach((el) => {
        if (!el.isConnected) return;
        total++;
        const hay = (el.dataset.search || '');
        const on = !q || hay.indexOf(q) !== -1;
        el.style.display = on ? '' : 'none';
        if (on) hit++;
      });
      if (hitEl) hitEl.textContent = (q && total) ? (hit + ' / ' + total + ' 条') : '';
    }
    if (searchEl) {
      searchEl.addEventListener('input', applyFilter);
      window.addEventListener('unmount', () => searchEl.removeEventListener('input', applyFilter), { once: true });
    }
    if (!list || !window.sb) {
      if (list) list.innerHTML = '<div class="meta">Supabase 没加载，等会儿再试。</div>';
      return;
    }
    const storage = window.sb.storage.from(BUCKET);

    lb.addEventListener('click', () => { lb.hidden = true; lb.querySelector('img').src = ''; });
    const onKey = (e) => { if (e.key === 'Escape') lb.click(); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('unmount', () => document.removeEventListener('keydown', onKey), { once: true });

    async function draw() {
      const { data, error } = await storage.list(PREFIX, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      if (error) {
        list.innerHTML = '<div class="meta">读不到墙：' + esc(error.message) + '（桶或权限还没配好？）</div>';
        return;
      }
      const items = (data || []).filter((f) => f.name && f.id);
      if (!items.length) {
        list.innerHTML = '<div class="meta">墙上还什么都没有，你可以当第一个。</div>';
        return;
      }
      list.innerHTML = '';
      fileCards = [];
      items.forEach((f) => {
        const path = PREFIX + '/' + f.name;
        const url = storage.getPublicUrl(path).data.publicUrl;
        const shown = f.name.replace(/^\d+_[a-z0-9]{4}_/, '');
        const isImg = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(shown);
        const card = document.createElement('div');
        card.className = 'file-row';
        if (isImg) {
          const img = document.createElement('img');
          img.loading = 'lazy';
          img.src = url;
          img.alt = shown;
          img.onclick = () => {
            lb.querySelector('img').src = url;
            lb.hidden = false;
          };
          card.append(img);
        } else {
          const span = document.createElement('span');
          span.className = 'file-name';
          span.textContent = '📄 ' + shown;
          card.append(span);
        }
        const meta = document.createElement('div');
        meta.className = 'file-meta';
        const when = f.created_at ? new Date(f.created_at).toLocaleDateString('zh-CN') : '';
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = isImg ? shown : '下载';
        const info = document.createElement('span');
        info.textContent = (f.metadata ? humanSize(f.metadata.size) : '') + ' ' + when;
        const del = document.createElement('button');
        del.className = 'link';
        del.textContent = '删';
        del.title = '从墙上移除';
        del.onclick = async () => {
          const { data: s } = await window.sb.auth.getSession();
          if (!s || !s.session) { msg.textContent = '登录后才能删。先去「我的」登一下。'; return; }
          del.disabled = true;
          const { error } = await storage.remove([path]);
          if (error) { msg.textContent = '删除失败：' + error.message; del.disabled = false; return; }
          card.remove();
          if (!list.querySelector('.file-row')) list.innerHTML = '<div class="meta">墙上还什么都没有，你可以当第一个。</div>';
        };
        meta.append(link, info, del);
        card.dataset.search = (shown + ' ' + when).toLowerCase();
        fileCards.push(card);
        card.append(meta);
        list.append(card);
      });
      applyFilter();
    }

    input.onchange = async (e) => {
      const files = [...e.target.files];
      if (!files.length) return;
      msg.textContent = '上传中…';
      let done = 0;
      for (const file of files) {
        if (file.size > MAX_MB * 1048576) {
          msg.textContent = file.name + ' 太大，跳过。';
          continue;
        }
        const safe = file.name.replace(/[^\w.\-]+/g, '_');
        const rand = Math.random().toString(36).slice(2, 6);
        const path = PREFIX + '/' + Date.now() + '_' + rand + '_' + safe;
        const { error } = await storage.upload(path, file, { contentType: file.type || undefined });
        if (error) {
          msg.textContent = '上传失败：' + error.message;
          break;
        }
        done++;
      }
      msg.textContent = done ? '传好了 ' + done + ' 个，下面刷新一下。' : '';
      e.target.value = '';
      draw();
    };

    if (postBtn) {
      postBtn.onclick = async () => {
        const title = (titleEl.value || '').trim();
        const content = (textEl.value || '').trim();
        if (!content && !title) { postMsg.textContent = '标题和正文都空着，先写点啥。'; return; }
        const { data: s } = await window.sb.auth.getSession();
        const session = s && s.session;
        if (!session) { postMsg.textContent = '登录之后才能贴。先去「我的」登一下。'; return; }
        postBtn.disabled = true;
        postMsg.textContent = '发送中…';
        const author = (session.user.email || '').split('@')[0];
        const { error } = await window.sb.from('notes').insert({
          user_id: session.user.id,
          author,
          title: title || (content.slice(0, 20) + (content.length > 20 ? '…' : '')),
          content: content || title,
          published: true
        });
        postBtn.disabled = false;
        if (error) { postMsg.textContent = '贴不上去：' + error.message; return; }
        titleEl.value = '';
        textEl.value = '';
        postMsg.textContent = '贴好了，就在下面。';
        drawNotes();
      };
    }

    async function drawNotes() {
      const box = document.querySelector('#wall-notes');
      if (!box) return;
      const { data, error } = await window.sb
        .from('notes')
        .select('id,title,content,author,created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        box.innerHTML = '<div class="meta">读不到笔记：' + esc(error.message) + '</div>';
        return;
      }
      if (!data || !data.length) {
        box.innerHTML = '<div class="meta">还没人发。就在上面的框里写两句，按「发到墙上」就出来了。</div>';
        return;
      }
      noteCards = [];
      box.innerHTML = data.map((n) => window.NoteCard.card(n, {
        actions: noteActions(n)
      })).join('');
      data.forEach((n, i) => {
        const el = box.children[i];
        if (!el) return;
        el.dataset.search = ((n.title || '') + ' ' + (n.author || '') + ' ' + (n.content || '')).toLowerCase();
        noteCards.push(el);
      });
      box.onclick = async (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        e.preventDefault();
        const id = btn.dataset.id;
        const { data: s } = await window.sb.auth.getSession();
        const uid = s && s.session && s.session.user.id;
        if (!uid) { postMsg.textContent = '登录后才能删自己的贴。'; return; }
        const { error } = await window.sb.from('notes').delete().eq('id', id);
        if (error) { postMsg.textContent = '删除失败：' + error.message; return; }
        drawNotes();
      };
      applyFilter();
    }

    draw();
    drawNotes();
  }

  window.Wall = { html, mount };
})();
