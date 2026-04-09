import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'django-insecure-admin-project-key'
DEBUG = True
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
    'django_filters',
    'users',
    'core_app',
    'inventory',
    'sales',
    'finance',
    'customers',
    'messaging',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'users.middleware.UserActivityMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.request', 
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

import dj_database_url
from dotenv import load_dotenv

# Load .env from project root or admin dir
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

db_url = os.environ.get('DATABASE_URL', 'postgres://a7e4d5d28715a731de0fb1b564139f0cca5c4a21d4995598be8c079ef627589c:sk_PaMCHF_TjeZVhlvS8hR0l@db.prisma.io:5432/postgres?sslmode=verify-full')

DATABASES = {
    'default': dj_database_url.config(
        default=db_url,
        conn_max_age=0,
        ssl_require=False if db_url.startswith('sqlite') else True
    )
}

AUTH_USER_MODEL = 'users.User'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.environ.get('TIME_ZONE', 'UTC')
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / "public",
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

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
        lambda request: "/static/css/admin.css",
    ],
}

