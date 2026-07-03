import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEventAction } from "@/lib/actions/events";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Новое мероприятие</CardTitle>
          <CardDescription>Для milestone 1 создается одна основная QR-зона.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input id="title" name="title" placeholder="Свадьба Анны и Ильи" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Дата</Label>
                <Input id="date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Локация</Label>
                <Input id="location" name="location" placeholder="Иркутск" />
              </div>
            </div>
            <Button type="submit">
              <CalendarPlus className="h-4 w-4" />
              Создать
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
