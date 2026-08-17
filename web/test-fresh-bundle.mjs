import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

console.log("=========================================");
console.log("Observa Fresh Bundle Verification");
console.log("=========================================\n");

const indexHtml = fs.readFileSync("dist/index.html", "utf-8");
const scriptMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
if (!scriptMatch) {
  console.error("Could not find bundle in dist/index.html");
  process.exit(1);
}

const jsFile = scriptMatch[1];
const fullPath = path.resolve("dist/assets", jsFile);
console.log(`[Target Bundle]: ${jsFile}\n`);

function createTestEnv(url) {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    pretendToBeVisual: true,
    url,
    runScripts: "dangerously"
  });

  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.Event = window.Event;
  globalThis.CustomEvent = window.CustomEvent;
  globalThis.MutationObserver = window.MutationObserver;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.devicePixelRatio = 1;

  globalThis.matchMedia = window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.ResizeObserver = globalThis.ResizeObserver;

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

  const uncaughtErrors = [];
  window.addEventListener("error", (e) => {
    uncaughtErrors.push(e.message || String(e.error));
  });

  return { window, uncaughtErrors };
}

const routesToTest = [
  { url: "http://localhost:5173/", label: "Landing Page", expectedText: "See what your systems are really doing" },
  { url: "http://localhost:5173/login", label: "Login Page", expectedText: "Sign in to your account" },
  { url: "http://localhost:5173/register", label: "Register Page", expectedText: "Create your account" },
  { url: "http://localhost:5173/app/dashboards", label: "Dashboard / Overview", expectedText: "System Overview" },
  { url: "http://localhost:5173/app/logs", label: "Logs Page", expectedText: "SEVERITY" },
  { url: "http://localhost:5173/app/traces", label: "Traces Page", expectedText: "Traces" },
  { url: "http://localhost:5173/app/metrics", label: "Metrics Explorer", expectedText: "Metrics Explorer" },
  { url: "http://localhost:5173/app/alerts", label: "Alerts Management", expectedText: "Alerts Management" },
  { url: "http://localhost:5173/app/projects", label: "Projects Page", expectedText: "Active Projects" },
  { url: "http://localhost:5173/app/teams", label: "Teams Page", expectedText: "Teams Management" },
  { url: "http://localhost:5173/app/settings", label: "Settings Page", expectedText: "Settings" },
  { url: "http://localhost:5173/app/settings/credentials", label: "Credentials Page", expectedText: "Key ID" },
];

async function run() {
  for (const r of routesToTest) {
    const { window, uncaughtErrors } = createTestEnv(r.url);
    await import("file://" + fullPath + "?t=" + Date.now() + Math.random());
    await new Promise(res => setTimeout(res, 500));
    const text = window.document.getElementById("root")?.textContent ?? "";
    const ok = text.includes(r.expectedText);
    const hasErrors = uncaughtErrors.length > 0;
    console.log(`Route [${r.label}]:`);
    console.log(`  - Expected "${r.expectedText}": ${ok ? "PASS" : "FAIL"}`);
    console.log(`  - Console/Window Errors: ${hasErrors ? uncaughtErrors.join(", ") : "0 (PASS)"}`);
    if (!ok || hasErrors) {
      console.error(`FAIL on route: ${r.url}`);
      console.log(`Rendered text: ${text.slice(0, 300)}`);
      process.exit(1);
    }
  }

  console.log("\n=========================================");
  console.log("ALL 12 ROUTES VERIFIED PASS WITH 0 ERRORS");
  console.log("=========================================");
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
