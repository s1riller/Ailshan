"use client";

export type PreparedImage = {
  file: File;
  previewUrl: string;
  originalSize: number;
};

export type PrepareImageError = {
  error: string;
};

const MAX_SIDE = 1920;
const JPEG_QUALITY = 0.82;

/**
 * Готовит снимок к отправке прямо в браузере: уменьшает до 1920px по длинной
 * стороне и перекодирует в JPEG. Из 3–8 МБ с телефона получается 300–600 КБ —
 * на банкетном Wi-Fi это разница между «ушло» и «гость закрыл вкладку».
 * Заодно решает HEIC: если браузер умеет его декодировать (Safari), на выходе
 * всё равно JPEG, который увидят все.
 */
export async function prepareImage(file: File): Promise<PreparedImage | PrepareImageError> {
  let bitmap: ImageBitmap;

  try {
    // from-image разворачивает кадр по EXIF — иначе вертикальные фото лягут на бок
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return {
      error: "Этот формат не открывается на вашем устройстве. Выберите фото в JPG или PNG.",
    };
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { error: "Не удалось обработать фото. Попробуйте другой снимок." };
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) {
    return { error: "Не удалось обработать фото. Попробуйте другой снимок." };
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  const prepared = new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });

  return {
    file: prepared,
    previewUrl: URL.createObjectURL(prepared),
    originalSize: file.size,
  };
}

/**
 * supabase-js не отдаёт прогресс загрузки, поэтому шлём файл через XHR на тот же
 * endpoint storage и читаем upload.onprogress. Возвращает долю 0..1.
 */
export function uploadWithProgress({
  url,
  token,
  apikey,
  file,
  onProgress,
}: {
  url: string;
  token: string;
  apikey: string;
  file: File;
  onProgress: (fraction: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apikey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        let message = `Ошибка загрузки (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          message = body.message || body.error || message;
        } catch {
          // тело не JSON — оставляем статус
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Нет связи. Проверьте интернет и попробуйте ещё раз."));
    xhr.ontimeout = () => reject(new Error("Загрузка заняла слишком много времени. Попробуйте ещё раз."));
    xhr.timeout = 120000;
    xhr.send(file);
  });
}
