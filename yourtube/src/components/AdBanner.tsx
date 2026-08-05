import Link from "next/link";
import { Button } from "./ui/button";

export default function AdBanner() {
  return (
    <div className="flex items-center justify-between gap-4 border rounded-lg p-3 bg-gray-50">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Advertisement</p>
        <p className="text-sm text-gray-700">
          Enjoying the video? Go ad-free with Silver or Gold.
        </p>
      </div>
      <Link href="/subscription">
        <Button size="sm" variant="outline" className="border bg-white text-gray-700 flex-shrink-0">
          Remove ads
        </Button>
      </Link>
    </div>
  );
}
