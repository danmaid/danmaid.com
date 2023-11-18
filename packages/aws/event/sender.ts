import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const client = new EventBridgeClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const DetailType = "bare";
  const Detail = JSON.stringify({ event, context });
  const res = await client.send(
    new PutEventsCommand({ Entries: [{ Detail, DetailType }] })
  );
  console.log(res);
  return { statusCode: 202 };
};
