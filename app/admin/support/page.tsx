import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { TicketStatusBadge } from "@/app/dashboard/support/ticket-status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminSupportPage() {
  const admin = createAdminClient();
  const { data: tickets = [] } = await admin
    .from("support_tickets")
    .select("id, email, subject, status, created_at")
    .order("created_at", { ascending: false });
  const ticketItems = tickets ?? [];
  const open = ticketItems.filter((ticket) => ticket.status !== "closed").length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Управление платформой</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Поддержка</h1>
        <p className="text-sm text-muted-foreground">Обращения организаторов и ответы команды.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">{open > 0 ? `Открытых: ${open}` : "Открытых нет"}</div>
            <h2 className="font-serif text-2xl font-medium">Все обращения</h2>
          </div>
        </div>
        {ticketItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Обращений пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тема</TableHead>
                <TableHead>Организатор</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketItems.map((ticket) => {
                const date = formatDate(ticket.created_at);
                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.subject}</div>
                      {date ? <div className="text-xs text-muted-foreground">{date}</div> : null}
                    </TableCell>
                    <TableCell className="text-sm">{ticket.email}</TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/support/${ticket.id}`}>Открыть</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
