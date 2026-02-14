import { useLanguage } from "@/context/languageContext";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white p-1">
      <Button
        type="button"
        size="sm"
        variant={language === "rw" ? "default" : "ghost"}
        className={`h-7 rounded-full px-3 text-xs ${language === "rw" ? "bg-gray-900 text-white" : "text-gray-700"}`}
        onClick={() => setLanguage("rw")}
        aria-label="Switch language to Kinyarwanda"
      >
        RW
      </Button>
      <Button
        type="button"
        size="sm"
        variant={language === "en" ? "default" : "ghost"}
        className={`h-7 rounded-full px-3 text-xs ${language === "en" ? "bg-gray-900 text-white" : "text-gray-700"}`}
        onClick={() => setLanguage("en")}
        aria-label="Switch language to English"
      >
        EN
      </Button>
      {!compact && <span className="px-1 text-[10px] font-semibold text-gray-500">{t("lang.label")}</span>}
    </div>
  );
}

export default LanguageSwitcher;
