import "@fontsource/fira-sans/latin-300.css";
import "@fontsource/fira-sans/latin-400.css";
import "@fontsource/fira-sans/latin-500.css";
import "@fontsource/fira-mono/latin-400.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QUICK, windowLabel } from "./desktop";
import { QuickView } from "./QuickView";

// Two windows, one bundle: the label decides which surface this webview is.
const surface = windowLabel === QUICK ? <QuickView /> : <App />;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{surface}</React.StrictMode>,
);
