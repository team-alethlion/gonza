import secrets
import string

def generate_secure_key():
    """
    Generates a cryptographically secure 50-character Django secret key.
    """
    # Standard characters used in Django secret keys
    chars = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"
    key = ''.join(secrets.choice(chars) for _ in range(50))
    print("\n--- NEW SECURE SECRET_KEY ---")
    print(key)
    print("-----------------------------\n")
    print("💡 Copy this key into your .env file as: SECRET_KEY=\"your_key_here\"")

if __name__ == "__main__":
    generate_secure_key()
