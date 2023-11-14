process.env.MANAGER = "http://localhost:6901";
import { ManagedServer } from "./ManagedServer";
import { manager } from "./managerServer";
import { RequestListener } from "node:http";

const listner: RequestListener = (req, res) => {
  res.statusCode = 501;
  res.end();
};
const server = new ManagedServer(listner);

manager.listen(6901, () => {
  console.log("manager started. http://localhost:6901");
  server.listen(6900, () => {
    console.log("managed server started. http://localhost:6900");
  });
});
