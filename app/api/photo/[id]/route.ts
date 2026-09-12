import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Одобренные снимки по постоянному адресу /api/photo/<id>.
 *
 * Подписанные ссылки Supabase живут 20 минут и каждый раз новые — браузер и
 * оптимизатор картинок не могли бы их кэшировать, и галерея перекачивала бы
 * все фото при каждом обновлении. Здесь адрес стабильный, а ответ кэшируется
 * на час. Наружу уходят только одобренные фото активных событий.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse(null, { status: 404 });

  const admin = createAdminClient();
  const { data: upload } = await admin
    .from("uploads")
    .select("file_path, file_type, status, events!uploads_event_id_fkey!inner(is_active)")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  const event = (upload?.events ?? null) as { is_active: boolean } | null;
  if (!upload || !event?.is_active) return new NextResponse(null, { status: 404 });

  const { data: file, error } = await admin.storage.from("event-photos").download(upload.file_path);
  if (error || !file) {
    console.error("[photo]", id, error?.message);
    return new NextResponse(null, { status: 404 });
  }

  // Буфер, а не поток: внутренний запрос оптимизатора картинок Next получает
  // от потока Blob пустое тело. После сжатия на клиенте снимки небольшие.
  const bytes = await file.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": upload.file_type || file.type || "image/jpeg",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
