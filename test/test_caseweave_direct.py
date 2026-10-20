"""Direct GenVM execution tests for the CaseWeave contract.

These tests deliberately use gltest's direct execution mode.  The mocked web
and LLM responses stand in for external nondeterministic inputs, but every
contract transition, storage write, caller check, and revert is executed by
the contract runtime.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone


EVIDENCE_COMMIT = "ff4df65945c068d0d3690aea8f2b256abcbbd290"
EVIDENCE_URL = (
    "https://raw.githubusercontent.com/ometere123/caseweave/"
    + EVIDENCE_COMMIT
    + "/README.md"
)
EVIDENCE_BODY = (
    b"The CaseWeave agreement requires the respondent to deliver the agreed work."
)

VERIFIED_EVIDENCE = "```json\n" + json.dumps(
    {
        "status": "verified",
        "evidence_summary": "The document states the respondent must deliver the agreed work.",
        "short_quote": "The respondent must deliver the agreed work.",
        "supports_side": "claimant",
    }
) + "\n```"

SEARCH_RESULT = "```json\n" + json.dumps(
    {
        "ok": True,
        "relevant_cases": [],
        "search_summary": "No prior case is materially relevant.",
    }
) + "\n```"

VERDICT_RESULT = "```json\n" + json.dumps(
    {
        "verdict": "claimant_wins",
        "confidence": 80,
        "claimant_score": 80,
        "respondent_score": 20,
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
        "holding": "A party that does not deliver the agreed work breaches the agreement.",
        "short_reason": "The verified evidence supports the claimant's account.",
        "legal_issue": "Whether the agreed work was delivered.",
        "fact_pattern_summary": "The respondent did not deliver the agreed work.",
        "reasoning_rule": "Verified evidence controls when it directly supports the claim.",
        "tags": ["delivery", "verified-evidence"],
    }
) + "\n```"

APPEAL_RESULT = "```json\n" + json.dumps(
    {
        "appeal_id": "APP_1",
        "dispute_id": "DIS_1",
        "case_id": "CASE_1",
        "snapshot_id": "SNAPSHOT_DIS_1_1",
        "result": "overturned_precedent",
        "affected_case_id": "CASE_1",
        "remedy_outcome": "refund",
        "remedy": {
            "action": "refund",
            "recipient_role": "creator",
            "amount_bps": 10000,
        },
        "reasoning": "The appellate validators found the original precedent treatment unsupported by the frozen evidence.",
        "findings": [
            {
                "obligation": "delivery",
                "finding": "unsatisfied",
                "source": EVIDENCE_URL,
            }
        ],
    }
) + "\n```"


def _future_deadline(direct_vm, seconds: int) -> str:
    current = datetime.fromisoformat(str(direct_vm._datetime).replace("Z", "+00:00"))
    return (current + timedelta(seconds=seconds)).astimezone(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )


def _accept_procedure(direct_vm, court, dispute_id, claimant, respondent):
    response_deadline = _future_deadline(direct_vm, 3600)
    challenge_deadline = _future_deadline(direct_vm, 7200)
    direct_vm.sender = claimant
    court.set_dispute_deadlines(dispute_id, response_deadline, challenge_deadline)
    direct_vm.sender = respondent
    court.set_dispute_deadlines(dispute_id, response_deadline, challenge_deadline)
    appeal_deadline = _future_deadline(direct_vm, 14400)
    direct_vm.sender = claimant
    court.set_appeal_window(dispute_id, appeal_deadline)
    direct_vm.sender = respondent
    court.set_appeal_window(dispute_id, appeal_deadline)


def _state(court, appeal_id: str, dispute_id: str, case_id: str) -> dict:
    return {
        "appeal": court.get_appeal(appeal_id),
        "dispute": court.get_dispute(dispute_id),
        "case": court.get_precedent_case(case_id),
    }


def _create_pending_appeal(court, direct_vm, owner, alice, bob) -> tuple[str, str, str, str]:
    direct_vm.sender = alice
    agreement_id = court.create_agreement(
        "CaseWeave direct execution agreement",
        "The respondent must deliver the agreed work before the deadline.",
        bob,
        "bounty",
        ["direct", "execution"],
        0,
        "public_precedent",
    )
    agreement = court.get_agreement(agreement_id)
    assert agreement["creator"] == alice.as_hex
    assert agreement["counterparty"] == bob.as_hex
    assert agreement["status"] == "pending_acceptance"

    direct_vm.sender = bob
    court.accept_agreement(agreement_id)
    assert court.get_agreement(agreement_id)["status"] == "active"

    direct_vm.sender = alice
    dispute_id = court.file_dispute(
        agreement_id,
        "The respondent did not deliver the agreed work.",
        "require_revision",
        [EVIDENCE_URL],
    )
    assert court.get_dispute(dispute_id)["status"] == "awaiting_response"

    direct_vm.sender = bob
    court.submit_response(dispute_id, "The respondent disputes the claim.", [])
    assert court.get_dispute(dispute_id)["status"] == "awaiting_precedent_search"
    _accept_procedure(direct_vm, court, dispute_id, alice, bob)

    direct_vm.mock_web(
        r"raw\.githubusercontent\.com/ometere123/caseweave/" + EVIDENCE_COMMIT,
        {"status": 200, "body": EVIDENCE_BODY},
    )
    direct_vm.mock_llm(r"verifying evidence for a CaseWeave dispute", VERIFIED_EVIDENCE)
    direct_vm.sender = alice
    evidence = court.verify_evidence_url(dispute_id, "claimant", 0)
    assert evidence["status"] == "verified"
    assert evidence["http_status"] == 200
    assert evidence["content_hash"] == hashlib.sha256(EVIDENCE_BODY).hexdigest()

    direct_vm.mock_llm(r"performing precedent search", SEARCH_RESULT)
    search_result = court.request_precedent_search(dispute_id)
    assert search_result["relevant_cases"] == []
    assert court.get_dispute(dispute_id)["status"] == "awaiting_verdict"

    direct_vm.mock_llm(r"evaluating a dispute", VERDICT_RESULT)
    verdict = court.request_verdict(dispute_id)
    assert verdict["verdict"] == "claimant_wins"
    assert court.get_dispute(dispute_id)["status"] == "verdict_reached"

    direct_vm.sender = alice
    case_id = court.finalize_precedent(dispute_id)
    case = court.get_precedent_case(case_id)
    assert case["case_id"] == case_id
    assert case["status"] == "active"
    assert court.get_dispute(dispute_id)["status"] == "finalized"

    direct_vm.value = 1
    appeal_id = court.file_appeal(
        dispute_id,
        "precedent_misapplied",
        "Reconsider the application of the holding.",
        1,
    )
    direct_vm.value = 0
    assert court.get_appeal(appeal_id)["status"] == "under_review"
    assert court.get_dispute(dispute_id)["status"] == "under_appeal"

    return agreement_id, dispute_id, case_id, appeal_id


def test_full_lifecycle_and_owner_authorization(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    owner = direct_owner
    alice = direct_alice
    bob = direct_bob
    charlie = direct_charlie

    direct_vm.sender = owner
    court = direct_deploy("contracts/caseweave.py", sdk_version="v0.2.16")
    # gltest creates fixture addresses as bytes before the SDK is loaded.
    # Convert them to the SDK's runtime Address class before invoking typed
    # contract parameters or comparing the stored address representation.
    from genlayer.py.types import Address

    owner = Address(bytes(owner))
    alice = Address(bytes(alice))
    bob = Address(bytes(bob))
    charlie = Address(bytes(charlie))
    receiver_address = Address(bytes([0x12]) * 20)
    direct_vm.sender = owner
    assert court.get_owner() == owner.as_hex
    court.configure_settlement_receiver(receiver_address)

    agreement_id, dispute_id, case_id, appeal_id = _create_pending_appeal(
        court, direct_vm, owner, alice, bob
    )

    before = _state(court, appeal_id, dispute_id, case_id)

    # Merits are no longer owner-discretionary. No wallet can use the old
    # compatibility method to choose an outcome, and failed calls preserve state.
    for actor in (charlie, alice, bob, owner):
        direct_vm.sender = actor
        expected_error = (
            "cannot resolve merits appeals"
            if actor == owner
            else "only the owner may access the administrative appeal guard"
        )
        with direct_vm.expect_revert(expected_error):
            court.resolve_appeal(appeal_id, "overturned_precedent")
        assert _state(court, appeal_id, dispute_id, case_id) == before

    # Only the validator-consensus appellate path may create a decision. The
    # owner can submit the request, but cannot select its merits result.
    direct_vm.mock_llm(r"independent appellate validator", APPEAL_RESULT)
    direct_vm.sender = owner
    decision = court.request_appeal_review(appeal_id)
    assert decision["result"] == "overturned_precedent"
    after = _state(court, appeal_id, dispute_id, case_id)
    assert after["appeal"]["status"] == "resolved"
    assert after["appeal"]["result"] == "overturned_precedent"
    assert after["dispute"]["status"] == "finalized"
    assert after["case"]["case_id"] == case_id
    assert after["case"]["status"] == "overturned"

    # The bonded appeal is a real accounted liability. A failed child is not
    # silently marked delivered; it becomes explicitly reconcilable and the
    # bond can be retried without losing accounting.
    direct_vm.sender = alice
    bond_transfer_id = court.release_appeal_bond(appeal_id)
    assert court.get_transfer(bond_transfer_id)["purpose"] == "appeal_bond_return"
    failed_before = court.get_transfer(bond_transfer_id)
    direct_vm.value = int(failed_before["amount"])
    court.__on_errored_message__()
    direct_vm.value = 0
    assert court.get_transfer(bond_transfer_id)["status"] == "failed"
    direct_vm.sender = alice
    reconciled = court.reconcile_failed_transfer(bond_transfer_id)
    assert reconciled["status"] == "reconciled"
    assert court.get_appeal(appeal_id)["bond_status"] == "eligible_for_return"

    # The legacy hash selector is fail-closed for every caller, including the
    # intended recipient. It can never mutate a transfer or appeal state.
    direct_vm.sender = alice
    second_transfer_id = court.release_appeal_bond(appeal_id)
    pending_before = court.get_transfer(second_transfer_id)
    for actor, fake_hash in (
        (bob, "0x" + "1" * 64),
        (alice, "0x" + "2" * 64),
        (owner, "0x" + "3" * 64),
    ):
        direct_vm.sender = actor
        with direct_vm.expect_revert("manual child hash confirmations are disabled"):
            court.confirm_transfer(second_transfer_id, fake_hash)
        assert court.get_transfer(second_transfer_id) == pending_before

    # Only the receiver contract may report custody, and every committed field
    # is checked before the transfer can become custodied.
    direct_vm.value = 0
    direct_vm.sender = bob
    with direct_vm.expect_revert("only the configured settlement receiver"):
        court.confirm_protocol_receipt(
            second_transfer_id,
            receiver_address,
            alice,
            int(pending_before["amount"]),
            pending_before["proof_commitment"],
        )
    direct_vm.sender = receiver_address
    with direct_vm.expect_revert("custody callback amount or commitment mismatch"):
        court.confirm_protocol_receipt(
            second_transfer_id,
            receiver_address,
            alice,
            int(pending_before["amount"]) + 1,
            pending_before["proof_commitment"],
        )
    with direct_vm.expect_revert("custody callback amount or commitment mismatch"):
        court.confirm_protocol_receipt(
            second_transfer_id,
            receiver_address,
            alice,
            int(pending_before["amount"]),
            "f" * 64,
        )
    with direct_vm.expect_revert("custody callback recipient mismatch"):
        court.confirm_protocol_receipt(
            second_transfer_id,
            receiver_address,
            bob,
            int(pending_before["amount"]),
            pending_before["proof_commitment"],
        )
    with direct_vm.expect_revert("transfer not found"):
        court.confirm_protocol_receipt(
            "TR_unrelated",
            receiver_address,
            alice,
            int(pending_before["amount"]),
            pending_before["proof_commitment"],
        )
    returned_bond = court.confirm_protocol_receipt(
        second_transfer_id,
        receiver_address,
        alice,
        int(pending_before["amount"]),
        pending_before["proof_commitment"],
    )
    assert returned_bond["status"] == "custodied"
    assert court.get_appeal(appeal_id)["bond_status"] == "returned"
    with direct_vm.expect_revert("transfer is not awaiting custody"):
        court.confirm_protocol_receipt(
            second_transfer_id,
            receiver_address,
            alice,
            int(pending_before["amount"]),
            pending_before["proof_commitment"],
        )

    # A completed appeal cannot be resolved twice or reviewed again.
    with direct_vm.expect_revert("appeal already resolved"):
        court.request_appeal_review(appeal_id)

    # The agreement -> dispute -> evidence -> verdict -> precedent transitions
    # above also prove that the typed counterparty remains stored as an address.
    assert court.get_agreement(agreement_id)["counterparty"] == bob.as_hex


def test_create_agreement_rejects_zero_and_self_addresses(
    direct_vm,
    direct_deploy,
    direct_owner,
    direct_bob,
):
    direct_vm.sender = direct_owner
    court = direct_deploy("contracts/caseweave.py", sdk_version="v0.2.16")
    from genlayer.py.types import Address

    owner = Address(bytes(direct_owner))
    bob = Address(bytes(direct_bob))
    direct_vm.sender = owner

    zero_address = Address(bytes(20))

    args = (
        "Address validation agreement",
        "A non-empty agreement text.",
        zero_address,
        "bounty",
        [],
        0,
        "public_precedent",
    )
    with direct_vm.expect_revert("counterparty must not be the zero address"):
        court.create_agreement(*args)

    with direct_vm.expect_revert("parties must not be the same address"):
        court.create_agreement(
            args[0],
            args[1],
            owner,
            args[3],
            args[4],
            args[5],
            args[6],
        )
