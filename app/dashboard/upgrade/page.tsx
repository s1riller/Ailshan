import { CheckCircle2, Crown } from "lucide-react";

import { requireActiveProfile } from "@/lib/authz";
import { FREE_PHOTO_LIMIT, FREE_STORAGE_DAYS, PRO_PHOTO_LIMIT, PRO_STORAGE_DAYS, proLabel } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const proFeatures = [
  `${PRO_PHOTO_LIMIT} фото на мероприятие`,
  `Хранение ${PRO_STORAGE_DAYS} дней`,
  "Премиум live-шаблоны",
  "Кастомная ссылка",
  "Брендинг и QR-постер",
  "Автоодобрение",
  "Экспорт архива после события",
];

export default async function UpgradePage() {
  const { profile } = await requireActiveProfile();

  return (
    <div className="space-y-6">
      <div>
        <Badge>{proLabel(profile.plan)}</Badge>
        <h1 className="mt-3 text-2xl font-semibold">Тарифы Ailshan</h1>
        <p className="text-sm text-muted-foreground">
          Базовый сценарий остается бесплатным. Платными становятся удобства после того, как сервис уже дал ценность.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">0 ₽</p>
            <ul className="space-y-2 text-sm">
              <li>{FREE_PHOTO_LIMIT} фото на мероприятие</li>
              <li>Хранение {FREE_STORAGE_DAYS} дней</li>
              <li>Базовая гостевая страница</li>
              <li>Ручная модерация</li>
              <li>Базовый live-экран</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Pro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold">Event Pro</p>
            <ul className="space-y-2 text-sm">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full" disabled>
              Оплата будет подключена позже
            </Button>
            <p className="text-xs text-muted-foreground">
              Пока биллинг не подключен, Pro включается вручную супер-админом в Supabase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
