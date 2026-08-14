import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost:5173/app/dashboards",
});

const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
globalThis.Node = window.Node;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.devicePixelRatio = 1;

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.ResizeObserver = globalThis.ResizeObserver;
}

const ctxStub = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === "measureText") return () => ({ width: 10 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient")
        return () => ({ addColorStop() {} });
      if (prop === "getImageData") return () => ({ data: [] });
      if (typeof prop === "string" && /^[a-z]/.test(prop)) return () => {};
      return undefined;
    },
    set() {
      return true;
    },
  },
);

window.HTMLCanvasElement.prototype.getContext = function () {
  this.style.width = "800px";
  this.style.height = "400px";
  return ctxStub;
};
window.HTMLCanvasElement.prototype.getBoundingClientRect = function () {
  return { x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 400, width: 800, height: 400 };
};

window.addEventListener("error", (e) => {
  console.error("WINDOW ERROR:", e.message, "\n", e.error?.stack ?? "");
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

try {
  await import("/tmp/opencode/app.mjs");
  console.log("APP MOUNTED — waiting for data + effects…");
} catch (err) {
  console.error("APP IMPORT/MOUNT CRASH:", err);
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 3500));

const root = window.document.getElementById("root");
const text = root?.textContent ?? "";
console.log("ROOT text length:", text.length);
console.log("ROOT snippet:", JSON.stringify(text.slice(0, 400)));
console.log("ROOT has System Overview:", text.includes("System Overview"));
console.log("ROOT has 'Loading overview':", text.includes("Loading overview"));
if (text.length < 5) {
  console.log("ROOT IS BLANK — crash reproduced.");
  process.exit(2);
}
console.log("ROOT rendered OK.");
process.exit(0);
