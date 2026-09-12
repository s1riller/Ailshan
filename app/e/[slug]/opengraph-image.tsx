import { joinMeta } from "@/lib/labels";
import { brandImage, OG_SIZE } from "@/lib/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Страница события — фотографии гостей на экране зала";

/** Превью ссылки в мессенджере: название события, дата и место, цвет бренда организатора */
export default async function EventOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, brand_name, brand_color, cover_title, date, location")
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .maybeSingle();

  if (!event) {
    return brandImage({ title: "Страница события", subtitle: "Фотографии гостей на экране зала" });
  }

  return brandImage({
    title: event.cover_title || event.brand_name || event.title,
    subtitle: joinMeta(formatDate(event.date), event.location) || null,
    accent: event.brand_color || undefined,
  });
}
