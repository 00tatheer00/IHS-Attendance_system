import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";

/** A Next.js <Link> styled as a Button. */
export function LinkButton({
  href,
  children,
  variant,
  size,
  className,
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
} & VariantProps<typeof buttonVariants>) {
  return (
    <Button nativeButton={false} variant={variant} size={size} className={className} render={<Link href={href} prefetch={prefetch} />}>
      {children}
    </Button>
  );
}
