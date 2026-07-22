import { contextBridge, ipcRenderer } from 'electron'

const api = {
  invoke: (channel: string, ...args: unknown[]) => {
    const validChannels = [
      'auth:login',
      'auth:logout',
      'auth:currentUser',
      'dashboard:stats',
      'categories:getAll',
      'categories:create',
      'categories:update',
      'categories:delete',
      'brands:getAll',
      'brands:create',
      'brands:update',
      'brands:delete',
      'products:getAll',
      'products:getById',
      'products:create',
      'products:update',
      'products:delete',
      'products:search',
      'variants:getByProduct',
      'variants:create',
      'variants:update',
      'variants:delete',
      'customers:getAll',
      'customers:create',
      'customers:update',
      'customers:delete',
      'customers:search',
      'suppliers:getAll',
      'suppliers:create',
      'suppliers:update',
      'suppliers:delete',
      'sales:getAll',
      'sales:getById',
      'sales:create',
      'sales:getByDateRange',
      'sales:getByInvoiceNo',
      'inventory:getMovements',
      'inventory:adjust',
      'inventory:getLowStock',
      'reports:salesSummary',
      'reports:profitLoss',
      'reports:inventoryValuation',
      'reports:topProducts',
      'reports:cashierSummary',
      'settings:getBusiness',
      'settings:updateBusiness',
      'settings:exportDB',
      'activity:getLogs',
      'notifications:getAll',
      'notifications:markRead',
    ]
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`))
  },
}

contextBridge.exposeInMainWorld('api', api)
