import secrets
import string

def generate_cron_secret(length=32):
    """
    Generates a secure random alphanumeric string for use as a CRON_SECRET.
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

if __name__ == "__main__":
    secret = generate_cron_secret()
    print(f"Generated CRON_SECRET: {secret}")
    print("To manually add this to your .env file, use:")
    print(f"CRON_SECRET={secret}")
