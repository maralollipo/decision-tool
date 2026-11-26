"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  variant = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "default" | "primary";
  disabled?: boolean;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} title={title} className={variant === "primary" ? "btn-primary" : "btn"}>
      {pending ? (pendingText ?? "Bitte warten …") : children}
    </button>
  );
}
