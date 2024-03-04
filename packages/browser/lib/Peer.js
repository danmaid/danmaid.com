export class Peer extends EventTarget {
    update(key, value) {
        this.dispatchEvent(new UpdatedEvent('updated', { key, value }));
    }
    remove(key) {
        this.dispatchEvent(new RemovedEvent('removed', { key }));
    }
    load(items = []) {
        this.dispatchEvent(new LoadedEvent('loaded', { items }));
    }
}
class UpdatedEvent extends Event {
    key;
    value;
    constructor(type, { key, value, ...init }) {
        super(type, init);
        this.key = key;
        this.value = value;
    }
}
class RemovedEvent extends Event {
    key;
    constructor(type, { key, ...init }) {
        super(type, init);
        this.key = key;
    }
}
class LoadedEvent extends Event {
    items;
    constructor(type, { items, ...init }) {
        super(type, init);
        this.items = items;
    }
}
