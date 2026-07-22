import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import type { Customer } from '@/types'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', address: '', city: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const load = async () => { setLoading(true); setError(null); try { setCustomers(await api.customers.getAll()) } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const doSearch = async () => {
    if (!search.trim()) { load(); return }
    setLoading(true)
    try { setCustomers(await api.customers.search(search.trim())) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Search failed') }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditing(null); setForm({ fullName: '', phone: '', email: '', address: '', city: '', notes: '' }); setModalOpen(true) }
  const openEdit = (c: Customer) => { setEditing(c); setForm({ fullName: c.fullName, phone: c.phone || '', email: c.email || '', address: c.address || '', city: c.city || '', notes: c.notes || '' }); setModalOpen(true) }

  const handleSave = async () => {
    const data = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      notes: form.notes.trim(),
    }
    if (!data.fullName) return
    setSaving(true)
    try {
      if (editing) { await api.customers.update(editing.id, data); addToast({ type: 'success', title: 'Customer updated' }) }
      else { await api.customers.create(data); addToast({ type: 'success', title: 'Customer created' }) }
      setModalOpen(false); load()
    } catch (e: unknown) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try { await api.customers.delete(deleteTarget.id); addToast({ type: 'success', title: 'Customer deleted' }); setDeleteTarget(null); load() }
    catch (e: unknown) { addToast({ type: 'error', title: e instanceof Error ? e.message : 'Delete failed' }) }
    finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Customers</h2>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <input className="input w-48" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
            <button onClick={doSearch} className="btn-secondary btn-sm"><Search className="w-4 h-4" /></button>
          </div>
          <button onClick={openAdd} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Customer</button>
        </div>
      </div>

      <DataTable
        loading={loading} error={error} onRetry={load}
        columns={[
          { key: 'fullName', header: 'Name' },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email' },
          { key: 'city', header: 'City' },
          { key: 'totalSpent', header: 'Total Spent', render: (c: Customer) => <span className="font-medium">{formatCurrency(c.totalSpent)}</span> },
          { key: 'type', header: 'Type', render: (c: Customer) => c.isWalkIn ? <span className="badge-blue">Walk-in</span> : <span className="badge-green">Regular</span> },
          {
            key: 'actions', header: 'Actions',
            render: (c: Customer) => c.isWalkIn ? <span className="text-gray-400 text-xs">—</span> : (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c) }} className="btn-ghost btn-sm p-1.5 text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }} className="btn-ghost btn-sm p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            ),
          },
        ]}
        data={customers.filter(c => !search.trim() || c.fullName.toLowerCase().includes(search.toLowerCase()))}
        emptyMessage="No customers found"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'} size="md">
        <div className="space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div className="hidden"><label className="label">Notes</label></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary btn-sm" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary btn-sm" disabled={saving || !form.fullName.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} title="Delete Customer" message={`Delete "${deleteTarget?.fullName}"? This action cannot be undone.`} confirmLabel={deletingId ? 'Deleting...' : 'Delete'} danger />
    </div>
  )
}
