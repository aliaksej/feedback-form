export interface AppConfig {
  /** Full URL of the Lambda endpoint that accepts feedback. */
  apiUrl: string;
}

/**
 * Resolve config from an already-fetched runtime object, falling back to
 * build-time env vars. Runtime values win, so one build can be deployed to
 * any environment by replacing config.json.
 */
export function resolveConfig(
  runtime: Partial<AppConfig> | null,
  env: ImportMetaEnv = import.meta.env,
): AppConfig {
  const apiUrl = runtime?.apiUrl || env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error(
      'apiUrl is not configured: set it in config.json or VITE_API_URL',
    );
  }
  return { apiUrl };
}

/** Fetch config.json (served next to index.html, not bundled) at startup. */
export async function loadConfig(): Promise<AppConfig> {
  let runtime: Partial<AppConfig> | null = null;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, {
      cache: 'no-store',
    });
    if (res.ok) runtime = await res.json();
  } catch {
    // fall through to build-time env
  }
  return resolveConfig(runtime);
}
