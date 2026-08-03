import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PageShell } from "@/components/PageShell";
import { ArrowLeft, Camera, Globe, Ticket, Trash2 } from "lucide-react";
import { getEventImageUrl } from "@/lib/utils";

const PRIVACY_STORAGE_KEY = "eventpro_profile_privacy_v1";

function loadPrivacy(): { publicProfile: boolean; showTickets: boolean } {
  try {
    const raw = localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { publicProfile?: boolean; showTickets?: boolean };
      return {
        publicProfile: p.publicProfile !== false,
        showTickets: Boolean(p.showTickets),
      };
    }
  } catch {
    /* ignore */
  }
  return { publicProfile: true, showTickets: false };
}

function savePrivacy(p: { publicProfile: boolean; showTickets: boolean }) {
  try {
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const CULTURAL_NICHE_OPTIONS = [
  "West African Cultural Events",
  "Cultural & Community Events",
  "Afro-Caribbean & Diaspora",
  "Diaspora & Heritage",
  "Live Music & Festivals",
  "Conference & Professional",
  "Other",
];

const inputFocusClass =
  "rounded-2xl border-border/80 bg-primary/[0.04] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

const ProfileEdit = () => {
  const { user, hasRole, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [culturalNiche, setCulturalNiche] = useState(user?.culturalNiche ?? "");
  const [publicProfile, setPublicProfile] = useState(true);
  const [showTickets, setShowTickets] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const p = loadPrivacy();
    setPublicProfile(p.publicProfile);
    setShowTickets(p.showTickets);
  }, []);

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhoneNumber(user?.phoneNumber ?? "");
    setBio(user?.bio ?? "");
    setLocation(user?.location ?? "");
    setCulturalNiche(user?.culturalNiche ?? "");
  }, [user]);

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Your name";
  const email = user?.email ?? "";
  const usernameHandle = email.includes("@")
    ? `@${email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "you"}`
    : "@you";

  const avatarSrc = getEventImageUrl(user?.profilePictureUrl ?? undefined);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await apiService.uploadProfilePicture(file);
      await apiService.updateUser({ profilePictureUrl: url });
      await refreshUser();
      toast({ title: "Photo updated" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    savePrivacy({ publicProfile, showTickets });
    setSaving(true);
    try {
      await apiService.updateUser({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phoneNumber: phoneNumber || undefined,
        bio: bio || undefined,
        location: location || undefined,
        culturalNiche: culturalNiche || undefined,
      });
      await refreshUser();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      navigate("/profile");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    toast({
      title: "Contact support",
      description: "Account deletion is processed by our team. Email support@kanamevents.com from your registered address.",
    });
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 max-w-lg py-6 md:py-10 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
            <h1 className="text-xl font-bold font-headline tracking-tight text-foreground flex-1 text-center pr-10">
              Edit profile
            </h1>
          </div>

          <Card className="rounded-3xl border-border/50 bg-card/95 shadow-sm overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-8">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                    {avatarSrc ? <AvatarImage src={avatarSrc} alt="" className="object-cover" /> : null}
                    <AvatarFallback className="text-2xl font-headline bg-primary/15 text-primary">
                      {(firstName?.[0] ?? "?").toUpperCase()}
                      {(lastName?.[0] ?? "").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background hover:opacity-95 disabled:opacity-50"
                    aria-label="Change photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
                <p className="mt-4 text-lg font-bold font-headline text-foreground">{displayName}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-semibold text-primary mt-1 hover:underline"
                >
                  Change photo
                </button>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      id="fullName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First"
                      className={inputFocusClass}
                    />
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last"
                      className={inputFocusClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={usernameHandle} disabled className="rounded-2xl bg-muted/50 opacity-90" />
                  <p className="text-xs text-muted-foreground">Derived from your email. Contact support to change.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} disabled className="rounded-2xl bg-muted/50 opacity-90" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone</Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={inputFocusClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about you…"
                    rows={4}
                    className={`resize-none min-h-[120px] ${inputFocusClass}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State (optional)"
                    className={inputFocusClass}
                  />
                </div>

                {hasRole("ORGANIZER") && (
                  <div className="space-y-2">
                    <Label>Cultural niche / focus</Label>
                    <Select value={culturalNiche || undefined} onValueChange={(v) => setCulturalNiche(v)}>
                      <SelectTrigger className={inputFocusClass}>
                        <SelectValue placeholder="Select your focus" />
                      </SelectTrigger>
                      <SelectContent>
                        {CULTURAL_NICHE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-2xl border border-border/60 bg-primary/[0.04] p-4 space-y-4">
                  <p className="text-sm font-bold font-headline text-foreground">Privacy &amp; visibility</p>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 min-w-0">
                      <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Public profile</p>
                        <p className="text-xs text-muted-foreground">Allow others to find your profile.</p>
                      </div>
                    </div>
                    <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 min-w-0">
                      <Ticket className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Show my tickets</p>
                        <p className="text-xs text-muted-foreground">Visible on your public activity feed.</p>
                      </div>
                    </div>
                    <Switch checked={showTickets} onCheckedChange={setShowTickets} />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl font-headline font-bold bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md"
                  disabled={saving || uploadingPhoto}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </form>

              <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/[0.06] p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-destructive">Danger zone</p>
                <p className="text-sm text-muted-foreground">
                  Once deleted, your account and all associated data cannot be recovered. This action is permanent.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full rounded-2xl h-11 gap-2"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If you proceed, we&apos;ll guide you to contact support to verify your identity and
              complete deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground" onClick={confirmDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default ProfileEdit;
