# 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** All resource/stat names and starting values defined in this sample config are part of the Content domain and may change without requiring code updates.
- **Tests may not rely on literals.** When verifying behaviour against this config, fetch ids and values from the content registries or mocks so that adjustments here do not break tests unless they reveal unsupported scenarios.

## 0) Icon Legend & Conventions

- 🪙Gold — money; cannot go negative
- 🗺️Land — territory; each Land starts with 1 🧩Development Slot
- 🧩Development Slot — capacity on an 🗺️Land for one 🏚️Development
- 🏚️Development — a built feature occupying a 🧩Development Slot
- 👥Population — citizens (roles below)
  - ⚖️Council — each grants 1 ⚡Action Point at the start of your turn
  - 🎖️Commander — **+1 ⚔️Army Strength (flat)** & contributes +25% 📈⚔️Growth each 📈Growth Phase
  - 🔧Fortifier — **+1 🛡️Fortification Strength (flat)** & contributes +25% 📈🛡️Growth each 📈Growth Phase
  - 👤Citizen — unassigned; no benefits until assigned (upkeep 0🪙)
- ⚡Action Point (AP) — each Action costs 1⚡
- ⚔️Army Strength — total offensive strength
- 🛡️Fortification Strength — total defensive strength
- 📈⚔️/📈🛡️ Growth — % increase applied during 📈Growth
- 😊Happiness — morale (–10 … +10)
- 🏰Castle HP — starts at 10
- 🧑‍🌾Till — add +1 🧩Development Slot to an 🗺️Land (max 2 🧩)
- Absorption - Reduces all _incoming_ damage by a percentage, stackable, rounded down, max 100%. Calculation happens _after_ raw damage modifiers are applied but _before_ actual damage application.

## 1) Game Overview

- Players: 2
- Win conditions
  - **Conquest**: reduce the opponent’s 🏰Castle HP to 0.
  - **Bankruptcy**: opponent cannot pay 🧾Upkeep Phase after Liquidation/Desertion.
  - **Victory Points (VP)** if both castles stand at end (20–24 turns):
    - Castle: 1 VP per 🏰 (max 10)
    - Gold: 1 VP per 6🪙 (max 5)
    - Developments: 1 VP per 2 🏚️ (max 7)
    - Population: 1 VP per 👥 (no limit)
    - Happiness: +1 VP per point above 0 (max +10), –1 per point below 0 (max –5)
    - Buildings: 1 VP per 2 🏛️ (no limit)

## 2) Turn Structure

### 2.1 📈Growth Phase

- **Gain 💹Income**: resolve sources that trigger now (e.g., 🌾, 🌿, Temple).
- **Generate ⚡**: +1⚡ per ⚖️Council; Player B gets +1⚡ in their first 📈Growth only.
- **Grow Strengths**:
  - ⚔️ increases by +25% per 🎖️ (rounded up), applied to current ⚔️ which already includes +1 per 🎖️.
  - 🛡️ increases by +25% per 🔧 (rounded up), applied to current 🛡️ which already includes +1 per 🔧.
  - If a 😊 threshold says no growth, skip both increases.

### 2.2 🧾Upkeep Phase

- Pay: 2🪙/⚖️, 1🪙/🎖️, 1🪙/🔧, 0🪙/👤.
- If short: Liquidation → recheck → Desertion (🎖️→🔧→⚖️; keep ≥1 ⚖️) → Bankruptcy.
- End-of-Upkeep triggers: resolve one at a time; owner chooses order.

### 2.3 🎯Main Phase

- Each Action costs 1⚡ unless stated Free (🪙 cost can still be 0).
- Order: players A→B each turn; actions/effects resolve as written.

## 3) Actions (Council only)

### 3.1 Overwork 🛠️ — Free

- +2🪙 per 🌾; –0.5😊 per 🌾 (rounded up)

### 3.2 🌱Expand — 2🪙

- +1🗺️ (untilled), +1😊

### 3.3 🏗️Develop — 3🪙

- Place on 🗺️ with available 🧩:
  - 🏠House — +1 pop cap
  - 🌾Farm — +2🪙 at 💹
  - 🏹Outpost — +1⚔️, +1🛡️
  - 🗼Watchtower — +2🛡️; **+50% Absorption**; _after an enemy 🗡️Army Attack against you is fully resolved (damage & triggers), remove this 🗼Watchtower (free the 🧩 slot)_

### 3.4 Tax 💰 — Free

- +4🪙 per 👥; –0.5😊 per 👥 (rounded up)

### 3.5 Reallocate 🔄 — 5🪙

- Move 1 👥 between ⚖️/🎖️/🔧 (keep ≥1 ⚖️)
- –1😊
- If assigned to ⚖️: +1⚡ immediately
- If removed from ⚖️: –1⚡ immediately (floor 0 this turn)

### 3.6 Raise Pop 👶 — 5🪙

- Requires free 🏠
- +1 👥, assign immediately
- +1😊
- If assigned to ⚖️: +1⚡ immediately

### 3.7 Royal Decree 📜 — 12🪙

- 🌱Expand → 🧑‍🌾Till → 🏗️Develop (🏠/🌾/🏹/🗼), then –3😊

### 3.8 🗡️Army Attack — Free

- Limit: ≤ number of 🎖️
- Attack Power = current ⚔️
- Apply **Absorption** (see Section 6)
- Damage: reduce 🛡️ first; overflow damages 🏰
- On 🏰 damage: defender –1😊, attacker +1😊, plunder 25% (50% with Raider’s Guild)

### 3.9 Hold Festival 🎉 — 3🪙

- +2😊; you cannot Attack this turn
- Attacks against you: **double attacker’s damage before Absorption**, then apply Absorption (Section 6)

### 3.10 🚜Plow — 6🪙 (requires 🏭Plow Workshop)

- 🌱Expand; 🧑‍🌾Till
- Your next Action this turn costs +2🪙 (token queue)

### 3.11 Build 🏛️ (each at most once)

- **5🪙 — Town Charter**: 🌱Expand costs +2🪙; grants +1 extra 😊
- **7🪙 — Mill**: whenever you gain resources from a 🌾, gain +1 more of that resource
- **8🪙 — Raider’s Guild**: Plunder 50%
- **10🪙 — 🏭Plow Workshop**: gain 🚜Plow
- **10🪙 — Market**: Tax +1🪙/👥
- **12🪙 — Barracks**: each 🎖️ gives **+1 additional** ⚔️; 📈⚔️ +10% per 🎖️
- **12🪙 — Citadel**: +5🛡️; 📈🛡️ +15% per 🔧; +1🏠
- **14🪙 — Castle Walls**: +5🛡️; **Absorption 20%**
- **15🪙 — Castle Gardens**: on build → 🌱×2, 🧑‍🌾×2, 🏗️🌿×2; 🌿: +1🪙 at 💹; end of 🧾Upkeep if 😊<0: +1😊
- **16🪙 — Temple**: whenever 😊 increases, gain +1 extra 😊; +1🏠; +1🪙 at 💹
- **20🪙 — Palace**: end of 🧾Upkeep if 😊≥3: first Action’s 🪙 cost = 0, then –1😊
- **22🪙 — Great Hall**: 🧑‍🌾Till all untilled 🗺️ to 2 slots max

## 4) 😊Happiness — Threshold Effects

- +10 → +50% 💹; Buildings –20% (rounded up); 📈⚔️/📈🛡️ +20%
- +8 → +50% 💹; Buildings –20% (rounded up)
- +5 → +25% 💹; Buildings –20% (rounded up)
- +3 → +25% 💹
- +0 → no effect
- –3 → –25% 💹
- –5 → –25% 💹; no growth this 📈Phase
- –8 → –50% 💹; no growth this 📈Phase
- –10 → –50% 💹; no growth this 📈Phase; half ⚡ from ⚖️ in 🧾Upkeep (rounded down)

## 5) Starting Setup

- 🪙 10; 🗺️ 2 (one has 🌾); 🏰 10 (with +1 🏠)
- 👥 1 (in ⚖️)
- ⚔️ 0; 🛡️ 0
- 😊 0
