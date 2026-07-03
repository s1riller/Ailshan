import { Save } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ["masonry", "Плитка"],
  ["featured", "Featured-фото"],
  ["slideshow", "Слайд-шоу"],
  ["compact", "Компактная сетка"],
] as const;

const liveTransitions = [
  ["fade", "Fade"],
  ["slide", "Slide"],
  ["zoom", "Zoom"],
  ["stories", "Stories"],
] as const;

const liveQrEffects = [
  ["fade", "Плавное появление"],
  ["slide", "Выезд сбоку"],
  ["pulse", "Пульсация"],
  ["stories", "Stories"],
] as const;

export function EventSettingsForm({ event, isPro }: EventSettingsFormProps) {
  return (
    <form action={updateEventSettingsAction} className="space-y-6">
      <input type="hidden" name="eventId" value={event.id} />

      <section className="space-y-4 rounded-lg border bg-background p-4">
        <div>
          <h3 className="font-semibold">Основные настройки</h3>
          <p className="text-sm text-muted-foreground">
            Название, дата, место и ограничения для загрузки фото.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              name="title"
              defaultValue={event.title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Локация</Label>
            <Input
              id="location"
              name="location"
              defaultValue={event.location ?? ""}
              placeholder="Ресторан, банкетный зал, адрес"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Дата</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={event.date ?? ""}
            />
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
            <p className="text-xs text-muted-foreground">
              Для MVP лучше держать лимит 10–15 МБ.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={event.is_active}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block font-medium">Мероприятие активно</span>
            <span className="text-muted-foreground">
              Гости могут открывать страницу и загружать фото.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-4">
        <div>
          <h3 className="font-semibold">Тексты для гостей</h3>
          <p className="text-sm text-muted-foreground">
            Эти тексты будут видны на публичной странице мероприятия.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guestIntro">Текст на гостевой странице</Label>
            <Textarea
              id="guestIntro"
              name="guestIntro"
              defaultValue={
                event.guest_intro ??
                "Поделитесь фото и пожеланием с мероприятия."
              }
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestInstruction">Инструкция для гостей</Label>
            <Textarea
              id="guestInstruction"
              name="guestInstruction"
              defaultValue={
                event.guest_instruction ??
                "Загрузите фото и пожелание по ссылке мероприятия."
              }
              rows={4}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="thanksText">Текст на странице благодарности</Label>
            <Textarea
              id="thanksText"
              name="thanksText"
              defaultValue={
                event.thanks_text ??
                "Спасибо, ваше фото появится после модерации."
              }
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Live-экран</h3>
            <p className="text-sm text-muted-foreground">
              Настройки отображения фото на большом экране во время мероприятия.
            </p>
          </div>

          <Badge variant="outline">Live</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="liveLayout">Режим live-экрана</Label>
            <select
              id="liveLayout"
              name="liveLayout"
              defaultValue={event.live_layout ?? "masonry"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {liveLayouts.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveTransition">
              Эффект перелистывания{" "}
              {!isPro ? <Badge variant="secondary">Pro</Badge> : null}
            </Label>
            <select
              id="liveTransition"
              name="liveTransition"
              defaultValue={event.live_transition ?? "fade"}
              disabled={!isPro}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {liveTransitions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slideDurationSeconds">Скорость слайдов, сек</Label>
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
          <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
            <input
              name="showNamesOnLive"
              type="checkbox"
              defaultChecked={event.show_names_on_live ?? true}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="block font-medium">
                Показывать имена на live
              </span>
              <span className="text-muted-foreground">
                Можно оставить на экране только фотографии.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
            <input
              name="showMessagesOnLive"
              type="checkbox"
              defaultChecked={event.show_messages_on_live ?? true}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="block font-medium">
                Показывать пожелания на live
              </span>
              <span className="text-muted-foreground">
                Если выключить, на экране останутся только имена и фото.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">QR на live-экране</h3>
            <p className="text-sm text-muted-foreground">
              Показывайте QR-код прямо на экране, чтобы гости могли быстро
              загрузить фото.
            </p>
          </div>

          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? "Pro" : "Pro locked"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
            <input
              name="showQrOnLive"
              type="checkbox"
              defaultChecked={event.show_qr_on_live ?? false}
              disabled={!isPro}
              className="mt-1 h-5 w-5 disabled:cursor-not-allowed"
            />
            <span>
              <span className="block font-medium">Показывать QR на live</span>
              <span className="text-muted-foreground">
                QR будет периодически появляться поверх live-галереи.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
            <input
              name="autoApprove"
              type="checkbox"
              defaultChecked={event.auto_approve ?? false}
              disabled={!isPro}
              className="mt-1 h-5 w-5 disabled:cursor-not-allowed"
            />
            <span>
              <span className="block font-medium">
                Автоодобрение новых фото
              </span>
              <span className="text-muted-foreground">
                Новые загрузки сразу попадут на live-экран без ручной модерации.
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="liveQrEffect">Анимация QR</Label>
            <select
              id="liveQrEffect"
              name="liveQrEffect"
              defaultValue={event.live_qr_effect ?? "fade"}
              disabled={!isPro}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {liveQrEffects.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveQrIntervalSeconds">
              Интервал показа QR, сек
            </Label>
            <Input
              id="liveQrIntervalSeconds"
              name="liveQrIntervalSeconds"
              type="number"
              min={10}
              max={120}
              defaultValue={event.live_qr_interval_seconds ?? 30}
              disabled={!isPro}
            />
            <p className="text-xs text-muted-foreground">
              Например: каждые 30 секунд показать QR на live-экране.
            </p>
          </div>
        </div>

        {!isPro ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/upgrade">Разблокировать QR на live</Link>
          </Button>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Pro-функции мероприятия</h3>
            <p className="text-sm text-muted-foreground">
              Брендинг, кастомная ссылка, архив и премиум-поведение.
            </p>
          </div>

          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? "Pro" : "Pro locked"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customSlug">Кастомная ссылка</Label>
            <Input
              id="customSlug"
              name="customSlug"
              defaultValue={event.custom_slug ?? ""}
              placeholder="anna-ilya"
              disabled={!isPro}
            />
            <p className="text-xs text-muted-foreground">
              Например: /e/anna-ilya
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandName">Бренд / имена</Label>
            <Input
              id="brandName"
              name="brandName"
              defaultValue={event.brand_name ?? ""}
              placeholder="Anna & Ilya"
              disabled={!isPro}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandColor">Цвет бренда</Label>
            <div className="flex gap-2">
              <Input
                id="brandColor"
                name="brandColor"
                type="color"
                defaultValue={event.brand_color ?? "#ee2a7b"}
                disabled={!isPro}
                className="h-10 w-16 p-1"
              />
              <Input
                name="brandColorText"
                defaultValue={event.brand_color ?? "#ee2a7b"}
                disabled={!isPro}
                placeholder="#ee2a7b"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Используй hex-цвет, например #ee2a7b.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverTitle">Заголовок QR-постера</Label>
            <Input
              id="coverTitle"
              name="coverTitle"
              defaultValue={event.cover_title ?? ""}
              placeholder="Сканируйте и загружайте фото"
              disabled={!isPro}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm">
          <input
            name="archiveEnabled"
            type="checkbox"
            defaultChecked={event.archive_enabled ?? false}
            disabled={!isPro}
            className="mt-1 h-5 w-5 disabled:cursor-not-allowed"
          />
          <span>
            <span className="block font-medium">
              Экспорт архива после мероприятия
            </span>
            <span className="text-muted-foreground">
              Pro: подготовка ZIP/CSV экспорта для организатора.
            </span>
          </span>
        </label>

        {!isPro ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/upgrade">Посмотреть Pro</Link>
          </Button>
        ) : null}
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" className="shadow-lg">
          <Save className="h-4 w-4" />
          Сохранить настройки
        </Button>
      </div>
    </form>
  );
}
