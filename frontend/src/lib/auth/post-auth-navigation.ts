type RouterLike = { replace: (href: string) => void; refresh: () => void };

/**
 * Full-page login/signup without `?next=` defaults to `/chat`. Admins should land on `/admin`
 * instead. Dialog logins keep the requested path so in-context sign-in does not bounce away.
 */
export function resolvePostAuthRedirectPath(
  requestedPath: string,
  userRole: string | null | undefined,
  options: {
    variant: "page" | "dialog";
    /** True when the user did not set `?next=` (only applies to full-page auth). */
    defaultConsumerLanding: boolean;
  },
): string {
  if (options.variant === "dialog") return requestedPath;
  if (
    userRole === "admin" &&
    options.defaultConsumerLanding &&
    requestedPath === "/chat"
  ) {
    return "/admin";
  }
  return requestedPath;
}

/**
 * After login/signup: page variant always navigates. Dialog on /chat stays put (same pathname
 * as redirect target) so client chat state is not torn down by a redundant replace + remount.
 */
export function completeAuthNavigation(
  router: RouterLike,
  opts: {
    variant: "page" | "dialog";
    redirectPath: string;
    onAuthenticated?: () => void;
  },
): void {
  opts.onAuthenticated?.();
  const dest = opts.redirectPath.startsWith("/")
    ? opts.redirectPath
    : `/${opts.redirectPath}`;
  const destPath = dest.split("?")[0] || dest;

  if (opts.variant === "page") {
    router.replace(dest);
    router.refresh();
    return;
  }

  if (typeof window !== "undefined") {
    const curPath = window.location.pathname;
    if (curPath === destPath) {
      router.refresh();
      return;
    }
    const curFull = `${window.location.pathname}${window.location.search}`;
    if (curFull === dest) {
      router.refresh();
      return;
    }
  }

  router.replace(dest);
  router.refresh();
}
