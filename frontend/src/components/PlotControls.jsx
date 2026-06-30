import { useState, useEffect } from "react";

const DEFAULTS = { xmin: -10, xmax: 10, points: 500, mode: "linear" };

function NumericField({ id, label, value, onChange, min, max, step = "any", hint }) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(n);
    else setRaw(String(value));
  };

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </label>
      <input
        id={id}
        type="number"
        className="field-input"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export default function PlotControls({ controls, onChange }) {
  const set = (key) => (val) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  const handlePoints = (val) => {
    onChange((prev) => ({
      ...prev,
      points: Math.min(5000, Math.max(2, Math.round(val))),
    }));
  };

  const handleReset = () => onChange(DEFAULTS);

  return (
    <div className="plot-controls">
      <div className="controls-row">
        <NumericField
          id="ctrl-xmin"
          label="x min"
          value={controls.xmin}
          onChange={set("xmin")}
          max={controls.xmax - 0.001}
        />
        <NumericField
          id="ctrl-xmax"
          label="x max"
          value={controls.xmax}
          onChange={set("xmax")}
          min={controls.xmin + 0.001}
        />
      </div>

      <div className="controls-row">
        <NumericField
          id="ctrl-points"
          label="Points"
          value={controls.points}
          onChange={handlePoints}
          min={2}
          max={5000}
          step={1}
          hint="2–5000"
        />

        <div className="field">
          <label className="field-label">Sampling</label>
          <div className="toggle-group" role="radiogroup" aria-label="Sampling mode">
            {["linear", "log"].map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={controls.mode === m}
                className={`toggle-btn ${controls.mode === m ? "active" : ""}`}
                onClick={() => onChange((prev) => ({ ...prev, mode: m }))}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="reset-btn" onClick={handleReset} title="Reset to defaults">
        ↺ Reset
      </button>
    </div>
  );
}