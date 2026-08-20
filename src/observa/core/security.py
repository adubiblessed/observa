"""API key generation, parsing and hashing primitives.

Key format
----------

Observa ingestion API keys look like::

    obs_live_<prefix>_<secret>

* ``prefix`` -- 32 lowercase hex chars (16 random bytes).  Public
  identifier used to find the credential row in the database.  It is the
  only part that may ever appear in logs, metrics labels or UI responses.
* ``secret`` -- 32 lowercase hex chars (16 random bytes, 128 bits of
  entropy).  Never stored in plaintext, never logged, never returned a
  second time.

The database stores ``key_prefix`` (public) and ``key_hash`` = SHA-256 of
the **full** token.  Lookup goes by prefix; verification re-hashes the
supplied token and compares with the stored hash.

Hashing choice
--------------

Passwords are brute-forceable and therefore require a slow KDF
(pbkdf2/argon2).  API key secrets are 128-bit uniform random values, which
are not brute-forceable, so a fast cryptographic hash (SHA-256, as used by
Stripe, GitHub and most modern key systems) is both appropriate and avoids
burning 100k+ pbkdf2 iterations on every telemetry request.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass

# Distinguishable prefix for Observa live/ingestion keys.
API_KEY_PREFIX = "obs_live"

# Hex lengths of the public and secret halves (token_hex(16) -> 32 chars).
API_KEY_PREFIX_LENGTH = 32
API_KEY_SECRET_LENGTH = 32

# Full token length: obs_live_ + 32 + _ + 32.
API_KEY_FULL_LENGTH = len(API_KEY_PREFIX) + 1 + API_KEY_PREFIX_LENGTH + 1 + API_KEY_SECRET_LENGTH

_TOKEN_RE = re.compile(
    rf"^{API_KEY_PREFIX}_([0-9a-f]{{{API_KEY_PREFIX_LENGTH}}})_([0-9a-f]{{{API_KEY_SECRET_LENGTH}}})$"
)

# Sentinel hash compared against when the prefix does not resolve, so that a
# request for an unknown prefix pays the same verification cost as a request
# for a known prefix.  Prevents an offline-timing oracle on prefix existence.
_DUMMY_HASH = hashlib.sha256(b"observa-dummy").hexdigest()

# Maximum reasonable token length used by redaction code.
MAX_TOKEN_LENGTH = API_KEY_FULL_LENGTH + 8


@dataclass(frozen=True, slots=True)
class ParsedApiKey:
    """A structurally-valid token split into public prefix and secret."""

    prefix: str
    secret: str
    token: str


def generate_api_key() -> str:
    """Generate a new full API key token ``obs_live_<prefix>_<secret>``."""
    prefix = secrets.token_hex(API_KEY_PREFIX_LENGTH // 2)
    secret = secrets.token_hex(API_KEY_SECRET_LENGTH // 2)
    return f"{API_KEY_PREFIX}_{prefix}_{secret}"


def parse_api_key(token: str) -> ParsedApiKey | None:
    """Split a token into prefix and secret; ``None`` if structurally invalid."""
    if not isinstance(token, str) or len(token) != API_KEY_FULL_LENGTH:
        return None

    match = _TOKEN_RE.fullmatch(token)
    if match is None:
        return None

    return ParsedApiKey(prefix=match.group(1), secret=match.group(2), token=token)


def looks_like_api_key(token: str) -> bool:
    """Cheap format check used to avoid logging real tokens by mistake."""
    return parse_api_key(token) is not None


def hash_api_key(token: str) -> str:
    """SHA-256 hex digest of the full token, stored in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_api_key(token: str, stored_hash: str) -> bool:
    """Constant-time comparison of a supplied token against a stored hash."""
    digest = hash_api_key(token)
    return hmac.compare_digest(digest, stored_hash)


def redact_secret(token: str) -> str:
    """Return a redacted representation safe for logs: prefix + [REDACTED]."""
    parsed = parse_api_key(token)
    if parsed is None:
        return "[REDACTED]"
    return f"{API_KEY_PREFIX}_{parsed.prefix}_[REDACTED]"