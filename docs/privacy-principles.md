# Privacy Principles

Flouze is a budgeting and personal finance tool for students. Financial data
is among the most sensitive information a person has, so privacy is a design
input for every feature — not something we bolt on afterwards.

This document is **guidance for development**. It describes the principles we
aim to build by; it is not a legal privacy policy and it is not legal advice.
It also does not describe the current technical implementation: a principle
listed here is a goal to design towards, and contributors should not treat it
as a claim that a feature already works a particular way.

## Principles

### 1. Collect only what is necessary
Every piece of data we ask for should have a clear purpose in the product. If
a feature can work without a data point, we do not collect that data point.

### 2. Be transparent about what is stored
Users should be able to find out, in plain language, what data Flouze stores,
where it is stored, and why. No hidden collection and no surprises.

### 3. Never sell personal data
Personal and financial data is not a product. We do not sell it, and we do
not share it with third parties for their own marketing purposes.

### 4. Give users control over their data
Users should be able to see, correct, export, and delete their own data.
Deleting an account should mean the associated personal data is removed, not
just hidden.

### 5. Prefer secure defaults
Privacy- and security-protective settings should be the default. Users should
not have to find an opt-out to be protected, and sharing or integrations
should be opt-in.

### 6. Keep sensitive data out of logs and analytics
Account numbers, balances, transaction details, and similar sensitive
financial information must not end up in application logs, error reports, or
analytics events. Debug tooling is not an excuse to leak user data.

### 7. Share the minimum, on purpose
When a feature genuinely needs a third-party service, send only the data that
feature needs, and be able to explain to the user what is sent and why.

## How to use these principles

- When designing or reviewing a feature, check it against each principle
  above and call out conflicts in the pull request or issue discussion.
- When two principles seem to pull in different directions, prefer the option
  that collects less data and gives the user more control, and document the
  trade-off.
- If a change would weaken one of these principles, that is a project-level
  decision: raise it in an issue before implementing it.
