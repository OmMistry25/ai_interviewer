import { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, icon, className = "" }: BadgeProps) {
  const variants = {
    default: "bg-slate-700/60 text-slate-300 border-slate-600/50",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
    info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${variants[variant]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

// Specific status badge for applications
interface StatusBadgeProps {
  status: "applied" | "scheduled" | "interviewed" | "accepted" | "rejected" | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
    applied: { variant: "info", label: "Applied" },
    scheduled: { variant: "warning", label: "Scheduled" },
    interviewed: { variant: "warning", label: "Interviewed" },
    accepted: { variant: "success", label: "Accepted" },
    rejected: { variant: "error", label: "Rejected" },
  };
  
  const config = statusConfig[status] || { variant: "default", label: status };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
}


