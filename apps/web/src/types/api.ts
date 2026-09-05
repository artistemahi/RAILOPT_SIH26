export interface ApiInformationResponse {
  service: string;
  status: "ok";
  message: string;
}

export interface HealthResponse {
  service: string;
  status: "ok";
}
