import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Load .env from backend dir and then from project root
load_dotenv(BASE_DIR / '.env', override=True)
load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-gonza-default-key-for-dev-only')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'unfold',
    'unfold.contrib.filters',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'users',
    'core_app',
    'inventory',
    'sales',
    'finance',
    'customers',
    'messaging',
    'tasks',
    'activities',
    'django_filters',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core_app.middleware.SentinelAccessMiddleware', # 🚀 ACCESS CONTROL
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'users.middleware.UserActivityMiddleware',
]

CORS_ALLOW_ALL_ORIGINS = True

# Match legacy Supabase CORS flexibility
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-client-info",
    "apikey",
]
CORS_ALLOW_CREDENTIALS = True
ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

import dj_database_url

db_url = os.environ.get('DATABASE_URL')

# Support for non-SSL connections (e.g. local development)
ssl_require = True
if db_url:
    if db_url.startswith('sqlite') or 'localhost' in db_url or '127.0.0.1' in db_url or 'sslmode=disable' in db_url:
        ssl_require = False

DATABASES = {
    'default': dj_database_url.config(
        default=db_url,
        conn_max_age=0,
        ssl_require=ssl_require
    )
}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.environ.get('TIME_ZONE', 'UTC')
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / "public",
]
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 50,
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Use a dedicated variable for the key to ensure it's loaded correctly
JWT_KEY = os.environ.get('JWT_ACCESS_SECRET') or os.environ.get('SECRET_KEY') or 'gonza-hardcoded-dev-key-123'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': True,
    'SIGNING_KEY': JWT_KEY,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

AUTH_USER_MODEL = 'users.User'

UNFOLD = {
    "SITE_TITLE": "Gonza Admin Panel",
    "SITE_HEADER": "Gonza Systems | Management",
    "SITE_ICON": lambda request: "/static/icon.png", 
    "SITE_FAVICON": lambda request: "/static/favicon.ico",
    "SITE_SYMBOL": "speed", # material symbols name
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
    },
    "STYLES": [
        lambda request: "css/admin.css",
    ],
}

# Pesapal Configuration
PESAPAL_BASE_URL = os.environ.get('PESAPAL_BASE_URL')
PESAPAL_CONSUMER_KEY = os.environ.get('PESAPAL_CONSUMER_KEY')
PESAPAL_CONSUMER_SECRET = os.environ.get('PESAPAL_CONSUMER_SECRET')
PESAPAL_IPN_ID = os.environ.get('PESAPAL_IPN_ID')
PESAPAL_CALLBACK_URL = os.environ.get('PESAPAL_CALLBACK_URL')

# Messaging Gateway Configuration
SMS_PROVIDER_API_KEY = os.environ.get('SMS_PROVIDER_API_KEY')
SMS_PROVIDER_USERNAME = os.environ.get('SMS_PROVIDER_USERNAME')
SMS_SENDER_ID = os.environ.get('SMS_SENDER_ID', 'GONZA')

VERNRA_API_KEY = os.environ.get('VERNRA_API_KEY')
VERNRA_ACCOUNT_ID = os.environ.get('VERNRA_ACCOUNT_ID')
VERNRA_BASE_URL = os.environ.get('VERNRA_BASE_URL', 'https://api.vernra.com')

EAZIREACH_API_KEY = os.environ.get('EAZIREACH_API_KEY')
EAZIREACH_ACCOUNT_ID = os.environ.get('EAZIREACH_ACCOUNT_ID')

WHATSAPP_API_URL = os.environ.get('WHATSAPP_API_URL')
WHATSAPP_API_KEY = os.environ.get('WHATSAPP_API_KEY')
WHATSAPP_INSTANCE_PREFIX = os.environ.get('WHATSAPP_INSTANCE_PREFIX', 'gonza_')

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('SMTP_PORT', 465))
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_HOST_USER = os.environ.get('SMTP_USER')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASS')
DEFAULT_FROM_EMAIL = f"Gonza Systems <{os.environ.get('SMTP_FROM') or os.environ.get('SMTP_USER')}>"
