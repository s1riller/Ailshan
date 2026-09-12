"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ImagePlus, Loader2, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createUploadMetadataAction } from "@/lib/actions/uploads";
import { readGuestName, rememberGuestName, rememberUpload } from "@/lib/guest-client";
import { prepareImage, uploadWithProgress } from "@/lib/image-compress";
import { uploadMetadataSchema } from "@/lib/validations/upload";

const formSchema = uploadMetadataSchema
  .pick({
    guestName: true,
    message: true,
  })
  .extend({
  });

type FormInput = z.infer<typeof formSchema>;

/** Что сейчас происходит со снимком: от выбора до перехода на страницу «Спасибо» */
type Phase = "idle" | "preparing" | "uploading" | "saving" | "done";

const PHASE_TEXT: Record<Exclude<Phase, "idle">, string> = {
  preparing: "Готовим снимок…",
  uploading: "Отправляем снимок…",
  saving: "Сохраняем…",
  done: "Готово",
};

function formatMegabytes(bytes: number) {
  const mb = bytes / 1048576;
  return `${(mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)).replace(".", ",")} МБ`;
}

export function GuestUploadForm({
  eventId,
  slug,
  maxFileSizeMb,
}: {
  eventId: string;
  slug: string;
  maxFileSizeMb: number;
}) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      message: "",
    },
  });

  const busy = phase !== "idle";

  // Имя из прошлой отправки: гость с пятью снимками не вводит его пять раз
  useEffect(() => {
    const remembered = readGuestName();
    if (remembered && !form.getValues("guestName")) {
      form.setValue("guestName", remembered);
    }
  }, [form]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  function replacePreview(url: string | null) {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = url;
    setPreviewUrl(url);
  }

  async function selectFile(nextFile?: File) {
    if (!nextFile || busy) return;

    // На части Android тип у HEIC пустой — отдаём такие файлы prepareImage, он скажет точнее
    if (nextFile.type && !nextFile.type.startsWith("image/")) {
      toast.error("Это не фотография. Выберите снимок из галереи или сделайте новый.");
      return;
    }

    setPhase("preparing");
    const prepared = await prepareImage(nextFile);
    setPhase("idle");

    if ("error" in prepared) {
      toast.error(prepared.error);
      return;
    }

    if (prepared.file.size > maxFileSizeMb * 1024 * 1024) {
      URL.revokeObjectURL(prepared.previewUrl);
      toast.error(`Снимок получился больше ${maxFileSizeMb} МБ. Выберите другой.`);
      return;
    }

    replacePreview(prepared.previewUrl);
    setFile(prepared.file);
  }

  async function onSubmit(values: FormInput) {
    if (!file) {
      toast.message("Сначала выберите или сделайте снимок");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const filePath = `events/${eventId}/${crypto.randomUUID()}.jpg`;

    try {
      setProgress(0);
      setPhase("uploading");
      await uploadWithProgress({
        url: `${supabaseUrl}/storage/v1/object/event-photos/${filePath}`,
        token: anonKey,
        apikey: anonKey,
        file,
        onProgress: (fraction) => setProgress(Math.round(fraction * 100)),
      });
    } catch (error) {
      console.error("storage.upload", error);
      setPhase("idle");
      submittingRef.current = false;
      toast.error("Не удалось отправить снимок. Проверьте интернет и попробуйте ещё раз.", {
        action: { label: "Повторить", onClick: () => void submitForm() },
      });
      return;
    }

    setPhase("saving");
    let result: Awaited<ReturnType<typeof createUploadMetadataAction>>;
    try {
      result = await createUploadMetadataAction({
        eventId,
        guestName: values.guestName,
        message: values.message,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        // Чекбокса нет: отправка снимка и есть согласие, об этом сказано под кнопкой
        acceptedPrivacy: true,
      });
    } catch (error) {
      console.error("createUploadMetadataAction", error);
      result = { ok: false, error: "Не удалось сохранить снимок. Проверьте интернет и попробуйте ещё раз." };
    }

    if (!result.ok) {
      setPhase("idle");
      submittingRef.current = false;
      toast.error(result.error);
      return;
    }

    rememberGuestName(values.guestName);
    rememberUpload(eventId, result.uploadId);
    setPhase("done");
    router.push(`/e/${slug}/thanks`);
    router.refresh();
  }

  function onInvalid(errors: Record<string, { message?: string } | undefined>) {
    const first = Object.values(errors)[0];
    if (first?.message) toast.error(String(first.message));
  }

  /* handleSubmit вызываем в обработчике, а не при рендере — иначе ref читается во время рендера */
  function submitForm() {
    return form.handleSubmit(onSubmit, onInvalid)();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitForm();
        }}
        className="space-y-5"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void selectFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void selectFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <div className="space-y-3">
          {/* Контейнер всегда 4:3 — превью не двигает поля вниз, когда появляется */}
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="relative aspect-[4/3] bg-secondary">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Выбранный снимок"
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 512px"
                />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center p-6 text-center transition-colors active:bg-muted disabled:opacity-60"
                >
                  {phase === "preparing" ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Camera className="h-7 w-7" />
                    </span>
                  )}
                  <span className="mt-4 font-serif text-2xl font-medium">
                    {phase === "preparing" ? "Готовим снимок" : "Сделать фото"}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {phase === "preparing" ? "Это займёт несколько секунд" : "Камера откроется сразу"}
                  </span>
                </button>
              )}
            </div>
            {file ? (
              <div className="flex items-center justify-between gap-3 border-t p-3">
                <p className="text-sm text-muted-foreground">Снимок выбран · {formatMegabytes(file.size)}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  disabled={busy}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <RotateCcw className="h-4 w-4" />
                  Переснять
                </Button>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            {file ? "Выбрать другое фото" : "Выбрать из галереи"}
          </Button>
        </div>

        <FormField
          control={form.control}
          name="guestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ваше имя</FormLabel>
              <FormControl>
                <Input
                  placeholder="Как вас зовут"
                  autoComplete="name"
                  disabled={busy}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пожелание</FormLabel>
              <FormControl>
                <Textarea placeholder="Несколько тёплых слов, если хочется" disabled={busy} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/*
          Панель отправки — последний элемент карточки: липнет к низу экрана,
          а под ней ничего не остаётся. Отступы компенсируют p-5 / sm:p-6 у CardContent.
        */}
        <div className="sticky bottom-16 -mx-5 rounded-b-xl border-t bg-card/95 px-5 pb-5 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
          {busy && phase !== "preparing" ? (
            <div className="mb-3" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{PHASE_TEXT[phase]}</span>
                <span className="tabular text-muted-foreground">
                  {phase === "uploading" ? `${progress} %` : phase === "done" ? "100 %" : null}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${phase === "uploading" ? progress : 100}%` }}
                />
              </div>
            </div>
          ) : null}
          <Button disabled={busy} size="lg" className="w-full" type="submit" aria-busy={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy && phase !== "preparing" ? PHASE_TEXT[phase] : "Отправить снимок"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
