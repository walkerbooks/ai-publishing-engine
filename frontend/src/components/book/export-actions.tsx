import { Button } from "@/components/ui/button";

export function ExportActions() {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled title="Formatting pipeline pending">
        Download DOCX
      </Button>
      <Button variant="outline" size="sm" disabled title="Formatting pipeline pending">
        Download EPUB
      </Button>
      <Button variant="outline" size="sm" disabled title="Formatting pipeline pending">
        Download PDF
      </Button>
    </div>
  );
}
