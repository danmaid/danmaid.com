import type { CloudWatchLogsEvent } from 'aws-lambda'
import { unzip } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { promisify } from 'node:util'
import { request } from 'node:https'

async function decode(event: CloudWatchLogsEvent): Promise<string> {
  const packed = Buffer.from(event.awslogs.data, 'base64')
  const data = await promisify(unzip)(packed)
  return data.toString('utf-8')
}

export const handler = async (event: CloudWatchLogsEvent) => {
  const decoded = await decode(event)
  console.log('decoded', decoded)
  const { logEvents } = JSON.parse(decoded) as { logEvents: { timestamp: number }[] }
  logEvents.sort((a, b) => a.timestamp - b.timestamp)

  for (const event of logEvents) {
    const req = request('https://danmaid.com/events/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    req.write(JSON.stringify(event))
    await new Promise((r) => req.end(r))
  }

  return { statusCode: 200 }
}
