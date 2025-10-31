import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-900 shadow-lg hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300 font-bold hover:from-cyan-400 hover:to-teal-400",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:scale-105 transition-all duration-300",
        outline:
          "border border-purple-200 bg-background shadow-md hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 hover:text-violet-700 hover:border-purple-300 hover:scale-105 transition-all duration-300",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80 hover:scale-105 transition-all duration-300",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105 transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
