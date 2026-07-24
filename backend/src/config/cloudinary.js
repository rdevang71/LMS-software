import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function cloudinaryIsConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

const purposeFolders = {
  profile: "profiles",
  thumbnail: "course-thumbnails",
  lecture: "course-lectures",
  resource: "course-resources",
  assignment: "assignment-submissions",
};

export function isOwnedCloudinaryAsset(publicId, purpose, userId) {
  if (!publicId) return true;
  const folder = purposeFolders[purpose];
  return Boolean(
    folder && publicId.startsWith(`lumen-lms/${folder}/${userId}/`),
  );
}

export async function deleteCloudinaryAsset(publicId, resourceType = "image") {
  if (!publicId || !cloudinaryIsConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.error(
      `Unable to delete Cloudinary asset ${publicId}:`,
      error.message,
    );
  }
}

export default cloudinary;
