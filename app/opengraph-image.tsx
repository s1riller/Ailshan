import { brandImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ailshan — фотографии гостей на экране зала в тот же вечер";

export default function OpenGraphImage() {
  return brandImage({
    title: "Фотографии гостей — на экране зала в тот же вечер",
    subtitle: "Для свадеб, частных и корпоративных событий",
  });
}
