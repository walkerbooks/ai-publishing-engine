import { PreviewPageClient } from "@/components/preview/preview-page-client";

type Props = { params: { id: string } };

export default function BookPreviewPage({ params }: Props) {
  return <PreviewPageClient bookId={params.id} />;
}
