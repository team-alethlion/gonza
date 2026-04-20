import base64
from datetime import datetime
from typing import Optional

def encode_cursor(timestamp: str) -> str:
    """
    Encodes an ISO timestamp string into a base64 cursor.
    """
    if not timestamp:
        return ""
    return base64.b64encode(timestamp.encode()).decode()

def decode_cursor(cursor: Optional[str]) -> Optional[str]:
    """
    Decodes a base64 cursor back into an ISO timestamp string.
    """
    if not cursor:
        return None
    try:
        return base64.b64decode(cursor.encode()).decode()
    except Exception:
        return None
