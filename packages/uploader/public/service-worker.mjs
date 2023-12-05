self.addEventListener("fetch", async (ev) => {
    if (ev.request.destination === "iframe") {
        const res = fetch(ev.request);
        ev.respondWith(res);
        const meta = await getMeta(res);
        const type = (await res).headers.get("Content-Type");
        if (type) {
            const clients = await self.clients.matchAll();
            clients.forEach((v) => v.postMessage(meta));
        }
        return console.log("request by iframe. ignore.");
    }
    if (ev.request.method !== "GET")
        return console.log("method !== GET. ignore.");
    if (ev.request.url.endsWith("uploader.html") ||
        ev.request.url.endsWith("uploader.js") ||
        ev.request.url.endsWith("uploader.css"))
        return console.log("uploader ignore.");
    ev.respondWith(fetch("uploader.html"));
});
self.addEventListener("fetch", async (ev) => console.log("fetch", ev));
async function getMeta(res) {
    const x = await res;
    return {
        status: x.status,
        statusText: x.statusText,
        type: x.headers.get("content-type"),
    };
}
export {};
