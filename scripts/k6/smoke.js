/**
 * k6 load test — go-live checklist §2 #17 (staging / non-prod only).
 *
 * Usage:
 *   k6 run -e BASE_URL=https://staging.example.com scripts/k6/smoke.js
 *
 * Tune VUS and duration for your peak target; assert p95 in k6 thresholds or Grafana.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8080";

export const options = {
  vus: 10,
  duration: "2m",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const r = http.get(`${BASE}/actuator/health`);
  check(r, { "health 200": (res) => res.status === 200 });
  sleep(1);
}
