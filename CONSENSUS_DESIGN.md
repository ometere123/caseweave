# Consensus Design

## Leader / validator boundary

Nondeterministic functions only retrieve external data and produce bounded JSON.
They do not mutate contract storage or emit messages. Deterministic code checks
the consensus output and performs all state changes afterward.

The leader and validator paths independently retrieve:

- GitHub commit API facts and the commit-pinned raw artifact;
- optional pull-request and CI API facts when those URLs are submitted;
- allowlisted deployment artifact status;
- evidence and counter-evidence content hashes;
- the frozen evidence snapshot used by verdict and appellate review.

Retrieved bytes and documents are untrusted data. They are never treated as
instructions.

## Equality boundaries

Objective fields require exact equality: repository identity, commit SHA,
authoritative changed-file membership, evidence key, HTTP status, content hash,
agreement/dispute/case/snapshot IDs, current judgment version, affected case ID,
appeal result category, and structured obligation IDs/findings.

Comparative precedent search permits bounded score/wording variation while
requiring the same eligible case-ID set. Verdict consensus permits prose and
score wording variation while requiring the same verdict category, precedent
alignment, and treatment case-ID sets. Appellate consensus requires exact
identity/scope/snapshot/result/affected-case fields and independently checks
the frozen evidence facts.

## Fail-closed rules

Malformed JSON, unknown enums, duplicate or omitted obligation IDs, stale
judgments, unauthorized actors, unsupported source adapters, mismatched
repository facts, unavailable source fetches, unresolved appeals and
insolvent escrow abort before state mutation. A successful transaction receipt
is not treated as successful GenVM execution until the SDK execution result is
also conclusive.

## Deterministic precedent policy

Policy is part of the accepted agreement commitment. The contract enforces the
policy after consensus, rather than asking an LLM to decide whether policy may
be ignored. Treatments and judgment versions form an immutable lineage; a
later appellate transition may supersede a judgment but cannot erase it.
