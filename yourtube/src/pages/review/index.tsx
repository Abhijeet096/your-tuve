import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";

export default function ReviewPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await axiosInstance.get("/comment/flagged/all");
      setItems(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, action: "keep" | "remove") => {
    try {
      await axiosInstance.post(`/comment/review/${id}`, { action });
      setItems((prev) => prev.filter((c) => c._id !== id));
      toast.success(action === "remove" ? "Comment removed" : "Comment restored");
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reported comments</h1>
        <p className="text-sm text-gray-600">
          Comments with 3 or more reports are hidden behind a warning until someone reviews them.
        </p>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Nothing to review right now.</p>
      ) : (
        items.map((c) => (
          <div key={c._id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="font-medium">@{c.usercommented}</span>
              <span className="text-gray-500">
                {formatDistanceToNow(new Date(c.commentedon))} ago
              </span>
              {c.videoid && (
                <Link href={`/watch/${c.videoid._id}`} className="text-blue-600 hover:underline">
                  {c.videoid.videotitle}
                </Link>
              )}
              {c.flagged && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Flagged</span>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{c.commentbody}</p>
            <div className="text-xs text-gray-600">
              {c.reports.length} report{c.reports.length === 1 ? "" : "s"}:{" "}
              {Object.entries(
                c.reports.reduce((acc: any, r: any) => {
                  acc[r.reason] = (acc[r.reason] || 0) + 1;
                  return acc;
                }, {})
              )
                .map(([reason, n]) => `${reason} (${n})`)
                .join(", ")}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="border bg-white text-gray-700 hover:bg-gray-100" onClick={() => review(c._id, "keep")}>
                Keep comment
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => review(c._id, "remove")}>
                Remove
              </Button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
