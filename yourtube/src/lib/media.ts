export const videourl = (filepath?: string) => {
  if (!filepath) return "";
  if (/^https?:\/\//.test(filepath)) return filepath;
  return `${process.env.NEXT_PUBLIC_BACKEND_URL}/${filepath.replace(/\\/g, "/")}`;
};

export const downloadurl = (filepath?: string) => {
  const url = videourl(filepath);
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};
