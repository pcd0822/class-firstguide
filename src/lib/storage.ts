import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './firebase';
import type { ImageKeys } from './types';

const UPLOAD_PATH = 'class-images';

export function imageRef(classId: string, key: ImageKeys) {
  return ref(storage, `${UPLOAD_PATH}/${classId}/${key}`);
}

export function uploadImage(
  classId: string,
  key: ImageKeys,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const ref = imageRef(classId, key);
  const task = uploadBytesResumable(ref, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000',
  });

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export async function deleteImage(classId: string, key: ImageKeys): Promise<void> {
  const ref = imageRef(classId, key);
  try {
    await deleteObject(ref);
  } catch {
    // ignore if not exists
  }
}
