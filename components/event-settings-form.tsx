import { Save } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { updateEventSettingsAction } from "@/lib/actions/events";

type EventSettingsFormProps = {
  event: {
    id: string;
    title: string;
    date: string | null;
    location: string | null;
    is_active: boolean;
    guest_intro: string | null;
    thanks_text: string | null;
    live_layout: string | null;
    live_transition?: string | null;
    slide_duration_seconds?: number | null;
    live_qr_effect?: string | null;
    live_qr_interval_seconds?: number | null;
    show_messages_on_live: boolean | null;
    show_names_on_live?: boolean | null;
    show_qr_on_live?: boolean | null;
    auto_approve: boolean | null;
    max_file_size_mb: number | null;
    custom_slug?: string | null;
    brand_name?: string | null;
    brand_color?: string | null;
    cover_title?: string | null;
    guest_instruction?: string | null;
    archive_enabled?: boolean | null;
  };
  isPro: boolean;
};

const liveLayouts = [
  ["halo", "Карусель"],
  ["masonry", "Плитка"],
  ["featured", "Главный кадр"],
  ["slideshow", "Слайд-шоу"],
  ["compact", "Компактная сетка"],
] as const;

const liveTransitions = [
  ["fade", "Плавное затемнение"],
  ["slide", "Сдвиг"],
  ["zoom", "Приближение"],
  ["stories", "Истории"],
] as const;

const liveQrEffects = [
  ["fade", "Плавное появление"],
  ["slide", "Выезд сбоку"],
  ["pulse", "Пульсация"],
  ["stories", "Истории"],
] as const;

const PREMIUM_HINT = "Доступно на тарифе Премиум";

const selectClassName =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none sm:h-10 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60";

const checkClassName = "mt-0.5 h-5 w-5 shrink-0 rounded border-input disabled:cursor-not-allowed";

function SectionHeader({ title, description, premium }: { title: string; description: string; premium?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3">
      <div>
        <h3 className="font-serif text-xl font-medium">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {premium ? (
        <Badge variant="outline" className="shrink-0">
          Премиум
        </Badge>
      ) : null}
    </div>
  );
}

function CheckRow({
  name,
  title,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm has-[:disabled]:opacity-60">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} disabled={disabled} className={checkClassName} />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function EventSettingsForm({ event, isPro }: EventSettingsFormProps) {
  return (
    <form action={updateEventSettingsAction} className="space-y-8">
      <input type="hidden" name="eventId" value={event.id} />

      <section className="space-y-4">
        <SectionHeader title="Основное" description="Название, дата, место проведения и ограничения для загрузки." />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input id="title" name="title" defaultValue={event.title} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Место проведения</Label>
            <Input
              id="location"
              name="location"
              defaultValue={event.location ?? ""}
              placeholder="Ресторан, банкетный зал, адрес"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Дата</Label>
            <Input id="date" name="date" type="date" defaultValue={event.date ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxFileSizeMb">Максимальный размер фото, МБ</Label>
            <Input
              id="maxFileSizeMb"
              name="maxFileSizeMb"
              type="number"
              min={1}
              max={25}
              defaultValue={event.max_file_size_mb ?? 10}
            />
            <p className="text-xs text-muted-foreground">Рекомендуем 10–15 МБ: этого хватает для фото с телефона.</p>
          </div>
        </div>

        <CheckRow
          name="isActive"
          title="Идёт приём фото"
          description="Гости могут открывать страницу события и загружать снимки."
          defaultChecked={event.is_active}
        />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Тексты для гостей" description="Их видят гости на странице события." />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guestIntro">Текст на гостевой странице</Label>
            <Textarea
              id="guestIntro"
              name="guestIntro"
              defaultValue={event.guest_intro ?? "Поделитесь снимком и пожеланием с события."}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestInstruction">Подсказка гостям</Label>
            <Textarea
              id="guestInstruction"
              name="guestInstruction"
              defaultValue={event.guest_instruction ?? "Загрузите фото и пожелание по ссылке события."}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Короткое пояснение под текстом на гостевой странице.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="thanksText">Подпись на странице благодарности</Label>
            <Textarea
              id="thanksText"
              name="thanksText"
              defaultValue={
                event.thanks_text ?? "Снимок передан организаторам. Лучшие фотографии появятся на экране в зале."
              }
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Экран зала" description="Как снимки показываются на большом экране во время события." />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="liveLayout">Раскладка экрана</Label>
            <select id="liveLayout" name="liveLayout" defaultValue={event.live_layout ?? "masonry"} className={selectClassName}>
              {liveLayouts.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveTransition">Эффект перелистывания</Label>
            <select
              id="liveTransition"
              name="liveTransition"
              defaultValue={event.live_transition ?? "fade"}
              disabled={!isPro}
              className={selectClassName}
            >
              {liveTransitions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {!isPro ? <p className="text-xs text-muted-foreground">{PREMIUM_HINT}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slideDurationSeconds">Смена кадра, секунд</Label>
            <Input
              id="slideDurationSeconds"
              name="slideDurationSeconds"
              type="number"
              min={3}
              max={20}
              defaultValue={event.slide_duration_seconds ?? 5}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CheckRow
            name="showNamesOnLive"
            title="Показывать имена на экране"
            description="Можно оставить на экране только фотографии."
            defaultChecked={event.show_names_on_live ?? true}
          />
          <CheckRow
            name="showMessagesOnLive"
            title="Показывать пожелания на экране"
            description="Если выключить, на экране останутся только имена и фото."
            defaultChecked={event.show_messages_on_live ?? true}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="QR и автоодобрение"
          description="QR-код на экране зала и снимки без ручной проверки."
          premium
        />

        <div className="grid gap-3 md:grid-cols-2">
          <CheckRow
            name="showQrOnLive"
            title="Показывать QR на экране зала"
            description="Код будет периодически появляться поверх снимков, чтобы гости могли присоединиться."
            defaultChecked={event.show_qr_on_live ?? false}
            disabled={!isPro}
          />
          <CheckRow
            name="autoApprove"
            title="Автоодобрение новых фото"
            description="Снимки попадают на экран сразу, без вашей проверки."
            defaultChecked={event.auto_approve ?? false}
            disabled={!isPro}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="liveQrEffect">Появление QR</Label>
            <select
              id="liveQrEffect"
              name="liveQrEffect"
              defaultValue={event.live_qr_effect ?? "fade"}
              disabled={!isPro}
              className={selectClassName}
            >
              {liveQrEffects.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveQrIntervalSeconds">Интервал показа QR, секунд</Label>
            <Input
              id="liveQrIntervalSeconds"
              name="liveQrIntervalSeconds"
              type="number"
              min={10}
              max={120}
              defaultValue={event.live_qr_interval_seconds ?? 30}
              disabled={!isPro}
            />
            <p className="text-xs text-muted-foreground">Например, раз в 30 секунд.</p>
          </div>
        </div>

        {!isPro ? (
          <p className="text-sm text-muted-foreground">
            {PREMIUM_HINT}.{" "}
            <Link href="/dashboard/upgrade" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
              Сравнить тарифы
            </Link>
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Оформление и архив"
          description="Собственная ссылка, цвет события, заголовок для QR и архив после события."
          premium
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customSlug">Собственная ссылка</Label>
            <Input
              id="customSlug"
              name="customSlug"
              defaultValue={event.custom_slug ?? ""}
              placeholder="anna-ilya"
              disabled={!isPro}
            />
            <p className="text-xs text-muted-foreground">Например, /e/anna-ilya — латиница, цифры и дефисы.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandName">Имена или название</Label>
            <Input
              id="brandName"
              name="brandName"
              defaultValue={event.brand_name ?? ""}
              placeholder="Анна и Илья"
              disabled={!isPro}
            />
            <p className="text-xs text-muted-foreground">Показывается на экране зала вместо названия события.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandColor">Цвет события</Label>
            <div className="flex gap-2">
              <Input
                id="brandColor"
                name="brandColor"
                type="color"
                defaultValue={event.brand_color ?? "#1f1d1a"}
                disabled={!isPro}
                aria-label="Выбрать цвет"
                className="h-11 w-14 shrink-0 p-1 sm:h-10"
              />
              <Input
                name="brandColorText"
                defaultValue={event.brand_color ?? "#1f1d1a"}
                disabled={!isPro}
                placeholder="#1f1d1a"
                aria-label="Цвет в текстовом виде"
              />
            </div>
            <p className="text-xs text-muted-foreground">Цвет в формате #ee2a7b. Используется в рамке QR-кода.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverTitle">Заголовок на QR-карточке</Label>
            <Input
              id="coverTitle"
              name="coverTitle"
              defaultValue={event.cover_title ?? ""}
              placeholder="Поделитесь снимками с нами"
              disabled={!isPro}
            />
          </div>
        </div>

        <CheckRow
          name="archiveEnabled"
          title="Архив после события"
          description="Архив фотографий и файл с пожеланиями после события."
          defaultChecked={event.archive_enabled ?? false}
          disabled={!isPro}
        />

        {!isPro ? (
          <p className="text-sm text-muted-foreground">
            {PREMIUM_HINT}.{" "}
            <Link href="/dashboard/upgrade" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
              Сравнить тарифы
            </Link>
          </p>
        ) : null}
      </section>

      {/*
        Липкая панель сохранения: на телефоне держится над нижней навигацией,
        подложка с размытием не даёт кнопке висеть поверх последнего поля.
      */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-5 border-t bg-card/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:rounded-b-xl lg:border-0 lg:bg-transparent lg:px-0 lg:py-2 lg:backdrop-blur-0">
        <div className="flex justify-end">
          <SubmitButton size="lg" pendingText="Сохраняем…" className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Сохранить настройки
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
