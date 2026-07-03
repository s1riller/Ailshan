import { z } from "zod";

export const liveLayoutSchema = z.enum(["masonry", "featured", "slideshow", "compact"]);
export const liveTransitionSchema = z.enum(["fade", "slide", "zoom", "stories"]);
export const liveQrEffectSchema = z.enum(["fade", "slide", "pulse", "stories"]);

export const eventSchema = z.object({
  title: z.string().min(2, "Введите название").max(120, "Слишком длинное название"),
  date: z.string().optional(),
  location: z.string().max(160, "Слишком длинная локация").optional(),
});

export const eventSettingsSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(2, "Введите название").max(120, "Слишком длинное название"),
  date: z.string().optional(),
  location: z.string().max(160, "Слишком длинная локация").optional(),
  isActive: z.boolean(),
  guestIntro: z.string().min(2, "Введите текст").max(240, "Слишком длинный текст"),
  thanksText: z.string().min(2, "Введите текст").max(240, "Слишком длинный текст"),
  liveLayout: liveLayoutSchema,
  liveTransition: liveTransitionSchema,
  slideDurationSeconds: z.coerce.number().int().min(3).max(20),
  liveQrEffect: liveQrEffectSchema,
  liveQrIntervalSeconds: z.coerce.number().int().min(5).max(120),
  showMessagesOnLive: z.boolean(),
  showNamesOnLive: z.boolean(),
  showQrOnLive: z.boolean(),
  autoApprove: z.boolean(),
  maxFileSizeMb: z.coerce.number().int().min(1).max(25),
  customSlug: z.string().regex(/^[a-z0-9-]+$/i, "Только латиница, цифры и дефисы").max(64).optional().or(z.literal("")),
  brandName: z.string().max(80).optional(),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "HEX цвет").optional().or(z.literal("")),
  coverTitle: z.string().max(120).optional(),
  guestInstruction: z.string().max(500).optional(),
  archiveEnabled: z.boolean(),
});

export type EventInput = z.infer<typeof eventSchema>;
