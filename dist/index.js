"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const Server_1 = require("./Server");
exports.server = new Server_1.Server();
exports.server.listen(8520, () => {
    console.log(exports.server.address());
});
