import { describe, expect, it } from "vitest";
import { validateBackupData } from "../src/lib/validation";

describe("backup validation", () => {
  it("accepts legacy backups without project keys", () => {
    const backup = validateBackupData({
      projects: [
        { id: "6262", name: "ACS4433", createdAt: 1 },
      ],
      sessions: [
        {
          id: "s1",
          projectId: "6262",
          startTs: 1000,
          endTs: 2000,
          durationSec: 1,
          dateKey: "1970-01-01",
        },
      ],
      meta: {
        activeSession: {
          sessionId: "active-1",
          projectId: "6262",
          startTs: 1000,
          heartbeatTs: 1500,
        },
      },
    });

    expect(backup.projects[0].key).toBe("6262");
    expect(backup.sessions[0].projectKey).toBe("6262");
    expect(backup.meta.activeSession?.projectKey).toBe("6262");
    expect(backup.meta.includeProjectKeyInExports).toBe(false);
  });

  it("rejects duplicate visible id and name combinations", () => {
    expect(() =>
      validateBackupData({
        projects: [
          { key: "project-1", id: "6262", name: "ACS4433", createdAt: 1 },
          { key: "project-2", id: "6262", name: "ACS4433", createdAt: 2 },
        ],
        sessions: [],
        meta: {},
      })
    ).toThrow('Duplicate project combination "6262 - ACS4433" in backup.');
  });
});
