import Link from "next/link";

import { updateTicketStatusAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminSupportPage() {
  const admin = createAdminClient();
  const { data: tickets = [] } = await admin
    .from("support_tickets")
    .select("id, email, subject, status, created_at")
    .order("created_at", { ascending: false });
  const ticketItems = tickets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Поддержка</h1>
        <p className="text-sm text-muted-foreground">Обращения пользователей и ответы от команды.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Тикеты</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тема</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketItems.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell>{ticket.email}</TableCell>
                  <TableCell><Badge variant={ticket.status === "closed" ? "secondary" : "default"}>{ticket.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm">
                        <Link href={`/admin/support/${ticket.id}`}>Открыть</Link>
                      </Button>
                      {["open", "in_progress", "closed"].map((status) => (
                        <form key={status} action={updateTicketStatusAction}>
                          <input type="hidden" name="id" value={ticket.id} />
                          <input type="hidden" name="status" value={status} />
                          <Button type="submit" size="sm" variant="outline" disabled={ticket.status === status}>
                            {status}
                          </Button>
                        </form>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
