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

  function home() {
    return `
      <h1>你好，我是 Kino</h1>
      <p class="lead">写点东西、放点小工具的自留地。慢慢长，不着急。</p>
      <h2>最近写的</h2>
      <div class="grid">
        ${NOTES.slice(0, 3).map((n) => `
          <a class="card" href="#/note/${n.slug}">
            <h3>${esc(n.title)}</h3>
            <div class="meta">${n.date} · ${n.tags.join(' / ')}</div>
            <p>${esc(n.desc || '')}</p>
          </a>`).join('')}
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
      <p class="lead">一共 ${NOTES.length} 篇，按时间倒序。</p>
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
    else html = home();

    clear(app);
    app.innerHTML = html;
    if (parts[0] === 'tools') mountTools();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    document.title = ({
      '': 'Kino 的自留地',
      notes: '笔记 · Kino 的自留地',
      tools: '工具 · Kino 的自留地'
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
