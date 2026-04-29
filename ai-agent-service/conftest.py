import os
import sys

# Make sure ai-agent-service root is importable so `import app` works regardless of CWD.
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Force tests to never use a real Gemini API key — guarantees fallback path is used.
os.environ["GEMINI_API_KEY"] = ""
os.environ.setdefault("AI_AGENT_USE_WEB_RESEARCH", "false")
