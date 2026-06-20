# Skill Observation Log

**Status key:** OPEN = not yet actioned | ACTIONED = skill updated/created | DECLINED = user decided not to pursue

---

### Observation 1: Defense-in-depth gap worth a checklist item — admin-controlled URLs still need scheme validation

**Date:** 2026-06-20
**Session context:** Security review of FamilyPlay PRs #154-167 (AI handoff, sponsors, entitlements, data layer)
**Skill:** New skill candidate: security-review-web (or extend existing review skill)
**Type:** open-source
**Phase/Area:** XSS / link-injection checks

**Issue:** sponsor_cards.cta_url is rendered into an <a href>. RLS blocks public writes (admin/service-role only), and React escapes attribute values, so no stored-XSS from end users. But a 'javascript:'/'data:' scheme in an href is still click-to-execute if an admin account is compromised or content pipeline is sloppy. The review correctly rated this low because the write path is privileged, but the pattern (rendering a stored URL without an http/https allowlist) recurs across apps and deserves a standing checklist item.

**Suggested improvement:** Add to the web security-review checklist: "Any stored/remote URL rendered into href/src must be scheme-validated (allow only http/https) at render or write time, even when the write path is privileged — treat it as defense-in-depth, not a primary control."

**Principle:** Privileged-only write paths reduce likelihood but not impact of link-injection; cheap scheme allowlists are worth applying uniformly so a single compromised admin can't pivot to client-side code execution.
