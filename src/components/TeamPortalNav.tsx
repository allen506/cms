"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function TeamPortalNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useParams();
  const router = useRouter();
  const teamname = params.teamname as string;

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Check if user is logged in by calling profile endpoint
        const response = await fetch(`/api/tenant/user/profile`, {
          headers: {
            'x-tenant-slug': teamname,
          },
          credentials: "include",
        });
        
        // If we get a 200, user is logged in
        setIsLoggedIn(response.ok);
      } catch (error) {
        console.error('Error checking login status:', error);
        setIsLoggedIn(false);
      } finally {
        setMounted(true);
      }
    };

    checkLoginStatus();
  }, [teamname]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout API endpoint
      await fetch(`/api/tenant/auth/logout`, {
        method: "POST",
        headers: {
          "x-tenant-slug": teamname,
        },
        credentials: "include",
      });
      
      // Clear cookies locally as backup
      document.cookie = 'tenant_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'tenant_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      
      // Redirect to unlock page
      router.push(`/custom/${teamname}/unlock`);
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API call fails
      document.cookie = 'tenant_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'tenant_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      router.push(`/custom/${teamname}/unlock`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href={`/custom/${teamname}`} className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 tracking-tight">CMS Sportswear</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href={`/custom/${teamname}`} className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 tracking-tight">CMS Sportswear</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center gap-1">
            {isLoggedIn && (
              <>
                <Link 
                  href={`/custom/${teamname}/order/products`} 
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Products
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="ml-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Signing out..." : "Sign out"}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex sm:hidden items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "..." : "Sign out"}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
