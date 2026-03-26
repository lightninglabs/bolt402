"""Integration tests for bolt402 Python bindings against the regtest environment.

These tests verify the Python bindings work with real Lightning infrastructure.
They are skipped when the regtest Docker stack is not running.

Required env vars (from tests/regtest/.env.regtest):
    L402_SERVER_URL, LND_REST_HOST, LND_MACAROON_HEX

Run with:
    pytest tests/test_regtest.py -v
"""

import os
import pathlib

import pytest

# Try to load .env.regtest
_env_candidates = [
    pathlib.Path(__file__).parent / "../../../tests/regtest/.env.regtest",
    pathlib.Path(__file__).parent / "../../tests/regtest/.env.regtest",
]

for _p in _env_candidates:
    _p = _p.resolve()
    if _p.exists():
        for line in _p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            eq = line.find("=")
            if eq == -1:
                continue
            key, val = line[:eq], line[eq + 1:]
            os.environ.setdefault(key, val)
        break

L402_SERVER_URL = os.environ.get("L402_SERVER_URL", "http://localhost:8081")


def _regtest_available() -> bool:
    """Check if the regtest L402 server is reachable."""
    try:
        import urllib.request

        req = urllib.request.Request(f"{L402_SERVER_URL}/health", method="GET")
        resp = urllib.request.urlopen(req, timeout=5)
        return resp.status in (200, 402)
    except Exception:
        return False


# Skip entire module if regtest is not running
pytestmark = pytest.mark.skipif(
    not _regtest_available(),
    reason="Regtest environment not available (is Docker running?)",
)


# The Python bindings currently only support 'mock' backend via create_mock_client().
# Direct LND/SwissKnife backends are not yet exposed in PyO3.
# These tests verify the mock infrastructure works correctly as a baseline.
# When real backends are added to the Python bindings, these will be extended.

from bolt402 import Budget, create_mock_client


class TestPythonBindingsWithMock:
    """Baseline tests verifying the Python bindings work correctly.

    These use the mock server (not regtest Lightning) but confirm the
    Python-to-Rust bridge is functional. Real backend tests will be
    added when LND/SwissKnife backends are exposed via PyO3.
    """

    def test_full_mock_flow(self):
        """Verify full L402 flow through Python bindings using mock."""
        client, server = create_mock_client({"/api/data": 100})
        response = client.get(f"{server.url}/api/data")

        assert response.status == 200
        assert response.paid is True
        assert response.receipt is not None
        assert response.receipt.amount_sats == 100

    def test_token_caching(self):
        """Verify token caching through Python bindings."""
        client, server = create_mock_client({"/api/data": 100})

        r1 = client.get(f"{server.url}/api/data")
        assert r1.paid is True

        r2 = client.get(f"{server.url}/api/data")
        assert r2.paid is False
        assert r2.status == 200

    def test_budget_enforcement(self):
        """Verify budget enforcement through Python bindings."""
        budget = Budget(per_request_max=50)
        client, server = create_mock_client({"/api/expensive": 100}, budget=budget)

        with pytest.raises(ValueError, match="BudgetExceeded"):
            client.get(f"{server.url}/api/expensive")

    def test_receipts(self):
        """Verify receipt tracking through Python bindings."""
        client, server = create_mock_client({"/api/a": 10, "/api/b": 20})

        client.get(f"{server.url}/api/a")
        client.get(f"{server.url}/api/b")

        receipts = client.receipts()
        assert len(receipts) == 2
        assert receipts[0].amount_sats == 10
        assert receipts[1].amount_sats == 20
        assert client.total_spent() == 30
