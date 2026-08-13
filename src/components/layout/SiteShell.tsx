import type { ReactNode } from "react";
import { BackgroundSymbols } from "@/components/layout/BackgroundSymbols";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ControllerNav } from "@/components/nav/ControllerNav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <BackgroundSymbols />
      <ControllerNav />
      <SiteHeader />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
