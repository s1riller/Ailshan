import { notFound } from "next/navigation";
import { Send } from "lucide-react";

import { createUserSupportMessageAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">Диалог с поддержкой</p>
        </div>
        <Badge>{ticket.status}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Сообщения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messageItems.map((message) => (
            <div
              key={message.id}
              className={`rounded-md border p-3 ${message.sender_role === "user" ? "ml-auto max-w-2xl bg-primary text-primary-foreground" : "max-w-2xl bg-background"}`}
            >
              <div className="mb-1 text-xs opacity-70">{message.sender_role === "user" ? "Вы" : "Поддержка"}</div>
              <p className="whitespace-pre-wrap text-sm">{message.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ответить</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserSupportMessageAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Textarea name="message" placeholder="Ваше сообщение" required />
            <Button type="submit">
              <Send className="h-4 w-4" />
              Отправить
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
