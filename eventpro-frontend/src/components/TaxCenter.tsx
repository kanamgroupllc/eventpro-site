import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldCheck, FileText, Download, Lock } from "lucide-react";
import { apiService } from "@/lib/api";
import type { OrganizerSummary, TaxFormEntry } from "@/types/api";
import { W9Modal } from "@/components/W9Modal";
import { useAuth } from "@/contexts/AuthContext";

const THRESHOLD_1099 = 600;
const W9_REQUIRED_ABOVE = 500;

const usdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

const INVALUATE_EVENT = "organizer-summary-invalidate";

export function TaxCenter() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [taxForms, setTaxForms] = useState<TaxFormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [w9ModalOpen, setW9ModalOpen] = useState(false);

  const isEnterprise = (user?.subscriptionTier ?? "").toUpperCase() === "ENTERPRISE";

  const fetchData = useCallback(async () => {
    try {
      const [s, forms] = await Promise.all([
        apiService.getOrganizerSummary(),
        isEnterprise ? apiService.getOrganizerTaxForms() : Promise.resolve([]),
      ]);
      setSummary(s);
      setTaxForms(forms ?? []);
    } catch {
      setSummary(null);
      setTaxForms([]);
    } finally {
      setLoading(false);
    }
  }, [isEnterprise]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onInvalidate = () => fetchData();
    window.addEventListener(INVALUATE_EVENT, onInvalidate);
    return () => window.removeEventListener(INVALUATE_EVENT, onInvalidate);
  }, [fetchData]);

  const handleW9Success = () => {
    fetchData();
    window.dispatchEvent(new Event(INVALUATE_EVENT));
  };

  const totalRevenue = summary ? toNum(summary.totalRevenue) : 0;
  const w9Submitted = Boolean(summary?.w9Submitted);
  const w9Required = totalRevenue > W9_REQUIRED_ABOVE;
  const progressPct = Math.min(100, (totalRevenue / THRESHOLD_1099) * 100);

  const tileBase =
    "rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px] p-5 transition-all duration-300";

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          1099-K Tax Center
        </h2>
      </div>

      {/* Compliance Status Tile */}
      <div
        className={`${tileBase} mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
          w9Submitted ? "ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]" : ""
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-6 w-48 bg-white/10" />
            ) : w9Submitted ? (
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Tax Identity Verified
              </p>
            ) : w9Required ? (
              <p className="font-semibold text-amber-600 dark:text-amber-400">Action Required: Submit W-9</p>
            ) : (
              <p className="font-medium text-muted-foreground">No action needed yet</p>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              IRS requires 1099-K when gross payments exceed $600.
            </p>
          </div>
        </div>
        {!w9Submitted && (
          <Button
            onClick={() => setW9ModalOpen(true)}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shrink-0"
          >
            Update Tax Info
          </Button>
        )}
      </div>

      {/* Progress bar: $X / $600 towards 1099-K threshold */}
      <div className={`${tileBase} mb-6`}>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {usdFormat.format(totalRevenue)} / $600 towards 1099-K threshold
        </p>
        {loading ? (
          <Skeleton className="h-2 w-full rounded-full bg-white/10" />
        ) : (
          <Progress value={progressPct} className="h-2" />
        )}
      </div>

      {/* Document Vault (1099-K reports — Enterprise only per pricing) */}
      <div className={`${tileBase} mb-6`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Document Vault
        </h3>
        {!isEnterprise ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <Lock className="h-10 w-10 text-primary shrink-0" />
            <div>
              <p className="font-medium text-foreground">1099-K reports are included in Enterprise</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Download annual 1099-K tax forms and keep compliance in one place. Upgrade to Enterprise to unlock the Document Vault.
              </p>
            </div>
            <Button asChild className="shrink-0 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              <Link to="/pricing">View plans</Link>
            </Button>
          </div>
        ) : loading ? (
          <Skeleton className="h-16 w-full rounded-lg bg-white/10" />
        ) : taxForms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tax forms yet. Forms appear here after the calendar year.</p>
        ) : (
          <ul className="space-y-3">
            {taxForms.map((form) => (
              <li
                key={form.year}
                className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/10 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium tabular-nums">{form.year}</span>
                  <span className="text-muted-foreground">{form.formType}</span>
                  <span
                    className={`text-sm ${
                      form.status === "Available"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {form.status}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-primary/30 text-primary hover:bg-primary/20"
                  disabled={form.status !== "Available"}
                  onClick={() => {
                    if (form.status !== "Available") return;
                    const year = parseInt(form.year, 10);
                    if (!Number.isNaN(year)) apiService.downloadOrganizerTaxFormPdf(year);
                  }}
                  title={form.status !== "Available" ? form.status : undefined}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Financial safety micro-copy */}
      <p className="text-xs text-muted-foreground max-w-2xl">
        KanamEvents uses bank-grade encryption to protect your tax identity. We only report data as required by the IRS.
      </p>

      <W9Modal open={w9ModalOpen} onOpenChange={setW9ModalOpen} onSuccess={handleW9Success} />
    </section>
  );
}
