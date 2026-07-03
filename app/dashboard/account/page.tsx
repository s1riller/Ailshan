import { Save } from "lucide-react";

import { updateProfileAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AccountPage() {
  const { user, profile } = await requireActiveProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Профиль</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Данные организатора</CardTitle>
          <CardDescription>Эта информация нужна для поддержки и будущих документов.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя</Label>
              <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Компания / агентство</Label>
              <Input id="companyName" name="companyName" defaultValue={profile.company_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Input id="city" name="city" defaultValue={profile.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Язык</Label>
              <select id="locale" name="locale" defaultValue={profile.locale ?? "ru"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Input id="timezone" name="timezone" defaultValue={profile.timezone ?? "Asia/Irkutsk"} />
            </div>
            <Button type="submit" className="md:col-span-2">
              <Save className="h-4 w-4" />
              Сохранить профиль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
