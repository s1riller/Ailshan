"use client";

import { useState } from "react";

import { createApplicationAction } from "@/lib/actions/admin";
import { FlashMessage } from "@/components/flash-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Заявка агентства или площадки. Поля и их имена — контракт с
 * createApplicationAction: name, email, phone, message. После отправки экшен
 * возвращает на «/?application=sent»; подтверждение запоминается в состоянии,
 * чтобы пережить очистку адреса и не исчезнуть раньше, чем его прочитают.
 */
export function ApplicationForm({ sent = false }: { sent?: boolean }) {
  const [confirmed] = useState(sent);

  return (
    <div className="space-y-5">
      {confirmed ? (
        <FlashMessage message="Заявка отправлена. Мы ответим на указанную почту." params={["application"]} />
      ) : null}
      <form action={createApplicationAction} className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="application-name">Имя</Label>
          <Input id="application-name" name="name" required autoComplete="name" placeholder="Как к вам обращаться" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-email">Email</Label>
          <Input
            id="application-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="name@agency.ru"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="application-phone">Телефон</Label>
          <Input
            id="application-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+7 900 000-00-00"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="application-message">Сообщение</Label>
          <Textarea
            id="application-message"
            name="message"
            required
            rows={4}
            placeholder="Дата, формат и количество гостей — этого достаточно"
          />
        </div>
        <div className="sm:col-span-2">
          <SubmitButton variant="outline" pendingText="Отправляем…" className="w-full sm:w-auto">
            Отправить
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
