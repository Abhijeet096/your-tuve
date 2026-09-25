import { Trash2 } from "lucide-react";
import VideoCard from "./videocard";
export default function ChannelVideos({ videos, onDelete }: any) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No videos uploaded yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Videos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video: any) => (
          <div key={video._id} className="relative group/card">
            <VideoCard video={video} />
            {onDelete && (
              <button
                onClick={() => onDelete(video._id)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-red-600 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity"
                title="Delete video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
