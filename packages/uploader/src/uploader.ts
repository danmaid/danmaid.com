const iframe = document.querySelector("iframe");
if (!(iframe instanceof HTMLIFrameElement)) throw Error("iframe not found.");
iframe.src = location.href;

const activator = document.querySelector('input[type="checkbox"]');
if (!(activator instanceof HTMLInputElement))
  throw Error("activator not found.");
activator.addEventListener("change", async () => {
  const registration = await (activator.checked ? register() : unregister());
  const w = registration?.installing || registration?.waiting;
  if (w) await new Promise((r) => w.addEventListener("statechange", r));
  location.reload();
});

const file = document.querySelector('input[type="file"]');
if (!(file instanceof HTMLInputElement)) throw Error("file not found.");
file.addEventListener("change", () => {
  if (!file.files?.[0]) return;
  fetch(location.href, { method: "PUT", body: file.files[0] });
});

const type = document.getElementById("type");
if (!(type instanceof HTMLElement)) throw Error("type not found.");
navigator.serviceWorker.addEventListener("message", (ev) => {
  console.log(ev.data);
  type.textContent = `${ev.data.status} ${ev.data.statusText} ${ev.data.type}`;
});

navigator.serviceWorker.ready.then(() => {
  activator.checked = navigator.serviceWorker.controller?.state === "activated";
});

async function register() {
  return await navigator.serviceWorker.register("./service-worker.mjs", {
    type: "module",
    updateViaCache: "none",
  });
}
async function unregister() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) await registration.unregister();
  return registration;
}
