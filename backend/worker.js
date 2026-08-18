import { createApp } from './app.js';
import connectDB from './database/connection.js';

// Initialize Express app
const app = createApp();

/**
 * Cloudflare Worker ES Module Export Handler
 */
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Ensure database connection is established before processing API / health requests
        if (url.pathname.startsWith('/api') || url.pathname === '/health') {
            try {
                if (env && env.MONGODB_URI) {
                    await connectDB(env.MONGODB_URI);
                } else if (process.env.MONGODB_URI) {
                    await connectDB(process.env.MONGODB_URI);
                }
            } catch (dbErr) {
                console.error('Worker Database connection error:', dbErr.message);
                return new Response(JSON.stringify({ error: 'Database connection failure', status: 'error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Bridge Cloudflare Workers Fetch Request to Express App (nodejs_compat supported)
            return handleExpressRequest(app, request);
        }

        // If ASSETS binding is available (Cloudflare Workers Static Assets), serve static file
        if (env && env.ASSETS) {
            return env.ASSETS.fetch(request);
        }

        return new Response('Not Found', { status: 404 });
    }
};

/**
 * Converts standard Web Fetch Request to Node/Express compatible stream and returns Fetch Response
 */
async function handleExpressRequest(expressApp, request) {
    const { EventEmitter } = await import('node:events');
    const { Readable } = await import('node:stream');

    const url = new URL(request.url);

    // Create a mock IncomingMessage
    const reqStream = new Readable({
        read() {}
    });

    // Populate request body if present
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        const bodyBuffer = await request.arrayBuffer();
        if (bodyBuffer.byteLength > 0) {
            reqStream.push(Buffer.from(bodyBuffer));
        }
    }
    reqStream.push(null);

    const req = Object.assign(reqStream, {
        url: url.pathname + url.search,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        rawHeaders: Array.from(request.headers.entries()).flat(),
        httpVersion: '1.1',
        httpVersionMajor: 1,
        httpVersionMinor: 1,
        socket: {
            remoteAddress: request.headers.get('cf-connecting-ip') || '127.0.0.1',
            encrypted: url.protocol === 'https:'
        },
        connection: {
            remoteAddress: request.headers.get('cf-connecting-ip') || '127.0.0.1',
            encrypted: url.protocol === 'https:'
        }
    });

    // Create a mock ServerResponse
    const resEmitter = new EventEmitter();
    const responseHeaders = new Headers();
    let statusCode = 200;
    let statusMessage = 'OK';
    const responseChunks = [];

    const res = Object.assign(resEmitter, {
        statusCode: 200,
        statusMessage: 'OK',
        headersSent: false,
        getHeader(name) {
            return responseHeaders.get(name);
        },
        setHeader(name, value) {
            if (Array.isArray(value)) {
                responseHeaders.delete(name);
                value.forEach(v => responseHeaders.append(name, v));
            } else {
                responseHeaders.set(name, value);
            }
        },
        removeHeader(name) {
            responseHeaders.delete(name);
        },
        writeHead(status, message, headers) {
            if (typeof message === 'object' && !headers) {
                headers = message;
                message = undefined;
            }
            statusCode = status;
            if (message) statusMessage = message;
            if (headers) {
                for (const [k, v] of Object.entries(headers)) {
                    this.setHeader(k, v);
                }
            }
            this.headersSent = true;
            return this;
        },
        write(chunk) {
            if (chunk) {
                responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return true;
        },
        end(chunk) {
            if (chunk) {
                responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            statusCode = res.statusCode || statusCode;
            this.headersSent = true;
            this.emit('finish');
            return this;
        }
    });

    return new Promise((resolve) => {
        res.on('finish', () => {
            const body = responseChunks.length > 0 ? Buffer.concat(responseChunks) : null;
            resolve(new Response(body, {
                status: statusCode,
                statusText: statusMessage,
                headers: responseHeaders
            }));
        });

        // Pass to Express
        expressApp(req, res);
    });
}
