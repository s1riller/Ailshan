import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createEventAction } from "@/lib/actions/events";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="eyebrow">Личный кабинет · События</div>
      <Card>
        <CardHeader>
          <CardTitle>Новое событие</CardTitle>
          <CardDescription>Название, дата и место. Всё остальное можно настроить позже.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input id="title" name="title" placeholder="Свадьба Анны и Ильи" required autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Дата</Label>
                <Input id="date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Место проведения</Label>
                <Input id="location" name="location" placeholder="Ресторан «Вилла», Иркутск" />
              </div>
            </div>
            <SubmitButton pendingText="Создаём…" className="w-full sm:w-auto">
              Создать событие
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
