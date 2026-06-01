import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSessionContext } from "@/shared/auth/session-context";
import { useTenantRolePermissions } from "@/modules/tenant-admin/hooks/useTenantRolePermissions";
import { useTenantRoles } from "@/modules/tenant-admin/hooks/useTenantRoles";
import { useTenantRouteContext } from "@/modules/tenant-admin/hooks/useTenantRouteContext";
import { useTenantUsers } from "@/modules/tenant-admin/hooks/useTenantUsers";
import { useTenantPaths } from "@platform-admin/hooks/useTenantPaths";
import { getSessionPortalModule, resolveSessionRoleContext } from "@/shared/lib/tenant-rbac";
import { hasPermission, type PermissionAction } from "@/modules/tenant-admin/lib/tenant-permissions";

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
  const { tenant } = useTenantRouteContext();
  const { session } = useSessionContext();
  const { data: roles } = useTenantRoles(tenant.id);
  const { data: users } = useTenantUsers(tenant.id);
  const { data: rolePermissions } = useTenantRolePermissions(tenant.id);
  const paths = useTenantPaths();

  // External-party portal sessions (vendor/customer) are not backed by a
  // tenant role, so they don't go through the permission matrix at all. They
  // may only view their own portal module; everything else is denied.
  const portalModule = getSessionPortalModule(session);
  if (portalModule) {
    if (moduleCode === portalModule) return <>{children}</>;
    const portalPath =
      portalModule === "VENDOR" ? `${paths.vendorPortal}` : `${paths.customerPortal}`;
    return <AccessDenied backTo={portalPath} backLabel="Back to portal" />;
  }

  const { activeRole } = resolveSessionRoleContext({ tenant, session, users, roles, rolePermissions });

  const allowed = hasPermission(activeRole, moduleCode, featureCode, action);
  if (allowed) return <>{children}</>;

  return <AccessDenied backTo={paths.dashboard} backLabel="Back to dashboard" />;
}

function AccessDenied({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="size-4" />
      </div>
      <p className="mt-3 text-[14px] font-semibold text-slate-900">Access denied</p>
      <p className="mt-1 text-[12px] text-slate-500">
        You don't have permission to view this page.
      </p>
      <div className="mt-4">
        <Button asChild size="sm" variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
