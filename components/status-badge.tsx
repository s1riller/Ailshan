import { Badge } from "@/components/ui/badge";
import { eventStatusLabel, eventStatusTone, uploadStatusLabel, uploadStatusTone } from "@/lib/labels";

/** Статус фото: точка и слово, цвет по смыслу */
export function UploadStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge dot variant={uploadStatusTone(status)} className={className}>
      {uploadStatusLabel(status)}
    </Badge>
  );
}

/** Статус события: идёт приём фото / приостановлено */
export function EventStatusBadge({ isActive, className }: { isActive: boolean | null | undefined; className?: string }) {
  return (
    <Badge dot variant={eventStatusTone(isActive)} className={className}>
      {eventStatusLabel(isActive)}
    </Badge>
  );
}
