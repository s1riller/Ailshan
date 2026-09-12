import { Check } from "lucide-react";

import { markNotificationReadAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function NotificationsPage() {
  const { user } = await requireActiveProfile();
  const admin = createAdminClient();
  const { data: notifications = [] } = await admin
    .from("notifications")
    .select("id, title, body, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const items = notifications ?? [];
  const unread = items.filter((item) => !item.is_read).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Личный кабинет</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Уведомления</h1>
        <p className="text-sm text-muted-foreground">Ответы поддержки и важные изменения по вашим событиям.</p>
      </div>

      <section className="space-y-1">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">{unread > 0 ? `Непрочитанных: ${unread}` : "Все прочитаны"}</div>
            <h2 className="font-serif text-2xl font-medium">Лента</h2>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Уведомлений пока нет.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const date = formatDate(item.created_at);
              return (
                <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={item.is_read ? "font-medium text-muted-foreground" : "font-medium"}>{item.title}</p>
                      {!item.is_read ? (
                        <Badge dot variant="accent">
                          Новое
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                    {date ? <p className="text-xs text-muted-foreground">{date}</p> : null}
                  </div>
                  {!item.is_read ? (
                    <form action={markNotificationReadAction} className="sm:shrink-0">
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton size="sm" variant="outline" pendingText="Отмечаем…">
                        <Check className="h-4 w-4" />
                        Прочитано
                      </SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
