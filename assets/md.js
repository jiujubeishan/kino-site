/* 极简 Markdown 渲染器：够写笔记用，不引外部依赖 */
(function (global) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function inline(s) {
    let t = esc(s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return t;
  }

  function render(md) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let inCode = false, codeBuf = [], listType = null, para = [];

    const flushPara = () => {
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    };
    const closeList = () => { if (listType) { out.push('</' + listType + '>'); listType = null; } };

    while (i < lines.length) {
      const raw = lines[i];
      const line = raw.trimEnd();

      const fence = line.match(/^```(\w*)/);
      if (fence && !inCode) { flushPara(); closeList(); inCode = true; codeBuf = []; i++; continue; }
      if (inCode) {
        if (/^```/.test(line)) { out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); inCode = false; }
        else codeBuf.push(raw);
        i++; continue;
      }

      if (!line.trim()) { flushPara(); closeList(); i++; continue; }

      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        flushPara(); closeList();
        const lv = m[1].length;
        out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>'); i++; continue;
      }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushPara(); closeList(); out.push('<hr>'); i++; continue; }
      if ((m = line.match(/^>\s?(.*)$/))) {
        flushPara(); closeList();
        const buf = [m[1]];
        i++;
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>'); continue;
      }
      if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
        flushPara();
        if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
        out.push('<li>' + inline(m[1]) + '</li>'); i++; continue;
      }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        flushPara();
        if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
        out.push('<li>' + inline(m[1]) + '</li>'); i++; continue;
      }
      para.push(line.trim());
      i++;
    }
    flushPara(); closeList();
    if (inCode) out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
    return out.join('\n');
  }

  global.MiniMD = { render };
})(window);
