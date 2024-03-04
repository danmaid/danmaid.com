export declare function decode(stream: ReadableStream<Uint8Array>): Promise<{
    headers: Record<string, string>;
    body: ReadableStream<Uint8Array> | null;
}>;
