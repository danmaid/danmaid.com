import {
  KeyObject,
  constants,
  generateKeyPair,
  createHash,
  sign as cryptoSign,
  KeyPairKeyObjectResult,
} from "node:crypto";
import { promisify } from "node:util";
import { Server } from "node:http";

const _fetch = fetch;
globalThis.fetch = (...args) => {
  const fetch = _fetch(...args);
  fetch.then((res) =>
    console.debug("fetch", res.url, res.status, res.statusText)
  );
  return fetch;
};

if (!process.env.DIRECTORY_URL) throw Error("env DIRECTORY_URL not found.");
const directoryUrl = process.env.DIRECTORY_URL;

export async function sign(hostname: string, csr: Buffer): Promise<string> {
  const transport = await createTransport();

  const server = new Http01Server(transport.publicKey);
  await new Promise<void>((r) => server.listen(80, r));

  const res = await transport.request(transport.directory.newOrder, {
    identifiers: [{ type: "dns", value: hostname }],
  });
  const orderUrl = res.headers.get("location");
  if (!orderUrl) throw Error("orderUrl not found.");
  const order = (await res.json()) as Order;

  for (const url of order.authorizations) {
    const res = await transport.request(url);
    const auth = (await res.json()) as Authorization;
    for (const v of auth.challenges.filter((v) => v.type === "http-01")) {
      server.tokens.add(v.token);
      await transport.request(v.url, {});
    }
  }

  for (let i = 0; i < 10; i++) {
    const res = await transport.request(orderUrl);
    const order = (await res.json()) as Order;
    if (order.status === "ready") break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  const certUrl = await transport
    .request(order.finalize, { csr: csr.toString("base64url") })
    .then(async (res) => {
      const order = (await res.json()) as Order;
      if (order.certificate) return order.certificate;
      const retryAfter = res.headers.get("retry-after");
      const location = res.headers.get("location");
      if (retryAfter && location) {
        await new Promise((r) => setTimeout(r, parseInt(retryAfter) * 1000));
        const res = await transport.request(location);
        const order = (await res.json()) as Order;
        if (order.certificate) return order.certificate;
      }
      throw Error("finalize failed.");
    });

  const cert = (await transport.request(certUrl)).text();
  server.close();
  return cert;
}

let accountKey: KeyPairKeyObjectResult | undefined;
async function createTransport(): Promise<Transport> {
  const dir = (await fetch(directoryUrl).then((res) =>
    res.json()
  )) as Directory;
  const pair =
    accountKey ||
    (accountKey = await promisify(generateKeyPair)("ec", {
      namedCurve: "P-256",
    }));
  let nonce = await fetch(dir.newNonce, { method: "HEAD" }).then((res) =>
    res.headers.get("replay-nonce")
  );

  async function request(u: string, h: object, p?: object): Promise<Response> {
    const res = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/jose+json" },
      body: serialize(pair.privateKey, h, p),
    });
    const replayNonce = res.headers.get("replay-nonce");
    if (!replayNonce) throw Error("replay-nonce not found.");
    nonce = replayNonce;
    return res;
  }

  const url = dir.newAccount;
  const jwk = pair.publicKey.export({ format: "jwk" });
  const payload = { termsOfServiceAgreed: true };
  const res = await request(url, { alg: "ES256", nonce, url, jwk }, payload);
  const kid = res.headers.get("location");
  await res.json();

  return {
    request: async (url: string, payload?: object): Promise<Response> =>
      await request(url, { alg: "ES256", nonce, url, kid }, payload),
    directory: dir,
    publicKey: pair.publicKey,
  };
}

function serialize(key: KeyObject, header: object, payload?: object): string {
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const p = payload
    ? Buffer.from(JSON.stringify(payload)).toString("base64url")
    : "";
  const s = cryptoSign(undefined, Buffer.from(`${h}.${p}`), {
    key,
    padding: constants.RSA_PKCS1_PADDING,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return JSON.stringify({ protected: h, payload: p, signature: s });
}

class Http01Server extends Server {
  tokens = new Set<string>();

  constructor(publicKey: KeyObject) {
    const jwk = publicKey.export({ format: "jwk" });
    const r = JSON.stringify(jwk, Object.keys(jwk).sort());
    const thumbprint = createHash("sha256").update(r).digest("base64url");

    super((req, res) => {
      const token = req.url?.match(/([^\/]+)$/)?.[1];
      if (!token || !this.tokens.has(token)) return res.writeHead(404).end();
      res.end(`${token}.${thumbprint}`);
    });

    super.on("request", (req, res) =>
      console.log(`Http01: ${req.method} ${req.url} => ${res.statusCode}`)
    );
  }
}

interface Transport {
  request(url: string, payload?: object): Promise<Response>;
  directory: Directory;
  publicKey: KeyObject;
}

export interface Order {
  status: "invalid" | "pending" | "ready" | "processing" | "valid";
  expires?: string; // RFC3339
  identifiers: { type: "dns"; value: string }[];
  notBefore?: string; // RFC3339
  notAfter?: string; // RFC3339
  error?: object;
  authorizations: string[];
  finalize: string;
  certificate?: string;
}

export interface Authorization {
  identifier: { type: "dns"; value: string };
  status:
    | "pending"
    | "valid"
    | "invalid"
    | "deactivated"
    | "expired"
    | "revoked";
  expires?: string;
  challenges: Challenge[];
  wildcard?: boolean;
}

export interface Challenge {
  type: string;
  url: string;
  status: "pending" | "processing" | "valid" | "invalid";
  token: string;
}

export interface Directory {
  newNonce: string;
  newAccount: string;
  newOrder: string;
  newAuthz?: string;
  revokeCert: string;
  keyChange: string;
  meta?: {
    termsOfService?: string;
    website?: string;
    caaIdentities?: string[];
    externalAccountRequired?: boolean;
  };
}
