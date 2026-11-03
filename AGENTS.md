<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Customer (`/app/$section`) and admin (`/admin/$section`) pages are driven by `src/config/navigation.ts`; add a section there, then a dedicated route file only when it needs custom UI. Why: one source of truth for nav + pages.
- No real auth/backend yet: all data panels must be clearly labelled as not connected; never simulate successful payments or VTU purchases. Admin must get server-verified role checks (separate roles table) when auth lands.
