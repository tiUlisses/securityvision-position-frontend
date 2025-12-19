// src/features/reports/components/ReportCard.tsx
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export default function ReportCard({ title, subtitle, right, children }: Props) {
  return (
    <section className="min-w-0 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-slate-100">{title}</h2>
          {subtitle ? <p className="text-[11px] text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      {children}
    </section>
  );
}
