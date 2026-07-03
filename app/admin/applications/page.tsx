import { updateApplicationStatusAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminApplicationsPage() {
  const admin = createAdminClient();
  const { data: applications = [] } = await admin
    .from("applications")
    .select("id, name, email, phone, message, status, created_at")
    .order("created_at", { ascending: false });
  const applicationItems = applications ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Заявки</h1>
        <p className="text-sm text-muted-foreground">Входящие заявки с лендинга.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Контакт</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicationItems.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="font-medium">{application.name}</div>
                    <div className="text-sm text-muted-foreground">{application.email}</div>
                    {application.phone ? <div className="text-sm text-muted-foreground">{application.phone}</div> : null}
                  </TableCell>
                  <TableCell className="max-w-md">{application.message}</TableCell>
                  <TableCell><Badge variant={application.status === "closed" ? "secondary" : "default"}>{application.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {["new", "in_progress", "closed"].map((status) => (
                        <form key={status} action={updateApplicationStatusAction}>
                          <input type="hidden" name="id" value={application.id} />
                          <input type="hidden" name="status" value={status} />
                          <Button type="submit" size="sm" variant="outline" disabled={application.status === status}>
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
