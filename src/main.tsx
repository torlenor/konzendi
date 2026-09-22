import "@fontsource/fira-sans/latin-300.css";
import "@fontsource/fira-sans/latin-400.css";
import "@fontsource/fira-sans/latin-500.css";
import "@fontsource/fira-mono/latin-400.css";
import React from "react";
import { flushSync } from "react-dom";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChipView } from "./ChipView";
import { CHIP } from "./chip";
import { QUICK, windowLabel } from "./desktop";
import { prepareInitialFrame, showInitialMainWindow } from "./frame";
import { QuickView } from "./QuickView";

async function start() {
  const quick = windowLabel === QUICK;
  const chip = windowLabel === CHIP;
  if (chip) document.documentElement.classList.add("see-through");
  if (!quick && !chip) await prepareInitialFrame();

  // Three windows, one bundle: the label decides which surface this webview is.
  const surface = chip ? <ChipView /> : quick ? <QuickView /> : <App />;
  const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement,
  );
  flushSync(() => {
    root.render(<React.StrictMode>{surface}</React.StrictMode>);
  });

  if (!quick && !chip) await showInitialMainWindow();
}

void start();
