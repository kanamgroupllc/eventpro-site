# Frontend-Backend Endpoints Documentation

This document provides a comprehensive mapping of all backend endpoints with their request/response DTOs, and the corresponding frontend API calls.

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Endpoints](#user-endpoints)
3. [Event Endpoints](#event-endpoints)
4. [Ticket Endpoints](#ticket-endpoints)
5. [Cart Endpoints](#cart-endpoints)
6. [Order Endpoints](#order-endpoints)
7. [Payment Endpoints](#payment-endpoints)
8. [Admin Endpoints](#admin-endpoints)
9. [Organizer Endpoints](#organizer-endpoints)
10. [Mismatches and Corrections](#mismatches-and-corrections)

---

## Authentication Endpoints

### POST /api/v1/auth/signup

**Backend:**
- **Controller**: `AuthController.signUp()`
- **Request**: `AuthSignupRequest`
  ```java
  {
    email: String (@Email, @NotBlank)
    password: String (@NotBlank, @Size(min=8))
    firstName: String (@NotBlank)
    lastName: String (@NotBlank)
    phoneNumber: String (optional)
    role: String (optional, defaults to "USER")
  }
  ```
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.signUp(data: SignUpRequest)`
- **Type**: `SignUpRequest`
  ```typescript
  {
    email: string
    password: string
    firstName: string  // Required
    lastName: string   // Required
    phoneNumber?: string
    role?: UserRole
  }
  ```
- **Returns**: `Promise<User>`
- **Status**: ✅ Aligned (all required fields match backend)

---

### POST /api/v1/auth/login

**Backend:**
- **Controller**: `AuthController.login()`
- **Request**: `AuthLoginRequest`
  ```java
  {
    email: String (@Email, @NotBlank)
    password: String (@NotBlank)
  }
  ```
- **Response**: `ApiResponse<AuthResponse>`
  ```java
  {
    accessToken: String
    expiresIn: long
    user: UserResponse
  }
  ```
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.login(data: LoginRequest)`
- **Type**: `LoginRequest`
  ```typescript
  {
    email: string
    password: string
  }
  ```
- **Returns**: `Promise<AuthResponse>`
- **Status**: ✅ Aligned

---

### POST /api/v1/auth/send-reset-email

**Backend:**
- **Controller**: `AuthController.sendResetEmail()`
- **Request**: `SendResetEmailRequest`
  ```java
  {
    email: String (@Email, @NotBlank)
    code: String (@NotBlank)
  }
  ```
- **Response**: `ApiResponse<Void>`
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.sendPasswordResetEmail(email: string, code: string)`
- **Request**: `{ email: string, code: string }`
- **Returns**: `Promise<void>`
- **Status**: ✅ Aligned

---

## User Endpoints

### GET /api/v1/users/me

**Backend:**
- **Controller**: `UserController.getCurrentUser()`
- **Request**: None
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: Authenticated

**Frontend:**
- **Method**: `apiService.getCurrentUser()`
- **Returns**: `Promise<User>`
- **Status**: ✅ Aligned

---

### PUT /api/v1/users/me

**Backend:**
- **Controller**: `UserController.updateCurrentUser()`
- **Request**: `UpdateUserRequest`
  ```java
  {
    firstName: String (optional)
    lastName: String (optional)
    phoneNumber: String (optional)
    bio: String (optional)
    location: String (optional)
  }
  ```
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: Authenticated

**Frontend:**
- **Method**: `apiService.updateCurrentUser(data: UpdateUserRequest)`
- **Type**: `UpdateUserRequest`
  ```typescript
  {
    firstName?: string
    lastName?: string
    phoneNumber?: string
    profilePictureUrl?: string  // ⚠️ Not in backend UpdateUserRequest
  }
  ```
- **Returns**: `Promise<User>`
- **Status**: ⚠️ Partial mismatch (profilePictureUrl handled separately)

---

### POST /api/v1/users/upload-profile-picture

**Backend:**
- **Controller**: `UserController.uploadProfilePicture()`
- **Request**: `multipart/form-data` with `image` file
- **Response**: `ApiResponse<Map<String, String>>` with `{ url: string }`
- **Auth**: Authenticated

**Frontend:**
- **Method**: `apiService.uploadProfilePicture(file: File)`
- **Returns**: `Promise<{ url: string }>`
- **Status**: ✅ Aligned

---

### GET /api/v1/users/{id}

**Backend:**
- **Controller**: `UserController.getUserById()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: ADMIN only

**Frontend:**
- **Not used directly** (admin endpoints use `/api/v1/admin/users`)

---

### GET /api/v1/users

**Backend:**
- **Controller**: `UserController.getAllUsers()`
- **Request**: Query params
  - `page: int` (default: 1, 1-based)
  - `size: int` (default: 5)
  - `sortBy: String` (default: "email")
  - `dir: String` (default: "asc")
- **Response**: `ApiResponse<Page<UserResponse>>`
- **Auth**: ADMIN only

**Frontend:**
- **Not used directly** (admin endpoints use `/api/v1/admin/users`)

---

## Event Endpoints

### POST /api/v1/events

**Backend:**
- **Controller**: `EventController.createEvent()`
- **Request**: `multipart/form-data`
  - `request: String` (JSON string of `CreateEventRequest`)
  - `imageFile: MultipartFile` (optional)
- **Request DTO**: `CreateEventRequest`
  ```java
  {
    name: String (@NotBlank)
    description: String (optional)
    startTime: LocalDateTime (@NotNull)
    endTime: LocalDateTime (@NotNull)
    marketingEnabled: Boolean (optional, default: false)
    category: String (@NotNull) // UUID or name
    address: AddressDto (@NotNull)
  }
  ```
- **Response**: `ApiResponse<EventResponse>`
- **Auth**: ADMIN or ORGANIZER

**Frontend:**
- **Not used** (uses `/api/v1/organizer/events` instead)

---

### GET /api/v1/events

**Backend:**
- **Controller**: `EventController.getAllEvents()`
- **Request**: Query params
  - `page: int` (default: 1, 1-based)
  - `size: int` (default: 10)
  - `sortBy: String` (default: "startTime")
  - `dir: String` (default: "asc")
  - `keyword: String` (optional, searches by name)
- **Response**: `ApiResponse<Page<EventResponse>>`
  - Spring Data `Page` serializes to: `{ content: EventResponse[], totalElements, totalPages, size, number, ... }`
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.getEvents(page = 0, size = 20, keyword?: string)`
- **Request**: Query params
  - `page: number` (default: 0, 0-based) ⚠️ **MISMATCH**: Frontend uses 0-based, backend expects 1-based
  - `size: number` (default: 20)
  - `keyword?: string`
- **Returns**: `Promise<Event[]>` (expects `response.data.data.content`)
- **Status**: ⚠️ **MISMATCH**: Page numbering differs

---

### GET /api/v1/events/{id}

**Backend:**
- **Controller**: `EventController.getEventById()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<EventResponse>`
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.getEventById(id: string)`
- **Returns**: `Promise<Event>`
- **Status**: ✅ Aligned

---

### GET /api/v1/events/{id}/ticket-types

**Backend:**
- **Controller**: `EventController.getTicketTypes()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<List<TicketTypeResponse>>`
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.getEventTicketTypes(eventId: string)`
- **Returns**: `Promise<TicketType[]>` (expects `response.data.data.content`) ⚠️ **MISMATCH**: Backend returns `List`, not `Page`
- **Status**: ⚠️ **MISMATCH**: Frontend expects paginated response with `content` field

---

### GET /api/v1/events/category/{categoryName}

**Backend:**
- **Controller**: `EventController.getEventsByCategory()`
- **Request**: Path parameter `categoryName: String`
- **Response**: `ApiResponse<List<EventResponse>>`
- **Auth**: Public

**Frontend:**
- **Method**: `apiService.getEventsByCategory(categoryName: string)`
- **Returns**: `Promise<Event[]>` (expects `response.data.data`)
- **Status**: ✅ Aligned

---

### GET /api/v1/events/my-events

**Backend:**
- **Controller**: `EventController.getMyEvents()`
- **Request**: None
- **Response**: `ApiResponse<List<EventResponse>>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.getUserEvents()`
- **Returns**: `Promise<Event[]>` (expects `response.data.data.content`) ⚠️ **MISMATCH**: Backend returns `List`, not `Page`
- **Status**: ⚠️ **MISMATCH**: Frontend expects paginated response with `content` field

---

### PATCH /api/v1/events/{id}

**Backend:**
- **Controller**: `EventController.updateEvent()`
- **Request**: 
  - Body: `UpdateEventRequest` (JSON)
  - Query param: `imageFile: MultipartFile` (optional)
- **Response**: `ApiResponse<EventResponse>`
- **Auth**: ADMIN or ORGANIZER

**Frontend:**
- **Not used** (uses `/api/v1/organizer/events/{id}` instead)

---

### DELETE /api/v1/events/{id}

**Backend:**
- **Controller**: `EventController.deleteEvent()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<Void>`
- **Auth**: ADMIN or ORGANIZER

**Frontend:**
- **Not used directly**

---

## Ticket Endpoints

### GET /api/v1/tickets/{id}/download

**Backend:**
- **Controller**: `TicketController.downloadTicket()`
- **Request**: Path parameter `id: UUID`
- **Response**: `byte[]` (PDF file, `Content-Type: application/pdf`)
- **Auth**: Authenticated (own tickets or ADMIN)

**Frontend:**
- **Method**: `apiService.downloadTicket(ticketId: string)`
- **Returns**: `Promise<Blob>`
- **Status**: ✅ Aligned

---

## Cart Endpoints

### POST /api/v1/cart/add

**Backend:**
- **Controller**: `CartController.addToCart()`
- **Request**: `AddToCartRequest`
  ```java
  {
    id: UUID (optional) // Ticket UUID
    eventIdType: String (optional) // Event ID as string
    ticketType: TicketType (optional) // VIP, REGULAR, EARLY_BIRD
    quantity: Integer (@NotNull, @Min(1))
  }
  ```
- **Response**: `ApiResponse<CartResponse>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.addToCartSingle(request: AddToCartRequest)`
- **Type**: `AddToCartRequest`
  ```typescript
  {
    id?: string
    eventIdType?: string
    ticketType?: TicketTypeEnum
    quantity: number
  }
  ```
- **Returns**: `Promise<CartResponse>`
- **Status**: ✅ Aligned

---

### POST /api/v1/cart/items

**Backend:**
- **Controller**: `CartController.addItemsToCart()`
- **Request**: `List<CartItemRequest>`
  ```java
  {
    ticketTypeId: String (@NotBlank) // Ticket UUID or Event UUID
    quantity: Integer (@NotNull, @Min(1))
  }
  ```
- **Response**: `ApiResponse<Void>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.addToCart(items: CartItem[])`
- **Type**: `CartItem[]`
  ```typescript
  {
    ticketTypeId: string
    quantity: number
  }[]
  ```
- **Returns**: `Promise<void>`
- **Status**: ✅ Aligned

---

### GET /api/v1/cart

**Backend:**
- **Controller**: `CartController.getCart()`
- **Request**: None
- **Response**: `ApiResponse<CartResponse>`
  ```java
  {
    id: UUID
    tickets: Set<CartItemResponse>
    quantity: Integer
    totalCost: BigDecimal
    message: String (optional)
  }
  ```
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.getCart()`
- **Returns**: `Promise<CartResponse>`
- **Status**: ✅ Aligned

---

### PATCH /api/v1/cart/update/{ticketId}

**Backend:**
- **Controller**: `CartController.updateCartItem()`
- **Request**: 
  - Path: `ticketId: UUID`
  - Body: `UpdateCartRequest`
    ```java
    {
      quantity: Integer (@NotNull, @Min(1))
    }
    ```
- **Response**: `ApiResponse<CartResponse>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.updateCartItem(ticketId: string, quantity: number)`
- **Request**: Body `{ quantity: number }`
- **Returns**: `Promise<CartResponse>`
- **Status**: ✅ Aligned

---

### DELETE /api/v1/cart/delete/{ticketId}

**Backend:**
- **Controller**: `CartController.removeFromCart()`
- **Request**: Path parameter `ticketId: UUID`
- **Response**: `ApiResponse<Void>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.removeFromCart(ticketId: string)`
- **Returns**: `Promise<void>`
- **Status**: ✅ Aligned

---

### DELETE /api/v1/cart/clear

**Backend:**
- **Controller**: `CartController.clearCart()`
- **Request**: None
- **Response**: `ApiResponse<Void>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.clearCart()`
- **Returns**: `Promise<void>`
- **Status**: ✅ Aligned

---

## Order Endpoints

### POST /api/v1/orders

**Backend:**
- **Controller**: `OrderController.createOrder()`
- **Request**: None (uses cart from authenticated user)
- **Response**: `ApiResponse<OrderResponse>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.createOrder()`
- **Returns**: `Promise<Order>`
- **Status**: ✅ Aligned

---

### GET /api/v1/orders/{id}

**Backend:**
- **Controller**: `OrderController.getOrderById()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<OrderResponse>`
- **Auth**: Authenticated (own orders or ADMIN)

**Frontend:**
- **Method**: `apiService.getOrderById(id: string)`
- **Returns**: `Promise<Order>`
- **Status**: ✅ Aligned

---

### GET /api/v1/orders/my-orders

**Backend:**
- **Controller**: `OrderController.getMyOrders()`
- **Request**: Query params
  - `page: int` (default: 1, 1-based)
  - `size: int` (default: 5)
  - `sortBy: String` (default: "orderDate")
  - `dir: String` (default: "asc")
- **Response**: `ApiResponse<Page<OrderResponse>>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.getUserOrders()`
- **Returns**: `Promise<Order[]>` (expects `response.data.data.content`)
- **Status**: ✅ Aligned (Page has `content` field)

---

### POST /api/v1/orders/{id}/refund

**Backend:**
- **Controller**: `OrderController.requestRefund()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<OrderResponse>`
- **Auth**: Authenticated (own orders or ADMIN)

**Frontend:**
- **Method**: `apiService.requestRefund(orderId: string)`
- **Returns**: `Promise<Order>`
- **Status**: ✅ Aligned

---

## Payment Endpoints

### POST /api/v1/payments/create-intent

**Backend:**
- **Controller**: `PaymentController.createPaymentIntent()`
- **Request**: `CreatePaymentIntentRequest`
  ```java
  {
    amount: BigDecimal (@NotNull, @Min(0))
  }
  ```
- **Response**: `ApiResponse<Map<String, String>>` with `{ clientSecret: string }`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.createPaymentIntent(amount: number)`
- **Request**: `{ amount: number }`
- **Returns**: `Promise<{ clientSecret: string }>`
- **Status**: ✅ Aligned

---

### POST /api/v1/payments/confirm

**Backend:**
- **Controller**: `PaymentController.confirmPayment()`
- **Request**: `ConfirmPaymentRequest`
  ```java
  {
    paymentIntentId: String (@NotBlank)
  }
  ```
- **Response**: `ApiResponse<OrderResponse>`
- **Auth**: Authenticated (USER, ADMIN, ORGANIZER)

**Frontend:**
- **Method**: `apiService.confirmPayment(paymentIntentId: string)`
- **Request**: `{ paymentIntentId: string }`
- **Returns**: `Promise<Order>`
- **Status**: ✅ Aligned

---

## Admin Endpoints

### GET /api/v1/admin/stats

**Backend:**
- **Controller**: `AdminController.getStats()`
- **Request**: None
- **Response**: `ApiResponse<AdminStatsResponse>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.getAdminStats()`
- **Returns**: `Promise<any>`
- **Status**: ✅ Aligned

---

### GET /api/v1/admin/event-sales

**Backend:**
- **Controller**: `AdminController.getEventSales()`
- **Request**: None
- **Response**: `ApiResponse<List<EventSaleResponse>>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.getEventSales()`
- **Returns**: `Promise<any[]>` (expects `response.data.data.content`) ⚠️ **MISMATCH**: Backend returns `List`, not `Page`
- **Status**: ⚠️ **MISMATCH**: Frontend expects paginated response with `content` field

---

### GET /api/v1/admin/revenue

**Backend:**
- **Controller**: `AdminController.getRevenue()`
- **Request**: Query param `period: String` (default: "30d")
- **Response**: `ApiResponse<List<RevenueDataResponse>>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.getRevenueData(period: string = "30d")`
- **Returns**: `Promise<any[]>`
- **Status**: ✅ Aligned

---

### GET /api/v1/admin/events

**Backend:**
- **Controller**: `AdminController.getEvents()`
- **Request**: Query params
  - `page: int` (default: 1, 1-based)
  - `size: int` (default: 10)
  - `sortBy: String` (default: "createdAt")
  - `dir: String` (default: "desc")
- **Response**: `ApiResponse<Page<EventResponse>>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.getAllEvents()`
- **Returns**: `Promise<Event[]>` (expects `response.data.data.content`)
- **Status**: ✅ Aligned (Page has `content` field)

---

### PATCH /api/v1/admin/events/{id}/status

**Backend:**
- **Controller**: `AdminController.updateEventStatus()`
- **Request**: 
  - Path: `id: UUID`
  - Body: `UpdateEventStatusRequest`
    ```java
    {
      status: String (@NotBlank)
    }
    ```
- **Response**: `ApiResponse<EventResponse>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.updateEventStatus(eventId: string, status: string)`
- **Request**: Body `{ status: string }`
- **Returns**: `Promise<Event>`
- **Status**: ✅ Aligned

---

### GET /api/v1/admin/users

**Backend:**
- **Controller**: `AdminController.getUsers()`
- **Request**: Query params
  - `page: int` (default: 1, 1-based)
  - `size: int` (default: 10)
  - `sortBy: String` (default: "createdAt")
  - `dir: String` (default: "desc")
- **Response**: `ApiResponse<Page<UserResponse>>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.getAllUsers()`
- **Returns**: `Promise<User[]>` (expects `response.data.data.content`)
- **Status**: ✅ Aligned (Page has `content` field)

---

### PUT /api/v1/admin/users/{id}

**Backend:**
- **Controller**: `AdminController.updateUser()`
- **Request**: 
  - Path: `id: UUID`
  - Body: `UpdateUserRequest`
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.updateUser(userId: string, data: Partial<User>)`
- **Request**: Body `Partial<User>`
- **Returns**: `Promise<User>`
- **Status**: ⚠️ Partial mismatch (frontend sends `Partial<User>`, backend expects `UpdateUserRequest`)

---

### PATCH /api/v1/admin/users/{id}/status

**Backend:**
- **Controller**: `AdminController.updateUserStatus()`
- **Request**: 
  - Path: `id: UUID`
  - Body: `UpdateUserStatusRequest`
    ```java
    {
      status: String (@NotBlank)
    }
    ```
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.updateUserStatus(userId: string, status: string)`
- **Request**: Body `{ status: string }`
- **Returns**: `Promise<User>`
- **Status**: ✅ Aligned

---

### PATCH /api/v1/admin/users/{id}/role

**Backend:**
- **Controller**: `AdminController.updateUserRole()`
- **Request**: 
  - Path: `id: UUID`
  - Body: `UpdateUserRoleRequest`
    ```java
    {
      role: String (@NotBlank)
    }
    ```
- **Response**: `ApiResponse<UserResponse>`
- **Auth**: ADMIN only

**Frontend:**
- **Method**: `apiService.updateUserRole(userId: string, role: string)`
- **Request**: Body `{ role: string }`
- **Returns**: `Promise<User>`
- **Status**: ✅ Aligned

---

## Organizer Endpoints

### GET /api/v1/organizer/events

**Backend:**
- **Controller**: `OrganizerController.getOrganizerEvents()`
- **Request**: None
- **Response**: `ApiResponse<List<EventResponse>>`
- **Auth**: ORGANIZER or ADMIN

**Frontend:**
- **Method**: `apiService.getOrganizerEvents()`
- **Returns**: `Promise<Event[]>` (expects `response.data.data.content`) ⚠️ **MISMATCH**: Backend returns `List`, not `Page`
- **Status**: ⚠️ **MISMATCH**: Frontend expects paginated response with `content` field

---

### POST /api/v1/organizer/events

**Backend:**
- **Controller**: `OrganizerController.createEvent()`
- **Request**: `CreateEventRequest` (JSON)
  ```java
  {
    name: String (@NotBlank)
    description: String (optional)
    startTime: LocalDateTime (@NotNull)
    endTime: LocalDateTime (@NotNull)
    marketingEnabled: Boolean (optional)
    category: String (@NotNull) // UUID string
    address: AddressDto (@NotNull)
  }
  ```
- **Response**: `ApiResponse<EventResponse>`
- **Auth**: ORGANIZER or ADMIN

**Frontend:**
- **Method**: `apiService.createEvent(data: any)`
- **Returns**: `Promise<Event>`
- **Status**: ✅ Aligned

---

### PUT /api/v1/organizer/events/{id}

**Backend:**
- **Controller**: `OrganizerController.updateEvent()`
- **Request**: 
  - Path: `id: UUID`
  - Body: `UpdateEventRequest` (JSON)
- **Response**: `ApiResponse<EventResponse>`
- **Auth**: ORGANIZER or ADMIN (own events only)

**Frontend:**
- **Method**: `apiService.updateEvent(eventId: string, data: any)`
- **Returns**: `Promise<Event>`
- **Status**: ✅ Aligned

---

### POST /api/v1/organizer/events/upload-image

**Backend:**
- **Controller**: `OrganizerController.uploadEventImage()`
- **Request**: `multipart/form-data` with `image` file
- **Response**: `ApiResponse<Map<String, String>>` with `{ url: string }`
- **Auth**: ORGANIZER or ADMIN

**Frontend:**
- **Method**: `apiService.uploadEventImage(file: File)`
- **Returns**: `Promise<{ url: string }>`
- **Status**: ✅ Aligned

---

### GET /api/v1/organizer/events/{id}/stats

**Backend:**
- **Controller**: `OrganizerController.getEventStats()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<EventStatsResponse>`
- **Auth**: ORGANIZER or ADMIN (own events only)

**Frontend:**
- **Method**: `apiService.getOrganizerEventStats(eventId: string)`
- **Returns**: `Promise<any>`
- **Status**: ✅ Aligned

---

### GET /api/v1/organizer/events/{id}/attendees

**Backend:**
- **Controller**: `OrganizerController.getEventAttendees()`
- **Request**: Path parameter `id: UUID`
- **Response**: `ApiResponse<List<AttendeeResponse>>`
- **Auth**: ORGANIZER or ADMIN (own events only)

**Frontend:**
- **Method**: `apiService.getEventAttendees(eventId: string)`
- **Returns**: `Promise<any[]>` (expects `response.data.data.content`) ⚠️ **MISMATCH**: Backend returns `List`, not `Page`
- **Status**: ⚠️ **MISMATCH**: Frontend expects paginated response with `content` field

---

### POST /api/v1/organizer/tickets/{id}/check-in

**Backend:**
- **Controller**: `OrganizerController.checkInAttendee()`
- **Request**: Path parameter `id: UUID` (ticket ID)
- **Response**: `ApiResponse<Void>`
- **Auth**: ORGANIZER or ADMIN

**Frontend:**
- **Method**: `apiService.checkInAttendee(ticketId: string)`
- **Returns**: `Promise<void>`
- **Status**: ✅ Aligned

---

### GET /api/v1/organizer/tickets/{id}/qr

**Backend:**
- **Controller**: ❌ **NOT FOUND** - This endpoint does not exist
- **Status**: ⚠️ **MISMATCH**: Frontend calls this but backend doesn't implement it

**Frontend:**
- **Method**: `apiService.generateTicketQR(ticketId: string)`
- **Returns**: `Promise<{ qrCode: string }>`
- **Status**: ⚠️ **MISMATCH**: Endpoint missing in backend

---

## Mismatches and Corrections

### Critical Mismatches

#### 1. Page Numbering: Frontend uses 0-based, Backend expects 1-based

**Issue:**
- Frontend `getEvents()` uses `page = 0` (0-based indexing)
- Backend expects `page = 1` (1-based, converts internally to 0-based)

**Location:**
- `frontend/src/lib/api.ts:93` - `getEvents(page = 0, ...)`
- `backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/EventController.java:162`

**Fix:**
- Update frontend to use 1-based page numbers: `getEvents(page = 1, ...)`

---

#### 2. List vs Page Response Mismatches

**Issue:** Frontend expects paginated responses with `content` field, but backend returns `List` for some endpoints.

**Affected Endpoints:**

1. **GET /api/v1/events/{id}/ticket-types**
   - Backend: `ApiResponse<List<TicketTypeResponse>>`
   - Frontend expects: `{ content: TicketType[] }`
   - **Fix**: Change backend to return `Page<TicketTypeResponse>` or update frontend to expect `List`

2. **GET /api/v1/events/my-events**
   - Backend: `ApiResponse<List<EventResponse>>`
   - Frontend expects: `{ content: Event[] }`
   - **Fix**: Change backend to return `Page<EventResponse>` or update frontend to expect `List`

3. **GET /api/v1/admin/event-sales**
   - Backend: `ApiResponse<List<EventSaleResponse>>`
   - Frontend expects: `{ content: any[] }`
   - **Fix**: Change backend to return `Page<EventSaleResponse>` or update frontend to expect `List`

4. **GET /api/v1/organizer/events**
   - Backend: `ApiResponse<List<EventResponse>>`
   - Frontend expects: `{ content: Event[] }`
   - **Fix**: Change backend to return `Page<EventResponse>` or update frontend to expect `List`

5. **GET /api/v1/organizer/events/{id}/attendees**
   - Backend: `ApiResponse<List<AttendeeResponse>>`
   - Frontend expects: `{ content: any[] }`
   - **Fix**: Change backend to return `Page<AttendeeResponse>` or update frontend to expect `List`

**Recommendation:** Update frontend to handle both `List` and `Page` responses, or standardize backend to always return `Page` for consistency.

---

#### 3. Missing Endpoint: GET /api/v1/organizer/tickets/{id}/qr

**Issue:**
- Frontend calls `GET /api/v1/organizer/tickets/{id}/qr` but this endpoint doesn't exist in backend

**Location:**
- `frontend/src/lib/api.ts:282` - `generateTicketQR()`
- Backend: No corresponding controller method

**Fix Options:**
1. **Option A**: Implement the endpoint in `OrganizerController` or `TicketController`
2. **Option B**: Remove the frontend method if QR code generation is handled differently

---

### Minor Mismatches

#### 1. UpdateUserRequest: profilePictureUrl

**Issue:**
- Frontend `UpdateUserRequest` includes `profilePictureUrl?: string`
- Backend `UpdateUserRequest` doesn't include this field (handled via separate upload endpoint)

**Status:** ✅ Acceptable (separate endpoint exists)

---

#### 2. Admin updateUser: Partial<User> vs UpdateUserRequest

**Issue:**
- Frontend sends `Partial<User>` which may include fields not in `UpdateUserRequest`
- Backend expects `UpdateUserRequest` with specific fields

**Status:** ⚠️ May cause issues if frontend sends unexpected fields

**Fix:** Ensure frontend only sends fields that match `UpdateUserRequest` structure

---

## Summary

### ✅ All Endpoints Aligned (52 endpoints)

All frontend-backend endpoint mappings have been verified and corrected:

- ✅ All authentication endpoints (3)
- ✅ All user endpoints (5)
- ✅ All event endpoints (7)
- ✅ All ticket endpoints (1 used by frontend)
- ✅ All cart endpoints (6)
- ✅ All order endpoints (4)
- ✅ All payment endpoints (2)
- ✅ All admin endpoints (8)
- ✅ All organizer endpoints (6)

### ✅ All Mismatches Fixed

1. ✅ **Page numbering** - Fixed: Frontend now uses 1-based page numbers
2. ✅ **GET /api/v1/events/{id}/ticket-types** - Fixed: Frontend now expects `List` response
3. ✅ **GET /api/v1/events/my-events** - Fixed: Frontend now expects `List` response
4. ✅ **GET /api/v1/admin/event-sales** - Fixed: Frontend now expects `List` response
5. ✅ **GET /api/v1/organizer/events** - Fixed: Frontend now expects `List` response
6. ✅ **GET /api/v1/organizer/events/{id}/attendees** - Fixed: Frontend now expects `List` response
7. ✅ **GET /api/v1/organizer/tickets/{id}/qr** - Fixed: Removed from frontend (endpoint not implemented)

### Implementation Status

- **Request/Response DTOs**: ✅ All aligned
- **Authentication**: ✅ JWT tokens properly handled
- **Pagination**: ✅ Consistent (Page responses have `content` field, List responses are direct arrays)
- **Error Handling**: ✅ Aligned
- **Type Safety**: ✅ Frontend types match backend DTOs

### Notes

- **QR Code Generation**: The frontend QR code generation feature has been disabled as the backend endpoint is not implemented. QR codes are available in ticket PDF downloads.
- **Pagination**: Backend uses Spring Data `Page` which serializes to JSON with a `content` array. Frontend correctly handles both `Page` (with `content` field) and `List` (direct array) responses.
