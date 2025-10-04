export interface KeycloakUserInfo {
  sub: string
  preferred_username: string
  email?: string
  given_name?: string
  family_name?: string
  name?: string
  [key: string]: any
}

export interface KeycloakTokenParsed {
  realm_access?: {
    roles: string[]
  }
  exp?: number
  [key: string]: any
}
