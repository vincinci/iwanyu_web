export type Vendor = {
  id: string;
  name: string;
  location?: string;
  verified?: boolean;
  ownerUserId?: string;
  status?: string;
  revoked?: boolean;
};
