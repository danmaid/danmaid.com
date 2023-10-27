import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createIDToken } from "./auth";
import { assumeRole, getSigninToken } from "./aws";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log(event);
  if (!event.requestContext.http.sourceIp.startsWith("2400:4052:2962:5e00")) {
    return { statusCode: 401 };
  }
  const token = await createIDToken();
  const result = await assumeRole(token);
  const { SigninToken } = await getSigninToken({
    sessionId: result.Credentials.AccessKeyId,
    sessionKey: result.Credentials.SecretAccessKey,
    sessionToken: result.Credentials.SessionToken,
  });

  const url = new URL("https://signin.aws.amazon.com/federation");
  url.searchParams.set("Action", "login");
  url.searchParams.set("Issuer", "https://danmaid.com");
  url.searchParams.set("Destination", "https://console.aws.amazon.com/");
  url.searchParams.set("SigninToken", SigninToken);
  return { statusCode: 302, headers: { Location: url.toString() } };
};

(handler as any)({}).then((v: any) => console.log(v));
