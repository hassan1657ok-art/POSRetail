# Retail POS — Desktop Point of Sale System

A modern, cross-platform desktop POS (Point of Sale) application built with **Electron**, **React**, **TypeScript**, **Prisma**, and **SQLite**. Designed for small to medium retail businesses with support for product management, inventory tracking, sales processing, reporting, and WooCommerce synchronization.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Building for Production](#building-for-production)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Modules

| Module | Description | Role Access |
|---|---|---|
| **Authentication** | Secure login/logout with bcrypt password hashing, role-based access control | All users |
| **Dashboard** | Real-time KPIs: product/customer counts, today's sales, revenue, low stock alerts, recent transactions | Admin, Cashier |
| **Point of Sale (POS)** | Barcode/product search, cart management, configurable discounts (rate/flat), tax calculation, split payments (cash/card), change computation, receipt generation | Admin, Cashier |
| **Products** | CRUD with multi-variant support (SKU, barcode, pricing, stock levels, low-stock alerts), category/brand/supplier associations, image management | Admin |
| **Categories** | Hierarchical product categories with auto-generated slugs | Admin |
| **Brands** | Product brand management | Admin |
| **Customers** | Customer records with purchase history, walk-in customer support | Admin, Cashier |
| **Suppliers** | Supplier management with contact details | Admin |
| **Inventory** | Real-time stock tracking, manual adjustments, movement history with audit trail, low-stock notifications | Admin |
| **Reports** | Sales summary, profit & loss, top products (with charts), cashier performance reports, inventory valuation | Admin |
| **Settings** | Business profile, tax configuration, currency settings, receipt footer, database export/backup | Admin |

### Technical Features

- **Offline-first**: SQLite database runs locally — no internet required for core operations
- **Layered architecture**: Presentation → Services → Repository → Database (clean separation of concerns)
- **Activity logging**: Every create/update/delete action is audited with user attribution
- **Soft deletes**: Business entities are soft-deleted (retained in database with `isDeleted` flag)
- **UUID primary keys**: All entities use UUIDs, enabling future multi-store sync
- **Future-ready**: Designed for PostgreSQL migration, cloud sync, and mobile integration

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | Electron 33 |
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 3 + custom design system |
| **State Management** | Zustand 5 |
| **Routing** | React Router 6 (HashRouter) |
| **ORM** | Prisma 5 |
| **Database** | SQLite (MVP), PostgreSQL-ready |
| **Charts** | Recharts 2 |
| **Icons** | Lucide React |
| **Authentication** | bcryptjs |
| **Validation** | Zod |

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Electron Shell              │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Main Process │  │  Renderer Process │  │
│  │              │  │                   │  │
│  │  Prisma ORM  │◄─┤  React + Zustand │  │
│  │  IPC Handlers│  │  Tailwind CSS     │  │
│  │  File System │  │  React Router     │  │
│  └──────┬───────┘  └──────────────────┘  │
│         │                                 │
│  ┌──────▼───────┐                        │
│  │   SQLite DB  │                        │
│  └──────────────┘                        │
└─────────────────────────────────────────┘
```

### Data Flow

```
UI Component → Store/Action → IPC invoke() → IPC Handler → Prisma → SQLite
                                                              ↓
UI Component ← Store update ← IPC response ←┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
```

### Design Principles

1. **Separation of concerns**: Each layer has a single responsibility
2. **Repository pattern**: All data access goes through IPC handlers → Prisma
3. **Feature-based modules**: Code organized by business domain, not by file type
4. **UI never touches the database**: Renderer communicates via contextBridge → IPC
5. **Context isolation**: `contextIsolation: true`, `nodeIntegration: false`
6. **Immutable state**: Zustand stores enforce immutable updates

---

## Prerequisites

- **Node.js** ≥ 18.x (v20+ recommended)
- **npm** ≥ 9.x
- **Git** (for version control)
- **Windows** / **macOS** / **Linux**

---

## Installation

```bash
# 1. Clone the repository
git clone git@github.com:hassan1657ok-art/POSRetail.git
cd POSRetail

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Create and push the database schema
npx prisma db push

# 5. Seed the database with default data (optional — app auto-seeds on first launch)
npx ts-node --project tsconfig.node.json electron/database/seed.ts
```

> **Note**: The application auto-seeds on first launch. If you don't run step 5 manually, the database will be seeded automatically when you first start the app.

---

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts the Vite dev server (with HMR) and launches the Electron window. The renderer hot-reloads on file changes.

### Production Build

```bash
npm run build         # Build the application
npm run package       # Create distributable installer
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Build for production (dist + dist-electron) |
| `npm run package` | Build + create installer via electron-builder |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:seed` | Seed database manually |
| `npm run lint` | Run ESLint |

---

## Default Credentials

On first launch, the following accounts are created:

| Username | Password | Role | Permissions |
|---|---|---|---|
| `admin` | `admin123` | Admin | Full access to all modules |
| `cashier` | `cashier123` | Cashier | Sales, view products, view/create customers |

> **Security**: The default credentials are hashed with bcrypt (10 salt rounds) before storage. Change these immediately in production.

---

## Project Structure

```
New MVP/
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration (renderer + electron)
├── tsconfig.json             # TypeScript config (renderer)
├── tsconfig.node.json        # TypeScript config (electron main process)
├── tailwind.config.js        # Tailwind CSS configuration
├── electron-builder.yml      # Electron packaging configuration
├── index.html                # HTML entry point
├── prisma/
│   └── schema.prisma         # Database schema (16 entities)
├── electron/
│   ├── main.ts               # Electron main process entry
│   ├── preload.ts            # contextBridge API exposure
│   ├── database/
│   │   ├── index.ts          # Prisma client singleton
│   │   └── seed.ts           # Database seeder
│   └── ipc-handlers/
│       ├── index.ts          # Handler registration
│       ├── auth.handler.ts   # Authentication handlers
│       ├── dashboard.handler.ts
│       ├── category.handler.ts
│       ├── brand.handler.ts
│       ├── product.handler.ts
│       ├── customer.handler.ts
│       ├── supplier.handler.ts
│       ├── sale.handler.ts   # Sales + inventory deduction (transactional)
│       ├── inventory.handler.ts
│       ├── report.handler.ts
│       ├── settings.handler.ts
│       └── activity.handler.ts
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Root component (HashRouter + Toasts)
    ├── index.css             # Global styles + design system
    ├── vite-env.d.ts         # Vite type declarations
    ├── types/
    │   └── index.ts          # Shared TypeScript types
    ├── lib/
    │   ├── api.ts            # IPC API wrapper (40+ endpoints)
    │   └── utils.ts          # Formatting utilities
    ├── stores/
    │   ├── auth.store.ts     # Authentication state
    │   ├── cart.store.ts     # POS cart state
    │   ├── app.store.ts      # Application UI state
    │   └── toast.store.ts    # Toast notification state
    ├── components/
    │   ├── Layout.tsx        # Authenticated layout shell
    │   ├── Sidebar.tsx       # Navigation sidebar
    │   ├── Header.tsx        # Top header bar
    │   ├── DataTable.tsx     # Reusable data table
    │   ├── Modal.tsx         # Reusable modal dialog
    │   ├── ConfirmDialog.tsx # Confirmation dialog
    │   ├── LoadingSpinner.tsx
    │   └── Toast.tsx         # Toast notification container
    ├── routes/
    │   └── index.tsx         # Route definitions
    └── modules/
        ├── auth/LoginPage.tsx
        ├── dashboard/DashboardPage.tsx
        ├── products/ProductsPage.tsx, ProductForm.tsx
        ├── categories/CategoriesPage.tsx
        ├── customers/CustomersPage.tsx
        ├── suppliers/SuppliersPage.tsx
        ├── sales/SalesPage.tsx, ReceiptView.tsx
        ├── inventory/InventoryPage.tsx
        ├── reports/ReportsPage.tsx
        └── settings/SettingsPage.tsx
```

---

## API Reference

### IPC Communication Model

All frontend-to-backend communication flows through Electron's IPC (Inter-Process Communication):

```
Renderer (React)              Main Process
     │                            │
     │  window.api.invoke()       │
     ├──────────────────────────►│
     │     (preload bridge)       │
     │                            ├──► Prisma → SQLite
     │                            │
     │         Response           │
     │◄──────────────────────────┤
     │                            │
```

### Available IPC Channels (40+ endpoints)

All calls use `window.api.invoke(channel, ...args)` or the typed wrapper in `src/lib/api.ts`.

#### Authentication

| Channel | Parameters | Returns |
|---|---|---|
| `auth:login` | `username: string, password: string` | `AuthUser` |
| `auth:logout` | — | `{ success: bool }` |
| `auth:currentUser` | — | `AuthUser \| null` |

#### Dashboard

| Channel | Parameters | Returns |
|---|---|---|
| `dashboard:stats` | — | `DashboardStats` (counts, revenue, low stock, recent sales) |

#### Products

| Channel | Parameters | Returns |
|---|---|---|
| `products:getAll` | — | `Product[]` (with variants, images, category, brand) |
| `products:getById` | `id: string` | `Product \| null` |
| `products:create` | `{ categoryId, name, slug, variants?[], ... }` | `Product` |
| `products:update` | `id, data: Partial<Product>` | `Product` |
| `products:delete` | `id` | soft-delete |
| `products:search` | `query: string` | `Product[]` (by name/SKU/barcode) |

#### Sales (POS)

| Channel | Parameters | Returns |
|---|---|---|
| `sales:getAll` | — | `Sale[]` (with items, payments, customer, user) |
| `sales:getById` | `id: string` | `Sale \| null` |
| `sales:create` | `{ customerId, items[], payments[], discountRate?, taxRate?, note? }` | `Sale` (transactional: stock deducted + movement recorded) |
| `sales:getByDateRange` | `startDate, endDate` | `Sale[]` |
| `sales:getByInvoiceNo` | `invoiceNo` | `Sale \| null` |

#### Inventory

| Channel | Parameters | Returns |
|---|---|---|
| `inventory:getMovements` | `variantId?: string` | `InventoryMovement[]` |
| `inventory:adjust` | `{ variantId, quantity, reason }` | `InventoryMovement` |
| `inventory:getLowStock` | — | `ProductVariant[]` (below threshold) |

#### Reports

| Channel | Parameters | Returns |
|---|---|---|
| `reports:salesSummary` | `startDate, endDate` | `{ totalSales, totalRevenue, totalDiscounts, totalTax, payments, sales[] }` |
| `reports:profitLoss` | `startDate, endDate` | `{ totalRevenue, totalCost, grossProfit, margin }` |
| `reports:inventoryValuation` | — | `{ totalCostValue, totalRetailValue, variants[] }` |
| `reports:topProducts` | `startDate, endDate, limit?` | Top selling variants by quantity |
| `reports:cashierSummary` | `startDate, endDate` | Sales count + total per cashier |

#### Settings

| Channel | Parameters | Returns |
|---|---|---|
| `settings:getBusiness` | — | `Business` |
| `settings:updateBusiness` | `Partial<Business>` | `Business` |
| `settings:exportDB` | — | `{ success, path? }` (file save dialog) |

#### Activity & Notifications

| Channel | Parameters | Returns |
|---|---|---|
| `activity:getLogs` | — | `ActivityLog[]` |
| `notifications:getAll` | — | `Notification[]` |
| `notifications:markRead` | `id` | — |

---

## Database Schema

The database uses **16 entities** with **UUID primary keys**, **soft deletes**, and **audit fields**.

### Entity Relationship Diagram

```
Business ──┬── User ──┬── Sale ──┬── SaleItem
           │          │          └── Payment
           │          └── InventoryMovement
           │
Role ──────┘

Category ──┬── Product ──┬── ProductVariant ──┬── SaleItem
Brand ─────┘             │                    └── InventoryMovement
Supplier ──┘             └── ProductImage

Customer ──── Sale

User ──── ActivityLog
```

### Key Conventions

- **Tables**: PascalCase singular (`Product`, `Sale`, `SaleItem`)
- **Columns**: camelCase (`sellingPrice`, `createdAt`)
- **Foreign Keys**: `entityId` format (`categoryId`, `customerId`)
- **Timestamps**: `createdAt`, `updatedAt` on all entities
- **Soft Deletes**: `isDeleted: Boolean @default(false)`
- **Audit**: `createdAt`, `updatedAt` on every table
- **UUIDs**: All primary keys use `@default(uuid())`

### Core Entities

| Entity | Purpose | Key Fields |
|---|---|---|
| `Business` | Store profile, tax/currency config | name, currency, taxRate, receiptFooter |
| `User` | Application users | username, passwordHash, roleId, isActive |
| `Role` | Role definitions | name, permissions |
| `Category` | Product categories (hierarchical) | name, slug, parentId |
| `Brand` | Product brands | name |
| `Product` | Parent product | name, categoryId, brandId, supplierId |
| `ProductVariant` | Sellable SKU with pricing/stock | sku, barcode, costPrice, sellingPrice, stockQuantity, lowStockAlert |
| `ProductImage` | Product images | url, isPrimary |
| `Customer` | Customer records | fullName, phone, totalSpent, isWalkIn |
| `Supplier` | Supplier records | name, contactPerson, phone |
| `Sale` | Invoice/sale header | invoiceNo, subtotal, discountAmt, taxAmt, grandTotal, totalPaid, change |
| `SaleItem` | Line items in a sale | variantId, quantity, unitPrice, lineTotal |
| `Payment` | Payments per sale | method, amount, reference |
| `InventoryMovement` | Stock change audit trail | type, quantity, previousQty, newQty, reason |
| `Notification` | System alerts | type, title, message, isRead |
| `ActivityLog` | User action audit | action, entity, entityId, details |

---

## Building for Production

```bash
# Build the application
npm run build

# Package as Windows installer (NSIS)
npm run package

# The installer will be in the release/ folder
```

Configure packaging in `electron-builder.yml`:

```yaml
appId: com.nasif.retailpos
productName: Retail POS
directories:
  output: release
win:
  target: [nsis]
  icon: resources/icon.png
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run the build: `npm run build`
5. Commit with a descriptive message: `git commit -m "feat: add feature description"`
6. Push to your fork: `git push origin feature/your-feature`
7. Open a Pull Request

### Code Standards

- **TypeScript strict mode** enabled
- **No unused variables** (configured in tsconfig)
- **Feature-based modules**: Place new features in `src/modules/<feature>/`
- **Use existing components**: `DataTable`, `Modal`, `ConfirmDialog` from `src/components/`
- **State management**: Use Zustand stores in `src/stores/`
- **API calls**: Always use the typed wrapper in `src/lib/api.ts`
- **Styling**: Use Tailwind utility classes and the project's component classes (`.btn-primary`, `.card`, `.input`, etc.)

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add customer import from CSV
fix: prevent negative totals on discount
docs: update API reference
refactor: extract payment form component
style: improve dashboard card layout
test: add sale computation unit tests
```

---

## License

MIT © Sardar Hassan Arshad

---

## Support

For issues, questions, or feature requests, please [open an issue](https://github.com/hassan1657ok-art/POSRetail/issues).
