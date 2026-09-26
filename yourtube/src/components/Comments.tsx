import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { Flag, Languages, MapPin, MoreVertical, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getlocation } from "@/lib/location";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  userimage?: string;
  city?: string;
  commentedon: string;
  likecount: number;
  dislikecount: number;
  likedbyme: boolean;
  dislikedbyme: boolean;
  reportedbyme: boolean;
  flagged: boolean;
}

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "bn", name: "বাংলা" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "mr", name: "मराठी" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "kn", name: "ಕನ್ನಡ" },
  { code: "ml", name: "മലയാളം" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "اردو" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ar", name: "العربية" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
];

const reportreasons = ["Spam or misleading", "Hate speech or abuse", "Harassment", "Sexual content", "Other"];

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showCity, setShowCity] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("commentLang");
      const browser = navigator.language?.slice(0, 2);
      const pick = saved || browser;
      if (languages.some((l) => l.code === pick)) setTargetLang(pick);
      setShowCity(localStorage.getItem("showCity") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    loadComments();
  }, [videoId, user?._id]);

  const loadComments = async () => {
    if (!videoId) return;
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`, {
        params: { userId: user?._id },
      });
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const changeLang = (code: string) => {
    setTargetLang(code);
    setTranslations({});
    try {
      localStorage.setItem("commentLang", code);
    } catch {}
  };

  const toggleCity = (value: boolean) => {
    setShowCity(value);
    try {
      localStorage.setItem("showCity", value ? "1" : "0");
    } catch {}
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const city = showCity ? (await getlocation()).city : undefined;
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name || "Anonymous",
        userimage: user.image,
        city,
      });
      if (res.data.comment) {
        setComments([res.data.comment, ...comments]);
      }
      setNewComment("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText, userId: user?._id }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText.trim() } : c
          )
        );
        setTranslations((prev) => {
          const next = { ...prev };
          delete next[editingCommentId!];
          return next;
        });
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't update comment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`, {
        data: { userId: user?._id },
      });
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const replaceComment = (updated: Comment) =>
    setComments((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));

  const handleReaction = async (id: string, type: "like" | "dislike") => {
    if (!user) {
      toast("Sign in to react to comments");
      return;
    }
    const before = comments.find((c) => c._id === id);
    if (before) {
      const next = { ...before };
      if (type === "like") {
        next.likedbyme = !before.likedbyme;
        next.likecount += next.likedbyme ? 1 : -1;
        if (next.likedbyme && before.dislikedbyme) {
          next.dislikedbyme = false;
          next.dislikecount -= 1;
        }
      } else {
        next.dislikedbyme = !before.dislikedbyme;
        next.dislikecount += next.dislikedbyme ? 1 : -1;
        if (next.dislikedbyme && before.likedbyme) {
          next.likedbyme = false;
          next.likecount -= 1;
        }
      }
      replaceComment(next);
    }
    try {
      const res = await axiosInstance.post(`/comment/${type}/${id}`, { userId: user._id });
      replaceComment(res.data);
    } catch (error) {
      if (before) replaceComment(before);
      toast.error("Couldn't update, please try again");
    }
  };

  const handleReport = async (id: string, reason: string) => {
    if (!user) {
      toast("Sign in to report comments");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/report/${id}`, {
        userId: user._id,
        reason,
      });
      replaceComment(res.data);
      toast.success("Thanks, the comment has been sent for review");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't report comment");
    }
  };

  const handleTranslate = async (comment: Comment) => {
    if (translations[comment._id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[comment._id];
        return next;
      });
      return;
    }
    setTranslating(comment._id);
    try {
      let translated = "";
      try {
        const res = await axiosInstance.post("/comment/translate", {
          text: comment.commentbody,
          target: targetLang,
        });
        translated = res.data.translated;
      } catch {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            comment.commentbody.slice(0, 500)
          )}&langpair=Autodetect|${targetLang}`
        );
        const data = await res.json();
        if (data.quotaFinished || data.responseStatus !== 200) throw new Error();
        translated = data.responseData.translatedText;
      }
      setTranslations((prev) => ({ ...prev, [comment._id]: translated }));
    } catch {
      toast.error("Translation isn't available right now, try again later");
    } finally {
      setTranslating(null);
    }
  };

  const langName = languages.find((l) => l.code === targetLang)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold">{comments.length} Comments</h2>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <Languages className="w-4 h-4" />
          Translate to
          <select
            value={targetLang}
            onChange={(e) => changeLang(e.target.value)}
            className="border rounded px-2 py-1 bg-transparent text-sm"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment in any language..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              maxLength={1000}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-between items-center flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCity}
                  onChange={(e) => toggleCity(e.target.checked)}
                />
                Show my city with this comment
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setNewComment("")}
                  disabled={!newComment.trim()}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const mine = comment.userid === user?._id;
            const hidden = comment.flagged && !mine && !revealed[comment._id];
            return (
              <div key={comment._id} className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={comment.userimage || ""} />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">@{comment.usercommented}</span>
                    <span className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>
                    {comment.city && (
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {comment.city}
                      </span>
                    )}
                    {comment.flagged && mine && (
                      <span className="text-xs text-amber-600">Under review</span>
                    )}
                  </div>

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : hidden ? (
                    <p className="text-sm text-gray-500 italic">
                      This comment was reported by the community and is waiting for review.{" "}
                      <button
                        className="underline not-italic"
                        onClick={() => setRevealed((p) => ({ ...p, [comment._id]: true }))}
                      >
                        Show anyway
                      </button>
                    </p>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap break-words">{comment.commentbody}</p>
                      {translations[comment._id] && (
                        <p className="text-sm mt-1 pl-3 border-l-2 border-blue-400 text-gray-700">
                          {translations[comment._id]}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <button
                          className={`flex items-center gap-1 px-2 py-1 rounded-full hover:bg-gray-100 active:scale-90 transition-transform ${
                            comment.likedbyme ? "text-blue-600" : ""
                          }`}
                          onClick={() => handleReaction(comment._id, "like")}
                          aria-label="Like"
                        >
                          <ThumbsUp
                            key={`l-${comment.likedbyme}`}
                            className={`w-4 h-4 ${comment.likedbyme ? "animate-pop" : ""}`}
                            fill={comment.likedbyme ? "currentColor" : "none"}
                          />
                          {comment.likecount > 0 && <span className="text-xs">{comment.likecount}</span>}
                        </button>
                        <button
                          className={`flex items-center gap-1 px-2 py-1 rounded-full hover:bg-gray-100 active:scale-90 transition-transform ${
                            comment.dislikedbyme ? "text-blue-600" : ""
                          }`}
                          onClick={() => handleReaction(comment._id, "dislike")}
                          aria-label="Dislike"
                        >
                          <ThumbsDown
                            key={`d-${comment.dislikedbyme}`}
                            className={`w-4 h-4 ${comment.dislikedbyme ? "animate-pop" : ""}`}
                            fill={comment.dislikedbyme ? "currentColor" : "none"}
                          />
                          {comment.dislikecount > 0 && <span className="text-xs">{comment.dislikecount}</span>}
                        </button>
                        <button
                          className="px-2 py-1 rounded-full hover:bg-gray-100 text-xs font-medium"
                          onClick={() => handleTranslate(comment)}
                          disabled={translating === comment._id}
                        >
                          {translating === comment._id
                            ? "Translating..."
                            : translations[comment._id]
                            ? "Show original"
                            : `Translate to ${langName}`}
                        </button>
                        {mine && (
                          <>
                            <button className="px-2 py-1 text-xs" onClick={() => handleEdit(comment)}>
                              Edit
                            </button>
                            <button className="px-2 py-1 text-xs" onClick={() => handleDelete(comment._id)}>
                              Delete
                            </button>
                          </>
                        )}
                        {!mine && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-full hover:bg-gray-100 ml-auto" aria-label="More">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {comment.reportedbyme ? (
                                <DropdownMenuItem disabled>
                                  <Flag className="w-4 h-4" /> Reported
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuLabel className="flex items-center gap-2">
                                    <Flag className="w-4 h-4" /> Report
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {reportreasons.map((r) => (
                                    <DropdownMenuItem key={r} onClick={() => handleReport(comment._id, r)}>
                                      {r}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
