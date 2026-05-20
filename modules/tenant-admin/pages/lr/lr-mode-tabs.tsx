import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

export function LrModeTabs({
  manualLabel,
  autoLabel,
}: {
  manualLabel: string;
  autoLabel: string;
}) {
  const location = useLocation();
  const activeMode = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("mode") === "auto" ? "auto" : "manual";
  }, [location.search]);

  const basePath = location.pathname;
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to={`${basePath}?mode=manual`}
        className={`rounded-full border px-3 py-1.5 text-sm ${activeMode === "manual" ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-200 bg-white text-slate-600"}`}
      >
        {manualLabel}
      </Link>
      <Link
        to={`${basePath}?mode=auto`}
        className={`rounded-full border px-3 py-1.5 text-sm ${activeMode === "auto" ? "border-sky-300 bg-sky-100 text-sky-900" : "border-slate-200 bg-white text-slate-600"}`}
      >
        {autoLabel}
      </Link>
    </div>
  );
}
