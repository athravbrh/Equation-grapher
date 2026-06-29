from __future__ import annotations
import os
from typing import Literal
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from evaluator import EvalError, evaluate

limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute"])

app = FastAPI(title="Equation Grapher API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

class PlotRequest(BaseModel):
    expr: str = Field(..., min_length=1, max_length=500)
    xmin: float = Field(-10.0)
    xmax: float = Field(10.0)
    points: int = Field(500, ge=2, le=5000)
    mode: Literal["linear", "log"] = Field("linear")

    @field_validator("xmin", "xmax")
    @classmethod
    def finite_bounds(cls, v):
        if not (-1e9 <= v <= 1e9):
            raise ValueError("Bounds must be in [-1e9, 1e9].")
        return v

    @field_validator("expr")
    @classmethod
    def no_dangerous_keywords(cls, v):
        forbidden = {"__", "import", "exec", "eval", "open", "os", "sys"}
        lower = v.lower()
        for kw in forbidden:
            if kw in lower:
                raise ValueError(f"Forbidden keyword: '{kw}'")
        return v.strip()

@app.get("/")
async def root():
    return {"status": "ok", "service": "equation-grapher-api"}

@app.post("/api/plot")
@limiter.limit("30/minute")
async def plot(request: Request, body: PlotRequest):
    try:
        result = evaluate(
            expr_str=body.expr,
            xmin=body.xmin,
            xmax=body.xmax,
            points=body.points,
            mode=body.mode,
        )
    except EvalError as exc:
        return JSONResponse(status_code=400, content={"detail": str(exc)})
    except Exception as exc:
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)