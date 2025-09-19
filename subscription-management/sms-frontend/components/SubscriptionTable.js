import { calculateRemainingDays } from "../utils/helpers";

export default function SubscriptionTable({ subscriptions }) {
  return (
    <table border="1" width="100%">
      <thead>
        <tr>
          <th>Email</th><th>Plan</th><th>Start</th><th>End</th><th>Cost</th><th>Days Left</th>
        </tr>
      </thead>
      <tbody>
        {subscriptions.map((s) => (
          <tr key={s.subscription_id}>
            <td>{s.user_email}</td>
            <td>{s.plan_name}</td>
            <td>{s.start_date}</td>
            <td>{s.end_date}</td>
            <td>${s.monthly_cost}</td>
            <td>{calculateRemainingDays(s.end_date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
