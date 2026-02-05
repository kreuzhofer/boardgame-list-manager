# Product Vision

## Summary
Build a universal, event‑centric board game management app that starts as a one‑event tool and evolves into a full event platform. Organizers can create multiple events. Participants only need a simple event link and a single event password, with a seamless migration from the current single‑event setup.

## Problem
Board game events are hard to run smoothly without a shared, low‑friction system for collecting games, coordinating interest, and giving attendees a clear overview. Existing solutions are either too heavy or too manual for volunteer‑run events.

## Vision
Make it effortless to run board game events of any size by providing an event hub that feels lightweight for attendees and powerful for organizers, while preserving the fun, social nature of the event.

## Target Users
Organizers who host recurring board game events.
Attendees who want to bring games and mark interest without managing accounts.

## Product Model
Events are the parent entity for all data that is currently global.
Accounts can own and manage multiple events.
Participants access events via a link and a single event password, without individual accounts.

## Transition Strategy (Current Event Migration)
Create a default account and a default event on upgrade.
Use the current `.env` event name for the default event.
Attach all existing games, users, and event‑level data to the default event.
Ensure existing users experience no change in access or workflow.

## Event Data (Future Scope)
Event metadata includes date range, location, capacity, and organizer notes.
Optional details include fares, entry rules, and additional resources.

## Principles
Zero‑friction for attendees.
Minimal organizer overhead.
Data should serve the event, not distract from it.
Backward‑compatible migrations with no perceived interruption.

## Success Metrics
Number of events created per organizer.
Recurring event retention.
Time from event creation to first game added.
Attendee participation rate (players and bringers).

## Non‑Goals (Near Term)
Individual attendee accounts and passwords.
Ticketing or payment processing.
Complex scheduling or tournament brackets.

## Major Milestones (Draft)
1. Event‑centric data model and migration from single‑event setup.
2. Organizer multi‑event dashboard and event settings (time, location, capacity).
3. Event‑level analytics and print outputs.
4. Expansion toward full event management tooling.

## Risks and Assumptions
Assumption: attendees prefer a shared event password over individual accounts.
Risk: event migration must be silent and stable to avoid disruption.
Risk: expanding scope could reduce the “lightweight” feel for attendees.

## Open Questions
How should default accounts be provisioned and managed?
What organizer permissions are needed beyond account owner?
When should individual attendee accounts become necessary?

