/* 图片插入：点按钮选一张（≤25MB），传到 Storage 后把 Markdown 图片塞进输入框。 */
(function () {
  const MAX_MB = 25;

  function insertAt(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || textarea.value.length;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    const pos = start + text.length;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  }

  function attach(button, textarea, opts) {
    if (!button || !textarea) return;
    const limit = (opts && opts.maxMB) || MAX_MB;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    button.parentNode.insertBefore(input, button.nextSibling);

    let busy = false;
    button.onclick = () => { if (!busy) input.click(); };

    input.onchange = async () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) { alertLike(button, '得是图片。'); return; }
      if (file.size > limit * 1048576) { alertLike(button, `太大了，${limit} MB 以内。`); return; }
      const { data: s } = await window.sb.auth.getSession();
      const user = s && s.session ? s.session.user : null;
      if (!user) { alertLike(button, '登录后才能传图。'); return; }
      busy = true;
      const old = button.textContent;
      button.textContent = '传图中…';
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = 'social/pics/' + user.id + '/' + Date.now() + '_' + safe;
      const { error } = await window.sb.storage.from('uploads').upload(path, file, { contentType: file.type });
      button.textContent = old;
      busy = false;
      if (error) { alertLike(button, '传不上去：' + error.message); return; }
      const url = window.sb.storage.from('uploads').getPublicUrl(path).data.publicUrl;
      insertAt(textarea, `![](${url})`);
    };
  }

  function alertLike(anchor, text) {
    const tip = document.createElement('span');
    tip.className = 'meta pic-tip';
    tip.textContent = text;
    anchor.parentNode.insertBefore(tip, anchor.nextSibling);
    setTimeout(() => tip.remove(), 3000);
  }

  window.PicInserter = { attach };
})();
