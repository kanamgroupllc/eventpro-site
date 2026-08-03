/**
 * EventPro API client factory – works in web (Vite) and mobile (Expo).
 * Full parity with web api.ts for mobile feature parity.
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import type {
  ApiResponse,
  AddToCartRequest,
  AdminStats,
  Attendee,
  AuthResponse,
  CartResponse,
  CheckInResult,
  CheckoutTotals,
  CheckoutSession,
  CreateSeatMapRequest,
  Event,
  EventAddon,
  EventSales,
  FollowedOrganizer,
  GuestConfirmPaymentRequest,
  LoginRequest,
  NotificationPreferences,
  Order,
  OrganizerInsights,
  OrganizerSummary,
  PageResponse,
  PendingVerification,
  RecentSale,
  RecordSubscriptionPaymentRequest,
  RevenueData,
  SeatResponse,
  SignUpRequest,
  TeamMember,
  TicketType,
  TicketTypeEnum,
  UpdateCartRequest,
  UpdateUserRequest,
  User,
  UserNotification,
  VerificationStatusResponse,
  SubmitVerificationRequest,
} from "./types";

export interface EventProApiConfig {
  baseURL: string;
  clientType?: "mobile";
  getAccessToken: () => string | null | Promise<string | null>;
  setAccessToken: (token: string) => void | Promise<void>;
  removeAccessToken: () => void | Promise<void>;
  onUnauthorized?: () => void;
}

export interface EventProApi {
  // Auth
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  signUp: (data: SignUpRequest) => Promise<void>;
  getCurrentUser: () => Promise<User>;
  updateUser: (data: UpdateUserRequest) => Promise<User>;
  uploadProfilePicture: (file: File | { uri: string; type?: string; name?: string }) => Promise<string>;
  removeAccessToken: () => void | Promise<void>;

  // Public events
  getEvents: (page?: number, size?: number, keyword?: string, organizerId?: string) => Promise<Event[]>;
  getEventsByCategory: (category: string) => Promise<Event[]>;
  getEvent: (id: string) => Promise<Event>;
  contactOrganizer: (eventId: string, body: { senderEmail: string; senderName?: string; message: string }) => Promise<void>;
  getTicketTypes: (eventId: string) => Promise<TicketType[]>;
  getEventAddons: (eventId: string) => Promise<EventAddon[]>;

  // Cart
  getCart: () => Promise<CartResponse>;
  addToCart: (data: AddToCartRequest) => Promise<CartResponse>;
  importCart: (items: Array<{ eventId: string; ticketType?: TicketTypeEnum; ticketId?: string; quantity: number }>) => Promise<CartResponse>;
  addGeneralAdmission: (eventId: string, ticketType: TicketTypeEnum, quantity: number) => Promise<CartResponse>;
  setGeneralAdmission: (eventId: string, ticketType: TicketTypeEnum, quantity: number) => Promise<CartResponse>;
  removeGeneralAdmission: (eventId: string, ticketType: TicketTypeEnum) => Promise<CartResponse>;
  addSeat: (ticketId: string) => Promise<CartResponse>;
  removeSeat: (ticketId: string) => Promise<CartResponse>;
  updateCartItem: (ticketId: string, data: UpdateCartRequest) => Promise<CartResponse>;
  removeFromCart: (ticketId: string) => Promise<CartResponse>;
  clearCart: () => Promise<void>;

  // Orders & payments
  getOrders: (page?: number, size?: number) => Promise<Order[]>;
  getOrder: (id: string) => Promise<Order>;
  getPaymentConfig: () => Promise<{ stripePublishableKey: string }>;
  getCheckoutTotals: (subtotal?: number, state?: string, country?: string) => Promise<CheckoutTotals>;
  createPaymentIntent: (amount: number, recaptchaToken?: string) => Promise<{ clientSecret: string }>;
  guestReserve: (
    items: { eventId: string; ticketType: string; quantity: number }[],
    recaptchaToken?: string
  ) => Promise<{ reservedTicketIds: string[]; reservedUntil: string }>;
  confirmGuestPayment: (body: GuestConfirmPaymentRequest) => Promise<Order>;
  confirmPayment: (paymentIntentId: string, state?: string, country?: string) => Promise<Order>;
  createCheckoutSession: (body: {
    idempotencyKey: string;
    items?: { eventId: string; ticketType: string; quantity: number }[];
    email?: string; firstName?: string; lastName?: string; state?: string; country?: string;
    donationAmount?: number; walletAmount?: number;
    addOns?: { id: string; quantity: number; size?: string }[];
  }) => Promise<CheckoutSession>;
  resumeCheckoutSession: (token: string) => Promise<CheckoutSession>;
  finalizeCheckoutSession: (id: string, paymentIntentId?: string, resumeToken?: string) => Promise<CheckoutSession>;
  cancelCheckoutSession: (id: string, resumeToken?: string) => Promise<CheckoutSession>;

  // Subscription (user)
  createSubscriptionCheckoutSession: (params: { tier: "PRO" | "ENTERPRISE"; period?: "MONTHLY" | "YEARLY"; successUrl: string; cancelUrl: string }) => Promise<{ url: string }>;
  syncSubscriptionFromStripe: () => Promise<{ user: User; message: string }>;

  // Notifications (user)
  getMyNotifications: (page?: number, size?: number) => Promise<PageResponse<UserNotification>>;
  markNotificationRead: (id: string) => Promise<void>;
  getMyNotificationPreferences: () => Promise<NotificationPreferences>;
  updateMyNotificationPreferences: (data: { emailEnabled?: boolean; smsEnabled?: boolean; pushEnabled?: boolean }) => Promise<NotificationPreferences>;

  // Organizer
  getFollowing: () => Promise<FollowedOrganizer[]>;
  followOrganizer: (organizerId: string) => Promise<void>;
  unfollowOrganizer: (organizerId: string) => Promise<void>;
  getOrganizerSummary: () => Promise<OrganizerSummary>;
  getOrganizerEvents: () => Promise<Event[]>;
  publishEvent: (eventId: string) => Promise<Event>;
  checkInTicket: (ticketId: string) => Promise<CheckInResult>;
  getEventAttendees: (eventId: string) => Promise<Attendee[]>;
  getOrganizerRecentSales: (limit?: number) => Promise<RecentSale[]>;
  getOrganizerInsights: () => Promise<OrganizerInsights>;
  requestPayout: (amount: number) => Promise<{ id: string; amount: number; status: string }>;
  /** Public: seat map for an event (empty if not reserved seating). */
  getEventSeats: (eventId: string) => Promise<SeatResponse[]>;
  /** Pro/Enterprise: create seat map from section specs. */
  createEventSeatMap: (eventId: string, body: CreateSeatMapRequest) => Promise<{ seatsCreated: number }>;

  // Organizer verification & tax
  getVerificationStatus: () => Promise<VerificationStatusResponse>;
  submitVerification: (data: SubmitVerificationRequest) => Promise<void>;

  // Team (Pro/Enterprise)
  listTeamMembers: () => Promise<TeamMember[]>;
  inviteTeamMember: (email: string, role: "ADMIN" | "EDITOR" | "VIEWER") => Promise<TeamMember>;
  removeTeamMember: (userId: string) => Promise<void>;
  updateTeamMemberRole: (userId: string, role: "ADMIN" | "EDITOR" | "VIEWER") => Promise<TeamMember>;

  // Admin
  getStats: () => Promise<AdminStats>;
  getUsersPage: (page?: number, size?: number) => Promise<PageResponse<User>>;
  getVerificationPending: (limit?: number) => Promise<PendingVerification[]>;
  approveVerification: (submissionId: string) => Promise<void>;
  rejectVerification: (submissionId: string, reason?: string) => Promise<void>;
  getEventSales: () => Promise<EventSales[]>;
  getRevenue: (period?: string) => Promise<RevenueData[]>;
  getEventsPage: (page?: number, size?: number) => Promise<PageResponse<Event>>;
  updateEventStatus: (eventId: string, status: string) => Promise<Event>;
  recordSubscriptionPayment: (body: RecordSubscriptionPaymentRequest) => Promise<{ id: string }>;
}

function isPromise<T>(v: T | Promise<T>): v is Promise<T> {
  return typeof (v as Promise<T>)?.then === "function";
}

let correlationId: string | null = null;

function getOrCreateCorrelationId(): string {
  if (!correlationId) {
    correlationId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `corr-${Date.now()}`;
  }
  return correlationId;
}

export function createEventProApi(config: EventProApiConfig): EventProApi {
  const api: AxiosInstance = axios.create({
    baseURL: config.baseURL,
    headers: { "Content-Type": "application/json" },
  });

  api.interceptors.request.use(
    async (req: InternalAxiosRequestConfig) => {
      req.headers["X-Correlation-Id"] = getOrCreateCorrelationId();
      if (config.clientType === "mobile") {
        req.headers["X-EventPro-Client"] = "mobile";
      }
      const token = config.getAccessToken();
      const t = isPromise(token) ? await token : token;
      if (t) req.headers.Authorization = `Bearer ${t}`;
      return req;
    },
    (err: AxiosError) => Promise.reject(err)
  );

  api.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      if (err.response?.status === 401 && config.onUnauthorized) {
        const remove = config.removeAccessToken();
        if (isPromise(remove)) await remove;
        config.onUnauthorized();
      }
      return Promise.reject(err);
    }
  );

  const getData = <T>(r: { data: ApiResponse<T> }): T => r.data.data;

  return {
    async login(credentials: LoginRequest) {
      const res = await api.post<ApiResponse<AuthResponse>>("/api/v1/auth/login", credentials);
      const data = res.data.data;
      const set = config.setAccessToken(data.accessToken);
      if (isPromise(set)) await set;
      return data;
    },
    async signUp(data: SignUpRequest) {
      await api.post("/api/v1/auth/signup", data);
    },
    async getCurrentUser() {
      return getData(await api.get<ApiResponse<User>>("/api/v1/users/me"));
    },
    async updateUser(data: UpdateUserRequest) {
      return getData(await api.put<ApiResponse<User>>("/api/v1/users/me", data));
    },
    async uploadProfilePicture(file: File | { uri: string; type?: string; name?: string }) {
      const formData = new FormData();
      formData.append("image", file as any);
      const res = await api.post<ApiResponse<{ url: string }>>("/api/v1/users/upload-profile-picture", formData);
      return res.data.data?.url ?? "";
    },
    async getFollowing() {
      const res = await api.get<ApiResponse<FollowedOrganizer[]>>("/api/v1/users/me/following");
      return res.data.data ?? [];
    },
    async followOrganizer(organizerId: string) {
      await api.post<ApiResponse<null>>(`/api/v1/users/me/following/${organizerId}`);
    },
    async unfollowOrganizer(organizerId: string) {
      await api.delete<ApiResponse<null>>(`/api/v1/users/me/following/${organizerId}`);
    },
    async removeAccessToken() {
      const remove = config.removeAccessToken();
      if (isPromise(remove)) await remove;
    },

    async getEvents(page = 1, size = 20, keyword?: string, organizerId?: string) {
      const q = [`page=${page}`, `size=${size}`];
      if (keyword != null && keyword !== "") q.push(`keyword=${encodeURIComponent(keyword)}`);
      if (organizerId != null && organizerId !== "") q.push(`organizerId=${encodeURIComponent(organizerId)}`);
      const query = q.join("&");
      const res = await api.get<ApiResponse<{ content: Event[] }>>(`/api/v1/events?${query}`);
      return res.data.data?.content ?? [];
    },
    async getEventsByCategory(category: string) {
      const res = await api.get<ApiResponse<Event[]>>(`/api/v1/events/category/${category}`);
      return res.data.data ?? [];
    },
    async getEvent(id: string) {
      return getData(await api.get<ApiResponse<Event>>(`/api/v1/events/${id}`));
    },
    async contactOrganizer(eventId: string, body: { senderEmail: string; senderName?: string; message: string }) {
      await api.post<ApiResponse<null>>(`/api/v1/events/${eventId}/contact`, body);
    },
    async getTicketTypes(eventId: string) {
      const res = await api.get<ApiResponse<TicketType[]>>(`/api/v1/events/${eventId}/ticket-types`);
      return res.data.data ?? [];
    },
    async getEventAddons(eventId: string) {
      const res = await api.get<ApiResponse<EventAddon[]>>(`/api/v1/events/${eventId}/addons`);
      return res.data.data ?? [];
    },

    async getCart() {
      return getData(await api.get<ApiResponse<CartResponse>>("/api/v1/cart"));
    },
    async addToCart(data: AddToCartRequest) {
      return getData(await api.post<ApiResponse<CartResponse>>("/api/v1/cart/add", data));
    },
    async importCart(items) {
      return getData(await api.post<ApiResponse<CartResponse>>("/api/v1/cart/import", { items }));
    },
    async addGeneralAdmission(eventId, ticketType, quantity) {
      return getData(await api.post<ApiResponse<CartResponse>>(`/api/v1/cart/general-admission/${eventId}/${ticketType}`, { quantity }));
    },
    async setGeneralAdmission(eventId, ticketType, quantity) {
      return getData(await api.put<ApiResponse<CartResponse>>(`/api/v1/cart/general-admission/${eventId}/${ticketType}`, { quantity }));
    },
    async removeGeneralAdmission(eventId, ticketType) {
      return getData(await api.delete<ApiResponse<CartResponse>>(`/api/v1/cart/general-admission/${eventId}/${ticketType}`));
    },
    async addSeat(ticketId) {
      return getData(await api.post<ApiResponse<CartResponse>>(`/api/v1/cart/seats/${ticketId}`));
    },
    async removeSeat(ticketId) {
      return getData(await api.delete<ApiResponse<CartResponse>>(`/api/v1/cart/seats/${ticketId}`));
    },
    async updateCartItem(ticketId: string, data: UpdateCartRequest) {
      return getData(await api.patch<ApiResponse<CartResponse>>(`/api/v1/cart/update/${ticketId}`, data));
    },
    async removeFromCart(ticketId: string) {
      return getData(await api.delete<ApiResponse<CartResponse>>(`/api/v1/cart/delete/${ticketId}`));
    },
    async clearCart() {
      await api.delete("/api/v1/cart/clear");
    },

    async getOrders(page = 1, size = 50) {
      const res = await api.get<ApiResponse<{ content: Order[] } | Order[]>>(`/api/v1/orders?page=${page}&size=${size}`);
      const data = res.data.data;
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && Array.isArray(data.content)) return data.content;
      return [];
    },
    async getOrder(id: string) {
      return getData(await api.get<ApiResponse<Order>>(`/api/v1/orders/${id}`));
    },
    async getPaymentConfig() {
      const res = await api.get<ApiResponse<{ stripePublishableKey: string }>>("/api/v1/payments/config");
      return res.data.data ?? { stripePublishableKey: "" };
    },
    async getCheckoutTotals(subtotal?: number, state?: string, country?: string) {
      const params: Record<string, string | number> = {};
      if (subtotal != null && subtotal >= 0) params.subtotal = subtotal;
      if (state?.trim()) params.state = state.trim();
      if (country?.trim()) params.country = country.trim();
      const res = await api.get<ApiResponse<CheckoutTotals>>("/api/v1/payments/checkout-totals", { params });
      return res.data.data!;
    },
    async createPaymentIntent(amount: number, recaptchaToken?: string) {
      const res = await api.post<ApiResponse<{ clientSecret: string }>>("/api/v1/payments/create-intent", {
        amount: Number(amount.toFixed(2)),
        recaptchaToken,
      });
      return res.data.data!;
    },
    async guestReserve(
      items: { eventId: string; ticketType: string; quantity: number }[],
      recaptchaToken?: string
    ) {
      const res = await api.post<ApiResponse<{ reservedTicketIds: string[]; reservedUntil: string }>>(
        "/api/v1/payments/guest-reserve",
        { items, recaptchaToken }
      );
      return res.data.data!;
    },
    async confirmGuestPayment(body: GuestConfirmPaymentRequest) {
      return getData(await api.post<ApiResponse<Order>>("/api/v1/payments/guest/confirm", body));
    },
    async confirmPayment(paymentIntentId: string, state?: string, country?: string) {
      const body: { paymentIntentId: string; state?: string; country?: string } = { paymentIntentId };
      if (state?.trim()) body.state = state.trim();
      if (country?.trim()) body.country = country.trim();
      return getData(await api.post<ApiResponse<Order>>("/api/v1/payments/confirm", body));
    },
    async createCheckoutSession(body) {
      return getData(await api.post<ApiResponse<CheckoutSession>>("/api/v1/checkout-sessions", body));
    },
    async resumeCheckoutSession(token: string) {
      return getData(await api.get<ApiResponse<CheckoutSession>>(`/api/v1/checkout-sessions/resume/${encodeURIComponent(token)}`));
    },
    async finalizeCheckoutSession(id: string, paymentIntentId?: string, resumeToken?: string) {
      return getData(await api.post<ApiResponse<CheckoutSession>>(`/api/v1/checkout-sessions/${id}/finalize`, {
        paymentIntentId, resumeToken,
      }));
    },
    async cancelCheckoutSession(id: string, resumeToken?: string) {
      return getData(await api.post<ApiResponse<CheckoutSession>>(`/api/v1/checkout-sessions/${id}/cancel`, {
        resumeToken,
      }));
    },

    async createSubscriptionCheckoutSession(params: {
      tier: "PRO" | "ENTERPRISE";
      period?: "MONTHLY" | "YEARLY";
      successUrl: string;
      cancelUrl: string;
    }) {
      const res = await api.post<ApiResponse<{ url: string }>>("/api/v1/subscription/create-checkout-session", {
        tier: params.tier,
        period: params.period ?? "MONTHLY",
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      });
      return res.data.data ?? { url: "" };
    },
    async syncSubscriptionFromStripe() {
      const res = await api.post<ApiResponse<User>>("/api/v1/subscription/sync");
      return {
        user: res.data.data!,
        message: res.data.message ?? "Done",
      };
    },

    async getMyNotifications(page = 0, size = 20) {
      const res = await api.get<ApiResponse<PageResponse<UserNotification>>>(
        "/api/v1/users/me/notifications",
        { params: { page, size } }
      );
      const raw = res.data.data!;
      return {
        content: raw?.content ?? [],
        totalElements: raw?.totalElements ?? 0,
        totalPages: raw?.totalPages ?? 1,
        size: raw?.size ?? size,
        number: raw?.number ?? page,
        first: raw?.first,
        last: raw?.last,
      };
    },
    async markNotificationRead(id: string) {
      await api.patch(`/api/v1/users/me/notifications/${id}/read`);
    },
    async getMyNotificationPreferences() {
      const res = await api.get<ApiResponse<NotificationPreferences>>("/api/v1/users/me/notification-preferences");
      return res.data.data ?? { emailEnabled: true, smsEnabled: true, pushEnabled: true };
    },
    async updateMyNotificationPreferences(data: { emailEnabled?: boolean; smsEnabled?: boolean; pushEnabled?: boolean }) {
      const res = await api.put<ApiResponse<NotificationPreferences>>(
        "/api/v1/users/me/notification-preferences",
        data
      );
      return res.data.data ?? { emailEnabled: true, smsEnabled: true, pushEnabled: true };
    },

    async getOrganizerSummary() {
      const res = await api.get<ApiResponse<OrganizerSummary>>("/api/v1/organizer/summary");
      const d = res.data.data!;
      const toNum = (v: unknown) =>
        typeof v === "number" && !Number.isNaN(v) ? v : typeof v === "string" ? parseFloat(v) || 0 : 0;
      return {
        eventsHosted: d.eventsHosted ?? 0,
        ticketsSold: d.ticketsSold ?? 0,
        ticketsSoldTrendPercent: d.ticketsSoldTrendPercent ?? null,
        totalRevenue: toNum(d.totalRevenue),
        platformFeesWithheld: toNum(d.platformFeesWithheld),
        platformFeeRateLabel: d.platformFeeRateLabel ?? undefined,
        availableBalance: toNum(d.availableBalance),
        pendingBalance: toNum(d.pendingBalance),
        pendingHoldDays: typeof d.pendingHoldDays === "number" ? d.pendingHoldDays : undefined,
        riskFlagged: Boolean(d.riskFlagged),
        riskLevel: d.riskLevel ?? "LOW",
        w9Submitted: Boolean(d.w9Submitted),
        payoutEligibility: d.payoutEligibility,
      };
    },
    async getOrganizerEvents() {
      const res = await api.get<ApiResponse<Event[]>>("/api/v1/organizer/events");
      return res.data.data ?? [];
    },
    async getEventSeats(eventId: string) {
      const res = await api.get<ApiResponse<SeatResponse[]>>(`/api/v1/events/${eventId}/seats`);
      return res.data.data ?? [];
    },
    async createEventSeatMap(eventId: string, body: CreateSeatMapRequest) {
      const res = await api.post<ApiResponse<{ seatsCreated: number }>>(
        `/api/v1/organizer/events/${eventId}/seat-map`,
        body
      );
      return res.data.data ?? { seatsCreated: 0 };
    },
    async publishEvent(eventId: string) {
      return getData(await api.post<ApiResponse<Event>>(`/api/v1/events/${eventId}/publish`));
    },
    async checkInTicket(ticketId: string) {
      const res = await api.post<ApiResponse<CheckInResult>>(`/api/v1/organizer/tickets/${ticketId}/check-in`);
      return res.data.data!;
    },
    async getEventAttendees(eventId: string) {
      const res = await api.get<ApiResponse<Attendee[]>>(`/api/v1/organizer/events/${eventId}/attendees`);
      return res.data.data ?? [];
    },
    async getOrganizerRecentSales(limit = 20) {
      const res = await api.get<ApiResponse<RecentSale[]>>(`/api/v1/organizer/feed/recent-sales?limit=${limit}`);
      return res.data.data ?? [];
    },
    async getOrganizerInsights() {
      const res = await api.get<ApiResponse<OrganizerInsights>>("/api/v1/organizer/insights");
      return res.data.data ?? { aiInsight: "", eventPulses: [], topCulturalInterests: [] };
    },
    async requestPayout(amount: number) {
      const res = await api.post<ApiResponse<{ id: string; amount: number; status: string }>>(
        "/api/v1/organizer/payouts/request",
        { amount: Number(amount.toFixed(2)) }
      );
      return res.data.data!;
    },
    async getVerificationStatus() {
      return getData(await api.get<ApiResponse<VerificationStatusResponse>>("/api/v1/organizer/verification-status"));
    },
    async submitVerification(data: SubmitVerificationRequest) {
      await api.post("/api/v1/organizer/verification", data);
    },
    async listTeamMembers() {
      const res = await api.get<ApiResponse<TeamMember[]>>("/api/v1/organizer/team");
      return res.data.data ?? [];
    },
    async inviteTeamMember(email: string, role: "ADMIN" | "EDITOR" | "VIEWER") {
      return getData(await api.post<ApiResponse<TeamMember>>("/api/v1/organizer/team", { email: email.trim(), role }));
    },
    async removeTeamMember(userId: string) {
      await api.delete(`/api/v1/organizer/team/${userId}`);
    },
    async updateTeamMemberRole(userId: string, role: "ADMIN" | "EDITOR" | "VIEWER") {
      return getData(await api.put<ApiResponse<TeamMember>>(`/api/v1/organizer/team/${userId}/role`, { role }));
    },

    async getStats() {
      const res = await api.get<ApiResponse<AdminStats>>("/api/v1/admin/stats");
      const d = res.data.data!;
      const num = (v: unknown) =>
        typeof v === "number" && !Number.isNaN(v) ? v : typeof v === "string" ? parseFloat(v) || 0 : 0;
      return {
        totalUsers: Number(d?.totalUsers ?? 0),
        totalEvents: Number(d?.totalEvents ?? 0),
        totalTicketsSold: Number(d?.totalTicketsSold ?? 0),
        totalRevenue: num(d?.totalRevenue),
        userGrowth: num(d?.userGrowth),
        eventGrowth: num(d?.eventGrowth),
        ticketGrowth: num(d?.ticketGrowth),
        revenueGrowth: num(d?.revenueGrowth),
        usersAttendeeCount: Number(d?.usersAttendeeCount ?? 0),
        usersOrganizerCount: Number(d?.usersOrganizerCount ?? 0),
        usersAdminCount: Number(d?.usersAdminCount ?? 0),
      };
    },
    async getUsersPage(page = 1, size = 10) {
      const res = await api.get<ApiResponse<PageResponse<User>>>("/api/v1/admin/users", { params: { page, size } });
      const raw = res.data.data!;
      return {
        content: Array.isArray(raw) ? raw : (raw.content ?? []),
        totalElements: raw?.totalElements ?? raw?.content?.length ?? 0,
        totalPages: raw?.totalPages ?? 1,
        size: raw?.size ?? size,
        number: raw?.number ?? page - 1,
        first: raw?.first,
        last: raw?.last,
      };
    },
    async getVerificationPending(limit = 50) {
      const res = await api.get<ApiResponse<PendingVerification[]>>("/api/v1/admin/verification-pending", {
        params: { limit },
      });
      return res.data.data ?? [];
    },
    async approveVerification(submissionId: string) {
      await api.post(`/api/v1/admin/verification/${submissionId}/approve`);
    },
    async rejectVerification(submissionId: string, reason?: string) {
      await api.post(`/api/v1/admin/verification/${submissionId}/reject`, reason != null ? { reason } : {});
    },
    async getEventSales() {
      const res = await api.get<ApiResponse<EventSales[]>>("/api/v1/admin/event-sales");
      const list = res.data.data ?? [];
      return list.map((e: EventSales) => ({
        eventId: e.eventId,
        eventName: e.eventName,
        ticketsSold: e.ticketsSold,
        revenue: e.revenue,
        availableTickets: e.availableTickets,
        totalTickets: e.totalTickets,
      }));
    },
    async getRevenue(period = "30d") {
      const res = await api.get<ApiResponse<RevenueData[]>>("/api/v1/admin/revenue", { params: { period } });
      return res.data.data ?? [];
    },
    async getEventsPage(page = 1, size = 10) {
      const res = await api.get<ApiResponse<PageResponse<Event>>>("/api/v1/admin/events", { params: { page, size } });
      const raw = res.data.data!;
      return {
        content: Array.isArray(raw) ? raw : (raw.content ?? []),
        totalElements: raw?.totalElements ?? raw?.content?.length ?? 0,
        totalPages: raw?.totalPages ?? 1,
        size: raw?.size ?? size,
        number: raw?.number ?? page - 1,
        first: raw?.first,
        last: raw?.last,
      };
    },
    async updateEventStatus(eventId: string, status: string) {
      return getData(await api.patch<ApiResponse<Event>>(`/api/v1/admin/events/${eventId}/status`, { status }));
    },
    async recordSubscriptionPayment(body: RecordSubscriptionPaymentRequest) {
      const res = await api.post<ApiResponse<{ id: string }>>("/api/v1/admin/subscription-payments", body);
      return res.data.data ?? { id: "" };
    },
  };
}
