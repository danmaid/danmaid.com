"use strict";
const ports = new Set();
const events = new class extends Set {
    add(value) {
        const payload = this.serialize(value);
        if (send(payload))
            return this;
        return super.add(payload);
    }
    serialize(ev) {
        const { timeStamp, type, target, data, isTrusted, detail, ...rest } = ev;
        return {
            timeStamp: timeStamp || performance.now(),
            type,
            isTrusted,
            target,
            data,
            detail,
            ...rest,
        };
    }
};
events.add(new CustomEvent('origin', { detail: performance.timeOrigin }));
globalThis.Event = class extends Event {
    timeStamp = performance.now();
};
globalThis.EventTarget = class extends EventTarget {
    dispatchEvent(event) {
        const result = super.dispatchEvent(event);
        events.add(event);
        return result;
    }
};
globalThis.EventSource = class extends EventSource {
    dispatchEvent(event) {
        const result = super.dispatchEvent(event);
        events.add(event);
        return result;
    }
    constructor(...args) {
        super(...args);
        this.addEventListener('open', (ev) => events.add(ev));
        this.addEventListener('error', (ev) => events.add(ev));
        this.addEventListener('message', (ev) => events.add(ev));
    }
    toJSON() {
        return `EventSource: ${this.url} ${this.readyState}`;
    }
};
globalThis.dispatchEvent = new Proxy(dispatchEvent, {
    apply(target, thisArg, argArray) {
        events.add(argArray[0]);
        return Reflect.apply(target, thisArg, argArray);
    },
});
chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener((port) => ports.delete(port));
    for (const ev of events)
        port.postMessage(ev);
    events.clear();
    ports.add(port);
    dispatchEvent(new Event('connected'));
    console.log('port', port);
});
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.update({ url: 'index.html' });
});
function send(ev) {
    if (ports.size < 1)
        return false;
    for (const port of ports)
        port.postMessage(ev);
    console.log('sent', ev, ports);
    return true;
}
