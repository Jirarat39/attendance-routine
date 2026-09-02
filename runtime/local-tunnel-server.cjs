const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = '127.0.0.1';
const port = 5173;
const frontendRoot = path.join(__dirname, '..', 'frontend', 'dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function proxyApi(request, response) {
  const proxyRequest = http.request({
    host,
    port: 5187,
    path: request.url,
    method: request.method,
    headers: { ...request.headers, host: `${host}:5187` },
  }, (proxyResponse) => {
    response.writeHead(proxyResponse.statusCode, proxyResponse.headers);
    proxyResponse.pipe(response);
  });

  proxyRequest.on('error', () => {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end('{"error":"Local API is unavailable"}');
  });

  request.pipe(proxyRequest);
}

function serveFile(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${host}`).pathname)
    .replace(/^\/TEST01\/HRReportScheduler/, '');
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const requestedFile = path.resolve(frontendRoot, relativePath);
  const fallbackFile = path.join(frontendRoot, 'index.html');
  const filePath = requestedFile.startsWith(frontendRoot) && fs.existsSync(requestedFile)
    ? requestedFile
    : fallbackFile;

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end();
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
    });
    response.end(content);
  });
}

http.createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    proxyApi(request, response);
    return;
  }

  serveFile(request, response);
}).listen(port, host, () => {
  console.log(`Local tunnel server listening at http://${host}:${port}`);
});