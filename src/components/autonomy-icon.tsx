import { AUTONOMY_ICONS, AUTONOMY_LABELS } from "@/lib/classification";
import type { Autonomy } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// Autonomy's symbol: closed padlock = Baixa (locked in, recurs
// indefinitely), open padlock = Alta (ends on its own). Displays show just
// this, name as a tooltip on the caller's wrapper.
export function AutonomyIcon({ autonomy, className }: { autonomy: Autonomy; className?: string }) {
  const Icon = AUTONOMY_ICONS[autonomy];
  return <Icon className={className} />;
}

// Pickers show symbol + name so the choice stays unambiguous.
export function AutonomyOptionLabel({ autonomy, className }: { autonomy: Autonomy; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <AutonomyIcon autonomy={autonomy} className="size-3.5 shrink-0" />
      {AUTONOMY_LABELS[autonomy]}
    </span>
  );
}
