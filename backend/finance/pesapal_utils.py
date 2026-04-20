import requests
import json
from django.conf import settings
from django.utils import timezone

def get_pesapal_token():
    pesapal_url = getattr(settings, 'PESAPAL_BASE_URL', None)
    consumer_key = getattr(settings, 'PESAPAL_CONSUMER_KEY', None)
    consumer_secret = getattr(settings, 'PESAPAL_CONSUMER_SECRET', None)

    if not all([pesapal_url, consumer_key, consumer_secret]):
        raise Exception("Missing Pesapal configuration in settings")

    response = requests.post(
        f"{pesapal_url}/api/Auth/RequestToken",
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        json={
            'consumer_key': consumer_key,
            'consumer_secret': consumer_secret,
        }
    )

    if response.status_code != 200:
        raise Exception(f"Failed to get PesaPal token: {response.text}")

    data = response.json()
    return data.get('token')

def submit_pesapal_order(params):
    token = get_pesapal_token()
    pesapal_url = getattr(settings, 'PESAPAL_BASE_URL', None)
    ipn_id = getattr(settings, 'PESAPAL_IPN_ID', None)
    
    if not ipn_id:
        raise Exception("Missing PESAPAL_IPN_ID in settings")

    callback_url = params.get('callback_url')
    
    payload = {
        "id": params.get('reference'),
        "currency": "UGX",
        "amount": float(params.get('amount')),
        "description": params.get('description'),
        "callback_url": callback_url,
        "notification_id": ipn_id,
        "billing_address": {
            "email_address": params.get('email'),
            "phone_number": params.get('phone_number'),
            "country_code": "UG",
            "first_name": params.get('first_name', 'Customer'),
            "last_name": params.get('last_name', 'User'),
            "line_1": "Kampala",
            "line_2": "",
            "city": "Kampala",
            "state": "",
            "postal_code": "",
            "zip_code": ""
        }
    }

    response = requests.post(
        f"{pesapal_url}/api/Transactions/SubmitOrderRequest",
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f"Bearer {token}"
        },
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f"Failed to submit order to Pesapal: {response.text}")

    return response.json()

def get_pesapal_transaction_status(tracking_id):
    token = get_pesapal_token()
    pesapal_url = getattr(settings, 'PESAPAL_BASE_URL', None)

    response = requests.get(
        f"{pesapal_url}/api/Transactions/GetTransactionStatus?orderTrackingId={tracking_id}",
        headers={
            'Accept': 'application/json',
            'Authorization': f"Bearer {token}"
        }
    )

    if response.status_code != 200:
        raise Exception(f"Failed to fetch transaction status from Pesapal: {response.text}")

    return response.json()

def register_pesapal_ipn():
    """
    Registers the IPN URL with Pesapal and returns the IPN ID.
    The IPN ID must be used in all SubmitOrderRequests.
    """
    token = get_pesapal_token()
    pesapal_url = getattr(settings, 'PESAPAL_BASE_URL', None)
    
    # We use the base API URL to build the IPN endpoint
    # E.g. http://your-api.com/api/finance/transactions/ipn/
    callback_base = getattr(settings, 'PESAPAL_CALLBACK_URL', '').split('/payment-callback')[0]
    ipn_url = f"{callback_base}/api/finance/transactions/ipn/"

    payload = {
        "url": ipn_url,
        "ipn_notification_type": "GET"
    }

    response = requests.post(
        f"{pesapal_url}/api/URLSetup/RegisterIPN",
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': f"Bearer {token}"
        },
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f"Failed to register IPN with Pesapal: {response.text}")

    return response.json()
