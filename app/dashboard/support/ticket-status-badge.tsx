import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_LABEL, labelOf, type StatusTone } from "@/lib/labels";

/** Цвет статуса обращения: ждёт ответа — мёд, в работе — шалфей, закрыто — тихий */
const TICKET_STATUS_TONE: Record<string, StatusTone> = {
  open: "warning",
  in_progress: "success",
  closed: "secondary",
};

export function TicketStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge dot variant={TICKET_STATUS_TONE[status] ?? "secondary"} className={className}>
      {labelOf(TICKET_STATUS_LABEL, status)}
    </Badge>
  );
}
