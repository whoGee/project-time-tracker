import { useContext } from "react";
import { TrackerContext, type TrackerContextValue } from "./trackerContextShared";

export function useTracker(): TrackerContextValue {
  const value = useContext(TrackerContext);
  if (!value) {
    throw new Error("useTracker must be used inside TrackerProvider.");
  }
  return value;
}
