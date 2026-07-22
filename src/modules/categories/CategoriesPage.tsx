import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToastStore } from '@/stores/toast.store'
import type { Category } from '@/types'
import { DataTable } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const load = async () => {
    setLoading(true); setError(null)
    try { setCategories(await api.categories.getAll()) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load categories') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setName(''); setSlug(''); setModalOpen(true) }
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setSlug(c.slug); setModalOpen(true) }

  const handleSave = async () => {
    const trimmed = name.trim()
    const slugTrimmed = slug.trim()
    if (!trimmed || !slugTrimmed) return
    setSaving(true)
    try {
      if (editing) {
        await api.categories.update(editing.id, { name: trimmed, slug: slugTrimmed })
        addToast({ type: 'success', title: 'Category updated' })
      } else {
        await api.categories.create({ name: trimmed, slug: slugTrimmed })
        addToast({ type: 'success', title: 'Category created' })
      }
      setModalOpen(false); load()
    } catch (e: unknown) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await api.categories.delete(deleteTarget.id)
      addToast({ type: 'success', title: 'Category deleted' })
      setDeleteTarget(null); load()
    } catch (e: unknown) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Delete failed' })
    } finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800">Categories</h2>
        <button onClick={openAdd} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Category</button>
      </div>

      <DataTable
        loading={loading}
        error={error}
        onRetry={load}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          { key: 'productCount', header: 'Products', render: (c: Category) => c._count?.products ?? 0 },
          { key: 'isActive', header: 'Status', render: (c: Category) => c.isActive ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span> },
          {
            key: 'actions', header: 'Actions',
            render: (c: Category) => (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openEdit(c) }} className="btn-ghost btn-sm p-1.5 text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }} className="btn-ghost btn-sm p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            ),
          },
        ]}
        data={categories}
        emptyMessage="No categories found. Add one to get started."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={e => { setName(e.target.value); if (!editing) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) }} placeholder="Beverages" />
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))} placeholder="beverages" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary btn-sm" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary btn-sm" disabled={saving || !name.trim() || !slug.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Products in this category will become uncategorized.`}
        confirmLabel={deletingId ? 'Deleting...' : 'Delete'}
        danger
      />
    </div>
  )
}
