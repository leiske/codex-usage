export class AuthExpiredError extends Error {
  readonly status: number;

  constructor(status: number, message = "Auth expired") {
    super(message);
    this.name = "AuthExpiredError";
    this.status = status;
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
