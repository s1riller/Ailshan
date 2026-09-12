import { updateProfileAction } from "@/lib/actions/profile";
import { requireActiveProfile } from "@/lib/authz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none sm:h-10 sm:text-sm";

export default async function AccountPage() {
  const { user, profile } = await requireActiveProfile();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Личный кабинет</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Профиль</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Данные организатора</CardTitle>
          <CardDescription>Понадобятся поддержке и для документов по вашим событиям.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя</Label>
              <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Компания или агентство</Label>
              <Input id="companyName" name="companyName" defaultValue={profile.company_name ?? ""} autoComplete="organization" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Input id="city" name="city" defaultValue={profile.city ?? ""} autoComplete="address-level2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Язык</Label>
              <select id="locale" name="locale" defaultValue={profile.locale ?? "ru"} className={selectClass}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Input id="timezone" name="timezone" defaultValue={profile.timezone ?? "Asia/Irkutsk"} />
            </div>
            <div className="md:col-span-2">
              <SubmitButton pendingText="Сохраняем…" className="w-full sm:w-auto">
                Сохранить
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
