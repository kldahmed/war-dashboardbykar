import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { I18nProvider } from "./i18n/I18nProvider";
import { ExperienceModeProvider } from "./lib/experienceMode";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <I18nProvider>
      <ExperienceModeProvider>
        <App />
      </ExperienceModeProvider>
    </I18nProvider>
  </React.StrictMode>
);
