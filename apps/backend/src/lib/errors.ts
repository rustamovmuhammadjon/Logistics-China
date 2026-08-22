export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFound(message = "Not found"): never {
  throw new HttpError(404, message);
}

export function unauthorized(message = "Not authorized"): never {
  throw new HttpError(401, message);
}

export function badRequest(message: string): never {
  throw new HttpError(400, message);
}

export function conflict(message: string): never {
  throw new HttpError(409, message);
}
