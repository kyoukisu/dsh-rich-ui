import React from "react";
import { Diagnostic } from "../ui/Diagnostic";

const rejected = `{"version":1,"nodes":[{"type":"stat","label":"Availability"}]}`;

/** Shows the host-facing failure state without a running Harness. */
export function DiagnosticDemo() {
  return (
    <Diagnostic error="Missing value" source={rejected} onRepair={() => {}} />
  );
}
