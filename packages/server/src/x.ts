import express from "express";
import { ManagedServer } from "./ManagedServer";

const app = express();
const server = new ManagedServer();
server.listen(6900, () => console.log("listen. http://localhost:6900"));
