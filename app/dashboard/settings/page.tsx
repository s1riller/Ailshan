import { Save } from "lucide-react";

import { updateAccountSettingsAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { proLabel } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const { profile } = await requireActiveProfile();

  return (
    <div className="space-y-6">
      <div>
        <Badge>{proLabel(profile.plan)}</Badge>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="text-sm text-muted-foreground">Интерфейс, уведомления и приватность аккаунта.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Настройки аккаунта</CardTitle>
          <CardDescription>Смена пароля выполняется через Supabase Auth, здесь храним продуктовые настройки.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAccountSettingsAction} className="space-y-4">
            <label className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm">
              <input name="emailNotifications" type="checkbox" defaultChecked={profile.email_notifications ?? true} className="mt-1 h-5 w-5" />
              <span>
                <span className="block font-medium">Email-уведомления</span>
                <span className="text-muted-foreground">Получать важные сообщения о мероприятиях и поддержке.</span>
              </span>
            </label>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Сохранить настройки
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
