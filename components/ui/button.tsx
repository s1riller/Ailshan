import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Действие — не цвет: главная кнопка угольная. Вторичные — бумага с линией,
 * наведение уходит в утопленный фон, а не в акцент. Никаких теней и
 * микросжатия: они выглядят как игрушка.
 */
const buttonVariants = cva(
  "inline-flex touch-manipulation select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-[0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[hsl(37_8%_18%)]",
        destructive: "border border-destructive/30 bg-card text-destructive hover:bg-destructive-soft",
        outline: "border border-input bg-card text-foreground hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[hsl(39_25%_86%)]",
        ghost: "text-foreground hover:bg-secondary",
        link: "h-auto px-0 text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground",
      },
      // Высоты рассчитаны на палец: минимум 44px на телефоне, компактнее на десктопе.
      size: {
        default: "h-11 px-4 py-2 sm:h-10",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-[15px] sm:h-11 sm:px-8",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
