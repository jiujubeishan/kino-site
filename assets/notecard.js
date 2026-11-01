/* 笔记卡片：墙墙、笔记页、首页统一用这一套，跟站内文章一个样。 */
(function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function plain(text, max) {
    const s = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function fmt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN');
  }

  /**
   * @param {{id:string,title?:string,content?:string,author?:string,created_at?:string}} note
   * @param {{actions?:string}} opts actions 是卡片底部的按钮 HTML
   */
  function card(note, opts) {
    opts = opts || {};
    const when = fmt(note.created_at);
    const author = note.author
      ? (note.user_id
        ? `<a href="#/user/${esc(note.user_id)}">${esc(note.author)}</a>`
        : esc(note.author))
      : '';
    const meta = [author, when].filter(Boolean).join(' · ');
    return `
      <article class="card note-card" data-note-id="${esc(note.id)}">
        <a class="card-link" href="#/u/${esc(note.id)}">
          <h3>${esc(note.title || '无标题')}</h3>
          <p>${esc(plain(note.content, 70))}</p>
        </a>
        <div class="note-foot">
          <div class="meta">${meta}</div>
          ${opts.actions ? '<div class="tool-row note-actions">' + opts.actions + '</div>' : ''}
        </div>
      </article>`;
  }

  window.NoteCard = { card, plain, fmt, esc };
})();
