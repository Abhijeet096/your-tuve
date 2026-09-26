export const plans = {
  free: { label: "Free", price: 0, downloadsPerDay: 1, watchCapSeconds: 60, adFree: false },
  bronze: { label: "Bronze", price: 4900, downloadsPerDay: 3, watchCapSeconds: null, adFree: false },
  silver: { label: "Silver", price: 9900, downloadsPerDay: 7, watchCapSeconds: null, adFree: true },
  gold: { label: "Gold", price: 19900, downloadsPerDay: 20, watchCapSeconds: null, adFree: true },
};

export const isPaidPlan = (plan) => plan !== "free" && !!plans[plan] && plans[plan].price > 0;

export const PLAN_DAYS = 30;

const rank = { free: 0, bronze: 1, silver: 2, gold: 3 };
export const planrank = (plan) => rank[plan] ?? 0;

export const syncplan = async (user) => {
  if (!user || user.plan === "free") return user;
  if (!user.planexpires) {
    user.planexpires = new Date(Date.now() + PLAN_DAYS * 24 * 60 * 60 * 1000);
    await user.save();
  } else if (user.planexpires < new Date()) {
    user.plan = "free";
    user.planexpires = undefined;
    await user.save();
  }
  return user;
};
