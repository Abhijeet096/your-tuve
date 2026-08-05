import SubscriptionPlans from "@/components/SubscriptionPlans";
import React, { Suspense } from "react";

const index = () => {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">Subscription plans</h1>
        <p className="text-gray-600 mb-6">
          Upgrade for more daily downloads, unlimited watch time, and ad-free viewing.
        </p>
        <Suspense fallback={<div>Loading...</div>}>
          <SubscriptionPlans />
        </Suspense>
      </div>
    </main>
  );
};

export default index;
