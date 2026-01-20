import sys
import os

# Add project root to path to allow imports from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app

# Vercel needs 'app' to be exposed
# Force Rebuild 1
