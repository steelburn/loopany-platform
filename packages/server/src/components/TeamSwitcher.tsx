import { useRouter } from '@tanstack/react-router'
import type { TeamsView } from '../types'

/** Sentinel matching auth.ALL_TEAMS — the admin "All teams" aggregate view. */
const ALL_TEAMS = '__all__'

/** Persist the active-team choice as a cookie the server validates in
 *  requestScope, then reload the dashboard data. Client-set is fine: the server
 *  never trusts it blind (membership/admin is re-checked each request). */
function selectTeam(id: string, invalidate: () => void) {
  document.cookie = `loopany.team=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`
  invalidate()
}

/**
 * Header team switcher. Renders only when the user can reach more than one team
 * (a superadmin sees every team; a regular user usually has just their own, so
 * nothing shows). Admins also get an "All teams" aggregate option.
 */
export function TeamSwitcher({ data }: { data?: TeamsView }) {
  const router = useRouter()
  if (!data || data.teams.length <= 1) return null

  return (
    <select
      aria-label="Active team"
      value={data.activeTeamId}
      onChange={(e) => selectTeam(e.target.value, () => void router.invalidate())}
      className="lp-select cursor-pointer rounded-md border border-wire bg-surface py-2 pl-3 font-mono text-[12px] tracking-[0.08em] text-secondary outline-none transition-colors hover:border-display hover:text-display focus:border-display"
    >
      {data.isAdmin && <option value={ALL_TEAMS}>All teams</option>}
      {data.teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}
