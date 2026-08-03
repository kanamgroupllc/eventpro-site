import type { NavigatorScreenParams } from "@react-navigation/native";
import type { EventProApi, User } from "@eventpro/shared";

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Verify: undefined;
  ResetPassword: { token?: string } | undefined;
};

/** Reserved seating picker (Stitch). */
export type SelectSeatsRouteParams = {
  eventId: string;
  eventName?: string;
  imageUrl?: string;
  startTime?: string;
};

export type DiscoverStackParamList = {
  Home: undefined;
  EventsList: { organizerId?: string; initialQuery?: string } | undefined;
  EventDetail: { eventId: string };
  SelectTickets: { eventId: string };
  SelectSeats: SelectSeatsRouteParams;
  Checkout: { eventId?: string };
  TikTokShareTemplate:
    | { eventName?: string; venue?: string; dateLabel?: string; doors?: string }
    | undefined;
  TikTokShareSave: undefined;
};

/** Search tab — browse / filter events (Stitch bottom nav). */
export type SearchStackParamList = {
  SearchHome: { stitchSearchUi?: boolean } | undefined;
  EventDetail: { eventId: string };
  SelectTickets: { eventId: string };
  SelectSeats: SelectSeatsRouteParams;
  Checkout: { eventId?: string };
  TikTokShareTemplate:
    | { eventName?: string; venue?: string; dateLabel?: string; doors?: string }
    | undefined;
  TikTokShareSave: undefined;
};

/** Stitch payment / refund confirmation (Tickets tab). */
export type PaymentStatusRouteParams = {
  outcome?: "failed" | "success";
  eventTitle?: string;
  ticketLine?: string;
  totalFormatted?: string;
};

export type RefundSuccessRouteParams = {
  amountFormatted?: string;
  recipientName?: string;
  transactionId?: string;
  timestampLabel?: string;
  paymentMethodLabel?: string;
};

/** Tickets tab — orders & digital tickets (Stitch bottom nav). */
export type TicketsStackParamList = {
  TicketsHome: undefined;
  MyWallet: undefined;
  OrderDetail: { orderId: string; eventName?: string };
  PaymentStatus: PaymentStatusRouteParams | undefined;
  RefundSuccess: RefundSuccessRouteParams | undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileEdit: undefined;
  Settings: undefined;
  Notifications: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string; eventName?: string };
  Following: undefined;
  Pricing: undefined;
  Privacy: undefined;
  HelpCenter: undefined;
  LiveChatSupport: undefined;
};

export type OrganizerStackParamList = {
  OrganizerDashboard: undefined;
  OrganizerEventInsights: undefined;
  OrganizerEventDetail: { eventId: string };
  EventTickets: { eventId: string };
  EventEnhancements: { eventId: string };
  CheckIn: { eventId?: string; scannedTicketId?: string };
  QRScanner: { eventId?: string };
  /** Optional eventId — when omitted, pick an event with reserved seating enabled */
  SeatMapEditor: { eventId?: string } | undefined;
  CreateEventWizard: undefined;
};

export type AdminStackParamList = {
  AdminOverview: undefined;
  AdminStats: undefined;
  AdminUsers: undefined;
  AdminVerification: undefined;
  AdminEvents: undefined;
  AdminEventSales: undefined;
  AdminRevenue: undefined;
  AdminSubscriptionPayments: undefined;
  AdminSystemHealth: undefined;
  SystemMaintenance: undefined;
  SupportAgentWorkspace: undefined;
  SupportAnalytics: undefined;
  TicketDetailAgent: undefined;
  UserRolesManagement: undefined;
};

export type MainTabParamList = {
  Discover: NavigatorScreenParams<DiscoverStackParamList> | undefined;
  Search: NavigatorScreenParams<SearchStackParamList> | undefined;
  Tickets: NavigatorScreenParams<TicketsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  Organizer: NavigatorScreenParams<OrganizerStackParamList> | undefined;
  Admin: NavigatorScreenParams<AdminStackParamList> | undefined;
};
