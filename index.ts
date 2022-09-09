import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as zlib from 'zlib';
import * as readline from 'readline';
import * as stream from 'stream';

export interface IConnection {
    domain?: string,
    username: string,
    password: string,
    dataSource: string,
    streamName: string,
    subscriptionName: string,
    customerName: string,
}

const cReconnectionDelay = 60000;

export class Client extends stream.Readable {
    private _running = false;
    private _request: http.ClientRequest | null = null;
    private _response: http.IncomingMessage | null = null;
    private _tidReconnect: any;
    public constructor (public connection: IConnection) {
        super({
            objectMode: true,
        });
    }

    public start() {
        if (!this._running) {
            this._running = true;
            this.runStream();
            return true;
        }
        return false;
    }

    public stop() {
        if (this._running) {
            this._running = false;
            clearTimeout(this._tidReconnect);
            if (this._request) {
                this._request.abort();
            }
            return true;
        }
        return false;
    }
    
    public _read() {
        if (this._response && this._response.isPaused()) {
            this._response.resume();
        }
    };

    private runStream() {
        const link = `https://${this.connection.customerName}.${this.connection.domain ? this.connection.domain : 'socialgist.com'}/stream/${this.connection.dataSource}_${this.connection.streamName}/subscription/${this.connection.subscriptionName}/part/1/data.json?keepalivestream=true`
        const parsedURL = url.parse(link);
        const r = (parsedURL.protocol === 'https:') ? https.request : http.request;
        const req = r({
            auth: `${this.connection.username}:${this.connection.password}`,
            protocol: parsedURL.protocol,
            host: parsedURL.hostname,
            port: parsedURL.port ? +parsedURL.port : undefined,
            method: 'GET',
            path: parsedURL.path,
        }, (res) => {
            if (res.statusCode !== 200) {
                this.emit('error', `Invalid response status: ${res.statusCode}`);
            } else {
                this._response = res;
                let decodedRes: stream.Readable;
                const zlibOptions = {
                    flush: zlib.Z_SYNC_FLUSH,
                    finishFlush: zlib.Z_SYNC_FLUSH,
                };
                switch (res.headers['content-encoding']) {
                    case 'gzip':
                        decodedRes = res.pipe(zlib.createGunzip(zlibOptions));
                        break
                    case 'deflate':
                        decodedRes = res.pipe(zlib.createInflate(zlibOptions));
                        break
                    default:
                        decodedRes = res;
                        break;
                }
                const rl = readline.createInterface({
                    input: decodedRes,
                });
                rl.on('line', (line) => {
                    const p = this.push(line);
                    if (p) {
                        if (res.isPaused()) {
                            res.resume();
                        }
                    } else {
                        if (!res.isPaused()) {
                            res.pause();
                        }
                    }
                });
                res.on('close', () => {
                    this._response = null;
                });
            }
        });
        req.on('close', () => {
            this._request = null;
            if (this._running) {
                this.emit('error', 'Connection closed');
                this._tidReconnect = setTimeout(() => this.runStream(), cReconnectionDelay);
            }
        });
        req.end();
        this._request = req;
    }
}
