/**
 * Save a remote asset to the user's device WITHOUT navigating away.
 *
 * The naive `<a download>` trick is ignored for cross-origin URLs (Supabase
 * storage), so the browser just opens the file full-screen. Fetching the bytes
 * first and downloading a same-origin blob: URL makes the `download` attribute
 * honour, so the user stays on the page. Returns a URL suitable for a momentary
 * "View" action (the blob URL on success, else the original).
 */
export async function downloadAsset(url: string, filename: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    triggerAnchor(objUrl, filename);
    // Keep the blob alive long enough for the toast's "View" action, then free it.
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
    return objUrl;
  } catch {
    // CORS/network fallback — best-effort direct anchor (may open in a new tab
    // for cross-origin, but never a full-page navigation).
    triggerAnchor(url, filename);
    return url;
  }
}

function triggerAnchor(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  // target=_blank is ignored once `download` is honoured (same-origin blob URL);
  // it only matters in the cross-origin fallback, where it opens a new tab
  // instead of navigating the current page away.
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
