import { useEffect, useMemo, useState } from 'react'
import Chevron from './Chevron'
import { employeeModuleService } from '../services/employeeModuleService'
import type { OrganizationBoard, OrganizationTeam } from '../types/employeeModules'

function matchesTeam(team: OrganizationTeam, query: string) {
  const search = query.trim().toLowerCase()
  return !search || team.name.toLowerCase().includes(search) ||
    team.people.some((person) => `${person.name} ${person.title}`.toLowerCase().includes(search))
}

export default function OrganizationBoardPage() {
  const [board, setBoard] = useState<OrganizationBoard | null>(null)
  const [search, setSearch] = useState('')
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    employeeModuleService.organization()
      .then((result) => {
        setBoard(result)
        setExpandedTeams(new Set(result.teams.map((team) => team.name)))
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load the organization board.'))
  }, [])

  const leadership = useMemo(() => board?.leadership.filter((person) =>
    `${person.name} ${person.title}`.toLowerCase().includes(search.toLowerCase()),
  ) ?? [], [board, search])
  const teams = useMemo(() => board?.teams.filter((team) => matchesTeam(team, search)) ?? [], [board, search])

  function toggleTeam(name: string) {
    setExpandedTeams((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <section className="employee-module-section" aria-labelledby="organization-title">
      <div className="employee-module-heading">
        <div>
          <p>PEOPLE AND TEAMS</p>
          <h1 id="organization-title">Organization Board</h1>
        </div>
        <label className="employee-filter">
          <span className="sr-only">Search organization board</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people or roles" />
        </label>
      </div>
      <p className="organization-note">
        Displayed titles and team groupings are based only on supplied company information. Reporting lines not specified in that information are not inferred.
      </p>
      {error && <p className="employee-error" role="alert">{error}</p>}
      {!board && !error && <p className="employee-loading">Loading organization board…</p>}
      {board && (
        <>
          <section className="organization-leadership" aria-label="Leadership">
            <h2>Leadership</h2>
            <div className="organization-people organization-people--leadership">
              {leadership.map((person) => (
                <article className="organization-person organization-person--leader" key={person.name}>
                  <span className="organization-person__initial" aria-hidden="true">{person.name.charAt(0)}</span>
                  <div><h3>{person.name}</h3><p>{person.title}</p></div>
                </article>
              ))}
            </div>
            {leadership.length === 0 && <p className="employee-empty">No leadership entries match this search.</p>}
          </section>

          <section className="organization-teams" aria-label="Departments and teams">
            <div className="organization-teams__heading">
              <h2>Departments and teams</h2>
              <div>
                <button type="button" onClick={() => setExpandedTeams(new Set(teams.map((team) => team.name)))}>Expand all</button>
                <button type="button" onClick={() => setExpandedTeams(new Set())}>Collapse all</button>
              </div>
            </div>
            {teams.map((team) => {
              const isExpanded = expandedTeams.has(team.name)
              const people = team.people.filter((person) =>
                !search || team.name.toLowerCase().includes(search.toLowerCase()) ||
                `${person.name} ${person.title}`.toLowerCase().includes(search.toLowerCase()),
              )
              return (
                <article className="organization-team" key={team.name}>
                  <button
                    className="organization-team__toggle"
                    type="button"
                    onClick={() => toggleTeam(team.name)}
                    aria-expanded={isExpanded}
                  >
                    <span>{team.name}</span>
                    <small>{people.length} {people.length === 1 ? 'person' : 'people'}</small>
                    <Chevron className={`organization-team__chevron${isExpanded ? ' is-expanded' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="organization-people">
                      {people.map((person) => (
                        <article className="organization-person" key={`${team.name}-${person.name}`}>
                          <span className="organization-person__initial" aria-hidden="true">{person.name.charAt(0)}</span>
                          <div><h3>{person.name}</h3><p>{person.title}</p></div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
            {teams.length === 0 && <p className="employee-empty">No teams match this search.</p>}
          </section>
        </>
      )}
    </section>
  )
}
