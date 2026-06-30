import { useState, useCallback, useRef } from "react";
import EquationInput from "./components/EquationInput.jsx";
import PlotControls from "./components/PlotControls.jsx";
import PlotView from "./components/PlotView.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const DEFAULT_CONTROLS = {
  xmin: -10,
  xmax: 10,
  points: 500,
  mode: "linear",
};

export default function App() {
  const [expr, setExpr] = useState("sin(x) / x");
  const [clientError, setClientError] = useState(null);
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const abortRef = useRef(null);

  const handleValidation = useCallback((err) => {
    setClientError(err);
  }, []);

  const handlePlot = useCallback(async () => {
    if (clientError) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setApiError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/plot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expr, ...controls }),
        signal: controller.signal,
      });
      const data = await resp.json();
      if (!resp.ok) {
        setApiError(data.detail || "Unknown server error.");
        return;
      }
      setPlotData(data);
    } catch (err) {
      if (err.name !== "AbortError") {
        setApiError("Network error — is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }, [expr, controls, clientError]);

  const canPlot = !clientError && expr.trim().length > 0;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <span className="header-logo">f(x)</span>
          <h1 className="header-title">Equation Grapher</h1>
          <p className="header-sub">Type a math expression. See it plotted instantly.</p>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <section className="panel">
            <h2 className="panel-heading">Expression</h2>
            <EquationInput
              value={expr}
              onChange={setExpr}
              onValidation={handleValidation}
              onSubmit={canPlot ? handlePlot : undefined}
            />
            {clientError && (
              <p className="inline-error" role="alert">⚠ {clientError}</p>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-heading">Range &amp; Resolution</h2>
            <PlotControls controls={controls} onChange={setControls} />
          </section>

          <button
            className="plot-btn"
            onClick={handlePlot}
            disabled={!canPlot || loading}
            aria-busy={loading}
          >
            {loading ? "Evaluating…" : "Plot"}
          </button>

          {apiError && (
            <div className="api-error" role="alert">
              <strong>Error:</strong> {apiError}
            </div>
          )}

          {plotData?.meta?.warnings?.length > 0 && (
            <div className="warnings">
              {plotData.meta.warnings.map((w, i) => (
                <p key={i} className="warning-item">ℹ {w}</p>
              ))}
            </div>
          )}

          <section className="panel examples-panel">
            <h2 className="panel-heading">Try an example</h2>
            <div className="example-chips">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="chip"
                  onClick={() => setExpr(ex)}
                  title={ex}
                >
                  {ex}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="plot-area">
          <PlotView
            data={plotData}
            loading={loading}
            expr={expr}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Powered by{" "}
          <a href="https://www.sympy.org/" target="_blank" rel="noreferrer">SymPy</a>,{" "}
          <a href="https://numpy.org/" target="_blank" rel="noreferrer">NumPy</a>,{" "}
          <a href="https://plotly.com/javascript/" target="_blank" rel="noreferrer">Plotly.js</a>.
        </p>
      </footer>
    </div>
  );
}

const EXAMPLES = [
  "sin(x)",
  "cos(x) * exp(-x/5)",
  "x**3 - 3*x",
  "sin(x) / x",
  "sqrt(abs(x))",
  "log(x + 11)",
  "1 / (1 + exp(-x))",
  "floor(x)",
];