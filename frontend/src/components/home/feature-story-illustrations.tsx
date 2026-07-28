import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type IllustrationProps = {
  className?: string;
};

export function DeskPathIllustration({ className }: IllustrationProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="animate-float-soft absolute inset-0">
        <Image
          src="/illustrations/story-welcome.png"
          alt=""
          fill
          sizes="(max-width: 1024px) 90vw, 480px"
          className="object-contain object-center"
          priority
        />
      </div>
      <div
        className="animate-bob pointer-events-none absolute -right-1 top-[12%] h-16 w-16 rounded-2xl bg-walker-teal/15 blur-xl dark:bg-walker-teal/20"
        style={{ animationDelay: "0.4s" }}
      />
      <div
        className="animate-float-soft pointer-events-none absolute bottom-[18%] left-[6%] h-12 w-12 rounded-full bg-walker-navy/10 blur-lg dark:bg-walker-slate/20"
        style={{ animationDelay: "0.9s" }}
      />
    </div>
  );
}

export function StagesProgressIllustration({ className }: IllustrationProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="animate-float-soft absolute inset-0" style={{ animationDelay: "0.2s" }}>
        <Image
          src="/illustrations/story-progress.png"
          alt=""
          fill
          sizes="(max-width: 1024px) 90vw, 480px"
          className="object-contain object-center"
        />
      </div>
      <div
        className="animate-bob pointer-events-none absolute right-[10%] top-[8%] h-14 w-14 rounded-full bg-walker-teal/20 blur-xl"
        style={{ animationDelay: "0.6s" }}
      />
      <div
        className="animate-float-soft pointer-events-none absolute bottom-[12%] left-[8%] h-10 w-20 rounded-full bg-walker-navy/10 blur-lg dark:bg-walker-slate/25"
        style={{ animationDelay: "1.1s" }}
      />
    </div>
  );
}
