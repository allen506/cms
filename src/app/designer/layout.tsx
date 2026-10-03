"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function DesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [designer, setDesigner] = useState<{ email: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if designer is authenticated
    const verifyAuth = async () => {
      try {
        const response = await fetch("/api/designer/auth/verify", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setDesigner(data.designer);
        } else {
          // Not authenticated, redirect to login if not already there
          if (!pathname.includes("/login")) {
            router.push("/designer/login");
          }
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        if (!pathname.includes("/login")) {
          router.push("/designer/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/designer/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/designer/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Show nothing while loading on login page
  if (pathname.includes("/login")) {
    return children;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/designer" className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                CMS Sportswear
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/designer"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/designer/submissions"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Submissions
              </Link>
              <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                <span className="text-sm text-gray-600">{designer?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </>
  );
}
