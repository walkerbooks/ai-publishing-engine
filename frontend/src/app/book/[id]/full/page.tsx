import { FullBookPageClient } from "@/components/book/full-book-page-client";

type Props = { params: { id: string } };

export default function BookFullPage({ params }: Props) {
  return <FullBookPageClient bookId={params.id} />;
}
