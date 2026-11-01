/* 用户主页：#/user/<uid> —— 头像/名字/粉丝数、关注、私信、他的图集和文章。 */
(function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const MAX_MB = 25;

  function html(uid) {
    return `
      <a class="back" href="#/">← 回首页</a>
      <section class="user-hero" id="user-hero" data-uid="${esc(uid)}">
        <div class="avatar avatar-lg" id="user-avatar">?</div>
        <div class="user-info">
          <h1 id="user-name">读取中…</h1>
          <div class="meta" id="user-stats"></div>
          <div class="tool-row" id="user-actions"></div>
          <div class="out" id="user-msg"></div>
        </div>
      </section>
      <h2 id="user-pics-title">图片</h2>
      <div class="gallery" id="user-gallery"><div class="meta">读取中…</div></div>
      <h2 id="user-notes-title">文章</h2>
      <div class="grid" id="user-notes"><div class="meta">读取中…</div></div>
      <div class="lightbox" id="user-lb" hidden><img alt=""><div class="lb-tip">点任意处关闭</div></div>
    `;
  }

  async function mount(uid) {
    const hero = document.querySelector('#user-hero');
    if (!hero || !window.sb) return;
    const avatarEl = document.querySelector('#user-avatar');
    const nameEl = document.querySelector('#user-name');
    const statsEl = document.querySelector('#user-stats');
    const actions = document.querySelector('#user-actions');
    const msg = document.querySelector('#user-msg');

    const { data: s } = await window.sb.auth.getSession();
    const me = s && s.session ? s.session.user : null;
    const isSelf = !!me && me.id === uid;
    const OWN = isSelf ? '我的' : 'TA 的';
    const pt = document.querySelector('#user-pics-title');
    const nt = document.querySelector('#user-notes-title');
    if (pt) pt.textContent = OWN + '图片';
    if (nt) nt.textContent = OWN + '文章';

    const info = await window.Social.getProfile(uid);
    nameEl.textContent = info.name || '某人';
    avatarEl.innerHTML = info.avatar ? `<img alt="" src="${esc(info.avatar)}">` : esc((info.name || '?')[0]);

    const [followers, following] = await Promise.all([
      window.Social.followersCount(uid),
      window.Social.followingCount(uid)
    ]);
    statsEl.textContent = `粉丝 ${followers} · 关注 ${following}`;

    // 按钮区
    if (isSelf) {
      actions.innerHTML = '<button id="user-gallery-pick">上传图片</button><input type="file" id="user-gallery-file" accept="image/*" hidden>';
    } else {
      const following_ = me ? await window.Social.isFollowing(uid, me.id) : false;
      actions.innerHTML = `
        <button class="${following_ ? '' : 'primary'}" id="user-follow">${following_ ? '已关注' : '关注'}</button>
        <button id="user-dm">私信</button>
        ${me ? '' : '<span class="meta">登录后才能关注、私信</span>'}`;

      const followBtn = document.querySelector('#user-follow');
      followBtn.onclick = async () => {
        if (!me) { msg.textContent = '先去「我的」登录。'; return; }
        followBtn.disabled = true;
        const now = await window.Social.isFollowing(uid, me.id);
        if (now) await window.Social.unfollow(uid, me.id);
        else await window.Social.follow(uid, me.id);
        const [f2] = await Promise.all([
          window.Social.followersCount(uid),
          window.Social.followingCount(me.id)
        ]);
        statsEl.textContent = `粉丝 ${f2} · 关注 ${following}`;
        followBtn.disabled = false;
        const on = !now;
        followBtn.textContent = on ? '已关注' : '关注';
        followBtn.className = on ? '' : 'primary';
      };

      document.querySelector('#user-dm').onclick = () => {
        if (!me) { msg.textContent = '先去「我的」登录。'; return; }
        location.hash = '#/dm/' + uid;
      };
    }

    // 图集
    const galleryEl = document.querySelector('#user-gallery');
    const lb = document.querySelector('#user-lb');
    lb.onclick = () => { lb.hidden = true; };

    async function drawGallery() {
      const items = await window.Social.gallery(uid);
      if (!items.length) {
        galleryEl.innerHTML = '<div class="meta">' + (isSelf ? '还没传图，点上面的「上传图片」。' : '这人还没传图。') + '</div>';
        return;
      }
      galleryEl.innerHTML = '';
      items.forEach((it) => {
        const cell = document.createElement('div');
        cell.className = 'gallery-cell';
        const img = document.createElement('img');
        img.src = it.url;
        img.loading = 'lazy';
        img.onclick = () => {
          lb.querySelector('img').src = it.url;
          lb.hidden = false;
        };
        cell.append(img);
        if (isSelf) {
          const del = document.createElement('button');
          del.className = 'link';
          del.textContent = '删';
          del.onclick = async (e) => {
            e.stopPropagation();
            const err = await window.Social.hideGalleryImage(uid, it.name);
            if (err) { msg.textContent = '删不掉：' + err.message; return; }
            drawGallery();
          };
          cell.append(del);
        }
        galleryEl.append(cell);
      });
    }

    if (isSelf) {
      const pick = document.querySelector('#user-gallery-pick');
      const fileEl = document.querySelector('#user-gallery-file');
      pick.onclick = () => fileEl.click();
      fileEl.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!/^image\//.test(file.type)) { msg.textContent = '得是图片。'; return; }
        if (file.size > MAX_MB * 1048576) { msg.textContent = `太大了，${MAX_MB} MB 以内。`; return; }
        msg.textContent = '上传中…';
        const err = await window.Social.addGalleryImage(me, file);
        msg.textContent = err ? '传不上去：' + err.message : '';
        drawGallery();
      };
    }

    drawGallery();

    // 文章
    const notesEl = document.querySelector('#user-notes');
    const { data: notes, error } = await window.sb
      .from('notes')
      .select('id,title,content,created_at')
      .eq('user_id', uid)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(12);
    if (error || !notes || !notes.length) {
      notesEl.innerHTML = '<div class="meta">还没有公开的文章。</div>';
    } else {
      notesEl.innerHTML = notes.map((n) => window.NoteCard.card(n)).join('');
    }
  }

  window.UserPage = { html, mount };
})();
