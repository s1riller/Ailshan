import Link from "next/link";

import { createSupportTicketAction } from "@/lib/actions/admin";
import { requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

import { TicketStatusBadge } from "./ticket-status-badge";

export default async function DashboardSupportPage() {
  const { user } = await requireActiveProfile();
  const admin = createAdminClient();
  const { data: tickets = [] } = await admin
    .from("support_tickets")
    .select("id, subject, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const ticketItems = tickets ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Личный кабинет</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Поддержка</h1>
        <p className="text-sm text-muted-foreground">Напишите, если что-то не работает или нужна помощь с событием.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новое обращение</CardTitle>
          <CardDescription>Ответ придёт сюда и в уведомления.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSupportTicketAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Тема</Label>
              <Input id="subject" name="subject" required placeholder="Не загружается фото" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea id="message" name="message" required placeholder="Опишите, что произошло и на каком событии" />
            </div>
            <SubmitButton pendingText="Отправляем…" className="w-full sm:w-auto">
              Отправить
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-1">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">История</div>
            <h2 className="font-serif text-2xl font-medium">Ваши обращения</h2>
          </div>
        </div>
        {ticketItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Обращений пока нет.</p>
        ) : (
          <ul className="divide-y">
            {ticketItems.map((ticket) => {
              const date = formatDate(ticket.created_at);
              return (
                <li key={ticket.id}>
                  <Link
                    href={`/dashboard/support/${ticket.id}`}
                    className="-mx-2 flex min-h-[60px] items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{ticket.subject}</p>
                      {date ? <p className="text-sm text-muted-foreground">{date}</p> : null}
                    </div>
                    <TicketStatusBadge status={ticket.status} className="shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
