"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
class Server extends http_1.default.Server {
    constructor() {
        super();
        this.wss = new ws_1.default.Server({ server: this });
        this.events = [];
        this.clients = [];
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((0, cors_1.default)());
        app.use(express_1.default.static('./packages/web/dist'));
        app.route('*').put((req, res) => this.onPUT(req, res));
        app.get('*.json', (req, res) => this.onGET(req, res));
        this.on('request', app);
        this.on('connection', (socket) => this.clients.push(socket));
        this.app = app;
    }
    async onPUT({ body }, res) {
        this.events.push(body);
        this.wss.clients.forEach((ws) => ws.send(JSON.stringify(body)));
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.sendStatus(200);
    }
    async onGET({ query }, res) {
        const links = query.links;
        const events = typeof links === 'string' ? this.events.filter((v) => v.links?.includes(links)) : this.events;
        res.json(events);
    }
    close(callback) {
        this.clients.forEach((v) => v.destroy());
        return super.close(callback);
    }
}
exports.Server = Server;
