# Flouze Budget

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
![Status: early stage](https://img.shields.io/badge/status-early--stage-blue.svg)

Open-source budgeting and personal finance tool for students.

> Student-led, non-commercial project focused on making everyday money management simpler and more accessible for students.

## About

Flouze Budget is part of a broader student-focused initiative to build practical tools for university life. The goal is to provide a simple, free and transparent budgeting tool that students can use and improve together.

The project is currently in an early stage. The repository is being opened progressively so that the community can follow development, suggest improvements and contribute.

## Budget tools

The public repository now includes four lightweight tools:

- **Monthly budget** — compare net monthly income with common student expense categories and planned savings.
- **50 / 30 / 20 reference** — see a simple needs / wants / savings split. This is a reference framework, not a personalised recommendation.
- **Savings goal** — estimate how many monthly contributions are needed to reach a target, without assuming investment returns or interest.
- **Trip / project budget** — track a shared trip, move or event with 2–6 participants, weighted splits, personal versus shared expenses, categories, planned-budget tracking, manual currency conversion and net reimbursements.

The tools support CHF, EUR and USD display formatting. Currency selection changes formatting only. The trip / project tool accepts a manual per-transaction conversion rate; Flouze does not fetch or provide live foreign-exchange rates.

## Privacy model

The calculators run entirely in the browser. No backend is required and financial values are not sent to a server by this project.

Saving values is optional and disabled by default. If enabled, values are stored in the browser's localStorage on that device. Use **Reset all data** before leaving a shared device.

## Run locally

No application dependencies are required.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173` in a browser.

## Tests

The calculation and storage modules use Node's built-in test runner:

```bash
npm test
```

GitHub Actions runs the same test suite on pushes and pull requests.

## Important note

Flouze Budget provides educational budgeting utilities. It does not provide personalised financial advice, investment advice, credit decisions or bank-account connectivity.

## Goals

- Make student budgeting easier to understand and manage
- Keep the project free and accessible
- Build in public and welcome community contributions
- Create reusable tools that other student communities can adapt

## Live project

Visit **[flouze.ch](https://flouze.ch)**.

## Community & contributing

Contributions are welcome, including documentation improvements, accessibility feedback, UX ideas, bug reports and code contributions.

- Read the [contribution guide](CONTRIBUTING.md)
- Browse [good first issues](https://github.com/transportblueberries/flouze_budget/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- Report bugs through the repository's Bug report template
- Suggest improvements through the Feature request template
- Read the [support guide](SUPPORT.md)
- Read the [Code of Conduct](CODE_OF_CONDUCT.md)
- Report security concerns according to [SECURITY.md](SECURITY.md)

If this is your first open-source contribution, documentation and `good first issue` tasks are intentionally kept approachable.

## Contributors

- [@transportblueberries](https://github.com/transportblueberries) — maintainer
- [@kasahati](https://github.com/kasahati) — contributor

## Project status

**Early-stage / active development.**

The public repository currently focuses on project documentation, contribution workflows and the progressive opening of the project. Features and implementation details should only be considered available when they are actually published here.

## Open-source governance

Flouze Budget uses:

- the [MIT License](LICENSE);
- a public [contribution guide](CONTRIBUTING.md);
- structured issue and pull-request templates;
- a [Code of Conduct](CODE_OF_CONDUCT.md);
- a [Security Policy](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE).