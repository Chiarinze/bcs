import React from "react";
import clsx from "clsx";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-bcs-green">{label}</label>
      )}
      <textarea
        {...props}
        className={clsx(
          "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-bcs-green focus:ring-2 focus:ring-bcs-green/20 transition min-h-[120px]",
          className
        )}
      />
    </div>
  );
}
