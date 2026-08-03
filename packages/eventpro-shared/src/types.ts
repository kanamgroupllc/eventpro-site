/**
 * EventPro API types – single source of truth for web and mobile.
 * Keep in sync with backend DTOs and eventpro-frontend usage.
 */

export type UserRole = "ADMIN" | "ORGANIZER" | "USER";
export type VerificationStatus = "NOT_STARTED" | "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
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
  subscriptionTier?: SubscriptionTier;
  brandingLogoUrl?: string | null;
  brandingPrimaryColor?: string | null;
  brandingHidePlatform?: boolean;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  /** Reason for rejection when verificationStatus is REJECTED. */
  rejectionReason?: string | null;
  riskLevel?: RiskLevel;
  culturalNiche?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventPageTemplate = "DEFAULT" | "MINIMAL" | "VIBRANT";

export interface Event {
  id: string;
  name: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  additionalImageUrls?: string[] | null;
  promotionalVideoUrl?: string;
  eventPageTemplate?: EventPageTemplate | string;
  marketingEnabled?: boolean;
  donationsEnabled?: boolean;
  customDomain?: string | null;
  reservedSeatingEnabled?: boolean;
  organizerBrandingLogoUrl?: string | null;
  organizerBrandingPrimaryColor?: string | null;
  organizerBrandingHidePlatform?: boolean;
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
  startDateTime?: string;
  endDateTime?: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  organizerId?: string;
  venue?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Organizer in the current user's Following list. */
export interface FollowedOrganizer {
  organizerId: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
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

export interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken?: string;
}

/** Result of a door check-in (QR scan). */
export interface CheckInResult {
  ticketName: string;
  attendeeName: string;
  alreadyCheckedIn: boolean;
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

export interface SeatResponse {
  id: string;
  section: string;
  row: string;
  seatNumber: number;
  price: number;
  status: string;
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

export interface OrganizerSummary {
  eventsHosted: number;
  ticketsSold: number;
  ticketsSoldTrendPercent: number | null;
  totalRevenue: number;
  platformFeesWithheld?: number;
  platformFeeRateLabel?: string;
  availableBalance: number;
  pendingBalance: number;
  pendingHoldDays?: number;
  riskFlagged: boolean;
  riskLevel?: RiskLevel;
  w9Submitted?: boolean;
  payoutEligibility?: { standardT2: boolean; early50Percent: boolean; instant100: boolean; label: string };
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

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  profilePictureUrl?: string;
  culturalNiche?: string;
  brandingLogoUrl?: string | null;
  brandingPrimaryColor?: string | null;
  brandingHidePlatform?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
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

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export type TicketTypeEnum = "VIP" | "REGULAR" | "EARLY_BIRD";
export type TicketStatusEnum = "AVAILABLE" | "SOLD" | "RESERVED" | "USED" | "CANCELLED" | "REFUNDED";

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

export interface TicketResponse {
  id: string;
  name?: string;
  ticketType?: TicketTypeEnum | string;
  ticketStatus?: TicketStatusEnum | string;
  price?: number;
  qrCode?: string;
  eventIdType?: string;
}

export interface OrderItemResponse {
  id?: string;
  quantity: number;
  price?: number;
  ticket?: TicketResponse;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  taxAmount?: number;
  status: string;
  createdAt: string;
  /** Legacy flat ticket list. */
  tickets?: unknown[];
  /** Backend order line items with nested ticket (includes qrCode). */
  orderItems?: OrderItemResponse[];
}

export interface CheckoutTotals {
  subtotal: number;
  taxRatePercent: number;
  tax: number;
  total: number;
}

export interface GuestConfirmPaymentRequest {
  paymentIntentId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  items: { eventId: string; ticketType: string; quantity: number }[];
  totalAmount: number;
  donationAmount?: number;
  reservedTicketIds?: string[];
  howDidYouHear?: string;
  receiveTicketViaWhatsApp?: boolean;
  receiveTicketViaSMS?: boolean;
  phone?: string;
  state?: string;
  country?: string;
  taxAmount?: number;
  recaptchaToken?: string;
}

export interface VerificationStatusResponse {
  verificationStatus: VerificationStatus;
  riskLevel: RiskLevel;
  canResubmit: boolean;
  lastSubmittedAt: string | null;
  lastRejectionReason?: string | null;
}

export interface SubmitVerificationRequest {
  legalEntityType: "INDIVIDUAL" | "BUSINESS";
  ssnLast4?: string;
  ein?: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  idSessionId?: string;
  idProvider?: string;
}

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

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
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

export interface RecordSubscriptionPaymentRequest {
  userId: string;
  amount: number;
  tier?: "PRO" | "ENTERPRISE";
  period?: "MONTHLY" | "YEARLY";
}

export interface RecentSale {
  orderId: string;
  buyerName: string;
  quantity: number;
  ticketTypeName: string;
  eventName: string;
  soldAt: string;
}

export interface EventPulse {
  eventId: string;
  eventName: string;
  velocity: "trending_up" | "steady" | "slowing";
  percentChange: number | null;
  label: string;
}

export interface CulturalInterest {
  name: string;
  count: number;
}

export interface OrganizerInsights {
  aiInsight: string;
  eventPulses: EventPulse[];
  topCulturalInterests: CulturalInterest[];
}

export interface TeamMember {
  id: string;
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: string;
}

export interface CreateSeatMapRequest {
  sections: { name: string; rowCount: number; seatsPerRow: number; price: number }[];
}
