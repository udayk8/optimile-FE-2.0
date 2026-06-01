import type { ReportingExecutionRequest } from "./reporting-types";
import { runReportingV1Controller } from "./reporting-v1.controller";

export const reportingApiClient = {
  runReport(request: ReportingExecutionRequest) {
    return runReportingV1Controller(request);
  },
};
