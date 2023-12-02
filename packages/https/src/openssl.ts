import { exec } from "node:child_process";
import { KeyObject } from "node:crypto";
import { promisify } from "node:util";

export async function createCSR(
  hostname: string,
  privateKey: KeyObject
): Promise<Buffer> {
  const proc = promisify(exec)(
    `cat | openssl req -outform DER -new -key /dev/stdin -keyform DER -subj "/CN=${hostname}"`,
    { encoding: "buffer" }
  );
  proc.child.stdin?.end(privateKey.export({ format: "der", type: "pkcs8" }));
  return (await proc).stdout;
}
