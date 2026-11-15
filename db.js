const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "db", "briyan.db"));

const TABLE_MAP = {
  viewings: "viewings",
  promises: "promises",
  startedWorks: "started_works",
  completedWorks: "completed_works",
  workerEntries: "worker_entries",
  workerAccounts: "worker_accounts",
  myExpenses: "my_expenses",
};

function syncTable(table, rows) {
  db.prepare(`delete from ${table}`).run();
  if (!rows.length) return;
  const insert = db.prepare(
    `insert into ${table} (id, data) values (?, ?)`
  );
  const insertAll = db.transaction((items) => {
    for (const r of items) {
      insert.run(r.id ?? null, JSON.stringify(r));
    }
  });
  insertAll(rows);
}

function handleApi(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/sync" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        for (const [key, table] of Object.entries(TABLE_MAP)) {
          if (Array.isArray(data[key])) syncTable(table, data[key]);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return true;
  }

  const tableMatch = url.pathname.match(/^\/api\/table\/(\w+)$/);
  if (tableMatch && req.method === "GET") {
    const table = TABLE_MAP[tableMatch[1]] || tableMatch[1];
    if (!Object.values(TABLE_MAP).includes(table)) {
      res.writeHead(404).end("unknown table");
      return true;
    }
    const rows = db.prepare(`select * from ${table}`).all();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(rows));
    return true;
  }

  return false;
}

module.exports = { handleApi, db };
