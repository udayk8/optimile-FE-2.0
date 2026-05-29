import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import type { ModuleManifest } from "@shared-ui";
import { Button } from "@/shared/components/ui/button";

// Rebase an absolute path against a module basePath. When mounted at a
// different prefix (e.g. /tenant/:id/vendor-portal) absolute "/vendor/..."
// links and navigates would leak the user out of the tenant shell. We strip
// the module basePath so the route becomes relative to the embed mount.
function rebasePath(to: string, basePath: string): string {
  if (!to.startsWith(basePath)) {
    return to;
  }
  const remainder = to.slice(basePath.length).replace(/^\/+/, "");
  return remainder || ".";
}

function rebaseRouteElement(element: ReactElement, basePath: string): ReactElement {
  if (element.type === Navigate) {
    const props = element.props as { to: unknown; replace?: boolean };
    if (typeof props.to === "string") {
      return cloneElement(element as ReactElement<{ to: string }>, {
        to: rebasePath(props.to, basePath),
      });
    }
  }
  return element;
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export type ManifestEmbeddedAppProps = {
  manifest: ModuleManifest;
  standaloneHref?: string;
  standaloneLabel?: string;
  queryClient?: QueryClient;
  showStandaloneLink?: boolean;
  /** Optional extra provider wrap (e.g. AuctionPermissionProvider). Mounted
   *  inside QueryClientProvider, outside the manifest wrapper + routes. */
  extraWrapper?: (children: ReactNode) => ReactNode;
};

export function ManifestEmbeddedApp({
  manifest,
  standaloneHref = manifest.basePath,
  standaloneLabel = `Open standalone ${manifest.label}`,
  queryClient = defaultQueryClient,
  showStandaloneLink = true,
  extraWrapper,
}: ManifestEmbeddedAppProps) {
  const Wrapper = manifest.wrapper ?? Passthrough;

  const routes = (
    <Routes>
      {manifest.routes.map((route, index) => {
        const element = isValidElement(route.element)
          ? rebaseRouteElement(route.element, manifest.basePath)
          : route.element;
        if (route.index) {
          return <Route key={index} index element={element} />;
        }
        return <Route key={index} path={route.path} element={element} />;
      })}
    </Routes>
  );

  const body: ReactNode = (
    <>
      {showStandaloneLink ? (
        <div className="flex justify-end px-4 pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link to={standaloneHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              {standaloneLabel}
            </Link>
          </Button>
        </div>
      ) : null}
      <Wrapper>{routes}</Wrapper>
      <Toaster position="top-right" richColors closeButton />
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {extraWrapper ? extraWrapper(body) : body}
    </QueryClientProvider>
  );
}

function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function manifestSidebarToTenantChildren(
  manifest: ModuleManifest,
  mountPath: string,
): Array<{ label: string; to: string; icon: ModuleManifest["sidebar"][number]["icon"] }> {
  return manifest.sidebar.map((item) => {
    const remainder = item.path.startsWith(manifest.basePath)
      ? item.path.slice(manifest.basePath.length).replace(/^\/+/, "")
      : item.path.replace(/^\/+/, "");
    return {
      label: item.label,
      to: remainder ? `${mountPath}/${remainder}` : mountPath,
      icon: item.icon,
    };
  });
}
