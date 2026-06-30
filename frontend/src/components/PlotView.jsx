import { useEffect, useRef } from "react";

let Plotly = null;
async function getPlotly() {
  if (!Plotly) {
    const mod = await import("plotly.js-dist-min");
    Plotly = mod.default;
  }
  return Plotly;
}

const PLOT_BG = "#0f1117";
const GRID_COLOR = "#2a2d3e";
const AXIS_COLOR = "#6b7280";
const LINE_COLOR = "#7c3aed";
const FONT_COLOR = "#e5e7eb";

function buildLayout(expr) {
  return {
    paper_bgcolor: PLOT_BG,
    plot_bgcolor: PLOT_BG,
    font: { family: "Inter, sans-serif", color: FONT_COLOR, size: 13 },
    title: {
      text: `y = ${expr}`,
      font: { family: "JetBrains Mono, monospace", size: 15, color: "#a78bfa" },
      x: 0.05,
    },
    margin: { t: 56, r: 24, b: 48, l: 56 },
    xaxis: {
      title: "x",
      gridcolor: GRID_COLOR,
      zerolinecolor: "#374151",
      linecolor: AXIS_COLOR,
      tickfont: { color: AXIS_COLOR },
    },
    yaxis: {
      title: "y",
      gridcolor: GRID_COLOR,
      zerolinecolor: "#374151",
      linecolor: AXIS_COLOR,
      tickfont: { color: AXIS_COLOR },
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: "#1e2030",
      bordercolor: "#374151",
      font: { family: "JetBrains Mono, monospace", color: FONT_COLOR },
    },
  };
}

function buildTrace(data) {
  return {
    x: data.x,
    y: data.y,
    type: "scatter",
    mode: "lines",
    line: { color: LINE_COLOR, width: 2 },
    connectgaps: false,
    hovertemplate: "x=%{x:.4f}<br>y=%{y:.4f}<extra></extra>",
  };
}

function downloadCsv(data, expr) {
  const rows = data.x.map((xv, i) => `${xv},${data.y[i] ?? ""}`);
  const csv = `x,y\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `graph_${expr.replace(/[^a-z0-9]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlotView({ data, loading, expr }) {
  const containerRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    let cancelled = false;
    getPlotly().then((P) => {
      if (cancelled || !containerRef.current) return;
      const trace = buildTrace(data);
      const layout = buildLayout(expr);
      const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
        toImageButtonOptions: { format: "svg", filename: `graph_${expr.slice(0, 30)}` },
      };
      if (!initialized.current) {
        P.newPlot(containerRef.current, [trace], layout, config);
        initialized.current = true;
      } else {
        P.react(containerRef.current, [trace], layout, config);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data, expr]);

  useEffect(() => {
    return () => {
      if (containerRef.current && initialized.current) {
        getPlotly().then((P) => P.purge(containerRef.current));
      }
    };
  }, []);

  return (
    <div className="plot-view">
      {loading && (
        <div className="plot-overlay" aria-live="polite" aria-label="Calculating…">
          <div className="spinner" />
          <span>Evaluating on server…</span>
        </div>
      )}

      {!data && !loading && (
        <div className="plot-empty">
          <span className="plot-empty-icon">∫</span>
          <p>Enter an expression and click <strong>Plot</strong>.</p>
          <p className="plot-empty-sub">The graph will appear here.</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="plotly-container"
        aria-label="Interactive graph"
        style={{ display: data ? "block" : "none" }}
      />

      {data && (
        <div className="plot-toolbar">
          <span className="plot-meta">
            {data.x.length.toLocaleString()} points ·{" "}
            {data.meta.nan_count > 0
              ? `${data.meta.nan_count} gap(s)`
              : "no gaps"}
          </span>
          <button
            className="export-btn"
            onClick={() => downloadCsv(data, expr)}
            title="Download x,y as CSV"
          >
            ↓ CSV
          </button>
        </div>
      )}
    </div>
  );
}