import { toggleUserBlockedAction, updateUserPlanAction } from "@/lib/actions/admin";
import { USER_ROLE_LABEL, labelOf, planLabel } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: users = [] } = await admin
    .from("profiles")
    .select("id, email, role, plan, is_blocked, created_at")
    .order("created_at", { ascending: false });
  const userItems = users ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Управление платформой</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Организаторы</h1>
        <p className="text-sm text-muted-foreground">Аккаунты, тарифы и доступ к платформе.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Всего: {userItems.length}</div>
            <h2 className="font-serif text-2xl font-medium">Все аккаунты</h2>
          </div>
        </div>
        {userItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Организаторов пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Почта</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Доступ</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userItems.map((user) => {
                const isAdmin = user.role === "super_admin";
                const premium = user.plan === "pro";
                const registered = formatDate(user.created_at);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.email}</div>
                      {registered ? <div className="text-xs text-muted-foreground">с {registered}</div> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isAdmin ? "default" : "secondary"}>{labelOf(USER_ROLE_LABEL, user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={premium ? "accent" : "secondary"}>{planLabel(user.plan)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge dot variant={user.is_blocked ? "destructive" : "success"}>
                        {user.is_blocked ? "Заблокирован" : "Активен"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end gap-2">
                        <form action={updateUserPlanAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="plan" value={premium ? "free" : "pro"} />
                          <SubmitButton variant="outline" size="sm" pendingText="Меняем…">
                            {premium ? "Вернуть Базовый" : "Включить Премиум"}
                          </SubmitButton>
                        </form>
                        <form action={toggleUserBlockedAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="isBlocked" value={String(user.is_blocked)} />
                          <SubmitButton
                            variant={user.is_blocked ? "outline" : "destructive"}
                            size="sm"
                            disabled={isAdmin}
                            pendingText="Сохраняем…"
                          >
                            {user.is_blocked ? "Разблокировать" : "Заблокировать"}
                          </SubmitButton>
                        </form>
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
