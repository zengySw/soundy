import React from "react";
import ReactDOM from "react-dom/client";
import WidgetApp from "./widget_app";
import "./widget_styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WidgetApp />
  </React.StrictMode>,
);
