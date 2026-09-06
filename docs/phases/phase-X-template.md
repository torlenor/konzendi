# Phase N — <Title>

[Roadmap](../ROADMAP.md#delivery-phases) · prev: none · next: none

**Depends on:** None, or linked prerequisite phases  
**Effort:** L / M / H  
**Complexity:** L / M / H  
**Readiness:** Discovery required

Replace placeholders and choose one value per field before adding a phase to the roadmap.
Use exactly `Discovery required` or `Implementation-ready`; do not put phase status here.

## Investigation gate

Required while discovery remains; replace with findings and accepted decisions once resolved.

- Questions that must be answered before implementation.
- Evidence to gather, including any bounded experiment and its evaluation criteria.
- Decision to record, who must decide, and which open-question IDs it resolves.

## Outcome and scope

Describe the concrete result and why it matters. State what is excluded.

## Decisions and evidence

Record accepted choices, rationale, alternatives where useful, and relevant evidence.
Separate verified facts from assumptions. Link unresolved decisions to the open-questions file.

## Work packages

For each package, specify affected files or components, behavior, dependencies, and a checkable
completion condition. Include interfaces, data changes, and failure handling where applicable.

- [ ] <Concrete work item and its completion condition>

## Acceptance and verification

- <Observable acceptance criterion and how to check it>

Record commands or manual checks and their actual results when executed. Include relevant
failure cases; do not prefill successful outcomes.

## Rollout and rollback

Describe delivery and recovery steps, including data compatibility where applicable.
If either is inapplicable, state why.
