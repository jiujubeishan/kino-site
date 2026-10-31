/* 「玩玩」页：心情、摸鱼签、表情包墙、时间胶囊。全在本地跑。 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const MOODS = ['😴 犯困', '😐 还行', '🙂 不错', '😤 想骂人', '🐟 在摸鱼', '💀 快没了'];
  const FISH = [
    '不是我不动，是时机未到。',
    '先喝口水，喝完这口就干。（第四杯）',
    '刚整理完桌面，需要从精神上恢复一下。',
    '这活儿需要一点灵感，而灵感在摇一摇之后。',
    '我不是拖延，我是在等编译器自己冷静。',
    '老板路过的时候我都在忙，真的。',
    '今天状态适合做规划，不适合执行。',
    '先刷五分钟，五分钟后一定。',
    '这个需求本身就很好笑，我先笑完。',
    '我在思考，思考的样子像在发呆。'
  ];
  const STICKERS = [
    'aba.png', 'aha_bear.gif', 'baiyan-kT75rDqk.webp', 'bixin-CMl21JyX.webp',
    'blank_rabbit.gif', 'blob_smile.gif', 'chigua-Dr5SOY84.webp', 'chongbai-CpiarjbP.webp',
    'cup_bear.gif', 'dai.jpg', 'daxiao-DcUKQAo5.webp', 'dianzan-BT677ear.webp',
    'duckhead_bear.gif', 'goutou-BqK0KFKQ.webp', 'happy_bunny.gif', 'kelian-CrG2mT2T.webp',
    'pout_baby.gif', 'shengqi-DmApGEbc.webp', 'shuijiao-DQ0Eer6R.webp', 'touxiao-CwFC4C8R.webp',
    'wuzui-B8aFE0W6.webp', 'xu-BHSU3ugy.webp', 'zanshang-DczxsKQQ.webp'
  ];

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function frame(title, desc) {
    const sec = el('section', 'card play-card');
    sec.append(el('h3', null, title));
    if (desc) sec.append(el('div', 'meta', desc));
    return sec;
  }

  function html() {
    return `
      <h1>玩玩</h1>
      <p class="lead">没什么用，但不无聊。数据全在你这台设备上。</p>
      <div class="grid" id="play-grid"></div>
      <div class="lightbox" id="lightbox" hidden><img alt=""></div>
    `;
  }

  function mount() {
    const grid = $('#play-grid');
    if (!grid) return;

    /* 今日心情 */
    (() => {
      const box = frame('今天什么心情', '点一下，下次打开还记得。');
      const row = el('div', 'chips');
      const saved = read('play.mood', null);
      MOODS.forEach((m) => {
        const b = el('button', 'chip' + (saved === m ? ' on' : ''), m);
        b.onclick = () => {
          write('play.mood', m);
          row.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
        };
        row.append(b);
      });
      box.append(row);
      if (saved) box.append(el('div', 'meta', '上次记录：' + saved));
      grid.append(box);
    })();

    /* 摸鱼签 */
    (() => {
      const box = frame('摸鱼签', '抽一条今天的正当理由。');
      const out = el('div', 'big-line', '点一下抽');
      const btn = el('button', 'primary', '抽一条');
      const row = el('div', 'tool-row');
      row.append(btn);
      btn.onclick = () => {
        out.textContent = FISH[Math.floor(Math.random() * FISH.length)];
        out.classList.remove('pop');
        void out.offsetWidth;
        out.classList.add('pop');
      };
      box.append(out, row);
      grid.append(box);
    })();

    /* 时间胶囊 */
    (() => {
      const box = frame('时间胶囊', '写一句话，定个日子，到点才拆。');
      const ta = el('textarea');
      ta.rows = 3;
      ta.placeholder = '给未来的自己说一句……';
      ta.style.width = '100%';
      const row = el('div', 'tool-row');
      const sel = el('select');
      [[1, '1 天后'], [7, '7 天后'], [30, '30 天后'], [365, '1 年后']].forEach(([d, t]) => {
        const o = el('option', null, t);
        o.value = String(d);
        sel.append(o);
      });
      const btn = el('button', 'primary', '封存');
      row.append(sel, btn);
      const list = el('div', 'capsules');

      const draw = () => {
        const items = read('play.capsules', []);
        list.innerHTML = '';
        if (!items.length) { list.append(el('div', 'meta', '还没有胶囊。')); return; }
        items.forEach((it, i) => {
          const open = Date.now() >= it.openAt;
          const rowEl = el('div', 'capsule' + (open ? ' open' : ''));
          rowEl.append(el('div', 'meta', open ? '已到期 · ' + new Date(it.openAt).toLocaleDateString('zh-CN') : '还有 ' + Math.ceil((it.openAt - Date.now()) / 86400000) + ' 天'));
          rowEl.append(el('div', 'cap-text', open ? it.text : '🔒 还没到时间'));
          const del = el('button', 'link', '删掉');
          del.onclick = () => {
            const next = read('play.capsules', []).filter((_, j) => j !== i);
            write('play.capsules', next);
            draw();
          };
          rowEl.append(del);
          list.append(rowEl);
        });
      };

      btn.onclick = () => {
        const text = ta.value.trim();
        if (!text) return;
        const days = Number(sel.value) || 1;
        const items = read('play.capsules', []);
        items.push({ text, openAt: Date.now() + days * 86400000 });
        write('play.capsules', items);
        ta.value = '';
        draw();
      };
      box.append(ta, row, list);
      draw();
      grid.append(box);
    })();

    /* 表情包墙 */
    (() => {
      const box = frame('表情包墙', '攒的，随便拿。点一下看大图。');
      const wall = el('div', 'sticker-wall');
      STICKERS.forEach((name) => {
        const img = el('img');
        img.src = 'assets/stickers/' + name;
        img.loading = 'lazy';
        img.alt = name.replace(/\.[^.]+$/, '');
        img.onclick = () => openLightbox(img.src);
        wall.append(img);
      });
      box.append(wall);
      box.style.gridColumn = '1 / -1';
      grid.append(box);
    })();

    const lb = $('#lightbox');
    function openLightbox(src) {
      const img = $('img', lb);
      img.src = src;
      lb.hidden = false;
    }
    lb.addEventListener('click', () => { lb.hidden = true; lb.querySelector('img').src = ''; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lb.hidden) { lb.hidden = true; lb.querySelector('img').src = ''; }
    });
  }

  window.Play = { html, mount };
})();
