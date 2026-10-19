"""Behavioral Direct Mode coverage for the milestone protocol surfaces."""

from __future__ import annotations

import hashlib
import json


COMMIT = "ff4df65945c068d0d3690aea8f2b256abcbbd290"
REPOSITORY = "https://github.com/ometere123/caseweave"
EVIDENCE_URL = f"https://raw.githubusercontent.com/ometere123/caseweave/{COMMIT}/README.md"
BODY = b"CaseWeave milestone evidence: the committed delivery includes the agreed README change."
COMMIT_FEED = (
    f"<id>tag:github.com,2008:Grit::Commit/{COMMIT}</id>"
    f"<link href=\"https://github.com/ometere123/caseweave/commit/{COMMIT}\"/>"
).encode()

VERIFIED = "```json\n" + json.dumps(
    {
        "status": "verified",
        "evidence_summary": "The pinned source contains the committed delivery statement.",
        "short_quote": "the committed delivery includes the agreed README change",
        "supports_side": "claimant",
    }
) + "\n```"

PROOF_ASSESSMENT = "```json\n" + json.dumps(
    {
        "overall_finding": "satisfied",
        "obligations": [
            {
                "obligation_id": "delivery",
                "finding": "satisfied",
                "reason": "The pinned source content satisfies the committed delivery criterion.",
            }
        ],
        "summary": "The authenticated source revision satisfies the milestone criterion.",
    }
) + "\n```"

CHALLENGE_FINDING = "```json\n" + json.dumps(
    {
        "challenge_id": "CH_1",
        "evidence_key": "DIS_1:claimant:0",
        "finding": "admissible",
        "authenticity": "confirmed",
        "relevance": "relevant",
        "credibility": "high",
        "reason": "The source was fetched again and matched the committed content hash.",
    }
) + "\n```"

SEARCH = "```json\n" + json.dumps(
    {"ok": True, "relevant_cases": [], "search_summary": "No eligible prior case is materially similar."}
) + "\n```"

VERDICT = "```json\n" + json.dumps(
    {
        "verdict": "claimant_wins",
        "confidence": 88,
        "claimant_score": 88,
        "respondent_score": 12,
        "precedent_alignment": "no_relevant_precedent",
        "followed_cases": [],
        "distinguished_cases": [],
        "weakened_cases": [],
        "overturned_cases": [],
        "holding": "A committed source revision that satisfies the agreed criterion supports release to the claimant.",
        "short_reason": "The immutable source snapshot supports the claimant's delivery finding.",
        "legal_issue": "Whether the committed delivery criterion was satisfied.",
        "fact_pattern_summary": "The pinned repository evidence supports the claimant's delivery claim.",
        "reasoning_rule": "Objective source commitments control the performance finding.",
        "tags": ["software-delivery", "source-verified"],
    }
) + "\n```"


def _technical_args(counterparty, amount: int = 100) -> tuple:
    return (
        "Pinned software delivery",
        "The developer must deliver the committed source revision before the deadline.",
        counterparty,
        "agent_service",
        ["github", "delivery"],
        amount,
        "public_precedent",
        "The committed revision must exist in the named repository and satisfy the delivery obligation.",
        json.dumps([{"id": "delivery", "text": "Deliver the committed source revision."}]),
        json.dumps([{"id": "repo-proof", "description": "Commit-pinned repository evidence"}]),
        json.dumps(
            [
                {
                    "name": "Source delivery",
                    "obligation_id": "delivery",
                    "acceptance_criteria": "The pinned revision is present in the named repository.",
                    "deadline": "2030-01-01T00:00:00Z",
                    "amount": amount,
                }
            ]
        ),
        REPOSITORY,
        "github_commit_pinned",
        "The source revision and its verified evidence satisfy the committed delivery condition.",
    )


def test_structured_delivery_evidence_challenge_consensus_and_escrow(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
):
    direct_vm.sender = direct_owner
    court = direct_deploy("contracts/caseweave.py", sdk_version="v0.2.16")
    from genlayer.py.types import Address

    owner = Address(bytes(direct_owner))
    alice = Address(bytes(direct_alice))
    direct_vm.sender = owner

    agreement_id = court.create_technical_agreement(*_technical_args(alice))
    agreement = court.get_agreement(agreement_id)
    spec = court.get_agreement_spec(agreement_id)
    assert agreement["counterparty"] == alice.as_hex
    assert spec["repository_identity"] == "ometere123/caseweave"
    assert len(spec["commitment_hash"]) == 64
    milestone_id = next(iter(court.list_milestones(agreement_id)))

    direct_vm.sender = alice
    court.accept_agreement(agreement_id)
    direct_vm.sender = owner
    direct_vm.deal(court.address, 1000)
    direct_vm.value = 1000
    court.fund_agreement(agreement_id, 1000)
    direct_vm.value = 0
    court.fund_milestone(agreement_id, milestone_id)
    court.submit_deliverable(agreement_id, milestone_id, "github:" + COMMIT)
    proof_id = court.register_delivery_proof(
        agreement_id,
        milestone_id,
        REPOSITORY,
        "ometere123/caseweave",
        COMMIT,
        json.dumps({"number": 7, "merged": True}),
        json.dumps(["README.md"]),
        json.dumps({"workflow": "ci", "status": "success", "sha": COMMIT}),
        json.dumps(["https://caseweave.vercel.app"]),
        EVIDENCE_URL,
    )
    direct_vm.mock_web(
        r"github\.com/ometere123/caseweave/commits/" + COMMIT + r"\.atom",
        {"method": "GET", "status": 200, "body": COMMIT_FEED},
    )
    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/ometere123/caseweave/" + COMMIT + r"/README\.md$",
        {"method": "HEAD", "status": 200, "body": b""},
    )
    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/ometere123/caseweave/" + COMMIT + r"/README\.md$",
        {"method": "GET", "status": 200, "body": BODY},
    )
    direct_vm.mock_web(r"caseweave\.vercel\.app", {"status": 200, "body": b"deployment"})
    direct_vm.mock_llm(r"software-delivery proof", PROOF_ASSESSMENT)
    proof = court.verify_delivery_proof(proof_id)
    assert proof["status"] == "verified"
    assert proof["content_hash"] == hashlib.sha256(BODY).hexdigest()
    assert proof["assessment"]["overall_finding"] == "satisfied"
    assert proof["source_facts"]["commit"]["returned_sha"] == COMMIT
    assert proof["source_facts"]["commit"]["changed_files"] == ["README.md"]
    assert proof["source_facts"]["deployments"][0]["http_status"] == 200

    dispute_id = court.file_performance_dispute(
        agreement_id,
        proof_id,
        "The respondent failed to satisfy the pinned delivery obligation.",
        "release_payment",
    )
    direct_vm.sender = alice
    court.submit_response(dispute_id, "The response disputes the alleged delivery failure.", [])
    direct_vm.sender = owner
    direct_vm.mock_llm(r"verifying evidence for a CaseWeave dispute", VERIFIED)
    evidence = court.verify_evidence_url(dispute_id, "claimant", 0)
    assert evidence["status"] == "verified"

    direct_vm.sender = alice
    challenge_id = court.challenge_evidence(
        dispute_id,
        "claimant",
        0,
        "authenticity",
        "The source should be independently re-fetched before it is admitted.",
        "",
    )
    direct_vm.mock_llm(r"independent CaseWeave evidence court validator", CHALLENGE_FINDING)
    finding = court.resolve_evidence_challenge(challenge_id)
    assert finding["finding"] == "admissible"
    assert court.get_evidence_metadata(dispute_id, "claimant", 0)["frozen"] == "no"

    direct_vm.mock_llm(r"performing precedent search", SEARCH)
    court.request_precedent_search(dispute_id)
    direct_vm.mock_llm(r"evaluating a dispute", VERDICT)
    court.request_verdict(dispute_id)
    case_id = court.finalize_precedent(dispute_id)
    judgment = court.get_current_judgment(dispute_id)
    assert judgment["status"] == "finalized"
    assert judgment["case_id"] == case_id
    assert judgment["evidence_snapshot_hash"]

    escrow = court.get_escrow(agreement_id)
    assert escrow["actual_deposited"] == 1000
    assert escrow["committed"] == 100
    assert escrow["available"] == 900
    invariant = court.get_accounting_invariant()
    assert invariant["total_accounted_assets"] == 1000
    assert invariant["total_liabilities"] == 1000
    assert invariant["solvent"] is True

    transfer_id = court.settle_judgment(dispute_id)
    pending = court.get_transfer(transfer_id)
    assert pending["status"] == "pending"
    assert pending["amount"] == 100
    assert court.get_escrow(agreement_id)["pending_transfer"] == 100
    direct_vm.sender = owner
    confirmed = court.confirm_transfer(transfer_id, "0x" + "1" * 64)
    assert confirmed["status"] == "delivered"
    assert court.get_escrow(agreement_id)["settled"] == 100
    assert court.get_accounting_invariant()["total_liabilities"] == 900


def test_delivery_source_commitment_and_validator_identity_fail_closed(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
):
    direct_vm.sender = direct_owner
    court = direct_deploy("contracts/caseweave.py", sdk_version="v0.2.16")
    from genlayer.py.types import Address

    owner = Address(bytes(direct_owner))
    alice = Address(bytes(direct_alice))
    direct_vm.sender = owner
    args = list(_technical_args(alice))
    args[10] = json.dumps(
        [{"name": "Source delivery", "obligation_id": "delivery", "acceptance_criteria": "Pinned source", "deadline": "2030-01-01", "amount": 1}]
    )
    agreement_id = court.create_technical_agreement(*args)
    direct_vm.sender = alice
    court.accept_agreement(agreement_id)
    direct_vm.sender = owner
    direct_vm.value = 1
    court.fund_agreement(agreement_id, 1)
    direct_vm.value = 0
    milestone_id = next(iter(court.list_milestones(agreement_id)))
    court.fund_milestone(agreement_id, milestone_id)
    court.submit_deliverable(agreement_id, milestone_id, "bad")

    with direct_vm.expect_revert("repository identity does not match"):
        court.register_delivery_proof(
            agreement_id,
            milestone_id,
            REPOSITORY,
            "someone-else/repository",
            COMMIT,
            "{}",
            "[]",
            "{}",
            "[]",
            EVIDENCE_URL,
        )

    proof_id = court.register_delivery_proof(
        agreement_id,
        milestone_id,
        REPOSITORY,
        "ometere123/caseweave",
        COMMIT,
        "{}",
        json.dumps(["README.md"]),
        "{}",
        "[]",
        EVIDENCE_URL,
    )
    direct_vm.mock_web(
        r"github\.com/ometere123/caseweave/commits/" + COMMIT + r"\.atom",
        {"method": "GET", "status": 200, "body": COMMIT_FEED},
    )
    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/ometere123/caseweave/" + COMMIT + r"/README\.md$",
        {"method": "HEAD", "status": 200, "body": b""},
    )
    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/ometere123/caseweave/" + COMMIT + r"/README\.md$",
        {"method": "GET", "status": 200, "body": BODY},
    )
    direct_vm.mock_llm(r"software-delivery proof", PROOF_ASSESSMENT)
    court.verify_delivery_proof(proof_id)
    validators_before = len(direct_vm._captured_validators)
    assert validators_before > 0
    malicious = json.dumps(
        {
            "proof_id": proof_id,
            "adapter": "github_raw",
            "repository_identity": "wrong/repository",
            "commit_sha": COMMIT,
            "http_status": 200,
            "content_hash": hashlib.sha256(BODY).hexdigest(),
        }
    )
    assert direct_vm.run_validator(leader_result=malicious, index=-1) is False
