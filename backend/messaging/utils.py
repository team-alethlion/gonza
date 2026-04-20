import base64
import hashlib
from django.conf import settings

def _get_encryption_key():
    # Use the SECRET_KEY to generate a consistent 32-byte key for XOR
    return hashlib.sha256(settings.SECRET_KEY.encode()).digest()

def encrypt_data(data):
    """
    Simple XOR-based encryption with SECRET_KEY.
    Provides a basic layer of protection for data-at-rest.
    """
    if not data:
        return data
        
    key = _get_encryption_key()
    data_bytes = data.encode()
    
    # Simple XOR encryption
    encrypted = bytes([data_bytes[i] ^ key[i % len(key)] for i in range(len(data_bytes))])
    
    # Return base64 encoded string
    return base64.b64encode(encrypted).decode()

def decrypt_data(encrypted_data):
    """
    Decrypts XOR-encrypted data using SECRET_KEY.
    """
    if not encrypted_data:
        return encrypted_data
        
    try:
        key = _get_encryption_key()
        encrypted_bytes = base64.b64decode(encrypted_data.encode())
        
        decrypted = bytes([encrypted_bytes[i] ^ key[i % len(key)] for i in range(len(encrypted_bytes))])
        
        return decrypted.decode()
    except Exception:
        # If decryption fails (e.g. data was not encrypted), return as is or handle error
        return encrypted_data
