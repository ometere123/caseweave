from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "caseweave.py"


class ContractGuardrailTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = CONTRACT.read_text(encoding="utf-8")
        cls.compact_source = re.sub(r"\s+", " ", cls.source)

    def test_evidence_verification_fetches_and_hashes_content(self):
        self.assertIn("gl.nondet.web.request(url, method=\"GET\")", self.source)
        self.assertIn("hashlib.sha256(body).hexdigest()", self.source)
        self.assertIn(
            "Two results are equivalent only if they agree exactly on",
            self.compact_source,
        )
        self.assertIn("http_status and content_hash", self.compact_source)

    def test_verdict_requires_verified_evidence(self):
        self.assertIn("verified_count == 0", self.source)
        self.assertIn(
            "at least one verified evidence item is required before a verdict can be requested",
            self.source,
        )

    def test_invalid_urls_are_rejected_before_fetch(self):
        self.assertIn("MAX_EVIDENCE_URL_LENGTH = 2048", self.source)
        self.assertIn("if not url.startswith(\"https://\")", self.source)
        self.assertIn("localhost", self.source)
        self.assertIn("192.168.", self.source)
        self.assertIn("172.", self.source)

    def test_comparative_consensus_checks_outcomes_not_just_format(self):
        self.assertIn("gl.eq_principle.prompt_comparative", self.source)
        self.assertIn("final verdict", self.compact_source)
        self.assertIn("precedent_alignment category", self.compact_source)
        self.assertIn("same case_id sets", self.source)

    def test_precedent_finalization_records_treatments(self):
        for treatment in ("followed", "distinguished", "weakened", "overturned"):
            self.assertIn(f"\"{treatment}\"", self.source)
        self.assertIn("self.case_treatments_json[case_id] = json.dumps(treatments)", self.source)
        self.assertIn("old_case.status = \"overturned\"", self.source)

    def test_allowed_output_categories_are_schema_guarded(self):
        for constant in (
            "ALLOWED_VERDICTS",
            "ALLOWED_PRECEDENT_ALIGNMENTS",
            "EVIDENCE_STATUSES",
            "ALLOWED_APPEAL_RESULTS",
        ):
            self.assertRegex(self.source, rf"{constant}\s*=\s*{{")


if __name__ == "__main__":
    unittest.main()
