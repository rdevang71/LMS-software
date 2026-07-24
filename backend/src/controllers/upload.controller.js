import cloudinary, {
  cloudinaryIsConfigured,
  deleteCloudinaryAsset,
  isOwnedCloudinaryAsset,
} from "../config/cloudinary.js";

const uploadPurposes = {
  profile: {
    folder: "profiles",
    resourceType: "image",
    roles: ["admin", "instructor", "student"],
  },
  thumbnail: {
    folder: "course-thumbnails",
    resourceType: "image",
    roles: ["admin", "instructor"],
  },
  lecture: {
    folder: "course-lectures",
    resourceType: "video",
    roles: ["admin", "instructor"],
  },
  resource: {
    folder: "course-resources",
    resourceType: "raw",
    roles: ["admin", "instructor"],
  },
  assignment: {
    folder: "assignment-submissions",
    resourceType: "raw",
    roles: ["student"],
  },
};

export function createUploadSignature(request, response) {
  if (!cloudinaryIsConfigured())
    return response
      .status(503)
      .json({ message: "Cloudinary is not configured on the backend" });
  const purpose = uploadPurposes[request.body.purpose];
  if (!purpose)
    return response.status(400).json({ message: "Invalid upload purpose" });
  if (!purpose.roles.includes(request.user.role))
    return response
      .status(403)
      .json({ message: "Your role cannot upload this media type" });

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `lumen-lms/${purpose.folder}/${request.user.id}`;
  const params = {
    timestamp,
    folder,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  };
  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET,
  );
  response.json({
    signature,
    timestamp,
    folder,
    useFilename: true,
    uniqueFilename: true,
    overwrite: false,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    resourceType: purpose.resourceType,
  });
}

export async function deleteUpload(request, response, next) {
  try {
    const purpose = uploadPurposes[request.body.purpose];
    if (!purpose)
      return response.status(400).json({ message: "Invalid upload purpose" });
    if (!purpose.roles.includes(request.user.role)) {
      return response
        .status(403)
        .json({ message: "Your role cannot delete this media type" });
    }
    if (
      !isOwnedCloudinaryAsset(
        request.body.publicId,
        request.body.purpose,
        request.user.id,
      )
    ) {
      return response.status(400).json({ message: "Invalid media asset" });
    }
    await deleteCloudinaryAsset(request.body.publicId, purpose.resourceType);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}
