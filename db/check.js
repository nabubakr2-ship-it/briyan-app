const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db/briyan.db");
const tables = db.prepare("select name from sqlite_master where type='table'").all();
console.log("tables:", tables.map((t) => t.name).join(", "));
for (const t of tables) {
  console.log(t.name, "rows:", db.prepare(`select count(*) c from ${t.name}`).get().c);
}
