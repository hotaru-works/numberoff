// Service Worker の登録
let swDone = false;
function regSW() {
  // the dev server serves files that change all the time; caching them would only get in the way
  if (swDone || import.meta.env.DEV) return;
  swDone = true;
  if ("serviceWorker" in navigator && (location.protocol == "https:" || location.hostname == "localhost") && !window.claude) navigator.serviceWorker.register("sw.js").catch(() => {
  });
}
export {
  regSW
};
