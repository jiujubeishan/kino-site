/* 私信：消息存在 Storage 的 social/dm/<两人id按字母序>/ 下，一条一个 json。 */
(function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  async function me() {
    if (!window.sb) return null;
    const { data } = await window.sb.auth.getSession();
    return data && data.session ? data.session.user : null;
  }

  function html(peerId) {
    return `
      <a class="back" href="#/messages">← 私信</a>
      <section class="dm-head" id="dm-head" data-peer="${esc(peerId)}">
        <div class="avatar avatar-sm" id="dm-avatar">?</div>
        <div>
          <h1 id="dm-name">读取中…</h1>
          <div class="meta" id="dm-hint"></div>
        </div>
      </section>
      <div class="dm-list" id="dm-list"><div class="meta">读取中…</div></div>
      <div class="cm-form">
        <textarea id="dm-text" rows="3" placeholder="说点什么……"></textarea>
        <div class="tool-row">
          <button class="primary" id="dm-send">发送</button>
          <button type="button" id="dm-emoji">😀 表情</button>
          <button type="button" id="dm-pic">🖼 图片</button>
          <span class="meta" id="dm-msg"></span>
        </div>
      </div>
    `;
  }

  async function mount(peerId) {
    const list = document.querySelector('#dm-list');
    if (!list || !window.sb) return;
    const user = await me();
    const profile = await window.Social.getProfile(peerId);
    document.querySelector('#dm-name').innerHTML = '<a href="#/user/' + esc(peerId) + '">' + esc(profile.name || '某人') + '</a>';
    document.querySelector('#dm-avatar').innerHTML = profile.avatar
      ? `<img alt="" src="${esc(profile.avatar)}">`
      : esc((profile.name || '?')[0]);

    const textEl = document.querySelector('#dm-text');
    const sendBtn = document.querySelector('#dm-send');
    const msg = document.querySelector('#dm-msg');
    const hint = document.querySelector('#dm-hint');

    if (!user) {
      hint.innerHTML = '登录后才能私信。<a href="#/account">去登录 →</a>';
      sendBtn.disabled = true;
      textEl.placeholder = '登录后再说……';
    } else if (window.EmojiPicker) {
      window.EmojiPicker.attach(document.querySelector('#dm-emoji'), textEl);
    }
    if (window.PicInserter && user) {
      window.PicInserter.attach(document.querySelector('#dm-pic'), textEl, { maxMB: 25 });
    }

    async function draw() {
      if (!user) { list.innerHTML = ''; return; }
      const items = await window.Social.listDM(user.id, peerId);
      if (!items.length) {
        list.innerHTML = '<div class="meta">还没有消息，说句你好。</div>';
        return;
      }
      const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
      list.innerHTML = items.map((m) => `
        <div class="dm-item ${m.uid === user.id ? 'mine' : ''}">
          <div class="dm-bubble">${window.MiniMD ? window.MiniMD.render(m.text || '') : esc(m.text || '')}</div>
          <div class="meta">${esc(new Date(m.at).toLocaleString('zh-CN'))}</div>
        </div>`).join('');
      if (nearBottom) list.scrollTop = list.scrollHeight;
    }

    sendBtn.onclick = async () => {
      const text = (textEl.value || '').trim();
      if (!text) { msg.textContent = '空的。'; return; }
      if (!user) { msg.textContent = '登录后才能发。'; return; }
      sendBtn.disabled = true;
      const err = await window.Social.sendDM(user, peerId, text);
      sendBtn.disabled = false;
      if (err) { msg.textContent = '发不出去：' + err.message; return; }
      textEl.value = '';
      msg.textContent = '';
      const items = await window.Social.listDM(user.id, peerId);
      list.innerHTML = items.map((m) => `
        <div class="dm-item ${m.uid === user.id ? 'mine' : ''}">
          <div class="dm-bubble">${window.MiniMD ? window.MiniMD.render(m.text || '') : esc(m.text || '')}</div>
          <div class="meta">${esc(new Date(m.at).toLocaleString('zh-CN'))}</div>
        </div>`).join('');
      list.scrollTop = list.scrollHeight;
    };

    draw();
    const timer = setInterval(draw, 6000);
    list.addEventListener('unmount', () => clearInterval(timer));
    window.addEventListener('hashchange', () => clearInterval(timer), { once: true });
  }

  function inboxHtml() {
    return `
      <h1>私信</h1>
      <p class="lead">存在云端，换设备也能接着聊。</p>
      <div class="dm-peers" id="dm-peers"><div class="meta">读取中…</div></div>
    `;
  }

  async function inboxMount() {
    const box = document.querySelector('#dm-peers');
    if (!box || !window.sb) return;
    const user = await me();
    if (!user) {
      box.innerHTML = '<div class="meta">登录后才能看私信。<a href="#/account">去登录 →</a></div>';
      return;
    }
    const peers = await window.Social.dmPeers(user.id);
    if (!peers.length) {
      box.innerHTML = '<div class="meta">还没有人跟你聊天。去别人的主页点「私信」试试。</div>';
      return;
    }
    const profiles = await Promise.all(peers.map((p) => window.Social.getProfile(p.peer)));
    box.innerHTML = peers.map((p, i) => {
      const pr = profiles[i] || { name: '某人', avatar: '' };
      const av = pr.avatar
        ? `<img alt="" src="${esc(pr.avatar)}">`
        : esc((pr.name || '?')[0]);
      return `
        <a class="dm-peer" href="#/dm/${esc(p.peer)}">
          <div class="avatar avatar-sm">${av}</div>
          <div class="dm-peer-main">
            <strong>${esc(pr.name || '某人')}</strong>
            <div class="meta">${esc(p.text || '')}</div>
          </div>
          <div class="meta">${esc(new Date(p.at).toLocaleString('zh-CN'))}</div>
        </a>`;
    }).join('');
  }

  window.DM = { html, mount, inboxHtml, inboxMount };
})();
