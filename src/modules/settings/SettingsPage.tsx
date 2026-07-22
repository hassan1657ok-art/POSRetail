import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import type { Business } from '@/types'
import { Download, Loader2 } from 'lucide-react'

export function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', currency: 'PKR', taxRate: '', taxName: 'Tax', receiptFooter: '',
  })
  const addToast = useToastStore(s => s.addToast)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const b = await api.settings.getBusiness()
        setBusiness(b)
        setForm({
          name: b.name, address: b.address || '', phone: b.phone || '', email: b.email || '',
          currency: b.currency, taxRate: String(b.taxRate), taxName: b.taxName, receiptFooter: b.receiptFooter || '',
        })
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load settings')
      } finally { setLoading(false) }
    })()
  }, [])

  const handleSave = async () => {
    const tax = parseFloat(form.taxRate)
    if (isNaN(tax) || tax < 0) { setError('Tax rate must be a valid positive number'); return }
    setSaving(true); setError('')
    try {
      await api.settings.updateBusiness({ ...form, taxRate: tax })
      addToast({ type: 'success', title: 'Settings saved' })
    } catch (e: unknown) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  const handleExport = async () => {
    setExporting(true); setError('')
    try {
      const result = await api.settings.exportDB()
      if (result.success) addToast({ type: 'success', title: 'Database exported' })
      else addToast({ type: 'info', title: 'Export cancelled' })
    } catch (e: unknown) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Export failed' })
    } finally { setExporting(false) }
  }

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-5">Settings</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-800">Business Profile</h3>
        </div>
        <div className="card-body space-y-4">
          <div><label className="label">Business Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
        </div>
      </div>

      <div className="card mt-5">
        <div className="card-header">
          <h3 className="font-semibold text-gray-800">Tax & Currency</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Currency</label><input className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            <div><label className="label">Tax Name</label><input className="input" value={form.taxName} onChange={e => setForm({ ...form, taxName: e.target.value })} /></div>
            <div>
              <label className="label">Tax Rate (%)</label>
              <input type="number" className="input" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} step="0.01" min="0" />
            </div>
          </div>
          <div><label className="label">Receipt Footer</label><textarea className="input" rows={2} value={form.receiptFooter} onChange={e => setForm({ ...form, receiptFooter: e.target.value })} placeholder="Thank you message printed on receipts" /></div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
        </button>
        <button onClick={handleExport} className="btn-secondary" disabled={exporting}>
          {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</> : <><Download className="w-4 h-4" /> Export Database</>}
        </button>
      </div>
    </div>
  )
}
