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
      id: 'reaction',
      title: '反应力测试',
      desc: '点开始，等它变绿立刻点，看你这双手有多快。',
      mount(box) {
        const KEY = 'site.reaction';
        const best = () => Number(localStorage.getItem(KEY) || 0) || 0;
        const pad = el('div', 'reaction-pad', '点一下开始');
        const meta = el('div', 'meta', '');
        const out = el('div', 'out', '');
        box.append(pad, meta, out);

        let state = 'idle'; // idle | waiting | ready
        let t0 = 0;
        let timer = null;
        let tries = 0;

        const showMeta = (last) => {
          const b = best();
          meta.textContent = '最好 ' + (b ? b + ' ms' : '—') + ' · 这次 ' + tries + ' 轮';
          if (last) out.textContent = last;
        };
        showMeta('');

        const toIdle = (text) => {
          clearTimeout(timer);
          state = 'idle';
          pad.className = 'reaction-pad';
          pad.textContent = text || '点一下再来';
        };

        pad.onclick = () => {
          if (state === 'ready') {
            const ms = Date.now() - t0;
            const b = best();
            if (!b || ms < b) localStorage.setItem(KEY, String(ms));
            tries += 1;
            toIdle();
            showMeta('⚡ ' + ms + ' ms' + (!b || ms < b ? '（新纪录）' : ''));
            return;
          }
          if (state === 'waiting') {
            toIdle();
            out.textContent = '抢跑了，等它变绿再点。';
            return;
          }
          // 开始新一轮
          state = 'waiting';
          pad.className = 'reaction-pad waiting';
          pad.textContent = '等它变绿…';
          out.textContent = '';
          timer = setTimeout(() => {
            if (state !== 'waiting') return;
            state = 'ready';
            t0 = Date.now();
            pad.className = 'reaction-pad ready';
            pad.textContent = '点！';
          }, 1200 + Math.random() * 2300);
        };

        box.addEventListener('unmount', () => clearTimeout(timer));
      }
    },
    {
      id: 'keyboard',
      wide: true,
      title: '键盘测试',
      desc: '按下键盘上任意键，这里对应的键位会变绿。',
      mount(box) {
        const ROWS = [
          [['Backquote','`'],['Digit1','1'],['Digit2','2'],['Digit3','3'],['Digit4','4'],['Digit5','5'],['Digit6','6'],['Digit7','7'],['Digit8','8'],['Digit9','9'],['Digit0','0'],['Minus','-'],['Equal','='],['Backspace','Bksp',2]],
          [['Tab','Tab',1.5],['KeyQ','Q'],['KeyW','W'],['KeyE','E'],['KeyR','R'],['KeyT','T'],['KeyY','Y'],['KeyU','U'],['KeyI','I'],['KeyO','O'],['KeyP','P'],['BracketLeft','['],['BracketRight',']'],['Backslash','\\',1.5]],
          [['CapsLock','Caps',1.8],['KeyA','A'],['KeyS','S'],['KeyD','D'],['KeyF','F'],['KeyG','G'],['KeyH','H'],['KeyJ','J'],['KeyK','K'],['KeyL','L'],['Semicolon',';'],['Quote',"'"],['Enter','Enter',2.2]],
          [['ShiftLeft','Shift',2.4],['KeyZ','Z'],['KeyX','X'],['KeyC','C'],['KeyV','V'],['KeyB','B'],['KeyN','N'],['KeyM','M'],['Comma',','],['Period','.'],['Slash','/'],['ShiftRight','Shift',2.4]],
          [['ControlLeft','Ctrl',1.4],['MetaLeft','Win',1.2],['AltLeft','Alt',1.2],['Space','Space',6],['AltRight','Alt',1.2],['MetaRight','Win',1.2],['ControlRight','Ctrl',1.4]]
        ];

        const head = el('div', 'kb-head');
        const big = el('span', 'kb-big mono', '—');
        const info = el('span', 'meta', '点一下键盘区域，然后敲键');
        const mods = el('span', 'meta', '');
        head.append(big, info, mods);

        const kbd = el('div', 'kbd');
        const map = new Map();
        ROWS.forEach((row) => {
          const line = el('div', 'kbd-row');
          row.forEach(([code, label, w]) => {
            const key = el('div', 'kbd-key', label);
            key.dataset.code = code;
            key.style.flex = String(w || 1);
            map.set(code, key);
            line.append(key);
          });
          kbd.append(line);
        });
        kbd.tabIndex = 0;

        const hist = [];
        const histBox = el('div', 'key-log');
        box.append(head, kbd, histBox);

        const paint = (on) => {
          big.textContent = on.label;
          big.classList.toggle('live', true);
          info.textContent = on.code + '  ·  ' + on.info;
          const list = [];
          if (on.ctrlKey) list.push('Ctrl');
          if (on.shiftKey) list.push('Shift');
          if (on.altKey) list.push('Alt');
          if (on.metaKey) list.push('Meta');
          mods.textContent = list.length ? '按住 ' + list.join(' + ') : '';
        };

        const onDown = (e) => {
          e.preventDefault();
          const keyEl = map.get(e.code);
          if (keyEl) keyEl.classList.add('on');
          paint({
            label: e.key === ' ' ? 'Space' : (e.key.length > 1 ? e.key : e.key.toUpperCase()),
            code: e.code || '—',
            info: 'key=' + (e.key === ' ' ? 'Space' : e.key),
            ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey
          });
          const chip = el('span', 'key-chip mono', e.code || e.key);
          histBox.append(chip);
          hist.push(chip);
          while (hist.length > 14) { const old = hist.shift(); old.remove(); }
        };

        const onUp = (e) => {
          const keyEl = map.get(e.code);
          if (keyEl) keyEl.classList.remove('on');
        };

        const reset = () => {
          map.forEach((k) => k.classList.remove('on'));
          big.textContent = '—';
          big.classList.remove('live');
          info.textContent = '点一下键盘区域，然后敲键';
          mods.textContent = '';
          hist.forEach((c) => c.remove());
          hist.length = 0;
        };

        kbd.addEventListener('keydown', onDown);
        kbd.addEventListener('keyup', onUp);
        kbd.onclick = () => kbd.focus();
        const clearBtn = el('button', 'link', '清空');
        clearBtn.onclick = reset;
        const row = el('div', 'tool-row');
        row.append(clearBtn);
        box.append(row);
        box.addEventListener('unmount', () => {
          kbd.removeEventListener('keydown', onDown);
          kbd.removeEventListener('keyup', onUp);
        });
      }
    },    {
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
