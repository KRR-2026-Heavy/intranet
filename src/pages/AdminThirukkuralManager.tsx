import { useEffect, useState } from 'react'
import { getAdminThirukkuralCollection, publishAdminThirukkuralCollection } from '../services/adminService'
import type { AdminThirukkuralCollection, ThirukkuralCouplet } from '../types/thirukkural'

const emptyCouplets = Array.from({ length: 10 }, (_, index) => ({
  kuralNumber: index + 1,
  line1: '',
  line2: '',
}))

function localDate(value: string | null) {
  if (!value) return 'Not published'
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminThirukkuralManager() {
  const [collection, setCollection] = useState<AdminThirukkuralCollection | null>(null)
  const [couplets, setCouplets] = useState<ThirukkuralCouplet[]>(emptyCouplets)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAdminThirukkuralCollection()
      .then((result) => {
        if (!active) return
        setCollection(result)
        if (result.published && result.couplets.length === 10) {
          setCouplets(result.couplets)
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the collection.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function updateCouplet(index: number, line: 'line1' | 'line2', text: string) {
    setCouplets((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, [line]: text } : value))
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (couplets.some((couplet) => !couplet.line1.trim() || !couplet.line2.trim())) {
      setError('Enter both Tamil lines for all 10 Kurals before publishing.')
      return
    }
    setSaving(true)
    try {
      const result = await publishAdminThirukkuralCollection(couplets)
      setCollection(result)
      setSuccess('All 10 Kurals are published. Kural 1 is shown from today; the displayed Kural changes at midnight IST each day.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The couplets could not be published.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-thirukkural" aria-labelledby="admin-thirukkural-title">
      <div className="admin-thirukkural__intro">
        <div>
          <h2 id="admin-thirukkural-title">Thirukkural Collection</h2>
          <p>Enter the 10 couplets in the order employees should see them. Publishing replaces the active collection and restarts at couplet 1.</p>
        </div>
        <div className="admin-thirukkural__schedule" aria-live="polite">
          <span>{collection?.published ? `Today: Kural ${collection.currentKuralNumber} / 10` : 'No collection published'}</span>
          <small>Start date: {localDate(collection?.startDate ?? null)} (IST)</small>
        </div>
      </div>
      {loading && <p className="admin-state" role="status">Loading saved couplets…</p>}
      {collection && !collection.storageConfigured && <p className="admin-state" role="status">SQL Server storage is not configured.</p>}
      {collection?.storageConfigured && !collection.schemaReady && <p className="admin-state" role="status">Thirukkural database tables are not provisioned yet. Publishing is unavailable until the database setup is completed.</p>}
      {error && <p className="admin-state admin-state--error" role="alert">{error}</p>}
      {success && <p className="admin-state admin-state--success" role="status">{success}</p>}
      <form className="admin-thirukkural__form" onSubmit={publish}>
        {couplets.map((couplet, index) => (
          <fieldset className="admin-thirukkural__field" key={index}>
            <legend>Kural {index + 1}</legend>
            <textarea
              aria-label={`Kural ${index + 1}, first line`}
              value={couplet.line1}
              onChange={(event) => updateCouplet(index, 'line1', event.target.value)}
              rows={2}
              dir="auto"
              lang="ta"
              placeholder="First Tamil line"
              required
            />
            <textarea
              aria-label={`Kural ${index + 1}, second line`}
              value={couplet.line2}
              onChange={(event) => updateCouplet(index, 'line2', event.target.value)}
              rows={2}
              dir="auto"
              lang="ta"
              placeholder="Second Tamil line"
              required
            />
          </fieldset>
        ))}
        <button type="submit" disabled={loading || saving || collection?.storageConfigured === false || collection?.schemaReady === false}>
          {saving ? 'Publishing…' : 'Publish all 10 couplets'}
        </button>
      </form>
    </section>
  )
}
