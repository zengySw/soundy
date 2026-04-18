export interface register_request_body {
  email: string;
  username: string;
  password: string;
}

export interface login_request_body {
  email: string;
  password: string;
}

export interface auth_user {
  user_id: string;
  session_id: string;
}

export interface auth_session_metadata {
  user_agent: string | null;
  ip_address: string | null;
}

export interface auth_response_payload {
  access_token: string;
  token_type: "Bearer";
  expires_in_seconds: number;
  user: {
    id: string;
    email: string;
    username: string;
    created_at: string;
  };
}
