import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api";
import type { CheckInResult } from "@/types/api";
import { toast } from "sonner";
import {
  QrCode,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Flashlight,
  ImageIcon,
  Menu,
  Home,
  Search,
  Ticket,
  LayoutGrid,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new(options: { formats: string[] }): BarcodeDetectorInstance;
}

export function CheckInScannerPanel() {
  const { user } = useAuth();
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const animationRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingQrRef = useRef(false);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email?.split("@")[0] || "Staff";

  const hasBarcodeDetector =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  const validateAndCheckIn = useCallback(
    async (ticketId: string) => {
      const trimmed = ticketId.trim();
      if (!trimmed) {
        toast.error("Enter or scan a ticket ID");
        return;
      }
      if (!UUID_REGEX.test(trimmed)) {
        toast.error("Invalid ticket ID (expected UUID from QR)");
        return;
      }
      setLoading(true);
      setLastResult(null);
      try {
        const result = await apiService.checkInTicket(trimmed);
        setLastResult(result);
        setTicketIdInput("");
        if (result.alreadyCheckedIn) {
          toast.info(`${result.attendeeName} — ${result.ticketName} (already in)`);
        } else {
          toast.success(`Validated: ${result.attendeeName}`);
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Check-in failed";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !hasBarcodeDetector) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      barcodeDetectorRef.current = new (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector(
        { formats: ["qr_code"] }
      );

      const detectLoop = async () => {
        if (processingQrRef.current) {
          animationRef.current = requestAnimationFrame(detectLoop);
          return;
        }
        if (!videoRef.current || !barcodeDetectorRef.current || videoRef.current.readyState < 2) {
          animationRef.current = requestAnimationFrame(detectLoop);
          return;
        }
        try {
          const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
          const qr = barcodes.find((b) => b.rawValue && UUID_REGEX.test(b.rawValue));
          if (qr?.rawValue) {
            processingQrRef.current = true;
            await validateAndCheckIn(qr.rawValue);
            processingQrRef.current = false;
            animationRef.current = requestAnimationFrame(detectLoop);
            return;
          }
        } catch {
          // ignore
        }
        animationRef.current = requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch {
      toast.error("Camera unavailable");
      setScanning(false);
    }
  }, [hasBarcodeDetector, validateAndCheckIn]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track?.getCapabilities) return;
    const caps = track.getCapabilities() as { torch?: boolean };
    if (!caps.torch) {
      toast.message("Flash not supported on this device");
      return;
    }
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      toast.error("Could not toggle flash");
    }
  };

  const onGalleryPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !hasBarcodeDetector) {
      toast.error("Select an image with a QR code");
      return;
    }
    try {
      const bmp = await createImageBitmap(file);
      const detector = new (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector({
        formats: ["qr_code"],
      });
      const codes = await detector.detect(bmp);
      const qr = codes.find((c) => c.rawValue && UUID_REGEX.test(c.rawValue));
      if (qr?.rawValue) {
        await validateAndCheckIn(qr.rawValue);
      } else {
        toast.error("No ticket QR found in image");
      }
    } catch {
      toast.error("Could not read QR from image");
    }
  };

  useEffect(() => {
    if (!hasBarcodeDetector) return;
    void startCamera();
    return () => {
      processingQrRef.current = false;
      stopCamera();
    };
  }, [hasBarcodeDetector, startCamera, stopCamera]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] md:min-h-0">
      <div className="flex md:hidden items-center justify-between px-1 py-2 mb-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader>
              <SheetTitle>KanamEvents</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-3 mt-6 text-sm font-medium">
              <Link to="/organizer">Organizer</Link>
              <Link to="/events">Browse events</Link>
              <Link to="/organizer/check-in?tab=scan">Scanner</Link>
            </nav>
          </SheetContent>
        </Sheet>
        <span className="font-bold font-headline text-lg">KanamEvents</span>
        <Avatar className="h-9 w-9 ring-2 ring-primary/15">
          {user?.profilePictureUrl ? <AvatarImage src={user.profilePictureUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="relative flex-1 flex flex-col rounded-3xl overflow-hidden bg-[#3d1818] min-h-[480px] md:min-h-[520px]">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center rounded-full bg-white/95 text-foreground px-4 py-1.5 text-xs font-bold shadow-md">
            Scan ticket
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-8 pt-16">
          <div className="relative w-[min(100%,320px)] aspect-square">
            <div className="absolute inset-0 border-[3px] border-primary rounded-lg pointer-events-none z-10">
              <span className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <span className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <span className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <span className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
            {hasBarcodeDetector ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg bg-black"
                />
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/55">
                    <QrCode className="h-16 w-16 text-white/90" />
                    <p className="text-white/90 text-sm font-medium">Align QR code</p>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 rounded-lg bg-black/50">
                <QrCode className="h-16 w-16 text-white/90" />
                <p className="text-white/90 text-sm font-medium">Manual entry</p>
                <p className="text-white/60 text-xs text-center px-4">QR scanning needs Chrome on Android</p>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-20 mx-4 mt-auto mb-4 space-y-3">
          <div className="rounded-2xl bg-card border border-border/50 shadow-xl p-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void validateAndCheckIn(ticketIdInput);
              }}
            >
              <Input
                placeholder="Enter ticket ID manually"
                value={ticketIdInput}
                onChange={(e) => setTicketIdInput(e.target.value)}
                disabled={loading}
                className="rounded-xl font-mono text-sm flex-1 border-primary/20"
              />
              <Button type="submit" className="rounded-xl bg-gradient-primary px-4" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              </Button>
            </form>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl bg-primary/15 text-primary hover:bg-primary/15"
                onClick={() => void toggleTorch()}
                disabled={!scanning}
              >
                <Flashlight className="h-4 w-4 mr-2" />
                Flash
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl bg-primary/15 text-primary hover:bg-primary/15"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Gallery
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onGalleryPick}
              />
            </div>
          </div>

          {lastResult && (
            <div className="flex items-center gap-3 rounded-full bg-gradient-primary px-4 py-3 text-primary-foreground shadow-lg">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-tight">
                  {lastResult.alreadyCheckedIn ? "Already checked in" : "Validated"}
                </p>
                <p className="text-sm opacity-90 truncate">
                  {lastResult.attendeeName} · {lastResult.ticketName}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded-full shrink-0">
                Gate A
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="md:hidden flex justify-around items-center border-t border-border/60 bg-card/95 backdrop-blur py-2 mt-4 -mx-4 px-2 rounded-t-2xl">
        <Link to="/" className="flex flex-col items-center gap-1 py-2 text-muted-foreground text-[10px]">
          <Home className="h-5 w-5" />
          Home
        </Link>
        <Link to="/events" className="flex flex-col items-center gap-1 py-2 text-muted-foreground text-[10px]">
          <Search className="h-5 w-5" />
          Search
        </Link>
        <Link to="/orders" className="flex flex-col items-center gap-1 py-2 text-muted-foreground text-[10px]">
          <Ticket className="h-5 w-5" />
          Tickets
        </Link>
        <Link
          to="/organizer/check-in?tab=scan"
          className="flex flex-col items-center gap-1 py-2 text-primary text-[10px]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12">
            <LayoutGrid className="h-5 w-5" />
          </span>
          Admin
        </Link>
        <Link to="/profile" className="flex flex-col items-center gap-1 py-2 text-muted-foreground text-[10px]">
          <User className="h-5 w-5" />
          Profile
        </Link>
      </nav>
    </div>
  );
}
