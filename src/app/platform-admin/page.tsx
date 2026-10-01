"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformAdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has admin session
    const hasSession = typeof window !== "undefined" && document.cookie.includes("admin-session");
    
    if (hasSession) {
      // Redirect to dashboard if authenticated
      router.push("/platform-admin/dashboard");
    } else {
      // Redirect to login if not authenticated
      router.push("/platform-admin/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Platform Admin</h1>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
