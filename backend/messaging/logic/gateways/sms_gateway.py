import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class SMSGateway:
    """
    📱 SMS GATEWAY (EAZIREACH PRO DRIVER)
    Perfectly mirrors the proven legacy Supabase implementation.
    """

    @staticmethod
    def _get_headers():
        """
        🚀 MATCH LEGACY: Use exact X-API-Key and X-Account-ID headers.
        """
        api_key = getattr(settings, 'EAZIREACH_API_KEY', None)
        account_id = getattr(settings, 'EAZIREACH_ACCOUNT_ID', None)
        return {
            "Content-Type": "application/json",
            "X-API-Key": api_key,
            "X-Account-ID": account_id
        }

    @staticmethod
    def send(phone_number, content, simulation=False):
        """
        Main entry point to send an SMS via Eazireach V1.
        Matches the structure of prev/supabase/functions/send-sms/index.ts
        """
        api_url = "https://api.eazireach.com/api/v1/send"
        api_key = getattr(settings, 'EAZIREACH_API_KEY', None)
        account_id = getattr(settings, 'EAZIREACH_ACCOUNT_ID', None)
        business_name = getattr(settings, 'SMS_SENDER_ID', 'Gonza')

        # 1. Validation & Normalization
        valid_phone = SMSGateway.validate_phone(phone_number)
        if not valid_phone:
            return {"success": False, "error": "Invalid phone number format", "status": "failed"}

        # 2. Simulation Check
        if simulation or not api_key or not account_id:
            if not api_key or not account_id:
                logger.warning("[SMSGateway] ⚠️ EAZIREACH credentials missing. Falling back to simulation.")
            return SMSGateway._simulate_send(valid_phone, content)

        # 3. Proven Legacy Request Body
        payload = {
            "recipients": [
                { "phone": valid_phone }
            ],
            "message": content,
            "channel": ["sms"],
            "businessName": business_name
        }

        try:
            logger.info(f"[SMSGateway] 📡 Attempting legacy Eazireach send to {valid_phone}")
            
            response = requests.post(
                api_url,
                headers=SMSGateway._get_headers(),
                json=payload,
                timeout=15,
                verify=False # Bypass certificate issues if provider has expired SSL
            )

            if response.status_code in [200, 201]:
                result = response.json()
                # Legacy result check: result.success === true
                is_success = result.get('success') == True
                
                return {
                    "success": is_success,
                    "provider": "EAZIREACH",
                    "message_id": result.get("messageId") or result.get("id"),
                    "status": "sent" if is_success else "failed",
                    "error": result.get('error') or result.get('message') if not is_success else None
                }
            else:
                logger.error(f"[SMSGateway] ❌ Eazireach API Error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"Gateway HTTP {response.status_code}", "status": "failed"}

        except Exception as e:
            logger.error(f"[SMSGateway] ❌ Critical connection error: {str(e)}")
            return {"success": False, "error": str(e), "status": "failed"}

    @staticmethod
    def _simulate_send(phone_number, content):
        import time
        logger.info(f"[SMSGateway] 📡 SIMULATED SEND to {phone_number}: {content[:50]}...")
        return {
            "success": True,
            "provider": "SIMULATOR",
            "message_id": f"sim_{int(time.time())}",
            "status": "sent"
        }

    @staticmethod
    def validate_phone(phone_number):
        """
        Legacy normalization: Ensure it's digits only.
        """
        cleaned = "".join(filter(str.isdigit, str(phone_number)))
        if not cleaned: return None
        
        # If it doesn't have a country code, assume Uganda (+256)
        if len(cleaned) == 9 and cleaned.startswith('7'):
            return '256' + cleaned
        if len(cleaned) == 10 and cleaned.startswith('0'):
            return '256' + cleaned[1:]
        
        return cleaned
