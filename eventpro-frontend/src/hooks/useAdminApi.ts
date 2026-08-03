import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import type {
  User,
  Event,
  AdminStats,
  EventSales,
  RevenueData,
  PendingVerification,
  AuditActivityPage,
  SystemStatus,
} from "@/types/api";
import type { PageResponse } from "@/types/api";
import type { RecordSubscriptionPaymentRequest } from "@/types/api";

/**
 * Returns admin API methods only when the current user has role ADMIN.
 * Use this in admin-only UI so that admin APIs are never called for non-admins.
 * Backend still enforces ADMIN; this is defense-in-depth on the client.
 */
export interface CreateAdminUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export function useAdminApi(): {
  getStats: () => Promise<AdminStats>;
  getUsersPage: (page?: number, size?: number) => Promise<PageResponse<User>>;
  getAllUsers: () => Promise<User[]>;
  createAdminUser: (body: CreateAdminUserRequest) => Promise<User>;
  updateUserRole: (userId: string, role: string) => Promise<User>;
  updateUserStatus: (userId: string, status: string) => Promise<User>;
  getVerificationPending: (limit?: number) => Promise<PendingVerification[]>;
  approveVerification: (submissionId: string) => Promise<void>;
  rejectVerification: (submissionId: string, reason?: string) => Promise<void>;
  getEventSales: () => Promise<EventSales[]>;
  getRevenue: (period?: string) => Promise<RevenueData[]>;
  getEventsPage: (page?: number, size?: number) => Promise<PageResponse<Event>>;
  updateEventStatus: (eventId: string, status: string) => Promise<Event>;
  recordSubscriptionPayment: (body: RecordSubscriptionPaymentRequest) => Promise<{ id: string }>;
  getAuditActivityPage: (params?: {
    page?: number;
    size?: number;
    category?: string;
    search?: string;
  }) => Promise<AuditActivityPage>;
  getSystemStatus: () => Promise<SystemStatus>;
} | null {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user || user.role !== "ADMIN") {
      return null;
    }
    return {
      getStats: () => apiService.getStats(),
      getUsersPage: (page = 1, size = 10) =>
        apiService.getUsersPage(page, size),
      getAllUsers: () => apiService.getAllUsers(),
      createAdminUser: (body: CreateAdminUserRequest) =>
        apiService.createAdminUser(body),
      updateUserRole: (userId: string, role: string) =>
        apiService.updateUserRole(userId, role),
      updateUserStatus: (userId: string, status: string) =>
        apiService.updateUserStatus(userId, status),
      getVerificationPending: (limit = 50) =>
        apiService.getVerificationPending(limit),
      approveVerification: (submissionId: string) =>
        apiService.approveVerification(submissionId),
      rejectVerification: (submissionId: string, reason?: string) =>
        apiService.rejectVerification(submissionId, reason),
      getEventSales: () => apiService.getEventSales(),
      getRevenue: (period = "30d") => apiService.getRevenue(period),
      getEventsPage: (page = 1, size = 10) =>
        apiService.getEventsPage(page, size),
      updateEventStatus: (eventId: string, status: string) =>
        apiService.updateEventStatus(eventId, status),
      recordSubscriptionPayment: (body: RecordSubscriptionPaymentRequest) =>
        apiService.recordSubscriptionPayment(body),
      getAuditActivityPage: (params) => apiService.getAuditActivityPage(params ?? {}),
      getSystemStatus: () => apiService.getSystemStatus(),
    };
  }, [user?.id, user?.role]);
}
