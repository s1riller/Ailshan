import { ShieldAlert } from "lucide-react";

import { toggleUserBlockedAction, updateUserPlanAction } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: users = [] } = await admin
    .from("profiles")
    .select("id, email, role, plan, is_blocked, created_at")
    .order("created_at", { ascending: false });
  const userItems = users ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Пользователи</h1>
        <p className="text-sm text-muted-foreground">Управление аккаунтами организаторов.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Все пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userItems.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.plan === "pro" ? "default" : "secondary"}>{user.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_blocked ? "destructive" : "outline"}>
                      {user.is_blocked ? "blocked" : "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={toggleUserBlockedAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="isBlocked" value={String(user.is_blocked)} />
                      <Button variant="outline" size="sm" type="submit" disabled={user.role === "super_admin"}>
                        <ShieldAlert className="h-4 w-4" />
                        {user.is_blocked ? "Разблокировать" : "Заблокировать"}
                      </Button>
                    </form>
                    <form action={updateUserPlanAction} className="mt-2">
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="plan" value={user.plan === "pro" ? "free" : "pro"} />
                      <Button variant="outline" size="sm" type="submit">
                        {user.plan === "pro" ? "Вернуть Free" : "Включить Pro"}
                      </Button>
                    </form>
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
