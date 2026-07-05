export const CASEWEAVE_CONTRACT_ADDRESS =
  "0x322b999682CdDecE9b7e704541F86dC86D18D35a" as const;

export const EVIDENCE_STATUSES = [
  "unverified",
  "verified",
  "failed_fetch",
  "invalid_url",
  "unstable",
  "not_relevant",
] as const;

export const STUDIONET_CHAIN_ID = 61999;

export const ALLOWED_AGREEMENT_TYPES = [
  "freelance",
  "grant",
  "dao_mandate",
  "creator_collaboration",
  "agent_service",
  "bounty",
  "vendor_service",
  "governance_commitment",
  "custom",
] as const;

export const ALLOWED_PRECEDENT_POLICIES = [
  "strict_following",
  "persuasive_only",
  "no_overturn_without_appeal",
  "fresh_review_allowed",
  "private_precedent",
  "public_precedent",
] as const;

export const ALLOWED_REQUESTED_OUTCOMES = [
  "release_payment",
  "refund_payment",
  "partial_release",
  "mark_completed",
  "mark_failed",
  "require_revision",
  "require_apology",
  "reputation_penalty",
  "no_action",
  "custom",
] as const;

export const ALLOWED_APPEAL_GROUNDS = [
  "precedent_misapplied",
  "key_evidence_ignored",
  "new_evidence",
  "wrong_agreement_interpretation",
  "bad_faith_evidence",
  "outcome_inconsistent_with_holding",
] as const;

export type Agreement = {
  agreement_id: string;
  creator: string;
  counterparty: string;
  title: string;
  agreement_text: string;
  agreement_type: string;
  status: string;
  stake_amount: number;
  precedent_policy: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Dispute = {
  dispute_id: string;
  agreement_id: string;
  claimant: string;
  respondent: string;
  claim_summary: string;
  requested_outcome: string;
  evidence_urls: string[];
  counter_evidence_urls: string[];
  response_summary: string;
  filed_at: string;
  responded_at: string;
  resolved_at: string;
  status: string;
  final_case_id: string;
  appeal_count: number;
  claimant_evidence_count: number;
  respondent_evidence_count: number;
  precedent_search: PrecedentSearchResult | null;
  verdict: Verdict | null;
};

export type EvidenceItem = {
  url: string;
  side: "claimant" | "respondent";
  status: string;
  http_status: number;
  content_hash: string;
  content_type: string;
  evidence_summary: string;
  short_quote: string;
  verified_at: string;
  verified_seq: number;
};

export type PrecedentSearchResult = {
  ok: boolean;
  relevant_cases: {
    case_id: string;
    similarity_score: number;
    shared_issue: string;
    risk: string;
  }[];
  search_summary: string;
};

export type Verdict = {
  verdict: string;
  confidence: number;
  claimant_score: number;
  respondent_score: number;
  precedent_alignment: string;
  followed_cases: string[];
  distinguished_cases: string[];
  weakened_cases: string[];
  overturned_cases: string[];
  holding: string;
  short_reason: string;
  legal_issue?: string;
  fact_pattern_summary?: string;
  reasoning_rule?: string;
  tags?: string[];
};

export type PrecedentCase = {
  case_id: string;
  dispute_id: string;
  agreement_type: string;
  fact_pattern_summary: string;
  legal_issue: string;
  holding: string;
  reasoning_rule: string;
  outcome: string;
  precedent_strength: number;
  tags: string[];
  citation_count: number;
  negative_treatment_count: number;
  status: string;
  created_at: string;
};

export type CaseTreatment = {
  new_case_id: string;
  old_case_id: string;
  treatment: string;
  similarity_score: number;
  reason: string;
};

export type Appeal = {
  appeal_id: string;
  dispute_id: string;
  appellant: string;
  appeal_ground: string;
  bond_amount: number;
  status: string;
  requested_change: string;
  result: string;
  filed_at: string;
  resolved_at: string;
};
