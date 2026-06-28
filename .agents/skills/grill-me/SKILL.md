---
name: grill-me
description: Stress-test a plan, design, architecture, implementation approach, API, migration, or product decision by interviewing the user rigorously before work begins. Use when the user asks to be grilled, wants a plan challenged, says "grill me", "stress-test this", "poke holes", "challenge this plan", or asks for a relentless interview about design tradeoffs.
---

# Grill Me

Interrogate the plan until the agent and user share enough understanding to make the next implementation decision confidently.

## Workflow

1. Start by restating the plan or design in one compact sentence and naming the highest-risk unresolved area.
2. Ask exactly one question at a time. Wait for the user's answer before asking the next question.
3. For every question, include your recommended answer and the tradeoff behind it.
4. Walk decision dependencies in order: goal, users, success criteria, constraints, data and contracts, edge cases, rollout, and verification.
5. If a question can be answered by reading the repository, docs, tests, config, schemas, or existing code, inspect those sources first and ask only about the remaining preference or product decision.
6. Press on vague answers. Convert ambiguity into concrete choices, defaults, and acceptance criteria.
7. Stop when the plan is decision-complete enough that an implementer can execute without inventing requirements.

## Question Style

Use direct, specific questions. Prefer "Should X behave as A or B when Y happens? Recommended: A because ..." over broad prompts.

Be persistent, not hostile. Do not ask multiple questions in one turn. Do not produce a final implementation plan unless the user asks for it or the grilling has resolved all material choices.
