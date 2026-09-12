"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/* Уведомление — карточка на бумаге: те же токены, что у всего интерфейса */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:font-sans",
          title: "group-[.toast]:text-sm group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:[&_svg]:text-success",
          error: "group-[.toaster]:[&_svg]:text-destructive",
          warning: "group-[.toaster]:[&_svg]:text-warning",
          info: "group-[.toaster]:[&_svg]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
