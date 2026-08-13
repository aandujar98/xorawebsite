import type { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
};

export function GlassPanel({
  children,
  className = "",
  as: Tag = "section",
}: GlassPanelProps) {
  return <Tag className={`glass ${className}`.trim()}>{children}</Tag>;
}
