import React from "react";
import { formatDisplayTime } from "../AppHelpers";

export default function LiveAlertDrawer({ alert, language = "ar", onDismiss, onOpenNews }) {
  if (!alert) return null;

  return (
    <div className="live-alert-drawer" role="status" aria-live="polite">
      <div className="live-alert-drawer__pulse" />
      <div className="live-alert-drawer__body">
        <div className="live-alert-drawer__eyebrow">
          {language === "ar" ? "تنبيه فوري عالي الأهمية" : "High-priority instant alert"}
        </div>
        <div className="live-alert-drawer__title">{alert.title}</div>
        <div className="live-alert-drawer__summary">{alert.summary || (language === "ar" ? "خبر عاجل تم رفعه تلقائياً من محرك الرصد الحي." : "A breaking item was automatically elevated by the live intake engine.")}</div>
        <div className="live-alert-drawer__meta">
          <span>{alert.source || "Live Intake"}</span>
          <span>{formatDisplayTime(alert.time, language === "en" ? "en" : "ar") || alert.time || "—"}</span>
          <span>{language === "ar" ? `أولوية ${alert.intakePriority || 0}` : `Priority ${alert.intakePriority || 0}`}</span>
        </div>
      </div>
      <div className="live-alert-drawer__actions">
        <button type="button" className="live-alert-drawer__primary" onClick={onOpenNews}>
          {language === "ar" ? "عرض التفاصيل" : "Open details"}
        </button>
        <button type="button" className="live-alert-drawer__ghost" onClick={onDismiss}>
          {language === "ar" ? "إغلاق" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}