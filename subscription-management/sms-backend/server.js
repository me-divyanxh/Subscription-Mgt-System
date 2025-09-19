const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// DB setup
const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_cost REAL NOT NULL CHECK (monthly_cost >= 0),
    status TEXT NOT NULL CHECK (status IN ('Active','Expired','Cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ---- CRUD ----

// List all
app.get("/subscriptions", (req, res) => {
  db.all("SELECT * FROM subscriptions", [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

// Get one
app.get("/subscriptions/:id", (req, res) => {
  db.get("SELECT * FROM subscriptions WHERE subscription_id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).send(err.message);
    if (!row) return res.status(404).send("Not found");
    res.json(row);
  });
});

// Create
app.post("/subscriptions", (req, res) => {
  const { user_email, plan_name, start_date, end_date, monthly_cost, status } = req.body;
  const sql = `INSERT INTO subscriptions (user_email,plan_name,start_date,end_date,monthly_cost,status) VALUES (?,?,?,?,?,?)`;
  db.run(sql, [user_email, plan_name, start_date, end_date, monthly_cost, status], function (err) {
    if (err) return res.status(500).send(err.message);
    res.json({ subscription_id: this.lastID });
  });
});

// Update
app.put("/subscriptions/:id", (req, res) => {
  const { user_email, plan_name, start_date, end_date, monthly_cost, status } = req.body;
  const sql = `UPDATE subscriptions SET 
    user_email=?, plan_name=?, start_date=?, end_date=?, monthly_cost=?, status=?, 
    updated_at=CURRENT_TIMESTAMP
    WHERE subscription_id=?`;
  db.run(sql, [user_email, plan_name, start_date, end_date, monthly_cost, status, req.params.id], function (err) {
    if (err) return res.status(500).send(err.message);
    if (this.changes === 0) return res.status(404).send("Not found");
    res.send("Updated");
  });
});

// Delete
app.delete("/subscriptions/:id", (req, res) => {
  db.run("DELETE FROM subscriptions WHERE subscription_id=?", [req.params.id], function (err) {
    if (err) return res.status(500).send(err.message);
    if (this.changes === 0) return res.status(404).send("Not found");
    res.send("Deleted");
  });
});

// Run server
const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
