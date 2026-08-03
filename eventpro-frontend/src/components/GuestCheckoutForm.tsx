import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Phone } from "lucide-react";

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
}

interface GuestCheckoutFormProps {
  onSubmit: (guestInfo: GuestInfo) => void;
  onLoginClick: () => void;
  /** Optional: called on every change for live ticket preview sync. */
  onFormChange?: (data: { firstName: string; lastName: string; email: string }) => void;
}

export const GuestCheckoutForm = ({ onSubmit, onLoginClick, onFormChange }: GuestCheckoutFormProps) => {
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GuestInfo, string>> = {};

    if (!guestInfo.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!guestInfo.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!guestInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!guestInfo.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateGuest = (next: Partial<GuestInfo>) => {
    const nextState = { ...guestInfo, ...next };
    setGuestInfo(nextState);
    onFormChange?.({
      firstName: nextState.firstName,
      lastName: nextState.lastName,
      email: nextState.email,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(guestInfo);
    }
  };

  return (
    <Card className="rounded-xl border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Guest Checkout
        </CardTitle>
        <CardDescription>
          Purchase tickets without creating an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={guestInfo.firstName}
                onChange={(e) => updateGuest({ firstName: e.target.value })}
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={guestInfo.lastName}
                onChange={(e) => updateGuest({ lastName: e.target.value })}
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={guestInfo.email}
              onChange={(e) => updateGuest({ email: e.target.value })}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Tickets will be sent to this email address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone (optional)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={guestInfo.phone}
              onChange={(e) => updateGuest({ phone: e.target.value })}
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={guestInfo.acceptTerms}
              onCheckedChange={(checked) =>
                updateGuest({ acceptTerms: checked as boolean })
              }
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I accept the terms of service *
              </label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you agree to our Terms of Service and Privacy Policy
              </p>
              {errors.acceptTerms && (
                <p className="text-xs text-destructive">{errors.acceptTerms}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full bg-gradient-primary">
            Continue as Guest
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onLoginClick}
          >
            Sign in for faster checkout
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
