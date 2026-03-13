"""Supervisor: deterministic routing only. No LLM calls."""

from typing import Literal

Stage = Literal["intake", "outline", "preview", "awaiting_payment", "generating", "formatting", "complete", "error"]


def get_next_stage(
    has_bso: bool,
    has_outline: bool,
    payment_status: str | None = None,
) -> Stage:
    """
    Given current state, return the next workflow stage.
    Used to decide which agent or step to run (e.g. outline vs preview).
    """
    if not has_bso:
        return "intake"
    if not has_outline:
        return "outline"
    if payment_status == "paid":
        return "generating"
    if payment_status == "pending":
        return "awaiting_payment"
    return "preview"
