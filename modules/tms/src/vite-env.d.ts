/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPERSET_URL?: string;
  readonly VITE_SUPERSET_TMS_DASHBOARD_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
