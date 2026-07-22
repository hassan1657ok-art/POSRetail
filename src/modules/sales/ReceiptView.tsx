import { useCartStore } from '@/stores/cart.store'
import { formatCurrency } from '@/lib/utils'

export function ReceiptView() {
  const { lastSale, clearCart } = useCartStore()

  if (!lastSale) return null

  return (
    <div className="card p-6 space-y-4">
      <div className="text-center">
        <h3 className="font-bold text-lg">Sale Complete</h3>
        <p className="text-sm text-gray-500">Invoice: {lastSale.invoiceNo}</p>
      </div>

      <div className="border-t border-b border-gray-200 py-3 space-y-1 text-sm">
        {lastSale.items.map(item => (
          <div key={item.id} className="flex justify-between">
            <span>{item.productName} x{item.quantity}</span>
            <span>{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span><span>{formatCurrency(lastSale.subtotal)}</span>
        </div>
        {lastSale.discountAmt > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount</span><span>-{formatCurrency(lastSale.discountAmt)}</span>
          </div>
        )}
        {lastSale.taxAmt > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Tax ({lastSale.taxRate}%)</span><span>{formatCurrency(lastSale.taxAmt)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t">
          <span>Total</span><span>{formatCurrency(lastSale.grandTotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Paid</span><span>{formatCurrency(lastSale.totalPaid)}</span>
        </div>
        {lastSale.change > 0 && (
          <div className="flex justify-between text-green-600 font-medium">
            <span>Change</span><span>{formatCurrency(lastSale.change)}</span>
          </div>
        )}
      </div>

      {lastSale.payments.length > 0 && (
        <div className="border-t pt-3 text-sm">
          <p className="text-gray-500 mb-1">Payments:</p>
          {lastSale.payments.map((p, i) => (
            <div key={i} className="flex justify-between">
              <span className="capitalize">{p.method}</span>
              <span>{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={clearCart} className="btn-primary w-full">New Sale</button>
    </div>
  )
}
