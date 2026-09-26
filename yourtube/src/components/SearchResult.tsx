import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { videourl } from "@/lib/media";

const SearchResult = ({ query }: any) => {
  const [results, setResults] = useState<any[] | null>(null);

  useEffect(() => {
    const term = String(query || "").trim().toLowerCase();
    if (!term) {
      setResults(null);
      return;
    }
    setResults(null);
    axiosInstance
      .get("/video/getall")
      .then((res) => {
        const words = term.split(/\s+/);
        setResults(
          res.data.filter((vid: any) => {
            const text = `${vid.videotitle} ${vid.videochanel}`.toLowerCase();
            return words.every((w) => text.includes(w));
          })
        );
      })
      .catch(() => setResults([]));
  }, [query]);

  if (!String(query || "").trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Enter a search term to find videos and channels.</p>
      </div>
    );
  }

  if (!results) {
    return <p className="text-gray-600 py-6">Searching...</p>;
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">Try different keywords</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {results.map((video: any) => (
          <div key={video._id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 group">
            <Link href={`/watch/${video._id}`} className="flex-shrink-0">
              <div className="relative w-full sm:w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={`${videourl(video.filepath)}#t=1`}
                  preload="metadata"
                  muted
                  playsInline
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0 sm:py-1">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-base sm:text-lg line-clamp-2 group-hover:text-blue-600 mb-1 sm:mb-2">
                  {video.videotitle}
                </h3>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span>{(video.views || 0).toLocaleString()} views</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
              </div>

              {video.uploader && (
                <Link
                  href={`/channel/${video.uploader}`}
                  className="flex items-center gap-2 hover:text-blue-600"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">{video.videochanel?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{video.videochanel}</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-gray-600 py-4">
        Showing {results.length} result{results.length === 1 ? "" : "s"} for "{query}"
      </p>
    </div>
  );
};

export default SearchResult;
