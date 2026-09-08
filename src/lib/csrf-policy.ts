import { guardCsrf } from "@/lib/csrf";
import { bearerToken } from "@/lib/session";

/**
 * CSRF policy for state-changing routes that both a browser and a native client
 * may call.
 *
 * A browser carries an ambient cookie, so a cross-site POST would be accepted
 * unless a CSRF token proves the request came from our own page. A native client
 * holds no ambient credential — it sends an explicit bearer token — so CSRF adds
 * nothing there and would simply make the API unusable from the app.
 *
 * So: require the token when the caller is a browser, skip it when the caller
 * presented a bearer. Routes that only a browser calls should use `guardCsrf`
 * directly.
 *
 *   const csrfError = await guardMutation(req);
 *   if (csrfError) return csrfError;
 */
export async function guardMutation(req: Request): Promise<Response | null> {
  const headerList = req.headers;
  // Reading the header directly avoids an async `headers()` call for the
  // common cookie case.
  if (bearerToken(headerList)) return null;
  return guardCsrf(req);
}
