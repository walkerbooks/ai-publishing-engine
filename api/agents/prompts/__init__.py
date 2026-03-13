"""System prompts for agents. Import from here to keep existing code working."""

from api.agents.prompts.intake import INTAKE_SYSTEM
from api.agents.prompts.outline import OUTLINE_SYSTEM
from api.agents.prompts.preview import PREVIEW_SYSTEM

__all__ = ["INTAKE_SYSTEM", "OUTLINE_SYSTEM", "PREVIEW_SYSTEM"]
