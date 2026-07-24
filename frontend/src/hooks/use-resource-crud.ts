import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export function useResourceCrud() {
  const queryClient = useQueryClient();

  async function save(path: string, id: string | undefined, values: Record<string, unknown>) {
    await apiRequest(`/${path}${id ? `/${id}` : ""}`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(values),
    });
    await queryClient.invalidateQueries({ queryKey: ["lms-data"] });
    toast.success(id ? "Changes saved" : "Record created");
  }

  async function remove(path: string, id: string, label: string) {
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) return false;
    try {
      await apiRequest(`/${path}/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["lms-data"] });
      toast.success("Record deleted");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete record");
      return false;
    }
  }

  return { save, remove };
}
