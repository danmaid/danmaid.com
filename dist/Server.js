"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
class Server extends http_1.default.Server {
    constructor() {
        super();
        this.wss = new ws_1.default.Server({ server: this });
        this.events = [];
        this.clients = [];
        this.on('request', this.onrequest);
        this.on('connection', (socket) => this.clients.push(socket));
    }
    async onrequest(req, res) {
        const body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => (data += chunk));
            req.on('end', () => resolve(data));
        });
        if (req.method === 'PUT') {
            this.events.push(JSON.parse(body));
            this.wss.clients.forEach((ws) => ws.send(body));
            res.writeHead(200).end();
            return;
        }
        if (req.method === 'GET' && req.url?.endsWith('.json')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.events));
            return;
        }
    }
    close(callback) {
        this.clients.forEach((v) => v.destroy());
        return super.close(callback);
    }
}
exports.Server = Server;
