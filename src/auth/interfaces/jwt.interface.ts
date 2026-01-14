export interface JwtPayload {
  sub: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface JwtValidateResult {
  userId: string;
  email: string;
  name: string;
}