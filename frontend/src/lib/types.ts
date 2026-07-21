export type Role = "PORTEUR" | "CONTRIBUTEUR" | "ADMIN"

export type KycStatus = "NON_SOUMIS" | "EN_ATTENTE" | "VALIDE" | "REJETE"

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: Role
  phone: string
  kyc_status: KycStatus
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: "PORTEUR" | "CONTRIBUTEUR"
  phone?: string
}
