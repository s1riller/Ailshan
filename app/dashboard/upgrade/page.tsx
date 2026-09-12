import Link from "next/link";
import { Check } from "lucide-react";

import { requireActiveProfile } from "@/lib/authz";
import { planLabel } from "@/lib/labels";
import { FREE_PHOTO_LIMIT, FREE_STORAGE_DAYS, isPro, PRO_PHOTO_LIMIT, PRO_STORAGE_DAYS } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const basicFeatures = [
  `До ${FREE_PHOTO_LIMIT} снимков на событие`,
  `Хранение ${FREE_STORAGE_DAYS} дней`,
  "Страница события и QR-код",
  "Модерация снимков вручную",
  "Экран зала",
];

const premiumFeatures = [
  `До ${PRO_PHOTO_LIMIT} снимков на событие`,
  `Хранение ${PRO_STORAGE_DAYS} дней`,
  "Оформление под событие и собственная ссылка",
  "Дополнительные раскладки экрана зала",
  "QR-код на экране и печатный постер",
  "Автоматическое одобрение снимков",
  "Архив фотографий и пожеланий после события",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="divide-y text-sm">
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-3 py-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function UpgradePage() {
  const { profile } = await requireActiveProfile();
  const premium = isPro(profile.plan);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Личный кабинет · тариф {planLabel(profile.plan)}</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Тарифы</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Базовый тариф покрывает сбор и показ фотографий. Премиум добавляет оформление, архив и расширенные
          лимиты для агентств.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Тариф</div>
              <h2 className="font-serif text-3xl font-medium">Базовый</h2>
            </div>
            {!premium ? (
              <Badge dot variant="accent">
                Ваш тариф
              </Badge>
            ) : null}
          </div>
          <p className="font-serif tabular mt-4 text-3xl font-medium">0 ₽</p>
          <p className="text-sm text-muted-foreground">Для одного события без оформления</p>
          <div className="mt-5 border-t">
            <FeatureList items={basicFeatures} />
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-foreground/30 bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Тариф</div>
              <h2 className="font-serif text-3xl font-medium">Премиум</h2>
            </div>
            {premium ? (
              <Badge dot variant="accent">
                Ваш тариф
              </Badge>
            ) : null}
          </div>
          <p className="font-serif mt-4 text-3xl font-medium">По запросу</p>
          <p className="text-sm text-muted-foreground">Для агентств и серии событий</p>
          <div className="mt-5 border-t">
            <FeatureList items={premiumFeatures} />
          </div>
          {!premium ? (
            <div className="mt-auto pt-5">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/support">Запросить подключение</Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Напишите в поддержку: подключим Премиум и ответим на вопросы по срокам и оплате.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
