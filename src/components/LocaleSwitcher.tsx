"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function LocaleSwitcher() {
  const { locale, currency, setLocale, setCurrency } = useLocale();

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`px-2 py-1 font-medium ${
            locale === "en"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          aria-pressed={locale === "en"}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocale("es")}
          className={`px-2 py-1 font-medium ${
            locale === "es"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          aria-pressed={locale === "es"}
        >
          ES
        </button>
      </div>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setCurrency("USD")}
          className={`px-2 py-1 font-medium ${
            currency === "USD"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          aria-pressed={currency === "USD"}
        >
          USD
        </button>
        <button
          type="button"
          onClick={() => setCurrency("CRC")}
          className={`px-2 py-1 font-medium ${
            currency === "CRC"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          aria-pressed={currency === "CRC"}
        >
          CRC
        </button>
      </div>
    </div>
  );
}
