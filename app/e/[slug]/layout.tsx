import { GuestNav } from "@/components/guest-nav";

/**
 * Общая оболочка гостевых страниц: снимок, галерея, игры, «спасибо».
 * Нижняя навигация — фиксированная, поэтому страницам добавлен отступ снизу.
 */
export default async function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <div className="pb-16">{children}</div>
      <GuestNav slug={decodeURIComponent(slug)} />
    </>
  );
}
