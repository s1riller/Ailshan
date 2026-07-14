import { notFound } from "next/navigation";
import Link from "next/link";

import { GuestUploadForm } from "@/components/guest-upload-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export default async function GuestEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, custom_slug, brand_name, brand_color, cover_title, date, location, is_active, guest_intro, max_file_size_mb")
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .eq("is_active", true)
    .single();

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6">
          <p className="text-sm font-medium text-primary">Ailshan</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">{event.cover_title || event.brand_name || event.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDate(event.date)} · {event.location || "Локация не указана"}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Поделитесь фото</CardTitle>
            <CardDescription>
              {event.guest_intro || "Добавьте имя, пожелание и один снимок с мероприятия."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GuestUploadForm eventId={event.id} slug={event.custom_slug || event.slug} maxFileSizeMb={event.max_file_size_mb ?? 10} />
          </CardContent>
        </Card>
        <div className="mt-4 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Командный квиз от ведущего</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте команду или войдите по коду друзей. Ведущий объявит старт, а вопрос появится прямо на телефоне.
          </p>
          <Button asChild className="mt-3 w-full" variant="outline">
            <Link href={`/e/${event.custom_slug || event.slug}/play`}>Присоединиться к квизу</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
