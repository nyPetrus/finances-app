import {
  ArrowLeftRightIcon,
  BriefcaseIcon,
  CarIcon,
  CloudIcon,
  FilmIcon,
  GiftIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HomeIcon,
  PawPrintIcon,
  PiggyBankIcon,
  PlaneIcon,
  RepeatIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  TagIcon,
  TrendingUpIcon,
  UsersRoundIcon,
  UtensilsCrossedIcon,
  WrenchIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

// Predefined palette for category icons — matches the icons already used by
// the default-seeded categories (see supabase/migrations/0015_categories_icon.sql).
// Keys are what's stored in categories.icon; "tag" is also the fallback for
// an unrecognized/missing key (see CategoryIcon).
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCartIcon,
  "utensils-crossed": UtensilsCrossedIcon,
  car: CarIcon,
  home: HomeIcon,
  "heart-pulse": HeartPulseIcon,
  film: FilmIcon,
  briefcase: BriefcaseIcon,
  "shopping-bag": ShoppingBagIcon,
  "graduation-cap": GraduationCapIcon,
  plane: PlaneIcon,
  zap: ZapIcon,
  repeat: RepeatIcon,
  gift: GiftIcon,
  "piggy-bank": PiggyBankIcon,
  "trending-up": TrendingUpIcon,
  "arrow-left-right": ArrowLeftRightIcon,
  "paw-print": PawPrintIcon,
  smartphone: SmartphoneIcon,
  wrench: WrenchIcon,
  family: UsersRoundIcon,
  cloud: CloudIcon,
  tag: TagIcon,
};

export const CATEGORY_ICONS = Object.keys(CATEGORY_ICON_MAP);

export const DEFAULT_CATEGORY_ICON = "tag";
