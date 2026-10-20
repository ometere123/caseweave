import type { CalldataEncodable } from "genlayer-js/types";
import { assertDistinctCounterparty } from "./address";

export const CASEWEAVE_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CASEWEAVE_CONTRACT_ADDRESS ??
    "0x3BA8098653902c5A5daf08f26A3759fB06C57a2A") as `0x${string}`;

export const CASEWEAVE_JUDGMENT_CONSUMER_ADDRESS =
  (process.env.NEXT_PUBLIC_CASEWEAVE_JUDGMENT_CONSUMER_ADDRESS ??
    "0x08f0eeAFDd4Cf9ba9CD369AB2fCb25451db83211") as `0x${string}` | "";

export const CASEWEAVE_SETTLEMENT_RECEIVER_ADDRESS =
  (process.env.NEXT_PUBLIC_CASEWEAVE_SETTLEMENT_RECEIVER_ADDRESS ??
    "0x0F77E10770e5a12C0d2f9Bcc5fB077F44eA4257f") as `0x${string}` | "";

export const EVIDENCE_STATUSES = [
  "unverified",
  "verified",
  "failed_fetch",
  "invalid_url",
  "unstable",
  "not_relevant",
] as const;

export const STUDIONET_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_STUDIONET_CHAIN_ID ?? 61999,
);

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

export type CreateAgreementInput = {
  creator: string;
  title: string;
  agreementText: string;
  counterparty: string;
  agreementType: string;
  tags: string[];
  stakeAmount: number;
  precedentPolicy: string;
};

export type CreateTechnicalAgreementInput = CreateAgreementInput & {
  acceptanceCriteria: string;
  obligations: Array<{ id: string; text: string }>;
  deliverables: Array<{ id: string; description: string }>;
  milestones: Array<{
    name: string;
    obligation_id: string;
    acceptance_criteria: string;
    deadline: string;
    amount: number;
  }>;
  repositoryUrl: string;
  sourcePolicy: string;
  completionConditions: string;
};

/** Build the exact calldata argument list used by the creation form. */
export function buildCreateAgreementArgs(
  input: CreateAgreementInput,
): CalldataEncodable[] {
  return [
    input.title,
    input.agreementText,
    assertDistinctCounterparty(input.counterparty, input.creator),
    input.agreementType,
    input.tags,
    input.stakeAmount,
    input.precedentPolicy,
  ];
}

/** Build the structured technical-agreement call used by the courtroom form. */
export function buildCreateTechnicalAgreementArgs(
  input: CreateTechnicalAgreementInput,
): CalldataEncodable[] {
  return [
    input.title,
    input.agreementText,
    assertDistinctCounterparty(input.counterparty, input.creator),
    input.agreementType,
    input.tags,
    input.stakeAmount,
    input.precedentPolicy,
    input.acceptanceCriteria,
    JSON.stringify(input.obligations),
    JSON.stringify(input.deliverables),
    JSON.stringify(input.milestones),
    input.repositoryUrl,
    input.sourcePolicy,
    input.completionConditions,
  ];
}

export function buildFundAgreementArgs(
  agreementId: string,
  amount: number,
): CalldataEncodable[] {
  return [agreementId, amount];
}

export function buildFundMilestoneArgs(
  agreementId: string,
  milestoneId: string,
): CalldataEncodable[] {
  return [agreementId, milestoneId];
}

export function buildRegisterDeliveryProofArgs(input: {
  agreementId: string;
  milestoneId: string;
  repositoryUrl: string;
  repositoryIdentity: string;
  commitSha: string;
  pullRequest: Record<string, unknown>;
  changedFiles: string[];
  ciResults: Record<string, unknown>;
  deploymentArtifacts: string[];
  evidenceUrl: string;
}): CalldataEncodable[] {
  return [
    input.agreementId,
    input.milestoneId,
    input.repositoryUrl,
    input.repositoryIdentity,
    input.commitSha,
    JSON.stringify(input.pullRequest),
    JSON.stringify(input.changedFiles),
    JSON.stringify(input.ciResults),
    JSON.stringify(input.deploymentArtifacts),
    input.evidenceUrl,
  ];
}

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
  commitment_hash?: string;
  escrow?: EscrowAccount;
};

export type AgreementSpec = {
  agreement_id: string;
  acceptance_criteria: string;
  obligations: Array<Record<string, unknown>>;
  deliverables: Array<Record<string, unknown>>;
  milestones: Array<Record<string, unknown>>;
  repository_url: string;
  repository_identity: string;
  source_policy: string;
  completion_conditions: string;
  commitment_hash: string;
  version: number;
  amendment_status: string;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  milestone_id: string;
  agreement_id: string;
  name: string;
  obligation_id: string;
  acceptance_criteria: string;
  deadline: string;
  amount: number;
  funded_amount: number;
  status: string;
  deliverable_ref: string;
  commitment_hash: string;
  created_at: string;
  updated_at: string;
};

export type EscrowAccount = {
  agreement_id: string;
  actual_deposited: number;
  available: number;
  committed: number;
  reserved: number;
  pending_transfer: number;
  settled: number;
  appeal_bond_balance: number;
  failed_transfer_balance: number;
  last_transfer_nonce: number;
  status: string;
};

export type DeliveryProof = {
  proof_id: string;
  agreement_id: string;
  milestone_id: string;
  submitted_by: string;
  repository_url: string;
  repository_identity: string;
  commit_sha: string;
  pull_request: Record<string, unknown>;
  changed_files: string[];
  ci_results: Record<string, unknown>;
  deployment_artifacts: string[];
  evidence_url: string;
  source_adapter: string;
  content_hash: string;
  assessment?: {
    overall_finding?: string;
    obligations?: Array<Record<string, unknown>>;
    summary?: string;
  } | null;
  status: string;
  snapshot_id: string;
  verified_at: string;
  created_at: string;
};

export type TransferRecord = {
  transfer_id: string;
  agreement_id: string;
  dispute_id: string;
  judgment_id: string;
  appeal_id: string;
  recipient: string;
  amount: number;
  purpose: string;
  source_bucket: string;
  proof_commitment: string;
  status: string;
  child_transaction_id: string;
  created_at: string;
  reconciled_at: string;
};

export type Judgment = {
  judgment_id: string;
  agreement_id: string;
  dispute_id: string;
  case_id: string;
  evidence_snapshot_id: string;
  evidence_snapshot_hash: string;
  precedent_policy: string;
  precedent_case_id: string;
  outcome: string;
  remedy: Record<string, unknown>;
  appeal_status: string;
  status: string;
  version: number;
  supersedes: string;
  superseded_by: string;
  reasoning: Record<string, unknown>;
  created_at: string;
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
  remedy: {
    action: string;
    recipient_role: string;
    amount_bps: number;
  };
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
  snapshot_id?: string;
  decision_version?: number;
  decision?: Record<string, unknown> | null;
  bond_status?: string;
  supersedes_judgment_id?: string;
  judgment_id?: string;
};
