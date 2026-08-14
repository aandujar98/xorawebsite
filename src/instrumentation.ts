export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { assertRecoveryRuntimeConfig } = await import("@/lib/env");
  try {
    assertRecoveryRuntimeConfig();
    console.warn("[recovery] runtime configuration verified");
  } catch (error) {
    console.error(
      "[recovery] runtime configuration incomplete",
      error instanceof Error ? error.message : "invalid",
    );
  }
}
