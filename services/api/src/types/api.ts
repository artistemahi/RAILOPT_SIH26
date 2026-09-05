export interface ApiInformationResponse {
  service: string;
  status: "ok";
  message: string;
}

export interface HealthResponse {
  service: string;
  status: "ok";
}

export interface PythonServiceDirectory {
  ml: { baseUrl: string };
  optimizer: { baseUrl: string };
}
