/* 我的笔记：登录后能写、保存到 Supabase 的 notes 表，可选择发布到墙墙。 */
(function () {
  const TABLE = 'notes';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  function html() {
    return `
      <section class="card note-editor" id="note-editor">
        <div class="meta" id="ne-hint">正在检查登录状态…</div>
        <div class="ne-form" hidden>
          <input id="ne-title" type="text" placeholder="标题（随便写）" maxlength="120">
          <textarea id="ne-body" rows="8" placeholder="写点什么……"></textarea>
          <div class="tool-row">
            <button class="primary" id="ne-save">保存</button>
            <span class="meta" id="ne-msg"></span>
          </div>
        </div>
      </section>
      <section id="my-notes" hidden>
        <h2>我写的</h2>
        <div class="grid" id="mn-list"><div class="meta">加载中…</div></div>
      </section>
    `;
  }

  async function mount() {
    const editor = document.querySelector('#note-editor');
    if (!editor || !window.sb) return;
    const hint = document.querySelector('#ne-hint');
    const form = editor.querySelector('.ne-form');
    const titleEl = document.querySelector('#ne-title');
    const bodyEl = document.querySelector('#ne-body');
    const msg = document.querySelector('#ne-msg');
    const myBox = document.querySelector('#my-notes');
    const listBox = document.querySelector('#mn-list');

    const { data: s } = await window.sb.auth.getSession();
    const session = s && s.session;
    if (!session) {
      hint.innerHTML = '登录之后才能写和存。<a href="#/account">去登录 →</a>';
      myBox.hidden = true;
      return;
    }
    hint.textContent = '写点东西，保存到你自己的账户里。发布之后会出现在墙墙上。';
    form.hidden = false;
    myBox.hidden = false;

    const uid = session.user.id;
    const author = window.Profile.of(session.user).name;

    async function draw() {
      const { data, error } = await window.sb
        .from(TABLE)
        .select('id,title,content,published,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (error) {
        listBox.innerHTML = '<div class="meta">读不到笔记：' + esc(error.message) + '（表建了吗？）</div>';
        return;
      }
      if (!data || !data.length) {
        listBox.innerHTML = '<div class="meta">还没写过。</div>';
        return;
      }
      listBox.innerHTML = data.map((n) => window.NoteCard.card(n, {
        actions:
          '<button class="link" data-act="pub" data-id="' + n.id + '">' +
          (n.published ? '撤回发布' : '发布到墙墙') + '</button>' +
          (n.published ? '<span class="tag">已发布</span>' : '') +
          '<button class="link" data-act="del" data-id="' + n.id + '">删</button>'
      })).join('');

      listBox.onclick = async (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.dataset.id;
        const note = data.find((x) => x.id === id);
        if (!note) return;
        e.preventDefault();
        if (btn.dataset.act === 'pub') {
          const { error } = await window.sb.from(TABLE)
            .update({ published: !note.published, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) { msg.textContent = '操作失败：' + error.message; return; }
          msg.textContent = note.published ? '已撤回。' : '发布好了，首页和墙墙都能看到。';
          draw();
        } else if (btn.dataset.act === 'del') {
          const { error } = await window.sb.from(TABLE).delete().eq('id', id);
          if (error) { msg.textContent = '删除失败：' + error.message; return; }
          draw();
        }
      };
    }

    document.querySelector('#ne-save').onclick = async () => {
      const title = titleEl.value.trim();
      const content = bodyEl.value.trim();
      if (!content) { msg.textContent = '空的就别存了。'; return; }
      msg.textContent = '保存中…';
      const { error } = await window.sb.from(TABLE).insert({
        user_id: uid,
        author,
        title: title || '无标题',
        content
      });
      if (error) { msg.textContent = '保存失败：' + error.message; return; }
      titleEl.value = '';
      bodyEl.value = '';
      msg.textContent = '存好了。';
      draw();
    };

    draw();
  }

  window.MyNotes = { html, mount };
})();
