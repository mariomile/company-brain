# Frontmatter reference (portable copy)

The brain's own `_system/object-schema.md` is canonical. This copy exists so a skill can reason about a brain that lost or customized its schema. If they differ, the brain wins.

## Universal

`tags` (1 to 4, one `type/*`), optional `confidentiality`, `up`, `related`, `aliases`. Agent-managed files add `created_by`, `last_edited_by`, `last_updated`.

## Governance block

`owner: "[[Person]]"`, `review_due: YYYY-MM-DD`, `last_verified: YYYY-MM-DD` on `type/living`, `playbook`, `policy`, `project`, `goal`, and indices. Cadences: living 90, playbook 180, policy 365, project 14, goal 90, index 30, `NOW.md` 14.

## Per type, the properties that views and checks rely on

| Type | Properties |
|---|---|
| project | `project`, `status`, `started`, `target` + governance |
| decision | `status` (proposed · accepted · superseded · reversed), `decided`, `decider`, `project`, `source`, `supersedes`, `review_due` |
| meeting | `date`, `project`, `attendees`, `source` |
| conversation | `date`, `channel`, `project`, `participants`, `source` |
| document, research | `source`, `author`, `published`, `project` |
| feedback | `date`, `channel`, `customer`, `person`, `product_area`, `sentiment`, `source` |
| person | `role`, `company`, `works_at`, `reports_to`, `manages`, `email`, `linkedin`, `location`, `last_contact`, `owner` |
| company | `industry`, `stage`, `website`, `location`, `owner`, `customer_of`, `partner_of`, `competitor_of`, `backed_by`, `since` |
| goal | `status`, `period` + governance |
| concept | `status` (active · disproven), `source`, `up` |
| automation | `name`, `description`, `when`, `mode`, `scope`, `agent`, `cooldown`, `enabled` |

## Fact lines

`- <fact> [source: <note, URL, "ticket #N" or "chat YYYY-MM-DD">; since: YYYY-MM-DD]` and, when changed, `<new> (since YYYY-MM-DD; before: <old>)`.
