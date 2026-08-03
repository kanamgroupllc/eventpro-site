export type UserRole = "ADMIN" | "ORGANIZER" | "USER";

export type VerificationStatus = "NOT_STARTED" | "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

/** Plan tier from pricing page: Basic (free), Pro, Enterprise. Used for feature gating. */
export type SubscriptionTier = "BASIC" | "PRO" | "ENTERPRISE";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  bio?: string;
  location?: string;
  role: UserRole;
  status: UserStatus;
  /** Plan tier for feature gating (add-ons, early payouts, custom domain, etc.). Defaults to BASIC. */
  subscriptionTier?: SubscriptionTier;
  /** White-label: custom logo URL (Pro/Enterprise). */
  brandingLogoUrl?: string | null;
  /** White-label: primary color hex (Pro/Enterprise). */
  brandingPrimaryColor?: string | null;
  /** White-label: hide platform branding on event pages (Pro/Enterprise). */
  brandingHidePlatform?: boolean;
  /** True when tax/ID and risk check passed; gates payouts for organizers. */
  isVerified?: boolean;
  /** KYC workflow: NOT_STARTED, PENDING, IN_PROGRESS, VERIFIED, REJECTED. */
  verificationStatus?: VerificationStatus;
  /** Reason for rejection when verificationStatus is REJECTED (from GET /users/me). */
  rejectionReason?: string | null;
  /** Risk level: LOW, MEDIUM, HIGH. */
  riskLevel?: RiskLevel;
  /** Organizer cultural niche / focus; feeds search taxonomy. */
  culturalNiche?: string;
  /** Set when payout (bank) account is connected via Stripe Connect. */
  stripeConnectAccountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Pre-set event page template: DEFAULT, MINIMAL, VIBRANT. All tiers. */
export type EventPageTemplate = "DEFAULT" | "MINIMAL" | "VIBRANT";

export interface Event {
  id: string;
  name: string;
  /** Some endpoints may return title instead of name; card displays name || title. */
  title?: string;
  description?: string;
  imageUrl?: string;
  /** Additional images for gallery (primary is imageUrl). */
  additionalImageUrls?: string[] | null;
  /** Optional YouTube/Vimeo URL for promotional video on event detail page. */
  promotionalVideoUrl?: string;
  /** Event page template for theming. Defaults to DEFAULT. */
  eventPageTemplate?: EventPageTemplate | string;
  marketingEnabled?: boolean;
  /** Pro/Enterprise: optional donation at checkout. */
  donationsEnabled?: boolean;
  /** Pro/Enterprise: custom domain hostname. */
  customDomain?: string | null;
  /** Pro/Enterprise: when true, event has seat map; sell by specific seat. */
  reservedSeatingEnabled?: boolean;
  /** White-label: organizer logo URL for event page. */
  organizerBrandingLogoUrl?: string | null;
  /** White-label: organizer primary color for event page. */
  organizerBrandingPrimaryColor?: string | null;
  /** White-label: hide platform branding on this event page. */
  organizerBrandingHidePlatform?: boolean;
  /** Organizer display (event detail). */
  organizerFirstName?: string | null;
  organizerLastName?: string | null;
  organizerProfilePictureUrl?: string | null;
  startTime: string;
  endTime: string;
  userId?: string;
  categoryId?: string;
  categoryName?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressZipCode?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  // Computed fields for compatibility
  startDateTime?: string;
  endDateTime?: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  organizerId?: string;
  venue?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface EventAddon {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  sizes?: string[];
  isPopular?: boolean;
  displayOrder?: number;
}

/** Seat in reserved-seating map (from GET /events/{id}/seats). */
export interface SeatResponse {
  id: string;
  section: string;
  row: string;
  seatNumber: number;
  price: number;
  status: string; // AVAILABLE, RESERVED, SOLD
}

/** Section spec for creating a seat map (Pro/Enterprise). */
export interface SeatSectionDto {
  name: string;
  rowCount: number;
  seatsPerRow: number;
  price: number;
}

export interface CreateSeatMapRequest {
  sections: SeatSectionDto[];
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  saleStartDate?: string;
  saleEndDate?: string;
  status: "ACTIVE" | "INACTIVE" | "SOLD_OUT";
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  ticketTypeId: string;
  status: "ACTIVE" | "USED" | "CANCELLED" | "REFUNDED";
  purchasePrice: number;
  qrCode?: string;
  purchaseDate: string;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  taxAmount?: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  createdAt: string;
  tickets: Ticket[];
}

/** Subtotal, tax, and total for checkout. Use total for payment intent when tax is enabled. */
export interface CheckoutTotals {
  subtotal: number;
  taxRatePercent: number;
  tax: number;
  total: number;
}

/** Result of a door check-in (QR scan). */
export interface CheckInResult {
  ticketName: string;
  attendeeName: string;
  alreadyCheckedIn: boolean;
}

/** Attendee row from organizer event attendees list. */
export interface Attendee {
  ticketId: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  ticketType?: string;
  ticketPrice?: number;
  purchaseDate?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

/** Team member on organizer's team (Pro/Enterprise). */
export interface TeamMember {
  id: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: string;
}

export type TicketTypeEnum = "VIP" | "REGULAR" | "EARLY_BIRD";
export type TicketStatusEnum = "AVAILABLE" | "SOLD" | "RESERVED" | "USED" | "CANCELLED" | "REFUNDED";

export interface CartItem {
  ticketTypeId: string;
  quantity: number;
}

export interface CartItemResponse {
  kind?: "GENERAL_ADMISSION" | "SEAT";
  id: string;
  ticketId?: string;
  eventId?: string;
  name: string;
  ticketType: TicketTypeEnum;
  ticketStatus: TicketStatusEnum;
  price: number;
  unitPrice?: number;
  startTime?: string;
  endTime?: string;
  eventIdType?: string;
  quantity: number;
  expiresAt?: string;
}

export interface CartResponse {
  id: string;
  tickets: CartItemResponse[];
  quantity: number;
  totalCost: number;
  /** When the cart reservation expires (ISO-8601). For countdown. */
  reservedUntil?: string;
  expiresAt?: string;
  serverTime?: string;
  message?: string;
}

export interface CheckoutSession {
  id: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "PAYMENT_FAILED" | "REFUND_PENDING" | "REFUNDED";
  expiresAt: string;
  serverTime: string;
  subtotal: number;
  addonAmount: number;
  donationAmount: number;
  taxAmount: number;
  totalAmount: number;
  walletAmount: number;
  currency: string;
  clientSecret?: string;
  resumeToken?: string;
  checkoutUrl?: string;
  orderId?: string;
}

export interface AddToCartRequest {
  id?: string;
  eventIdType?: string;
  ticketType?: TicketTypeEnum;
  quantity: number;
}

export interface UpdateCartRequest {
  quantity: number;
}

/** Paginated response from admin/list endpoints (e.g. getUsers). */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
}

/** In-app notification for the current user. */
/** Organizer in the current user's Following list. */
export interface FollowedOrganizer {
  organizerId: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

export interface UserNotification {
  id: string;
  notificationId: string;
  title: string;
  message: string;
  type: string;
  status: "UNREAD" | "READ";
  readAt: string | null;
  createdAt: string;
}

/** Notification channel preferences (email, SMS, in-app). */
export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
  recaptchaToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  profilePictureUrl?: string;
  culturalNiche?: string;
  /** White-label: custom logo URL (Pro/Enterprise). */
  brandingLogoUrl?: string | null;
  /** White-label: primary color hex (Pro/Enterprise). */
  brandingPrimaryColor?: string | null;
  /** White-label: hide platform branding on event pages (Pro/Enterprise). */
  brandingHidePlatform?: boolean;
}

/** Payout options by tier and risk (T+2, 50% early, 100% instant). */
export interface PayoutEligibility {
  standardT2: boolean;
  early50Percent: boolean;
  instant100: boolean;
  label: string;
}

/** Organizer dashboard summary for Profile "Your Impact" and Organizer page. */
export interface OrganizerSummary {
  eventsHosted: number;
  ticketsSold: number;
  ticketsSoldTrendPercent: number | null;
  totalRevenue: number;
  /** Platform fees withheld (tier-based). */
  platformFeesWithheld?: number;
  /** e.g. "2.9% + $0.79 per ticket (Pro)". */
  platformFeeRateLabel?: string;
  availableBalance: number;
  pendingBalance: number;
  /** Hold window in days; revenue from last N days is "pending". */
  pendingHoldDays?: number;
  riskFlagged: boolean;
  riskLevel?: RiskLevel;
  /** True when W-9 submitted for 1099-K. */
  w9Submitted?: boolean;
  /** Payout options available (tier + risk). */
  payoutEligibility?: PayoutEligibility;
}

/** One tax form row for Document Vault. */
export interface TaxFormEntry {
  year: string;
  formType: string;
  status: "Available" | "Generating";
  downloadUrl?: string | null;
}

export interface SubmitW9Request {
  legalName: string;
  businessName?: string;
  tinType: "SSN" | "EIN";
  tin: string;
  signatureAcknowledged?: boolean;
}

export interface VerificationStatusResponse {
  verificationStatus: VerificationStatus;
  riskLevel: RiskLevel;
  canResubmit: boolean;
  lastSubmittedAt: string | null;
  /** Reason for rejection when status is REJECTED (e.g. "Address doesn't match ID"). */
  lastRejectionReason?: string | null;
}

export interface SubmitVerificationRequest {
  legalEntityType: "INDIVIDUAL" | "BUSINESS";
  /** Last 4 digits of SSN for individuals (1099-K). */
  ssnLast4?: string;
  /** EIN for businesses. */
  ein?: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  idSessionId?: string;
  idProvider?: string;
}

/** API key (Enterprise). Key value only returned on create. */
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
}

/** Response when creating an API key (key shown once). */
export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
}

/** Admin audit feed row (append-only platform_audit_events + mapped fields). */
export interface AuditActivity {
  id: string;
  occurredAt: string;
  actor: string;
  actorInitials: string;
  action: string;
  actionDanger?: boolean;
  entity: string;
  status: string;
  statusTone: string;
  ip?: string;
  category: string;
  body: string;
}

/** Paginated audit list (indexed DB query). */
export interface AuditActivityPage {
  content: AuditActivity[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** JVM + DB ping for admin system health. */
export interface SystemStatus {
  overallStatus: string;
  databaseStatus: string;
  heapUsedMb: number;
  heapMaxMb: number;
  heapUsagePercent: number;
  javaVersion: string;
  osName: string;
}

export interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  userGrowth: number;
  eventGrowth: number;
  ticketGrowth: number;
  revenueGrowth: number;
  /** Platform-wide counts by role (from backend aggregation). */
  usersAttendeeCount?: number;
  usersOrganizerCount?: number;
  usersAdminCount?: number;
}

export interface EventSales {
  eventId: string;
  eventName: string;
  ticketsSold: number;
  revenue: number;
  availableTickets: number;
  totalTickets: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  ticketsSold: number;
}

/** Pending KYC submission for admin review. */
export interface PendingVerification {
  id: string;
  userId: string;
  email: string;
  legalEntityType: string;
  addressCity: string;
  addressState: string;
  submittedAt: string;
  status: string;
}

/** Request to record a Pro/Enterprise subscription payment (admin). */
export interface RecordSubscriptionPaymentRequest {
  userId: string;
  amount: number;
  tier?: "PRO" | "ENTERPRISE";
  period?: "MONTHLY" | "YEARLY";
}

/** Request to create a Stripe payment intent (amount in dollars). */
export interface CreatePaymentIntentRequest {
  amount: number;
}

/** Electric Wallet balance for authenticated users. */
export interface WalletBalance {
  balance: number;
  currency: string;
}

/** One row in the Electric Wallet ledger. */
export interface WalletLedgerEntry {
  id: string;
  amount: number;
  entryType: "CREDIT" | "DEBIT";
  referenceType: string;
  referenceId?: string;
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

/** Guest checkout: confirm payment and create order (no account). */
export interface GuestConfirmPaymentRequest {
  paymentIntentId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  items: { eventId: string; ticketType: string; quantity: number }[];
  totalAmount: number;
  /** Optional donation amount (included in total). Pro/Enterprise events with donations enabled. */
  donationAmount?: number;
  /** Ticket IDs from guest-reserve (lock). Send when you called guest-reserve before payment. */
  reservedTicketIds?: string[];
  /** Optional: attribution for discovery / cultural taxonomy. */
  howDidYouHear?: string;
  /** Optional: send ticket via WhatsApp. */
  receiveTicketViaWhatsApp?: boolean;
  /** Optional: send ticket via SMS. */
  receiveTicketViaSMS?: boolean;
  /** Optional: phone number for SMS / WhatsApp ticket delivery. */
  phone?: string;
  /** Optional: buyer state (e.g. CA, NY) for sales tax. */
  state?: string;
  /** Optional: buyer country (e.g. US). */
  country?: string;
  /** Optional: tax amount when state/country was used at checkout. */
  taxAmount?: number;
  recaptchaToken?: string;
}

/** Options for "How did you hear about this event?" (cultural taxonomy). */
export const HOW_DID_YOU_HEAR_OPTIONS = [
  { value: "social_media", label: "Social media" },
  { value: "friend_family", label: "Friend or family" },
  { value: "search", label: "Search / Google" },
  { value: "community", label: "Community group" },
  { value: "email", label: "Email / newsletter" },
  { value: "event_listing", label: "Event listing site" },
  { value: "other", label: "Other" },
] as const;

/** One row in the live ticket sales feed. */
export interface RecentSale {
  orderId: string;
  buyerName: string;
  quantity: number;
  ticketTypeName: string;
  eventName: string;
  soldAt: string;
}

/** Sales velocity pulse for an event. */
export interface EventPulse {
  eventId: string;
  eventName: string;
  velocity: "trending_up" | "steady" | "slowing";
  percentChange: number | null;
  label: string;
}

/** Top cultural interest (category) for donut. */
export interface CulturalInterest {
  name: string;
  count: number;
}

/** AI insights payload for Command Center. */
export interface OrganizerInsights {
  aiInsight: string;
  eventPulses: EventPulse[];
  topCulturalInterests: CulturalInterest[];
}
