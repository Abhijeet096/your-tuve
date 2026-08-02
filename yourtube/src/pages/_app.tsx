import ErrorBoundary from "@/components/ErrorBoundary";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";
import { UserProvider } from "../lib/AuthContext";
export default function App({ Component, pageProps }: AppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black overflow-x-hidden">
        <title>Your-Tube Clone</title>
        <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
        <Toaster />
        <div className="flex">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 min-w-0">
            <ErrorBoundary>
              <Component {...pageProps} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </UserProvider>
  );
}
