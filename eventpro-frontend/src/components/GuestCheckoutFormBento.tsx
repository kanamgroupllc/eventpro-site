import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassInput } from "@/components/GlassInput";
import { Lock, Zap, Shield, Database } from "lucide-react";

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

export interface GuestCheckoutFormBentoProps {
  onSubmit: (guestInfo: GuestInfo) => void;
  onLoginClick: () => void;
  onFormChange?: (data: { firstName: string; lastName: string; email: string }) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GuestCheckoutFormBento({
  onSubmit,
  onLoginClick,
  onFormChange,
}: GuestCheckoutFormBentoProps) {
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({});

  useEffect(() => {
    onFormChange?.({
      firstName: guestInfo.firstName,
      lastName: guestInfo.lastName,
      email: guestInfo.email,
    });
  }, [guestInfo.firstName, guestInfo.lastName, guestInfo.email, onFormChange]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GuestInfo, string>> = {};
    if (!guestInfo.firstName.trim()) newErrors.firstName = "First name is required";
    if (!guestInfo.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!guestInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(guestInfo.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!guestInfo.acceptTerms) newErrors.acceptTerms = "You must accept the terms";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateGuest = (next: Partial<GuestInfo>) => {
    setGuestInfo((prev) => ({ ...prev, ...next }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) onSubmit(guestInfo);
  };

  const firstNameValid = guestInfo.firstName.trim() !== "";
  const lastNameValid = guestInfo.lastName.trim() !== "";
  const emailValid = guestInfo.email.trim() !== "" && EMAIL_REGEX.test(guestInfo.email);

  return (
    <div className="relative">
      {/* Mesh gradient behind */}
      <div className="absolute -inset-4 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute top-0 left-1/2 w-[120%] h-[60%] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-0 right-0 w-2/3 h-1/2 rounded-full bg-pink-500/8 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-1/2 h-1/3 rounded-full bg-orange-500/8 blur-3xl" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bento: Info box — Name + Email */}
        <div className="rounded-xl border border-white/15 bg-[rgba(255,255,255,0.06)] backdrop-blur-[12px] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your info
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="First name"
              value={guestInfo.firstName}
              onChange={(e) => updateGuest({ firstName: e.target.value })}
              showValid={firstNameValid}
              error={errors.firstName}
            />
            <GlassInput
              label="Last name"
              value={guestInfo.lastName}
              onChange={(e) => updateGuest({ lastName: e.target.value })}
              showValid={lastNameValid}
              error={errors.lastName}
            />
          </div>
          <GlassInput
            label="Email"
            type="email"
            value={guestInfo.email}
            onChange={(e) => updateGuest({ email: e.target.value })}
            showValid={emailValid}
            error={errors.email}
          />
          <GlassInput
            label="Phone (optional — for SMS / WhatsApp tickets)"
            type="tel"
            value={guestInfo.phone}
            onChange={(e) => updateGuest({ phone: e.target.value })}
            error={errors.phone}
          />
        </div>

        {/* Bento: Security box */}
        <div className="rounded-xl border border-white/15 bg-[rgba(255,255,255,0.06)] backdrop-blur-[12px] p-4 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Secure payment</p>
            <p className="text-xs text-muted-foreground">Secured by PCI DSS</p>
          </div>
        </div>

        {/* Bento: Benefit box — 3 icons */}
        <div className="rounded-xl border border-white/15 bg-[rgba(255,255,255,0.06)] backdrop-blur-[12px] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Instant ticket delivery
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Secure entry
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-4 w-4 text-primary" />
              Data ownership
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms-bento"
            checked={guestInfo.acceptTerms}
            onCheckedChange={(c) => updateGuest({ acceptTerms: c as boolean })}
          />
          <label htmlFor="terms-bento" className="text-sm text-muted-foreground leading-tight">
            I accept the terms of service and privacy policy
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="text-xs text-destructive">{errors.acceptTerms}</p>
        )}

        <Button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-primary via-primary to-orange-500 text-white shadow-[0_4px_20px_rgba(147,51,234,0.4)] hover:shadow-[0_6px_28px_rgba(147,51,234,0.5)] hover:scale-[1.02] transition-all duration-200"
        >
          Continue as Guest
        </Button>

        <div className="relative flex items-center gap-4">
          <span className="flex-1 border-t border-white/15" />
          <span className="text-xs uppercase text-muted-foreground">Or</span>
          <span className="flex-1 border-t border-white/15" />
        </div>

        <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onLoginClick}>
          Sign in for faster checkout
        </Button>
      </form>
    </div>
  );
}
