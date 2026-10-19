"""Behavioral Direct Mode coverage for the milestone protocol surfaces."""

from __future__ import annotations

import hashlib
import json


COMMIT = "ff4df65945c068d0d3690aea8f2b256abcbbd290"
REPOSITORY = "https://github.com/ometere123/caseweave"
EVIDENCE_URL = f"https://raw.githubusercontent.com/ometere123/caseweave/{COMMIT}/README.md"
BODY = b"CaseWeave milestone evidence: the committed delivery includes the agreed README change."
COMMIT_METADATA = json.dumps(
    {
        "sha": COMMIT,
        "html_url": f"https://github.com/ometere123/caseweave/commit/{COMMIT}",
        "files": [{"filename": "README.md"}],
    }
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
        "remedy": {
            "action": "release",
            "recipient_role": "claimant",
            "amount_bps": 10000,
        },
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


def _prepare_finalized_case(direct_vm, direct_deploy, owner, respondent, verdict_json):
    """Build one funded finalized case using only real public contract calls."""
    direct_vm.sender = owner
    court = direct_deploy("contracts/caseweave.py", sdk_version="v0.2.16")
    from genlayer.py.types import Address

    owner = Address(bytes(owner))
    respondent = Address(bytes(respondent))
    receiver_address = Address(bytes([0x56]) * 20)
    court.configure_settlement_receiver(receiver_address)

    agreement_id = court.create_technical_agreement(*_technical_args(respondent))
    milestone_id = next(iter(court.list_milestones(agreement_id)))
    direct_vm.sender = respondent
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
        "{}",
        json.dumps(["README.md"]),
        "{}",
        "[]",
        EVIDENCE_URL,
    )
    direct_vm.mock_web(
        r"api\.github\.com/repos/ometere123/caseweave/commits/" + COMMIT + r"$",
        {"method": "GET", "status": 200, "body": COMMIT_METADATA},
    )
    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/ometere123/caseweave/" + COMMIT + r"/README\.md$",
        {"method": "GET", "status": 200, "body": BODY},
    )
    direct_vm.mock_llm(r"software-delivery proof", PROOF_ASSESSMENT)
    court.verify_delivery_proof(proof_id)

    dispute_id = court.file_performance_dispute(
        agreement_id,
        proof_id,
        "The respondent failed to satisfy the pinned delivery obligation.",
        "release_payment",
    )
    direct_vm.sender = respondent
    court.submit_response(dispute_id, "The respondent disputes the claim.", [])
    direct_vm.sender = owner
    court.set_appeal_window(dispute_id, "2030-01-01T00:00:00Z")
    direct_vm.mock_llm(r"verifying evidence for a CaseWeave dispute", VERIFIED)
    court.verify_evidence_url(dispute_id, "claimant", 0)
    direct_vm.mock_llm(r"performing precedent search", SEARCH)
    court.request_precedent_search(dispute_id)
    direct_vm.mock_llm(r"evaluating a dispute", verdict_json)
    court.request_verdict(dispute_id)
    direct_vm.sender = owner
    case_id = court.finalize_precedent(dispute_id)
    return court, receiver_address, agreement_id, dispute_id, case_id


def _close_appeal_window(direct_vm, court, dispute_id, owner):
    direct_vm.warp("2031-01-01T00:00:00Z")
    from genlayer import gl

    gl.message_raw["datetime"] = direct_vm._datetime
    direct_vm.sender = owner
    court.close_appeal_window(dispute_id)


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
    receiver_address = Address(bytes([0x34]) * 20)
    direct_vm.sender = owner
    court.configure_settlement_receiver(receiver_address)

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
        r"api\.github\.com/repos/ometere123/caseweave/commits/" + COMMIT + r"$",
        {"method": "GET", "status": 200, "body": COMMIT_METADATA},
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

    substitution_proof_id = court.register_delivery_proof(
        agreement_id,
        milestone_id,
        REPOSITORY,
        "ometere123/caseweave",
        COMMIT,
        "{}",
        json.dumps(["src/unchanged-file.ts"]),
        "{}",
        "[]",
        EVIDENCE_URL,
    )
    with direct_vm.expect_revert("delivery source could not be independently verified"):
        court.verify_delivery_proof(substitution_proof_id)
    assert court.get_delivery_proof(substitution_proof_id)["status"] == "submitted"

    dispute_id = court.file_performance_dispute(
        agreement_id,
        proof_id,
        "The respondent failed to satisfy the pinned delivery obligation.",
        "release_payment",
    )
    direct_vm.sender = alice
    court.submit_response(dispute_id, "The response disputes the alleged delivery failure.", [])
    direct_vm.sender = owner
    court.set_appeal_window(dispute_id, "2030-01-01T00:00:00Z")
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
    direct_vm.mock_llm(r"independent CaseWeave evidence-court validator", CHALLENGE_FINDING)
    finding = court.resolve_evidence_challenge(challenge_id)
    assert finding["finding"] == "admissible"
    assert court.get_evidence_metadata(dispute_id, "claimant", 0)["frozen"] == "no"
    malicious_finding = json.dumps(
        {
            "challenge_id": challenge_id,
            "evidence_key": f"{dispute_id}:claimant:0",
            "finding": "inadmissible",
            "authenticity": "disputed",
            "relevance": "irrelevant",
            "credibility": "low",
            "reason": "unsupported leader claim",
        }
    )
    assert direct_vm.run_validator(leader_result=malicious_finding, index=-1) is False

    direct_vm.mock_llm(r"performing precedent search", SEARCH)
    court.request_precedent_search(dispute_id)
    direct_vm.mock_llm(r"evaluating a dispute", VERDICT)
    court.request_verdict(dispute_id)
    direct_vm.sender = owner
    with direct_vm.expect_revert("historical evidence snapshot is immutable"):
        court.verify_evidence_url(dispute_id, "claimant", 0)
    with direct_vm.expect_revert("dispute is no longer accepting evidence"):
        court.add_evidence(dispute_id, "claimant", EVIDENCE_URL)
    direct_vm.sender = owner
    case_id = court.finalize_precedent(dispute_id)
    judgment = court.get_current_judgment(dispute_id)
    assert judgment["status"] == "finalized"
    assert judgment["case_id"] == case_id
    assert judgment["evidence_snapshot_hash"]

    direct_vm.warp("2031-01-01T00:00:00Z")
    direct_vm.sender = owner
    from genlayer import gl

    gl.message_raw["datetime"] = direct_vm._datetime
    court.close_appeal_window(dispute_id)

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
    with direct_vm.expect_revert("manual child hash confirmations are disabled"):
        court.confirm_transfer(transfer_id, "0x" + "1" * 64)
    assert court.get_transfer(transfer_id) == pending

    direct_vm.value = 0
    direct_vm.sender = receiver_address
    confirmed = court.confirm_protocol_receipt(
        transfer_id,
        receiver_address,
        owner,
        pending["amount"],
        pending["proof_commitment"],
    )
    assert confirmed["status"] == "custodied"
    assert court.get_escrow(agreement_id)["settled"] == 100
    assert court.get_accounting_invariant()["total_liabilities"] == 900
    with direct_vm.expect_revert("transfer is not awaiting custody"):
        court.confirm_protocol_receipt(
            transfer_id,
            receiver_address,
            owner,
            pending["amount"],
            pending["proof_commitment"],
        )

    # A late/plain deposit is explicitly accounted by sender and can be
    # refunded or reconciled after a failed child without changing committed
    # milestone liabilities.
    direct_vm.sender = alice
    direct_vm.deal(court.address, 55)
    direct_vm.value = 55
    deposited = court.deposit_unallocated(55)
    direct_vm.value = 0
    assert deposited["balance"] == 55
    assert court.get_unallocated_balance(alice) == 55
    refund_id = court.refund_unallocated(55)
    assert court.get_transfer(refund_id)["source_bucket"] == "unallocated"
    assert court.get_unallocated_balance(alice) == 0
    direct_vm.value = 55
    court.__on_errored_message__()
    direct_vm.value = 0
    assert court.get_transfer(refund_id)["status"] == "failed"
    direct_vm.sender = alice
    court.reconcile_failed_transfer(refund_id)
    assert court.get_unallocated_balance(alice) == 55
    assert court.get_unallocated_accounting()["failed"] == 0


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
        r"api\.github\.com/repos/ometere123/caseweave/commits/" + COMMIT + r"$",
        {"method": "GET", "status": 200, "body": COMMIT_METADATA},
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


def test_partial_release_is_bounded_to_the_consensus_remedy(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
):
    partial_verdict = "```json\n" + json.dumps(
        {
            "verdict": "partial_release",
            "confidence": 76,
            "claimant_score": 76,
            "respondent_score": 24,
            "precedent_alignment": "no_relevant_precedent",
            "followed_cases": [],
            "distinguished_cases": [],
            "weakened_cases": [],
            "overturned_cases": [],
            "remedy": {
                "action": "partial_release",
                "recipient_role": "claimant",
                "amount_bps": 2500,
            },
            "holding": "A materially incomplete delivery supports only the bounded agreed release.",
            "short_reason": "Only one quarter of the committed obligation was established.",
            "legal_issue": "What portion of the committed milestone was established.",
            "fact_pattern_summary": "The evidence supports partial performance.",
            "reasoning_rule": "A partial finding cannot release the full committed amount.",
            "tags": ["partial"],
        }
    ) + "\n```"
    court, receiver_address, agreement_id, dispute_id, _ = _prepare_finalized_case(
        direct_vm, direct_deploy, direct_owner, direct_alice, partial_verdict
    )
    _close_appeal_window(direct_vm, court, dispute_id, direct_owner)

    transfer_id = court.settle_judgment(dispute_id)
    transfer = court.get_transfer(transfer_id)
    assert transfer["amount"] == 25
    assert transfer["recipient"] == court.get_agreement(agreement_id)["creator"]
    assert court.get_escrow(agreement_id)["committed"] == 75
    assert court.get_accounting_invariant()["solvent"] is True
    from genlayer.py.types import Address

    direct_vm.sender = receiver_address
    direct_vm.value = 0
    court.confirm_protocol_receipt(
        transfer_id,
        receiver_address,
        Address(bytes(direct_owner)),
        int(transfer["amount"]),
        transfer["proof_commitment"],
    )
    with direct_vm.expect_revert("judgment settlement has already been created"):
        court.settle_judgment(dispute_id)


def test_revision_required_cannot_create_a_full_settlement(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
):
    revision_verdict = "```json\n" + json.dumps(
        {
            "verdict": "revision_required",
            "confidence": 70,
            "claimant_score": 50,
            "respondent_score": 50,
            "precedent_alignment": "no_relevant_precedent",
            "followed_cases": [],
            "distinguished_cases": [],
            "weakened_cases": [],
            "overturned_cases": [],
            "remedy": {"action": "none", "recipient_role": "none", "amount_bps": 0},
            "holding": "The evidence requires another revision before settlement.",
            "short_reason": "The evidence is not sufficient for a financial release.",
            "legal_issue": "Whether the delivery is ready for settlement.",
            "fact_pattern_summary": "The record is inconclusive.",
            "reasoning_rule": "An unresolved revision request does not authorize payment.",
            "tags": ["revision"],
        }
    ) + "\n```"
    court, _, agreement_id, dispute_id, _ = _prepare_finalized_case(
        direct_vm, direct_deploy, direct_owner, direct_alice, revision_verdict
    )
    _close_appeal_window(direct_vm, court, dispute_id, direct_owner)
    before = court.get_escrow(agreement_id)
    with direct_vm.expect_revert("judgment does not authorize a funded payout"):
        court.settle_judgment(dispute_id)
    assert court.get_escrow(agreement_id) == before
    assert court.get_accounting_invariant()["solvent"] is True


def test_appellate_replacement_judgment_controls_recipient_and_amount(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
):
    court, receiver_address, agreement_id, dispute_id, case_id = _prepare_finalized_case(
        direct_vm, direct_deploy, direct_owner, direct_alice, VERDICT
    )
    judgment = court.get_current_judgment(dispute_id)
    direct_vm.sender = direct_alice
    # Direct Mode does not debit the caller's balance when a payable message
    # is constructed, so provision the contract balance for the appeal bond.
    # StudioNet performs this native-value transfer as part of the transaction.
    direct_vm.deal(court.address, 1001)
    direct_vm.value = 1
    appeal_id = court.file_appeal(
        dispute_id,
        "outcome_inconsistent_with_holding",
        "The first-instance remedy selected the wrong party.",
        1,
    )
    direct_vm.value = 0
    appellate = "```json\n" + json.dumps(
        {
            "appeal_id": appeal_id,
            "dispute_id": dispute_id,
            "case_id": case_id,
            "snapshot_id": judgment["evidence_snapshot_id"],
            "result": "modified",
            "affected_case_id": case_id,
            "remedy_outcome": "respondent_wins",
            "remedy": {
                "action": "release",
                "recipient_role": "respondent",
                "amount_bps": 10000,
            },
            "reasoning": "The appellate review changes the authoritative remedy.",
            "findings": [],
        }
    ) + "\n```"
    direct_vm.mock_llm(r"independent appellate validator", appellate)
    direct_vm.sender = direct_owner
    decision = court.request_appeal_review(appeal_id)
    assert decision["result"] == "modified"
    current = court.get_current_judgment(dispute_id)
    assert current["supersedes"] == judgment["judgment_id"]
    assert current["remedy"]["recipient_role"] == "respondent"

    transfer_id = court.settle_judgment(dispute_id)
    transfer = court.get_transfer(transfer_id)
    assert transfer["recipient"] == court.get_agreement(agreement_id)["counterparty"]
    assert transfer["amount"] == 100
    assert court.get_escrow(agreement_id)["committed"] == 0
    assert court.get_accounting_invariant()["solvent"] is True


def test_remanded_appeal_keeps_settlement_locked(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
):
    court, _, agreement_id, dispute_id, case_id = _prepare_finalized_case(
        direct_vm, direct_deploy, direct_owner, direct_alice, VERDICT
    )
    judgment = court.get_current_judgment(dispute_id)
    direct_vm.sender = direct_alice
    direct_vm.deal(court.address, 1001)
    direct_vm.value = 1
    appeal_id = court.file_appeal(
        dispute_id,
        "new_evidence",
        "The record requires additional authenticated evidence.",
        1,
    )
    direct_vm.value = 0
    remand = "```json\n" + json.dumps(
        {
            "appeal_id": appeal_id,
            "dispute_id": dispute_id,
            "case_id": case_id,
            "snapshot_id": judgment["evidence_snapshot_id"],
            "result": "remanded_for_more_evidence",
            "affected_case_id": "",
            "remedy_outcome": "claimant_wins",
            "remedy": {"action": "none", "recipient_role": "none", "amount_bps": 0},
            "reasoning": "The appellate record is incomplete and needs a remand.",
            "findings": [],
        }
    ) + "\n```"
    direct_vm.mock_llm(r"independent appellate validator", remand)
    direct_vm.sender = direct_owner
    court.request_appeal_review(appeal_id)
    assert court.get_current_judgment(dispute_id)["status"] == "under_appeal"
    before = court.get_escrow(agreement_id)
    with direct_vm.expect_revert("settlement is locked until the dispute is finalized"):
        court.settle_judgment(dispute_id)
    assert court.get_escrow(agreement_id) == before


def test_receiver_reconciles_eoa_child_locks_without_stranding_other_custody(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
    direct_bob,
):
    direct_vm.sender = direct_owner
    receiver = direct_deploy(
        "contracts/caseweave_settlement_receiver.py", sdk_version="v0.2.16"
    )
    from genlayer.py.types import Address

    owner = Address(bytes(direct_owner))
    alice = Address(bytes(direct_alice))
    bob = Address(bytes(direct_bob))
    court = Address(bytes([0x71]) * 20)
    direct_vm.sender = owner
    receiver.configure_court(court)

    direct_vm.sender = court
    direct_vm.value = 7
    receiver.receive_settlement("TR_A", alice, 7, "a" * 64)
    direct_vm.value = 0
    direct_vm.sender = alice
    receiver.withdraw("TR_A")
    assert receiver.get_custody("TR_A")["status"] == "withdrawal_submitted"

    with direct_vm.expect_revert("only the receiver owner"):
        receiver.release_withdrawal_lock("TR_A", "0x" + "1" * 64)

    direct_vm.sender = owner
    receiver.release_withdrawal_lock("TR_A", "0x" + "1" * 64)
    released = receiver.get_custody("TR_A")
    assert released["status"] == "withdrawal_submitted"
    assert released["withdrawal_child_transaction_id"] == "0x" + "1" * 64

    # A successful withdrawal only releases the one-at-a-time lock; another
    # custody record can proceed without falsely marking the first as paid.
    direct_vm.sender = court
    direct_vm.value = 9
    receiver.receive_settlement("TR_B", bob, 9, "b" * 64)
    direct_vm.value = 0
    direct_vm.sender = bob
    receiver.withdraw("TR_B")
    assert receiver.get_custody("TR_B")["status"] == "withdrawal_submitted"

    # The runtime error callback restores custody for a failed value child.
    direct_vm.value = 9
    receiver.__on_errored_message__()
    direct_vm.value = 0
    failed = receiver.get_custody("TR_B")
    assert failed["status"] == "custodied"
    assert failed["withdrawal_child_transaction_id"] == ""

    # A failed child is restored only by the runtime error callback. There is
    # no owner method that can reopen a withdrawal from an asserted hash.
    direct_vm.sender = bob
    receiver.withdraw("TR_B")
    direct_vm.value = 9
    receiver.__on_errored_message__()
    direct_vm.value = 0
    recovered = receiver.get_custody("TR_B")
    assert recovered["status"] == "custodied"
    assert recovered["withdrawal_child_transaction_id"] == ""
