"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevServer = void 0;
const Server_1 = require("./Server");
const vite_1 = require("vite");
const express_1 = __importDefault(require("express"));
class DevServer extends Server_1.Server {
    constructor() {
        super();
        this.app = (0, express_1.default)();
        this.vite = (0, vite_1.createServer)({
            root: 'packages/web',
            server: { middlewareMode: 'html' },
        });
        this.vite.then((vite) => this.app.use(vite.middlewares));
    }
    async onrequest(req, res) {
        await super.onrequest(req, res);
        if (res.headersSent)
            return;
        await this.vite;
        this.app(req, res);
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
