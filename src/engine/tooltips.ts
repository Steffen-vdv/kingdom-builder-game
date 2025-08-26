export const TOOLTIPS = {
  gold: "\uD83E\uDE99 Gold — money; cannot go negative.",
  income: "\uD83D\uDCC9 Income — any effect that produces \uD83E\uDE99 Gold (e.g., \uD83C\uDF3E Farm, \uD83C\uDF31 Garden, Temple, Overwork, Tax, Plunder).",
  land: "\uD83C\uDF0E Land — territory; each Land starts with 1 \uD83E\uDDE9 Development Slot.",
  developmentSlot: "\uD83E\uDDE9 Development Slot — capacity on a Land for one \uD83C\uDFDA\uFE0F Development.",
  development: "\uD83C\uDFDA\uFE0F Development — a built feature occupying a Development Slot.",
  population: "\uD83D\uDC65 Population — citizens (roles below).",
  council: "\u2696\uFE0F Council — each grants 1 \u26A1\uFE0F Action Point at the start of your turn.",
  commander: "\uD83C\uDF96\uFE0F Army Commander — +1 \uD83D\uDEE1\uFE0F Army Strength (flat) and +25% \uD83D\uDCC8\uD83D\uDEE1\uFE0F Growth each Development Phase.",
  fortifier: "\uD83E\uDDF1 Fortifier — +1 \uD83D\uDEE1\uFE0F Fortification Strength (flat) and +25% \uD83D\uDCC8\uD83D\uDEE1\uFE0F Growth each Development Phase.",
  citizen: "\uD83D\uDC64 Citizen — unassigned; no benefits until assigned (upkeep 0 \uD83E\uDE99).",
  actionPoint: "\u26A1\uFE0F Action Point (AP) — each Action costs 1\u26A1\uFE0F unless stated otherwise.",
  armyStrength: "\uD83D\uDEE1\uFE0F Army Strength — total offensive strength.",
  fortStrength: "\uD83D\uDEE1\uFE0F Fortification Strength — total defensive strength.",
  armyGrowth: "\uD83D\uDCC8\uD83D\uDEE1\uFE0F Growth — percentage increase applied during Development.",
  fortGrowth: "\uD83D\uDCC8\uD83D\uDEE1\uFE0F Growth — percentage increase applied during Development.",
  happiness: "\uD83D\uDE0A Happiness — morale (\u201310 … +10).",
  castleHP: "\uD83C\uDFF0 Castle HP — starts at 10.",
  till: "\uD83E\uDDD3\u200D\u2642\uFE0F Till — add +1 Development Slot to a Land (max 2 \uD83E\uDDE9).",
};

export type TooltipKey = keyof typeof TOOLTIPS;
