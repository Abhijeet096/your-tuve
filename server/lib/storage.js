import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";

const configured = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

export const storevideo = async (file) => {
  if (!configured()) {
    return file.path.replace(/\\/g, "/");
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  try {
    const result = await new Promise((resolve, reject) =>
      cloudinary.uploader.upload_large(
        file.path,
        { resource_type: "video", folder: "yourtube", chunk_size: 20 * 1024 * 1024 },
        (error, res) => (error ? reject(error) : resolve(res))
      )
    );
    return result.secure_url;
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
};
