# 工具槽位怎么加

工具都在 `assets/tools.js` 的 `tools` 数组里。一条对应页面上一张卡。

## 最小写法

```js
{
  id: 'my-tool',            // 唯一，和别的不重复
  title: '我的工具',
  desc: '一句话说明它是干嘛的。',
  mount(box) {              // box 是这张卡的内容容器
    const btn = document.createElement('button');
    btn.textContent = '点我';
    btn.onclick = () => alert('别点');
    box.appendChild(btn);
  }
}
```

存盘，刷新页面，工具页就多了一张卡。

## 几个约定

1. `mount` 里尽量别用 `innerHTML` 拼用户输入，XSS 不值当。
2. 用 `setInterval` 的一定在 `box` 的 `unmount` 事件里清掉，不然路由切换后还在后台跑。
3. 需要存东西就 `localStorage`，键名统一加个前缀，比如 `site.xxx`。

## 想让我加

说一声要什么工具，我照着这个格式塞进去就行，一分钟的事。
