import { updateApplicationStatusAction } from "@/lib/actions/admin";
import { APPLICATION_STATUS_LABEL, labelOf, type StatusTone } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_TONE: Record<string, StatusTone> = {
  new: "warning",
  in_progress: "success",
  closed: "secondary",
};

/** Подписи действий: куда перевести заявку */
const STATUS_ACTIONS: Array<[value: string, label: string]> = [
  ["new", "В новые"],
  ["in_progress", "В работу"],
  ["closed", "Закрыть"],
];

export default async function AdminApplicationsPage() {
  const admin = createAdminClient();
  const { data: applications = [] } = await admin
    .from("applications")
    .select("id, name, email, phone, message, status, created_at")
    .order("created_at", { ascending: false });
  const applicationItems = applications ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="eyebrow">Управление платформой</div>
        <h1 className="font-serif text-3xl font-medium sm:text-4xl">Заявки</h1>
        <p className="text-sm text-muted-foreground">Запросы с главной страницы сайта.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <div className="eyebrow">Всего: {applicationItems.length}</div>
            <h2 className="font-serif text-2xl font-medium">Все заявки</h2>
          </div>
        </div>
        {applicationItems.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Заявок пока нет.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Контакт</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Перевести</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicationItems.map((application) => {
                const date = formatDate(application.created_at);
                return (
                  <TableRow key={application.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{application.name}</div>
                      <div className="text-sm text-muted-foreground">{application.email}</div>
                      {application.phone ? <div className="text-sm text-muted-foreground">{application.phone}</div> : null}
                      {date ? <div className="mt-1 text-xs text-muted-foreground">{date}</div> : null}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-pre-wrap align-top text-sm">{application.message}</TableCell>
                    <TableCell className="align-top">
                      <Badge dot variant={STATUS_TONE[application.status] ?? "secondary"}>
                        {labelOf(APPLICATION_STATUS_LABEL, application.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {STATUS_ACTIONS.filter(([value]) => value !== application.status).map(([value, label]) => (
                          <form key={value} action={updateApplicationStatusAction}>
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="status" value={value} />
                            <SubmitButton size="sm" variant="outline" pendingText="Сохраняем…">
                              {label}
                            </SubmitButton>
                          </form>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
