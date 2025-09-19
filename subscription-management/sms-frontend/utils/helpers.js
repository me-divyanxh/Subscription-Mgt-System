export function calculateRemainingDays(endDate) {
  const today = new Date();
  const diff = new Date(endDate) - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function validateSubscription(data) {
  if (!data.user_email || !data.plan_name) {
    return { valid: false, message: "Email and Plan Name are required." };
  }
  if (!data.start_date || !data.end_date) {
    return { valid: false, message: "Start and End dates are required." };
  }
  if (new Date(data.start_date) > new Date(data.end_date)) {
    return { valid: false, message: "Start date cannot be after End date." };
  }
  if (data.monthly_cost <= 0) {
    return { valid: false, message: "Monthly cost must be > 0." };
  }
  return { valid: true };
}
