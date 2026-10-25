import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { RefreshButton } from "./RefreshButton";

export function PageHeader({
  title,
  description,
  actions,
  back,
  refresh,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  /** the reload button at the top right: shown on list pages by default, hidden on detail pages (they have `back`) and when false */
  refresh?: boolean;
}) {
  const showRefresh = refresh ?? !back;
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3.5" /> {back.label}
          </Link>
        )}
        <h1 className="truncate font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <div className="mt-1 text-[13px] text-muted-foreground">{description}</div>}
      </div>
      {(actions || showRefresh) && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showRefresh && <RefreshButton />}
          {actions}
        </div>
      )}
    </div>
  );
}
