from __future__ import annotations
import warnings
from functools import lru_cache
from typing import Any
import numpy as np
import sympy as sp

_SAFE_NAMESPACE: dict[str, Any] = {
    "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "asin": sp.asin, "arcsin": sp.asin,
    "acos": sp.acos, "arccos": sp.acos,
    "atan": sp.atan, "arctan": sp.atan,
    "sinh": sp.sinh, "cosh": sp.cosh, "tanh": sp.tanh,
    "exp": sp.exp, "log": sp.log, "ln": sp.log,
    "log10": lambda x: sp.log(x, 10),
    "sqrt": sp.sqrt, "abs": sp.Abs,
    "sign": sp.sign, "floor": sp.floor,
    "ceiling": sp.ceiling, "ceil": sp.ceiling,
    "pi": sp.pi, "e": sp.E, "E": sp.E,
    "x": sp.Symbol("x"),
}

_X = sp.Symbol("x")
_LARGE_VALUE = 1e15

class EvalError(ValueError):
    pass

@lru_cache(maxsize=256)
def _parse_expr(expr_str: str) -> sp.Expr:
    try:
        parsed = sp.sympify(expr_str, locals=_SAFE_NAMESPACE, evaluate=True)
    except Exception as exc:
        raise EvalError(f"Cannot parse expression: {exc}") from exc
    free = parsed.free_symbols - {_X}
    if free:
        unknown = ", ".join(str(s) for s in sorted(free, key=str))
        raise EvalError(f"Unknown symbol(s): {unknown}. Only 'x' is allowed.")
    return parsed

def evaluate(expr_str, xmin, xmax, points, mode="linear"):
    if xmin >= xmax:
        raise EvalError("xmin must be strictly less than xmax.")
    points = max(2, min(points, 5000))
    if mode == "log":
        if xmin <= 0:
            raise EvalError("Log-spaced sampling requires xmin > 0.")
        x_arr = np.logspace(np.log10(xmin), np.log10(xmax), points)
    else:
        x_arr = np.linspace(xmin, xmax, points)
    sym_expr = _parse_expr(expr_str)
    try:
        f = sp.lambdify(_X, sym_expr, modules=["numpy"])
    except Exception as exc:
        raise EvalError(f"Cannot compile expression: {exc}") from exc
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            y_raw = f(x_arr)
        except Exception as exc:
            raise EvalError(f"Evaluation error: {exc}") from exc
    if np.iscomplexobj(y_raw):
        y_arr = np.where(np.imag(y_raw) == 0, np.real(y_raw), np.nan)
        y_arr = y_arr.astype(np.float64)
    else:
        try:
            y_arr = np.asarray(y_raw, dtype=np.float64)
        except (TypeError, ValueError):
            y_arr = np.full(points, float(y_raw))
    y_arr = np.where(
        np.isfinite(y_arr) & (np.abs(y_arr) < _LARGE_VALUE),
        y_arr, np.nan,
    )
    nan_count = int(np.sum(np.isnan(y_arr)))
    warn_msgs = []
    if nan_count:
        warn_msgs.append(f"{nan_count} point(s) undefined or complex.")
    x_list = x_arr.tolist()
    y_list = [None if np.isnan(v) else round(v, 10) for v in y_arr.tolist()]
    return {
        "x": x_list, "y": y_list,
        "meta": {"expr": expr_str, "nan_count": nan_count, "warnings": warn_msgs},
    }