import { PreviewPageClient } from "@/components/preview/preview-page-client";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function BookPreviewPage({ params }: Props) {
  const { id } = await params;
  if (!id || id === "undefined" || id === "null") {
    redirect("/chat");
  }
  return <PreviewPageClient bookId={id} />;
}
