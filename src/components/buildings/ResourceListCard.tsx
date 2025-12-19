import React from "react";

export interface ResourceListItem {
  id: number;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface ResourceListCardProps {
  items: ResourceListItem[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  deleteLabel?: string;
  emptyMessage: string;
}

const ResourceListCard: React.FC<ResourceListCardProps> = ({
  items,
  selectedId,
  onSelect,
  onDelete,
  deleteLabel = "Remover",
  emptyMessage,
}) => {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
      {items.length === 0 ? (
        <div className="px-3 py-4 text-xs text-slate-500">{emptyMessage}</div>
      ) : (
        items.map((item, index) => {
          const isActive = item.id === selectedId;
          return (
            <div
              key={item.id}
              onClick={() => onSelect?.(item.id)}
              className={`px-3 py-2 text-sm border-b border-slate-800 last:border-b-0 cursor-pointer flex items-center justify-between transition ${
                isActive
                  ? "bg-sv-accent/70 text-white"
                  : "bg-slate-950 text-slate-200 hover:bg-slate-900"
              } ${index === 0 ? "rounded-t-lg" : ""}`}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{item.title}</div>
                {item.subtitle ? (
                  <div className="text-[11px] text-slate-400 truncate">
                    {item.subtitle}
                  </div>
                ) : null}
                {item.meta ? (
                  <div className="text-[10px] text-slate-500 truncate">
                    {item.meta}
                  </div>
                ) : null}
              </div>
              {onDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  {deleteLabel}
                </button>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ResourceListCard;
