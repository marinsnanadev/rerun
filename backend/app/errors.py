from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

GENERIC_INVALID = "Some of the information sent was not valid."


async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """Answer with `{"detail": "<message>"}`, the shape the frontend knows how to show.

    Messages we wrote ourselves (raised as ValueError in the schemas) are safe to show as they
    are. Anything else, such as a missing field, gets a generic sentence.
    """
    detail = GENERIC_INVALID
    for error in exc.errors():
        if error["type"] == "value_error":
            detail = str(error["msg"]).removeprefix("Value error, ")
            break

    return JSONResponse(status_code=422, content={"detail": detail})


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, _validation_error)  # type: ignore[arg-type]
