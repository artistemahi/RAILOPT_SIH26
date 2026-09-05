import type { Request, Response } from "express";
import type { ApiInformationResponse } from "../types/api.js";

export function getApiInformation(
  _request: Request,
  response: Response<ApiInformationResponse>
): void {
  response.status(200).json({
    service: "railopt-api",
    status: "ok",
    message: "RAILOPT orchestration API foundation"
  });
}
