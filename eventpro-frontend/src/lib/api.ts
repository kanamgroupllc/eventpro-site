import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getOrCreateCorrelationId } from "@/lib/correlation";
import { CsrfTokenManager, isCsrfFailureCode, isUnsafeMethod } from "@/lib/csrf";
import type {
  ApiResponse,
  PageResponse,
  ApiKey,
  User,
  Event,
  EventAddon,
  Order,
  TicketType,
  TicketTypeEnum,
  Attendee,
  CheckInResult,
  UpdateUserRequest,
  CartResponse,
  AddToCartRequest,
  UpdateCartRequest,
  SignUpRequest,
  LoginRequest,
  AuthResponse,
  GuestConfirmPaymentRequest,
  CreateApiKeyResponse,
  OrganizerSummary,
  VerificationStatusResponse,
  SubmitVerificationRequest,
  TaxFormEntry,
  SubmitW9Request as SubmitW9RequestType,
  RecentSale,
  OrganizerInsights,
  TeamMember,
  SeatResponse,
  CreateSeatMapRequest,
  AdminStats,
  AuditActivity,
  AuditActivityPage,
  SystemStatus,
  EventSales,
  RevenueData,
  PendingVerification,
  RecordSubscriptionPaymentRequest,
  UserNotification,
  NotificationPreferences,
  FollowedOrganizer,
  WalletBalance,
  WalletLedgerEntry,
} from "@/types/api";

class ApiService {
  private api: AxiosInstance;
  private csrf: CsrfTokenManager;

  constructor() {
    // In dev always use same-origin so Vite proxy forwards /api to backend (avoids direct :8080 and CORS).
    const baseURL = import.meta.env.DEV
      ? ""
      : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080");
    this.csrf = new CsrfTokenManager(baseURL);
    this.api = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to attach token
    this.api.interceptors.request.use(
      async (config) => {
        config.headers["X-Correlation-Id"] = getOrCreateCorrelationId();
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (typeof FormData !== "undefined" && config.data instanceof FormData) {
          config.headers.setContentType(undefined);
        }
        if (isUnsafeMethod(config.method)) {
          const csrf = await this.csrf.getToken();
          config.headers[csrf.headerName] = csrf.token;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        this.csrf.updateFromResponse(response.headers);
        return response;
      },
      async (error) => {
        const responseCode = error.response?.data?.code;
        const original = error.config as (InternalAxiosRequestConfig & { _csrfRetry?: boolean }) | undefined;
        const isCsrfFailure = isCsrfFailureCode(responseCode);
        if (isCsrfFailure && original && !original._csrfRetry) {
          original._csrfRetry = true;
          const csrf = await this.csrf.getToken(true);
          original.headers[csrf.headerName] = csrf.token;
          return this.api.request(original);
        }
        if (error.response?.status === 401) {
          const hadToken = localStorage.getItem("accessToken");
          if (hadToken) {
            localStorage.removeItem("accessToken");
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );

    // Safe reads can render even if the initial bootstrap is temporarily unavailable.
    void this.csrf.initialize().catch(() => undefined);
  }

  initializeCsrf(): Promise<unknown> {
    return this.csrf.initialize();
  }

  clearCsrfToken(): void {
    this.csrf.clear();
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<ApiResponse<User>>("/api/v1/users/me");
    return response.data.data;
  }

  async getFollowing(): Promise<FollowedOrganizer[]> {
    const response = await this.api.get<ApiResponse<FollowedOrganizer[]>>("/api/v1/users/me/following");
    return response.data.data ?? [];
  }

  async followOrganizer(organizerId: string): Promise<void> {
    await this.api.post<ApiResponse<null>>(`/api/v1/users/me/following/${organizerId}`);
  }

  async unfollowOrganizer(organizerId: string): Promise<void> {
    await this.api.delete<ApiResponse<null>>(`/api/v1/users/me/following/${organizerId}`);
  }

  /** Create Stripe Checkout Session for subscription. Redirect user to returned url. After payment, webhooks update tier. */
  async createSubscriptionCheckoutSession(params: {
    tier: "PRO" | "ENTERPRISE";
    period?: "MONTHLY" | "YEARLY";
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const response = await this.api.post<ApiResponse<{ url: string }>>(
      "/api/v1/subscription/create-checkout-session",
      {
        tier: params.tier,
        period: params.period ?? "MONTHLY",
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      }
    );
    return response.data.data ?? { url: "" };
  }

  /** Sync subscription from Stripe (updates tier + role). Returns user and server message (e.g. why nothing changed). */
  async syncSubscriptionFromStripe(): Promise<{ user: User; message: string }> {
    const response = await this.api.post<ApiResponse<User>>("/api/v1/subscription/sync");
    return {
      user: response.data.data!,
      message: response.data.message ?? "Done",
    };
  }

  /** Upgrade subscription tier without payment (legacy / dev). Prefer createSubscriptionCheckoutSession for real billing. */
  async upgradeSubscription(tier: "PRO" | "ENTERPRISE"): Promise<User> {
    const response = await this.api.put<ApiResponse<User>>("/api/v1/users/me/subscription-tier", { tier });
    return response.data.data;
  }

  /** Create API key (Enterprise only). Returns key once – store it securely. */
  async createApiKey(name: string): Promise<CreateApiKeyResponse> {
    const response = await this.api.post<ApiResponse<CreateApiKeyResponse>>("/api/v1/users/me/api-keys", { name });
    return response.data.data;
  }

  /** List API keys (Enterprise only). Key values are not returned. */
  async listApiKeys(): Promise<ApiKey[]> {
    const response = await this.api.get<ApiResponse<ApiKey[]>>("/api/v1/users/me/api-keys");
    return response.data.data ?? [];
  }

  /** Revoke an API key (Enterprise only). */
  async revokeApiKey(id: string): Promise<void> {
    await this.api.delete(`/api/v1/users/me/api-keys/${id}`);
  }

  async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await this.api.put<ApiResponse<User>>("/api/v1/users/me", data);
    return response.data.data;
  }

  /** Upload profile picture (organizers and any user). Returns new profile picture URL. */
  async uploadProfilePicture(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await this.api.post<ApiResponse<{ url: string }>>("/api/v1/users/upload-profile-picture", formData);
    return response.data.data.url;
  }

  /** List in-app notifications for current user (paginated). */
  async getMyNotifications(page = 0, size = 20): Promise<PageResponse<UserNotification>> {
    const response = await this.api.get<ApiResponse<PageResponse<UserNotification>>>(
      "/api/v1/users/me/notifications",
      { params: { page, size } }
    );
    return response.data.data;
  }

  /** Mark a notification as read. */
  async markNotificationRead(id: string): Promise<void> {
    await this.api.patch(`/api/v1/users/me/notifications/${id}/read`);
  }

  /** Get current user notification preferences. */
  async getMyNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await this.api.get<ApiResponse<NotificationPreferences>>(
      "/api/v1/users/me/notification-preferences"
    );
    return response.data.data;
  }

  /** Update current user notification preferences. */
  async updateMyNotificationPreferences(data: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
  }): Promise<NotificationPreferences> {
    const response = await this.api.put<ApiResponse<NotificationPreferences>>(
      "/api/v1/users/me/notification-preferences",
      data
    );
    return response.data.data;
  }

  // Auth endpoints
  async signUp(data: SignUpRequest): Promise<void> {
    await this.api.post("/api/v1/auth/signup", data);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>("/api/v1/auth/login", data);
    return response.data.data;
  }

  // Event endpoints
  async getEvents(page = 1, size = 20, keyword?: string, organizerId?: string): Promise<Event[]> {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("size", String(size));
    if (keyword) params.append("keyword", keyword);
    if (organizerId) params.append("organizerId", organizerId);

    const response = await this.api.get<ApiResponse<{ content: Event[] }>>(`/api/v1/events?${params}`);
    return response.data.data.content ?? [];
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    const response = await this.api.get<ApiResponse<Event[]>>(`/api/v1/events/category/${category}`);
    return response.data.data;
  }

  async getEvent(id: string): Promise<Event> {
    const response = await this.api.get<ApiResponse<Event>>(`/api/v1/events/${id}`);
    return response.data.data;
  }

  async contactOrganizer(
    eventId: string,
    body: { senderEmail: string; senderName?: string; message: string }
  ): Promise<void> {
    await this.api.post<ApiResponse<null>>(`/api/v1/events/${eventId}/contact`, body);
  }

  async createEvent(data: Partial<Event>): Promise<Event> {
    const response = await this.api.post<ApiResponse<Event>>("/api/v1/events", data);
    return response.data.data;
  }

  async createEventWithImages(formData: FormData): Promise<Event> {
    const response = await this.api.post<ApiResponse<Event>>("/api/v1/events", formData);
    return response.data.data;
  }

  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
    const response = await this.api.put<ApiResponse<Event>>(`/api/v1/events/${id}`, data);
    return response.data.data;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.api.delete(`/api/v1/events/${id}`);
  }

  // Ticket type endpoints
  async getTicketTypes(eventId: string): Promise<TicketType[]> {
    const response = await this.api.get<ApiResponse<TicketType[]>>(`/api/v1/events/${eventId}/ticket-types`);
    return response.data.data;
  }

  async createOrganizerTickets(
    eventId: string,
    payload: { ticketType: TicketTypeEnum; price: number; quantity: number; name: string }
  ): Promise<void> {
    await this.api.post(`/api/v1/organizer/events/${eventId}/tickets`, payload);
  }

  /** Reserved seating: get seat map for an event (when reservedSeatingEnabled). */
  async getEventSeats(eventId: string): Promise<SeatResponse[]> {
    const response = await this.api.get<ApiResponse<SeatResponse[]>>(`/api/v1/events/${eventId}/seats`);
    return response.data.data ?? [];
  }

  /** Create seat map for an event (Pro/Enterprise, organizer). Requires reservedSeatingEnabled on event. */
  async createEventSeatMap(eventId: string, body: CreateSeatMapRequest): Promise<{ seatsCreated: number }> {
    const response = await this.api.post<ApiResponse<{ seatsCreated: number }>>(
      `/api/v1/organizer/events/${eventId}/seat-map`,
      body
    );
    return response.data.data ?? { seatsCreated: 0 };
  }

  // Event add-ons (enhancements) - public for checkout
  async getEventAddons(eventId: string): Promise<EventAddon[]> {
    const response = await this.api.get<ApiResponse<EventAddon[]>>(`/api/v1/events/${eventId}/addons`);
    return response.data.data ?? [];
  }

  // Organizer: event add-ons CRUD
  async getOrganizerEventAddons(eventId: string): Promise<EventAddon[]> {
    const response = await this.api.get<ApiResponse<EventAddon[]>>(`/api/v1/organizer/events/${eventId}/addons`);
    return response.data.data ?? [];
  }

  async createEventAddon(eventId: string, data: { name: string; description?: string; price: number; category: string; imageUrl?: string; sizes?: string[]; isPopular?: boolean; displayOrder?: number }): Promise<EventAddon> {
    const response = await this.api.post<ApiResponse<EventAddon>>(`/api/v1/organizer/events/${eventId}/addons`, data);
    return response.data.data;
  }

  async updateEventAddon(eventId: string, addonId: string, data: Partial<{ name: string; description: string; price: number; category: string; imageUrl: string; sizes: string[]; isPopular: boolean; displayOrder: number }>): Promise<EventAddon> {
    const response = await this.api.put<ApiResponse<EventAddon>>(`/api/v1/organizer/events/${eventId}/addons/${addonId}`, data);
    return response.data.data;
  }

  async deleteEventAddon(eventId: string, addonId: string): Promise<void> {
    await this.api.delete(`/api/v1/organizer/events/${eventId}/addons/${addonId}`);
  }

  // Cart endpoints
  async getCart(): Promise<CartResponse> {
    const response = await this.api.get<ApiResponse<CartResponse>>("/api/v1/cart");
    return response.data.data;
  }

  async addToCart(data: AddToCartRequest): Promise<CartResponse> {
    const response = await this.api.post<ApiResponse<CartResponse>>("/api/v1/cart/add", data);
    return response.data.data;
  }

  async importCart(items: Array<{ eventId: string; ticketType?: TicketTypeEnum; ticketId?: string; quantity: number }>): Promise<CartResponse> {
    const response = await this.api.post<ApiResponse<CartResponse>>("/api/v1/cart/import", { items });
    return response.data.data;
  }

  async addGeneralAdmission(eventId: string, ticketType: TicketTypeEnum, quantity: number): Promise<CartResponse> {
    const response = await this.api.post<ApiResponse<CartResponse>>(`/api/v1/cart/general-admission/${eventId}/${ticketType}`, { quantity });
    return response.data.data;
  }

  async setGeneralAdmission(eventId: string, ticketType: TicketTypeEnum, quantity: number): Promise<CartResponse> {
    const response = await this.api.put<ApiResponse<CartResponse>>(`/api/v1/cart/general-admission/${eventId}/${ticketType}`, { quantity });
    return response.data.data;
  }

  async removeGeneralAdmission(eventId: string, ticketType: TicketTypeEnum): Promise<CartResponse> {
    const response = await this.api.delete<ApiResponse<CartResponse>>(`/api/v1/cart/general-admission/${eventId}/${ticketType}`);
    return response.data.data;
  }

  async addSeat(ticketId: string): Promise<CartResponse> {
    const response = await this.api.post<ApiResponse<CartResponse>>(`/api/v1/cart/seats/${ticketId}`);
    return response.data.data;
  }

  async removeSeat(ticketId: string): Promise<CartResponse> {
    const response = await this.api.delete<ApiResponse<CartResponse>>(`/api/v1/cart/seats/${ticketId}`);
    return response.data.data;
  }

  async updateCartItem(ticketId: string, data: UpdateCartRequest): Promise<CartResponse> {
    const response = await this.api.patch<ApiResponse<CartResponse>>(`/api/v1/cart/update/${ticketId}`, data);
    return response.data.data;
  }

  async removeFromCart(ticketId: string): Promise<CartResponse> {
    const response = await this.api.delete<ApiResponse<CartResponse>>(`/api/v1/cart/delete/${ticketId}`);
    return response.data.data;
  }

  async clearCart(): Promise<void> {
    await this.api.delete("/api/v1/cart/clear");
  }

  async createCheckoutSession(body: {
    idempotencyKey: string;
    items?: { eventId: string; ticketType: string; quantity: number }[];
    email?: string; firstName?: string; lastName?: string; state?: string; country?: string;
    donationAmount?: number; walletAmount?: number;
    addOns?: { id: string; quantity: number; size?: string }[];
  }): Promise<import("@/types/api").CheckoutSession> {
    const response = await this.api.post<ApiResponse<import("@/types/api").CheckoutSession>>("/api/v1/checkout-sessions", body);
    return response.data.data;
  }

  async resumeCheckoutSession(token: string): Promise<import("@/types/api").CheckoutSession> {
    const response = await this.api.get<ApiResponse<import("@/types/api").CheckoutSession>>(
      `/api/v1/checkout-sessions/resume/${encodeURIComponent(token)}`
    );
    return response.data.data;
  }

  async finalizeCheckoutSession(id: string, paymentIntentId?: string, resumeToken?: string): Promise<import("@/types/api").CheckoutSession> {
    const response = await this.api.post<ApiResponse<import("@/types/api").CheckoutSession>>(
      `/api/v1/checkout-sessions/${id}/finalize`, { paymentIntentId, resumeToken }
    );
    return response.data.data;
  }

  async cancelCheckoutSession(id: string, resumeToken?: string): Promise<import("@/types/api").CheckoutSession> {
    const response = await this.api.post<ApiResponse<import("@/types/api").CheckoutSession>>(
      `/api/v1/checkout-sessions/${id}/cancel`, { resumeToken }
    );
    return response.data.data;
  }

  // Order endpoints (backend returns paginated { content: [...] }; shape may use amount/orderItems)
  async getOrders(page = 1, size = 50): Promise<unknown[]> {
    const response = await this.api.get<ApiResponse<{ content: unknown[] } | unknown[]>>(
      `/api/v1/orders?page=${page}&size=${size}`
    );
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as { content?: unknown[] }).content)) {
      return (data as { content: unknown[] }).content;
    }
    return [];
  }

  async getOrder(id: string): Promise<Order> {
    const response = await this.api.get<ApiResponse<Order>>(`/api/v1/orders/${id}`);
    return response.data.data;
  }

  async createOrder(): Promise<Order> {
    const response = await this.api.post<ApiResponse<Order>>("/api/v1/orders");
    return response.data.data;
  }

  /** Reserve tickets for guest (lock) before payment. Returns ticket IDs and reservedUntil (ISO-8601) for countdown. */
  async guestReserve(
    items: { eventId: string; ticketType: string; quantity: number }[],
    recaptchaToken?: string
  ): Promise<{
    reservedTicketIds: string[];
    reservedUntil: string;
  }> {
    const response = await this.api.post<ApiResponse<{ reservedTicketIds: string[]; reservedUntil: string }>>(
      "/api/v1/payments/guest-reserve",
      { items, recaptchaToken }
    );
    return response.data.data;
  }

  /** Get payment config (Stripe publishable key). Public – no auth. */
  async getPaymentConfig(): Promise<{ stripePublishableKey: string }> {
    const response = await this.api.get<ApiResponse<{ stripePublishableKey: string }>>("/api/v1/payments/config");
    return response.data.data ?? { stripePublishableKey: "" };
  }

  /** Get checkout totals including tax. Pass state/country for jurisdiction-based tax (e.g. state=CA, country=US). */
  async getCheckoutTotals(subtotal?: number, state?: string, country?: string): Promise<import("@/types/api").CheckoutTotals> {
    const params: Record<string, string | number> = {};
    if (subtotal != null && subtotal >= 0) params.subtotal = subtotal;
    if (state != null && state.trim()) params.state = state.trim();
    if (country != null && country.trim()) params.country = country.trim();
    const response = await this.api.get<ApiResponse<import("@/types/api").CheckoutTotals>>("/api/v1/payments/checkout-totals", { params });
    const data = response.data.data;
    if (!data) throw new Error("No checkout totals");
    return {
      subtotal: Number(data.subtotal),
      taxRatePercent: Number(data.taxRatePercent),
      tax: Number(data.tax),
      total: Number(data.total),
    };
  }

  /** Create Stripe payment intent (amount in dollars). Public – works for guest. */
  async createPaymentIntent(amount: number, recaptchaToken?: string): Promise<{ clientSecret: string }> {
    const response = await this.api.post<ApiResponse<{ clientSecret: string }>>("/api/v1/payments/create-intent", {
      amount: Number(amount.toFixed(2)),
      recaptchaToken,
    });
    return response.data.data;
  }

  /** Confirm guest payment and create order (no auth). */
  async confirmGuestPayment(body: GuestConfirmPaymentRequest): Promise<Order> {
    const response = await this.api.post<ApiResponse<Order>>("/api/v1/payments/guest/confirm", body);
    return response.data.data;
  }

  /** Confirm payment for authenticated user (creates order from cart). Optional walletAmount for Electric Wallet credits. */
  async confirmPayment(
    paymentIntentId: string | undefined,
    options?: { walletAmount?: number; state?: string; country?: string }
  ): Promise<Order> {
    const body: {
      paymentIntentId?: string;
      walletAmount?: number;
      state?: string;
      country?: string;
    } = {};
    if (paymentIntentId?.trim()) body.paymentIntentId = paymentIntentId.trim();
    if (options?.walletAmount != null && options.walletAmount > 0) {
      body.walletAmount = Number(options.walletAmount.toFixed(2));
    }
    if (options?.state?.trim()) body.state = options.state.trim();
    if (options?.country?.trim()) body.country = options.country.trim();
    const response = await this.api.post<ApiResponse<Order>>("/api/v1/payments/confirm", body);
    return response.data.data;
  }

  async getWallet(): Promise<WalletBalance> {
    const response = await this.api.get<ApiResponse<WalletBalance>>("/api/v1/wallet");
    const data = response.data.data;
    return {
      balance: Number(data?.balance ?? 0),
      currency: data?.currency ?? "USD",
    };
  }

  async getWalletLedger(page = 0, size = 20): Promise<PageResponse<WalletLedgerEntry>> {
    const response = await this.api.get<ApiResponse<PageResponse<WalletLedgerEntry>>>("/api/v1/wallet/ledger", {
      params: { page, size },
    });
    const pageData = response.data.data;
    return {
      content: (pageData?.content ?? []).map((e) => ({
        ...e,
        amount: Number(e.amount),
        balanceAfter: Number(e.balanceAfter),
      })),
      totalElements: pageData?.totalElements ?? 0,
      totalPages: pageData?.totalPages ?? 0,
      size: pageData?.size ?? size,
      number: pageData?.number ?? page,
    };
  }

  async requestOrderRefund(orderId: string): Promise<Order> {
    const response = await this.api.post<ApiResponse<Order>>(`/api/v1/orders/${orderId}/refund`);
    return response.data.data;
  }

  // Admin endpoints (only call from admin-only UI; backend enforces ADMIN role)
  async getUsersPage(page = 1, size = 10): Promise<PageResponse<User>> {
    const response = await this.api.get<ApiResponse<PageResponse<User>>>(
      "/api/v1/admin/users",
      { params: { page, size } }
    );
    const raw = response.data.data;
    if (!raw) return { content: [], totalElements: 0, totalPages: 0, size, number: page - 1 };
    return {
      content: Array.isArray(raw) ? raw : (raw.content ?? []),
      totalElements: raw.totalElements ?? raw.content?.length ?? 0,
      totalPages: raw.totalPages ?? 1,
      size: raw.size ?? size,
      number: raw.number ?? page - 1,
      first: raw.first,
      last: raw.last,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const page = await this.getUsersPage(1, 100);
    return page.content;
  }

  /** Create a new user with ADMIN role. Requires caller to be ADMIN. */
  async createAdminUser(body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }): Promise<User> {
    const response = await this.api.post<ApiResponse<User>>("/api/v1/admin/users", body);
    return response.data.data;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const response = await this.api.patch<ApiResponse<User>>(`/api/v1/admin/users/${userId}/role`, { role });
    return response.data.data;
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const response = await this.api.patch<ApiResponse<User>>(`/api/v1/admin/users/${userId}/status`, { status });
    return response.data.data;
  }

  async getStats(): Promise<AdminStats> {
    const response = await this.api.get<ApiResponse<AdminStats>>("/api/v1/admin/stats");
    const d = response.data.data;
    const num = (v: unknown) => (typeof v === "number" && !Number.isNaN(v) ? v : typeof v === "string" ? parseFloat(v) || 0 : 0);
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
  }

  async getAuditActivityPage(params: {
    page?: number;
    size?: number;
    category?: string;
    search?: string;
  }): Promise<AuditActivityPage> {
    const response = await this.api.get<ApiResponse<AuditActivityPage>>("/api/v1/admin/audit-activity", {
      params: {
        page: params.page ?? 1,
        size: params.size ?? 20,
        category: params.category,
        search: params.search,
      },
    });
    const d = response.data.data;
    return {
      content: Array.isArray(d?.content) ? d!.content : [],
      totalElements: Number(d?.totalElements ?? 0),
      totalPages: Math.max(1, Number(d?.totalPages ?? 1)),
      page: Number(d?.page ?? 1),
      size: Number(d?.size ?? 20),
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const response = await this.api.get<ApiResponse<SystemStatus>>("/api/v1/admin/system-status");
    return response.data.data!;
  }

  async getVerificationPending(limit = 50): Promise<PendingVerification[]> {
    const response = await this.api.get<ApiResponse<PendingVerification[]>>("/api/v1/admin/verification-pending", {
      params: { limit },
    });
    return response.data.data ?? [];
  }

  async approveVerification(submissionId: string): Promise<void> {
    await this.api.post(`/api/v1/admin/verification/${submissionId}/approve`);
  }

  async rejectVerification(submissionId: string, reason?: string): Promise<void> {
    await this.api.post(`/api/v1/admin/verification/${submissionId}/reject`, reason != null ? { reason } : {});
  }

  async getEventSales(): Promise<EventSales[]> {
    const response = await this.api.get<ApiResponse<EventSales[]>>("/api/v1/admin/event-sales");
    const list = response.data.data ?? [];
    return list.map((e) => ({
      eventId: String(e.eventId ?? ""),
      eventName: String(e.eventName ?? ""),
      ticketsSold: Number(e.ticketsSold ?? 0),
      revenue: Number(e.revenue ?? 0),
      availableTickets: Number(e.availableTickets ?? 0),
      totalTickets: Number(e.totalTickets ?? 0),
    }));
  }

  async getRevenue(period = "30d"): Promise<RevenueData[]> {
    const response = await this.api.get<ApiResponse<RevenueData[]>>("/api/v1/admin/revenue", { params: { period } });
    const list = response.data.data ?? [];
    return list.map((r) => ({
      date: String(r.date ?? ""),
      revenue: Number(r.revenue ?? 0),
      ticketsSold: Number(r.ticketsSold ?? 0),
    }));
  }

  async getEventsPage(page = 1, size = 10): Promise<PageResponse<Event>> {
    const response = await this.api.get<ApiResponse<PageResponse<Event>>>("/api/v1/admin/events", {
      params: { page, size },
    });
    const raw = response.data.data;
    if (!raw) return { content: [], totalElements: 0, totalPages: 0, size, number: page - 1 };
    return {
      content: Array.isArray(raw) ? raw : (raw.content ?? []),
      totalElements: raw.totalElements ?? raw.content?.length ?? 0,
      totalPages: raw.totalPages ?? 1,
      size: raw.size ?? size,
      number: raw.number ?? page - 1,
      first: raw.first,
      last: raw.last,
    };
  }

  async updateEventStatus(eventId: string, status: string): Promise<Event> {
    const response = await this.api.patch<ApiResponse<Event>>(`/api/v1/admin/events/${eventId}/status`, { status });
    return response.data.data;
  }

  async recordSubscriptionPayment(body: RecordSubscriptionPaymentRequest): Promise<{ id: string }> {
    const response = await this.api.post<ApiResponse<{ id: string }>>("/api/v1/admin/subscription-payments", body);
    return response.data.data ?? { id: "" };
  }

  // Organizer endpoints
  async getOrganizerSummary(): Promise<OrganizerSummary> {
    const response = await this.api.get<ApiResponse<OrganizerSummary>>("/api/v1/organizer/summary");
    const d = response.data.data;
    const toNum = (v: unknown) =>
      typeof v === "number" && !Number.isNaN(v) ? v : typeof v === "string" ? parseFloat(v) || 0 : 0;
    const pe = d.payoutEligibility;
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
      payoutEligibility: pe
        ? {
            standardT2: Boolean(pe.standardT2),
            early50Percent: Boolean(pe.early50Percent),
            instant100: Boolean(pe.instant100),
            label: pe.label ?? "Standard (T+2)",
          }
        : undefined,
    };
  }

  /** Request a payout for the given amount. Validates balance and eligibility (verified, W-9 if $600+). */
  async requestPayout(amount: number): Promise<{ id: string; amount: number; status: string }> {
    const response = await this.api.post<ApiResponse<{ id: string; amount: number; status: string }>>(
      "/api/v1/organizer/payouts/request",
      { amount: Number(amount.toFixed(2)) }
    );
    return response.data.data;
  }

  /** Whether the organizer has connected a payout (bank) account via Stripe Connect. */
  async getConnectStatus(): Promise<{ connected: boolean }> {
    const response = await this.api.get<ApiResponse<{ connected: boolean }>>("/api/v1/organizer/payouts/connect-status");
    return response.data.data ?? { connected: false };
  }

  /** Start Stripe Connect onboarding; returns URL to redirect the user to add their bank account. */
  async connectOnboarding(returnUrl: string, refreshUrl: string): Promise<{ url: string }> {
    const response = await this.api.post<ApiResponse<{ url: string }>>("/api/v1/organizer/payouts/connect-onboarding", {
      returnUrl,
      refreshUrl,
    });
    return response.data.data ?? { url: "" };
  }

  async getOrganizerTaxForms(): Promise<TaxFormEntry[]> {
    const response = await this.api.get<ApiResponse<TaxFormEntry[]>>("/api/v1/organizer/tax-forms");
    return response.data.data ?? [];
  }

  /** Download 1099-K PDF for a tax year. Triggers browser download. */
  async downloadOrganizerTaxFormPdf(year: number): Promise<void> {
    const response = await this.api.get<Blob>(`/api/v1/organizer/tax-forms/${year}/download`, {
      responseType: "blob",
    });
    const blob = response.data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `1099-K-${year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async submitW9(data: SubmitW9RequestType): Promise<void> {
    await this.api.post<ApiResponse<string>>("/api/v1/organizer/w9", data);
  }

  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    const response = await this.api.get<ApiResponse<VerificationStatusResponse>>("/api/v1/organizer/verification-status");
    return response.data.data;
  }

  /** Recalculate organizer risk level (LOW/MEDIUM/HIGH). Returns updated riskLevel. */
  async recalculateRiskScore(): Promise<{ riskLevel: string }> {
    const response = await this.api.post<ApiResponse<{ riskLevel: string }>>("/api/v1/organizer/risk-score/recalculate");
    return response.data.data;
  }

  async submitVerification(data: SubmitVerificationRequest): Promise<void> {
    await this.api.post<ApiResponse<string>>("/api/v1/organizer/verification", data);
  }

  async getOrganizerEvents(): Promise<Event[]> {
    const response = await this.api.get<ApiResponse<Event[]>>("/api/v1/organizer/events");
    return response.data.data;
  }

  /** Update event (organizer). Sends JSON; use uploadEventImage first if changing image. */
  async updateOrganizerEvent(
    id: string,
    data: Partial<Event> & { startTime?: string; endTime?: string; category?: string; address?: Event["address"] }
  ): Promise<Event> {
    const response = await this.api.put<ApiResponse<Event>>(`/api/v1/organizer/events/${id}`, data);
    return response.data.data;
  }

  /** Upload event image. Returns { url }. Use param name "image" for the file. */
  async uploadEventImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await this.api.post<ApiResponse<{ url: string }>>(
      "/api/v1/organizer/events/upload-image",
      formData
    );
    const url = response.data.data?.url ?? (response.data as { data?: { url?: string } }).data?.url;
    return { url: url ?? "" };
  }

  /** Add a gallery image to an event (organizer). Upload image first with uploadEventImage, then pass the URL. */
  async addEventImage(eventId: string, payload: { imageUrl: string; displayOrder?: number }): Promise<{ id: string; imageUrl: string; displayOrder: number }> {
    const response = await this.api.post<ApiResponse<{ id: string; imageUrl: string; displayOrder: number }>>(
      `/api/v1/organizer/events/${eventId}/images`,
      payload
    );
    return response.data.data!;
  }

  /** Publish event (DRAFT → PUBLISHED). Requires organizer role. */
  async publishEvent(eventId: string): Promise<Event> {
    const response = await this.api.post<ApiResponse<Event>>(`/api/v1/events/${eventId}/publish`);
    return response.data.data;
  }

  /** Check in a ticket by ID (e.g. from QR scan). Returns attendee/ticket info for display. */
  async checkInTicket(ticketId: string): Promise<CheckInResult> {
    const response = await this.api.post<ApiResponse<CheckInResult>>(
      `/api/v1/organizer/tickets/${ticketId}/check-in`
    );
    return response.data.data!;
  }

  /** Get attendees for an event (organizer only). */
  async getEventAttendees(eventId: string): Promise<Attendee[]> {
    const response = await this.api.get<ApiResponse<Attendee[]>>(`/api/v1/organizer/events/${eventId}/attendees`);
    return response.data.data ?? [];
  }

  /** Email all attendees of an event (Pro/Enterprise only). Returns { recipientsSent }. */
  async emailEventAttendees(eventId: string, payload: { subject: string; body: string }): Promise<{ recipientsSent: number }> {
    const response = await this.api.post<ApiResponse<{ recipientsSent: number }>>(
      `/api/v1/organizer/events/${eventId}/email-attendees`,
      payload
    );
    const data = response.data.data as { recipientsSent?: number } | undefined;
    return { recipientsSent: data?.recipientsSent ?? 0 };
  }

  /** Export data (attendees, checkin, marketing, financial). Triggers file download. */
  async exportOrganizerData(type: "attendees" | "checkin" | "marketing" | "financial", format = "csv"): Promise<void> {
    const response = await this.api.get<Blob>(`/api/v1/organizer/export?type=${type}&format=${format}`, {
      responseType: "blob",
    });
    const blob = response.data;
    const name = type === "checkin" ? "check-in-list.csv" : type === "marketing" ? "marketing-emails.csv" : type === "financial" ? "financial-summary.csv" : "export-attendees.csv";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async getOrganizerRecentSales(limit = 20): Promise<RecentSale[]> {
    const response = await this.api.get<ApiResponse<RecentSale[]>>(`/api/v1/organizer/feed/recent-sales?limit=${limit}`);
    return response.data.data ?? [];
  }

  async getOrganizerInsights(): Promise<OrganizerInsights> {
    const response = await this.api.get<ApiResponse<OrganizerInsights>>("/api/v1/organizer/insights");
    return response.data.data ?? { aiInsight: "", eventPulses: [], topCulturalInterests: [] };
  }

  // Team management (Pro/Enterprise)
  async listTeamMembers(): Promise<TeamMember[]> {
    const response = await this.api.get<ApiResponse<TeamMember[]>>("/api/v1/organizer/team");
    return response.data.data ?? [];
  }

  async inviteTeamMember(email: string, role: "ADMIN" | "EDITOR" | "VIEWER"): Promise<TeamMember> {
    const response = await this.api.post<ApiResponse<TeamMember>>("/api/v1/organizer/team", { email: email.trim(), role });
    return response.data.data;
  }

  async removeTeamMember(userId: string): Promise<void> {
    await this.api.delete(`/api/v1/organizer/team/${userId}`);
  }

  async updateTeamMemberRole(userId: string, role: "ADMIN" | "EDITOR" | "VIEWER"): Promise<TeamMember> {
    const response = await this.api.put<ApiResponse<TeamMember>>(`/api/v1/organizer/team/${userId}/role`, { role });
    return response.data.data;
  }
}

export const apiService = new ApiService();
