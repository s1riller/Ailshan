import Link from "next/link";
import { LifeBuoy, Send } from "lucide-react";

import { createSupportTicketAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function DashboardSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: tickets = [] } = await admin
    .from("support_tickets")
    .select("id, subject, status, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });
  const ticketItems = tickets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Поддержка</h1>
        <p className="text-sm text-muted-foreground">Напишите нам, если нужна помощь с мероприятием.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Новое обращение
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSupportTicketAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Тема</Label>
              <Input id="subject" name="subject" required placeholder="Не загружается фото" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea id="message" name="message" required placeholder="Опишите проблему или вопрос" />
            </div>
            <Button type="submit">
              <Send className="h-4 w-4" />
              Отправить
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Мои обращения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ticketItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Обращений пока нет.</p>
          ) : (
            ticketItems.map((ticket) => (
              <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`} className="flex items-center justify-between rounded-md border bg-background p-3">
                <span className="font-medium">{ticket.subject}</span>
                <Badge>{ticket.status}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
