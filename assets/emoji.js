/* 写东西时插表情：一排常用 emoji + 站点里的表情包（插成 Markdown 图片）。 */
(function () {
  const EMOJIS = [
    '😀', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂',
    '😉', '😍', '🥰', '😘', '😜', '🤪', '😝', '🤗', '🤔', '😐',
    '😴', '😪', '😵', '🥴', '😎', '🤓', '🥳', '😭', '😢', '😤',
    '😡', '🤯', '😱', '🥶', '🤠', '👻', '💩', '💖', '✨', '🔥',
    '👍', '👎', '👌', '✌️', '🙏', '💪', '👀', '🎉', '☕', '🍜'
  ];

  const STICKERS = [
    'aba.png', 'aha_bear.gif', 'baiyan-kT75rDqk.webp', 'bixin-CMl21JyX.webp',
    'blank_rabbit.gif', 'blob_smile.gif', 'chigua-Dr5SOY84.webp', 'chongbai-CpiarjbP.webp',
    'cup_bear.gif', 'dai.jpg', 'daxiao-DcUKQAo5.webp', 'dianzan-BT677ear.webp',
    'duckhead_bear.gif', 'goutou-BqK0KFKQ.webp', 'happy_bunny.gif', 'kelian-CrG2mT2T.webp',
    'pout_baby.gif', 'shengqi-DmApGEbc.webp', 'shuijiao-DQ0Eer6R.webp', 'touxiao-CwFC4C8R.webp',
    'wuzui-B8aFE0W6.webp', 'xu-BHSU3ugy.webp', 'zanshang-DczxsKQQ.webp'
  ];

  function insertAt(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    const pos = start + text.length;
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
  }

  function build() {
    const pop = document.createElement('div');
    pop.className = 'emoji-pop';
    pop.hidden = true;
    pop.innerHTML = `
      <div class="emoji-tabs">
        <button class="tab on" data-tab="emoji">表情</button>
        <button class="tab" data-tab="sticker">表情包</button>
      </div>
      <div class="emoji-pane" data-pane="emoji">
        ${EMOJIS.map((e) => `<button class="emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
      </div>
      <div class="emoji-pane" data-pane="sticker" hidden>
        ${STICKERS.map((f) => `<button class="sticker-btn" data-sticker="${f}"><img loading="lazy" src="assets/stickers/${f}" alt=""></button>`).join('')}
      </div>
    `;
    return pop;
  }

  function attach(button, textarea) {
    if (!button || !textarea) return;
    const pop = build();
    const parent = button.parentNode;
    // 同一个按钮重复挂载时，先清掉旧面板，避免出现两份叠在一起
    parent.querySelectorAll(':scope > .emoji-pop').forEach((el) => el.remove());
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.insertBefore(pop, button.nextSibling);

    const close = () => { pop.hidden = true; };
    button.onclick = (e) => {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
    };
    pop.onclick = (e) => {
      e.stopPropagation();
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        pop.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('on', t === tab));
        pop.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
        return;
      }
      const emo = e.target.closest('[data-emoji]');
      if (emo) { insertAt(textarea, emo.dataset.emoji); return; }
      const st = e.target.closest('[data-sticker]');
      if (st) {
        insertAt(textarea, `![](assets/stickers/${st.dataset.sticker})`);
        close();
      }
    };
    document.addEventListener('click', (e) => {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== button) close();
    });
  }

  window.EmojiPicker = { attach };
})();
