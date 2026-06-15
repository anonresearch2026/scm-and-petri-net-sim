# Cyber-Physical Supply Chain Risk Simulator

> This repository accompanies an anonymous double-blind conference submission.
> It is provided for reviewer reference only and contains no author- or
> institution-identifying information.

A browser-based Monte Carlo simulation tool that models cyber-physical supply
chain disruption costs by integrating Fault Tree Analysis (FTA) with Petri-net
token simulation. It compares three cost models per run:

- **Traditional** — physical disruptions treated as isolated events.
- **Integrated** — adds cyber places and cascade transitions, capturing
  cyber-physical cascade effects that traditional models miss.
- **Mitigated** — applies configurable mitigation controls (backups, firewalls,
  redundant suppliers, etc.) on top of the integrated model to quantify the
  return on risk controls.

Results include Monte Carlo cost distributions, a "hidden risk" estimate (the
gap between the traditional and integrated models), convergence diagnostics,
sensitivity analysis, and a SCOR-based assessment with grades and prioritized
recommendations.

## Running locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open the local URL printed in the terminal. Use the built-in example
scenario, or upload your own as JSON or Excel (sheets: Scenario, Tiers, Risks,
Mitigations — download the template from the in-app scenario uploader for the
exact format).

## Production build

```bash
npm run build
npm start
```

A `Dockerfile` is also included for containerized deployment (exposes port 5000).

## How it works

The engine runs forward-only Monte Carlo token simulation: each iteration
initializes a place to token-count vector, then steps day by day, firing
transitions probabilistically. Cost accumulates per fired transition. Because
no reachability graph is constructed, complexity is linear in
`iterations x days x transitions` rather than exponential in system state.
