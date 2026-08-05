export const plans = {
  free: { label: "Free", price: 0, downloadsPerDay: 1, watchCapSeconds: 60, adFree: false },
  bronze: { label: "Bronze", price: 4900, downloadsPerDay: 3, watchCapSeconds: null, adFree: false },
  silver: { label: "Silver", price: 9900, downloadsPerDay: 7, watchCapSeconds: null, adFree: true },
  gold: { label: "Gold", price: 19900, downloadsPerDay: 20, watchCapSeconds: null, adFree: true },
};

export const isPaidPlan = (plan) => plan !== "free" && !!plans[plan] && plans[plan].price > 0;
