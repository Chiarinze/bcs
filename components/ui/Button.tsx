"use client";
import React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
};

export default function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 cursor-pointer rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover-lift";

  const variants = {
    primary:
      "bg-bcs-green text-white hover:bg-bcs-accent focus:ring-bcs-green/30",
    outline:
      "border hover:text-white",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30",
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={clsx(
        base,
        variants[variant],
        loading && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      {loading && (
        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      )}
      {children}
    </button>
  );
}
