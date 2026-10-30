// トースト通知
import { $ } from "../dom.js";
let tT = 0;
const msg = (t, act) => {
  const e = $("#toast");
  e.textContent = t;
  e.classList.toggle("act", !!act);
  if (act) {
    const b = document.createElement("button");
    b.textContent = act.label;
    b.onclick = () => {
      clearTimeout(tT);
      e.classList.remove("on", "act");
      act.fn();
    };
    e.appendChild(b);
  }
  e.classList.add("on");
  clearTimeout(tT);
  tT = setTimeout(() => {
    e.classList.remove("on", "act");
    act && act.done && act.done();
  }, act ? 4500 : 2600);
};
export {
  msg
};
