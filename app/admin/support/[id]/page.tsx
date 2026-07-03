import { notFound } from "next/navigation";

import { createSupportReplyAction, updateTicketStatusAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">{ticket.email}</p>
        </div>
        <Badge>{ticket.status}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Диалог</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messageItems.map((message) => (
            <div
              key={message.id}
              className={`rounded-md border p-3 ${message.sender_role === "super_admin" ? "ml-auto max-w-2xl bg-primary text-primary-foreground" : "max-w-2xl bg-background"}`}
            >
              <div className="mb-1 text-xs opacity-70">{message.sender_role}</div>
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
          <form action={createSupportReplyAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Textarea name="message" placeholder="Ответ пользователю" required />
            <Button type="submit">Отправить ответ</Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        {["open", "in_progress", "closed"].map((status) => (
          <form key={status} action={updateTicketStatusAction}>
            <input type="hidden" name="id" value={ticket.id} />
            <input type="hidden" name="status" value={status} />
            <Button type="submit" variant="outline" disabled={ticket.status === status}>
              {status}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
