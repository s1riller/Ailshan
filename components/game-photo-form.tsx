"use client";

import { Camera, ImagePlus, Loader2, RefreshCw, Send } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitGameEntryAction } from "@/lib/actions/games";
import { prepareImage, uploadWithProgress } from "@/lib/image-compress";

/**
 * Фотозадание: снимок сначала сжимается в браузере и уходит в storage, и
 * только потом вызывается серверный экшен с путём к файлу. Поэтому здесь не
 * form action, а прямой вызов экшена после загрузки.
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
  const previewUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = preparing || progress !== null;

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function resetInputs() {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  async function selectFile(nextFile?: File) {
    if (!nextFile) return;
    setError(null);

    if (nextFile.size > maxFileSizeMb * 1024 * 1024 * 4) {
      setError(`Снимок слишком большой. Выберите файл до ${maxFileSizeMb * 4} МБ.`);
      resetInputs();
      return;
    }

    setPreparing(true);
    const prepared = await prepareImage(nextFile);
    setPreparing(false);

    if ("error" in prepared) {
      setError(prepared.error);
      resetInputs();
      return;
    }

    if (prepared.file.size > maxFileSizeMb * 1024 * 1024) {
      setError(`Даже после сжатия снимок больше ${maxFileSizeMb} МБ. Попробуйте другой.`);
      URL.revokeObjectURL(prepared.previewUrl);
      resetInputs();
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = prepared.previewUrl;
    setPreviewUrl(prepared.previewUrl);
    setFile(prepared.file);
  }

  function clearFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setFile(null);
    resetInputs();
  }

  async function submit() {
    if (!file) {
      setError("Сначала сделайте снимок или выберите его из галереи.");
      return;
    }

    setError(null);
    setProgress(0);
    const filePath = `events/${eventId}/games/${crypto.randomUUID()}.jpg`;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    try {
      await uploadWithProgress({
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/event-photos/${filePath}`,
        token: anonKey,
        apikey: anonKey,
        file,
        onProgress: setProgress,
      });
    } catch (uploadError) {
      console.error("[games] photo upload", uploadError);
      setProgress(null);
      setError("Не удалось загрузить снимок. Проверьте связь и попробуйте ещё раз.");
      return;
    }

    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("slug", slug);
    formData.set("gameType", gameType);
    formData.set("content", comment.trim() || "Снимок для фотозадания");
    formData.set("meta_filePath", filePath);

    try {
      await submitGameEntryAction(formData);
    } catch (actionError) {
      // redirect() внутри экшена бросает специальное исключение — его пробрасываем дальше
      if (actionError && typeof actionError === "object" && "digest" in actionError) throw actionError;
      console.error("[games] photo entry", actionError);
      setProgress(null);
      setError("Не удалось отправить снимок. Попробуйте ещё раз.");
    }
  }

  return (
    <div className="space-y-3" aria-busy={busy}>
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
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-secondary">
          <Image src={previewUrl} alt="Снимок для задания" fill className="object-cover" sizes="100vw" />
          {progress !== null ? (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-background/60">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="absolute bottom-3 right-3"
              onClick={clearFile}
            >
              <RefreshCw className="h-4 w-4" />
              Другой снимок
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
            className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-5 text-center transition-colors hover:bg-secondary active:bg-secondary disabled:opacity-50"
          >
            {preparing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            <span className="mt-2 text-sm font-medium">{preparing ? "Готовим снимок…" : "Сделать снимок"}</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryInputRef.current?.click()}
            className="flex min-h-32 flex-col items-center justify-center rounded-xl border bg-card p-5 text-center transition-colors hover:bg-secondary active:bg-secondary disabled:opacity-50"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="mt-2 text-sm font-medium">Выбрать из галереи</span>
          </button>
        </div>
      )}

      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Комментарий команды, если хотите"
        className="min-h-20"
        maxLength={800}
        disabled={busy}
      />

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="button" className="h-12 w-full text-base" disabled={busy || !file} onClick={submit} aria-busy={busy}>
        {progress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {progress === null ? "Отправить на проверку" : progress < 1 ? `Загружаем… ${Math.round(progress * 100)}%` : "Отправляем…"}
      </Button>
    </div>
  );
}
