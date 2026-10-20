# v0.3.3
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""Trusted custody bridge for CaseWeave native-value settlements.

GenLayer does not expose an in-contract receipt query for an external EOA
transfer.  CaseWeave therefore sends value to this immutable-purpose receiver
through a finalized internal message.  The receiver accepts funds only from
the configured court, stores the exact beneficiary/amount/commitment, and
emits a finalized callback to the court.  A beneficiary then pulls the funds
from this custody contract in a separate, independently observable child
transaction.  No caller-supplied transaction hash can change court accounting.
"""

from dataclasses import dataclass

from genlayer import *


@allow_storage
@dataclass
class CustodyRecord:
    transfer_id: str
    court: Address
    beneficiary: Address
    amount: u256
    proof_commitment: str
    status: str
    received_at: str
    withdrawal_submitted_at: str
    withdrawal_child_transaction_id: str
    withdrawal_failure_child_transaction_id: str


class CaseWeaveSettlementReceiver(gl.Contract):
    owner: Address
    trusted_court: Address
    records: TreeMap[str, CustodyRecord]
    active_withdrawal_id: str

    def __init__(self):
        self.owner = gl.message.sender_address
        self.trusted_court = Address(bytes(20))
        self.active_withdrawal_id = ""

    def _is_zero(self, address: Address) -> bool:
        return address.as_hex.lower() == "0x" + ("0" * 40)

    def _bounded(self, value: str, field: str, minimum: int = 1) -> str:
        cleaned = value.strip()
        if len(cleaned) < minimum or len(cleaned) > 256:
            raise gl.vm.UserError(f"invalid {field}")
        return cleaned

    @gl.public.write
    def configure_court(self, court: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("only the receiver owner may configure the court")
        if not self._is_zero(self.trusted_court):
            raise gl.vm.UserError("trusted court is already configured")
        if self._is_zero(court):
            raise gl.vm.UserError("trusted court must not be the zero address")
        self.trusted_court = court

    @gl.public.write.payable
    def receive_settlement(
        self,
        transfer_id: str,
        beneficiary: Address,
        amount: int,
        proof_commitment: str,
    ) -> dict:
        if self._is_zero(self.trusted_court):
            raise gl.vm.UserError("trusted court is not configured")
        if gl.message.sender_address != self.trusted_court:
            raise gl.vm.UserError("only the trusted court may send custody funds")
        transfer_id = self._bounded(transfer_id, "transfer_id")
        proof_commitment = self._bounded(proof_commitment, "proof_commitment", 64)
        if transfer_id in self.records:
            raise gl.vm.UserError("custody record already exists")
        if self._is_zero(beneficiary):
            raise gl.vm.UserError("beneficiary must not be the zero address")
        if amount <= 0 or int(gl.message.value) != amount:
            raise gl.vm.UserError("custody value must equal the declared amount")

        self.records[transfer_id] = CustodyRecord(
            transfer_id=transfer_id,
            court=self.trusted_court,
            beneficiary=beneficiary,
            amount=u256(amount),
            proof_commitment=proof_commitment,
            status="custodied",
            received_at=gl.message_raw["datetime"],
            withdrawal_submitted_at="",
            withdrawal_child_transaction_id="",
            withdrawal_failure_child_transaction_id="",
        )

        # This is the only court accounting callback.  The court accepts it
        # only from this configured contract and checks every copied field.
        court = gl.get_contract_at(self.trusted_court)
        court.emit(on="finalized").confirm_protocol_receipt(
            transfer_id,
            self.address,
            beneficiary,
            amount,
            proof_commitment,
        )
        return self.get_custody(transfer_id)

    @gl.public.write
    def retry_protocol_callback(self, transfer_id: str) -> None:
        if transfer_id not in self.records:
            raise gl.vm.UserError("custody record not found")
        record = self.records[transfer_id]
        if record.status != "custodied":
            raise gl.vm.UserError("custody record is not awaiting callback")
        if self._is_zero(self.trusted_court):
            raise gl.vm.UserError("trusted court is not configured")
        court = gl.get_contract_at(self.trusted_court)
        court.emit(on="finalized").confirm_protocol_receipt(
            record.transfer_id,
            self.address,
            record.beneficiary,
            int(record.amount),
            record.proof_commitment,
        )

    @gl.public.write
    def withdraw(self, transfer_id: str) -> None:
        if transfer_id not in self.records:
            raise gl.vm.UserError("custody record not found")
        record = self.records[transfer_id]
        if record.withdrawal_child_transaction_id:
            raise gl.vm.UserError("custody withdrawal already has an externally recorded child")
        if record.status != "custodied":
            raise gl.vm.UserError("custody record is not withdrawable")
        if gl.message.sender_address != record.beneficiary:
            raise gl.vm.UserError("only the beneficiary may withdraw custody funds")
        # GenVM error callbacks do not carry a reliable child-transfer id. A
        # single serialized withdrawal is therefore the enforceable binding:
        # the callback can only reconcile the record named by this lock and a
        # second beneficiary cannot overwrite it while the child is pending.
        if self.active_withdrawal_id:
            raise gl.vm.UserError("another beneficiary withdrawal is pending")
        record.status = "withdrawal_submitted"
        record.withdrawal_submitted_at = gl.message_raw["datetime"]
        self.active_withdrawal_id = transfer_id

        @gl.evm.contract_interface
        class _Recipient:
            class View:
                pass

            class Write:
                pass

        _Recipient(record.beneficiary).emit_transfer(value=record.amount)

    def _valid_child_transaction_id(self, child_transaction_id: str) -> str:
        cleaned = child_transaction_id.strip()
        if len(cleaned) != 66 or not cleaned.startswith("0x"):
            raise gl.vm.UserError("child transaction id must be a 32-byte hash")
        for character in cleaned[2:]:
            if character not in "0123456789abcdefABCDEF":
                raise gl.vm.UserError("child transaction id must be hexadecimal")
        return cleaned

    @gl.public.write
    def release_withdrawal_lock(self, transfer_id: str, child_transaction_id: str) -> None:
        """Release the one-at-a-time EOA lock after external finality is checked.

        GenVM exposes the child transaction to the caller/runtime but does not
        expose a receipt query to this IC.  The trusted receiver owner may
        therefore record the independently inspected finalized child hash and
        release only the concurrency lock.  This never marks custody delivered
        and cannot be used to create, alter, or settle a court transfer.
        """
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("only the receiver owner may release a withdrawal lock")
        if transfer_id not in self.records:
            raise gl.vm.UserError("custody record not found")
        record = self.records[transfer_id]
        if record.status != "withdrawal_submitted" or self.active_withdrawal_id != transfer_id:
            raise gl.vm.UserError("withdrawal lock is not active for this record")
        record.withdrawal_child_transaction_id = self._valid_child_transaction_id(
            child_transaction_id
        )
        self.active_withdrawal_id = ""

    @gl.public.write
    def reconcile_failed_withdrawal(
        self, transfer_id: str, child_transaction_id: str
    ) -> None:
        """Reopen custody only after the receiver owner inspected a failed child.

        GenVM error callbacks do not identify the originating EOA child.  The
        callback below is therefore deliberately non-mutating.  This narrow
        owner operation is the explicit recovery hook after an external
        operator has verified that the named child failed.  It never marks a
        payment delivered and it is valid only for the currently serialized
        withdrawal lock, so a stale callback cannot alter another beneficiary's
        record.
        """
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("only the receiver owner may reconcile a failed withdrawal")
        if transfer_id not in self.records:
            raise gl.vm.UserError("custody record not found")
        record = self.records[transfer_id]
        if record.status != "withdrawal_submitted" or self.active_withdrawal_id != transfer_id:
            raise gl.vm.UserError("withdrawal failure is not the active record")
        record.withdrawal_failure_child_transaction_id = self._valid_child_transaction_id(
            child_transaction_id
        )
        record.withdrawal_submitted_at = ""
        record.withdrawal_child_transaction_id = ""
        record.status = "custodied"
        self.active_withdrawal_id = ""

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner.as_hex

    @gl.public.view
    def get_trusted_court(self) -> str:
        return self.trusted_court.as_hex

    @gl.public.view
    def get_active_withdrawal_id(self) -> str:
        return self.active_withdrawal_id

    @gl.public.view
    def get_custody(self, transfer_id: str) -> dict:
        record = self.records[transfer_id]
        return {
            "transfer_id": record.transfer_id,
            "court": record.court.as_hex,
            "beneficiary": record.beneficiary.as_hex,
            "amount": int(record.amount),
            "proof_commitment": record.proof_commitment,
            "status": record.status,
            "received_at": record.received_at,
            "withdrawal_submitted_at": record.withdrawal_submitted_at,
            "withdrawal_child_transaction_id": record.withdrawal_child_transaction_id,
            "withdrawal_failure_child_transaction_id": record.withdrawal_failure_child_transaction_id,
        }

    @gl.public.write.payable
    def __on_errored_message__(self) -> None:
        # This callback has no originating child-transfer identifier.  It must
        # not mutate active custody: a late callback from a previous child
        # could otherwise reopen a different beneficiary's withdrawal.  The
        # receiver owner uses reconcile_failed_withdrawal after independently
        # inspecting the failed child.
        return
