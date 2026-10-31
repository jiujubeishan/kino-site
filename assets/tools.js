/* 工具槽位：往数组里加一条，页面上就多一张卡片。
   每条：{ id, title, desc, mount(el) }  —— mount 负责把界面塞进 el。 */
(function (global) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const tools = [
    {
      id: 'clock',
      title: '现在几点',
      desc: '大字时钟，顺手看一眼今天剩多少。',
      mount(box) {
        const clock = el('div', 'clock mono', '--:--:--');
        const sub = el('div', 'meta', '');
        box.append(clock, sub);
        const tick = () => {
          const d = new Date();
          clock.textContent = d.toLocaleTimeString('zh-CN', { hour12: false });
          const left = 24 * 60 - (d.getHours() * 60 + d.getMinutes());
          sub.textContent = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) +
            ' · 今天还剩 ' + Math.floor(left / 60) + ' 小时 ' + (left % 60) + ' 分';
        };
        tick();
        const id = setInterval(tick, 1000);
        box.addEventListener('unmount', () => clearInterval(id));
      }
    },
    {
      id: 'timer',
      title: '番茄钟',
      desc: '25 分钟一格，干完再摸鱼。',
      mount(box) {
        const wrap = el('div');
        const time = el('div', 'clock mono', '25:00');
        const row = el('div', 'tool-row');
        const start = el('button', 'primary', '开始');
        const reset = el('button', '', '重置');
        row.append(start, reset);
        wrap.append(time, row);
        box.append(wrap);

        let left = 25 * 60, id = null, running = false;
        const draw = () => {
          const m = String(Math.floor(left / 60)).padStart(2, '0');
          const s = String(left % 60).padStart(2, '0');
          time.textContent = m + ':' + s;
        };
        const stop = () => { clearInterval(id); id = null; running = false; start.textContent = '开始'; };
        start.onclick = () => {
          if (running) { stop(); return; }
          running = true; start.textContent = '暂停';
          id = setInterval(() => {
            left--;
            if (left <= 0) { stop(); time.textContent = '时间到'; left = 25 * 60; return; }
            draw();
          }, 1000);
        };
        reset.onclick = () => { stop(); left = 25 * 60; draw(); };
        draw();
        box.addEventListener('unmount', stop);
      }
    },
    {
      id: 'note',
      title: '临时便签',
      desc: '存在浏览器本地，换设备就没了，别放重要东西。',
      mount(box) {
        const ta = el('textarea');
        ta.rows = 6;
        ta.style.width = '100%';
        ta.placeholder = '随手记点啥……';
        const state = el('div', 'meta', '');
        box.append(ta, state);
        const key = 'site.scratchpad';
        ta.value = localStorage.getItem(key) || '';
        const save = () => {
          localStorage.setItem(key, ta.value);
          state.textContent = '已保存 · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
        };
        ta.addEventListener('input', () => { clearTimeout(ta._t); ta._t = setTimeout(save, 400); });
      }
    },
    {
      id: 'dice',
      title: '随机决定',
      desc: '纠结的时候交给它。',
      mount(box) {
        const row = el('div', 'tool-row');
        const input = el('input');
        input.type = 'text';
        input.value = '火锅, 烧烤, 面条, 随便';
        input.style.flex = '1 1 220px';
        const btn = el('button', 'primary', '抽一个');
        const out = el('div', 'out');
        row.append(input, btn);
        box.append(row, out);
        btn.onclick = () => {
          const items = input.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (!items.length) { out.textContent = '空的，抽不出来。'; return; }
          out.textContent = '🎯 ' + items[Math.floor(Math.random() * items.length)];
        };
      }
    },
    {
      id: 'slot',
      title: '+ 新工具槽位',
      desc: '想加什么写进 assets/tools.js，这里就多一张卡。',
      mount(box) {
        box.append(el('div', 'slot', '（空槽位）'));
      }
    }
  ];

  global.SiteTools = { tools };
})(window);
