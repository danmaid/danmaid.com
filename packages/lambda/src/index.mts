import type { CloudWatchLogsEvent } from 'aws-lambda'
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { unzip } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { promisify } from 'node:util'

const apiClient = new ApiGatewayManagementApiClient({
  endpoint: 'https://4e5mioaeg0.execute-api.us-east-1.amazonaws.com/production',
})
const ddocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }))

async function getConnections(): Promise<string[]> {
  const command = new ScanCommand({
    TableName: 'danmaid.com-connections',
    ProjectionExpression: 'connectionId',
  })
  const { Items } = await ddocClient.send(command)
  return Items ? Items.map((v) => v.connectionId) : []
}

async function decode(event: CloudWatchLogsEvent): Promise<string> {
  const packed = Buffer.from(event.awslogs.data, 'base64')
  const data = await promisify(unzip)(packed)
  return data.toString('utf-8')
}

async function send(ConnectionId: string, payloads: Uint8Array[]): Promise<void> {
  for (const Data of payloads) {
    const command = new PostToConnectionCommand({ ConnectionId, Data })
    await apiClient.send(command)
  }
  console.log('sent.', ConnectionId)
}

export const handler = async (event: CloudWatchLogsEvent) => {
  const decoded = await decode(event)
  console.log('decoded', decoded)
  const { logEvents } = JSON.parse(decoded) as { logEvents: { timestamp: number }[] }
  logEvents.sort((a, b) => a.timestamp - b.timestamp)
  const payloads = logEvents.map((v) => new TextEncoder().encode(JSON.stringify(v)))

  const connections = await getConnections()
  await Promise.all(connections.map((conn) => send(conn, payloads)))
  return { statusCode: 200 }
}
