"""Test-runner compatibility shims for Windows direct GenVM execution.

gltest 0.29.2 replaces fd 0 with a temporary file while importing a
contract. Windows keeps the duplicated fd open and rejects the package's
immediate unlink, so use an anonymous pipe for the same stdin injection. This
only affects the test harness; production contract execution is unchanged.
"""

from __future__ import annotations

import os
import sys


def _inject_message_with_pipe(vm) -> None:
    from genlayer.py import calldata
    from genlayer.py.types import Address

    sender_addr = vm.sender
    if isinstance(sender_addr, bytes):
        sender_addr = Address(sender_addr)

    contract_addr = vm._contract_address
    if isinstance(contract_addr, bytes):
        contract_addr = Address(contract_addr)

    origin_addr = vm.origin
    if isinstance(origin_addr, bytes):
        origin_addr = Address(origin_addr)

    message_data = {
        "contract_address": contract_addr,
        "sender_address": sender_addr,
        "origin_address": origin_addr,
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)

    read_fd, write_fd = os.pipe()
    os.write(write_fd, encoded)
    os.close(write_fd)
    vm._original_stdin_fd = os.dup(0)
    os.dup2(read_fd, 0)
    os.close(read_fd)


if sys.platform == "win32":
    from gltest.direct import loader

    loader._inject_message_to_fd0 = _inject_message_with_pipe
