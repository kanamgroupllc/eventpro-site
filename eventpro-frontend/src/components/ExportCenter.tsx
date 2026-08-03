import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";

const tileBase =
  "rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px] p-5 transition-all duration-300";

export function ExportCenter() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: "attendees" | "checkin" | "marketing" | "financial") => {
    try {
      setExporting(type);
      await apiService.exportOrganizerData(type, "csv");
      toast.success(`Exported ${type} data`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_16px_rgba(147,51,234,0.3)]">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Data Ownership
        </h2>
      </div>

      <div className={`${tileBase} ring-1 ring-primary/10`}>
        <p className="text-sm text-muted-foreground mb-4">
          You own 100% of your data. Export anytime for Mailchimp, HubSpot, or your records.
        </p>
        <Button
          onClick={() => handleExport("attendees")}
          disabled={!!exporting}
          className="w-full sm:w-auto bg-gradient-to-r from-primary via-primary to-orange-500 text-white border-0 shadow-lg hover:shadow-[0_0_20px_hsl(var(--primary)_/_0.4)]"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting === "attendees" ? "Exporting…" : "Export Master Attendee List"}
        </Button>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
            disabled={!!exporting}
            onClick={() => handleExport("checkin")}
          >
            {exporting === "checkin" ? "…" : "Export Check-in List (PDF)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
            disabled={!!exporting}
            onClick={() => handleExport("marketing")}
          >
            {exporting === "marketing" ? "…" : "Export Marketing Emails (CSV)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
            disabled={!!exporting}
            onClick={() => handleExport("financial")}
          >
            {exporting === "financial" ? "…" : "Export Financial Summary (XLS)"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Data exported in CCPA/GDPR compliant format.
        </p>
      </div>
    </section>
  );
}
