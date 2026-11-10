"""Helper utilities for dates, logging, and decoding."""

import base64
from datetime import datetime, timedelta
import logging
import os
import re
import sys
from typing import Any, Dict
from zoneinfo import ZoneInfo


PACIFIC_TZ = ZoneInfo("America/Los_Angeles")


def get_pacific_yesterday() -> str:
    """Return yesterday's calendar date in America/Los_Angeles formatted as YYYY-MM-DD."""
    now_pacific = datetime.now(PACIFIC_TZ)
    yesterday = now_pacific.date() - timedelta(days=1)
    return yesterday.strftime("%Y-%m-%d")


def decode_base64_url(encoded_val: str) -> str:
    """Safely decode Base64-encoded URL strings found in social profiles."""
    if not encoded_val:
        return ""
    try:
        # Strip whitespace and newlines that Product Hunt embeds in encodedUrl
        clean = encoded_val.replace("\n", "").replace("\r", "").replace(" ", "").strip()
        # Add padding if needed
        padding = 4 - (len(clean) % 4)
        if padding != 4:
            clean += "=" * padding
        decoded = base64.b64decode(clean).decode("utf-8", errors="ignore")
        return decoded
    except Exception:
        return ""


def sanitize_headers_for_logging(headers: Dict[str, Any]) -> Dict[str, str]:
    """Return a safe dictionary of headers for logging without secrets."""
    safe_headers: Dict[str, str] = {}
    for key, value in headers.items():
        lower_key = key.lower()
        if lower_key in {"authorization", "cookie", "x-csrf-token", "set-cookie"}:
            safe_headers[key] = "[REDACTED]"
        else:
            safe_headers[key] = str(value)
    return safe_headers


# Logger with credential masking
SENSITIVE_PATTERNS = [
    (re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.]{8,}", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"('authorization':\s*')[^']+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r'("authorization":\s*")[^"]+', re.IGNORECASE), r'\1[REDACTED]'),
    (re.compile(r"('cookie':\s*')[^']+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r'("cookie":\s*")[^"]+', re.IGNORECASE), r'\1[REDACTED]'),
]


class RedactingFormatter(logging.Formatter):
    """Formatter that redacts authorization tokens and cookies."""

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern, replacement in SENSITIVE_PATTERNS:
            msg = pattern.sub(replacement, msg)
        return msg


def get_logger(name: str = "product_hunt_scraper", level: str = "INFO") -> logging.Logger:
    """Configure and return a standard console logger with shared live file handler."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            RedactingFormatter(
                fmt="%(asctime)s [%(levelname)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        logger.addHandler(handler)

        # Also write to storage/live_stream.log for real-time frontend streaming
        try:
            log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, "live_stream.log")
            file_handler = logging.FileHandler(log_file, encoding="utf-8")
            file_handler.setFormatter(
                RedactingFormatter(
                    fmt="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S",
                )
            )
            logger.addHandler(file_handler)
        except Exception:
            pass

    return logger
