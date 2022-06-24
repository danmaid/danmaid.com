"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevServer = void 0;
const Server_1 = require("./Server");
const vite_1 = require("vite");
class DevServer extends Server_1.Server {
    constructor() {
        super();
        this.vite = (0, vite_1.createServer)({
            root: 'packages/web',
            server: { middlewareMode: 'html' },
        });
        this.vite.then((vite) => this.app.use(vite.middlewares));
    }
    close(callback) {
        this.vite.then(async (vite) => {
            await vite.close();
            super.close(callback);
        });
        return this;
    }
}
exports.DevServer = DevServer;
