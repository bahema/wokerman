export type AppLocale = "en" | "ar";

export type MessageKey =
  | "app.checkingSession"
  | "app.loading"
  | "app.loadingAdmin"
  | "app.redirectingLogin"
  | "app.notFoundTitle"
  | "app.notFoundPrefix"
  | "app.notFoundSuffix"
  | "app.goHome";

export const messages: Record<AppLocale, Record<MessageKey, string>> = {
  en: {
    "app.checkingSession": "Checking secure session...",
    "app.loading": "Loading...",
    "app.loadingAdmin": "Loading admin...",
    "app.redirectingLogin": "Redirecting to secure login...",
    "app.notFoundTitle": "Page Not Found",
    "app.notFoundPrefix": "No page exists at",
    "app.notFoundSuffix": ".",
    "app.goHome": "Go to Homepage"
  },
  ar: {
    "app.checkingSession": "جار التحقق من الجلسة الآمنة...",
    "app.loading": "جار التحميل...",
    "app.loadingAdmin": "جار تحميل لوحة التحكم...",
    "app.redirectingLogin": "جار التحويل إلى تسجيل الدخول الآمن...",
    "app.notFoundTitle": "الصفحة غير موجودة",
    "app.notFoundPrefix": "لا توجد صفحة على المسار",
    "app.notFoundSuffix": ".",
    "app.goHome": "الذهاب إلى الصفحة الرئيسية"
  }
};
