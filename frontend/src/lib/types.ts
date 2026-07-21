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

export type CampaignCategory =
  | "ARTISANAT"
  | "COMMERCE"
  | "AGRICULTURE"
  | "EDUCATION"
  | "SANTE"
  | "TECHNOLOGIE"
  | "CULTURE"
  | "AUTRE"

export type CampaignStatus =
  | "BROUILLON"
  | "EN_MODERATION"
  | "PUBLIEE"
  | "REJETEE"
  | "CLOTUREE"

export interface CampaignListItem {
  id: number
  slug: string
  title: string
  summary: string
  category: CampaignCategory
  category_display: string
  goal_amount: number
  collected_amount: number
  cover_image: string | null
  deadline: string
  status: CampaignStatus
  progress_percent: number
  days_left: number
}

export interface CampaignUpdate {
  id: number
  title: string
  content: string
  created_at: string
}

export interface CampaignDetail extends CampaignListItem {
  description: string
  status_display: string
  moderation_note: string
  owner: { first_name: string; last_name: string }
  updates: CampaignUpdate[]
  created_at: string
  published_at: string | null
}
