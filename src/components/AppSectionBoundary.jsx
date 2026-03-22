import React from "react";
import { I18nContext } from "../i18n/I18nProvider";

export default class AppSectionBoundary extends React.Component {
  static contextType = I18nContext;

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Section error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const t = this.context?.t;
      return (
        <div
          style={{
            color: "#e74c3c",
            padding: "16px",
            textAlign: "center",
            background: "#222",
            borderRadius: "12px",
            margin: "18px auto",
            maxWidth: "1400px",
            border: "1px solid rgba(231,76,60,.25)",
          }}
        >
          ⚠️ {t ? t("common.sectionError") : "Section failed to load"}
        </div>
      );
    }

    return this.props.children;
  }
}
