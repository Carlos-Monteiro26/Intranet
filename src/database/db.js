const { Pool } = require("pg");

const db = new Pool({
  user: "administrador",
  password: "*3com*",
  database: "intranet",
  host: "localhost",
  port: 5432,
});
module.exports = db;
