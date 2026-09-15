import { supabase } from "@/lib/supabase";
import type {
  Announcement,
  AnnouncementLevel,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/types/announcement.types";

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Announcement[]) ?? [];
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: input.title.trim(),
      message: input.message.trim(),
      level: input.level,
      posted_by: input.posted_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<Announcement | null> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.message !== undefined) payload.message = input.message.trim();
  if (input.level !== undefined) payload.level = input.level;

  if (Object.keys(payload).length === 0) {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as Announcement) ?? null;
  }

  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return (data as Announcement) ?? null;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("announcements")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getAnnouncementsByLevel(
  level: AnnouncementLevel
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("level", level)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Announcement[]) ?? [];
}

/** Announcements still active = created within the last 30 minutes */
const ACTIVE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export function isAnnouncementActive(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= ACTIVE_WINDOW_MS;
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const fourHoursAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .gte("created_at", fourHoursAgo) // still within 4-hour window
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Announcement[]) ?? [];
}