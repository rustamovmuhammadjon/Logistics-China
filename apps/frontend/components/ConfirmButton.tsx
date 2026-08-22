"use client";

export function ConfirmButton({
  confirmText,
  className,
  children,
  onConfirm,
  disabled,
  type = "button",
}: {
  confirmText: string;
  className?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={className ?? "btn-danger"}
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        onConfirm?.();
      }}
    >
      {children}
    </button>
  );
}
