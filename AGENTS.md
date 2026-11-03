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
- Auth: Lovable Cloud email/password. Signed-in pages live under `src/routes/_authenticated/` (client-only gate). Profiles + customer role are created by the `handle_new_user` DB trigger, which validates signup metadata and generates invite codes server-side. Why: clients can't forge codes or roles.
- Roles live only in `public.user_roles` (no client write policies); admin checks use `has_role()` in RLS. The `/admin` beforeLoad is UI-only. Why: prevents self-promotion.
- Customers may only UPDATE `full_name`/`phone` on profiles (column grants). Why: verification flags, codes and referrals are backend-owned.
- Features without a backend must show the not-live notice; never simulate payments, wallet funding, VTU or OTP success.
