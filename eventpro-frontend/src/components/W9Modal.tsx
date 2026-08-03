import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { apiService } from "@/lib/api";
import type { SubmitW9Request } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

const inputFocusClass =
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200";

interface W9ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function W9Modal({ open, onOpenChange, onSuccess }: W9ModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tinType, setTinType] = useState<"SSN" | "EIN">("SSN");
  const [tin, setTin] = useState("");
  const [signatureAcknowledged, setSignatureAcknowledged] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !tin.trim() || !signatureAcknowledged) {
      toast({
        title: "Missing information",
        description: "Please fill required fields and acknowledge the certification.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: SubmitW9Request = {
        legalName: legalName.trim(),
        businessName: businessName.trim() || undefined,
        tinType,
        tin: tin.replace(/\D/g, "").trim(),
        signatureAcknowledged: true,
      };
      await apiService.submitW9(payload);
      toast({
        title: "Tax information received",
        description: "You're set for 1099-K reporting.",
      });
      onOpenChange(false);
      onSuccess?.();
      setLegalName("");
      setBusinessName("");
      setTin("");
      setSignatureAcknowledged(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-white/95 dark:bg-white/10 backdrop-blur-md shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Update Tax Info (W-9)
          </DialogTitle>
          <DialogDescription>
            Required for 1099-K when you exceed $600 in gross payments. We only report as required by the IRS.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal name / Business name</Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Legal or business name"
              className={inputFocusClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name (optional)</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="If different from legal name"
              className={inputFocusClass}
            />
          </div>
          <div className="space-y-2">
            <Label>TIN type</Label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tinType"
                  checked={tinType === "SSN"}
                  onChange={() => setTinType("SSN")}
                  className="text-primary"
                />
                <span>SSN</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tinType"
                  checked={tinType === "EIN"}
                  onChange={() => setTinType("EIN")}
                  className="text-primary"
                />
                <span>EIN</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">{tinType === "SSN" ? "SSN (last 4 digits)" : "EIN"}</Label>
            <Input
              id="tin"
              inputMode="numeric"
              value={tin}
              onChange={(e) => setTin(e.target.value.replace(/\D/g, "").slice(0, tinType === "SSN" ? 4 : 20))}
              placeholder={tinType === "SSN" ? "1234" : "12-3456789"}
              className={inputFocusClass}
              required
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={signatureAcknowledged}
              onChange={(e) => setSignatureAcknowledged(e.target.checked)}
              className="mt-1 rounded border-primary text-primary"
            />
            <span className="text-sm">
              I certify under penalty of perjury that the information provided is correct and that I am not subject to backup withholding.
            </span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit W-9"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
