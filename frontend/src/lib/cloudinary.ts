import { apiRequest } from "@/lib/api";

export type UploadPurpose = "profile" | "thumbnail" | "lecture" | "resource" | "assignment";
export type CloudinaryUpload = {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  originalFilename: string;
  bytes: number;
};

type SignatureResponse = {
  signature: string;
  timestamp: number;
  folder: string;
  useFilename: boolean;
  uniqueFilename: boolean;
  overwrite: boolean;
  cloudName: string;
  apiKey: string;
  resourceType: "image" | "video" | "raw";
};

const limits: Record<UploadPurpose, number> = {
  profile: 5 * 1024 * 1024,
  thumbnail: 5 * 1024 * 1024,
  lecture: 200 * 1024 * 1024,
  resource: 20 * 1024 * 1024,
  assignment: 20 * 1024 * 1024,
};

export async function uploadToCloudinary(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (percentage: number) => void,
): Promise<CloudinaryUpload> {
  if (file.size > limits[purpose]) {
    throw new Error(`File is too large. Maximum size is ${limits[purpose] / 1024 / 1024}MB.`);
  }
  if ((purpose === "profile" || purpose === "thumbnail") && !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (purpose === "lecture" && !file.type.startsWith("video/")) {
    throw new Error("Please choose a video file.");
  }

  const signed = await apiRequest<SignatureResponse>("/uploads/signature", {
    method: "POST",
    body: JSON.stringify({ purpose }),
  });
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signed.apiKey);
  body.append("timestamp", String(signed.timestamp));
  body.append("signature", signed.signature);
  body.append("folder", signed.folder);
  body.append("use_filename", String(signed.useFilename));
  body.append("unique_filename", String(signed.uniqueFilename));
  body.append("overwrite", String(signed.overwrite));

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/${signed.resourceType}/upload`,
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Cloudinary upload failed. Check your connection."));
    request.onload = () => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(request.responseText) as Record<string, unknown>;
      } catch {
        /* Cloudinary returned a non-JSON error. */
      }
      if (request.status >= 200 && request.status < 300) resolve(payload);
      else
        reject(
          new Error(
            String(
              (payload.error as { message?: string } | undefined)?.message ??
                "Cloudinary upload failed",
            ),
          ),
        );
    };
    request.send(body);
  });

  return {
    url: String(result.secure_url),
    publicId: String(result.public_id),
    resourceType: signed.resourceType,
    originalFilename: String(result.original_filename ?? file.name),
    bytes: Number(result.bytes ?? file.size),
  };
}

export async function deleteUploadedAsset(publicId: string, purpose: UploadPurpose) {
  if (!publicId) return;
  await apiRequest("/uploads/asset", {
    method: "DELETE",
    body: JSON.stringify({ publicId, purpose }),
  });
}
