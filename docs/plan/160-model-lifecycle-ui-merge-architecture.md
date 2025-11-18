# Model Lifecycle UI – Merged Architecture Design

**Document**: 160-model-lifecycle-ui-merge-architecture.md
**Created**: 2025-11-13
**Status**: Architecture Design
**Priority**: P0 (Critical)
**Related**: 156-model-lifecycle-jsonb-refactor-architecture.md, 157-model-lifecycle-implementation-plan.md

---

## Executive Summary

This document defines the frontend architecture for merging **existing Model Tier Management** (/admin/models) with **new Model Lifecycle Management** features into a unified, coherent admin interface.

**Key Goals**:
1. **Avoid Duplication**: Reuse existing table, filtering, and search logic from ModelTierManagement.tsx
2. **Seamless Integration**: Add lifecycle columns and actions to existing interface
3. **RBAC Enforcement**: Hide/disable actions based on user permissions
4. **Maintain UX**: Preserve familiar workflows while adding new capabilities

---

## Current State Analysis

### Existing Implementation (ModelTierManagement.tsx)

**Current Features**:
- ✅ Model table with search/filter (by provider, tier, name)
- ✅ Bulk selection and bulk tier updates
- ✅ Individual model editing via dialog (ModelTierEditDialog)
- ✅ Tier access configuration (requiredTier, allowedTiers, tierRestrictionMode)
- ✅ Audit log display (TierAuditLog component)
- ✅ Success/error notifications

**Current Route**: `/admin/models`

**Current API Calls**:
- `adminAPI.listModelsWithTiers()` - Get models with tier info
- `adminAPI.updateModelTier()` - Update tier config
- `adminAPI.bulkUpdateTiers()` - Bulk tier changes
- `adminAPI.getAuditLogs()` - Tier change history
- `adminAPI.revertTierChange()` - Rollback tier changes
- `adminAPI.getProviders()` - Get provider list for filters

**Current Table Columns**:
1. Checkbox (bulk select)
2. Model Name (displayName + name)
3. Provider
4. Required Tier (badge)
5. Mode (tierRestrictionMode)
6. Allowed Tiers (badge array)
7. Status (isAvailable)
8. Actions (Edit button)

**Missing Features** (Lifecycle):
- ❌ No isLegacy, isArchived status display
- ❌ No lifecycle action buttons (mark legacy, archive, etc.)
- ❌ No model creation form
- ❌ No meta JSON editor
- ❌ No lifecycle history view
- ❌ No provider templates

---

## Target Architecture

### Unified Route Structure

**Primary Route**: `/admin/models` (existing)

**Sub-routes** (NEW):
```
/admin/models                  → Model Table (main view, merged tier + lifecycle)
/admin/models/new              → Model Creation Form
/admin/models/:id              → Model Detail View (unified)
/admin/models/:id/lifecycle    → Lifecycle History (dedicated view)
```

### Navigation Pattern

Keep existing page structure but enhance with lifecycle features:

```tsx
/admin/models
  ├── Header (existing: "Model Tier Management" → rename to "Model Management")
  ├── Filters (existing: search, provider, tier → ADD: status filter)
  ├── Action Bar (NEW: "Add Model" button)
  ├── Bulk Actions Bar (existing: enhance with lifecycle actions)
  ├── Model Table (existing: add lifecycle columns + actions)
  ├── Audit Log (existing: expand to include lifecycle events)
  └── Dialogs (existing: ModelTierEditDialog → enhance + add new dialogs)
```

### Enhanced Table Schema

**Merged Columns** (11 total):
1. Checkbox (bulk select)
2. Model Name (displayName + name + provider badge)
3. Provider (badge with icon)
4. **Status** (NEW: Active/Legacy/Archived badge)
5. Required Tier (badge)
6. Mode (tierRestrictionMode)
7. Allowed Tiers (badge array)
8. **Last Updated** (NEW: timestamp)
9. Availability (isAvailable - existing)
10. **Actions** (enhanced: Edit, Mark Legacy, Archive, Meta Edit)

**Status Badge Colors**:
- **Active**: Green (isLegacy=false, isArchived=false)
- **Legacy**: Amber/Yellow (isLegacy=true, isArchived=false)
- **Archived**: Grey (isArchived=true)

### Component Architecture

#### 1. ModelManagement.tsx (Enhanced existing page)

**File**: `frontend/src/pages/admin/ModelTierManagement.tsx` (rename to `ModelManagement.tsx`)

**New State Variables**:
```tsx
// Lifecycle dialog state
const [lifecycleAction, setLifecycleAction] = useState<'mark-legacy' | 'archive' | null>(null);
const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
const [replacementModelId, setReplacementModelId] = useState<string>('');
const [deprecationNotice, setDeprecationNotice] = useState<string>('');
const [sunsetDate, setSunsetDate] = useState<string>('');

// Meta editor state
const [isMetaEditorOpen, setIsMetaEditorOpen] = useState(false);
const [editingMeta, setEditingMeta] = useState<ModelMeta | null>(null);

// Status filter (NEW)
const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'legacy' | 'archived'>('all');
```

**New API Calls**:
```tsx
// Lifecycle operations
adminAPI.markModelAsLegacy(modelId, { replacementModelId, deprecationNotice, sunsetDate })
adminAPI.unmarkModelLegacy(modelId)
adminAPI.archiveModel(modelId, reason)
adminAPI.unarchiveModel(modelId)
adminAPI.updateModelMeta(modelId, metaUpdates)
adminAPI.createModel({ id, name, provider, meta })
adminAPI.getLifecycleHistory(modelId)
```

**New Handler Functions**:
```tsx
const handleMarkLegacy = async (modelId: string) => { /* ... */ };
const handleUnmarkLegacy = async (modelId: string) => { /* ... */ };
const handleArchive = async (modelId: string, reason: string) => { /* ... */ };
const handleUnarchive = async (modelId: string) => { /* ... */ };
const handleEditMeta = async (modelId: string, metaUpdates: Partial<ModelMeta>) => { /* ... */ };
const handleCreateModel = async (modelData: CreateModelRequest) => { /* ... */ };
```

#### 2. LifecycleActionMenu.tsx (NEW component)

**Purpose**: Dropdown menu for lifecycle actions per model row

```tsx
interface LifecycleActionMenuProps {
  model: ModelInfo;
  onMarkLegacy: () => void;
  onUnmarkLegacy: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onEditMeta: () => void;
  permissions: {
    canManageLifecycle: boolean;
    canEditMeta: boolean;
  };
}

// Show different actions based on current status
// Active → Mark Legacy, Archive, Edit Meta
// Legacy → Unmark Legacy, Archive, Edit Meta
// Archived → Unarchive
```

#### 3. MarkLegacyDialog.tsx (NEW component)

**Purpose**: Modal for marking model as legacy with replacement selection

```tsx
interface MarkLegacyDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  availableModels: ModelInfo[]; // For replacement dropdown
  onConfirm: (data: {
    replacementModelId?: string;
    deprecationNotice?: string;
    sunsetDate?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

// Form fields:
// - Replacement Model (select dropdown)
// - Deprecation Notice (textarea)
// - Sunset Date (date picker)
// - Confirmation checkbox
```

#### 4. ArchiveDialog.tsx (NEW component)

**Purpose**: Modal for archiving model with warning

```tsx
interface ArchiveDialogProps {
  isOpen: boolean;
  model: ModelInfo | null;
  usageStats?: {
    activeUsers: number;
    requestsLast30Days: number;
  };
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

// Warning: "Archiving will remove this model from all public endpoints"
// Usage stats: "This model has 150 active users and 12,500 requests in last 30 days"
// Reason field (required)
```

#### 5. MetaJsonEditor.tsx (NEW component)

**Purpose**: JSON editor for meta field with schema validation

```tsx
interface MetaJsonEditorProps {
  isOpen: boolean;
  model: ModelInfo | null;
  currentMeta: ModelMeta;
  onSave: (updatedMeta: Partial<ModelMeta>) => Promise<void>;
  onCancel: () => void;
}

// Features:
// - Monaco editor or CodeMirror for JSON editing
// - Real-time Zod validation
// - Diff view (before/after)
// - Template dropdown (OpenAI, Anthropic, Google)
// - Field documentation tooltips
```

#### 6. ModelCreationForm.tsx (NEW component)

**Purpose**: Full-page form for creating new models

```tsx
interface ModelCreationFormProps {
  onSubmit: (modelData: CreateModelRequest) => Promise<void>;
  onCancel: () => void;
}

// Form sections:
// 1. Basic Info (id, name, provider)
// 2. Display Info (displayName, description, version)
// 3. Capabilities (multi-select checkboxes)
// 4. Context & Limits (contextLength, maxOutputTokens)
// 5. Pricing (input costs, output costs, auto-calc credits)
// 6. Tier Access (requiredTier, tierRestrictionMode, allowedTiers)
// 7. Provider Metadata (optional JSON)
// 8. Admin Notes (optional)
```

#### 7. LifecycleHistoryPanel.tsx (NEW component)

**Purpose**: Timeline view of lifecycle changes for a model

```tsx
interface LifecycleHistoryPanelProps {
  modelId: string;
  history: LifecycleEvent[];
  isLoading: boolean;
}

// Timeline items:
// - Created (timestamp, admin)
// - Marked as Legacy (timestamp, admin, replacement model)
// - Unmarked Legacy (timestamp, admin)
// - Archived (timestamp, admin, reason)
// - Unarchived (timestamp, admin)
// - Meta Updated (timestamp, admin, fields changed)
```

#### 8. ModelStatusBadge.tsx (NEW component)

**Purpose**: Status indicator badge

```tsx
interface ModelStatusBadgeProps {
  isLegacy: boolean;
  isArchived: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Colors:
// Active: bg-green-100 text-green-800 (green-600 dark)
// Legacy: bg-amber-100 text-amber-800 (amber-600 dark)
// Archived: bg-gray-100 text-gray-800 (gray-500 dark)
```

---

## Enhanced Filter Panel

### Existing Filters (Keep)
- Search by name (text input)
- Provider (dropdown)
- Required Tier (dropdown)

### New Filters (Add)
- **Status** (dropdown): All / Active / Legacy / Archived
- **Has Replacement** (checkbox): Show only legacy models with replacement
- **Sunset Date** (date range): Filter by upcoming sunset dates

### Filter Component Update

```tsx
// Add to existing filter panel
<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  {/* Existing: Search */}
  <div className="md:col-span-2">...</div>

  {/* Existing: Provider */}
  <div>...</div>

  {/* Existing: Tier */}
  <div>...</div>

  {/* NEW: Status Filter */}
  <div>
    <select
      value={filterStatus}
      onChange={(e) => setFilterStatus(e.target.value)}
      className="..."
    >
      <option value="all">All Statuses</option>
      <option value="active">Active</option>
      <option value="legacy">Legacy</option>
      <option value="archived">Archived</option>
    </select>
  </div>
</div>
```

---

## Bulk Actions Enhancement

### Existing Bulk Actions (Keep)
- Bulk Update Tier (with reason prompt)

### New Bulk Actions (Add)
- **Bulk Mark Legacy**: Mark multiple models as legacy (prompt for replacement)
- **Bulk Archive**: Archive multiple models (prompt for reason)
- **Bulk Unarchive**: Restore archived models

### Bulk Action Bar Update

```tsx
{selectedModels.size > 0 && (
  <div className="bg-rephlo-blue dark:bg-electric-cyan/90 text-white rounded-lg p-4 flex items-center justify-between">
    <span className="font-medium">
      {selectedModels.size} model(s) selected
    </span>
    <div className="flex gap-2">
      {/* Existing */}
      <Button onClick={handleBulkUpdateTier}>Update Tier</Button>

      {/* NEW: Lifecycle actions */}
      <Button onClick={handleBulkMarkLegacy}>Mark Legacy</Button>
      <Button onClick={handleBulkArchive}>Archive</Button>

      {/* Clear */}
      <Button variant="secondary" onClick={() => setSelectedModels(new Set())}>
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  </div>
)}
```

---

## API Service Integration

### Extended adminAPI Service

**File**: `frontend/src/api/admin.ts`

**New Methods**:
```typescript
// Lifecycle operations
async markModelAsLegacy(
  modelId: string,
  data: {
    replacementModelId?: string;
    deprecationNotice?: string;
    sunsetDate?: string;
  }
): Promise<void> {
  await api.post(`/admin/models/${modelId}/mark-legacy`, data);
}

async unmarkModelLegacy(modelId: string): Promise<void> {
  await api.post(`/admin/models/${modelId}/unmark-legacy`);
}

async archiveModel(modelId: string, reason: string): Promise<void> {
  await api.post(`/admin/models/${modelId}/archive`, { reason });
}

async unarchiveModel(modelId: string): Promise<void> {
  await api.post(`/admin/models/${modelId}/unarchive`);
}

async updateModelMeta(
  modelId: string,
  metaUpdates: Partial<ModelMeta>
): Promise<ModelInfo> {
  const response = await api.patch(`/admin/models/${modelId}/meta`, metaUpdates);
  return response.data;
}

async createModel(modelData: CreateModelRequest): Promise<ModelInfo> {
  const response = await api.post('/admin/models', modelData);
  return response.data;
}

async getLifecycleHistory(modelId: string): Promise<LifecycleEvent[]> {
  const response = await api.get(`/admin/models/${modelId}/lifecycle-history`);
  return response.data.history;
}

async getLegacyModels(): Promise<ModelInfo[]> {
  const response = await api.get('/admin/models/legacy');
  return response.data.models;
}

async getArchivedModels(): Promise<ModelInfo[]> {
  const response = await api.get('/admin/models/archived?includeArchived=true');
  return response.data.models;
}
```

---

## TypeScript Type Definitions

### Extended Model Types

**File**: `frontend/src/types/model.ts` (NEW or extend existing)

```typescript
import type { SubscriptionTier } from '@rephlo/shared-types';

export interface ModelMeta {
  // Display
  displayName: string;
  description?: string;
  version?: string;

  // Capabilities
  capabilities: ('text' | 'vision' | 'function_calling' | 'code' | 'long_context')[];

  // Limits
  contextLength: number;
  maxOutputTokens?: number;

  // Pricing
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  creditsPer1kTokens: number;

  // Tier Access
  requiredTier: SubscriptionTier;
  tierRestrictionMode: 'minimum' | 'exact' | 'whitelist';
  allowedTiers: SubscriptionTier[];

  // Legacy (optional)
  legacyReplacementModelId?: string;
  deprecationNotice?: string;
  sunsetDate?: string; // ISO 8601

  // Provider-specific (optional)
  providerMetadata?: Record<string, any>;

  // Admin (optional)
  internalNotes?: string;
  complianceTags?: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;

  // Lifecycle state
  isAvailable: boolean;
  isLegacy: boolean;
  isArchived: boolean;

  // Metadata
  meta: ModelMeta;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Legacy tier fields (backwards compat during migration)
  displayName?: string;
  requiredTier?: SubscriptionTier;
  tierRestrictionMode?: string;
  allowedTiers?: SubscriptionTier[];
}

export interface CreateModelRequest {
  id: string;
  name: string;
  provider: string;
  meta: ModelMeta;
}

export interface LifecycleEvent {
  id: string;
  modelId: string;
  action: 'created' | 'mark_legacy' | 'unmark_legacy' | 'archived' | 'unarchived' | 'meta_updated';
  adminUserId: string;
  adminEmail: string;
  timestamp: string;
  changes: Record<string, any>;
  reason?: string;
}
```

---

## RBAC Permission Checks

### Required Permissions

**Permission Tokens** (from backend RBAC):
- `models.read` - View models (all users)
- `models.create` - Create new models (admin only)
- `models.lifecycle.manage` - Mark legacy, archive (admin only)
- `models.meta.edit` - Edit meta JSON (admin only)
- `models.tier.update` - Update tier access (admin only)

### Frontend Permission Enforcement

**File**: `frontend/src/hooks/usePermissions.ts` (NEW)

```typescript
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  return {
    canReadModels: user?.permissions.includes('models.read') ?? false,
    canCreateModels: user?.permissions.includes('models.create') ?? false,
    canManageLifecycle: user?.permissions.includes('models.lifecycle.manage') ?? false,
    canEditMeta: user?.permissions.includes('models.meta.edit') ?? false,
    canUpdateTiers: user?.permissions.includes('models.tier.update') ?? false,
  };
}
```

**Usage in Components**:
```tsx
function ModelManagement() {
  const permissions = usePermissions();

  return (
    <>
      {/* Hide "Add Model" button for non-admins */}
      {permissions.canCreateModels && (
        <Button onClick={handleAddModel}>Add New Model</Button>
      )}

      {/* Disable lifecycle actions for Analyst/Auditor roles */}
      <LifecycleActionMenu
        model={model}
        onMarkLegacy={handleMarkLegacy}
        permissions={{
          canManageLifecycle: permissions.canManageLifecycle,
          canEditMeta: permissions.canEditMeta,
        }}
      />
    </>
  );
}
```

---

## Migration Strategy

### Phase 1: Rename and Enhance Existing Page (Week 1)
1. Rename `ModelTierManagement.tsx` → `ModelManagement.tsx`
2. Update route in `adminRoutes.tsx` (keep path `/admin/models`)
3. Update page title: "Model Tier Management" → "Model Management"
4. Add status filter to filter panel
5. Add lifecycle columns to table (isLegacy, isArchived badges)
6. Keep all existing tier management features working

### Phase 2: Add Lifecycle Action Components (Week 1-2)
1. Create `LifecycleActionMenu.tsx`
2. Create `MarkLegacyDialog.tsx`
3. Create `ArchiveDialog.tsx`
4. Create `ModelStatusBadge.tsx`
5. Integrate action menu into table row actions
6. Wire up API calls for lifecycle operations

### Phase 3: Add Meta Editor and Model Creation (Week 2)
1. Create `MetaJsonEditor.tsx` with Monaco editor
2. Create `ModelCreationForm.tsx`
3. Add `/admin/models/new` route
4. Add "Add Model" button to main page
5. Implement model creation workflow

### Phase 4: Add Lifecycle History (Week 2)
1. Create `LifecycleHistoryPanel.tsx`
2. Add `/admin/models/:id/lifecycle` route
3. Fetch and display lifecycle events
4. Add "View History" link to action menu

### Phase 5: Bulk Actions Enhancement (Week 2)
1. Add bulk lifecycle action handlers
2. Update bulk action bar with new buttons
3. Implement confirmation dialogs for bulk operations
4. Test with 10+ models selected

### Phase 6: RBAC Integration (Week 2-3)
1. Create `usePermissions` hook
2. Add permission checks to all action buttons
3. Hide/disable actions based on role
4. Test with Support/Analyst/Auditor roles

### Phase 7: QA and Polish (Week 3)
1. End-to-end testing of all workflows
2. Accessibility audit (keyboard navigation, screen readers)
3. Responsive design testing (mobile, tablet)
4. Performance testing (1000+ models)
5. Error handling and edge cases

---

## Wireframe Mockup

### Main View (/admin/models)

```
┌────────────────────────────────────────────────────────────────┐
│ Breadcrumbs: Admin > Model Management                          │
├────────────────────────────────────────────────────────────────┤
│ Model Management                              [🔄 Refresh]     │
│ Configure models, tier access, and lifecycle                   │
├────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Search & Filters                                           │ │
│ │ [🔍 Search by name...]  [Provider ▾] [Tier ▾] [Status ▾]  │ │
│ │                                              [Search →]    │ │
│ └────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│ [+ Add New Model]                                              │
├────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Model Table                                                │ │
│ │ ☐ Name        Provider  Status  Tier  Mode  Allowed  Acts │ │
│ │ ☐ GPT-4       OpenAI    ●Active Pro   min   [Pro,Ent] ⋮   │ │
│ │ ☐ GPT-3.5     OpenAI    ●Legacy Free  min   [All]     ⋮   │ │
│ │ ☐ Claude 3    Anthropic ●Active ProMax min  [ProMax+] ⋮   │ │
│ │ ☐ GPT-2       OpenAI    ●Arch.  Free  min   [All]     ⋮   │ │
│ └────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│ Recent Changes (Audit Log)                                     │
│ • GPT-4 tier updated from Free to Pro by admin@... (2h ago)   │
│ • Claude 3 marked as legacy by admin@... (1d ago)              │
│ • GPT-3.5 archived by admin@... (3d ago)                       │
└────────────────────────────────────────────────────────────────┘
```

### Action Menu (⋮ dropdown per row)

```
┌──────────────────────┐
│ Edit Tier Config     │
├──────────────────────┤
│ Edit Meta JSON       │
├──────────────────────┤
│ Mark as Legacy   ⚠   │
│ Archive Model    🗄   │
├──────────────────────┤
│ View Lifecycle History │
└──────────────────────┘
```

### Mark Legacy Dialog

```
┌────────────────────────────────────────────────┐
│ Mark GPT-4 as Legacy                      [X] │
├────────────────────────────────────────────────┤
│ Replacement Model (Optional):                  │
│ [Select replacement... ▾] → [GPT-5 ▾]         │
│                                                │
│ Deprecation Notice (Optional):                 │
│ [GPT-4 will be sunset on 2025-12-31.      ]   │
│ [Please migrate to GPT-5 for improved...  ]   │
│                                                │
│ Sunset Date (Optional):                        │
│ [📅 2025-12-31]                                │
│                                                │
│ ☑ I understand this will show a deprecation   │
│   warning to all users                         │
│                                                │
│ [Cancel]                    [Mark as Legacy →] │
└────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Functional Requirements
- ✅ All existing tier management features still work (no regressions)
- ✅ Lifecycle status (Active/Legacy/Archived) visible in table
- ✅ Mark Legacy dialog prompts for replacement model and notice
- ✅ Archive dialog warns about active usage and requires reason
- ✅ Meta JSON editor validates against Zod schema
- ✅ Model creation form supports all required fields
- ✅ Bulk actions work for 10+ models
- ✅ Lifecycle history shows all events with timestamps
- ✅ Audit log includes both tier and lifecycle changes

### RBAC Requirements
- ✅ Non-admin users see read-only view (no action buttons)
- ✅ Support role can view but not modify
- ✅ Analyst role can view analytics but not lifecycle actions
- ✅ Admin role has full access to all features
- ✅ Permission checks happen before API calls

### UX Requirements
- ✅ Status badges use consistent colors (Active=green, Legacy=amber, Archived=grey)
- ✅ Confirmation dialogs prevent accidental actions
- ✅ Success/error notifications appear for all actions
- ✅ Loading states shown during API calls
- ✅ Table remains responsive with 100+ models
- ✅ Filters work correctly in combination

### Performance Requirements
- ✅ Table loads within 2 seconds for 500 models
- ✅ Search/filter updates within 500ms
- ✅ No UI freezes during bulk operations
- ✅ Optimistic updates for single-model actions

---

## Success Metrics

### Quantitative
- Table load time < 2s (p95)
- Action response time < 1s (p95)
- Zero regression bugs in tier management
- 100% test coverage on new components

### Qualitative
- Admin users can create new model within 3 minutes
- Admin users can mark model as legacy within 30 seconds
- Clear visual distinction between Active/Legacy/Archived
- Intuitive workflow requires no documentation

---

## Next Steps

1. **Create Architecture Document** ✅ (This document)
2. **Delegate UI/UX Implementation** (Tasks 1-6 from TODO list)
3. **Delegate API Integration** (Task 7)
4. **Delegate RBAC Enforcement** (Task 8)
5. **Coordinate QA Testing** (Task 13)

---

## Conclusion

This architecture provides a clear roadmap for merging tier management and lifecycle management into a unified, production-ready admin interface. The phased approach ensures backwards compatibility while enabling powerful new capabilities for model administration.

**Key Design Principle**: "Extend, don't replace" - preserve existing workflows and add lifecycle features as natural extensions, not separate silos.
