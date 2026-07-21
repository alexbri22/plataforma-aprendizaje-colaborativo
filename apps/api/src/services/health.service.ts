import { SHARED_PACKAGE_READY } from '@plataforma/shared'

export interface HealthStatus {
  status: 'ok'
  sharedPackageReady: boolean
}

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    sharedPackageReady: SHARED_PACKAGE_READY,
  }
}
