type RouterLike = { replace: (href: string) => void; refresh: () => void };

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
