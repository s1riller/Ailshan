import { completeOnboardingAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function OnboardingPage() {
  await requireActiveProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="eyebrow">Личный кабинет · первый вход</div>
      <Card>
        <CardHeader>
          <CardTitle>Немного о вас</CardTitle>
          <CardDescription>Имя понадобится поддержке. Остальное можно заполнить позже в профиле.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={completeOnboardingAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Компания или агентство</Label>
              <Input id="companyName" name="companyName" autoComplete="organization" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Input id="city" name="city" autoComplete="address-level2" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton pendingText="Сохраняем…" className="w-full sm:w-auto">
                Продолжить
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
