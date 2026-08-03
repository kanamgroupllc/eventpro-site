import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Building2, User, MapPin, FileCheck, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "@/lib/api";
import type { SubmitVerificationRequest } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "eventpro_identity_check_draft";

const inputFocusClass =
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200";

const STEPS = [
  { id: 1, title: "Legal entity & tax ID", icon: Building2 },
  { id: 2, title: "Address", icon: MapPin },
  { id: 3, title: "ID verification", icon: FileCheck },
] as const;

interface DraftState {
  step: number;
  legalEntityType: "INDIVIDUAL" | "BUSINESS";
  ssnLast4: string;
  ein: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  idSessionId: string;
}

const defaultDraft: DraftState = {
  step: 1,
  legalEntityType: "INDIVIDUAL",
  ssnLast4: "",
  ein: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
  idSessionId: "",
};

function loadDraft(): DraftState | null {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    return s ? (JSON.parse(s) as DraftState) : null;
  } catch {
    return null;
  }
}

function saveDraft(d: DraftState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function hasProgress(state: DraftState): boolean {
  return (
    state.step > 1 ||
    state.addressStreet.trim() !== "" ||
    state.addressCity.trim() !== "" ||
    state.addressState.trim() !== "" ||
    state.addressZip.trim() !== "" ||
    state.ssnLast4.trim() !== "" ||
    state.ein.trim() !== ""
  );
}

interface IdentityCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function IdentityCheckModal({ open, onOpenChange, onSuccess }: IdentityCheckModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [legalEntityType, setLegalEntityType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");
  const [ssnLast4, setSsnLast4] = useState("");
  const [ein, setEin] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [idSessionId, setIdSessionId] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Restore draft when modal opens
  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      if (draft) {
        setStep(draft.step);
        setLegalEntityType(draft.legalEntityType);
        setSsnLast4(draft.ssnLast4);
        setEin(draft.ein);
        setAddressStreet(draft.addressStreet);
        setAddressCity(draft.addressCity);
        setAddressState(draft.addressState);
        setAddressZip(draft.addressZip);
        setIdSessionId(draft.idSessionId);
      } else {
        setStep(1);
        setLegalEntityType("INDIVIDUAL");
        setSsnLast4("");
        setEin("");
        setAddressStreet("");
        setAddressCity("");
        setAddressState("");
        setAddressZip("");
        setIdSessionId("");
      }
    }
  }, [open]);

  // Persist draft when fields change
  useEffect(() => {
    if (!open) return;
    const state: DraftState = {
      step,
      legalEntityType,
      ssnLast4,
      ein,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      idSessionId,
    };
    if (hasProgress(state)) saveDraft(state);
    else clearDraft();
  }, [open, step, legalEntityType, ssnLast4, ein, addressStreet, addressCity, addressState, addressZip, idSessionId]);

  const canProceedStep1 =
    legalEntityType === "INDIVIDUAL"
      ? /^\d{4}$/.test(ssnLast4.trim())
      : legalEntityType === "BUSINESS"
        ? ein.trim().length >= 9
        : false;
  const canProceedStep2 =
    addressStreet.trim() && addressCity.trim() && addressState.trim() && addressZip.trim();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      setPendingClose(false);
      return;
    }
    const state: DraftState = {
      step,
      legalEntityType,
      ssnLast4,
      ein,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      idSessionId,
    };
    if (hasProgress(state)) {
      setPendingClose(true);
      setShowDiscardConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmDiscard = () => {
    clearDraft();
    setShowDiscardConfirm(false);
    setPendingClose(false);
    onOpenChange(false);
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
    setPendingClose(false);
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: SubmitVerificationRequest = {
        legalEntityType,
        addressStreet: addressStreet.trim(),
        addressCity: addressCity.trim(),
        addressState: addressState.trim(),
        addressZip: addressZip.trim(),
        idProvider: "STRIPE_IDENTITY",
      };
      if (legalEntityType === "INDIVIDUAL") payload.ssnLast4 = ssnLast4.trim();
      else payload.ein = ein.trim().replace(/\D/g, "").slice(0, 20);
      if (idSessionId.trim()) payload.idSessionId = idSessionId.trim();
      await apiService.submitVerification(payload);
      clearDraft();
      toast({
        title: "Verification submitted",
        description: "We'll review your information and notify you when your account is verified.",
      });
      onOpenChange(false);
      onSuccess?.();
      setStep(1);
      setLegalEntityType("INDIVIDUAL");
      setSsnLast4("");
      setEin("");
      setAddressStreet("");
      setAddressCity("");
      setAddressState("");
      setAddressZip("");
      setIdSessionId("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed.";
      toast({ title: "Verification failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === 3;
  const canGoNext =
    (step === 1 && canProceedStep1) ||
    (step === 2 && canProceedStep2) ||
    (step === 3 && true);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg border-0 bg-white/95 dark:bg-white/10 backdrop-blur-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Complete Identity Check
            </DialogTitle>
            <DialogDescription>
              KYC is required for payouts. Your information is verified against watchlists (e.g. OFAC) and used only for compliance.
            </DialogDescription>
          </DialogHeader>

          {/* Identity Verification Privacy Policy + CCPA/PCI */}
          <p className="text-xs text-muted-foreground">
            Sensitive data is handled per our{" "}
            <Link
              to="/privacy#identity-verification"
              className="text-primary underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Identity Verification Privacy Policy
            </Link>
            , in line with PCI DSS and CCPA standards.
            <ExternalLink className="inline h-3 w-3 ml-0.5" />
          </p>

          {/* Step indicator */}
          <div className="flex gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s.id <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Legal entity + SSN/EIN */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <Label>Are you verifying as an individual or a business?</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer transition-all border-2 ${
                    legalEntityType === "INDIVIDUAL"
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-primary/30"
                  }`}
                  onClick={() => setLegalEntityType("INDIVIDUAL")}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <User className="h-8 w-8 text-primary" />
                    <span className="font-medium">Individual</span>
                    <span className="text-xs text-muted-foreground">SSN</span>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all border-2 ${
                    legalEntityType === "BUSINESS"
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-primary/30"
                  }`}
                  onClick={() => setLegalEntityType("BUSINESS")}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-primary" />
                    <span className="font-medium">Business</span>
                    <span className="text-xs text-muted-foreground">EIN</span>
                  </CardContent>
                </Card>
              </div>
              {legalEntityType === "INDIVIDUAL" && (
                <div className="space-y-2">
                  <Label htmlFor="ssnLast4">SSN (last 4 digits)</Label>
                  <Input
                    id="ssnLast4"
                    inputMode="numeric"
                    maxLength={4}
                    value={ssnLast4}
                    onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    className={inputFocusClass}
                  />
                  <p className="text-xs text-muted-foreground">Required for 1099-K reporting. We only store the last 4 digits.</p>
                </div>
              )}
              {legalEntityType === "BUSINESS" && (
                <div className="space-y-2">
                  <Label htmlFor="ein">Employer Identification Number (EIN)</Label>
                  <Input
                    id="ein"
                    inputMode="numeric"
                    value={ein}
                    onChange={(e) => setEin(e.target.value.replace(/\D/g, "").slice(0, 20))}
                    placeholder="12-3456789"
                    className={inputFocusClass}
                  />
                  <p className="text-xs text-muted-foreground">9 digits. Required for business payouts and 1099-K.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                US physical address (no P.O. boxes) for anti-fraud compliance.
              </p>
              <div className="space-y-2">
                <Label htmlFor="addressStreet">Street address</Label>
                <Input
                  id="addressStreet"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="123 Main St"
                  className={inputFocusClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="addressCity">City</Label>
                  <Input
                    id="addressCity"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="City"
                    className={inputFocusClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressState">State</Label>
                  <Input
                    id="addressState"
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    placeholder="CA"
                    className={inputFocusClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressZip">ZIP code</Label>
                <Input
                  id="addressZip"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="94102"
                  className={inputFocusClass}
                />
              </div>
            </div>
          )}

          {/* Step 3: ID verification placeholder */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Government-issued ID (Driver&apos;s License or Passport) is verified via our secure partner. You can complete ID verification from your Organizer dashboard after submitting this form.
              </p>
              <div className="space-y-2">
                <Label htmlFor="idSessionId">Verification session ID (optional)</Label>
                <Input
                  id="idSessionId"
                  value={idSessionId}
                  onChange={(e) => setIdSessionId(e.target.value)}
                  placeholder="If you already completed ID verification, paste session ID"
                  className={inputFocusClass}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1}>
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext || submitting}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLastStep ? (
                "Submit"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard progress?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved information. If you close now, you&apos;ll need to start over. Close anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDiscard}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
