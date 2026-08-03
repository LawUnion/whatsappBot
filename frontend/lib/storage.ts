import { createClient } from "@/lib/supabase/client";

// Storage bucket types
export type StorageBucket = "temp-uploads" | "permanent-uploads";

// File categories with their default buckets
export const FILE_CATEGORIES = {
  // Temporary files (auto-delete after 3 days)
  "daily-notes": "temp-uploads",
  broadcasts: "temp-uploads",
  support: "temp-uploads",

  accommodation: "temp-uploads",

  // Permanent files (no auto-delete)
  "study-materials": "permanent-uploads",
  notices: "permanent-uploads",
  schedules: "permanent-uploads",
  societies: "permanent-uploads",
  events: "permanent-uploads",
  internships: "permanent-uploads",
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

// Max file sizes per bucket (in bytes)
const MAX_FILE_SIZES = {
  "temp-uploads": 10 * 1024 * 1024, // 10MB
  "permanent-uploads": 50 * 1024 * 1024, // 50MB
};

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
  expiresAt?: Date; // Only for temp-uploads
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param category - The file category (determines bucket and path)
 * @param customPath - Optional custom path within the category folder
 * @returns Upload result with public URL or error
 */
export async function uploadFile(
  file: File,
  category: FileCategory,
  customPath?: string,
): Promise<UploadResult> {
  const supabase = createClient();
  const bucket = FILE_CATEGORIES[category] as StorageBucket;
  const maxSize = MAX_FILE_SIZES[bucket];

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type. Allowed: PDF, JPEG, PNG, GIF, WebP`,
    };
  }

  // Validate file size
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return {
      success: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomStr}.${fileExt}`;
  const filePath = customPath
    ? `${category}/${customPath}/${fileName}`
    : `${category}/${fileName}`;

  try {
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    // Calculate expiry for temp uploads
    const result: UploadResult = {
      success: true,
      publicUrl,
    };

    if (bucket === "temp-uploads") {
      result.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    }

    return result;
  } catch (err) {
    console.error("Upload exception:", err);
    return {
      success: false,
      error: "Failed to upload file. Please try again.",
    };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param fileUrl - The public URL of the file
 * @param bucket - The storage bucket
 * @returns Success status
 */
export async function deleteFile(
  fileUrl: string,
  bucket: StorageBucket,
): Promise<boolean> {
  const supabase = createClient();

  try {
    // Extract file path from URL
    const urlParts = fileUrl.split(`/storage/v1/object/public/${bucket}/`);
    if (urlParts.length !== 2) {
      console.error("Invalid file URL format");
      return false;
    }

    const filePath = decodeURIComponent(urlParts[1]);

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Delete exception:", err);
    return false;
  }
}

/**
 * Check if a file URL is from temp storage (will expire)
 */
export function isTempFile(fileUrl: string): boolean {
  return fileUrl.includes("/temp-uploads/");
}

/**
 * Get file type icon based on URL or MIME type
 */
export function getFileIcon(fileUrl: string): string {
  if (fileUrl.includes(".pdf")) return "PDF";
  if (fileUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) return "IMG";
  if (fileUrl.match(/\.(doc|docx)/i)) return "DOC";
  return "LINK";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
