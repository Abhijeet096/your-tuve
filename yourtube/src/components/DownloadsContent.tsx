"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download as DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

const planlimits: Record<string, number> = { free: 1, premium: 5, pro: 20 };

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
      loadStatus();
    } else {
      setLoading(true);
    }
  }, [user]);

  const loadDownloads = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/download/${user._id}`);
      setDownloads(res.data);
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/download/status/${user._id}`);
      setStatus(res.data);
    } catch (error) {
      console.error("Error loading download status:", error);
    }
  };

  const changePlan = async (plan: string) => {
    if (!user) return;
    try {
      await axiosInstance.patch(`/download/plan/${user._id}`, { plan });
      toast.success(`Switched to ${plan} plan`);
      loadStatus();
    } catch (error) {
      toast.error("Couldn't change plan");
    }
  };

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <DownloadIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to see your downloads</h2>
        <p className="text-gray-600">Downloaded videos aren't viewable when signed out.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium capitalize">{status?.plan || "free"} plan</p>
            <p className="text-sm text-gray-600">
              {status ? `${status.used} of ${status.limit} downloads used today` : "..."}
            </p>
          </div>
          <div className="flex gap-2">
            {Object.keys(planlimits).map((plan) => (
              <Button
                key={plan}
                size="sm"
                variant={status?.plan === plan ? "default" : "outline"}
                className={status?.plan === plan ? "" : "border bg-white text-gray-700"}
                onClick={() => changePlan(plan)}
              >
                {plan} ({planlimits[plan]}/day)
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{downloads.length} downloads</p>
      </div>

      {downloads.length === 0 ? (
        <div className="text-center py-12">
          <DownloadIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
          <p className="text-gray-600">Videos you download will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {downloads.map((item) => (
            <div key={item._id} className="flex gap-4 group">
              <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath}`}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/watch/${item.videoid._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videoid.videotitle}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600">{item.videoid.videochanel}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  Downloaded on {item.plan} plan •{" "}
                  {formatDistanceToNow(new Date(item.createdAt))} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
