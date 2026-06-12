export type SessionRecord = {
  id: string;
  userId: string;
  expires_at: Date;
};

export type AuthContext = {
  session: SessionRecord;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    birthday: Date;
    academic_status: string;
    space: string;
  };
  wallet_address?: string;
  accountId?: string;
};
