// Client-safe types shared by the player pages.
export type PublicMerchant = {
  id: string;
  slug: string;
  companyName: string;
  goalType: string;
  goalUrl: string | null;
  goalLabel: string;
  rewardMode: "immediate" | "next_visit";
  rewards: { id: string; name: string; short_label: string | null }[];
  isDefault: boolean;
};

export const DEFAULT_SLUG = "afro-fouta";
