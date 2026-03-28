import type { VideoMeta } from "@/lib/types/chat";
import { cn } from "@/lib/utils/cn";

type Props = { videos: VideoMeta[]; dark?: boolean };

/**
 * YouTube onboarding row — large thumbnails + title links (reference: horizontal 3-up).
 */
export function VideoCardRow({ videos, dark }: Props) {
  const list = videos.slice(0, 3);
  if (!list.length) return null;

  return (
    <div
      className={cn(
        "mt-4 grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3",
        list.length === 1 && "sm:grid-cols-1 lg:max-w-md",
        list.length === 2 && "lg:grid-cols-2",
      )}
    >
      {list.map((v, i) => (
        <a
          key={`${v.link}-${i}`}
          href={v.link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group flex min-w-0 flex-col overflow-hidden rounded-xl border transition-shadow",
            dark
              ? "border-white/10 bg-zinc-900/50 hover:border-white/20 hover:shadow-lg hover:shadow-black/20"
              : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md",
          )}
        >
          <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-zinc-800">
            {v.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnail_url}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No thumbnail
              </div>
            )}
          </div>
          <span
            className={cn(
              "line-clamp-2 p-3 text-sm font-medium leading-snug underline-offset-2 group-hover:underline",
              dark ? "text-sky-400" : "text-blue-600",
            )}
          >
            {v.title}
          </span>
        </a>
      ))}
    </div>
  );
}
