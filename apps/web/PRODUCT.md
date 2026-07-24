# Product

## Register

product

## Platform

web

## Users

Every account is a single type — **Usuario** — with no docente/estudiante distinction at the account level; anyone can create an activity (becoming its organizer) or join one as a participant. The roles that matter — **organizador**, **co-organizador**, **participante** — are properties of a specific activity, not of the account, so the same person can be an organizer in one activity and a participant in another at the same time.

The primary workflow is not a single session: activities are built for medium/long collaborative work (several weeks to a full semester), comparable to a school course. An organizer's job spans configuring an activity's tracking functions, admitting participants, overseeing team formation, following progress through the development phase, and closing the activity with grading, evaluation, and badges. A participant's job is to work inside a team, report progress, keep an individual log, and take part in evaluations.

A narrowly scoped **Administrador** role exists purely for account management, the public content library, and the global badge catalog — it never touches activities, teams, or evaluations, and is a secondary, ops-facing surface rather than a primary design driver. An unauthenticated **Público** visitor can only reach introductory formative content, registration, and login.

## Product Purpose

Grounded in Johnson & Johnson's (1999) collaborative-learning theory, the platform's central unit is the **actividad colaborativa**: a self-contained instance with an objective, a timeframe, and teams. Rather than offering fixed management modes, the organizer gets direct control over a catalog of tracking functions (team formation, work reports, individual log, grading, self/peer evaluation, team space, badges) — enabling each in the state that fits, which can reproduce self-managed, semi-directed, or fully-directed experiences without those existing as system categories.

Success is the actual practice of the five collaborative-learning aspects (defined responsibility, positive interdependence, individual and group accountability, interaction, and evaluation of group/social skills) over the life of an activity — not raw feature usage.

## Positioning

Configuration over prescription: instead of picking from predefined management modes, the organizer directly configures each tracking function, giving them precise, granular control to shape exactly the collaborative experience a given activity needs.

## Brand Personality

Professional but approachable — trustworthy enough for a teacher to grade through, without institutional stiffness. Closer to **Linear** and **Notion** than a classic administrative system: Linear's typographic restraint and near-monochrome precision (color reserved for status/priority) for dense surfaces like permission tables, participant lists, and activity configuration; Notion's calm, content-first canvas and generous whitespace for forms and text-heavy screens. Khan Academy is a useful reference for keeping individual progress/tracking views (bitácora, seguimiento) neutral and uncluttered. Google Classroom is a reference for organizing activities into navigable groups, not for its softer, more playful palette.

Color and typography stay restrained across the base interface; warmth is reserved specifically for recognition moments — a badge being awarded, an activity closing out. Badges should read as a genuine, earned achievement, never as childish gamification.

## Anti-references

Generic corporate SaaS (blue-gradient dashboards, hero-metric cards, generic icon-grid feature lists). Gamified consumer apps in the Duolingo mold (mascots, loud gamification, confetti-heavy reward moments). Stock photography of people — students, teachers, meeting rooms — anywhere in the UI; prefer abstract shapes, icons, or simple illustration where visual interest is needed.

**Scoped exception:** the public home page hero (`PantallaInicio`, the only unauthenticated entry point) uses one licensed stock illustration of people collaborating, chosen deliberately after comparing a custom abstract illustration against several stock options. This does not extend to any other surface — see DESIGN.md §6 for the attribution requirement it carries.

## Design Principles

Configuration over prescription: there are no fixed modes, so every screen should make the current configuration state legible rather than hiding it behind opinionated presets.

Contextual roles, not account types: organizador/co-organizador/participante belong to an activity, not to a user account — the UI should always make clear which hat someone is wearing in the activity they're currently in.

Density where it earns trust, calm where it doesn't: dense, precise treatment for configuration, permissions, and participant-management surfaces where organizers need control; calm, content-first breathing room for forms and text-heavy screens.

Recognition is earned, not decorated: badge-awarding and activity-closing moments are the only place warmth and color intensity should spike, so that spike stays meaningful.

The client is never the authorization boundary: disabled states and hidden actions communicate what isn't available, but every permission is enforced server-side — the UI must never imply a false sense of security through hiding alone.

## Accessibility & Inclusion

WCAG 2.1 AA baseline. Because organizers rely on this UI for real grading and because badge tier/rank and activity-phase status often carry meaning through color or icon alone, pay particular attention to contrast in dense data views, full keyboard navigation of configuration and permission tables, and screen-reader labeling for status indicators that aren't purely textual.
