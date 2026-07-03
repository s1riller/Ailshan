import Link from "next/link";
import { CheckCircle2, Images, QrCode } from "lucide-react";

import { ApplicationForm } from "@/components/application-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const steps = [
    {
      title: "QR-ссылка",
      text: "Гость открывает страницу события с телефона.",
      Icon: QrCode,
    },
    {
      title: "Фото и пожелание",
      text: "Имя, сообщение и один файл изображения.",
      Icon: Images,
    },
    {
      title: "Модерация",
      text: "На live-экран попадают только одобренные фото.",
      Icon: CheckCircle2,
    },
  ];

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-[78vh] w-full max-w-6xl flex-col justify-center px-4 py-12">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm text-muted-foreground">
            {/* <Camera className="h-4 w-4 text-primary" /> */}
            Идеально для свадеб, корпоративов и банкетов
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-6xl">
            Ailshan собирает фото гостей без установки приложения
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Создайте мероприятие, поделитесь QR-ссылкой и модерируйте фотографии
            перед показом на live-экране.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">Открыть dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Войти</Link>
            </Button>
          </div>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(({ title, text, Icon }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {text}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Оставить заявку</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
