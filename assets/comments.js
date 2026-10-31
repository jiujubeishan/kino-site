/* 评论：挂在用户笔记（#/u/:id）下面，存在 Supabase 的 comments 表。 */
(function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
    const form = document.querySelector('#cm-form');
    const textEl = document.querySelector('#cm-text');
    const sendBtn = document.querySelector('#cm-send');
    const msg = document.querySelector('#cm-msg');

    const { data: s } = await window.sb.auth.getSession();
    const session = s && s.session;
    if (!session) {
      textEl.placeholder = '登录后才能评论（先去「我的」登一下）';
      sendBtn.disabled = true;
    }

    async function draw() {
      const { data, error } = await window.sb
        .from('comments')
        .select('id,author,content,user_id,created_at')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) {
        list.innerHTML = '<div class="meta">读不到评论：' + esc(error.message) + '（表建了吗？）</div>';
        return;
      }
      if (!data || !data.length) {
        list.innerHTML = '<div class="meta">还没有人说话。当第一个。</div>';
        return;
      }
      const myId = session && session.user.id;
      list.innerHTML = data.map((c) => `
        <article class="cm-item">
          <div class="cm-head">
            <strong>${esc(c.author || '某人')}</strong>
            <span class="meta">${new Date(c.created_at).toLocaleString('zh-CN')}</span>
            ${myId && c.user_id === myId ? '<button class="link" data-del="' + esc(c.id) + '">删</button>' : ''}
          </div>
          <div class="cm-body">${esc(c.content)}</div>
        </article>`).join('');
    }

    list.onclick = async (e) => {
      const btn = e.target.closest('button[data-del]');
      if (!btn) return;
      const id = btn.dataset.del;
      btn.disabled = true;
      const { error } = await window.sb.from('comments').delete().eq('id', id);
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
      const { error } = await window.sb.from('comments').insert({
        note_id: noteId,
        user_id: session.user.id,
        author: profile.name,
        content
      });
      sendBtn.disabled = false;
      if (error) { msg.textContent = '发不出去：' + error.message; return; }
      textEl.value = '';
      msg.textContent = '';
      draw();
    };

    draw();
  }

  window.Comments = { html, mount };
})();
