/* 评论：存在 Supabase Storage 的 wall/comments/<笔记id>/ 目录下，一条一个 json。 */
(function () {
  const BUCKET = 'uploads';
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dir = (noteId) => 'wall/comments/' + noteId;

  function html(noteId) {
    return `
      <section class="comments" id="comments" data-note="${esc(noteId)}">
        <h2>评论</h2>
        <div id="cm-list"><div class="meta">正在读…</div></div>
        <div class="cm-form" id="cm-form">
          <textarea id="cm-text" rows="3" placeholder="说两句……"></textarea>
          <div class="tool-row">
            <button class="primary" id="cm-send">发评论</button>
            <span class="meta" id="cm-msg"></span>
          </div>
        </div>
      </section>
    `;
  }

  async function mount() {
    const root = document.querySelector('#comments');
    if (!root || !window.sb) return;
    const noteId = root.dataset.note;
    const list = document.querySelector('#cm-list');
    const textEl = document.querySelector('#cm-text');
    const sendBtn = document.querySelector('#cm-send');
    const msg = document.querySelector('#cm-msg');
    const storage = window.sb.storage.from(BUCKET);

    const { data: s } = await window.sb.auth.getSession();
    const session = s && s.session;
    if (!session) {
      textEl.placeholder = '登录后才能评论（先去「我的」登一下）';
      sendBtn.disabled = true;
    }
    const myId = session ? session.user.id : '';

    async function draw() {
      const { data, error } = await storage.list(dir(noteId), {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' }
      });
      if (error) {
        list.innerHTML = '<div class="meta">读不到评论：' + esc(error.message) + '</div>';
        return;
      }
      const files = (data || []).filter((f) => f.name && f.name.endsWith('.json'));
      if (!files.length) {
        list.innerHTML = '<div class="meta">还没有人说话。当第一个。</div>';
        return;
      }
      const items = await Promise.all(files.map(async (f) => {
        const path = dir(noteId) + '/' + f.name;
        try {
          const res = await fetch(storage.getPublicUrl(path).data.publicUrl, { cache: 'no-store' });
          if (!res.ok) return null;
          const j = await res.json();
          return { uid: j.uid || '', author: j.author || '某人', content: j.content || '', at: j.at || '', path };
        } catch (e) {
          return null;
        }
      }));
      const ok = items.filter(Boolean);
      list.innerHTML = ok.map((c) => `
        <article class="cm-item">
          <div class="cm-head">
            <strong>${esc(c.author)}</strong>
            <span class="meta">${esc(new Date(c.at).toLocaleString('zh-CN'))}</span>
            ${myId && c.uid === myId ? '<button class="link" data-path="' + esc(c.path) + '">删</button>' : ''}
          </div>
          <div class="cm-body">${esc(c.content)}</div>
        </article>`).join('') || '<div class="meta">还没有人说话。当第一个。</div>';
    }

    list.onclick = async (e) => {
      const btn = e.target.closest('button[data-path]');
      if (!btn) return;
      btn.disabled = true;
      const { error } = await storage.remove([btn.dataset.path]);
      if (error) { msg.textContent = '删不掉：' + error.message; btn.disabled = false; return; }
      draw();
    };

    sendBtn.onclick = async () => {
      const content = (textEl.value || '').trim();
      if (!content) { msg.textContent = '空评论就别发了。'; return; }
      if (!session) { msg.textContent = '登录后才能评论。'; return; }
      sendBtn.disabled = true;
      msg.textContent = '发送中…';
      const profile = window.Profile ? window.Profile.of(session.user) : { name: '某人' };
      const name = Date.now() + '_' + myId.slice(0, 8) + '.json';
      const body = JSON.stringify({ uid: myId, author: profile.name, content, at: new Date().toISOString() });
      const { error } = await storage.upload(dir(noteId) + '/' + name, new Blob([body], { type: 'application/json' }), {
        contentType: 'application/json'
      });
      sendBtn.disabled = false;
      if (error) { msg.textContent = '发不出去：' + error.message; return; }
      textEl.value = '';
      msg.textContent = '发好了。';
      setTimeout(draw, 900);
    };

    draw();
  }

  window.Comments = { html, mount };
})();
