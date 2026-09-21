export type AnnouncementLevel = "info" | "warning" | "critical";

export type AnnouncementTargetAudience = "all" | "lgu" | "bhw";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  level: AnnouncementLevel;
  target_audience: AnnouncementTargetAudience;
  start_date: string;
  end_date: string | null;
  posted_by: string;
  created_at: string;
  announcement_views?: { user_role: string }[];
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  level: AnnouncementLevel;
  target_audience: AnnouncementTargetAudience;
  start_date: string;
  end_date?: string | null;
  posted_by: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
  level?: AnnouncementLevel;
  target_audience?: AnnouncementTargetAudience;
  start_date?: string;
  end_date?: string | null;
}