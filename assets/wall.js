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
      <h1>单选</h1>
      <p class="lead">一块公开的墙。谁都能贴，谁都能看，传上去就收不回来了（别贴私密东西）。</p>
      <section class="card wall-upload">
        <div class="tool-row">
          <input type="file" id="wall-file" multiple>
        </div>
        <div class="meta">图片、文档、压缩包都行，单个最大 ${MAX_MB} MB。</div>
        <div class="out" id="wall-msg"></div>
      </section>
      <div class="files wall-grid" id="wall-list"><div class="meta">正在读取…</div></div>
      <div class="lightbox" id="wall-lb" hidden><img alt=""><div class="lb-tip">点任意处关闭</div></div>
    `;
  }

  async function mount() {
    const list = document.querySelector('#wall-list');
    const msg = document.querySelector('#wall-msg');
    const input = document.querySelector('#wall-file');
    const lb = document.querySelector('#wall-lb');
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
        meta.innerHTML =
          '<a href="' + url + '" target="_blank" rel="noopener">' + (isImg ? esc(shown) : '下载') + '</a>' +
          '<span>' + (f.metadata ? humanSize(f.metadata.size) : '') + ' ' + when + '</span>';
        card.append(meta);
        list.append(card);
      });
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

    draw();
  }

  window.Wall = { html, mount };
})();
