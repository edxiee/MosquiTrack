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
    .select("*, announcement_views(user_role)")
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
      target_audience: input.target_audience,
      start_date: input.start_date,
      end_date: input.end_date || null,
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
  if (input.target_audience !== undefined) payload.target_audience = input.target_audience;
  if (input.start_date !== undefined) payload.start_date = input.start_date;
  if (input.end_date !== undefined) payload.end_date = input.end_date;

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

/**
 * Determines if an announcement is active based on start_date and end_date.
 */
export function isAnnouncementActive(startDate: string, endDate: string | null): boolean {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start) || start > now) return false;
  
  if (endDate) {
    const end = new Date(endDate).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  
  return true;
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const now = new Date().toISOString();

  // Active means: start_date <= now AND (end_date is null OR end_date >= now)
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .lte("start_date", now)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data as Announcement[]) ?? [];
}

export async function logAnnouncementView(announcementId: string, userId: string, userRole: string): Promise<void> {
  const { error } = await supabase
    .from("announcement_views")
    .insert({ announcement_id: announcementId, user_id: userId, user_role: userRole });
    
  if (error && error.code !== '23505') { // Ignore unique constraint violations
    console.error("Failed to log announcement view:", error);
  }
}