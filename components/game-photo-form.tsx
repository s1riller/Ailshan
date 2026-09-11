"use client";

import { Camera, ImagePlus, Loader2, Send } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitGameEntryAction } from "@/lib/actions/games";
import { createClient } from "@/lib/supabase/client";

/**
 * Фото-челлендж: файл сначала уходит в storage с клиента, и только потом
 * вызывается серверный экшен с путём к файлу. Поэтому здесь не form action,
 * а прямой вызов экшена после загрузки.
 */
export function GamePhotoForm({
  eventId,
  slug,
  gameType,
  maxFileSizeMb,
}: {
  eventId: string;
  slug: string;
  gameType: string;
  maxFileSizeMb: number;
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  function selectFile(nextFile?: File) {
    if (!nextFile) return;

    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(nextFile.type)) {
      toast.error("Можно загрузить только фото JPG, PNG, WEBP или HEIC");
      return;
    }

    if (nextFile.size > maxFileSizeMb * 1024 * 1024) {
      toast.error(`Фото должно быть до ${maxFileSizeMb} МБ`);
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(nextFile);
    previewObjectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setFile(nextFile);
  }

  async function submit() {
    if (!file) {
      toast.message("Сначала сделайте фото");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `events/${eventId}/games/${crypto.randomUUID()}.${extension}`;
    const uploadResult = await supabase.storage.from("event-photos").upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (uploadResult.error) {
      setLoading(false);
      toast.error(uploadResult.error.message);
      return;
    }

    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("slug", slug);
    formData.set("gameType", gameType);
    formData.set("content", comment.trim() || "Фото-челлендж выполнен");
    formData.set("meta_filePath", filePath);

    try {
      await submitGameEntryAction(formData);
    } catch (error) {
      // redirect() внутри экшена бросает специальное исключение — его пробрасываем дальше
      if (error && typeof error === "object" && "digest" in error) throw error;
      setLoading(false);
      toast.error("Не удалось отправить фото. Попробуйте ещё раз");
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
          <Image src={previewUrl} alt="Фото для челленджа" fill className="object-cover" sizes="100vw" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center transition-colors active:bg-secondary"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera className="h-7 w-7" />
          </span>
          <span className="mt-3 font-semibold">Сделать фото</span>
        </button>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={() => galleryInputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        Выбрать из галереи
      </Button>

      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Комментарий команды (необязательно)"
        className="min-h-20"
      />

      <Button type="button" className="h-12 w-full text-base" disabled={loading} onClick={submit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Отправить на проверку
      </Button>
    </div>
  );
}
