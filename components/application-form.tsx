import { Send } from "lucide-react";

import { createApplicationAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ApplicationForm() {
  return (
    <form action={createApplicationAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="application-name">Имя</Label>
        <Input id="application-name" name="name" required placeholder="Алина" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="application-email">Email</Label>
        <Input id="application-email" name="email" type="email" required placeholder="you@example.com" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="application-phone">Телефон</Label>
        <Input id="application-phone" name="phone" placeholder="+7..." />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="application-message">Сообщение</Label>
        <Textarea id="application-message" name="message" required placeholder="Расскажите о мероприятии или вопросе" />
      </div>
      <Button type="submit" className="md:col-span-2">
        <Send className="h-4 w-4" />
        Отправить заявку
      </Button>
    </form>
  );
}
