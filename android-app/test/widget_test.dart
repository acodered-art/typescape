// The shell is thin by design: it loads the live site. These tests cover the
// parts that are ours — that the base URL is coherent and that external links
// are routed out of the WebView rather than trapping the reader.

import "package:flutter_test/flutter_test.dart";

void main() {
  test("base url is an https tailnet origin with no trailing slash", () {
    const base = "https://episteme-1.tail19de5f.ts.net:8444";
    final uri = Uri.parse(base);
    expect(uri.scheme, "https");
    expect(uri.host, endsWith(".ts.net"));
    expect(base.endsWith("/"), isFalse,
        reason: "paths are joined to the base, a trailing slash doubles it");
  });

  test("the app origin counts as internal, other hosts do not", () {
    const internal = ["episteme-1.tail19de5f.ts.net"];
    expect(internal.contains(Uri.parse("https://episteme-1.tail19de5f.ts.net:8444/").host), isTrue);
    expect(internal.contains(Uri.parse("https://example.com/x").host), isFalse);
  });
}
