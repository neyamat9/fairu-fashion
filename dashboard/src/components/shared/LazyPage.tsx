import { lazy, Suspense, type ReactNode } from "react";
import { PageLoader } from "./PageLoader";

/** A lazily loaded route. While its code downloads it shows `skeleton` (shaped like the page), not a spinner. */
export const L = (importer: () => Promise<{ default: React.ComponentType }>, skeleton?: ReactNode) => {
  const C = lazy(importer);
  return (
    <Suspense fallback={skeleton ?? <PageLoader />}>
      <C />
    </Suspense>
  );
};
