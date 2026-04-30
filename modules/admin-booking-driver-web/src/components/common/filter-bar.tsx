import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">{children}</CardContent>
    </Card>
  );
}
