import { describe, expect, it } from "vitest";
import { buildClosedSessionFromActive } from "../src/context/sessionLifecycle";
import type { ActiveSession } from "../src/types";

describe("active session lifecycle", () => {
  it("closes active session using bounded end timestamp", () => {
    const active: ActiveSession = {
      sessionId: "sess-1",
      projectId: "P1",
      startTs: 10_000,
      heartbeatTs: 15_000,
    };

    const closed = buildClosedSessionFromActive(active, 12_500);

    expect(closed.id).toBe("sess-1");
    expect(closed.projectId).toBe("P1");
    expect(closed.startTs).toBe(10_000);
    expect(closed.endTs).toBe(12_500);
    expect(closed.durationSec).toBe(2);
    expect(closed.dateKey).toBe("1970-01-01");
  });

  it("never returns end timestamp before start timestamp", () => {
    const active: ActiveSession = {
      sessionId: "sess-2",
      projectId: "P1",
      startTs: 20_000,
      heartbeatTs: 20_500,
    };

    const closed = buildClosedSessionFromActive(active, 15_000);

    expect(closed.endTs).toBe(20_000);
    expect(closed.durationSec).toBe(0);
  });
});
