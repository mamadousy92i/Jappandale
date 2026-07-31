export type Role = "PORTEUR" | "CONTRIBUTEUR" | "ADMIN";

export type KycStatus = "NON_SOUMIS" | "EN_ATTENTE" | "VALIDE" | "REJETE";

export type KycDocumentType =
  | "CNI"
  | "PASSEPORT"
  | "SELFIE"
  | "JUSTIFICATIF_ACTIVITE"
  | "JUSTIFICATIF_RESIDENCE"
  | "JUSTIFICATIF_ORIGINE_FONDS";

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
  is_diaspora: boolean;
  country: string;
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

export type CampaignType =
  | "DON_LIBRE"
  | "DON_CONTREPARTIE"
  | "INVESTISSEMENT_PARTICIPATIF";

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
  expected_return_rate: number | null;
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
export type PayoutStatus = "EN_SEQUESTRE" | "REVERSEE";

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

export interface ReceivedContribution extends Contribution {
  payout_status: PayoutStatus;
  payout_status_display: string;
  net_amount: number;
}

export interface MessageThreadListItem {
  id: number;
  campaign: { slug: string; title: string };
  other_participant: { id: number; name: string };
  last_message: { body: string; created_at: string; sender_id: number } | null;
  unread_count: number;
  created_at: string;
}

export interface ThreadMessage {
  id: number;
  sender_name: string;
  is_mine: boolean;
  body: string;
  created_at: string;
  read_at: string | null;
}

export type MessageReportReason =
  | "SPAM"
  | "HARCELEMENT"
  | "CONTENU_INAPPROPRIE"
  | "TENTATIVE_CONTOURNEMENT"
  | "AUTRE";

export type DisputeReason =
  | "PROJET_NON_CONFORME"
  | "PORTEUR_INJOIGNABLE"
  | "ERREUR_CONTRIBUTION"
  | "AUTRE";

export type DisputeStatus = "OUVERT" | "EN_EXAMEN" | "ACCEPTE" | "REJETE";

export interface Dispute {
  id: number;
  contribution_reference: string;
  campaign_title: string;
  reason: DisputeReason;
  reason_display: string;
  details: string;
  status: DisputeStatus;
  status_display: string;
  created_at: string;
  resolved_at: string | null;
}

export interface Score {
  value: number;
  effective_value: number;
  breakdown: Record<string, number>;
  is_manual_override: boolean;
  override_note: string;
  computed_at: string;
}

export interface PassportExport {
  verification_id: string;
  generated_at: string;
  is_shared: boolean;
  shared_at: string | null;
}

export interface PassportData {
  porteur_name: string;
  porteur_city: string;
  member_since: string;
  score: number;
  campaigns_total: number;
  campaigns_published: number;
  campaigns_closed_success: number;
  campaigns_rejected_or_suspended: number;
  total_collected: number;
  confirmed_contributions_count: number;
  distinct_contributors: number;
  disputes_received: number;
  disputes_accepted_rate: number;
}

export interface PassportVerification {
  valide: boolean;
  porteur: string;
  genere_le: string;
  resume: PassportData;
}

export type FinancingProviderType =
  | "FONDS_PUBLIC"
  | "BAILLEUR"
  | "BANQUE"
  | "PROGRAMME_APPUI";

export type DiasporaRequirement =
  | "INDIFFERENT"
  | "DIASPORA_UNIQUEMENT"
  | "DIASPORA_EXCLUE";

export interface FinancingScheme {
  id: number;
  name: string;
  provider_name: string;
  provider_type: FinancingProviderType;
  provider_type_display: string;
  description: string;
  website_url: string;
  contact_email: string;
  min_score: number;
  requires_kyc_valide: boolean;
  diaspora_requirement: DiasporaRequirement;
  eligible_categories: CampaignCategory[];
  eligible_regions: string[];
  min_goal_amount: number | null;
  max_goal_amount: number | null;
  status: "BROUILLON" | "PUBLIE" | "ARCHIVE";
  published_at: string | null;
  created_at: string;
}

export interface EligibleFinancingScheme extends FinancingScheme {
  eligible: boolean;
  ineligibility_reasons: string[];
}

export type SchemeReferralStatus =
  | "INTERET"
  | "EN_COURS"
  | "ACCEPTE"
  | "REFUSE"
  | "ABANDONNE";

export interface SchemeReferral {
  id: number;
  scheme: FinancingScheme;
  status: SchemeReferralStatus;
  status_display: string;
  note: string;
  created_at: string;
  updated_at: string;
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
