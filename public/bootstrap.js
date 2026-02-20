(function () {
  var params = new URLSearchParams(window.location.search);
  var redirectedPath = params.get("p");
  if (!redirectedPath) return;
  var nextPath = redirectedPath.charAt(0) === "/" ? redirectedPath : "/" + redirectedPath;
  var nextQuery = params.get("q") || "";
  var nextHash = params.get("h") || "";
  var finalUrl = nextPath + (nextQuery ? "?" + nextQuery : "") + (nextHash ? "#" + nextHash : "");
  window.history.replaceState({}, "", finalUrl);
})();

window.setTimeout(function () {
  var root = document.getElementById("root");
  if (!root) return;
  if (root.children.length === 1 && root.textContent && root.textContent.indexOf("Loading app...") !== -1) {
    root.innerHTML =
      '<div style="padding:16px;font-family:Segoe UI, Arial, sans-serif;color:#991b1b;background:#fff1f2;">App failed to initialize in browser. Open DevTools console and share the first red error line.</div>';
  }
}, 4000);
