/* 公开墙：谁都能贴文字，谁都能看。笔记存在 Supabase 的 notes 表里。 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function html() {
    return `
      <h1>墙墙</h1>
      <p class="lead">一块公开的墙。谁都能贴，谁都能看。贴错了可以删（登录后）。</p>
      <section class="card wall-upload">
        <div class="wall-post">
          <input id="wall-title" type="text" placeholder="标题（可留空）" maxlength="120">
          <textarea id="wall-text" rows="4" placeholder="写点什么，直接贴在墙上……"></textarea>
          <div class="tool-row">
            <button class="primary" id="wall-post">发到墙上</button>
            <button type="button" id="wall-emoji">😀 表情</button>
            <button type="button" id="wall-pic">🖼 图片</button>
            <span class="meta" id="wall-post-msg"></span>
          </div>
        </div>
      </section>
      <div class="wall-search">
        <input id="wall-search" type="search" placeholder="搜标题或正文…" autocomplete="off">
        <span class="meta" id="wall-hit"></span>
      </div>
      <h2>大家写的</h2>
      <div class="grid" id="wall-notes"><div class="meta">正在读…</div></div>
    `;
  }

  async function mount() {
    const searchEl = document.querySelector('#wall-search');
    const hitEl = document.querySelector('#wall-hit');
    const titleEl = document.querySelector('#wall-title');
    const textEl = document.querySelector('#wall-text');
    const postBtn = document.querySelector('#wall-post');
    const postMsg = document.querySelector('#wall-post-msg');
    if (!searchEl || !window.sb) return;
    let noteCards = [];

    function noteActions(note) {
      return '<button class="link" data-act="del" data-id="' + note.id + '">删</button>';
    }

    function applyFilter() {
      const q = (searchEl.value || '').trim().toLowerCase();
      let hit = 0;
      let total = 0;
      noteCards.forEach((el) => {
        if (!el.isConnected) return;
        total++;
        const on = !q || (el.dataset.search || '').indexOf(q) !== -1;
        el.style.display = on ? '' : 'none';
        if (on) hit++;
      });
      hitEl.textContent = (q && total) ? (hit + ' / ' + total + ' 条') : '';
    }
    searchEl.addEventListener('input', applyFilter);

    if (window.EmojiPicker) window.EmojiPicker.attach(document.querySelector('#wall-emoji'), textEl);
    if (window.PicInserter) window.PicInserter.attach(document.querySelector('#wall-pic'), textEl, { maxMB: 25 });

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
        const author = window.Profile.of(session.user).name;
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
        .select('id,user_id,title,content,author,created_at')
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

    drawNotes();
  }

  window.Wall = { html, mount };
})();
