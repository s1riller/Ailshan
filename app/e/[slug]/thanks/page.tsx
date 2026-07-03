import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ThanksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("slug, custom_slug, thanks_text")
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .single();

  if (!event) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Спасибо!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {event.thanks_text || "Фото отправлено организатору и появится на экране после одобрения."}
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href={`/e/${event.custom_slug || event.slug}`}>Отправить еще фото</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
