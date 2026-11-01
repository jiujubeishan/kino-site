/* 社区小功能：资料卡、关注、私信、个人图集。全部落在 Storage，不建表。 */
(function () {
  const BUCKET = 'uploads';
  const storage = () => window.sb.storage.from(BUCKET);
  const publicUrl = (path) => storage().getPublicUrl(path).data.publicUrl;

  async function putJson(path, obj) {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    return storage().upload(path, blob, { contentType: 'application/json', upsert: true });
  }

  async function readJson(path) {
    try {
      const res = await fetch(publicUrl(path), { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function ls(dir) {
    const { data, error } = await storage().list(dir, {
      limit: 200,
      sortBy: { column: 'name', order: 'desc' }
    });
    if (error) return [];
    return (data || []).filter((f) => f.name);
  }

  // —— 资料卡（改名/换头像时同步一份公开的） ——
  // 存储策略没有 update 权限，同路径写第二次会 400，所以改成"每次追加一个新文件，读最新一个"
  async function saveProfile(user) {
    if (!user || !user.id) return null;
    const me = window.Profile.of(user);
    const stamp = Date.now();
    const name = stamp + '-' + Math.random().toString(36).slice(2, 8) + '.json';
    const res = await putJson('social/profiles/' + user.id + '/' + name, {
      name: me.name,
      avatar: me.avatar || '',
      at: new Date(stamp).toISOString()
    });
    return res && res.error ? res.error : null;
  }

  async function getProfile(uid) {
    // 新写法：目录里按文件名（时间戳）倒序取最新
    const dir = 'social/profiles/' + uid;
    const files = await ls(dir);
    for (const f of files.slice(0, 3)) {
      const rec = await readJson(dir + '/' + f.name);
      if (rec && rec.name) return rec;
    }
    // 兼容早期的单文件写法
    const single = await readJson('social/profiles/' + uid + '.json');
    if (single && single.name) return single;
    return { name: '某人', avatar: '' };
  }

  // —— 关注 ——
  const followPath = (target, me) => 'social/follows/' + target + '/' + me + '.json';
  const followingPath = (me, target) => 'social/following/' + me + '/' + target + '.json';

  // 关注关系用只追加的小文件表示：<uid>__f|u__<时间戳>.json，同一个人的最新一条算数。
  // 只靠 insert 权限就能“取消关注”，不需要 delete/update 策略。
  const stateName = (uid, on) => uid + '__' + (on ? 'f' : 'u') + '__' + Date.now() + '.json';
  const parseState = (name) => {
    const m = /^(.*?)__(f|u)__(\d+)\.json$/.exec(name);
    if (!m) return { uid: name.replace(/\.json$/, ''), on: true, ts: 0 }; // 早期写法
    return { uid: m[1], on: m[2] === 'f', ts: Number(m[3]) };
  };

  async function latestState(dir) {
    const files = await ls(dir);
    const map = new Map();
    files.forEach((f) => {
      const s = parseState(f.name);
      const cur = map.get(s.uid);
      if (!cur || s.ts > cur.ts) map.set(s.uid, s);
    });
    return map;
  }

  async function isFollowing(target, me) {
    if (!me) return false;
    const map = await latestState('social/follows/' + target);
    const rec = map.get(me);
    return !!(rec && rec.on);
  }

  async function follow(target, me) {
    await putJson('social/follows/' + target + '/' + stateName(me, true), { uid: me, on: true, at: new Date().toISOString() });
    await putJson('social/following/' + me + '/' + stateName(target, true), { uid: target, on: true, at: new Date().toISOString() });
  }

  async function unfollow(target, me) {
    await putJson('social/follows/' + target + '/' + stateName(me, false), { uid: me, on: false, at: new Date().toISOString() });
    await putJson('social/following/' + me + '/' + stateName(target, false), { uid: target, on: false, at: new Date().toISOString() });
  }

  async function followersCount(uid) {
    const map = await latestState('social/follows/' + uid);
    return [...map.values()].filter((x) => x.on).length;
  }
  async function followingCount(uid) {
    const map = await latestState('social/following/' + uid);
    return [...map.values()].filter((x) => x.on).length;
  }
  // —— 私信 ——
  const pairKey = (a, b) => [a, b].sort().join('__');

  async function sendDM(fromUser, toId, text) {
    const now = new Date().toISOString();
    const stamp = Date.now();
    const me = fromUser.id;
    const path = 'social/dm/' + pairKey(me, toId) + '/' + stamp + '_' + me.slice(0, 8) + '.json';
    await putJson(path, { uid: me, text, at: now });
    const brief = text.slice(0, 60);
    await putJson('social/dm-index/' + me + '/' + stamp + '_' + toId + '.json', { peer: toId, text: brief, at: now });
    await putJson('social/dm-index/' + toId + '/' + stamp + '_' + me + '.json', { peer: me, text: brief, at: now });
  }

  async function listDM(a, b) {
    const dir = 'social/dm/' + pairKey(a, b);
    const files = await ls(dir);
    const recs = await Promise.all(files.map((f) => readJson(dir + '/' + f.name)));
    return recs.filter(Boolean).sort((x, y) => (x.at < y.at ? -1 : 1));
  }

  async function dmPeers(uid) {
    const dir = 'social/dm-index/' + uid;
    const files = await ls(dir);
    const recs = await Promise.all(files.map((f) => readJson(dir + '/' + f.name)));
    const map = new Map();
    recs.filter(Boolean)
      .sort((x, y) => (x.at < y.at ? 1 : -1))
      .forEach((r) => { if (r.peer && !map.has(r.peer)) map.set(r.peer, r); });
    return [...map.values()];
  }

  // —— 个人图集 ——
  const galleryDir = (uid) => 'social/gallery/' + uid;

  // 删图不改权限：往 social/hidden/<uid>/ 记一条，列表时过滤掉
  async function hiddenNames(uid) {
    const dir = 'social/hidden/' + uid;
    const files = await ls(dir);
    const recs = await Promise.all(files.map((f) => readJson(dir + '/' + f.name)));
    const set = new Set();
    recs.forEach((r) => { if (r && r.name) set.add(r.name); });
    return set;
  }

  async function gallery(uid) {
    const dir = galleryDir(uid);
    const [files, hidden] = await Promise.all([ls(dir), hiddenNames(uid)]);
    return files.filter((f) => !hidden.has(f.name)).map((f) => ({
      name: f.name,
      path: dir + '/' + f.name,
      url: publicUrl(dir + '/' + f.name),
      size: (f.metadata && f.metadata.size) || 0
    }));
  }

  async function addGalleryImage(user, file) {
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = galleryDir(user.id) + '/' + Date.now() + '_' + safe;
    const { error } = await storage().upload(path, file, { contentType: file.type || undefined });
    return error || null;
  }

  async function hideGalleryImage(uid, name) {
    const { error } = await putJson('social/hidden/' + uid + '/' + Date.now() + '.json', { name });
    return error || null;
  }

  window.Social = {
    publicUrl, readJson, ls,
    saveProfile, getProfile,
    isFollowing, follow, unfollow, followersCount, followingCount,
    sendDM, listDM, dmPeers,
    gallery, addGalleryImage, hideGalleryImage
  };
})();
