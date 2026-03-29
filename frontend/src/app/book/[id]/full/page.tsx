import { FullBookPageClient } from "@/components/book/full-book-page-client";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function BookFullPage({ params }: Props) {
  const { id } = await params;
  if (!id || id === "undefined" || id === "null") {
    redirect("/chat");
  }
  return <FullBookPageClient bookId={id} />;
}
