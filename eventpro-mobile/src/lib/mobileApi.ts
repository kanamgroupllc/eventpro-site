/**
 * Mobile-only API helpers using fetch() so upload and follow work reliably
 * (avoids axios/FormData quirks on RN and doesn't depend on shared package build).
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:8080";

const MOBILE_CLIENT_HEADERS = { "X-EventPro-Client": "mobile" } as const;

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function authFetch(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<Response> {
  const { skipAuth, ...rest } = options;
  const headers: Record<string, string> = {
    ...MOBILE_CLIENT_HEADERS,
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  if (!skipAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${API_URL}${path}`, { ...rest, headers });
}

/** Upload profile picture (multipart). Uses fetch so RN FormData works. */
export async function uploadProfilePicture(asset: {
  uri: string;
  type?: string;
  name?: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append("image", {
    uri: asset.uri,
    type: asset.type ?? "image/jpeg",
    name: asset.name ?? "profile.jpg",
  } as any);

  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/api/v1/users/upload-profile-picture`, {
    method: "POST",
    headers: { ...MOBILE_CLIENT_HEADERS, Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }

  const json = await res.json();
  const url = json?.data?.url ?? json?.url;
  if (typeof url !== "string") throw new Error("No URL in response");
  return url;
}

export interface FollowedOrganizerItem {
  organizerId: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

/** List followed organizers. */
export async function getFollowing(): Promise<FollowedOrganizerItem[]> {
  const res = await authFetch("/api/v1/users/me/following");
  if (!res.ok) throw new Error(`getFollowing failed: ${res.status}`);
  const json = await res.json();
  const data = json?.data;
  return Array.isArray(data) ? data : [];
}

/** Follow an organizer (userId of the organizer). */
export async function followOrganizer(organizerId: string): Promise<void> {
  const res = await authFetch(`/api/v1/users/me/following/${organizerId}`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Follow failed: ${res.status}`);
  }
}

/** Unfollow an organizer. */
export async function unfollowOrganizer(organizerId: string): Promise<void> {
  const res = await authFetch(`/api/v1/users/me/following/${organizerId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Unfollow failed: ${res.status}`);
  }
}

/** Organizer display profile from their user profile (name, photo). Public endpoint. */
export interface OrganizerPublicProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

/** Fetch organizer's public profile (from profile). Use to display organizer name/photo on event detail. */
export async function getOrganizerPublicProfile(organizerId: string): Promise<OrganizerPublicProfile | null> {
  const res = await fetch(`${API_URL}/api/v1/users/${organizerId}/public-profile`);
  if (!res.ok) return null;
  const json = await res.json();
  const data = json?.data;
  if (!data) return null;
  return {
    id: data.id,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    profilePictureUrl: data.profilePictureUrl ?? null,
  };
}
