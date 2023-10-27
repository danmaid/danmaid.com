import {
  STSClient,
  AssumeRoleWithWebIdentityCommand,
} from "@aws-sdk/client-sts";
import { get } from "node:https";

export async function assumeRole(idToken: string): Promise<{
  Credentials: {
    AccessKeyId: string;
    SecretAccessKey: string;
    SessionToken: string;
  };
}> {
  const client = new STSClient();
  const command = new AssumeRoleWithWebIdentityCommand({
    RoleArn: "arn:aws:iam::090737628813:role/xxxx",
    RoleSessionName: "xxxx",
    WebIdentityToken: idToken,
  });
  return (await client.send(command)) as Awaited<any>;
}

export async function getSigninToken(auth: {
  sessionId: string;
  sessionKey: string;
  sessionToken: string;
}): Promise<{ SigninToken: string }> {
  const url = new URL("https://signin.aws.amazon.com/federation");
  url.searchParams.set("Action", "getSigninToken");
  url.searchParams.set("Session", JSON.stringify(auth));
  return await new Promise((resolve, reject) => {
    get(url, { headers: { accept: "application/json" } }, (res) => {
      res.setEncoding("utf-8");
      let rawData = "";
      res.on("data", (chunk) => (rawData += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (err) => reject(err));
  });
}
