import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'uploads';

export async function uploadFile(file: File, folder: string): Promise<string | null> {
  const supabase = createClient();
  
  // Generate unique filename
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const filename = `${folder}/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

export function getFileIcon(url: string | null): string {
  if (!url) return '📄';
  const ext = url.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return '📕';
    case 'doc':
    case 'docx': return '📘';
    case 'xls':
    case 'xlsx': return '📗';
    case 'ppt':
    case 'pptx': return '📙';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return '🖼️';
    default: return url.startsWith('http') ? '🔗' : '📄';
  }
}
