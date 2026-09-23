"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export type AdminUserIdentity = {
  userId: string;
  fullName: string;
  role: string;
  isActive: boolean;
  email?: string | null;
} | null;

interface AdminShellClientProps {
  children: React.ReactNode;
  user: AdminUserIdentity;
}

export default function AdminShellClient({
  children,
  user,
}: AdminShellClientProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close drawer on route change (render phase adjustment)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsDrawerOpen(false);
  }

  // Close drawer on Escape key press
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsDrawerOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Lock body scroll when mobile drawer is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, handleKeyDown]);

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="pegasus-admin-shell">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`pegasus-admin-drawer-backdrop ${
          isDrawerOpen ? "is-open" : ""
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
      />

      {/* Main Admin Workspace */}
      <div className="pegasus-admin-main">
        <AdminHeader
          user={user}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={toggleDrawer}
        />
        <div className="pegasus-admin-content">{children}</div>
      </div>
    </div>
  );
}
