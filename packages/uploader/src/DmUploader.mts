export class DmUploader extends HTMLElement {
  get path(): string {
    const input = this.shadowRoot?.getElementById("path");
    return input instanceof HTMLInputElement ? input.value : "";
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%">
        <form id="form" method="dialog">
          <label style="display: flex; gap: 0.5em">path
            <input id="path" style="flex-grow: 1" />
          </label>
        </form>
        <iframe id="preview" style="flex-grow: 1; pointer-events: none"></iframe>
      </div>
    `;
    this.addEventListener("dragover", (ev) => ev.preventDefault());
    this.addEventListener("drop", (ev) => this.ondrop(ev));
  }

  ondrop = (ev: DragEvent) => {
    ev.preventDefault();
    const file = ev.dataTransfer?.files[0];
    fetch(this.path, { method: "PUT", body: file });
  };
}
