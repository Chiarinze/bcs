"use client";

import clsx from "clsx";
import React from "react";

export function TextInput({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-bcs-green">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        {...props}
        className={clsx(
          "w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm",
          "focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition"
        )}
      />
    </div>
  );
}

export function TextArea({
  label,
  name,
  required,
  defaultValue,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-bcs-green">
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={4}
        {...props}
        className={clsx(
          "w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm resize-none",
          "focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition"
        )}
      />
    </div>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        {...props}
        className="h-4 w-4 rounded border-gray-400 text-bcs-green focus:ring-bcs-accent"
      />
      {label}
    </label>
  );
}

export function FileInput({
  label,
  name,
  accept,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-bcs-green">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        {...props}
        className="block w-full text-sm text-gray-600 border border-gray-300 rounded-xl cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-bcs-green file:text-white hover:file:bg-bcs-accent"
      />
    </div>
  );
}
