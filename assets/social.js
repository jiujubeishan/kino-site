/* 社区小功能：资料卡、关注、私信、个人图集。全部落在 Storage，不建表。 */
(function () {
  const BUCKET = 'uploads';
  const storage = () => window.sb.storage.from(BUCKET);
  const publicUrl = (path) => storage().getPublicUrl(path).data.publicUrl;

  async function putJson(path, obj) {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    return storage().upload(path, blob, { contentType: 'application/json' });
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
  async function saveProfile(user) {
    if (!user || !user.id) return;
    const me = window.Profile.of(user);
    const dir = 'social/profiles/' + user.id;
    await putJson(dir + '/' + Date.now() + '.json', {
      name: me.name,
      avatar: me.avatar || '',
      at: new Date().toISOString()
    });
    const files = await ls(dir);
    const olds = files.slice(1).map((f) => dir + '/' + f.name);
    if (olds.length) await storage().remove(olds);
  }

  async function getProfile(uid) {
    const dir = 'social/profiles/' + uid;
    const files = await ls(dir);
    if (!files.length) return { name: '某人', avatar: '' };
    const rec = await readJson(dir + '/' + files[0].name);
    return rec || { name: '某人', avatar: '' };
  }

  // —— 关注 ——
  const followPath = (target, me) => 'social/follows/' + target + '/' + me + '.json';
  const followingPath = (me, target) => 'social/following/' + me + '/' + target + '.json';

  async function isFollowing(target, me) {
    if (!me) return false;
    const files = await ls('social/follows/' + target);
    return files.some((f) => f.name === me + '.json');
  }

  async function follow(target, me) {
    const at = new Date().toISOString();
    await putJson(followPath(target, me), { at });
    await putJson(followingPath(me, target), { at });
  }

  async function unfollow(target, me) {
    await storage().remove([followPath(target, me), followingPath(me, target)]);
  }

  const followersCount = async (uid) => (await ls('social/follows/' + uid)).length;
  const followingCount = async (uid) => (await ls('social/following/' + uid)).length;

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

  async function gallery(uid) {
    const dir = galleryDir(uid);
    const files = await ls(dir);
    return files.map((f) => ({
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

  async function removeGalleryImage(paths) {
    const { error } = await storage().remove(paths);
    return error || null;
  }

  window.Social = {
    publicUrl, readJson, ls,
    saveProfile, getProfile,
    isFollowing, follow, unfollow, followersCount, followingCount,
    sendDM, listDM, dmPeers,
    gallery, addGalleryImage, removeGalleryImage
  };
})();
