import { OutlinePageClient } from "@/components/outline/outline-page-client";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function BookOutlinePage({ params }: Props) {
  const { id } = await params;
  if (!id || id === "undefined" || id === "null") {
    redirect("/chat");
  }
  return <OutlinePageClient bookId={id} />;
}
