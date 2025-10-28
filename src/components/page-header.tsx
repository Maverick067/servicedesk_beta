import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 pb-8 md:pb-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageHeaderHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

function PageHeaderHeading({
  className,
  ...props
}: PageHeaderHeadingProps) {
  return (
    <h1
      className={cn(
        "text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:text-5xl lg:leading-[1.1]",
        className
      )}
      {...props}
    />
  );
}

interface PageHeaderDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

function PageHeaderDescription({
  className,
  ...props
}: PageHeaderDescriptionProps) {
  return (
    <p
      className={cn(
        "max-w-[750px] text-lg text-muted-foreground sm:text-xl",
        className
      )}
      {...props}
    />
  );
}

export { PageHeader, PageHeaderHeading, PageHeaderDescription };
