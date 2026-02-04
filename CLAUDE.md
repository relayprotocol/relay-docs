# Documentation Writing Standards

This document outlines the standards and best practices for writing documentation in this repository.

## Purpose

This guide ensures consistency, clarity, and quality across all documentation.

---

## Code Snippets

### Language Defaults

- Code snippets should always by default be in Typescript or JavaScript

### Tabs Usage

- Avoid using multiple tabs for code snippets unless it's for showing isolated scenarios/examples

### Length Management

- If a code snippet is longer than 35 lines, add expandable to it

### TypeScript Guidelines

- For TypeScript code snippets, assume that types exist
- Prefer not to write whole types out

## Writing Style & Tone

- Use active voice ("Relay bridges assets" not "Assets are bridged")
- Use imperative for instructions ("Get a quote", "Execute the bridge")
- Keep paragraphs short (2-3 sentences max)

## Heading Hierarchy

- No H1 in body content (frontmatter title serves as H1)
- Use H2 (`##`) for primary sections
- Use H3 (`###`) for subsections
- Avoid going deeper than H3; use bold text for further details

## Callouts & Emphasis

### Callout Components

- Use `<Tip>` for helpful hints and best practices
- Use `<Warning>` for critical warnings
- Use `<Info>` for additional context

### Text Emphasis

- Use **bold** for parameter names, values, and UI elements
- Use `backticks` for code values, endpoints, addresses
- Avoid italics (prefer bold)

## Tables

### Parameter Tables

- Format parameter names as **`parameterName`**
- Keep descriptions concise in table cells
- Add introductory sentence before tables
- Only include Required column (✅/❌) if there are mixed required and optional params
- Note the relevant params and link to the full API reference if available for additional unrelated params
