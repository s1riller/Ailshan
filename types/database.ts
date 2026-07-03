export type UploadStatus = "pending" | "approved" | "rejected";
export type EventTheme = "default" | "wedding" | "corporate" | "evening" | "minimal" | "instagram";
export type LiveLayout = "masonry" | "featured" | "slideshow" | "compact";
export type LiveTransition = "fade" | "slide" | "zoom" | "stories";
export type LiveQrEffect = "fade" | "slide" | "pulse" | "stories";
export type UserRole = "user" | "super_admin";
export type UserPlan = "free" | "pro";

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          slug: string;
          date: string | null;
          location: string | null;
          is_active: boolean;
          theme: EventTheme;
          guest_intro: string;
          thanks_text: string;
          live_layout: LiveLayout;
          live_transition: LiveTransition;
          slide_duration_seconds: number;
          live_qr_effect: LiveQrEffect;
          live_qr_interval_seconds: number;
          show_messages_on_live: boolean;
          show_names_on_live: boolean;
          show_qr_on_live: boolean;
          auto_approve: boolean;
          max_file_size_mb: number;
          custom_slug: string | null;
          brand_name: string | null;
          brand_color: string | null;
          cover_title: string | null;
          photo_limit: number;
          archive_enabled: boolean;
          guest_instruction: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          slug: string;
          date?: string | null;
          location?: string | null;
          is_active?: boolean;
          theme?: EventTheme;
          guest_intro?: string;
          thanks_text?: string;
          live_layout?: LiveLayout;
          live_transition?: LiveTransition;
          slide_duration_seconds?: number;
          live_qr_effect?: LiveQrEffect;
          live_qr_interval_seconds?: number;
          show_messages_on_live?: boolean;
          show_names_on_live?: boolean;
          show_qr_on_live?: boolean;
          auto_approve?: boolean;
          max_file_size_mb?: number;
          custom_slug?: string | null;
          brand_name?: string | null;
          brand_color?: string | null;
          cover_title?: string | null;
          photo_limit?: number;
          archive_enabled?: boolean;
          guest_instruction?: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          date?: string | null;
          location?: string | null;
          is_active?: boolean;
          theme?: EventTheme;
          guest_intro?: string;
          thanks_text?: string;
          live_layout?: LiveLayout;
          live_transition?: LiveTransition;
          slide_duration_seconds?: number;
          live_qr_effect?: LiveQrEffect;
          live_qr_interval_seconds?: number;
          show_messages_on_live?: boolean;
          show_names_on_live?: boolean;
          show_qr_on_live?: boolean;
          auto_approve?: boolean;
          max_file_size_mb?: number;
          custom_slug?: string | null;
          brand_name?: string | null;
          brand_color?: string | null;
          cover_title?: string | null;
          photo_limit?: number;
          archive_enabled?: boolean;
          guest_instruction?: string;
        };
      };
      event_zones: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          qr_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          qr_token: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          qr_token?: string;
        };
      };
      uploads: {
        Row: {
          id: string;
          event_id: string;
          zone_id: string | null;
          guest_name: string;
          message: string | null;
          file_path: string;
          file_type: string;
          file_size: number;
          status: UploadStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          zone_id?: string | null;
          guest_name: string;
          message?: string | null;
          file_path: string;
          file_type: string;
          file_size?: number;
          status?: UploadStatus;
          created_at?: string;
        };
        Update: {
          guest_name?: string;
          message?: string | null;
          file_path?: string;
          file_type?: string;
          file_size?: number;
          status?: UploadStatus;
        };
      };
      consents: {
        Row: {
          id: string;
          upload_id: string;
          accepted_privacy: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          upload_id: string;
          accepted_privacy: boolean;
          created_at?: string;
        };
        Update: {
          accepted_privacy?: boolean;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          plan: UserPlan;
          is_blocked: boolean;
          full_name: string | null;
          phone: string | null;
          company_name: string | null;
          city: string | null;
          avatar_path: string | null;
          locale: string;
          timezone: string;
          ui_theme: EventTheme;
          email_notifications: boolean;
          onboarding_completed: boolean;
          events_limit: number;
          storage_limit_mb: number;
          storage_retention_days: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          plan?: UserPlan;
          is_blocked?: boolean;
          full_name?: string | null;
          phone?: string | null;
          company_name?: string | null;
          city?: string | null;
          avatar_path?: string | null;
          locale?: string;
          timezone?: string;
          ui_theme?: EventTheme;
          email_notifications?: boolean;
          onboarding_completed?: boolean;
          events_limit?: number;
          storage_limit_mb?: number;
          storage_retention_days?: number;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: UserRole;
          plan?: UserPlan;
          is_blocked?: boolean;
          full_name?: string | null;
          phone?: string | null;
          company_name?: string | null;
          city?: string | null;
          avatar_path?: string | null;
          locale?: string;
          timezone?: string;
          ui_theme?: EventTheme;
          email_notifications?: boolean;
          onboarding_completed?: boolean;
          events_limit?: number;
          storage_limit_mb?: number;
          storage_retention_days?: number;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          body?: string;
          is_read?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
