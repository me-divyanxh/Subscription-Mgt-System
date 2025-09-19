import React, { useEffect, useState } from "react";
import "./index.css";

/* ---------- Helpers ---------- */
const API_BASE = "http://localhost:4000/subscriptions"; // change if needed

function isoDateOnly(d) {
  // returns YYYY-MM-DD for inputs like new Date() or string
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function daysBetweenTodayAnd(endDateStr) {
  // compute integer number of days = endDate - today (local) (can be negative)
  const today = new Date();
  const end = new Date(endDateStr + "T00:00:00"); // treat endDate as local midnight
  // zero out time components for accurate day diff
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const t1 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((t1 - t0) / msPerDay);
}

function validateSubscription(payload) {
  const errors = {};
  if (!payload.user_email) errors.user_email = "Email required.";
  else {
    // simple email regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(payload.user_email)) errors.user_email = "Invalid email.";
  }
  if (!payload.plan_name) errors.plan_name = "Plan required.";
  if (!payload.start_date) errors.start_date = "Start date required.";
  if (!payload.end_date) errors.end_date = "End date required.";
  if (payload.start_date && payload.end_date) {
    if (new Date(payload.end_date) < new Date(payload.start_date))
      errors.end_date = "End date must be on/after start date.";
  }
  if (payload.monthly_cost == null || payload.monthly_cost === "")
    errors.monthly_cost = "Monthly cost required.";
  else if (isNaN(Number(payload.monthly_cost)) || Number(payload.monthly_cost) < 0)
    errors.monthly_cost = "Must be a non-negative number.";
  if (!["Active", "Expired", "Cancelled"].includes(payload.status))
    errors.status = "Status must be Active, Expired or Cancelled.";
  return errors;
}

/* ---------- Simple Toasts ---------- */
function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-wrapper">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || "info"}`} onClick={() => removeToast(t.id)}>
          <strong>{t.title}</strong>
          <div>{t.message}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */
function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-small" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Main App ---------- */
export default function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [toasts, setToasts] = useState([]);
  const pushToast = (title, message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, title, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts((s) => s.filter((t) => t.id !== id));

  // modal states
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null -> new, object -> edit
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  /* form */
  const emptyForm = {
    user_email: "",
    plan_name: "",
    start_date: isoDateOnly(new Date()),
    end_date: isoDateOnly(new Date()),
    monthly_cost: "0.00",
    status: "Active",
  };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  /* fetch list */
  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      pushToast("Error", err.message || "Could not load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  /* create / update */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (sub) => {
    setEditing(sub);
    setForm({
      user_email: sub.user_email,
      plan_name: sub.plan_name,
      start_date: isoDateOnly(sub.start_date),
      end_date: isoDateOnly(sub.end_date),
      monthly_cost: String(sub.monthly_cost),
      status: sub.status,
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const payload = {
      user_email: form.user_email.trim(),
      plan_name: form.plan_name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_cost: Number(form.monthly_cost),
      status: form.status,
    };
    const errors = validateSubscription(payload);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    try {
      let res;
      if (editing && editing.subscription_id) {
        res = await fetch(`${API_BASE}/${editing.subscription_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Server error");
      }
      pushToast("Success", editing ? "Subscription updated." : "Subscription added.", "success");
      setFormOpen(false);
      fetchList();
    } catch (err) {
      pushToast("Error", err.message || "Save failed", "error");
    }
  };

  /* delete */
  const confirmDeleteNow = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ open: false, id: null });
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      pushToast("Deleted", "Subscription removed.", "success");
      fetchList();
    } catch (err) {
      pushToast("Error", err.message || "Delete failed", "error");
    }
  };

  return (
    <div className="container">
      <h1>Subscription Management System</h1>

      <div className="toolbar">
        <button className="btn" onClick={openCreate}>+ Add Subscription</button>
        <button className="btn ghost" onClick={fetchList}>Refresh</button>
      </div>

      <div className="table-wrap">
        {loading ? <div>Loading...</div> :
          <table className="main-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Start</th>
                <th>End</th>
                <th>Monthly</th>
                <th>Remaining Days</th>
                <th>Visual Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 && <tr><td colSpan="9">No subscriptions</td></tr>}
              {subscriptions.map((s) => {
                const remaining = daysBetweenTodayAnd(s.end_date);
                const visual = remaining < 0 ? "Expired" : s.status;
                return (
                  <tr key={s.subscription_id}>
                    <td>{s.subscription_id}</td>
                    <td>{s.user_email}</td>
                    <td>{s.plan_name}</td>
                    <td>{isoDateOnly(s.start_date)}</td>
                    <td>{isoDateOnly(s.end_date)}</td>
                    <td>{Number(s.monthly_cost).toFixed(2)}</td>
                    <td>{remaining} day{Math.abs(remaining) !== 1 ? "s" : ""}</td>
                    <td><span className={`badge ${visual === "Expired" ? "bad-exp" : visual === "Cancelled" ? "bad-cancel" : "bad-active"}`}>{visual}</span></td>
                    <td>
                      <button className="btn small" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn danger small" onClick={() => setConfirmDelete({ open: true, id: s.subscription_id })}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </div>

      {/* Form Modal */}
      <Modal open={isFormOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit Subscription" : "Add Subscription"}>
        <form onSubmit={submitForm} className="form-grid">
          <label>
            Email
            <input value={form.user_email} onChange={(e) => setForm({ ...form, user_email: e.target.value })} />
            {formErrors.user_email && <div className="form-err">{formErrors.user_email}</div>}
          </label>

          <label>
            Plan Name
            <input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
            {formErrors.plan_name && <div className="form-err">{formErrors.plan_name}</div>}
          </label>

          <label>
            Start Date
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            {formErrors.start_date && <div className="form-err">{formErrors.start_date}</div>}
          </label>

          <label>
            End Date
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            {formErrors.end_date && <div className="form-err">{formErrors.end_date}</div>}
          </label>

          <label>
            Monthly Cost
            <input type="number" step="0.01" value={form.monthly_cost} onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })} />
            {formErrors.monthly_cost && <div className="form-err">{formErrors.monthly_cost}</div>}
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Active</option>
              <option>Expired</option>
              <option>Cancelled</option>
            </select>
            {formErrors.status && <div className="form-err">{formErrors.status}</div>}
          </label>

          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="btn">{editing ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })} title="Confirm Delete">
        <div>
          <p>Are you sure you want to delete subscription #{confirmDelete.id}?</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setConfirmDelete({ open: false, id: null })}>Cancel</button>
            <button className="btn danger" onClick={confirmDeleteNow}>Delete</button>
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
