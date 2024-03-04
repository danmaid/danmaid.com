import './connector.js';
class LoadedEvent extends Event {
    items;
    constructor(type, { items, ...eventInitDict }) {
        super(type, eventInitDict);
        this.items = items;
    }
}
class SyncedEvent extends Event {
    pushed;
    pulled;
    removed;
    constructor(type, { pushed, pulled, removed, ...eventInitDict }) {
        super(type, eventInitDict);
        this.pushed = pushed;
        this.pulled = pulled;
        this.removed = removed;
    }
}
class TabEvent extends Event {
    id;
    info;
    tab;
    constructor(type, { id, info, tab, ...eventInitDict }) {
        super(type, eventInitDict);
        this.id = id;
        this.info = info;
        this.tab = tab;
    }
}
const endpoint = 'https://localhost/views';
const Tab = {
    isTab: (v) => !!v.id
};
class RemoteEvent extends Event {
    path;
    tab;
    id;
    constructor(type, { path, tab, ...init }) {
        super(type, init);
        this.path = path;
        this.tab = tab;
        this.id = tab?.id;
    }
}
class Remote extends EventSource {
    type = 'Remote';
    async getAll() {
        const url = new URL(this.url);
        url.pathname += '/';
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        const items = await res.json();
        return items.map((tab) => ({ path: url.pathname + tab.id, tab }));
    }
    async create(tab) {
        const path = new URL(this.url).pathname + '/' + tab.id;
        return this.update(path, tab);
    }
    async get(path) {
        const url = new URL(path, this.url);
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        return await res.json();
    }
    async update(path, tab) {
        const url = new URL(path, this.url);
        this.dispatchEvent(new RemoteEvent('update', { path: url.pathname, tab }));
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(tab)
        });
        await res.body?.cancel();
    }
    async remove(path) {
        const url = new URL(path, this.url);
        this.dispatchEvent(new RemoteEvent('remove', { path: url.pathname }));
        const res = await fetch(url, { method: 'DELETE' });
        await res.body?.cancel();
    }
    constructor(...args) {
        super(...args);
        this.addEventListener('message', async ({ data: path }) => {
            try {
                const tab = await this.get(path);
                this.dispatchEvent(new RemoteEvent('updated', { path, tab }));
            }
            catch {
                this.dispatchEvent(new RemoteEvent('removed', { path }));
            }
        });
    }
}
const remote = new Remote(endpoint);
const map = new class extends EventTarget {
    type = 'Map';
    map = new Map();
    async load() {
        this.dispatchEvent(new Event('load'));
        const kv = await chrome.storage.local.get(null);
        for (const [k, v] of Object.entries(kv)) {
            const key = parseInt(k);
            const value = parseInt(v);
            this.map.set(!!key ? key : k, !!value ? value : v);
        }
        this.dispatchEvent(new LoadedEvent('loaded', { items: [...this.map] }));
    }
    get(key) {
        return this.map.get(key);
    }
    keys() {
        return this.map.keys();
    }
    delete(key) {
        const result = this.map.delete(key);
        chrome.storage.local.remove(String(key));
        return result;
    }
    has(key) {
        return this.map.has(key);
    }
    set(key, value) {
        this.map.set(key, value);
        this.map.set(value, key);
        this.dispatchEvent(new CustomEvent('set', { detail: [...this.map] }));
        chrome.storage.local.set({ [String(key)]: value, [String(value)]: key });
        return this;
    }
}();
class Tabs extends EventTarget {
    type = 'Tabs';
    constructor() {
        super();
        chrome.tabs.onUpdated.addListener((id, info, tab) => {
            this.dispatchEvent(new TabEvent('updated', { id, info, tab }));
        });
        chrome.tabs.onRemoved.addListener((id, info) => {
            this.dispatchEvent(new TabEvent('removed', { id, info }));
        });
    }
    async update(id, tab) {
        this.dispatchEvent(new Event('update'));
        const old = await chrome.tabs.get(id);
        const change = this.diff(old, tab);
        if (!change)
            return;
        const result = await chrome.tabs.update(id, change);
        this.dispatchEvent(new TabEvent('updated', { id, info: change, tab: result }));
        return result;
    }
    async create(tab) {
        this.dispatchEvent(new Event('create'));
        const result = await chrome.tabs.create({ url: tab.url });
        this.dispatchEvent(new TabEvent('created', { id: result.id, tab: result }));
        return result;
    }
    async getAll() {
        const tabs = await chrome.tabs.query({});
        return tabs.filter(Tab.isTab);
    }
    async remove(id) {
        this.dispatchEvent(new Event('remove'));
        await chrome.tabs.remove(id);
        this.dispatchEvent(new TabEvent('removed', { id }));
    }
    diff(tab, old) {
        const change = {};
        if (old.active !== tab.active)
            change.active = tab.active;
        if (old.autoDiscardable !== tab.autoDiscardable)
            change.autoDiscardable = tab.autoDiscardable;
        if (old.highlighted !== tab.highlighted)
            change.highlighted = tab.highlighted;
        if (old.mutedInfo?.muted !== tab.mutedInfo?.muted)
            change.muted = tab.mutedInfo?.muted;
        if (old.openerTabId !== tab.openerTabId)
            change.openerTabId = tab.openerTabId;
        if (old.pinned !== tab.pinned)
            change.pinned = tab.pinned;
        if (tab.url && old.url !== tab.url)
            change.url = tab.url;
        if (Object.keys(change).length < 1)
            return console.log('no change.');
        return change;
    }
}
const tabs = new Tabs();
remote.addEventListener('update', ({ path, id }) => map.set(path, id));
remote.addEventListener('updated', async ({ path, tab }) => {
    const id = map.get(path);
    if (id)
        tabs.update(id, tab);
    else {
        const { id } = await tabs.create(tab);
        if (!id)
            throw Error('created tab is not have id.');
        map.set(id, path).set(path, id);
    }
});
remote.addEventListener('removed', ({ path }) => {
    const id = map.get(path);
    if (id)
        tabs.remove(id);
});
tabs.addEventListener('updated', ({ id, tab }) => {
    const path = map.get(id);
    path ? remote.update(path, tab) : remote.create(tab);
});
tabs.addEventListener('removed', ({ id }) => {
    const path = map.get(id);
    if (!path)
        return;
    map.delete(id);
    map.delete(path);
    remote.remove(path);
});
// tabs.addEventListener('created', ({id, tab}) => map.set())
addEventListener('wakeup', async () => {
    dispatchEvent(new Event('sync'));
    await map.load();
    const pulled = await pull();
    const pushed = await push();
    const synced = new Set([...pulled, ...pushed]);
    // const removed = [...map.keys()].filter(k => !synced.has(k) && map.delete(k))
    const removed = [];
    dispatchEvent(new SyncedEvent('synced', { pulled, pushed, removed }));
});
async function pull() {
    dispatchEvent(new Event('pull'));
    const items = [];
    for (const { path, tab } of await remote.getAll()) {
        const tabId = map.get(path);
        tabId ? tabs.update(tabId, tab) : tabs.create(tab);
        items.push(path);
    }
    dispatchEvent(new LoadedEvent('pulled', { items }));
    return items;
}
async function push() {
    dispatchEvent(new Event('push'));
    const items = [];
    for (const tab of await tabs.getAll()) {
        if (map.has(tab.id))
            continue;
        remote.create(tab);
        items.push(tab.id);
    }
    dispatchEvent(new LoadedEvent('pushed', { items }));
    return items;
}
dispatchEvent(new Event('wakeup'));
