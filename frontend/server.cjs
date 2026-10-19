const { createReadStream, existsSync, statSync } = require("node:fs");
const { createServer } = require("node:http");
const { extname, isAbsolute, join, relative, resolve, sep } = require("node:path");

const staticRoot = resolve(__dirname);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Bad Request");
    return;
  }

  const requestedFile = resolve(staticRoot, `.${pathname}`);
  const relativePath = relative(staticRoot, requestedFile);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  let filePath = requestedFile;
  if (!existsSync(filePath)) {
    if (extname(pathname)) {
      response.writeHead(404).end("Not Found");
      return;
    }
    filePath = join(staticRoot, "index.html");
  } else if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    response.writeHead(404).end("Not Found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
  } else {
    createReadStream(filePath).pipe(response);
  }
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, "0.0.0.0");
