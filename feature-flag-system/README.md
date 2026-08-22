# Feature Flag System

This is a feature flag system built from scratch, in the spirit of tools like LaunchDarkly. It lets a team turn features on and off without redeploying code, roll a feature out to a percentage of users consistently, target specific beta users, keep staging and production configuration separate, and kill a misbehaving feature instantly if it starts causing trouble.

It's made up of three pieces that live in this repo:

```
feature-flag-system/
├── backend/     -> the flag service (Express + PostgreSQL + Drizzle)
├── frontend/    -> the React admin UI
├── sdk/         -> the client library other apps import
└── README.md    -> you are here
```

## What This System Does

The whole point of a feature flag system is to separate "deploying code" from "releasing a feature." Without one, the moment your new checkout flow merges, it's live for everyone and if it breaks, your only fix is another deploy. With this system:

- A flag can be switched on/off globally
- It can be rolled out to a percentage of users, and the same user always gets the same answer (no coin-flipping on every request)
- Specific users can be targeted directly (the "give this to 5 beta customers" case)
- Staging and production can have completely different configurations for the same flag
- Every single change is recorded who did it, what it was before, what it became
- If something in production is actively corrupting data, there's a kill switch that overrides everything else immediately

Applications don't talk to the REST API directly they use the SDK, which wraps evaluation behind one simple call and never throws into the host app even if the service is down.

## Setup & Configuration

Nothing here is hardcoded. You need a `.env` file in `backend/`:

```
PORT=3000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/feature_flag_system
ENVIRONMENTS=staging,production
```

And a `.env` in `frontend/`:

```
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENTS=staging,production
```

Both the backend's environment set and the frontend's environment list read from these values I proved this by temporarily adding a third environment (`development`) to the frontend `.env` and watching it show up in the admin UI with zero code changes.

## Running the Service

```bash
cd backend
npm install
npm run db:generate   # generates the drizzle migration from the schema
npm run db:migrate    # applies it to postgres
npm run dev           # starts on the configured PORT (defaults to 3000)
```

For a production-style run:

```bash
npm run build
npm run start
```

The service is a normal Express app underneath routes, controllers, services and repositories are all separated, so evaluation logic never lives inside a route handler and the data layer never leaks into the controllers.

## Running the Admin UI

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173`. It talks to whatever `VITE_API_URL` points at no mocked data anywhere, every screen is a real fetch against the running backend.

## Running Tests

Backend:

```bash
cd backend
npm run test
```

SDK:

```bash
cd sdk
npm run test
```

Both run through Vitest. The backend suite is the heavier one it hits an actual Postgres instance, so make sure your `DATABASE_URL` is pointed at a database you don't mind filling up with test flags (mine currently has a few thousand from a sprint's worth of test runs).

## The Flag Model & Environments

A flag has:

- `key` unique, e.g. `new-checkout`
- `description` human-readable
- `killSwitch` global override, off by default
- created/updated timestamps

Everything that actually decides behavior enabled state, rollout percentage, targeting list lives per **environment**, not on the flag itself. So the same flag key can be:

```
new-checkout
  staging:    enabled=true,  rollout=100%
  production: enabled=false, rollout=0%
```

and flipping staging never touches production. I proved this with a dedicated independence test change one environment, assert the other is untouched.

The environment set itself isn't hardcoded it comes from `ENVIRONMENTS` in the backend `.env` and `VITE_ENVIRONMENTS` in the frontend one. At minimum you'll have `staging` and `production`, but the system doesn't care how many you add.

## Evaluating a Flag

```
GET /evaluate?flag=new-checkout&user=user123&environment=production
```

Response:

```json
{
  "flag": "new-checkout",
  "user": "user123",
  "environment": "production",
  "enabled": true,
  "reason": "ROLLOUT_ENABLED"
}
```

Every evaluation names the flag, the user, the environment, the decision, and critically the **reason** the decision came out that way. Possible reasons: `KILL_SWITCH_ENGAGED`, `FLAG_DISABLED`, `FLAG_NOT_FOUND`, `TARGETED_USER`, `ROLLOUT_ENABLED`, `ROLLOUT_DISABLED`, `FLAG_ENABLED` (the plain on-with-no-rules case). Evaluating a flag that doesn't exist never crashes it just comes back `enabled: false, reason: "FLAG_NOT_FOUND"`.

## The Evaluation Order

This is the part of the sprint I spent the most time getting right, because getting the order wrong quietly breaks everything downstream. The precedence, from first-checked to last:

```
1. Kill switch engaged?          -> OFF, no matter what else is configured
2. Flag OFF in this environment? -> OFF, targeting and rollout are never even consulted
3. Is the user targeted?         -> ON
4. Is a rollout % configured?    -> the hash decides
5. Nothing else applies          -> ON (plain enabled, no rules)
```

The kill switch sits above everything, including explicit targeting, because the whole point of it is a 2am "stop the bleeding" switch if a targeted beta user could still see a killed feature, the switch wouldn't actually be a kill switch. Below that, an OFF flag beats targeting beats rollout, which is what "off means off" actually requires otherwise you'd have a targeted user seeing a feature that's supposedly disabled in that environment, and that's the kind of thing that turns into a very confusing support ticket.

This order is enforced in `evaluation.service.ts` and is exactly what the test suite in `tests/evaluation.consistency.test.ts` and `tests/flag.service.test.ts` walks through case by case.

## Percentage Rollouts & The Hash Strategy

The naive way to do a percentage rollout is `Math.random() < 0.2`. I didn't do that, because it fails the most basic requirement of a rollout: the same user has to get the same answer every single time, including after the service restarts. Random numbers don't remember anything between requests.

Instead, every evaluation computes a deterministic bucket:

```
bucket = hash(userId + ":" + flagKey) % 100
enabled = bucket < rolloutPercentage
```

Two things matter here:

**Nothing is stored per user.** There's no table of "user123 got new-checkout." The bucket is recomputed fresh on every evaluation from the hash that's what makes it consistent across restarts without a database write for every rollout decision.

**The flag key has to be part of the hash input, not just the user ID.** If I only hashed the user ID, `user123`'s bucket would be identical for `new-checkout`, `dark-mode`, and every other flag in the system meaning the "lucky" 20% of users would end up in the rollout for basically everything, and everyone else would be excluded from everything. Hashing `userId + flagKey` together gives each user an independent, unrelated bucket per flag.

This also explains why raising a rollout from 20% to 30% only ever *adds* users and never removes anyone: a user's bucket doesn't move when you change the percentage, only the threshold you're comparing it against moves. If your bucket was 15, you were in at 20% and you're still in at 30% nothing about your bucket changed.

I tested this with a 1,000-user simulated population at 20%, then bumped it to 30% and asserted every previously-enabled user was still enabled. I also tested that 0% enables literally nobody and 100% enables everyone, and that two flags at the same percentage select different, unrelated sets of users.

## User Targeting

```
POST   /flags/:key/targeting/:userId     -> add a user
DELETE /flags/:key/targeting/:userId     -> remove a user
GET    /flags/:key/targeting             -> list targeted users
```

A targeted user gets `ON` whenever the flag is enabled in that environment, completely independent of whatever the rollout percentage says that's the whole point of targeting, it's for the "these five specific customers, nobody else" case. Removing a user takes effect immediately on the next evaluation, no restart needed. All of these routes require an actor header (see below) and reject the request with `ACTOR_ID_REQUIRED` if it's missing.

## Flag History

Every mutation creating a flag, flipping it on/off, changing the rollout percentage, adding/removing a targeted user, engaging or releasing the kill switch writes a history entry. Nothing gets updated or deleted from that table, ever; it's append-only by design, not just by convention.

```
GET /flags/:key/history
```

```json
[
  {
    "actor": "dorah",
    "action": "ROLLOUT_CHANGED",
    "environment": "production",
    "before": { "rolloutPercentage": 20 },
    "after": { "rolloutPercentage": 30 },
    "createdAt": "2026-08-16T14:02:11.000Z"
  }
]
```

So the question "who changed the rollout percentage in production, and what was it before" has one answer, straight from this table, sorted chronologically no digging through logs.

Because every mutation requires an `X-Actor-Id` header, there's no such thing as an anonymous change in this system. It's not authentication  but every write is attributable.

## Using the SDK

Other services don't hit the REST API by hand they import the SDK:

```ts
import { FeatureFlagSDK } from "feature-flag-sdk";

const flags = new FeatureFlagSDK({
  serviceUrl: "http://localhost:3000",
  environment: "production",
});

const canSeeNewCheckout = await flags.isEnabled("new-checkout", "user123");
```

`isEnabled` returns the service's decision as a plain boolean. If the flag service is unreachable, or the flag doesn't exist, it does **not** throw into whatever application imported it that would mean one flag outage taking down an unrelated app. Instead it returns a safe default: `false` unless the caller supplies their own fallback:

```ts
const canSeeNewCheckout = await flags.isEnabled("new-checkout", "user123", {
  fallback: true,
});
```

This is tested for both the happy path and the unreachable-service case in `sdk/tests/sdk.test.ts`.

## The Kill Switch

This was the mid-sprint injection. The scenario: a rolled-out feature starts corrupting data, right now, and it's live in two environments, hitting a chunk of the rollout bucket plus five explicitly targeted beta customers. Turning it off environment-by-environment and rule-by-rule is too slow for 2am.

```
POST /flags/:key/kill-switch/engage
POST /flags/:key/kill-switch/release
```

Engaging it forces the flag `OFF` for every user in every environment, overriding the enabled state, targeting, and rollout percentage nothing else in the evaluation chain even gets consulted once the kill switch is on. It takes effect immediately, no restart, and it's the first thing checked in the evaluation order for exactly that reason.

Importantly, it's an override, not an edit. Engaging it doesn't touch the flag's actual configuration the enabled state, rollout percentage, and targeting list are untouched underneath it. Releasing the switch restores exactly what was there before, because nothing was ever changed, just silenced. Both engaging and releasing require an actor and get written to history as `KILL_SWITCH_ENGAGED` / `KILL_SWITCH_RELEASED`, and while it's engaged, the evaluation reason names the kill switch as the deciding rule.

Why override targeting too, and not just the rollout? Because if a targeted beta user could still see a "killed" feature, the switch would be lying about what it does. At 2am, when someone hits the kill switch, they need to trust that it means *everyone, no exceptions* not "everyone except the five people we specifically added earlier."

## Known Limitations

- No authentication is built in identity is supplied via the `X-Actor-Id` header and trusted as-is. Verifying that identity is genuinely who they say they are is outside this sprint's scope.
- The frontend doesn't have its own automated test suite yet the `frontend/package.json` doesn't define a `test` script. All the frontend's correctness is currently proven manually against the real backend plus the backend's own test coverage.
- The consistency tests use a 1,000-user simulated population with a stated tolerance rather than checking an exact percentage, since hashing 1,000 arbitrary user IDs will never land on *exactly* 20.00% that would make the test flaky by design.
- History entries record the flag-level and environment-level state at the time of the change but don't currently version the flag's `description` field only the operational fields (enabled, rollout, targeting, kill switch) get tracked.

That's the whole system. If you're picking this up cold: start by reading `evaluation.service.ts` everything else in the backend exists to feed that one function the right inputs.