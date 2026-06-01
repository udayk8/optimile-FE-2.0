import type { ReportingExecutionRequest } from "./reporting-types";
import { runReportingV1 } from "./reporting-v1.service";

export function runReportingV1Controller(request: ReportingExecutionRequest) {
  return runReportingV1(request);
}
