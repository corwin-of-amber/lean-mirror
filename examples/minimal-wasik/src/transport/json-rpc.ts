import { AsyncQueue } from '../infra/streams';


class JSONRPCTransportStream {
    td = new TextDecoder();
    incoming = new AsyncQueue<string>()

    buf = new Buf(1 << 25)

    digest(chunk: Uint8Array) {
        this.buf.push(chunk);
        for (let msg of this.splitResponses()) {
            this.incoming.push(this.td.decode(msg));
        }
    }

    async digestStream(stream: ReadableStream<any>) {
        let reader = stream.getReader();
        while (true) {
            let chunk = await reader.read();
            if (chunk.done) break;
            this.digest(chunk.value);
        }
        this.incoming.end();
    }

    *splitResponses() {
        let buf = this.buf;
        while (true) {
            let hdr = this.td.decode(buf.data.slice(0, buf.data.indexOf(10) + 4));
            let mo = hdr.match(/^Content-Length:\s*(\d+)\r\n\r\n/);
            if (mo && mo[1]) {
                let start = mo[0].length, end = start + +mo[1];
                if (end <= buf.len) {
                    yield buf.pull(start, end);
                }
                else break;
            }
            else break;
        }
    }

    parseResponse(payload: Uint8Array): object {
        return JSON.parse(this.td.decode(payload));
    }

    formatMessage(msg: string | object) {
        let s = typeof msg === 'string' ? msg : JSON.stringify(msg),
            byteLength = new TextEncoder().encode(s).length;
        return `Content-Length: ${byteLength}\r\n\r\n${s}`;
    }    
}


class Buf {
    data: Uint8Array
    len = 0

    constructor(capacity: number) {
        this.data = new Uint8Array(capacity);
    }

    push(chunk: Uint8Array) {
        if (chunk.length + this.len > this.data.length)
            throw new Error("buffer overflow");
        this.data.set(chunk, this.len);
        this.len += chunk.length;
    }

    pull(start: number, end: number) {
        if (end > this.len)
            throw new Error("buffer undeflow");
        let v = this.data.slice(start, end);
        this.data.set(this.data.subarray(end, this.len));
        this.len -= end;
        return v;
    }
}

export { JSONRPCTransportStream }