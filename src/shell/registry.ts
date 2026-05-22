import { auctionManifest } from '@auction/app/manifest'
import { fleetManifest } from '@fleet/app/manifest'
import { vendorManifest } from '@vendor/app/manifest'
import type { ModuleManifest } from './manifest'

export const MODULE_MANIFESTS: ModuleManifest[] = [
  fleetManifest,
  auctionManifest,
  vendorManifest,
]
