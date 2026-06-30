import { useEffect, useRef, useCallback } from "react";
import * as math from "mathjs";

const PREVIEW_X = [-5, -2, -1, 0, 0.5, 1, 2, 5];

function tryPreview(expr) {
  if (!expr.trim()) return null;
  try {
    const compiled = math.compile(expr);
    const samples = PREVIEW_X.map((xv) => {
      try {
        const y = compiled.evaluate({ x: xv });
        if (typeof y === "number" && isFinite(y)) return `f(${xv})=${y.toPrecision(4)}`;
        return null;
      } catch {
        return null;
      }
    }).filter(Boolean);
    return samples.slice(0, 4).join("  ·  ") || null;
  } catch {
    return null;
  }
}

function validateExpr(expr) {
  if (!expr.trim()) return "Enter an expression.";
  try {
    const node = math.parse(expr);
    const symbols = new Set();
    node.traverse((n) => {
      if (n.type === "SymbolNode" && !math.hasNumericValue(n.name)) {
        symbols.add(n.name);
      }
    });
    const unknown = [...symbols].filter((s) => s !== "x");
    if (unknown.length) return `Unknown variable(s): ${unknown.join(", ")}. Use only x.`;
    return null;
  } catch (err) {
    return `Syntax error: ${err.message}`;
  }
}

function useDebounce(fn, delay) {
  const timerRef = useRef(null);
  return useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export default function EquationInput({ value, onChange, onValidation, onSubmit }) {
  const previewRef = useRef(null);

  const doValidate = useCallback(
    (expr) => {
      const err = validateExpr(expr);
      onValidation(err);
      if (previewRef.current) {
        previewRef.current.textContent = err ? "" : (tryPreview(expr) ?? "");
      }
    },
    [onValidation]
  );

  const debouncedValidate = useDebounce(doValidate, 300);

  useEffect(() => {
    doValidate(value);
  }, [value, doValidate]);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    debouncedValidate(v);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="equation-input-wrap">
      <label htmlFor="eq-input" className="sr-only">
        Math expression (function of x)
      </label>
      <div className="eq-prefix" aria-hidden="true">y =</div>
      <textarea
        id="eq-input"
        className="eq-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        rows={2}
        placeholder="sin(x) / x"
        aria-label="Math expression"
        aria-describedby="eq-preview"
      />
      <p id="eq-preview" className="eq-preview" ref={previewRef} aria-live="polite" />
      <p className="eq-hint">
        Tip: Use <code>**</code> for powers · <code>Ctrl+Enter</code> to plot
      </p>

      <details className="fn-list">
        <summary>Supported functions</summary>
        <div className="fn-grid">
          {FN_LIST.map(([name, desc]) => (
            <span key={name} className="fn-item" title={desc}>
              <code>{name}</code>
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

const FN_LIST = [
  ["sin(x)", "Sine"],
  ["cos(x)", "Cosine"],
  ["tan(x)", "Tangent"],
  ["asin(x)", "Arcsine"],
  ["acos(x)", "Arccosine"],
  ["atan(x)", "Arctangent"],
  ["sinh(x)", "Hyperbolic sine"],
  ["cosh(x)", "Hyperbolic cosine"],
  ["tanh(x)", "Hyperbolic tangent"],
  ["exp(x)", "e^x"],
  ["log(x)", "Natural log"],
  ["log10(x)", "Log base 10"],
  ["sqrt(x)", "Square root"],
  ["abs(x)", "Absolute value"],
  ["sign(x)", "Sign (−1/0/1)"],
  ["floor(x)", "Floor"],
  ["ceiling(x)", "Ceiling"],
  ["pi", "π ≈ 3.14159"],
  ["E", "e ≈ 2.71828"],
];