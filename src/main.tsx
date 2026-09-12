import "@fontsource/fira-sans/latin-300.css";
import "@fontsource/fira-sans/latin-400.css";
import "@fontsource/fira-sans/latin-500.css";
import "@fontsource/fira-mono/latin-400.css";
import React from "react";
import { flushSync } from "react-dom";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QUICK, windowLabel } from "./desktop";
import { prepareInitialFrame, showInitialMainWindow } from "./frame";
import { QuickView } from "./QuickView";

async function start() {
  const quick = windowLabel === QUICK;
  if (!quick) await prepareInitialFrame();

  // Two windows, one bundle: the label decides which surface this webview is.
  const surface = quick ? <QuickView /> : <App />;
  const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement,
  );
  flushSync(() => {
    root.render(<React.StrictMode>{surface}</React.StrictMode>);
  });

  if (!quick) await showInitialMainWindow();
}

void start();
