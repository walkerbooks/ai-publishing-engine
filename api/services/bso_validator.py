"""BSO validation — required fields and types. No business rules beyond schema."""

from typing import Any

from pydantic import ValidationError

from api.state.schema import BookSpecification


def validate_bso(data: dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate a dict as a complete BookSpecification.
    Returns (True, []) if valid, else (False, list of error messages).
    """
    try:
        BookSpecification.model_validate(data)
        return True, []
    except ValidationError as e:
        errors: list[str] = []
        for err in e.errors():
            loc = ".".join(str(x) for x in err["loc"])
            errors.append(f"{loc}: {err['msg']}")
        return False, errors
