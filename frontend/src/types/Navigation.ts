import type { IconName } from "./Icon";

export type NavigationItem = {
  icon: IconName;
  label: string;
  path: string;
  count?: number;
};
