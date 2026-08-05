"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { loadRazorpayScript } from "@/lib/razorpay";
import { useUser } from "@/lib/AuthContext";

const order = ["free", "bronze", "silver", "gold"];

export default function SubscriptionPlans() {
  const { user, login } = useUser();
  const [plans, setPlans] = useState<any>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    axiosInstance.get("/payment/plans").then((res) => setPlans(res.data));
  }, []);

  const upgrade = async (plan: string) => {
    if (!user) {
      toast.error("Sign in to upgrade your plan");
      return;
    }
    setUpgrading(plan);
    try {
      const ready = await loadRazorpayScript();
      if (!ready) {
        toast.error("Couldn't load payment gateway. Check your connection.");
        return;
      }

      const orderRes = await axiosInstance.post("/payment/order", {
        plan,
        userId: user._id,
      });
      const { orderId, amount, currency, keyId } = orderRes.data;

      const razorpay = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        name: "YourTube",
        description: `Upgrade to ${plans[plan].label} plan`,
        order_id: orderId,
        prefill: { name: user.name, email: user.email },
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
              userId: user._id,
            });
            login(verifyRes.data.user);
            toast.success(`You're now on the ${plans[plan].label} plan`);
          } catch {
            toast.error("Payment succeeded but activation failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => setUpgrading(null),
        },
        theme: { color: "#000000" },
      });
      razorpay.on("payment.failed", () => {
        toast.error("Payment failed");
      });
      razorpay.open();
    } catch (error) {
      toast.error("Couldn't start payment");
    } finally {
      setUpgrading(null);
    }
  };

  if (!plans) return <div>Loading plans...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {order.map((key) => {
        const plan = plans[key];
        const isCurrent = (user?.plan || "free") === key;
        return (
          <div key={key} className="border rounded-lg p-5 flex flex-col gap-3 bg-white">
            <h3 className="text-lg font-semibold capitalize">{plan.label}</h3>
            <p className="text-2xl font-bold">
              {plan.price === 0 ? "Free" : `₹${(plan.price / 100).toFixed(0)}`}
              {plan.price > 0 && <span className="text-sm font-normal">/mo</span>}
            </p>
            <ul className="text-sm text-gray-600 space-y-2 flex-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                {plan.downloadsPerDay} download{plan.downloadsPerDay === 1 ? "" : "s"}/day
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                {plan.watchCapSeconds
                  ? `${plan.watchCapSeconds}s preview per video`
                  : "Unlimited watch time"}
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                {plan.adFree ? "Ad-free viewing" : "Includes ads"}
              </li>
            </ul>
            <Button
              className="w-full"
              variant={isCurrent ? "outline" : "default"}
              disabled={isCurrent || key === "free" || upgrading === key}
              onClick={() => upgrade(key)}
            >
              {isCurrent
                ? "Current plan"
                : key === "free"
                ? "Default plan"
                : upgrading === key
                ? "Processing..."
                : "Upgrade"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
