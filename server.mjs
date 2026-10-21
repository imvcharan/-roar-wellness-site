import { createServer } from "node:http";
import next from "next";
import { prettyHtmlHead } from "./lib/pretty-html-head.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const portArgumentIndex = process.argv.findIndex((argument) => argument === "--port" || argument === "-p");
const configuredPort = portArgumentIndex >= 0 ? process.argv[portArgumentIndex + 1] : undefined;
const port = Number.parseInt(process.env.PORT || configuredPort || "3000", 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function installHtmlHeadFormatter(response) {
  const originalWrite = response.write.bind(response);
  const originalEnd = response.end.bind(response);
  let isHtml;
  let headWritten = false;
  let pendingChunks = [];
  let pendingCallbacks = [];

  const detectHtml = () => {
    const contentType = response.getHeader("content-type");
    isHtml = typeof contentType === "string" && contentType.toLowerCase().includes("text/html");
    return isHtml;
  };

  const chunkToBuffer = (chunk, encoding) => {
    if (Buffer.isBuffer(chunk)) return chunk;
    if (typeof chunk === "string") return Buffer.from(chunk, encoding);
    return Buffer.from(chunk);
  };

  response.write = (chunk, encodingOrCallback, callback) => {
    const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : undefined;
    const writeCallback = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (isHtml === undefined && !detectHtml()) {
      return originalWrite(chunk, encodingOrCallback, callback);
    }
    if (!isHtml || headWritten) {
      return originalWrite(chunk, encodingOrCallback, callback);
    }

    pendingChunks.push(chunkToBuffer(chunk, encoding));
    if (writeCallback) pendingCallbacks.push(writeCallback);
    const pending = Buffer.concat(pendingChunks);
    const headEnd = pending.indexOf(Buffer.from("</head>", "ascii"));
    if (headEnd < 0) return true;

    const headEndPosition = headEnd + "</head>".length;
    const formattedHead = Buffer.from(prettyHtmlHead(pending.subarray(0, headEndPosition).toString("utf8")));
    const output = Buffer.concat([formattedHead, pending.subarray(headEndPosition)]);
    const callbacks = pendingCallbacks;
    pendingChunks = [];
    pendingCallbacks = [];
    headWritten = true;
    return originalWrite(output, () => callbacks.forEach((pendingCallback) => pendingCallback()));
  };

  response.end = (chunk, encodingOrCallback, callback) => {
    const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : undefined;
    const endCallback = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (isHtml === undefined && !detectHtml()) {
      return originalEnd(chunk, encodingOrCallback, callback);
    }
    if (!isHtml || headWritten) {
      return originalEnd(chunk, encodingOrCallback, callback);
    }

    if (chunk !== undefined && chunk !== null) {
      pendingChunks.push(chunkToBuffer(chunk, encoding));
    }
    const pending = Buffer.concat(pendingChunks);
    const formatted = Buffer.from(prettyHtmlHead(pending.toString("utf8")));
    const callbacks = pendingCallbacks;
    return originalEnd(formatted, () => {
      callbacks.forEach((pendingCallback) => pendingCallback());
      endCallback?.();
    });
  };
}

await app.prepare();
createServer((request, response) => {
  installHtmlHeadFormatter(response);
  void handle(request, response).catch((error) => {
    console.error("Request handling failed:", error);
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    response.statusCode = 500;
    response.end("Internal Server Error");
  });
}).listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
