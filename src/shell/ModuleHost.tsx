import { Fragment, useMemo } from 'react'
import { useRoutes } from 'react-router-dom'
import type { ModuleManifest } from './manifest'

export function ModuleHost({ manifest }: { manifest: ModuleManifest }) {
  const Wrapper = manifest.Wrapper ?? Fragment
  const element = useRoutes(useMemo(() => manifest.routes, [manifest.routes]))
  return <Wrapper>{element}</Wrapper>
}
