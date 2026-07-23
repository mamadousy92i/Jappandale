export type Role = "PORTEUR" | "CONTRIBUTEUR" | "ADMIN";

export type KycStatus = "NON_SOUMIS" | "EN_ATTENTE" | "VALIDE" | "REJETE";

export type KycDocumentType =
  | "CNI"
  | "PASSEPORT"
  | "SELFIE"
  | "JUSTIFICATIF_ACTIVITE";

export interface KycChecklistItem {
  key: string;
  label: string;
  document_types: KycDocumentType[];
  satisfied: boolean;
}

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  first_name: string;
  last_name: string;
  role: Role;
  phone: string;
  avatar: string | null;
  organization_name: string;
  city: string;
  bio: string;
  kyc_status: KycStatus;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "PORTEUR" | "CONTRIBUTEUR";
  phone?: string;
}

export type CampaignCategory =
  | "ARTISANAT"
  | "COMMERCE"
  | "AGRICULTURE"
  | "EDUCATION"
  | "SANTE"
  | "TECHNOLOGIE"
  | "CULTURE"
  | "AUTRE";

export type CampaignStatus =
  | "BROUILLON"
  | "EN_MODERATION"
  | "PUBLIEE"
  | "REJETEE"
  | "SUSPENDUE"
  | "CLOTUREE";

export type CampaignType = "DON_LIBRE" | "DON_CONTREPARTIE";

export interface Reward {
  id: number;
  title: string;
  description: string;
  minimum_amount: number;
  quantity_limit: number | null;
  quantity_claimed: number;
  remaining: number | null;
  sold_out: boolean;
}

export interface CampaignListItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  location: string;
  campaign_type: CampaignType;
  campaign_type_display: string;
  category: CampaignCategory;
  category_display: string;
  goal_amount: number;
  collected_amount: number;
  cover_image: string | null;
  deadline: string;
  status: CampaignStatus;
  status_display: string;
  moderation_note: string;
  suspension_note: string;
  progress_percent: number;
  days_left: number;
}

export interface CampaignUpdate {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface RecentContributor {
  display_name: string;
  amount: number;
  confirmed_at: string;
}

export interface CampaignDetail extends CampaignListItem {
  description: string;
  beneficiaries: string;
  funding_plan: string;
  project_timeline: string;
  owner: {
    first_name: string;
    last_name: string;
    organization_name: string;
    city: string;
    bio: string;
  };
  updates: CampaignUpdate[];
  rewards: Reward[];
  recent_contributors: RecentContributor[];
  created_at: string;
  published_at: string | null;
}

export type ContributionStatus =
  "INITIEE" | "CONFIRMEE" | "ECHOUEE" | "REMBOURSEE";
export type TransactionStatus = ContributionStatus;

export interface Contribution {
  public_reference: string;
  campaign: Pick<CampaignListItem, "slug" | "title" | "cover_image" | "status">;
  reward: Pick<Reward, "id" | "title" | "minimum_amount"> | null;
  amount: number;
  anonymous: boolean;
  status: ContributionStatus;
  contributor_display: string;
  created_at: string;
  confirmed_at: string | null;
  refunded_at: string | null;
  transaction: {
    provider: "SIMULATED";
    provider_display: string;
    external_reference: string;
    status: TransactionStatus;
    failure_reason: string;
    processed_at: string | null;
  };
}

export interface Notification {
  id: number;
  kind: string;
  kind_display: string;
  subject: string;
  message: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}
