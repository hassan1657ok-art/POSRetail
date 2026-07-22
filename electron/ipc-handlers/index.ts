import { ipcMain } from 'electron'
import { registerAuthHandlers } from './auth.handler'
import { registerDashboardHandlers } from './dashboard.handler'
import { registerCategoryHandlers } from './category.handler'
import { registerBrandHandlers } from './brand.handler'
import { registerProductHandlers } from './product.handler'
import { registerCustomerHandlers } from './customer.handler'
import { registerSupplierHandlers } from './supplier.handler'
import { registerSaleHandlers } from './sale.handler'
import { registerInventoryHandlers } from './inventory.handler'
import { registerReportHandlers } from './report.handler'
import { registerSettingsHandlers } from './settings.handler'
import { registerActivityHandlers } from './activity.handler'

export function registerAllHandlers() {
  registerAuthHandlers()
  registerDashboardHandlers()
  registerCategoryHandlers()
  registerBrandHandlers()
  registerProductHandlers()
  registerCustomerHandlers()
  registerSupplierHandlers()
  registerSaleHandlers()
  registerInventoryHandlers()
  registerReportHandlers()
  registerSettingsHandlers()
  registerActivityHandlers()
}
