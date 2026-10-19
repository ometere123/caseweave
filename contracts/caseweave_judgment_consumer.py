# v0.3.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass

from genlayer import *


@allow_storage
@dataclass
class ConsumedJudgment:
    court_identity: Address
    judgment_id: str
    caseweave_address: Address
    agreement_id: str
    dispute_id: str
    case_id: str
    outcome: str
    evidence_snapshot_hash: str
    version: u256
    consumed_at: str


class CaseWeaveJudgmentConsumer(gl.Contract):
    consumed: TreeMap[str, ConsumedJudgment]
    consumed_counter: u256
    trusted_court: Address

    def __init__(self, trusted_court: Address):
        self.consumed_counter = u256(0)
        if trusted_court.as_hex.lower() == "0x" + ("0" * 40):
            raise gl.vm.UserError("trusted court must not be the zero address")
        self.trusted_court = trusted_court

    @gl.public.write
    def consume_judgment(
        self,
        caseweave_address: Address,
        judgment_id: str,
        expected_agreement_id: str,
        expected_dispute_id: str,
        expected_version: int,
    ) -> str:
        if caseweave_address != self.trusted_court:
            raise gl.vm.UserError("consumer is bound to a different CaseWeave court")
        namespace_key = f"{self.trusted_court.as_hex.lower()}::{judgment_id}"
        if namespace_key in self.consumed:
            raise gl.vm.UserError("judgment has already been consumed")
        court = gl.get_contract_at(self.trusted_court)
        judgment = court.view().get_judgment(judgment_id)
        current = court.view().get_current_judgment(expected_dispute_id)
        if not judgment or not current:
            raise gl.vm.UserError("judgment does not exist")
        if judgment.get("judgment_id") != judgment_id:
            raise gl.vm.UserError("judgment identity mismatch")
        if str(judgment.get("court_address", "")).lower() != self.trusted_court.as_hex.lower():
            raise gl.vm.UserError("judgment court identity mismatch")
        if judgment.get("agreement_id") != expected_agreement_id:
            raise gl.vm.UserError("judgment agreement scope mismatch")
        if judgment.get("dispute_id") != expected_dispute_id:
            raise gl.vm.UserError("judgment dispute scope mismatch")
        if int(judgment.get("version", 0)) != expected_version:
            raise gl.vm.UserError("judgment version is stale")
        if current.get("judgment_id") != judgment_id:
            raise gl.vm.UserError("judgment is superseded")
        if judgment.get("status") != "finalized":
            raise gl.vm.UserError("judgment is not finalized")
        if judgment.get("appeal_status") not in ("closed", "not_appealed", "resolved"):
            raise gl.vm.UserError("judgment has unresolved appellate status")
        if judgment.get("superseded_by"):
            raise gl.vm.UserError("judgment has been superseded")

        self.consumed_counter += 1
        self.consumed[namespace_key] = ConsumedJudgment(
            court_identity=self.trusted_court,
            judgment_id=judgment_id,
            caseweave_address=caseweave_address,
            agreement_id=expected_agreement_id,
            dispute_id=expected_dispute_id,
            case_id=str(judgment.get("case_id", "")),
            outcome=str(judgment.get("outcome", "")),
            evidence_snapshot_hash=str(judgment.get("evidence_snapshot_hash", "")),
            version=u256(expected_version),
            consumed_at=gl.message_raw["datetime"],
        )
        return judgment_id

    @gl.public.view
    def get_consumed(self, caseweave_address: Address, judgment_id: str) -> dict:
        if caseweave_address != self.trusted_court:
            raise gl.vm.UserError("consumer is bound to a different CaseWeave court")
        namespace_key = f"{self.trusted_court.as_hex.lower()}::{judgment_id}"
        item = self.consumed[namespace_key]
        return {
            "court_identity": item.court_identity.as_hex,
            "judgment_id": item.judgment_id,
            "caseweave_address": item.caseweave_address.as_hex,
            "agreement_id": item.agreement_id,
            "dispute_id": item.dispute_id,
            "case_id": item.case_id,
            "outcome": item.outcome,
            "evidence_snapshot_hash": item.evidence_snapshot_hash,
            "version": int(item.version),
            "consumed_at": item.consumed_at,
        }

    @gl.public.view
    def get_trusted_court(self) -> str:
        return self.trusted_court.as_hex
