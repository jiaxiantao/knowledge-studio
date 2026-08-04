type AttemptEntry = {
  count: number;
  resetAt: number;
};

export const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000;
export const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

type LoginRateLimitBucket = {
  ip: string;
  username: string;
};

export type LoginRiskLevel = "low" | "medium" | "high";

export type LoginRiskSignals = {
  ipSwitchCountLastMinute: number;
  usernameBurstLastMinute: number;
  failedStreak: number;
  suspiciousUserAgent?: boolean;
};

export type LoginRiskScoreResult = {
  score: number;
  level: LoginRiskLevel;
  reasons: string[];
};

export type LoginRiskContribution = {
  id: "base" | "ip-switch" | "username-burst" | "failed-streak" | "suspicious-ua";
  label: string;
  score: number;
};

type CreateLoginRateLimiterOptions = {
  windowMs?: number;
  maxAttempts?: number;
  now?: () => number;
};

export function createLoginRateLimiter(options?: CreateLoginRateLimiterOptions) {
  const windowMs = options?.windowMs ?? LOGIN_RATE_LIMIT_WINDOW_MS;
  const maxAttempts = options?.maxAttempts ?? LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  const now = options?.now ?? Date.now;
  const attempts = new Map<string, AttemptEntry>();

  return {
    check(bucket: LoginRateLimitBucket) {
      const currentNow = now();
      const key = `${bucket.ip}:${bucket.username.toLowerCase()}`;
      const current = attempts.get(key);

      if (!current || current.resetAt <= currentNow) {
        attempts.set(key, { count: 1, resetAt: currentNow + windowMs });
        return { limited: false as const };
      }

      if (current.count >= maxAttempts) {
        return {
          limited: true as const,
          retryAfterSeconds: Math.ceil((current.resetAt - currentNow) / 1000),
        };
      }

      current.count += 1;
      attempts.set(key, current);
      return { limited: false as const };
    },
    reset(bucket: LoginRateLimitBucket) {
      attempts.delete(`${bucket.ip}:${bucket.username.toLowerCase()}`);
    },
  };
}

const loginRateLimiter = createLoginRateLimiter();

export function assessLoginRisk(signals: LoginRiskSignals): LoginRiskScoreResult {
  const contributions = getLoginRiskContributions(signals);
  const reasons: string[] = [];

  for (const item of contributions) {
    if (item.id === "base" || item.score <= 0) {
      continue;
    }
    if (item.id === "ip-switch") {
      reasons.push(item.score >= 35 ? "短时多 IP 切换" : "IP 波动明显");
    } else if (item.id === "username-burst") {
      reasons.push(item.score >= 30 ? "账号撞库节奏高" : "短时重试较密集");
    } else if (item.id === "failed-streak") {
      reasons.push(item.score >= 28 ? "连续失败过多" : "存在连续失败");
    } else if (item.id === "suspicious-ua") {
      reasons.push("可疑 User-Agent");
    }
  }

  const totalScore = contributions.reduce((total, item) => total + item.score, 0);
  const bounded = Math.min(100, Math.max(0, totalScore));
  const level: LoginRiskLevel =
    bounded >= 70 ? "high" : bounded >= 40 ? "medium" : "low";

  return { score: bounded, level, reasons };
}

export function getLoginRiskContributions(
  signals: LoginRiskSignals,
): LoginRiskContribution[] {
  const contributions: LoginRiskContribution[] = [
    { id: "base", label: "基础分", score: 10 },
    { id: "ip-switch", label: "IP 切换", score: 0 },
    { id: "username-burst", label: "账号重试频率", score: 0 },
    { id: "failed-streak", label: "连续失败", score: 0 },
    { id: "suspicious-ua", label: "可疑 UA", score: 0 },
  ];

  if (signals.ipSwitchCountLastMinute >= 4) {
    contributions[1].score = 35;
  } else if (signals.ipSwitchCountLastMinute >= 2) {
    contributions[1].score = 15;
  }

  if (signals.usernameBurstLastMinute >= 8) {
    contributions[2].score = 30;
  } else if (signals.usernameBurstLastMinute >= 4) {
    contributions[2].score = 12;
  }

  if (signals.failedStreak >= 5) {
    contributions[3].score = 28;
  } else if (signals.failedStreak >= 3) {
    contributions[3].score = 14;
  }

  if (signals.suspiciousUserAgent) {
    contributions[4].score = 18;
  }

  return contributions;
}

export function getAdaptiveLoginLimitByRisk(riskLevel: LoginRiskLevel) {
  switch (riskLevel) {
    case "high":
      return 2;
    case "medium":
      return 3;
    case "low":
    default:
      return LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  }
}

export function formatLoginRiskLevelLabel(level: LoginRiskLevel) {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  return "低风险";
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}

export function checkLoginRateLimit(request: Request, username: string) {
  return loginRateLimiter.check({ ip: getClientIp(request), username });
}

export function resetLoginRateLimit(request: Request, username: string) {
  loginRateLimiter.reset({ ip: getClientIp(request), username });
}
