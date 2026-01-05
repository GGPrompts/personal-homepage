"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useSectionPreferences,
  CategoryId,
  CategoryMeta,
  IconName,
  ICON_MAP,
  AVAILABLE_ICONS,
} from "@/hooks/useSectionPreferences"

// Icon picker component
function IconPicker({
  selectedIcon,
  onSelect,
}: {
  selectedIcon: IconName
  onSelect: (icon: IconName) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-2 p-2 max-h-48 overflow-y-auto">
      {AVAILABLE_ICONS.map((iconName) => {
        const Icon = ICON_MAP[iconName]
        const isSelected = iconName === selectedIcon
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onSelect(iconName)}
            className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
            title={iconName}
          >
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
    </div>
  )
}

// Sortable category item
function SortableCategoryItem({
  category,
  sectionCount,
  canDelete,
  isDefault,
  iconName,
  onEdit,
  onDelete,
  isOverlay = false,
}: {
  category: CategoryMeta
  sectionCount: number
  canDelete: boolean
  isDefault: boolean
  iconName: IconName
  onEdit: () => void
  onDelete: () => void
  isOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const Icon = category.icon

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors bg-background/50 border-border ${
        isDragging && !isOverlay ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-2 ring-primary/50" : ""}`}
    >
      {/* Drag handle */}
      <button
        className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-muted/50 transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Category icon */}
      <div className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0 bg-primary/20">
        <Icon className="h-4 w-4 text-primary" />
      </div>

      {/* Category info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{category.label}</p>
          {isDefault && (
            <Badge variant="outline" className="text-xs py-0 text-muted-foreground">
              Default
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {category.description}
        </p>
      </div>

      {/* Section count */}
      <Badge variant="secondary" className="text-xs">
        {sectionCount} {sectionCount === 1 ? "section" : "sections"}
      </Badge>

      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Delete button (only for custom categories with no sections) */}
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${canDelete ? "text-destructive hover:text-destructive" : "text-muted-foreground/30 cursor-not-allowed"}`}
        onClick={canDelete ? onDelete : undefined}
        disabled={!canDelete}
        title={
          !canDelete
            ? isDefault
              ? "Cannot delete default category"
              : "Remove all sections first"
            : "Delete category"
        }
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Edit/Add category dialog
function CategoryDialog({
  open,
  onOpenChange,
  mode,
  initialLabel,
  initialDescription,
  initialIcon,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "edit" | "add"
  initialLabel?: string
  initialDescription?: string
  initialIcon?: IconName
  onSave: (label: string, description: string, iconName: IconName) => void
}) {
  const [label, setLabel] = useState(initialLabel || "")
  const [description, setDescription] = useState(initialDescription || "")
  const [iconName, setIconName] = useState<IconName>(initialIcon || "Folder")
  const [showIconPicker, setShowIconPicker] = useState(false)

  const SelectedIcon = ICON_MAP[iconName]

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setLabel(initialLabel || "")
      setDescription(initialDescription || "")
      setIconName(initialIcon || "Folder")
      setShowIconPicker(false)
    }
  }, [open, initialLabel, initialDescription, initialIcon])

  const handleSave = () => {
    if (!label.trim()) return
    onSave(label.trim(), description.trim(), iconName)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Create a new category to organize your sections."
              : "Update the category name, description, or icon."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Icon selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Icon</label>
            <div>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded flex items-center justify-center bg-primary/20">
                  <SelectedIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{iconName}</span>
              </button>
              {showIconPicker && (
                <div className="mt-2 border rounded-lg border-border">
                  <IconPicker
                    selectedIcon={iconName}
                    onSelect={(icon) => {
                      setIconName(icon)
                      setShowIconPicker(false)
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Projects, Media, Tools"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what's in this category"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            {mode === "add" ? "Add Category" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Delete confirmation dialog
function DeleteConfirmDialog({
  open,
  onOpenChange,
  categoryLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryLabel: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Delete Category
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the &ldquo;{categoryLabel}&rdquo; category?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CategorySettings() {
  const {
    isLoaded,
    categoryOrder,
    getAllCategories,
    getSectionCountForCategory,
    canDeleteCategory,
    isDefaultCategory,
    getCategoryIconName,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = useSectionPreferences()

  const [activeId, setActiveId] = useState<CategoryId | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryMeta | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/20 rounded-lg" />
        ))}
      </div>
    )
  }

  const categories = getAllCategories()

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as CategoryId)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = categoryOrder.indexOf(active.id as CategoryId)
      const newIndex = categoryOrder.indexOf(over.id as CategoryId)
      const newOrder = arrayMove(categoryOrder, oldIndex, newIndex)
      reorderCategories(newOrder)
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  function handleEdit(category: CategoryMeta) {
    setSelectedCategory(category)
    setEditDialogOpen(true)
  }

  function handleDelete(category: CategoryMeta) {
    setSelectedCategory(category)
    setDeleteDialogOpen(true)
  }

  function handleSaveEdit(label: string, description: string, iconName: IconName) {
    if (selectedCategory) {
      updateCategory(selectedCategory.id, { label, description, iconName })
    }
  }

  function handleSaveAdd(label: string, description: string, iconName: IconName) {
    addCategory(label, description, iconName)
  }

  function handleConfirmDelete() {
    if (selectedCategory) {
      deleteCategory(selectedCategory.id)
    }
  }

  const activeCategory = activeId ? categories.find(c => c.id === activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} categories
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag categories to reorder them. Click the edit button to rename or change icons.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {categories.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                sectionCount={getSectionCountForCategory(category.id)}
                canDelete={canDeleteCategory(category.id)}
                isDefault={isDefaultCategory(category.id)}
                iconName={getCategoryIconName(category.id)}
                onEdit={() => handleEdit(category)}
                onDelete={() => handleDelete(category)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCategory ? (
            <SortableCategoryItem
              category={activeCategory}
              sectionCount={getSectionCountForCategory(activeCategory.id)}
              canDelete={false}
              isDefault={isDefaultCategory(activeCategory.id)}
              iconName={getCategoryIconName(activeCategory.id)}
              onEdit={() => {}}
              onDelete={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-xs text-muted-foreground pt-2">
        Default categories cannot be deleted but can be renamed. Custom categories can be deleted when empty.
      </p>

      {/* Edit dialog */}
      <CategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        initialLabel={selectedCategory?.label}
        initialDescription={selectedCategory?.description}
        initialIcon={selectedCategory ? getCategoryIconName(selectedCategory.id) : undefined}
        onSave={handleSaveEdit}
      />

      {/* Add dialog */}
      <CategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        mode="add"
        onSave={handleSaveAdd}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        categoryLabel={selectedCategory?.label || ""}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
