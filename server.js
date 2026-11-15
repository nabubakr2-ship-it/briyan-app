const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleApi } = require("./db");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
};

http.createServer((req, res) => {
  if (handleApi(req, res)) return;

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  let filePath = path.join(root, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err && !path.extname(urlPath)) {
      filePath = path.join(root, urlPath + ".html");
      return fs.readFile(filePath, (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": types[".html"] });
        res.end(data2);
      });
    }
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(3000, () => console.log("Serving on http://localhost:3000"));
