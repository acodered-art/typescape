/*!
 * TypeScape TypeCard embed.
 *
 * Usage on any third-party page:
 *
 *   <div data-typescape-card="naruto-uzumaki"></div>
 *   <script async src="https://typescape.walker-fg.uk/embed.js"></script>
 *
 * The script finds every [data-typescape-card], fetches the card data and
 * renders it inline. No iframe (so it inherits the host page's scroll and
 * responsive behaviour), no third-party libraries, and it fails silently so a
 * broken embed never breaks the host page.
 *
 * Styles are injected once, scoped to .tsc-* class names, and use currentColor
 * where possible so the card does not clash with a light host page.
 */
(function () {
  "use strict";

  var ORIGIN = (function () {
    var s = document.currentScript;
    if (s && s.src) {
      try {
        return new URL(s.src).origin;
      } catch (e) {
        /* fall through */
      }
    }
    return "https://typescape.walker-fg.uk";
  })();

  var STYLE_ID = "typescape-card-styles";
  var CSS =
    ".tsc-card{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;border:1px solid #d7dde8;background:#fff;color:#111c2e;max-width:420px;padding:14px 16px;display:flex;gap:14px;align-items:flex-start;line-height:1.4;border-top:4px solid #158fd4;box-sizing:border-box}" +
    ".tsc-img{width:56px;height:68px;object-fit:cover;flex:0 0 auto;background:#e4ebf4}" +
    ".tsc-body{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 auto}" +
    ".tsc-name{font-weight:800;font-size:20px;line-height:1.15;letter-spacing:-.01em;color:#111c2e;text-decoration:none}" +
    ".tsc-name:hover{text-decoration:underline;color:#0e4a80}" +
    ".tsc-cat{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#4f6f94}" +
    ".tsc-desc{font-size:13px;color:#3b4a60;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
    ".tsc-reads{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}" +
    ".tsc-read{border:1px solid #9daecc;font-size:12px;padding:1px 6px;color:#0e4a80;white-space:nowrap}" +
    ".tsc-foot{font-size:11px;color:#4f6f94;margin-top:4px}" +
    ".tsc-foot a{color:#158fd4;text-decoration:none}" +
    ".tsc-foot a:hover{text-decoration:underline}";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function render(host, data) {
    var card = el("div", "tsc-card");

    if (data.imageUrl) {
      var img = document.createElement("img");
      img.className = "tsc-img";
      img.src = data.imageUrl;
      img.alt = data.name;
      img.loading = "lazy";
      img.onerror = function () {
        img.style.display = "none";
      };
      card.appendChild(img);
    }

    var body = el("div", "tsc-body");
    var name = el("a", "tsc-name", data.name);
    name.href = ORIGIN + data.url;
    name.target = "_blank";
    name.rel = "noopener";
    body.appendChild(name);

    if (data.category) body.appendChild(el("div", "tsc-cat", data.category));
    if (data.description) body.appendChild(el("p", "tsc-desc", data.description));

    if (data.reads && data.reads.length) {
      var reads = el("div", "tsc-reads");
      data.reads.forEach(function (r) {
        var chip = el("span", "tsc-read", r.type);
        chip.title = r.systemName + (r.votes ? " — " + r.votes + (r.votes === 1 ? " vote" : " votes") : "");
        reads.appendChild(chip);
      });
      body.appendChild(reads);
    }

    var foot = el("div", "tsc-foot");
    var link = el("a", null, "TypeScape");
    link.href = ORIGIN;
    link.target = "_blank";
    link.rel = "noopener";
    foot.appendChild(link);
    foot.appendChild(document.createTextNode(" — community-filed readings"));
    body.appendChild(foot);

    card.appendChild(body);
    host.textContent = "";
    host.appendChild(card);
  }

  function load() {
    var hosts = document.querySelectorAll("[data-typescape-card]");
    if (!hosts.length) return;
    injectStyles();

    Array.prototype.forEach.call(hosts, function (host) {
      var slug = host.getAttribute("data-typescape-card");
      if (!slug) return;

      fetch(ORIGIN + "/api/embed/card?slug=" + encodeURIComponent(slug))
        .then(function (res) {
          if (!res.ok) throw new Error("bad status");
          return res.json();
        })
        .then(function (data) {
          if (data && data.name) render(host, data);
        })
        .catch(function () {
          // Leave the host untouched on any failure.
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
