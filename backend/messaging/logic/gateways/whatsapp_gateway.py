import logging
import requests
import time
from django.conf import settings
from messaging.models import WhatsAppSession
from django.utils import timezone

logger = logging.getLogger(__name__)

class WhatsAppGateway:
    """
    🟢 WHATSAPP GATEWAY (EAZIREACH PRO DRIVER)
    Synchronized with legacy MessagingService for 100% compatibility.
    """

    @staticmethod
    def _get_headers():
        """
        🚀 FIX: Use legacy X-API-Key and X-Account-ID headers.
        Added Bearer fallback and credential stripping for robustness.
        """
        api_key = str(getattr(settings, 'EAZIREACH_API_KEY', '')).strip()
        account_id = str(getattr(settings, 'EAZIREACH_ACCOUNT_ID', '')).strip()
        
        print(f"🔑 [WhatsAppGateway] Auth Check -> Key: {api_key[:10]}..., Account: {account_id[:10]}...")

        return {
            "X-API-Key": api_key,
            "X-Account-ID": account_id,
            "Authorization": f"Bearer {api_key}", # Try both for compatibility
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    @staticmethod
    def initialize_session(user, type='qr', phone_number=None):
        """
        Following Legacy Logic:
        1. Create/Retrieve instance.
        2. Request connection data (QR or Pairing).
        """
        print(f"🚀 [WhatsAppGateway] Initializing session for {user.email} (Type: {type}, Phone: {phone_number})")
        api_url = getattr(settings, 'WHATSAPP_API_URL', 'https://api.eazireach.com/api/v1')
        session, created = WhatsAppSession.objects.get_or_create(user=user)
        
        if not session.instance_name:
            session.instance_name = f"gonza_{user.id[:8]}"

        try:
            # STEP 1: Ensure instance exists
            create_resp = requests.post(
                f"{api_url}/whatsapp/instance",
                headers=WhatsAppGateway._get_headers(),
                json={"instanceName": session.instance_name},
                timeout=15,
                verify=False
            )
            print(f"📡 [WhatsAppGateway] Step 1 (Create) Status: {create_resp.status_code}, Response: {create_resp.text}")
            
            # STEP 2: Request connection (QR or Pairing)
            method = 'qrCode' if type == 'qr' else 'pairingCode'
            clean_phone = "".join(filter(str.isdigit, str(phone_number or "")))
            
            connect_url = f"{api_url}/whatsapp/connect/{session.instance_name}?number={clean_phone}&method={method}"
            
            # Legacy Retry Logic
            api_data = None
            for attempt in range(3):
                if attempt > 0: 
                    print(f"🔄 [WhatsAppGateway] Retrying connect (Attempt {attempt+1})...")
                    time.sleep(2)
                
                resp = requests.get(
                    connect_url, 
                    headers=WhatsAppGateway._get_headers(), 
                    timeout=15, 
                    verify=False
                )
                
                print(f"📡 [WhatsAppGateway] Step 2 (Connect) Status: {resp.status_code}, Response: {resp.text}")
                
                if resp.ok:
                    api_data = resp.json()
                    # Check if we got data
                    if api_data.get('data', {}).get('base64') or api_data.get('data', {}).get('pairingCode'):
                        break
            
            if api_data:
                session.status = 'connecting'
                session.qr_code = api_data.get('data', {}).get('base64')
                session.pairing_code = api_data.get('data', {}).get('pairingCode')
                session.linked_phone_number = phone_number
                session.save()
                logger.info(f"[WhatsAppGateway] 🔄 Legacy pairing initiated for User {user.id}")
            else:
                session.status = 'error'
                session.save()
                
        except Exception as e:
            session.status = 'error'
            session.save()
            logger.error(f"[WhatsAppGateway] ❌ Critical Error in Legacy Handshake: {str(e)}")

        return session

    @staticmethod
    def get_status(user):
        """
        Polls legacy status endpoint.
        """
        api_url = getattr(settings, 'WHATSAPP_API_URL', 'https://api.eazireach.com/api/v1')
        
        try:
            session = WhatsAppSession.objects.get(user=user)
            if not session.instance_name:
                return {"status": "disconnected"}

            if session.status == 'error':
                return {"status": "error"}

            response = requests.get(
                f"{api_url}/whatsapp/status/{session.instance_name}",
                headers=WhatsAppGateway._get_headers(),
                timeout=10,
                verify=False
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Legacy Connectivity Check
                is_connected = (
                    data.get('connected') == True or
                    data.get('data', {}).get('status') == 'connected' or
                    data.get('data', {}).get('instance', {}).get('state') == 'open'
                )
                
                if is_connected:
                    session.status = 'connected'
                    session.qr_code = None
                    session.pairing_code = None
                    session.save()
                
                return {
                    "status": session.status,
                    "instance_name": session.instance_name,
                    "qr_code": session.qr_code,
                    "pairing_code": session.pairing_code,
                    "linked_phone_number": session.linked_phone_number
                }
            
            return {"status": session.status}
            
        except WhatsAppSession.DoesNotExist:
            return {"status": "disconnected"}
        except Exception:
            return {"status": "error"}

    @staticmethod
    def disconnect(user):
        """
        Terminates the WhatsApp instance.
        """
        api_url = getattr(settings, 'WHATSAPP_API_URL', 'https://api.eazireach.com/api/v1')
        try:
            session = WhatsAppSession.objects.get(user=user)
            requests.post(
                f"{api_url}/instances/{session.instance_name}/logout",
                headers=WhatsAppGateway._get_headers(),
                timeout=10,
                verify=False
            )
            session.status = 'disconnected'
            session.qr_code = None
            session.pairing_code = None
            session.save()
            return True
        except Exception:
            return False

    @staticmethod
    def send_message(user, phone_number, content, media_url=None):
        """
        Sends message via Legacy V1 Payload.
        """
        api_url = getattr(settings, 'WHATSAPP_API_URL', 'https://api.eazireach.com/api/v1')
        try:
            session = WhatsAppSession.objects.get(user=user)
            if session.status != 'connected':
                return {"success": False, "error": "WhatsApp not connected"}

            # Unified V1 Payload
            payload = {
                "recipients": [{ "phone": phone_number }],
                "message": content,
                "channel": ["whatsapp"],
                "whatsappInstance": session.instance_name
            }
            
            if media_url:
                payload["mediaUrl"] = media_url
                payload["mediaType"] = "video" if any(x in media_url.lower() for x in ['.mp4', '.mov', '.avi']) else "image"

            response = requests.post(
                f"{api_url}/send",
                headers=WhatsAppGateway._get_headers(),
                json=payload,
                timeout=15,
                verify=False
            )
            
            if response.status_code in [200, 201]:
                res_data = response.json()
                return {"success": res_data.get('success') == True, "message_id": res_data.get('id'), "status": "sent"}
            
            return {"success": False, "error": response.text}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
