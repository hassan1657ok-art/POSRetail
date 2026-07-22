import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import type { Supplier } from '@/types'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const load = async () => { setLoading(true); setError(null); try { setSuppliers(await api.suppliers.getAll()) } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '', isActive: true }); setModalOpen(true) }
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contactPerson: s.contactPerson || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '', isActive: s.isActive }); setModalOpen(true) }

  const handleSave = async () => {
    const data = { name: form.name.trim(), contactPerson: form.contactPerson.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), notes: form.notes.trim(), isActive: form.isActive }
    if (!data.name) return
    setSaving(true)
    try {
      if (editing) { await api.suppliers.update(editing.id, data); addToast({ type: 'success', title: 'Supplier updated' }) }
      else { await api.suppliers.create(data); addToast({ type: 'success', title: 'Supplier created' }) }
      setModalOpen(false); load()
    } catch (e: unknown) { addToast({ type: 'error', title: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try { await api.suppliers.delete(deleteTarget.id); addToast({ type: 'success', title: 'Supplier deleted' }); setDeleteTarget(null); load() }
    catch (e: unknown) { addToast({ type: 'error', title: e instanceof Error ? e.message : 'Delete failed' }) }
    finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800">Suppliers</h2>
        <button onClick={openAdd} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Supplier</button>
      </div>

      <DataTable
        loading={loading} error={error} onRetry={load}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'contactPerson', header: 'Contact' },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email' },
          { key: 'isActive', header: 'Status', render: (s: Supplier) => s.isActive ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span> },
          {
            key: 'actions', header: 'Actions',
            render: (s: Supplier) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(s) }} className="btn-ghost btn-sm p-1.5 text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }} className="btn-ghost btn-sm p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            ),
          },
        ]}
        data={suppliers}
        emptyMessage="No suppliers found"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} size="md">
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {editing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary btn-sm" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary btn-sm" disabled={saving || !form.name.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} title="Delete Supplier" message={`Delete "${deleteTarget?.name}"?`} confirmLabel={deletingId ? 'Deleting...' : 'Delete'} danger />
    </div>
  )
}
