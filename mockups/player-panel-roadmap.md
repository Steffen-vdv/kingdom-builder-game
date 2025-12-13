# PlayerPanel Redesign - Implementation Roadmap

## Iteration 1 (Completed)

### Data Model Changes

- Added `section: 'economy' | 'combat'` field to resource definitions
- Added `secondary: boolean` field for smaller display styling
- Added `trackValueBreakdown: boolean` for source breakdown in tooltips
- Fields flow from contents -> engine -> protocol -> web

### UI Changes

- Dual-column layout: Economy | Combat
- Secondary resources (Absorption, Growth, War Weariness) render with reduced styling
- TierThermometer displays inline for tiered resources (Happiness)
- Resource groups (Population) display in economy column

### Technical Notes

- Web layer trusts protocol contracts - no defensive fallbacks for required fields
- Resource grouping uses `section` field instead of categories for display
- `compact` prop added to ResourceButton for secondary resource styling

---

## Future Iterations

### Iteration 2: Responsive Breakpoints

- [ ] Add mobile breakpoint that stacks columns vertically
- [ ] Consider collapsible column headers on small screens
- [ ] Touch-friendly hover card interaction

### Iteration 3: Value Breakdown Tooltips

- [ ] Implement source breakdown display in resource hover cards
- [ ] Show contribution sources (buildings, developments, passives)
- [ ] Format breakdown as bulleted list with icons

### Iteration 4: Forecast Visualization

- [ ] Inline forecast delta badges (currently implemented)
- [ ] Consider trend indicators/sparklines for multi-turn forecasts
- [ ] Forecast breakdown showing sources of change

### Iteration 5: Animation & Polish

- [ ] Value change animations (pulse/flash on delta)
- [ ] Column reorder animation when resources move
- [ ] Smooth transitions for tier thermometer changes

### Deferred Features (Discuss Before Implementing)

- Resource grouping by tags (alternative to section)
- Custom column ordering via drag-and-drop
- User preference for collapsed/expanded column state
- Resource filtering/search in expanded view

---

## Design Decisions Log

### Why dual-column over tabs?

- Tabs hide information; dual-column shows everything at a glance
- Combat stats are contextually relevant during action phase
- Screen real estate is sufficient on desktop targets

### Why `section` field instead of reusing categories?

- Categories are for hover card grouping, sections are for layout
- Decoupled concerns allow different UI treatments
- Section is simpler (just 2 values) vs category complexity

### Why hardcode "Economy"/"Combat" labels?

- These are structural UI labels, not game content
- Derived directly from the section enum values
- If i18n needed later, can extract to translation system
