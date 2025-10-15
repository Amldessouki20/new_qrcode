import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

type SaveGuestImageLocalParams = {
  buffer: Buffer;
  mimeType: string;
  guestId: string;
};

type DeleteGuestImageLocalParams = {
  profileImagePath: string;
  thumbnailImagePath?: string | null;
};

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function extensionFromMime(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

const DEFAULT_UPLOAD_DIR = 'public/uploads/guests';
const UPLOAD_DIR = (process.env.IMAGE_UPLOAD_DIR || DEFAULT_UPLOAD_DIR).trim();
const PUBLIC_ROOT = path.join(process.cwd(), 'public');

function sanitizeGuestId(guestId: string): string {
  return guestId.replace(/[^a-zA-Z0-9_-]/g, '');
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function webToFsPath(webPath: string): string {
  // Convert "/uploads/..." to filesystem path under public
  const normalized = webPath.replace(/^\\+/, '').replace(/^\/+/, '');
  const fullPath = path.join(PUBLIC_ROOT, normalized);
  if (!fullPath.startsWith(PUBLIC_ROOT)) {
    throw new Error('Invalid path traversal attempt');
  }
  return fullPath;
}

export async function saveGuestImageLocal(
  { buffer, mimeType, guestId }: SaveGuestImageLocalParams,
) {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Unsupported image type');
  }

  const ext = extensionFromMime(mimeType);
  if (!ext) {
    throw new Error('Unknown image extension');
  }

  const safeGuestId = sanitizeGuestId(guestId);
  const guestBaseDir = path.join(UPLOAD_DIR, safeGuestId);
  const originalDir = path.join(guestBaseDir, 'original');
  const thumbsDir = path.join(guestBaseDir, 'thumbs');

  await ensureDir(originalDir);
  await ensureDir(thumbsDir);

  const ts = Date.now();
  const baseName = `${safeGuestId}-${ts}`;
  const originalFileName = `${baseName}.${ext}`;
  const thumbFileName = `${baseName}-thumb.${ext}`;

  const originalFsPath = path.join(originalDir, originalFileName);
  const thumbFsPath = path.join(thumbsDir, thumbFileName);

  await fs.writeFile(originalFsPath, buffer);

  const image = sharp(buffer);
  const metadata = await image.metadata();

  await image
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .toFile(thumbFsPath);

  const profileImagePath = `/uploads/guests/${safeGuestId}/original/${originalFileName}`;
  const thumbnailImagePath = `/uploads/guests/${safeGuestId}/thumbs/${thumbFileName}`;

  return {
    profileImagePath,
    thumbnailImagePath,
    width: metadata.width || null,
    height: metadata.height || null,
    bytes: buffer.length,
    mimeType,
  };
}

export async function deleteGuestImageLocal(
  { profileImagePath, thumbnailImagePath }: DeleteGuestImageLocalParams,
) {
  const targets = [profileImagePath, thumbnailImagePath].filter(Boolean) as string[];
  for (const webPath of targets) {
    try {
      const fsPath = webToFsPath(webPath);
      await fs.unlink(fsPath);
    } catch {
      // Ignore errors (file may already be deleted)
    }
  }
  return { ok: true };
}