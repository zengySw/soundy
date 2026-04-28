export type playlist_role = "owner" | "editor" | "viewer";

export type playlist_track = {
  id: string;
  title: string;
  duration_ms: number | null;
  path: string | null;
  added_at?: string | null;
  position?: number | null;
};

export type playlist_collaborator = {
  user_id: string;
  role: playlist_role;
  username: string | null;
  avatar_url: string | null;
};

export type playlist_payload = {
  id: string;
  name: string;
  description?: string | null;
  my_role?: playlist_role;
  collaborators?: playlist_collaborator[];
  tracks: playlist_track[];
};

export type playlist_socket_user = {
  user_id: string;
  role: playlist_role;
  username: string | null;
  avatar_url: string | null;
};
