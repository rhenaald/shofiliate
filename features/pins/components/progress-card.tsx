import type { PinsProgress } from "@/features/pins/types";

/** Progres X/300 read-only. Angka dari props; tanpa fetch sendiri. */
export function ProgressCard({ progress }: { progress: PinsProgress }) {
  const remaining = Math.max(progress.target - progress.count, 0);
  return (
    <p className="text-sm font-semibold tabular-nums">
      {progress.count}/{progress.target} hari ini
      <span className="font-normal text-muted-foreground">
        {remaining > 0 ? ` · sisa ${remaining}` : " · target tercapai"}
      </span>
    </p>
  );
}
