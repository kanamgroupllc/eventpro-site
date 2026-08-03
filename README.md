# KanamEvents Platform

A comprehensive full-stack event ticketing platform built with a **Spring Boot modular monolith** and **SQS-triggered AWS Lambda functions**. **KanamEvents** enables event organizers to create, manage, and sell tickets for events while providing customers with a seamless experience to discover, purchase, and attend events.

> **Product name:** KanamEvents (formerly EventPro / Access Plus). Internal module paths (`eventpro-*`, `com.accessplus.eventpro`) are unchanged for now.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Features](#core-features)
6. [Services & Infrastructure](#services--infrastructure)
7. [Getting Started](#getting-started)
8. [Local Development](#local-development)
9. [API Documentation](#api-documentation)
10. [Additional Resources](#additional-resources)

---

## Overview

KanamEvents is a modern event ticketing platform designed to handle the complete lifecycle of event management and ticket sales. The platform supports:

- **Event Management**: Create, update, and manage events with rich metadata
- **Ticket Sales**: Multiple ticket types (VIP, Regular, Early Bird) with dynamic pricing
- **User Management**: Role-based access control (Admin, Organizer, User) with authentication
- **Shopping Cart & Checkout**: Cart management and order creation (checkout UI exists; end-to-end payment UI flow is still being finalized)
- **Payment Processing**: Stripe integration in both API and async processors (payment architecture is currently in transition)
- **Notifications**: Multi-channel notifications (Email, SMS, In-App, Push)
- **Search & Discovery**: Advanced event search and filtering capabilities
- **Async Processing**: Event-driven order processing, payment processing, and notifications via Lambda functions

### Key Characteristics

- **Modular Monolith**: Single deployable unit with clear module boundaries
- **Serverless Functions**: Spring Boot 4 + Spring Cloud Function Lambda processors for async workflows
- **Shared Types Migration**: `backend/shared` is deprecated; services/lambdas now mostly use local copies of shared models/entities
- **Cloud-Native**: Built for AWS with infrastructure as code
- **Scalable**: Designed to scale from startup to enterprise
- **Secure**: JWT authentication (RS256), role-based authorization, encrypted data
- **Developer-Friendly**: Hot reload, comprehensive testing, clear documentation

### Current Repository State (Important)

- **Production AWS Terraform is split by component**:
  - `backend/services/terraform/`
  - `eventpro-frontend/terraform/`
  - `backend/lambdas/*/terraform/`
- **Legacy module-based Terraform** still exists under `infrastructure/` (used by older docs/workflows and local-stack-oriented flows)
- **Lambdas are Spring Boot container images** (some diagrams/older sections below still show historical Quarkus labels)
- **CI/CD is transitional**: component GitHub workflows exist; top-level `.github/workflows/deploy.yml` currently only detects changes
- **Known app gaps**: production CORS for workspace domains and frontend checkout payment submission wiring still need completion

---

## Architecture

### Comprehensive Architecture Diagram

Note: The detailed diagrams in this section contain some historical labels (for example, Quarkus lambdas and shared module references). The current implementation uses Spring Boot-based lambdas and component-scoped Terraform.

<details>
<summary>Click to expand - Complete Service-to-Service Communication</summary>

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER (Browser)                                    │
│                    React Frontend (Port 5173)                               │
│                    - Authentication (JWT via backend)                       │
│                    - API Calls (Axios with JWT)                             │
│                    - State Management (Redux Toolkit)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌───────────────────┐  ┌───────────────┐  ┌───────────────┐
        │  Auth (JWT)       │  │  Backend API  │  │  AWS S3       │
        │  (Spring Boot)    │  │  (Spring Boot)│  │  (LocalStack) │
        │                   │  │  Port 8080    │  │               │
        │ - Sign Up/In      │  │               │  │ - Images      │
        │ - JWT Tokens      │  │ Controllers:  │  │ - PDFs        │
        │ - Password Reset  │  │ - Auth        │  │               │
        │ - Roles (ADMIN/   │  │ - Users       │  │               │
        │   ORG/USER)       │  │ - Events      │  │               │
        └───────────────────┘  │ - Tickets     │  └───────────────┘
                               │ - Cart        │         ▲
                               │ - Orders      │         │
                               │ - Payments    │         │
                               │ - Admin       │         │
                               │ - Organizer   │         │
                               └───────────────┘         │
                                    │                    │
                    ┌───────────────┼────────────────────┘
                    │               │
                    ▼               ▼
        ┌───────────────────┐  ┌───────────────┐
        │  PostgreSQL       │  │  AWS SQS      │
        │  (RDS/Docker)     │  │  (LocalStack) │
        │                   │  │               │
        │ - Users           │  │ - order-queue │
        │ - Events          │  │ - payment-q   │
        │ - Tickets         │  │ - notify-q    │
        │ - Orders          │  │ - DLQs        │
        │ - Cart            │  │               │
        │ - Notifications   │  └───────────────┘
        └───────────────────┘         │
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌───────────────────┐  ┌───────────────┐  ┌───────────────┐
        │ Order Processor   │  │ Payment Proc. │  │ Notification  │
        │ Lambda (Quarkus)  │  │ Lambda        │  │ Sender Lambda │
        │                   │  │ (Quarkus)     │  │ (Quarkus)     │
        │ - Validates       │  │               │  │               │
        │ - Reserves tickets│  │ - Stripe API  │  │ - Email (SES) │
        │ - Publishes to    │  │ - Updates DB  │  │ - SMS (SNS)   │
        │   payment-queue   │  │ - Publishes   │  │ - In-App      │
        └───────────────────┘  │   to notify-q │  └───────────────┘
                               └───────────────┘         │
                                      │                  │
                                      │                  │
                    ┌─────────────────┴──────────────────┘
                    │
                    ▼
        ┌───────────────────┐  ┌───────────────┐
        │  AWS SES          │  │  AWS SNS      │
        │  (LocalStack)     │  │  (LocalStack) │
        │                   │  │               │
        │ - Email Delivery  │  │ - SMS Delivery│
        └───────────────────┘  └───────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │  Stripe API       │
        │  (External)       │
        │                   │
        │ - Payment Intents │
        │ - Confirmations   │
        │ - Refunds         │
        └───────────────────┘
```

</details>

### Complete User Flow: Order Processing

<details>
<summary>Click to expand - Step-by-Step Order Processing Flow</summary>

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE ORDER PROCESSING FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER ADDS ITEMS TO CART
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/cart/items
   └──────┬──────┘
          │ JWT Token
          ▼
   ┌─────────────┐
   │  Backend    │ → CartController.addItemsToCart()
   │  API        │ → CartService.addItemToCart()
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ PostgreSQL  │ INSERT INTO cart_items
   └─────────────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ ← 200 OK (Cart updated)
   └─────────────┘

2. USER INITIATES CHECKOUT
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/payments/create-intent
   └──────┬──────┘
          │ { amount: 150.00 }
          ▼
   ┌─────────────┐
   │  Backend    │ → PaymentController.createPaymentIntent()
   │  API        │ → PaymentService.createPaymentIntent()
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Stripe API  │ Create PaymentIntent
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ ← { clientSecret: "pi_xxx_secret_yyy" }
   └─────────────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ Stripe.js confirms payment
   │  (Stripe.js)│
   └──────┬──────┘
          │ paymentIntentId
          ▼
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/payments/confirm
   └──────┬──────┘
          │ { paymentIntentId: "pi_xxx" }
          ▼
   ┌─────────────┐
   │  Backend    │ → PaymentController.confirmPayment()
   │  API        │ → PaymentService.processPayment()
   └──────┬──────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
   ┌─────────────┐  ┌─────────────┐
   │ Stripe API  │  │ OrderService│
   │ Confirm     │  │ createOrder │
   └──────┬──────┘  └──────┬──────┘
          │                 │
          │                 ▼
          │         ┌─────────────┐
          │         │ PostgreSQL  │ INSERT INTO orders (status: PENDING)
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │  Backend    │ → SQSMessagePublisher.publishOrderMessage()
          │         │  API        │
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │  AWS SQS    │ OrderMessage published
          │         │ order-queue │
          │         └─────────────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ ← 200 OK { order: { id, status: "PENDING" } }
   └─────────────┘

3. ASYNC ORDER PROCESSING (Background)
   ┌─────────────┐
   │  AWS SQS    │ SQS Event triggers Lambda
   │ order-queue │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Order Proc. │ → OrderProcessorHandler.handleRequest()
   │ Lambda      │ → OrderProcessorService.processOrder()
   └──────┬──────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
   ┌─────────────┐  ┌─────────────┐
   │ PostgreSQL  │  │ Validate    │
   │ Load Order  │  │ & Reserve   │
   └──────┬──────┘  │ Tickets     │
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │ PostgreSQL  │ UPDATE tickets (status: RESERVED)
          │         │             │ UPDATE orders (status: PENDING)
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │ Order Proc. │ → SQSPublisher.publishPaymentMessage()
          │         │ Lambda      │
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │  AWS SQS    │ PaymentMessage published
          │         │ payment-q   │
          │         └─────────────┘

4. ASYNC PAYMENT PROCESSING (Background)
   ┌─────────────┐
   │  AWS SQS    │ SQS Event triggers Lambda
   │ payment-q   │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Payment     │ → PaymentProcessorHandler.handleRequest()
   │ Proc. Lambda│ → PaymentProcessorService.processPayment()
   └──────┬──────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
   ┌─────────────┐  ┌─────────────┐
   │ PostgreSQL  │  │ Stripe API  │ Confirm payment
   │ Load Order  │  │             │
   └──────┬──────┘  └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │ Payment     │ → StripeService.confirmPaymentIntent()
          │         │ Proc. Lambda│
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │ PostgreSQL  │ UPDATE orders (status: PAID)
          │         │             │ UPDATE tickets (status: SOLD, purchaser_id)
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │ Payment     │ → SQSPublisher.publishNotificationMessage()
          │         │ Proc. Lambda│
          │         └──────┬──────┘
          │                │
          │                ▼
          │         ┌─────────────┐
          │         │  AWS SQS    │ NotificationMessage published
          │         │ notify-q    │
          │         └─────────────┘

5. ASYNC NOTIFICATION SENDING (Background)
   ┌─────────────┐
   │  AWS SQS    │ SQS Event triggers Lambda
   │ notify-q    │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Notification│ → NotificationSenderHandler.handleRequest()
   │ Sender      │ → NotificationSenderService.sendNotification()
   │ Lambda      │
   └──────┬──────┘
          │
          ├─────────────────┬─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │  AWS SES    │  │  AWS SNS    │  │ PostgreSQL  │
   │ Send Email  │  │ Send SMS    │  │ Store In-App│
   └──────┬──────┘  └──────┬──────┘  └─────────────┘
          │                │
          ▼                ▼
   ┌─────────────┐  ┌─────────────┐
   │ User Email  │  │ User Phone  │
   └─────────────┘  └─────────────┘

6. USER CHECKS ORDER STATUS (Polling)
   ┌─────────────┐
   │   Frontend  │ GET /api/v1/orders/{id}
   └──────┬──────┘
          │ JWT Token
          ▼
   ┌─────────────┐
   │  Backend    │ → OrderController.getOrderById()
   │  API        │ → OrderService.getOrderById()
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ PostgreSQL  │ SELECT * FROM orders WHERE id = ?
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ ← { order: { id, status: "PAID", ... } }
   └─────────────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ Display: "Order Confirmed! Check your email."
   └─────────────┘
```

</details>

### Authentication Flow

<details>
<summary>Click to expand - Complete Authentication Flow</summary>

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER SIGN UP
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/auth/signup
   └──────┬──────┘
          │ { email, password, role }
          ▼
   ┌─────────────┐
   │  Backend    │ → AuthController.signUp()
   │  API        │ → AuthService.signUp()
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ PostgreSQL  │ INSERT INTO users (password_hash, role, ...)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ ← { user: { id, email, role, ... } }
   └─────────────┘

2. USER LOGIN
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/auth/login
   └──────┬──────┘
          │ { email, password }
          ▼
   ┌─────────────┐
   │  Backend    │ → AuthController.login()
   │  API        │ → AuthService.login()
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Backend    │ Generate JWT access token (RS256)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ Store token in localStorage
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Frontend  │ ← { accessToken, user, expiresIn }
   └─────────────┘

3. SUBSEQUENT API CALLS
   ┌─────────────┐
   │   Frontend  │ GET /api/v1/events
   └──────┬──────┘
          │ Authorization: Bearer <accessToken>
          ▼
   ┌─────────────┐
   │  Backend    │ → JwtAuthenticationFilter
   │  API        │ → Validate JWT with public key
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ If valid:   │ Process request
   └─────────────┘
```

</details>

### Image Upload Flow

<details>
<summary>Click to expand - Image Upload Flow</summary>

```txt
┌─────────────────────────────────────────────────────────────────────────────┐
│                          IMAGE UPLOAD FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER UPLOADS PROFILE PICTURE
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/users/upload-profile-picture
   └──────┬──────┘
          │ FormData { image: File }
          │ JWT Token
          ▼
   ┌─────────────┐
   │  Backend    │ → UserController.uploadProfilePicture()
   │  API        │ → AWSS3ImageService.uploadImage()
   └──────┬──────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
   ┌─────────────┐  ┌─────────────┐
   │ Validate    │  │ Generate    │
   │ Image File  │  │ S3 Key      │
   └─────────────┘  └──────┬──────┘
                           │
                           ▼
                   ┌─────────────┐
                   │  AWS S3     │ PUT Object
                   │ (LocalStack)│ profile-pictures/{userId}/{filename}
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  AWS S3     │ Return URL
                   │             │ http://localhost:4566/eventpro-images-local/...
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ UserService │ UPDATE users SET profile_picture_url = ?
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ PostgreSQL  │ UPDATE users
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Frontend  │ ← { url: "http://..." }
                   └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Frontend  │ Display image from S3 URL
                   └─────────────┘

2. ORGANIZER UPLOADS EVENT IMAGE
   ┌─────────────┐
   │   Frontend  │ POST /api/v1/events (multipart/form-data)
   └──────┬──────┘
          │ { request: JSON, imageFile: File }
          │ JWT Token
          ▼
   ┌─────────────┐
   │  Backend    │ → EventController.createEvent()
   │  API        │ → EventService.createEvent()
   └──────┬──────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
   ┌─────────────┐  ┌─────────────┐
   │ Validate    │  │ Generate    │
   │ Image File  │  │ S3 Key      │
   └─────────────┘  └──────┬──────┘
                           │
                           ▼
                   ┌─────────────┐
                   │  AWS S3     │ PUT Object
                   │             │ event-images/{eventId}/{filename}
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ EventService│ UPDATE events SET image_url = ?
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ PostgreSQL  │ INSERT INTO events
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Frontend  │ ← { event: { id, imageUrl: "http://..." } }
                   └─────────────┘
```

</details>

### High-Level Architecture

<details>
<summary>Click to expand</summary>

```txt
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript + Vite)           │
│              Deployed on S3 + CloudFront CDN                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Application Load Balancer (ALB)                     │
│         - SSL/TLS Termination                               │
│         - Request Routing                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│    EventPro API (Modular Monolith - Spring Boot 4.0.0)      │
│    ECS Fargate - Single Service                             │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Core Module │  │ Event Module │  │ Order Module │       │
│  │  (Users,     │  │ (Search,     │  │ (Cart,       │       │
│  │   Auth)      │  │  Tickets)    │  │  Checkout)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │Payment Module│  │Notification  │                         │
│  │ (Stripe)     │  │  Module      │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         PostgreSQL (RDS Multi-AZ)                           │
│         - All entities in single database                   │
│         - Module boundaries via package structure           │
│         - Flyway for database migrations                    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │  AWS SQS     │    │  AWS SES     │
            │  (Queues)    │    │  (Email)     │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐   ┌──────────────┐
        │  Lambda Functions │   │  AWS SNS     │
        │  (Quarkus)        │   │  (SMS)       │
        │  - Order Processor│   └──────────────┘
        │  - Payment Proc.  │
        │  - Notification   │
        └───────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │  AWS S3      │
            │  (Images)    │
            └──────────────┘
```

</details>

### Architecture Pattern: Modular Monolith + Serverless

EventPro uses a **Modular Monolith** architecture for the main API service, combined with **Serverless Lambda Functions** for async processing:

**Main API Service (Spring Boot):**

- ✅ **Single Build System**: Spring Boot modular monolith for the primary API
- ✅ **Simplified Deployment**: One Docker image, one ECS service
- ✅ **Easier Development**: Single application to run locally
- ✅ **Lower Costs**: ~$81/month vs ~$170/month (52% reduction)
- ✅ **Future-Proof**: Can extract modules to microservices when needed

**Lambda Functions (Spring Boot + Spring Cloud Function):**

- ✅ **Framework Consistency**: Same framework family as the backend API
- ✅ **Cost-Effective**: Pay per invocation
- ✅ **Auto-Scaling**: Handles traffic spikes automatically
- ✅ **Event-Driven**: SQS-triggered async processing

**Shared Code Strategy (Current):**

- `backend/shared/` remains in the repo for reference/backward compatibility
- Active services and lambdas have been moving to component-local copies of shared entities/models/enums
- This reduces cross-component build coupling at the cost of intentional duplication

**Module Communication:**

- **Within Monolith**: Direct method calls, Spring Dependency Injection, Spring Events
- **Async Processing**: SQS queues → Lambda functions (Order Processor, Payment Processor, Notification Sender)
- **External**: REST API, Database (PostgreSQL), AWS Services (SQS, SES, SNS, S3)

**When to Extract to Microservices:**

- Multiple teams need independent deployment cycles
- Clear scaling differences between modules
- Technology diversity requirements
- Service boundaries are well-defined and stable

---

## Technology Stack

<details>

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Java** | 25 | Programming language |
| **Spring Boot** | 4.0.x | Application framework (API + Lambdas) |
| **Spring Cloud Function AWS** | 4.0.5 | AWS Lambda adapter for Java Lambdas |
| **Gradle** | 9.2.1 | Build tool |
| **PostgreSQL** | 16+ | Primary database |
| **Spring Data JPA** | - | Database access layer |
| **Spring Security** | - | Security framework |
| **AWS SDK** | 2.38.7 | AWS service integration |
| **Flyway** | - | Database migrations |
| **JUnit 5** | - | Testing framework |
| **JaCoCo** | - | Code coverage |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.x | UI framework |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |
| **Vite** | 7.x | Build tool & dev server |
| **React Context + TanStack Query** | - | State/data management |
| **React Router** | 6.x | Client-side routing |
| **shadcn/ui** | - | UI component library |
| **Tailwind CSS** | 3.4.18 | Utility-first CSS |
| **Radix UI** | - | Accessible UI primitives |
| **Vitest** | 2.1.8 | Testing framework |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| **Terraform** | 1.12+ | Infrastructure as Code |
| **AWS Provider** | 6.31.x | AWS resource management |
| **Docker** | - | Containerization |
| **Docker Compose** | - | Local development orchestration |
| **LocalStack** | 4.10.0 | AWS service emulation |

### AWS Services

| Service | Purpose |
|---------|---------|
| **ECS Fargate** | Container orchestration for backend |
| **Lambda** | Serverless functions (Order, Payment, Notification processing) |
| **RDS PostgreSQL** | Managed database (Multi-AZ) |
| **S3** | Image storage for events |
| **CloudFront** | CDN for frontend static assets (images handling varies by environment) |
| **ALB** | Application Load Balancer |
| **Route53** | DNS management |
| **Secrets Manager** | Secure credential storage |
| **SES** | Email notifications |
| **SNS** | SMS notifications |
| **SQS** | Message queuing (for async processing) |
| **ECR** | Container registry for Lambda images |

---

</details>

## Project Structure

<details>
<summary>Click to expand</summary>

```txt
eventpro-site/
├── backend/
│   ├── services/                      # Spring Boot modular monolith (API)
│   │   ├── modules/
│   │   │   ├── eventpro-core/
│   │   │   ├── eventpro-event/
│   │   │   ├── eventpro-order/
│   │   │   ├── eventpro-payment/
│   │   │   └── eventpro-api/         # Main application entrypoint/controllers
│   │   ├── terraform/                # AWS infra for API/RDS/SQS/ALB/ECS
│   │   └── Dockerfile
│   ├── lambdas/                      # Spring Boot Lambda container functions
│   │   ├── order-processor/
│   │   │   └── terraform/
│   │   ├── payment-processor/
│   │   │   └── terraform/
│   │   ├── notification-sender/
│   │   │   └── terraform/
│   │   └── secret-rotation/          # Python Lambda (separate utility)
│   └── shared/                       # Deprecated shared module (kept for reference)
├── eventpro-frontend/                # React + TypeScript frontend
│   ├── src/
│   ├── terraform/                    # S3 + CloudFront + Route53
│   └── package.json
├── infrastructure/                   # Legacy/alternative Terraform stacks + modules
│   ├── environments/
│   └── modules/
├── docs/                             # Project docs (lambda, infra, research)
├── .github/                          # GitHub Actions (component workflows + composite actions)
├── docker-compose.yml
├── Makefile
├── LOCAL_DEVELOPMENT_GUIDE.md
├── microservice-terraform-refactor.md
├── lambda-quarkus-to-springboot.md
└── README.md
```

</details>

### Module Breakdown

<details>
<summary>Click to expand</summary>

#### Backend Services Modules (Spring Boot)

1. **eventpro-core**
   - User management (CRUD operations)
   - Authentication/Authorization (JWT)
   - Role management (ADMIN, ORGANIZER, USER)
   - Common utilities, exceptions, and base entities
   - JWT token validation and security configuration

2. **eventpro-event**
   - Event CRUD operations
   - Ticket management (VIP, Regular, Early Bird)
   - Event search and filtering
   - Category management
   - QR code generation for tickets

3. **eventpro-order**
   - Shopping cart management
   - Order creation and processing
   - Checkout flow
   - Order history
   - SQS message publishing for async processing

4. **eventpro-payment**
   - Stripe payment integration
   - Payment processing
   - Webhook handling
   - Payment status management

5. **eventpro-api**
   - REST API controllers
   - DTOs (Data Transfer Objects)
   - API configuration
   - Main application entry point
   - Global exception handling

#### Lambda Functions (Spring Boot container images)

1. **order-processor**
   - Processes orders from SQS queue
   - Validates orders and reserves tickets
   - Publishes to payment queue
   - Uses local copies of required entities/models/enums (shared module decoupling)

2. **payment-processor**
   - Processes payments from SQS queue
   - Stripe payment integration
   - Updates order status
   - Publishes to notification queue

3. **notification-sender**
   - Sends notifications from SQS queue
   - Email (SES) and SMS (SNS) delivery
   - In-app notification currently simulated/logged

#### `backend/shared` (Deprecated Reference Module)

- Still present in the repo for reference/history
- No longer the primary dependency path for current services/lambdas
- Active code has been moved/copied into component-local packages in most runtime paths

</details>

## Core Features

<details>
<summary>Click to expand</summary>

### User Management

- User registration and authentication (Email/Password, OAuth - planned)
- Role-based access control (ADMIN, ORGANIZER, USER)
- User profile management
- Account settings and preferences

### Event Management

- Create, update, and delete events
- Event categorization (Music, Sports, Arts & Crafts, etc.)
- Event search and filtering
- Event image upload and management
- Marketing enablement per event

### Ticket Management

- Multiple ticket types (VIP, Regular, Early Bird)
- Dynamic pricing
- Ticket availability tracking
- QR code generation for tickets
- Ticket status management (Available, Sold, Reserved)

### Shopping & Orders

- Shopping cart functionality
- Add/remove/update cart items
- Secure checkout process
- Order history and tracking
- Order confirmation
- Async order processing via Lambda

### Payment Processing

- Stripe integration for secure payments
- Payment status tracking
- Payment webhook handling
- Async payment processing via Lambda
- Refund processing (future)

### Notifications

- Email notifications (order confirmations, event reminders)
- SMS notifications (optional)
- In-app notifications
- Async notification delivery via Lambda
- Notification preferences management

### Search & Discovery

- Full-text event search
- Category-based filtering
- Upcoming events discovery
- Event recommendations (future)

</details>

## Services & Infrastructure

### AWS Services Used

<details>
<summary>Click to expand</summary>

#### Compute

- **ECS Fargate**: Hosts the EventPro API backend service
  - Auto-scaling based on CPU/memory metrics
  - Multi-AZ deployment for high availability

- **Lambda**: Serverless functions for async processing
  - Order Processor (Spring Boot + Spring Cloud Function)
  - Payment Processor (Spring Boot + Spring Cloud Function)
  - Notification Sender (Spring Boot + Spring Cloud Function)
  - Container images deployed via ECR

#### Database

- **RDS PostgreSQL**: Primary database
  - Automated backups
  - Point-in-time recovery
  - Multi-AZ is configurable (not enabled by default in current component Terraform)
  - Read replicas (optional/future)

#### Storage

- **S3**: Event image storage
  - Bucket is private in current component Terraform (public access blocked)
  - CORS configured for frontend + local development origins

- **ECR**: Container registry
  - Lambda function images
  - Versioned deployments

#### Networking

- **VPC**:
  - Current component Terraform (`backend/services/terraform`) uses the AWS **default VPC**
  - Legacy module-based `infrastructure/` stack can provision a custom VPC
- **ALB**: Application Load Balancer
  - SSL/TLS termination
  - Health checks
  - Request routing
- **Route53**: DNS management
  - Domain name resolution
  - Health check routing

#### Security

- **JWT Authentication**: RS256 tokens issued by the backend API
  - Passwords hashed with BCrypt
  - Role-based access control
- **Secrets Manager**: Secure credential storage
  - Database credentials
  - API keys

#### Messaging & Notifications

- **SES**: Email notifications
  - Transactional emails
  - Email templates
- **SNS**: SMS notifications
  - SMS delivery
  - Topic subscriptions
- **SQS**: Message queuing
  - Order queue (order processing)
  - Payment queue (payment processing)
  - Notification queue (notifications)
  - LocalStack/local infra flow provisions DLQs; current component AWS Terraform queues do not create DLQs by default

#### CDN

- **CloudFront**: Content delivery network
  - Frontend static assets
  - Event images
  - Caching and performance optimization

</details>

### Local Development Services

For local development, the following services are used:

- **PostgreSQL (Docker)**: Local database
- **LocalStack (Docker)**: AWS service emulation
  - S3, SQS, Secrets Manager, SES, SNS
- **Docker Compose**: Service orchestration

---

## Getting Started

### Prerequisites

- **Java 25** - [Download](https://adoptium.net/)
- **Node.js 22+** and **npm** - [Download](https://nodejs.org/)
- **Docker** and **Docker Compose** - [Download](https://www.docker.com/get-started)
- **Terraform 1.12+** - [Download](https://www.terraform.io/downloads)
- **Make** - Usually pre-installed on macOS/Linux
- **AWS CLI** - [Download](https://aws.amazon.com/cli/) (optional, for testing LocalStack)
- **OpenSSL** - Required for generating JWT RSA keys

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd eventpro-site
   ```

2. **Start local development environment**

   ```bash
   # Provision infrastructure (LocalStack resources)
   make local-infra
   
   # Start all services
   make local-up
   ```

3. **Access the application**
   - Frontend: <http://localhost:5173>
   - Backend API: <http://localhost:8080>
   - Health Check: <http://localhost:8080/actuator/health>
   - Swagger UI: <http://localhost:8080/swagger-ui/index.html>

### Build Commands

**Backend Services:**

```bash
cd backend/services
./gradlew build          # Build all modules
./gradlew test           # Run all tests
./gradlew :eventpro-api:bootRun  # Run application
```

**Lambda Functions:**

```bash
cd backend/lambdas/order-processor
./gradlew build          # Build Lambda function
./gradlew test           # Run tests
```

**Shared Module (Deprecated / Reference Only):**

```bash
cd backend/shared
./gradlew build          # Optional: build deprecated shared module for reference/testing
```

**Frontend:**

```bash
cd eventpro-frontend
npm install              # Install dependencies
npm run dev              # Start development server
npm run build            # Build for production
npm test                 # Run tests
```

**Docker:**

```bash
# Build backend services image
docker image build -t eventpro-api:latest -f backend/services/Dockerfile backend

# Build Lambda image
docker image build -t eventpro-order-processor:latest -f backend/lambdas/order-processor/Dockerfile backend
```

---

## Local Development

For comprehensive local development setup, testing, and troubleshooting instructions, see:

📖 **[LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md)**

The local development guide covers:

- Detailed setup instructions
- JWT authentication using local RSA keys
- Step-by-step configuration
- Testing procedures
- Troubleshooting common issues
- Makefile commands reference
- Service management

### If Docker Desktop won't start

Docker Desktop sometimes fails to start on macOS (e.g. "Docker Desktop is unable to start"). You can:

1. **Fix Docker:** Restart your Mac, ensure you have the latest Docker Desktop for your macOS version, and in Docker Desktop → Settings → Resources give it enough CPU/Memory. See [Docker docs](https://docs.docker.com/desktop/install/mac-install/).
2. **Run the backend without Docker** (so the mobile app can hit the API):
   - **Java 25** is required (backend uses JDK 25). Install via [SDKMAN](https://sdkman.io/) or your preferred method.
   - **PostgreSQL** must be running locally. Install with Homebrew: `brew install postgresql@16` and start it, then create the DB:
     ```bash
     createuser -s eventpro 2>/dev/null || true
     createdb -O eventpro eventpro 2>/dev/null || true
     # If your postgres user has a password, set PGPASSWORD or use psql to create user/db.
     ```
   - **Environment:** From the repo root, ensure `.env` exists with at least `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (see [JWT Keys](#jwt-keys-required-for-local-auth) below). For local run set:
     ```bash
     export SPRING_PROFILES_ACTIVE=local
     export DB_HOST=localhost
     export DB_PORT=5432
     export DB_NAME=eventpro
     export DB_USERNAME=eventpro
     export DB_PASSWORD=eventpro
     ```
   - **Run the API:**
     ```bash
     cd backend/services && ./gradlew :eventpro-api:bootRun
     ```
   - The API will be at `http://localhost:8080`. Point the mobile app at that URL (e.g. `EXPO_PUBLIC_API_URL=http://localhost:8080` in `eventpro-mobile/.env` for simulator).

### JWT Keys (Required for Local Auth)

Generate an RSA key pair and set the environment variables in the root `.env` file:

```bash
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem

# macOS
JWT_PRIVATE_KEY=$(openssl pkcs8 -topk8 -inform PEM -outform DER -in jwt-private.pem -nocrypt | base64 | tr -d '\n')
JWT_PUBLIC_KEY=$(openssl rsa -in jwt-private.pem -pubout -outform DER | base64 | tr -d '\n')

# Linux
JWT_PRIVATE_KEY=$(openssl pkcs8 -topk8 -inform PEM -outform DER -in jwt-private.pem -nocrypt | base64 -w0)
JWT_PUBLIC_KEY=$(openssl rsa -in jwt-private.pem -pubout -outform DER | base64 -w0)
```

```bash
JWT_ISSUER=eventpro
JWT_ACCESS_TTL_SECONDS=3600
JWT_PRIVATE_KEY=<value from command above>
JWT_PUBLIC_KEY=<value from command above>
```

### Quick Reference

| Service | URL | Port |
|---------|-----|------|
| Frontend | <http://localhost:5173> | 5173 |
| Backend API | <http://localhost:8080> | 8080 |
| Health Check | <http://localhost:8080/actuator/health> | 8080 |
| Swagger UI | <http://localhost:8080/swagger-ui/index.html> | 8080 |
| LocalStack | <http://localhost:4566> | 4566 |
| PostgreSQL | localhost:5432 | 5432 |

| JWT Configuration |
|------------------|
| Set `JWT_PUBLIC_KEY` and `JWT_PRIVATE_KEY` in `.env` |
| Optional: `JWT_ISSUER`, `JWT_ACCESS_TTL_SECONDS` |

---

## API Documentation

### Base URL

All API endpoints are prefixed with `/api/v1`

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```txt
Authorization: Bearer <jwt_token>
```

### Available Endpoints

Note: Swagger/OpenAPI (`/swagger-ui/index.html`) is the source of truth. The static list below is a quick reference and may lag behind the implementation.

<details>
<summary><strong>Click to expand</strong></summary>

#### Auth API (`/api/v1/auth`)

- `POST /api/v1/auth/signup` - Create user account
- `POST /api/v1/auth/login` - Authenticate and return JWT access token
- `POST /api/v1/auth/send-reset-email` - Send password reset confirmation email

#### Users API (`/api/v1/users`)

- `GET /api/v1/users` - List users (paginated, ADMIN only)
- `GET /api/v1/users/{id}` - Get user by ID
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/{id}` - Update user profile

#### Events API (`/api/v1/events`)

- `GET /api/v1/events` - List/search events
- `GET /api/v1/events/{id}` - Get event details
- `POST /api/v1/events` - Create event (ORGANIZER/ADMIN)
- `PUT /api/v1/events/{id}` - Update event (ORGANIZER/ADMIN)
- `DELETE /api/v1/events/{id}` - Delete event (ORGANIZER/ADMIN)
- `GET /api/v1/events/category/{categoryName}` - Get events by category
- `GET /api/v1/events/upcoming` - Get upcoming events
- `GET /api/v1/events/search?keyword={keyword}` - Search events

#### Tickets API (`/api/v1/tickets`)

- `GET /api/v1/tickets/{id}` - Get ticket by ID
- `GET /api/v1/tickets/event/{eventId}` - Get event tickets
- `POST /api/v1/tickets` - Create tickets (ORGANIZER/ADMIN)
- `PUT /api/v1/tickets/{id}` - Update ticket (ORGANIZER/ADMIN)
- `DELETE /api/v1/tickets/{id}` - Delete ticket (ORGANIZER/ADMIN)

#### Orders API (`/api/v1/orders`)

- `GET /api/v1/orders` - List orders (paginated, ADMIN only)
- `GET /api/v1/orders/{id}` - Get order by ID
- `GET /api/v1/orders/users/{userId}` - Get user's orders
- `POST /api/v1/orders` - Create order

#### Cart API (`/api/v1/user/{userId}/cart`)

- `GET /api/v1/user/{userId}/cart` - Get user's cart
- `POST /api/v1/user/{userId}/cart/add` - Add item to cart
- `PATCH /api/v1/user/{userId}/cart/increment/ticket/{eventIdAndType}` - Increment quantity
- `PATCH /api/v1/user/{userId}/cart/decrement/ticket/{eventIdAndType}` - Decrement quantity
- `DELETE /api/v1/user/{userId}/cart/clearCart` - Clear cart

</details>

### Interactive API Documentation

When running locally, access Swagger UI at:

- <http://localhost:8080/swagger-ui/index.html>

### Response Format

**Success Response:**

```json
{
  "id": "uuid",
  "field1": "value1",
  "field2": "value2"
}
```

**Error Response:**

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Error message",
  "path": "/api/v1/endpoint"
}
```

**Paginated Response:**

```json
{
  "content": [...],
  "page": 0,
  "size": 10,
  "totalElements": 100,
  "totalPages": 10,
  "last": false
}
```

---

## Additional Resources

### Documentation

- **[LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md)** - Comprehensive local development guide
- **[docs/LAMBDA_IMPLEMENTATION_GUIDE.md](./docs/LAMBDA_IMPLEMENTATION_GUIDE.md)** - Lambda functions implementation guide
- **[microservice-terraform-refactor.md](./microservice-terraform-refactor.md)** - Component Terraform refactor plan/status notes
- **[lambda-quarkus-to-springboot.md](./lambda-quarkus-to-springboot.md)** - Lambda migration notes (some sections are historical status logs)
- **[backend/services/README.md](./backend/services/README.md)** - Backend application documentation
- **[backend/shared/README.md](./backend/shared/README.md)** - Deprecated shared module documentation (reference only)
- **[eventpro-frontend/README.md](./eventpro-frontend/README.md)** - Frontend application documentation
- **[z_docs/modular-monolith-architecture.md](./z_docs/modular-monolith-architecture.md)** - Detailed architecture design

### External Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Cloud Function Documentation](https://docs.spring.io/spring-cloud-function/reference/)
- [React Documentation](https://react.dev/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [LocalStack Documentation](https://docs.localstack.cloud/)

### CI/CD

- GitHub Actions component workflows in `.github/workflows/` (services, frontend, lambdas)
- Composite GitHub Actions in `.github/actions/` for Gradle, Docker/ECR, and Terraform
- Top-level `deploy.yml` currently performs change detection only (orchestration is still being completed)
- GitLab CI configuration also exists: `.gitlab-ci.yml`

### Testing

- **Backend**: JUnit 5, JaCoCo for coverage
- **Lambda**: Spring Boot tests (currently mostly context-load smoke tests)
- **Frontend**: Vitest, React Testing Library
- **Integration**: Docker Compose for local integration testing

---

## License

[Add your license information here]

---

## Engineering

- Alhagie Bai Cham
- Jerome Joof

## Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.

## 🔧 Configuration Notes

### Stripe Integration

For payment processing, configure the Stripe publishable key:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

Add this to your `.env` file (for local development) or set it in your deployment environment. Get your test key from: [Stripe](https://dashboard.stripe.com/test/apikeys)

### Email Notifications (Resend)

For email notifications via Resend:

1. Sign up at [Resend](https://resend.com)
2. Verify your email domain at [Resend](https://resend.com/domains)
3. Create an API key at [Resend](https://resend.com/api-keys)
4. Configure the API key in your environment (optional for local development)

<details>
<summary>Higher environment</summary>

Order of operations:

- services
- eventpro-frontend
- lambdas

</details>
