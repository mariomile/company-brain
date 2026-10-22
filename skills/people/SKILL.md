---
name: people
description: "Use for people and organizations: 'who is', 'add to the CRM', a new customer or partner, an interaction to log, a relationship to record. Keeps work contact data only, typed relationships as properties, current truth above and timeline below."
argument-hint: "[name] [person|company]"
---

# People and companies

The CRM holds everyone the company works with: team, customers, prospects, partners, investors, advisors, vendors, competitors. One note per person, one per organization. The relationship is a Tier 2 tag (`crm/*`); the structure of the relationship is typed edges in frontmatter.

Load `company-brain:conventions`. `rule-confidentiality.md` applies: **work contact data only**.

## Create

- `brain new person "Full Name" --company "[[Org]]" --relationship customer` or `brain new company "Org" --owner "[[Account owner]]" --relationship customer`.
- Person: `role`, `company`, `works_at`, `reports_to` (team), `email`, `linkedin`, `location`, `last_contact` and `owner` (external people: who holds the relationship).
- Company: `industry`, `stage` (`prospect · customer · churned · partner · competitor`), `website`, `location`, `owner`, `customer_of` / `partner_of` / `competitor_of` / `backed_by`, `since`.
- Reciprocity, best effort: `reports_to` on the person → `manages` on the manager; `customer_of` on the company → nothing on ours (the "All notes about" base finds it).
- Before creating, search: an alias or a different spelling may already exist. Merge into the existing note, add the alias.

## Update

- `## Now`: who they are for us, what they care about, what is open. Replace lines, dated.
- `## Timeline`: one line per interaction, newest first: date, channel, what happened, link to the minutes or conversation.
- `last_contact` on external people when an interaction is logged.
- Facts learned in passing (a new role, a move): UPDATE with the dated trace.

## Never

- Private phone numbers, home addresses, health, family, financial details, anything beyond work contact data. If you find them, do not propagate; flag to the brain owner.
- Opinions about a person as facts. Write what they said or did, with the source.
- A person tag or a company tag. Entities are links.

## Answer "who is X"

From the note: `## Now`, role and company, the owner of the relationship, the last three Timeline entries, open loops naming them. Then the typed edges (who they report to, who they manage). Say if `last_contact` is older than 90 days for a customer contact.

## Leaving the company

A teammate who leaves: `crm/team` becomes `crm/other` (or `crm/advisor`), `works_at` updated with the dated trace, and **every living document they own gets a new owner** (`company-brain:governance`). `brain stale` will list the documents with the old owner.
