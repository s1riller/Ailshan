import { Check } from "lucide-react";

import { markNotificationReadAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotificationsPage() {
  const { user } = await requireActiveProfile();
  const admin = createAdminClient();
  const { data: notifications = [] } = await admin
    .from("notifications")
    .select("id, title, body, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const items = notifications ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Уведомления</h1>
        <p className="text-sm text-muted-foreground">Важные события аккаунта и мероприятий.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Все уведомления</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Уведомлений пока нет.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    {!item.is_read ? <Badge>new</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
                {!item.is_read ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <Button type="submit" size="sm" variant="outline">
                      <Check className="h-4 w-4" />
                      Прочитано
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
