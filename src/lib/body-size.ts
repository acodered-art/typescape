const MAX_BODY_SIZE = 1_000_000; // 1MB

export function checkBodySize(req: Request): string | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > MAX_BODY_SIZE) {
      return `Request body too large (max ${MAX_BODY_SIZE / 1024}KB)`;
    }
  }
  return null;
}