const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "briyan.db"));

db.exec(`
create table if not exists viewings (
  id integer primary key,
  owner_name text not null,
  mobile text not null,
  job_type text,
  agreement_type text,
  price text,
  price_wool text,
  price_marble text,
  view_date text,
  sent_to_contractor integer default 0,
  promised integer default 0,
  data text
);

create table if not exists promises (
  id integer primary key,
  owner_name text not null,
  mobile text not null,
  job_type text,
  promise_date text,
  agreement_type text,
  price text,
  price_wool text,
  price_marble text,
  viewing_id integer,
  history text,
  data text
);

create table if not exists started_works (
  id integer primary key,
  owner_name text not null,
  mobile text not null,
  job_type text,
  start_date text,
  agreement_type text,
  price text,
  price_wool text,
  price_marble text,
  items text,
  history text,
  data text
);

create table if not exists completed_works (
  id integer primary key,
  owner_name text not null,
  mobile text not null,
  job_type text,
  complete_date text,
  agreement_type text,
  price text,
  meter text,
  total text,
  price_wool text,
  price_marble text,
  meter_wool text,
  meter_marble text,
  total_wool text,
  total_marble text,
  grand_total text,
  payment_type text,
  history text,
  data text
);

create table if not exists worker_accounts (
  id text primary key,
  password text not null,
  name text,
  mobile text,
  data text
);

create table if not exists worker_entries (
  id integer primary key,
  worker_name text,
  worker_mobile text,
  owner_name text,
  owner_mobile text,
  job_type text,
  daily_status text,
  daily_rate text,
  entry_date text,
  items text,
  data text
);

create table if not exists my_expenses (
  id integer primary key,
  owner_name text,
  owner_mobile text,
  work_status text,
  day_type text,
  buy_date text,
  items text,
  data text
);
`);

console.log("DB created:", path.join(__dirname, "briyan.db"));
console.log(db.prepare("select name from sqlite_master where type='table'").all());
