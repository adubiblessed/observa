import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export type MetricTone = "neutral" | "primary" | "warning" | "error" | "success";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  icon: string;
  tone?: MetricTone;
  className?: string;
}

const TONE_VALUE: Record<MetricTone, string> = {
  neutral: "text-on-surface",
  primary: "text-primary",
  warning: "text-warning",
  error: "text-error",
  success: "text-success",
};

const TONE_ICON: Record<MetricTone, string> = {
  neutral: "text-outline",
  primary: "text-primary",
  warning: "text-warning",
  error: "text-error",
  success: "text-success",
};

/** Compact KPI metric card (label-caps header, headline value, delta). */
export function MetricCard({ label, value, unit, delta, icon, tone = "neutral", className }: MetricCardProps) {
  return (
    <div className={cn("flex h-[104px] flex-col justify-between rounded border border-outline-variant bg-surface-container-lowest p-4", className)}>
      <div className="flex items-start justify-between">
        <span className="text-label-caps text-on-surface-variant">{label}</span>
        <Icon name={icon} className={cn("text-[18px]", TONE_ICON[tone])} />
      </div>
      <div className="mt-auto flex items-baseline gap-2">
        <span className={cn("font-code-md text-[22px] font-semibold leading-7 tracking-tight", TONE_VALUE[tone])}>
          {value}
        </span>
        {unit ? <span className="font-code-sm text-on-surface-variant">{unit}</span> : null}
        {delta ? (
          <span className="ml-auto text-body-sm text-on-surface-variant">{delta}</span>
        ) : null}
      </div>
    </div>
  );
}