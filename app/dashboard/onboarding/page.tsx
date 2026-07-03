import { completeOnboardingAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function OnboardingPage() {
  await requireActiveProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Настроим личный кабинет</CardTitle>
          <CardDescription>Заполните пару полей, затем создадим первое мероприятие.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={completeOnboardingAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Компания</Label>
              <Input id="companyName" name="companyName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Input id="city" name="city" />
            </div>
            <Button type="submit" className="md:col-span-2">Продолжить</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
