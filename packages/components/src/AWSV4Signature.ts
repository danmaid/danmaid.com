function stringToBuffer(v: string): Uint8Array {
  return new TextEncoder().encode(v)
}
function bufferToHash(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', buffer)
}
function bufferToHex(v: ArrayBuffer): string {
  return [...new Uint8Array(v)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/**
 * 署名付き AWS API リクエストを作成する
 * https://docs.aws.amazon.com/ja_jp/general/latest/gr/create-signed-request.html
 */
export class AWSV4Signature {
  key: string
  secret: string

  constructor(init: { key: string; secret: string }) {
    this.key = init.key
    this.secret = init.secret
  }

  async sign<T extends Request>(req: T): Promise<T> {
    // 手順 1: 正規リクエストを作成する
    const canonicalRequest = new CanonicalRequest(req)
    console.debug('CanonicalRequest', canonicalRequest)

    // 手順 2: 正規リクエストのハッシュを作成する
    const HashedCanonicalRequest = await canonicalRequest.getHash()
    console.debug('HashedCanonicalRequest', HashedCanonicalRequest)

    // 手順 3: 署名文字列を作成する
    const RequestDateTime = req.headers.get('x-amz-date') || new Date().toISOString().replace(/\.\d{3}|[-:]/g, '')
    const YYYYMMDD = RequestDateTime.slice(0, 8)
    const [service, region] = new URL(req.url).host.split('.')
    const CredentialScope = [YYYYMMDD, region, service, 'aws4_request']
    const StringToSign = ['AWS4-HMAC-SHA256', RequestDateTime, CredentialScope.join('/'), HashedCanonicalRequest].join(
      '\n'
    )
    console.debug('StringToSign', StringToSign)

    // 手順 4: 署名を計算する
    const Signature = bufferToHex(await this.calculate(CredentialScope.concat(StringToSign)))
    console.debug('Signature', Signature)

    // 手順 5: リクエストヘッダーに署名を追加します。
    const Authorization = [
      `AWS4-HMAC-SHA256 Credential=${[this.key].concat(CredentialScope).join('/')}`,
      `SignedHeaders=${canonicalRequest.SignedHeaders}`,
      `Signature=${Signature}`,
    ].join(',')
    console.debug('Authorization', Authorization)
    req.headers.set('Authorization', Authorization)
    return req
  }

  async calculate(data: string[]): Promise<ArrayBuffer> {
    return await data.reduce<Promise<ArrayBuffer>>(
      (a, c) => a.then((v) => this.hash(v, stringToBuffer(c))),
      Promise.resolve(stringToBuffer('AWS4' + this.secret))
    )
  }

  async hash(key: BufferSource, data: BufferSource): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, true, ['sign'])
    return crypto.subtle.sign('HMAC', cryptoKey, data)
  }
}

class CanonicalRequest {
  HTTPMethod: string
  CanonicalUri: string
  CanonicalQueryString: string
  CanonicalHeaders: string
  SignedHeaders: string
  HashedPayload = ''

  constructor(private req: Request) {
    const url = new URL(req.url)
    const keys = Array.from(req.headers.keys()).filter((k) => k.startsWith('x-amz-'))

    this.HTTPMethod = req.method
    this.CanonicalUri = url.pathname
    this.CanonicalQueryString = this.createCanonicalQueryString(url.searchParams)
    this.CanonicalHeaders = [`host:${url.host}\n`, ...keys.map((k) => `${k}:${this.getHeaderValue(k)}\n`)].join('')
    this.SignedHeaders = ['host', ...keys].join(';')
  }

  createCanonicalQueryString(search: URLSearchParams): string {
    return Array.from(search)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .sort()
      .join('&')
  }
  getHeaderValue(key: string): string {
    const replacer = (v: string) => v.trim().replace(/ +/g, ' ')
    return this.req.headers.get(key)?.split(',').map(replacer).join(',') || ''
  }

  toString(): string {
    return [
      this.HTTPMethod,
      this.CanonicalUri,
      this.CanonicalQueryString,
      this.CanonicalHeaders,
      this.SignedHeaders,
      this.HashedPayload,
    ].join('\n')
  }

  async getHash(): Promise<string> {
    const payload = await this.req.clone().arrayBuffer()
    this.HashedPayload = bufferToHex(await bufferToHash(payload))

    const hash = await bufferToHash(stringToBuffer(`${this}`))
    return bufferToHex(hash)
  }
}
