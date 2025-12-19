import React from "react";

interface ManagementCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const ManagementCard: React.FC<ManagementCardProps> = ({
  title,
  description,
  actions,
  children,
  footer,
  className = "",
}) => {
  return (
    <section
      className={`bg-slate-950/70 border border-slate-800 rounded-xl p-4 shadow-lg shadow-black/10 ${className}`}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {description ? (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex-shrink-0">{actions}</div> : null}
      </header>

      <div className="space-y-3">{children}</div>

      {footer ? (
        <footer className="pt-3 mt-2 border-t border-slate-800 text-xs text-slate-400">
          {footer}
        </footer>
      ) : null}
    </section>
  );
};

export default ManagementCard;
