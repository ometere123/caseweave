# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import hashlib
from dataclasses import dataclass
from genlayer import *

MAX_EVIDENCE_URL_LENGTH = 2048

EVIDENCE_STATUSES = {
    "unverified", "verified", "failed_fetch", "invalid_url", "unstable", "not_relevant",
}

ALLOWED_AGREEMENT_TYPES = {
    "freelance", "grant", "dao_mandate", "creator_collaboration",
    "agent_service", "bounty", "vendor_service", "governance_commitment", "custom",
}

ALLOWED_PRECEDENT_POLICIES = {
    "strict_following", "persuasive_only", "no_overturn_without_appeal",
    "fresh_review_allowed", "private_precedent", "public_precedent",
}

ALLOWED_REQUESTED_OUTCOMES = {
    "release_payment", "refund_payment", "partial_release", "mark_completed",
    "mark_failed", "require_revision", "require_apology", "reputation_penalty",
    "no_action", "custom",
}

ALLOWED_VERDICTS = {
    "claimant_wins", "respondent_wins", "partial_release", "refund",
    "revision_required", "no_breach", "mutual_fault", "insufficient_evidence",
    "bad_faith_claim", "settlement_recommended", "escalate_to_human",
}

ALLOWED_PRECEDENT_ALIGNMENTS = {
    "followed", "followed_with_limits", "distinguished", "no_relevant_precedent",
    "created_new_rule", "weakened_prior_rule", "overturned_prior_rule",
    "conflicting_precedents", "insufficient_case_memory",
}

ALLOWED_APPEAL_GROUNDS = {
    "precedent_misapplied", "key_evidence_ignored", "new_evidence",
    "wrong_agreement_interpretation", "bad_faith_evidence",
    "outcome_inconsistent_with_holding",
}

ALLOWED_APPEAL_RESULTS = {
    "affirmed", "modified", "reversed", "weakened_precedent",
    "overturned_precedent", "remanded_for_more_evidence",
}


@allow_storage
@dataclass
class Agreement:
    agreement_id: str
    creator: Address
    counterparty: Address
    title: str
    agreement_text: str
    agreement_type: str
    created_at: str
    updated_at: str
    status: str
    stake_amount: u256
    precedent_policy: str
    tags_json: str


@allow_storage
@dataclass
class Dispute:
    dispute_id: str
    agreement_id: str
    claimant: Address
    respondent: Address
    claim_summary: str
    requested_outcome: str
    evidence_urls_json: str
    counter_evidence_urls_json: str
    response_summary: str
    filed_at: str
    responded_at: str
    resolved_at: str
    status: str
    final_case_id: str
    appeal_count: u256
    claimant_evidence_count: u256
    respondent_evidence_count: u256
    precedent_search_json: str
    verdict_json: str


@allow_storage
@dataclass
class PrecedentCase:
    case_id: str
    dispute_id: str
    agreement_type: str
    fact_pattern_summary: str
    legal_issue: str
    holding: str
    reasoning_rule: str
    outcome: str
    precedent_strength: u256
    tags_json: str
    created_at: str
    citation_count: u256
    negative_treatment_count: u256
    status: str


@allow_storage
@dataclass
class Appeal:
    appeal_id: str
    dispute_id: str
    appellant: Address
    appeal_ground: str
    bond_amount: u256
    status: str
    requested_change: str
    result: str
    filed_at: str
    resolved_at: str


@allow_storage
@dataclass
class EvidenceItem:
    url: str
    side: str
    status: str
    http_status: u256
    content_hash: str
    content_type: str
    evidence_summary: str
    short_quote: str
    verified_at: str
    verified_seq: u256


class CaseWeaveCourt(gl.Contract):
    agreements: TreeMap[str, Agreement]
    disputes: TreeMap[str, Dispute]
    precedents: TreeMap[str, PrecedentCase]
    case_treatments_json: TreeMap[str, str]
    agreement_cases_json: TreeMap[str, str]
    appeals: TreeMap[str, Appeal]
    evidence_items: TreeMap[str, EvidenceItem]

    agreement_counter: u256
    dispute_counter: u256
    case_counter: u256
    appeal_counter: u256
    evidence_counter: u256

    def __init__(self):
        self.agreement_counter = u256(0)
        self.dispute_counter = u256(0)
        self.case_counter = u256(0)
        self.appeal_counter = u256(0)
        self.evidence_counter = u256(0)

    # ------------------------------------------------------------------
    # Agreements
    # ------------------------------------------------------------------

    @gl.public.write
    def create_agreement(
        self,
        title: str,
        agreement_text: str,
        counterparty: Address,
        agreement_type: str,
        tags: list[str],
        stake_amount: int,
        precedent_policy: str,
    ) -> str:
        sender = gl.message.sender_address
        counterparty_addr = counterparty

        if len(agreement_text.strip()) == 0:
            raise Exception("agreement_text must not be empty")
        if counterparty_addr == sender:
            raise Exception("parties must not be the same address")
        if agreement_type not in ALLOWED_AGREEMENT_TYPES:
            raise Exception("invalid agreement_type")
        if precedent_policy not in ALLOWED_PRECEDENT_POLICIES:
            raise Exception("invalid precedent_policy")
        if stake_amount < 0:
            raise Exception("stake_amount must be >= 0")

        now_iso: str = gl.message_raw["datetime"]

        self.agreement_counter += 1
        agreement_id = f"AGR_{int(self.agreement_counter)}"

        self.agreements[agreement_id] = Agreement(
            agreement_id=agreement_id,
            creator=sender,
            counterparty=counterparty_addr,
            title=title,
            agreement_text=agreement_text,
            agreement_type=agreement_type,
            created_at=now_iso,
            updated_at=now_iso,
            status="pending_acceptance",
            stake_amount=u256(stake_amount),
            precedent_policy=precedent_policy,
            tags_json=json.dumps(tags),
        )
        self.agreement_cases_json[agreement_id] = json.dumps([])
        return agreement_id

    @gl.public.write
    def accept_agreement(self, agreement_id: str) -> None:
        agreement = self.agreements[agreement_id]
        if gl.message.sender_address != agreement.counterparty:
            raise Exception("only counterparty may accept")
        if agreement.status != "pending_acceptance":
            raise Exception("agreement is not pending acceptance")
        agreement.status = "active"
        agreement.updated_at = gl.message_raw["datetime"]

    # ------------------------------------------------------------------
    # Disputes
    # ------------------------------------------------------------------

    @gl.public.write
    def file_dispute(
        self,
        agreement_id: str,
        claim_summary: str,
        requested_outcome: str,
        evidence_urls: list[str],
    ) -> str:
        agreement = self.agreements[agreement_id]
        sender = gl.message.sender_address

        if sender not in (agreement.creator, agreement.counterparty):
            raise Exception("caller must be a party to the agreement")
        if agreement.status not in ("active", "disputed"):
            raise Exception("agreement must be active to dispute")
        if requested_outcome not in ALLOWED_REQUESTED_OUTCOMES:
            raise Exception("invalid requested_outcome")
        if len(claim_summary.strip()) < 10:
            raise Exception("claim_summary must be descriptive")

        respondent = agreement.counterparty if sender == agreement.creator else agreement.creator

        now_iso: str = gl.message_raw["datetime"]

        self.dispute_counter += 1
        dispute_id = f"DIS_{int(self.dispute_counter)}"

        self.disputes[dispute_id] = Dispute(
            dispute_id=dispute_id,
            agreement_id=agreement_id,
            claimant=sender,
            respondent=respondent,
            claim_summary=claim_summary,
            requested_outcome=requested_outcome,
            evidence_urls_json=json.dumps(evidence_urls),
            counter_evidence_urls_json=json.dumps([]),
            response_summary="",
            filed_at=now_iso,
            responded_at="",
            resolved_at="",
            status="awaiting_response",
            final_case_id="",
            appeal_count=u256(0),
            claimant_evidence_count=u256(0),
            respondent_evidence_count=u256(0),
            precedent_search_json="",
            verdict_json="",
        )
        agreement.status = "disputed"
        agreement.updated_at = now_iso

        dispute = self.disputes[dispute_id]
        for url in evidence_urls:
            self._create_evidence_item(dispute, dispute_id, "claimant", url)

        return dispute_id

    @gl.public.write
    def submit_response(
        self, dispute_id: str, response_summary: str, counter_evidence_urls: list[str]
    ) -> None:
        dispute = self.disputes[dispute_id]
        if gl.message.sender_address != dispute.respondent:
            raise Exception("only respondent may submit a response")
        if dispute.status != "awaiting_response":
            raise Exception("dispute is not awaiting a response")

        dispute.response_summary = response_summary
        dispute.counter_evidence_urls_json = json.dumps(counter_evidence_urls)
        dispute.responded_at = gl.message_raw["datetime"]
        dispute.status = "awaiting_precedent_search"

        for url in counter_evidence_urls:
            self._create_evidence_item(dispute, dispute_id, "respondent", url)

    # ------------------------------------------------------------------
    # Evidence (fetched and verified through GenLayer web access)
    # ------------------------------------------------------------------

    def _evidence_key(self, dispute_id: str, side: str, index: int) -> str:
        return f"{dispute_id}:{side}:{index}"

    def _is_private_or_local_host(self, host: str) -> bool:
        if host in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            return True
        if host.startswith("169.254.") or host.startswith("10.") or host.startswith("192.168."):
            return True
        if host.startswith("172."):
            parts = host.split(".")
            if len(parts) > 1:
                try:
                    second_octet = int(parts[1])
                    if 16 <= second_octet <= 31:
                        return True
                except ValueError:
                    pass
        return False

    def _evidence_url_status(self, url: str) -> str:
        if not url or len(url.strip()) == 0:
            return "invalid_url"
        if len(url) > MAX_EVIDENCE_URL_LENGTH:
            return "invalid_url"
        if not url.startswith("https://"):
            return "invalid_url"

        host = url[len("https://"):].split("/")[0].split(":")[0].lower()
        if self._is_private_or_local_host(host):
            return "invalid_url"

        return "unverified"

    def _create_evidence_item(self, dispute: Dispute, dispute_id: str, side: str, url: str) -> int:
        if side == "claimant":
            index = int(dispute.claimant_evidence_count)
            dispute.claimant_evidence_count += 1
        else:
            index = int(dispute.respondent_evidence_count)
            dispute.respondent_evidence_count += 1

        key = self._evidence_key(dispute_id, side, index)
        self.evidence_items[key] = EvidenceItem(
            url=url,
            side=side,
            status=self._evidence_url_status(url),
            http_status=u256(0),
            content_hash="",
            content_type="",
            evidence_summary="",
            short_quote="",
            verified_at="",
            verified_seq=u256(0),
        )
        return index

    @gl.public.write
    def add_evidence(self, dispute_id: str, side: str, url: str) -> int:
        if side not in ("claimant", "respondent"):
            raise Exception("side must be claimant or respondent")

        dispute = self.disputes[dispute_id]
        sender = gl.message.sender_address
        expected = dispute.claimant if side == "claimant" else dispute.respondent
        if sender != expected:
            raise Exception("only the matching party may add evidence for that side")
        if dispute.status in ("finalized", "under_appeal"):
            raise Exception("dispute is no longer accepting evidence")

        return self._create_evidence_item(dispute, dispute_id, side, url)

    @gl.public.write
    def verify_evidence_url(self, dispute_id: str, side: str, evidence_index: int) -> dict:
        if side not in ("claimant", "respondent"):
            raise Exception("side must be claimant or respondent")

        dispute = self.disputes[dispute_id]
        key = self._evidence_key(dispute_id, side, evidence_index)
        if key not in self.evidence_items:
            raise Exception("evidence item not found")

        evidence = self.evidence_items[key]
        if evidence.status == "invalid_url":
            raise gl.vm.UserError("cannot verify an invalid evidence URL")
        if not evidence.url.startswith("https://"):
            raise gl.vm.UserError("only https evidence URLs are allowed")

        url = evidence.url
        claim_summary = dispute.claim_summary

        def verify_and_summarize() -> str:
            response = gl.nondet.web.request(url, method="GET")
            http_status = int(response.status)

            if http_status >= 400:
                return json.dumps({
                    "status": "failed_fetch",
                    "http_status": http_status,
                    "content_hash": "",
                    "content_type": "",
                    "evidence_summary": "",
                    "short_quote": "",
                }, sort_keys=True)

            body = response.body
            content_hash = hashlib.sha256(body).hexdigest()

            try:
                text = body.decode("utf-8", errors="replace")
            except Exception:
                text = ""
            text = text[:6000]

            prompt = f"""
You are verifying evidence for a CaseWeave dispute on GenLayer.

Dispute claim:
{claim_summary}

Fetched web evidence content (truncated):
{text}

Extract only facts from the fetched content that are directly relevant to the
dispute claim above. Do not invent facts that are not present in the content.

Return only canonical JSON matching this schema, nothing else:
{{
  "status": "verified|not_relevant|unstable",
  "evidence_summary": "concise summary under 300 characters of the dispute-relevant facts found",
  "short_quote": "a short supporting quote under 200 characters from the content, or empty string",
  "supports_side": "claimant|respondent|unclear"
}}
Do not include markdown or private reasoning.
"""
            llm_result = gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "").strip()
            parsed = json.loads(llm_result)

            return json.dumps({
                "status": str(parsed.get("status", "unstable")),
                "http_status": http_status,
                "content_hash": content_hash,
                "content_type": "",
                "evidence_summary": str(parsed.get("evidence_summary", ""))[:400],
                "short_quote": str(parsed.get("short_quote", ""))[:250],
            }, sort_keys=True)

        result_json = gl.eq_principle.prompt_comparative(
            verify_and_summarize,
            principle=(
                "Two results are equivalent only if they agree exactly on "
                "http_status and content_hash (these are objective facts about "
                "the fetched response and must match precisely). The status "
                "field must also agree, except that a byte-for-byte identical "
                "content_hash always implies agreement regardless of status "
                "wording. evidence_summary and short_quote do not need to "
                "match wording, only convey the same meaning."
            ),
        )
        result = json.loads(result_json)

        status = str(result.get("status", "unstable"))
        if status not in EVIDENCE_STATUSES or status in ("unverified", "invalid_url"):
            status = "unstable"

        evidence.status = status
        evidence.http_status = u256(int(result.get("http_status", 0)))
        evidence.content_hash = str(result.get("content_hash", ""))
        evidence.content_type = str(result.get("content_type", ""))
        evidence.evidence_summary = str(result.get("evidence_summary", ""))
        evidence.short_quote = str(result.get("short_quote", ""))
        evidence.verified_at = gl.message_raw["datetime"]
        self.evidence_counter += 1
        evidence.verified_seq = self.evidence_counter

        return self._evidence_to_dict(evidence)

    # ------------------------------------------------------------------
    # Precedent search (non-deterministic)
    # ------------------------------------------------------------------

    def _candidate_precedents(self, agreement_type: str) -> list[dict]:
        candidates = []
        for case_id, case in self.precedents.items():
            if case.agreement_type == agreement_type and case.status in ("active", "weakened", "limited"):
                candidates.append({
                    "case_id": case_id,
                    "legal_issue": case.legal_issue,
                    "holding": case.holding,
                    "fact_pattern_summary": case.fact_pattern_summary,
                    "outcome": case.outcome,
                    "precedent_strength": int(case.precedent_strength),
                    "status": case.status,
                })
        return candidates

    @gl.public.write
    def request_precedent_search(self, dispute_id: str) -> dict:
        dispute = self.disputes[dispute_id]
        if dispute.status != "awaiting_precedent_search":
            raise Exception("dispute is not awaiting precedent search")

        agreement = self.agreements[dispute.agreement_id]
        candidates = self._candidate_precedents(agreement.agreement_type)

        def get_search_result() -> str:
            prompt = f"""
You are a GenLayer validator for CaseWeave performing precedent search.

Current dispute claim summary:
{dispute.claim_summary}

Requested outcome: {dispute.requested_outcome}

Candidate prior cases (JSON):
{json.dumps(candidates)}

Identify which candidate cases are materially relevant to the current dispute.
Return only canonical JSON matching this schema, nothing else:
{{
  "ok": true,
  "relevant_cases": [
    {{"case_id": "string", "similarity_score": 0-100, "shared_issue": "string", "risk": "string"}}
  ],
  "search_summary": "string"
}}
If there are no candidate cases or none are relevant, return an empty relevant_cases list and explain in search_summary.
Do not include markdown or private reasoning.
"""
            result = gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = gl.eq_principle.prompt_comparative(
            get_search_result,
            principle=(
                "Two results are equivalent if they identify the same set of "
                "relevant case_id values (or both identify no relevant cases). "
                "Similarity scores may differ by up to 15 points and the wording "
                "of shared_issue, risk, and search_summary does not need to match "
                "exactly, only convey the same meaning."
            ),
        )
        dispute.precedent_search_json = result_json
        dispute.status = "awaiting_verdict"
        return json.loads(result_json)

    # ------------------------------------------------------------------
    # Verdict (non-deterministic)
    # ------------------------------------------------------------------

    def _evidence_for_side(self, dispute_id: str, side: str, count: int) -> list[dict]:
        items = []
        for i in range(count):
            key = self._evidence_key(dispute_id, side, i)
            if key in self.evidence_items:
                items.append(self._evidence_to_dict(self.evidence_items[key]))
        return items

    @gl.public.write
    def request_verdict(self, dispute_id: str) -> dict:
        dispute = self.disputes[dispute_id]
        if dispute.status != "awaiting_verdict":
            raise Exception("dispute is not awaiting a verdict")

        agreement = self.agreements[dispute.agreement_id]
        relevant_cases = []
        if dispute.precedent_search_json:
            relevant_cases = json.loads(dispute.precedent_search_json).get("relevant_cases", [])

        claimant_evidence = self._evidence_for_side(
            dispute_id, "claimant", int(dispute.claimant_evidence_count)
        )
        respondent_evidence = self._evidence_for_side(
            dispute_id, "respondent", int(dispute.respondent_evidence_count)
        )
        verified_count = sum(
            1 for e in claimant_evidence + respondent_evidence if e["status"] == "verified"
        )
        if verified_count == 0:
            raise Exception(
                "at least one verified evidence item is required before a verdict can be requested"
            )

        def get_verdict() -> str:
            prompt = f"""
You are a GenLayer validator evaluating a dispute for CaseWeave, a decentralized common-law memory layer for web3 agreements.

You must evaluate the current dispute using the agreement text, party claims, evidence summaries, and prior precedent cases.

Your task is not only to decide the outcome. You must also decide how prior cases should be treated and what reusable rule this case should leave behind.

Agreement type: {agreement.agreement_type}
Precedent policy: {agreement.precedent_policy}

Agreement text:
{agreement.agreement_text}

Claimant claim summary:
{dispute.claim_summary}

Claimant requested outcome: {dispute.requested_outcome}

Claimant evidence (fetched and verified by GenLayer validators, JSON):
{json.dumps(claimant_evidence)}

Respondent response summary:
{dispute.response_summary}

Respondent evidence (fetched and verified by GenLayer validators, JSON):
{json.dumps(respondent_evidence)}

Relevant prior precedent cases (JSON):
{json.dumps(relevant_cases)}

Evidence weighting rules:
- Give more weight to evidence with status "verified" (its content was
  independently fetched and hashed by GenLayer validators, and its
  evidence_summary reflects what was actually found at the URL).
- Treat "unverified" evidence as a weak reference only. Its URL has not been
  fetched, so do not assume it supports either party's claim.
- Treat "failed_fetch" and "invalid_url" evidence as no proof at all of the
  underlying claim, only as evidence that a link was supplied.
- Do not assume a URL supports a claim unless its evidence_summary explicitly
  supports it.

Evaluate:
1. What obligation was created by the agreement?
2. What facts are supported by the verified evidence?
3. Which prior cases are materially similar?
4. Which prior cases are distinguishable?
5. Whether any prior rule should be strengthened, weakened, or overturned.
6. The fairest outcome under the agreement and precedent policy.
7. A concise holding future validators can reuse.

Return only canonical JSON matching this schema:
{{
  "verdict": "claimant_wins|respondent_wins|partial_release|refund|revision_required|no_breach|mutual_fault|insufficient_evidence|bad_faith_claim|settlement_recommended|escalate_to_human",
  "confidence": 0-100,
  "claimant_score": 0-100,
  "respondent_score": 0-100,
  "precedent_alignment": "followed|followed_with_limits|distinguished|no_relevant_precedent|created_new_rule|weakened_prior_rule|overturned_prior_rule|conflicting_precedents|insufficient_case_memory",
  "followed_cases": ["case_id"],
  "distinguished_cases": ["case_id"],
  "weakened_cases": ["case_id"],
  "overturned_cases": ["case_id"],
  "holding": "one reusable rule stated clearly",
  "short_reason": "brief explanation under 350 characters",
  "legal_issue": "the central question of this case",
  "fact_pattern_summary": "plain language summary of what happened",
  "reasoning_rule": "a more detailed rule for future cases",
  "tags": ["short-tag-1", "short-tag-2"]
}}

Do not include markdown. Do not include private reasoning. Do not invent evidence that was not provided.
"""
            result = gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(result), sort_keys=True)

        result_json = gl.eq_principle.prompt_comparative(
            get_verdict,
            principle=(
                "Two results are equivalent if they agree on: the final verdict "
                "category; the precedent_alignment category; materially similar "
                "followed_cases, distinguished_cases, weakened_cases, and "
                "overturned_cases (same case_id sets, order does not matter); "
                "materially similar outcome effect on the parties; and confidence "
                "values within the same band (low 0-39, medium 40-69, high "
                "70-100). The exact wording of holding, short_reason, "
                "legal_issue, fact_pattern_summary, and reasoning_rule does not "
                "need to match, only express the same rule and facts."
            ),
        )
        dispute.verdict_json = result_json
        dispute.status = "verdict_reached"
        return json.loads(result_json)

    # ------------------------------------------------------------------
    # Finalize precedent (deterministic)
    # ------------------------------------------------------------------

    @gl.public.write
    def finalize_precedent(self, dispute_id: str) -> str:
        dispute = self.disputes[dispute_id]
        if dispute.status != "verdict_reached":
            raise Exception("dispute has no verdict to finalize")
        if not dispute.verdict_json:
            raise Exception("missing verdict data")

        verdict = json.loads(dispute.verdict_json)
        if verdict.get("verdict") not in ALLOWED_VERDICTS:
            raise Exception("verdict category invalid")
        if verdict.get("precedent_alignment") not in ALLOWED_PRECEDENT_ALIGNMENTS:
            raise Exception("precedent_alignment invalid")

        agreement = self.agreements[dispute.agreement_id]
        now_iso: str = gl.message_raw["datetime"]

        self.case_counter += 1
        case_id = f"CASE_{int(self.case_counter)}"

        confidence = int(verdict.get("confidence", 0))
        strength = max(0, min(100, confidence))

        self.precedents[case_id] = PrecedentCase(
            case_id=case_id,
            dispute_id=dispute_id,
            agreement_type=agreement.agreement_type,
            fact_pattern_summary=str(verdict.get("fact_pattern_summary", "")),
            legal_issue=str(verdict.get("legal_issue", "")),
            holding=str(verdict.get("holding", "")),
            reasoning_rule=str(verdict.get("reasoning_rule", "")),
            outcome=str(verdict.get("verdict", "")),
            precedent_strength=u256(strength),
            tags_json=json.dumps(verdict.get("tags", [])),
            created_at=now_iso,
            citation_count=u256(0),
            negative_treatment_count=u256(0),
            status="active",
        )

        treatments = []
        for old_case_id in verdict.get("followed_cases", []):
            treatments.append(self._apply_treatment(case_id, old_case_id, "followed", 0))
        for old_case_id in verdict.get("distinguished_cases", []):
            treatments.append(self._apply_treatment(case_id, old_case_id, "distinguished", 0))
        for old_case_id in verdict.get("weakened_cases", []):
            treatments.append(self._apply_treatment(case_id, old_case_id, "weakened", 0))
        for old_case_id in verdict.get("overturned_cases", []):
            treatments.append(self._apply_treatment(case_id, old_case_id, "overturned", 0))

        self.case_treatments_json[case_id] = json.dumps(treatments)

        existing_cases = json.loads(self.agreement_cases_json.get(dispute.agreement_id, "[]"))
        existing_cases.append(case_id)
        self.agreement_cases_json[dispute.agreement_id] = json.dumps(existing_cases)

        dispute.final_case_id = case_id
        dispute.resolved_at = now_iso
        dispute.status = "finalized"
        agreement.status = "resolved"
        agreement.updated_at = now_iso

        return case_id

    def _apply_treatment(self, new_case_id: str, old_case_id: str, treatment: str, similarity_score: int) -> dict:
        if old_case_id in self.precedents:
            old_case = self.precedents[old_case_id]
            if treatment in ("followed", "distinguished", "cited_for_context"):
                old_case.citation_count += 1
            if treatment == "weakened":
                old_case.citation_count += 1
                old_case.negative_treatment_count += 1
                if old_case.status == "active":
                    old_case.status = "weakened"
            if treatment == "overturned":
                old_case.negative_treatment_count += 1
                old_case.status = "overturned"
        return {
            "new_case_id": new_case_id,
            "old_case_id": old_case_id,
            "treatment": treatment,
            "similarity_score": similarity_score,
            "reason": "",
        }

    # ------------------------------------------------------------------
    # Appeals
    # ------------------------------------------------------------------

    @gl.public.write
    def file_appeal(
        self, dispute_id: str, appeal_ground: str, requested_change: str, bond_amount: int
    ) -> str:
        dispute = self.disputes[dispute_id]
        if dispute.status != "finalized":
            raise Exception("only finalized disputes may be appealed")
        if appeal_ground not in ALLOWED_APPEAL_GROUNDS:
            raise Exception("invalid appeal_ground")
        sender = gl.message.sender_address
        if sender not in (dispute.claimant, dispute.respondent):
            raise Exception("only a party to the dispute may appeal")
        if bond_amount <= 0:
            raise Exception("appeal requires a bond")

        self.appeal_counter += 1
        appeal_id = f"APP_{int(self.appeal_counter)}"

        self.appeals[appeal_id] = Appeal(
            appeal_id=appeal_id,
            dispute_id=dispute_id,
            appellant=sender,
            appeal_ground=appeal_ground,
            bond_amount=u256(bond_amount),
            status="under_review",
            requested_change=requested_change,
            result="",
            filed_at=gl.message_raw["datetime"],
            resolved_at="",
        )
        dispute.appeal_count += 1
        dispute.status = "under_appeal"
        return appeal_id

    @gl.public.write
    def resolve_appeal(self, appeal_id: str, result: str) -> None:
        appeal = self.appeals[appeal_id]
        if appeal.status != "under_review":
            raise Exception("appeal already resolved")
        if result not in ALLOWED_APPEAL_RESULTS:
            raise Exception("invalid appeal result")

        appeal.result = result
        appeal.status = "resolved"
        appeal.resolved_at = gl.message_raw["datetime"]

        dispute = self.disputes[appeal.dispute_id]
        dispute.status = "finalized"

        if dispute.final_case_id and dispute.final_case_id in self.precedents:
            case = self.precedents[dispute.final_case_id]
            if result == "weakened_precedent" and case.status == "active":
                case.status = "weakened"
            if result == "overturned_precedent":
                case.status = "overturned"

    # ------------------------------------------------------------------
    # Views
    # ------------------------------------------------------------------

    def _agreement_to_dict(self, agreement: Agreement) -> dict:
        return {
            "agreement_id": agreement.agreement_id,
            "creator": agreement.creator.as_hex,
            "counterparty": agreement.counterparty.as_hex,
            "title": agreement.title,
            "agreement_text": agreement.agreement_text,
            "agreement_type": agreement.agreement_type,
            "status": agreement.status,
            "stake_amount": int(agreement.stake_amount),
            "precedent_policy": agreement.precedent_policy,
            "tags": json.loads(agreement.tags_json),
            "created_at": agreement.created_at,
            "updated_at": agreement.updated_at,
        }

    def _dispute_to_dict(self, dispute: Dispute) -> dict:
        return {
            "dispute_id": dispute.dispute_id,
            "agreement_id": dispute.agreement_id,
            "claimant": dispute.claimant.as_hex,
            "respondent": dispute.respondent.as_hex,
            "claim_summary": dispute.claim_summary,
            "requested_outcome": dispute.requested_outcome,
            "evidence_urls": json.loads(dispute.evidence_urls_json),
            "counter_evidence_urls": json.loads(dispute.counter_evidence_urls_json),
            "response_summary": dispute.response_summary,
            "filed_at": dispute.filed_at,
            "responded_at": dispute.responded_at,
            "resolved_at": dispute.resolved_at,
            "status": dispute.status,
            "final_case_id": dispute.final_case_id,
            "appeal_count": int(dispute.appeal_count),
            "claimant_evidence_count": int(dispute.claimant_evidence_count),
            "respondent_evidence_count": int(dispute.respondent_evidence_count),
            "precedent_search": json.loads(dispute.precedent_search_json) if dispute.precedent_search_json else None,
            "verdict": json.loads(dispute.verdict_json) if dispute.verdict_json else None,
        }

    def _evidence_to_dict(self, evidence: EvidenceItem) -> dict:
        return {
            "url": evidence.url,
            "side": evidence.side,
            "status": evidence.status,
            "http_status": int(evidence.http_status),
            "content_hash": evidence.content_hash,
            "content_type": evidence.content_type,
            "evidence_summary": evidence.evidence_summary,
            "short_quote": evidence.short_quote,
            "verified_at": evidence.verified_at,
            "verified_seq": int(evidence.verified_seq),
        }

    def _case_to_dict(self, case: PrecedentCase) -> dict:
        return {
            "case_id": case.case_id,
            "dispute_id": case.dispute_id,
            "agreement_type": case.agreement_type,
            "fact_pattern_summary": case.fact_pattern_summary,
            "legal_issue": case.legal_issue,
            "holding": case.holding,
            "reasoning_rule": case.reasoning_rule,
            "outcome": case.outcome,
            "precedent_strength": int(case.precedent_strength),
            "tags": json.loads(case.tags_json),
            "citation_count": int(case.citation_count),
            "negative_treatment_count": int(case.negative_treatment_count),
            "status": case.status,
            "created_at": case.created_at,
        }

    def _appeal_to_dict(self, appeal: Appeal) -> dict:
        return {
            "appeal_id": appeal.appeal_id,
            "dispute_id": appeal.dispute_id,
            "appellant": appeal.appellant.as_hex,
            "appeal_ground": appeal.appeal_ground,
            "bond_amount": int(appeal.bond_amount),
            "status": appeal.status,
            "requested_change": appeal.requested_change,
            "result": appeal.result,
            "filed_at": appeal.filed_at,
            "resolved_at": appeal.resolved_at,
        }

    @gl.public.view
    def get_agreement(self, agreement_id: str) -> dict:
        return self._agreement_to_dict(self.agreements[agreement_id])

    @gl.public.view
    def list_agreements(self) -> dict:
        return {k: self._agreement_to_dict(v) for k, v in self.agreements.items()}

    @gl.public.view
    def get_dispute(self, dispute_id: str) -> dict:
        return self._dispute_to_dict(self.disputes[dispute_id])

    @gl.public.view
    def list_disputes_by_agreement(self, agreement_id: str) -> dict:
        return {
            k: self._dispute_to_dict(v)
            for k, v in self.disputes.items()
            if v.agreement_id == agreement_id
        }

    @gl.public.view
    def get_dispute_verdict(self, dispute_id: str) -> dict:
        dispute = self.disputes[dispute_id]
        return json.loads(dispute.verdict_json) if dispute.verdict_json else {}

    @gl.public.view
    def get_evidence_item(self, dispute_id: str, side: str, evidence_index: int) -> dict:
        key = self._evidence_key(dispute_id, side, evidence_index)
        return self._evidence_to_dict(self.evidence_items[key])

    @gl.public.view
    def list_evidence_for_dispute(self, dispute_id: str) -> dict:
        dispute = self.disputes[dispute_id]
        claimant_items = self._evidence_for_side(
            dispute_id, "claimant", int(dispute.claimant_evidence_count)
        )
        respondent_items = self._evidence_for_side(
            dispute_id, "respondent", int(dispute.respondent_evidence_count)
        )
        return {
            "claimant": claimant_items,
            "respondent": respondent_items,
        }

    @gl.public.view
    def get_precedent_case(self, case_id: str) -> dict:
        return self._case_to_dict(self.precedents[case_id])

    @gl.public.view
    def get_case_treatments(self, case_id: str) -> list:
        raw = self.case_treatments_json.get(case_id, "[]")
        return json.loads(raw)

    @gl.public.view
    def list_cases_by_tag(self, tag: str) -> dict:
        return {
            k: self._case_to_dict(v)
            for k, v in self.precedents.items()
            if tag in json.loads(v.tags_json)
        }

    @gl.public.view
    def list_cases_by_agreement_type(self, agreement_type: str) -> dict:
        return {
            k: self._case_to_dict(v)
            for k, v in self.precedents.items()
            if v.agreement_type == agreement_type
        }

    @gl.public.view
    def list_recent_precedents(self, limit: int) -> dict:
        items = list(self.precedents.items())
        items.sort(key=lambda kv: kv[1].created_at, reverse=True)
        return {k: self._case_to_dict(v) for k, v in items[:limit]}

    @gl.public.view
    def get_precedent_graph(self, case_id: str) -> dict:
        outgoing = json.loads(self.case_treatments_json.get(case_id, "[]"))
        incoming = []
        for k, raw in self.case_treatments_json.items():
            for t in json.loads(raw):
                if t.get("old_case_id") == case_id:
                    incoming.append(t)
        return {
            "case_id": case_id,
            "outgoing_treatments": outgoing,
            "incoming_treatments": incoming,
        }

    @gl.public.view
    def get_appeal(self, appeal_id: str) -> dict:
        return self._appeal_to_dict(self.appeals[appeal_id])

    @gl.public.view
    def list_appeals(self) -> dict:
        return {k: self._appeal_to_dict(v) for k, v in self.appeals.items()}
