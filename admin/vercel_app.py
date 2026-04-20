import os
import sys
from pathlib import Path

# Add the parent directory and backend directory to sys.path
# This allows Vercel to find modules that are symlinked locally
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR.parent / 'backend'))

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
application = get_wsgi_application()
app = application # Vercel looks for 'app'
