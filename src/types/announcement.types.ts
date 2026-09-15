export type AnnouncementLevel = "info" | "warning" | "critical";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  level: AnnouncementLevel;
  posted_by: string;
  created_at: string;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  level: AnnouncementLevel;
  posted_by: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
  level?: AnnouncementLevel;
}