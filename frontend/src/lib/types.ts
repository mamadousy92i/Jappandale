export type Role = "PORTEUR" | "CONTRIBUTEUR" | "ADMIN"

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: Role
  phone: string
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: "PORTEUR" | "CONTRIBUTEUR"
  phone?: string
}
