import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createSupportReplyAction, updateTicketStatusAction } from "@/lib/actions/admin";
import { TICKET_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatDate } from "@/lib/utils";
import { TicketStatusBadge } from "@/app/dashboard/support/ticket-status-badge";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

/** Подписи действий: куда перевести обращение */
const STATUS_ACTIONS: Array<[value: string, label: string]> = [
  ["open", "Открыть снова"],
  ["in_progress", "Взять в работу"],
  ["closed", "Закрыть"],
];

export default async function AdminSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, email, subject, status, created_at")
    .eq("id", id)
    .single();

  if (!ticket) {
    notFound();
  }

  const { data: messages = [] } = await admin
    .from("support_messages")
    .select("id, sender_role, message, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });
  const messageItems = messages ?? [];
  const created = formatDate(ticket.created_at);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Все обращения
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="eyebrow">
              {ticket.email}
              {created ? ` · ${created}` : ""}
            </div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">{ticket.subject}</h1>
          </div>
          <TicketStatusBadge status={ticket.status} className="sm:mt-6" />
        </div>
      </div>

      <section className="space-y-3">
        {messageItems.map((message) => {
          const mine = message.sender_role === "super_admin";
          const date = formatDate(message.created_at);
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 sm:max-w-[75%]",
                  mine ? "bg-secondary" : "border bg-card",
                )}
              >
                <div className="mb-1 flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{mine ? "Поддержка" : "Организатор"}</span>
                  {date ? <span>{date}</span> : null}
                </div>
                <p className="whitespace-pre-wrap text-sm">{message.message}</p>
              </div>
            </div>
          );
        })}
      </section>

      <form action={createSupportReplyAction} className="space-y-3 border-t pt-6">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <div className="space-y-2">
          <Label htmlFor="message">Ответ организатору</Label>
          <Textarea id="message" name="message" placeholder="Текст ответа" required />
          <p className="text-xs text-muted-foreground">
            После отправки обращение перейдёт в статус «{TICKET_STATUS_LABEL.in_progress}», организатор получит уведомление.
          </p>
        </div>
        <SubmitButton pendingText="Отправляем…" className="w-full sm:w-auto">
          Отправить ответ
        </SubmitButton>
      </form>

      <section className="space-y-3 border-t pt-6">
        <div className="eyebrow">Статус обращения</div>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.filter(([value]) => value !== ticket.status).map(([value, label]) => (
            <form key={value} action={updateTicketStatusAction}>
              <input type="hidden" name="id" value={ticket.id} />
              <input type="hidden" name="status" value={value} />
              <SubmitButton variant="outline" size="sm" pendingText="Сохраняем…">
                {label}
              </SubmitButton>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
