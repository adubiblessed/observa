import binascii
import hashlib
import hmac
import os


def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    iterations = 100_000

    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )

    return (
        f"pbkdf2_sha256$"
        f"{iterations}$"
        f"{binascii.hexlify(salt).decode()}$"
        f"{binascii.hexlify(dk).decode()}"
    )


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_s, salt_hex, hash_hex = stored.split("$")

        if algo != "pbkdf2_sha256":
            return False

        iterations = int(iter_s)
        salt = binascii.unhexlify(salt_hex)
        expected = binascii.unhexlify(hash_hex)

        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )

        return hmac.compare_digest(dk, expected)

    except (ValueError, TypeError, binascii.Error):
        return False
