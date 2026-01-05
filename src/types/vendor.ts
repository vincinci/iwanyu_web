export type Vendor = {
  id: string;
  name: string;
  location?: string;
  verified?: boolean;
  ownerUserId?: string;
  revoked?: boolean;
};
