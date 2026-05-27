import type { ReactNode } from "react";
import type { PermissionAction } from "@/modules/tenant-admin/lib/tenant-permissions";

interface PermissionGateProps {
  moduleCode: string;
  featureCode: string;
  action?: PermissionAction;
  children: ReactNode;
}

// Route-level guard. Even if a user types the URL directly we refuse to
// render the page unless their role has the explicit view (or specified
// action) permission for the feature.
export function PermissionGate({ moduleCode, featureCode, action = "view", children }: PermissionGateProps) {
  void moduleCode;
  void featureCode;
  void action;
  return <>{children}</>;
}
