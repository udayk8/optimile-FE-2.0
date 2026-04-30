import { AppPage, isAppPage, routeAliases } from '../app/navigation';

export type FleetRouteMode = 'list' | 'create' | 'detail' | 'edit';

export interface FleetRoute {
  id?: string;
  mode: FleetRouteMode;
  section: AppPage;
}

export function parseFleetHash(hash: string): FleetRoute {
  const [sectionSegment = 'dashboard', secondSegment, thirdSegment] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const section = routeAliases[sectionSegment] ?? (isAppPage(sectionSegment) ? sectionSegment : 'dashboard');

  if (secondSegment === 'create') {
    return { mode: 'create', section };
  }

  if (secondSegment && thirdSegment === 'edit') {
    return { id: secondSegment, mode: 'edit', section };
  }

  if (secondSegment) {
    return { id: secondSegment, mode: 'detail', section };
  }

  return { mode: 'list', section };
}

export function buildFleetHash(section: AppPage, mode: FleetRouteMode = 'list', id?: string) {
  if (mode === 'create') return `/${section}/create`;
  if (mode === 'edit' && id) return `/${section}/${id}/edit`;
  if (mode === 'detail' && id) return `/${section}/${id}`;
  return `/${section}`;
}
