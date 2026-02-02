export class AuthExpiredError extends Error {
  readonly status: number;
  readonly url?: string;
  readonly headerNames?: string[];

  constructor(status: number, message = "Auth expired", info?: { url?: string; headerNames?: string[] }) {
    super(message);
    this.name = "AuthExpiredError";
    this.status = status;
    this.url = info?.url;
    this.headerNames = info?.headerNames;
  }
}

export class MissingEnvError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing required environment variables: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

export class UnexpectedResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnexpectedResponseError";
  }
}

export class HttpStatusError extends Error {
  readonly status: number;
  readonly url: string;
  readonly headerNames: string[];

  constructor(status: number, url: string, headerNames: string[]) {
    super(`HTTP ${status}`);
    this.name = "HttpStatusError";
    this.status = status;
    this.url = url;
    this.headerNames = headerNames;
  }
}

export class TimeoutError extends Error {
  readonly url: string;
  readonly headerNames: string[];

  constructor(url: string, headerNames: string[]) {
    super("Request timed out");
    this.name = "TimeoutError";
    this.url = url;
    this.headerNames = headerNames;
  }
}
