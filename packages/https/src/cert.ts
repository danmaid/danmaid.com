import { generateKeyPair } from "node:crypto";
import { promisify } from "node:util";
import { sign } from "./ACME";
import { createCSR } from "./openssl";

type PEM = string | Buffer;

interface Certificate {
  cert: PEM;
  key: PEM;
}

export async function createCertificate(
  hostname: string
): Promise<Certificate> {
  const pair = await promisify(generateKeyPair)("rsa", { modulusLength: 2048 });
  const csr = await createCSR(hostname, pair.privateKey);
  const cert = await sign(hostname, csr);
  const key = pair.privateKey.export({ format: "pem", type: "pkcs8" });
  console.log("certificate created.");
  return { cert, key };
}
