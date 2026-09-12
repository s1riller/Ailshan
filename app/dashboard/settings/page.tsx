import { updateAccountSettingsAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { planLabel } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function SettingsPage() {
  const { profile } = await requireActiveProfile();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Личный кабинет · тариф {planLabel(profile.plan)}</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Настройки</h1>
        <p className="text-sm text-muted-foreground">Уведомления и параметры аккаунта.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription>Что присылать на почту {profile.email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAccountSettingsAction} className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 text-sm">
              <input
                name="emailNotifications"
                type="checkbox"
                defaultChecked={profile.email_notifications ?? true}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <span>
                <span className="block font-medium">Письма о событиях и поддержке</span>
                <span className="text-muted-foreground">Ответы поддержки и важные изменения по вашим событиям.</span>
              </span>
            </label>
            <SubmitButton pendingText="Сохраняем…" className="w-full sm:w-auto">
              Сохранить
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
