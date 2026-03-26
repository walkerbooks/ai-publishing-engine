import { OutlinePageClient } from "@/components/outline/outline-page-client";

type Props = { params: { id: string } };

export default function BookOutlinePage({ params }: Props) {
  return <OutlinePageClient bookId={params.id} />;
}
