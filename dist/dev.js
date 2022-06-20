"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const DevServer_1 = require("./DevServer");
exports.server = new DevServer_1.DevServer();
exports.server.listen(8521, () => {
    console.log(exports.server.address());
});
