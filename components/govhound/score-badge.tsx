import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number | null;
  label: string;
  className?: string;
}

export function ScoreBadge({ score, label, className }: ScoreBadgeProps) {
  if (score === null) return null;

  const variant =
    score >= 4 ? "default" : score >= 3 ? "secondary" : "destructive";

  const colorClass =
    score >= 4
      ? "bg-green-success hover:bg-green-light text-white border-green-success/30"
      : score >= 3
        ? "bg-gold-star hover:bg-gold-light text-bg-base border-gold-star/30"
        : "bg-red-alert hover:bg-red-alert/80 text-white border-red-alert/30";

  return (
    <Badge variant={variant} className={cn(colorClass, className)}>
      {label}: {score}/5
    </Badge>
  );
}
