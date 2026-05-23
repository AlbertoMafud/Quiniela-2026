// Tipos manuales del schema. Reemplazar con `pnpm supabase gen types typescript --local`
// cuando el proyecto Supabase esté creado y la migración aplicada.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Round = "r32" | "r16" | "qf" | "sf" | "final";
export type Stage = "group" | Round;

interface BracketPickRow {
  player_id: string;
  round: Round;
  slot_id: string;
  winner_team_code: string | null;
}
interface BracketPickInsert {
  player_id: string;
  round: Round;
  slot_id: string;
  winner_team_code?: string | null;
}
type BracketPickUpdate = Partial<BracketPickInsert>;

export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          pin_hash: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          pin_hash: string;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          pin_hash?: string;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          code: string;
          name: string;
          group_letter: string;
          flag_emoji: string | null;
        };
        Insert: {
          code: string;
          name: string;
          group_letter: string;
          flag_emoji?: string | null;
        };
        Update: {
          code?: string;
          name?: string;
          group_letter?: string;
          flag_emoji?: string | null;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          stage: Stage;
          group_letter: string | null;
          bracket_slot: string | null;
          home_team_code: string | null;
          away_team_code: string | null;
          kickoff_at: string;
          home_score: number | null;
          away_score: number | null;
          penalty_winner: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          stage: Stage;
          group_letter?: string | null;
          bracket_slot?: string | null;
          home_team_code?: string | null;
          away_team_code?: string | null;
          kickoff_at: string;
          home_score?: number | null;
          away_score?: number | null;
          penalty_winner?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stage?: Stage;
          group_letter?: string | null;
          bracket_slot?: string | null;
          home_team_code?: string | null;
          away_team_code?: string | null;
          kickoff_at?: string;
          home_score?: number | null;
          away_score?: number | null;
          penalty_winner?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          player_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          match_id?: string;
          home_score?: number;
          away_score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      third_picks: {
        Row: {
          player_id: string;
          team_code: string;
          pick_order: number;
        };
        Insert: {
          player_id: string;
          team_code: string;
          pick_order: number;
        };
        Update: {
          player_id?: string;
          team_code?: string;
          pick_order?: number;
        };
        Relationships: [];
      };
      bracket_picks: {
        Row: BracketPickRow;
        Insert: BracketPickInsert;
        Update: BracketPickUpdate;
        Relationships: [];
      };
      early_bracket_picks: {
        Row: BracketPickRow;
        Insert: BracketPickInsert;
        Update: BracketPickUpdate;
        Relationships: [];
      };
      scoring_params: {
        Row: {
          id: number;
          exact_score_pts: number;
          correct_winner_pts: number;
          early_r32_bonus: number;
          early_r16_bonus: number;
          early_qf_bonus: number;
          early_sf_bonus: number;
          early_final_bonus: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          exact_score_pts?: number;
          correct_winner_pts?: number;
          early_r32_bonus?: number;
          early_r16_bonus?: number;
          early_qf_bonus?: number;
          early_sf_bonus?: number;
          early_final_bonus?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          exact_score_pts?: number;
          correct_winner_pts?: number;
          early_r32_bonus?: number;
          early_r16_bonus?: number;
          early_qf_bonus?: number;
          early_sf_bonus?: number;
          early_final_bonus?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      deadlines: {
        Row: { stage: string; deadline_at: string };
        Insert: { stage: string; deadline_at: string };
        Update: { stage?: string; deadline_at?: string };
        Relationships: [];
      };
      admin_config: {
        Row: { key: string; value: Json };
        Insert: { key: string; value: Json };
        Update: { key?: string; value?: Json };
        Relationships: [];
      };
      thirds_allocation: {
        Row: { combination: string; slots: Json };
        Insert: { combination: string; slots: Json };
        Update: { combination?: string; slots?: Json };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor_player_id: string | null;
          action: string;
          target: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_player_id?: string | null;
          action: string;
          target?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          actor_player_id?: string | null;
          action?: string;
          target?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      group_standings: {
        Row: {
          team_code: string;
          team_name: string;
          group_letter: string;
          w: number;
          d: number;
          l: number;
          gf: number;
          ga: number;
          gd: number;
          pts: number;
        };
        Relationships: [];
      };
      player_scores: {
        Row: {
          player_id: string;
          player_name: string;
          total_points: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
