import type { VideoMeta } from "@/lib/types/chat";

type Props = { videos: VideoMeta[]; dark?: boolean };

export function VideoCardRow({ videos, dark }: Props) {
  const list = videos.slice(0, 3);
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {list.map((v, i) => (
        <a
          key={`${v.link}-${i}`}
          href={v.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-[30%] min-w-[140px] max-w-[200px] shrink-0"
        >
          {v.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.thumbnail_url}
              alt=""
              className="mb-1 block w-full rounded-lg object-cover"
            />
          ) : null}
          <span
            className={
              dark
                ? "block text-xs text-sky-400 hover:underline"
                : "block text-xs text-blue-600 hover:underline"
            }
          >
            {v.title}
          </span>
        </a>
      ))}
    </div>
  );
}
