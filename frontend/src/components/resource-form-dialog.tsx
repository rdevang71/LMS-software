import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export type ResourceField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "date" | "textarea" | "select" | "multiselect";
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  resetFields?: string[];
  visibleWhen?: (values: ResourceValues) => boolean;
  options?:
    | { label: string; value: string }[]
    | ((values: ResourceValues) => { label: string; value: string }[]);
};

export type ResourceValues = Record<string, string | number>;

export function ResourceFormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues = {},
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: ResourceField[];
  initialValues?: ResourceValues;
  onSubmit: (values: ResourceValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ResourceValues>(initialValues);
  const [busy, setBusy] = useState(false);
  const initialValuesKey = JSON.stringify(initialValues);

  useEffect(() => {
    if (open) setValues(JSON.parse(initialValuesKey) as ResourceValues);
  }, [open, initialValuesKey]);
  const setValue = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const missing = fields.find(
      (field) =>
        field.required &&
        (!field.visibleWhen || field.visibleWhen(values)) &&
        !String(values[field.name] ?? "").trim(),
    );
    if (missing) {
      toast.error(`${missing.label} is required`);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-4 py-5">
            {fields
              .filter((field) => !field.visibleWhen || field.visibleWhen(values))
              .map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={`resource-${field.name}`}>{field.label}</Label>
                  {field.type === "select" ? (
                    <Select
                      value={String(values[field.name] ?? "")}
                      onValueChange={(value) =>
                        setValues((current) => ({
                          ...current,
                          [field.name]: value,
                          ...Object.fromEntries(
                            (field.resetFields ?? []).map((fieldName) => [fieldName, ""]),
                          ),
                        }))
                      }
                    >
                      <SelectTrigger id={`resource-${field.name}`}>
                        <SelectValue
                          placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(typeof field.options === "function"
                          ? field.options(values)
                          : field.options
                        )?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "multiselect" ? (
                    <div
                      id={`resource-${field.name}`}
                      className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2"
                    >
                      {(typeof field.options === "function"
                        ? field.options(values)
                        : field.options
                      )?.map((option) => {
                        const selected = new Set(
                          String(values[field.name] ?? "")
                            .split(",")
                            .filter(Boolean),
                        );
                        return (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={selected.has(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) selected.add(option.value);
                                else selected.delete(option.value);
                                setValue(field.name, [...selected].join(","));
                              }}
                            />
                            {option.label}
                          </label>
                        );
                      })}
                      {(typeof field.options === "function" ? field.options(values) : field.options)
                        ?.length === 0 && (
                        <p className="px-2 py-1 text-sm text-muted-foreground">
                          No eligible students are enrolled in this course.
                        </p>
                      )}
                    </div>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      id={`resource-${field.name}`}
                      required={field.required}
                      placeholder={field.placeholder}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={String(values[field.name] ?? "")}
                      onChange={(event) => setValue(field.name, event.target.value)}
                    />
                  ) : (
                    <Input
                      id={`resource-${field.name}`}
                      type={field.type ?? "text"}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={String(values[field.name] ?? "")}
                      onChange={(event) => setValue(field.name, event.target.value)}
                    />
                  )}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={busy} type="submit" className="bg-gradient-primary">
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
