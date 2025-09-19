import { useState } from "react";
import { validateSubscription } from "../utils/helpers";

export default function SubscriptionForm({ onSave }) {
  const [formData, setFormData] = useState({
    user_email: "",
    plan_name: "",
    start_date: "",
    end_date: "",
    monthly_cost: "",
    status: "Active"
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const check = validateSubscription(formData);
    if (!check.valid) return alert(check.message);
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="user_email" placeholder="Email" onChange={handleChange} />
      <input name="plan_name" placeholder="Plan" onChange={handleChange} />
      <input type="date" name="start_date" onChange={handleChange} />
      <input type="date" name="end_date" onChange={handleChange} />
      <input type="number" name="monthly_cost" placeholder="Cost" onChange={handleChange} />
      <select name="status" onChange={handleChange}>
        <option>Active</option>
        <option>Expired</option>
        <option>Cancelled</option>
      </select>
      <button type="submit">Save</button>
    </form>
  );
}
