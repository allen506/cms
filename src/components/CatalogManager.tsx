"use client";

import { useState } from "react";
import ProductManager from "./ProductManager";
import DesignManager from "./DesignManager";
import ProductDesignAssociations from "./ProductDesignAssociations";

export default function CatalogManager() {
  const [activeTab, setActiveTab] = useState<"products" | "designs" | "associations">(
    "products"
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-4 flex gap-2 overflow-x-auto">
          {(["products", "designs", "associations"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "products"
                ? "📦 Products"
                : tab === "designs"
                ? "🎨 Designs"
                : "🔗 Associations"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "products" && <ProductManager />}
          {activeTab === "designs" && <DesignManager endpoint="/api/admin/designs" />}
          {activeTab === "associations" && (
            <ProductDesignAssociations endpoint="/api/admin/product-designs" />
          )}
        </div>
      </div>
    </div>
  );
}
