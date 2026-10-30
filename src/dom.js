// DOMヘルパー
const UZ = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--uz")) || 1;
const $ = (s) => document.querySelector(s);
const cv = $("#cv");
export {
  $,
  UZ,
  cv
};
