import { assertProductionAuthSecret } from "@/lib/auth/assert-production-secret";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    assertProductionAuthSecret();
  }
}
