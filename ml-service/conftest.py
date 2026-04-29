import os
import sys

# Ensure ml-service root is importable so `import app` works regardless of CWD.
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Provide safe defaults so app.py does not require a real .env / external services.
os.environ.setdefault("OCR_API_KEY", "test-key")
os.environ.setdefault("OCR_PROVIDER", "ocr_space")
