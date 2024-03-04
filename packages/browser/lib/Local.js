import { Peer } from "./Peer";
export class Local extends Peer {
    async load() {
        const tabs = await chrome.tabs.query({});
        const items = tabs
            .filter((v) => typeof v.id === 'number')
            .map((v) => [v.id, v]);
        super.load(items);
    }
    async update(tabId, tab) {
        const old = await chrome.tabs.get(tabId);
        const change = this.diff(tab, old);
        if (!change)
            return;
        const result = await chrome.tabs.update(tabId, change);
        super.update(tabId, result);
    }
    async remove(tabId) {
        await chrome.tabs.remove(tabId);
        super.remove(tabId);
    }
    async create({ url }) {
        const tab = await chrome.tabs.create({ url });
        if (tab.id)
            super.update(tab.id, tab);
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
