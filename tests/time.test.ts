import { describe, expect, it } from "vitest";
import {
  formatHhMmSs,
  parseLocalDateTimeInputValue,
  toDateKey,
  toLocalDateTimeInputValue,
} from "../src/lib/time";

describe("time helpers", () => {
  it("formats duration as hh:mm:ss", () => {
    expect(formatHhMmSs(0)).toBe("00:00:00");
    expect(formatHhMmSs(59)).toBe("00:00:59");
    expect(formatHhMmSs(3661)).toBe("01:01:01");
  });

  it("roundtrips datetime-local values", () => {
    const ts = new Date(2026, 2, 8, 14, 35, 0, 0).getTime();
    const value = toLocalDateTimeInputValue(ts);
    const parsed = parseLocalDateTimeInputValue(value);

    expect(parsed).not.toBeNull();
    expect(parsed).toBe(ts);
  });

  it("creates date key in local timezone", () => {
    const ts = new Date(2026, 2, 8, 0, 15, 0, 0).getTime();
    expect(toDateKey(ts)).toBe("2026-03-08");
  });
});
