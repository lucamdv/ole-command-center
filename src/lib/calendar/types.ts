export type ActivityStatus = "not_started" | "in_progress" | "waiting_approval" | "done" | "cancelled";
export type ActivityPriority = "low" | "medium" | "high" | "critical";
export type ViewMode = "month" | "week" | "day" | "list";

export interface CalendarActivity {
  id: string;
  user_id: string;
  title: string;
  description: unknown;
  start_at: string;
  end_at: string;
  all_day: boolean;
  status: ActivityStatus;
  priority: ActivityPriority;
  category: string | null;
  project: string | null;
  client: string | null;
  tags: string[];
  color: string | null;
  recurrence_rule: string | null;
  recurrence_until: string | null;
  recurrence_count: number | null;
  parent_activity_id: string | null;
  series_exception: unknown | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarAttachment {
  id: string;
  activity_id: string;
  file_path: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_link: boolean;
  external_url: string | null;
  created_at: string;
}

export interface CalendarReminder {
  id: string;
  activity_id: string;
  offset_minutes: number;
  channels: string[];
  next_trigger_at: string;
  sent_at: string | null;
}

export interface CalendarSavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  view_mode: ViewMode;
  is_favorite: boolean;
}

export interface CalendarNotification {
  id: string;
  activity_id: string | null;
  title: string;
  body: string | null;
  kind: "reminder" | "due_soon" | "overdue";
  read_at: string | null;
  created_at: string;
}

export interface ActivityFilters {
  statuses?: ActivityStatus[];
  priorities?: ActivityPriority[];
  categories?: string[];
  projects?: string[];
  clients?: string[];
  tags?: string[];
  search?: string;
}

export const STATUS_LABELS: Record<ActivityStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  waiting_approval: "Aguardando aprovação",
  done: "Concluída",
  cancelled: "Cancelada",
};

export const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export const PRIORITY_COLORS: Record<ActivityPriority, string> = {
  low: "hsl(var(--muted-foreground))",
  medium: "hsl(217 91% 60%)",
  high: "hsl(38 92% 50%)",
  critical: "hsl(0 84% 60%)",
};

export const STATUS_COLORS: Record<ActivityStatus, string> = {
  not_started: "hsl(var(--muted-foreground))",
  in_progress: "hsl(217 91% 60%)",
  waiting_approval: "hsl(38 92% 50%)",
  done: "hsl(142 71% 45%)",
  cancelled: "hsl(0 0% 50%)",
};
