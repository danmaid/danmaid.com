import("./DmUploader.mjs").then((v) => {
  customElements.define("dm-uploader", v.DmUploader);
});
