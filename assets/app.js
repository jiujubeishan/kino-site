/* 站点逻辑：哈希路由 + 笔记清单。加笔记 = 在 NOTES 里加一条 + 放一个 md 文件。 */
(function () {
  const NOTES = [
    { slug: 'hello', title: '为什么又开了一个站', date: '2026-10-31', tags: ['随笔'], desc: '第一篇文章，说说这块地要种什么。' },
    { slug: 'tools', title: '工具槽位怎么加', date: '2026-10-31', tags: ['折腾'], desc: '两分钟加一个自己的小工具。' },
    { slug: 'stack', title: '这套东西是怎么跑起来的', date: '2026-10-31', tags: ['折腾', '备忘'], desc: '零依赖静态站，改完即上线。' }
  ];

  const app = document.getElementById('app');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const clear = (node) => { node.dispatchEvent(new Event('unmount')); node.innerHTML = ''; };

  function card(item) {
    return `
      <a class="card" href="${item.href}">
        <h3>${esc(item.title)}</h3>
        <div class="meta">${esc(item.date)} · ${esc(item.tag)}</div>
        <p>${esc(item.desc || '')}</p>
      </a>`;
  }

  const staticItems = () => NOTES.map((n) => ({
    title: n.title,
    date: n.date,
    tag: n.tags.join(' / '),
    desc: n.desc || '',
    href: '#/note/' + n.slug
  }));

  function plain(text, max) {
    const s = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`~\-]+/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  async function mountHome() {
    const grid = document.querySelector('#home-grid');
    if (!grid) return;
    let items = staticItems();
    if (window.sb) {
      try {
        const { data } = await window.sb
          .from('notes')
          .select('id,title,content,created_at')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(20);
        (data || []).forEach((n) => {
          const d = new Date(n.created_at);
          items.push({
            title: n.title || '无标题',
            date: d.toISOString().slice(0, 10),
            tag: '笔记',
            desc: plain(n.content, 60),
            href: '#/u/' + n.id,
            ts: d.getTime()
          });
        });
      } catch (e) { /* 没配置也不影响静态文章 */ }
    }
    items = items.map((it) => ({ ...it, ts: it.ts || new Date(it.date).getTime() }))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6);
    grid.innerHTML = items.map(card).join('');
  }

  function home() {
    return `
      <h1>你好，我是 Kino</h1>
      <p class="lead">写点东西、放点小工具的自留地。慢慢长，不着急。</p>
      <h2>最近写的</h2>
      <div class="grid" id="home-grid">
        ${staticItems().slice(0, 3).map(card).join('')}
      </div>
      <h2>顺手能用的</h2>
      <div class="grid">
        ${SiteTools.tools.slice(0, 3).map((t) => `
          <a class="card" href="#/tools">
            <h3>${esc(t.title)}</h3>
            <p>${esc(t.desc)}</p>
          </a>`).join('')}
      </div>
      <p style="margin-top:34px"><a href="#/notes">全部笔记 →</a></p>
    `;
  }

  function notesIndex() {
    return `
      <h1>笔记</h1>
      <p class="lead">自己写的存云端，下面这几篇是写死在站里的。</p>
      ${typeof MyNotes !== 'undefined' ? MyNotes.html() : ''}
      <h2>站内文章</h2>
      <div class="grid">
        ${NOTES.slice().sort((a, b) => b.date.localeCompare(a.date)).map((n) => `
          <a class="card" href="#/note/${n.slug}">
            <h3>${esc(n.title)}</h3>
            <div class="meta">${n.date} · ${n.tags.join(' / ')}</div>
            <p>${esc(n.desc || '')}</p>
          </a>`).join('')}
      </div>
    `;
  }

  async function note(slug) {
    const meta = NOTES.find((n) => n.slug === slug);
    if (!meta) return `<h1>404</h1><p>这篇不存在。<a href="#/notes">回笔记列表</a></p>`;
    let body = '<p>加载失败。</p>';
    try {
      const res = await fetch(`notes/${slug}.md`, { cache: 'no-cache' });
      if (res.ok) body = MiniMD.render(await res.text());
      else body = '<p>读不到这个文件。</p>';
    } catch (e) { body = '<p>读不到这个文件。</p>'; }
    return `
      <a class="back" href="#/notes">← 返回列表</a>
      <article class="note-body">
        ${body}
      </article>
      <p style="margin-top:36px"><a class="back" href="#/notes">← 回笔记列表</a></p>
    `;
  }

  async function userNote(id) {
    const back = '<a class="back" href="#/">← 回首页</a>';
    if (!window.sb || !id) return back + '<h1>404</h1><p>这篇不存在。</p>';
    const { data, error } = await window.sb
      .from('notes')
      .select('id,title,content,author,created_at')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return back + '<h1>404</h1><p>找不到这篇，可能被撤回或删掉了。</p>';
    const when = new Date(data.created_at).toLocaleDateString('zh-CN');
    return `
      ${back}
      <article class="note-body">
        <h1>${esc(data.title || '无标题')}</h1>
        <p class="meta">${esc(data.author || '某人')} · ${when}</p>
        ${MiniMD.render(data.content || '')}
      </article>
      ${window.Comments ? window.Comments.html(id) : ''}
    `;
  }

  function toolsPage() {
    return `
      <h1>工具</h1>
      <p class="lead">都在浏览器里跑，不上传、不联网。</p>
      <div class="grid" id="tool-grid">
        ${SiteTools.tools.map((t) => `
          <section class="tool" data-tool="${t.id}">
            <h3>${esc(t.title)}</h3>
            <div class="meta">${esc(t.desc)}</div>
          </section>`).join('')}
      </div>
    `;
  }

  function mountTools() {
    document.querySelectorAll('[data-tool]').forEach((box) => {
      const t = SiteTools.tools.find((x) => x.id === box.dataset.tool);
      if (!t || typeof t.mount !== 'function') return;
      const host = document.createElement('div');
      box.appendChild(host);
      t.mount(host);
    });
  }

  async function render() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean);
    let html;
    if (parts[0] === 'notes') html = notesIndex();
    else if (parts[0] === 'note') html = await note(parts[1] || '');
    else if (parts[0] === 'tools') html = toolsPage();
    else if (parts[0] === 'play') html = Play.html();
    else if (parts[0] === 'wall') html = Wall.html();
    else if (parts[0] === 'u') html = await userNote(parts[1] || '');
    else if (parts[0] === 'account') html = Account.html();
    else html = home();

    clear(app);
    app.innerHTML = html;
    if (!parts.length) mountHome();
    if (parts[0] === 'notes' && typeof MyNotes !== 'undefined') MyNotes.mount();
    if (parts[0] === 'tools') mountTools();
    if (parts[0] === 'play') Play.mount();
    if (parts[0] === 'wall') Wall.mount();
    if (parts[0] === 'account') Account.mount();
    if (parts[0] === 'u' && window.Comments) Comments.mount();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    document.title = ({
      '': 'Kino 的自留地',
      notes: '笔记 · Kino 的自留地',
      tools: '工具 · Kino 的自留地',
      play: '玩玩 · Kino 的自留地',
      wall: '墙墙 · Kino 的自留地',
      account: '我的 · Kino 的自留地',
      u: '笔记 · Kino 的自留地'
    })[parts[0] || ''] || (NOTE_TITLE(parts[1]) + ' · Kino 的自留地');
  }

  function NOTE_TITLE(slug) {
    const m = NOTES.find((n) => n.slug === slug);
    return m ? m.title : 'Kino 的自留地';
  }

  window.addEventListener('hashchange', render);
  document.getElementById('year').textContent = new Date().getFullYear();
  render();
})();
