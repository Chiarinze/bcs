import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-bcs-green">{label}</label>
      )}
      <input
        {...props}
        className={clsx(
          "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-bcs-green focus:ring-2 focus:ring-bcs-green/20 transition",
          className
        )}
      />
    </div>
  );
}
