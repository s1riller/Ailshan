"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ImagePlus, Loader2, RotateCcw, Send } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { uploadMetadataSchema } from "@/lib/validations/upload";

const formSchema = uploadMetadataSchema
  .pick({
    guestName: true,
    message: true,
  })
  .extend({
    acceptedPrivacy: z.boolean().refine((value) => value, "Нужно согласие перед отправкой"),
  });

type FormInput = z.infer<typeof formSchema>;

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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      message: "",
      acceptedPrivacy: false,
    },
  });

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

  async function onSubmit(values: FormInput) {
    if (!file) {
      toast.message("Сначала сделайте фото");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `events/${eventId}/${crypto.randomUUID()}.${extension}`;

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

    const metadataResult = await createUploadMetadataAction({
      eventId,
      guestName: values.guestName,
      message: values.message,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      acceptedPrivacy: values.acceptedPrivacy,
    });

    setLoading(false);

    if (!metadataResult.ok) {
      toast.error(metadataResult.error);
      return;
    }

    router.push(`/e/${slug}/thanks`);
    router.refresh();
  }

  const submitHandler = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form onSubmit={submitHandler} className="space-y-5">
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

        <div className="space-y-3">
          {previewUrl ? (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={previewUrl} alt="Выбранное фото" fill className="object-cover" sizes="100vw" />
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">Фото готово к отправке</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                  <RotateCcw className="h-4 w-4" />
                  Переснять
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex min-h-48 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center transition-colors active:bg-secondary"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Camera className="h-8 w-8" />
              </span>
              <span className="mt-4 text-lg font-semibold">Сделать фото</span>
              <span className="mt-1 text-sm text-muted-foreground">Камера откроется сразу</span>
            </button>
          )}

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Выбрать из галереи
          </Button>
        </div>

        <FormField
          control={form.control}
          name="guestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ваше имя</FormLabel>
              <FormControl>
                <Input className="h-12 text-base" placeholder="Алина" autoComplete="name" {...field} />
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
                <Textarea className="min-h-24 text-base" placeholder="Напишите пару теплых слов" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptedPrivacy"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-input"
                />
                <span>Я понимаю, что материалы будут доступны организатору мероприятия.</span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="sticky bottom-0 -mx-6 bg-card px-6 pb-1 pt-2">
          <Button disabled={loading} size="lg" className="h-12 w-full text-base" type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Отправить фото
          </Button>
        </div>
      </form>
    </Form>
  );
}
