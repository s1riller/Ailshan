import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createUserSupportMessageAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatDate } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

import { TicketStatusBadge } from "../ticket-status-badge";

export default async function DashboardSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireActiveProfile();
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, subject, status")
    .eq("id", id)
    .eq("user_id", user.id)
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
  const closed = ticket.status === "closed";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Все обращения
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="eyebrow">Обращение в поддержку</div>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">{ticket.subject}</h1>
          </div>
          <TicketStatusBadge status={ticket.status} className="sm:mt-6" />
        </div>
      </div>

      <section className="space-y-3">
        {messageItems.map((message) => {
          const mine = message.sender_role === "user";
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
                  <span className="font-medium">{mine ? "Вы" : "Поддержка"}</span>
                  {date ? <span>{date}</span> : null}
                </div>
                <p className="whitespace-pre-wrap text-sm">{message.message}</p>
              </div>
            </div>
          );
        })}
      </section>

      <form action={createUserSupportMessageAction} className="space-y-3 border-t pt-6">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <div className="space-y-2">
          <Label htmlFor="message">{closed ? "Написать ещё раз" : "Ответить"}</Label>
          <Textarea id="message" name="message" placeholder="Ваше сообщение" required />
          {closed ? (
            <p className="text-xs text-muted-foreground">Обращение закрыто. Новое сообщение откроет его снова.</p>
          ) : null}
        </div>
        <SubmitButton pendingText="Отправляем…" className="w-full sm:w-auto">
          Отправить
        </SubmitButton>
      </form>
    </div>
  );
}
