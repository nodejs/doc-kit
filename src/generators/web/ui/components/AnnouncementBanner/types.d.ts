import type { BannerProps } from '@node-core/ui-components/Common/Banner';

export type BannerEntry = {
  startDate?: string;
  endDate?: string;
  text: string;
  link?: string;
  type?: BannerProps['type'];
};

export type RemoteConfig = {
  websiteBanners?: Record<string, BannerEntry | undefined>;
};

export type AnnouncementBannerProps = {
  banners: BannerEntry[];
};

export type RemoteLoadableBannerProps = {
  remoteConfig: string;
  versionMajor: number | null;
};
