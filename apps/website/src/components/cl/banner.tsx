"use client";

import { XIcon } from "lucide-react";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cl-utils";

interface BannerContextValue {
  dismiss: () => void;
}

const BannerContext = React.createContext<BannerContextValue | null>(null);

const bannerVariants = cva(
  "group/banner relative flex w-full min-w-0 items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm has-data-[slot=banner-close]:pe-11 max-sm:flex-wrap [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-b bg-background text-foreground",
        muted: "border-b bg-muted text-foreground",
        primary: "bg-primary text-primary-foreground",
        warning:
          "border-b border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200",
        destructive:
          "border-b border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/**
 * A full-width strip for announcements. Dismissal is remembered in
 * localStorage when you pass `storageKey`; change the key to show it again.
 */
function Banner({
  className,
  variant = "default",
  open: openProp,
  onOpenChange,
  storageKey,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bannerVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Remember the dismissal under this key. */
    storageKey?: string;
  }) {
  const [inner, setInner] = React.useState(true);
  // Remembered dismissals are read after mounting, so server and client HTML match.
  const [remembered, setRemembered] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storageKey) setRemembered(read(storageKey));
  }, [storageKey]);

  const open = (openProp ?? inner) && !remembered;
  const context = React.useMemo(
    () => ({
      dismiss: () => {
        if (openProp === undefined) setInner(false);
        onOpenChange?.(false);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            // Private mode or storage disabled: dismiss for this visit only.
          }
        }
      },
    }),
    [openProp, onOpenChange, storageKey],
  );

  if (!open) return null;

  return (
    <BannerContext.Provider value={context}>
      <div
        data-slot="banner"
        data-variant={variant}
        role="region"
        aria-label={props["aria-label"] ?? "Announcement"}
        className={cn(bannerVariants({ variant }), className)}
        {...props}
      />
    </BannerContext.Provider>
  );
}

function BannerContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-content"
      className={cn(
        "flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:justify-center",
        className,
      )}
      {...props}
    />
  );
}

function BannerTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="banner-title"
      className={cn("font-medium", className)}
      {...props}
    />
  );
}

function BannerDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="banner-description"
      className={cn(
        "opacity-80 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

/** Buttons or links next to the content. */
function BannerActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-actions"
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

function BannerClose({
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const context = React.useContext(BannerContext);
  return (
    <button
      type="button"
      data-slot="banner-close"
      aria-label="Dismiss"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) context?.dismiss();
      }}
      className={cn(
        "absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[min(var(--radius-md),12px)] opacity-70 transition-opacity outline-none hover:bg-current/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon />}
    </button>
  );
}

export {
  Banner,
  BannerActions,
  BannerClose,
  BannerContent,
  BannerDescription,
  BannerTitle,
  bannerVariants,
};
