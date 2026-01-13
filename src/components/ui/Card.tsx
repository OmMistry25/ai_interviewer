import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className = "", hover = false, padding = "md" }: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };
  
  const hoverStyles = hover 
    ? "hover:bg-slate-800/70 hover:border-slate-600/60 transition-colors cursor-pointer" 
    : "";
  
  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl ${paddingStyles[padding]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, description, icon, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
          {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}


