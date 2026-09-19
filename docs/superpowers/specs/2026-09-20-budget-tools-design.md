# Flouze Budget Tools — Design Specification

Date: 2026-09-20
Status: Proposed design approved in chat; implementation not started

## 1. Purpose

Add the first functional open-source tools to Flouze Budget while keeping the project simple, transparent, privacy-friendly, easy to contribute to, and suitable for static hosting.

The initial release should provide useful student budgeting utilities without accounts, banking connections, backend services, or dependency-heavy frameworks.

## 2. Product principles

- Student-first: understandable without financial expertise.
- Privacy-first: calculations run locally in the browser.
- Transparent: formulas and assumptions are visible and documented.
- Lightweight: plain HTML, CSS and JavaScript.
- Accessible: keyboard-friendly, labelled forms, clear errors and readable contrast.
- International enough for reuse: CHF by default, with EUR and USD formatting available.
- Honest scope: educational budgeting tools, not financial advice.

## 3. V1 tools

### 3.1 Monthly budget calculator

Inputs:
- Net monthly income
- Housing
- Groceries
- Transport
- Insurance / health
- Education
- Subscriptions
- Leisure
- Other expenses
- Planned savings

Outputs:
- Total expenses, excluding planned savings
- Planned savings
- Unallocated money = income - expenses - planned savings
- Savings rate = planned savings / income, when income > 0
- Neutral status: surplus, balanced, or deficit

Rules:
- All inputs are monthly amounts.
- Blank inputs are treated as zero.
- Negative values are rejected.
- Planned savings is displayed separately from spending to avoid double counting.

### 3.2 50 / 30 / 20 reference calculator

Input:
- Net monthly income

Outputs:
- Needs: 50%
- Wants: 30%
- Savings / debt reduction: 20%

The UI must state that this is a simple reference framework, not a rule or personalised financial recommendation.

### 3.3 Savings goal calculator

Inputs:
- Savings target
- Amount already saved
- Monthly contribution

Outputs:
- Remaining amount
- Estimated number of months required
- Approximate target date

Rules:
- If the target is already reached, show zero months and a clear completion state.
- If monthly contribution is zero while money remains, explain that no completion date can be calculated.
- No investment return or interest assumptions in V1.

## 4. Persistence and privacy

Data may optionally be stored in `localStorage` on the user's device.

Requirements:
- No backend.
- No analytics requirement for V1.
- No financial values sent to a server.
- A visible privacy note: "Your financial data stays in your browser. Flouze does not send it to a server."
- Provide a "Reset all data" action that clears locally stored calculator values.

## 5. Currency handling

Supported display currencies in V1:
- CHF — default
- EUR
- USD

Currency selection changes formatting only. V1 does not perform foreign-exchange conversion.

## 6. Information architecture and UX

Single-page application with three clearly separated tools.

Recommended page structure:
1. Header / project title
2. Short privacy and educational-use note
3. Tool navigation or segmented controls
4. Active calculator form
5. Results summary card
6. Open-source / contribution link
7. Footer with MIT license link and disclaimer

Design goals:
- Mobile-first responsive layout
- No dense financial dashboard aesthetic
- Plain language over banking jargon
- Results update immediately after valid input
- Strong visual distinction between income, expenses, savings and remaining balance
- Avoid red/green as the only means of communicating status

## 7. Technical architecture

No application framework and no production dependencies.

Proposed structure:

```text
index.html
css/
  style.css
js/
  budget.js
  rule-50-30-20.js
  savings-goal.js
  storage.js
  app.js
tests/
  budget.test.js
  rule-50-30-20.test.js
  savings-goal.test.js
package.json
README.md
```

JavaScript calculation modules should expose pure functions so that business logic can be tested independently from DOM code.

`app.js` owns DOM bindings and rendering. `storage.js` owns optional localStorage read/write/reset behavior.

## 8. Calculation contracts

### Monthly budget

Given:
- `income`
- expense values `e1 ... en`
- `plannedSavings`

Then:
- `totalExpenses = sum(expenses)`
- `unallocated = income - totalExpenses - plannedSavings`
- `savingsRate = income > 0 ? plannedSavings / income : 0`

Status:
- surplus if `unallocated > 0`
- balanced if `unallocated === 0` within normal currency rounding tolerance
- deficit if `unallocated < 0`

### 50 / 30 / 20

Given income `I`:
- needs = `I * 0.50`
- wants = `I * 0.30`
- savings = `I * 0.20`

### Savings goal

Given target `T`, current `C`, contribution `M`:
- remaining = `max(T - C, 0)`
- if remaining = 0, months = 0
- else if M <= 0, months = null
- else months = `ceil(remaining / M)`

Approximate target date is current date plus the calculated number of calendar months.

## 9. Validation

- Accept decimal monetary values.
- Reject negative numbers.
- Do not accept NaN or infinite values.
- Empty fields resolve to zero where appropriate.
- Invalid fields should receive an inline, text-based error.
- Calculators should never crash on zero-income or zero-contribution cases.

## 10. Testing

Use Node's built-in test runner, with no external test framework required.

Minimum coverage by behavior:
- normal monthly budget case
- deficit case
- zero-income case
- invalid negative input handling
- exact 50/30/20 split
- savings goal already reached
- savings goal with zero contribution
- savings goal rounding up partial months

DOM testing is out of scope for V1 unless implementation complexity later requires it.

## 11. Documentation updates

README should include:
- What the calculators do
- Privacy model
- Local run instructions
- Test command
- Link to flouze.ch
- Contribution guide link
- Disclaimer that the tools are educational and do not constitute financial advice

## 12. Accessibility baseline

V1 should include:
- Semantic headings
- Explicit form labels
- Keyboard-operable controls
- Visible focus states
- Result changes understandable without colour alone
- Accessible status text
- Sufficient contrast
- Responsive zoom/text behavior

Formal WCAG conformance should not be claimed unless separately audited.

## 13. Out of scope for V1

- User accounts
- Cloud sync
- Bank account connections
- Open banking
- Investment projections
- Interest or return modelling
- Debt amortisation
- Loan affordability
- Credit scoring
- Personalised financial advice
- Foreign-exchange conversion
- Server-side storage
- React, Vue, Svelte or another frontend framework

## 14. Possible later tools

Potential follow-ons after V1 is stable:
- Subscription annual-cost calculator
- Emergency-fund target calculator
- Rent-to-income calculator
- Student cost-of-living planner
- Semester / annual budget converter

Each should be added only when it has a clear user need and remains understandable as a standalone open-source contribution.

## 15. Success criteria

V1 is successful when:
- All three calculators work entirely client-side.
- Core formulas are covered by automated tests.
- No user-entered financial data leaves the browser.
- The page is usable on mobile and desktop.
- The project remains easy for a first-time contributor to understand.
- README accurately describes the shipped functionality without overstating project maturity or reach.
