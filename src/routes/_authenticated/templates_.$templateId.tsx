import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentUser, hasPerm } from "@/hooks/use-current-user";
import {
  getTemplate,
  addTemplateItem,
  updateTemplateItem,
  removeTemplateItem,
  updateTemplate,
  deleteTemplate,
} from "@/lib/template-detail.functions";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates_/$templateId")({
  head: () => ({ meta: [{ title: "Template — CADesk" }] }),
  component: TemplateEditorPage,
});

function TemplateEditorPage() {
  const { templateId: templateIdParam } = Route.useParams();
  const templateId = Number(templateIdParam);
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = hasPerm(user, "templates.manage");
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const fetchTemplate = useServerFn(getTemplate);
  const doAddItem = useServerFn(addTemplateItem);
  const doUpdateItem = useServerFn(updateTemplateItem);
  const doRemoveItem = useServerFn(removeTemplateItem);
  const doUpdateTemplate = useServerFn(updateTemplate);
  const doDeleteTemplate = useServerFn(deleteTemplate);

  const { data: templateData, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => fetchTemplate({ data: { templateId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["template", templateId] });

  const addItem = async () => {
    const name = newItem.trim();
    if (!name) return;
    const nextSort = (templateData?.items.at(-1)?.sort_order ?? -1) + 1;
    try {
      await doAddItem({
        data: {
          templateId,
          name,
          category: newCategory.trim() || null,
          sortOrder: nextSort,
        },
      });
      setNewItem("");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleUpdateItem = async (
    id: number,
    patch: Partial<{ name: string; category: string | null; is_required: boolean; is_repeatable: boolean; sort_order: number }>
  ) => {
    try {
      await doUpdateItem({ data: { itemId: id, patch } });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await doRemoveItem({ data: { itemId: id } });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleUpdateTemplate = async (patch: Partial<{ name: string; description: string | null }>) => {
    try {
      await doUpdateTemplate({ data: { templateId, patch } });
      invalidate();
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirm("Delete this template? Existing requests are unaffected.")) return;
    try {
      await doDeleteTemplate({ data: { templateId } });
      toast.success("Template deleted");
      navigate({ to: "/templates" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  if (isLoading) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  if (!templateData?.template) return <AppShell><p>Template not found.</p></AppShell>;

  const tpl = templateData.template;

  return (
    <AppShell>
      <Link to="/templates" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Templates
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Input
            defaultValue={tpl.name}
            onBlur={(e) => e.target.value !== tpl.name && handleUpdateTemplate({ name: e.target.value })}
            disabled={!canManage}
            className="font-display text-2xl font-semibold"
          />
          <Input
            defaultValue={tpl.description ?? ""}
            placeholder="Description"
            onBlur={(e) => handleUpdateTemplate({ description: e.target.value || null })}
            disabled={!canManage}
          />
        </div>
        {canManage && (
          <Button variant="outline" onClick={handleDeleteTemplate} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="mb-3 font-medium">Checklist items ({templateData.items.length})</p>
          <ul className="space-y-2">
            {templateData.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <Input
                    defaultValue={it.name}
                    onBlur={(e) => e.target.value !== it.name && handleUpdateItem(it.id, { name: e.target.value })}
                    disabled={!canManage}
                  />
                  <Input
                    defaultValue={it.category ?? ""}
                    placeholder="Category (optional)"
                    onBlur={(e) => handleUpdateItem(it.id, { category: e.target.value || null })}
                    disabled={!canManage}
                    className="text-xs"
                  />
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Checkbox checked={it.is_required} onCheckedChange={(v) => handleUpdateItem(it.id, { is_required: !!v })} disabled={!canManage} />
                  Required
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Checkbox checked={it.is_repeatable} onCheckedChange={(v) => handleUpdateItem(it.id, { is_repeatable: !!v })} disabled={!canManage} />
                  Multi-file
                </label>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(it.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <div className="mt-4 space-y-2 rounded-md border border-dashed border-border p-3">
              <Label className="text-xs">Add item</Label>
              <div className="flex flex-wrap gap-2">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Item name" className="flex-1" onKeyDown={(e) => e.key === "Enter" && addItem()} />
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category (optional)" className="w-48" />
                <Button onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Add</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
