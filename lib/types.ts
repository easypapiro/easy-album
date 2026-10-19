import type { Timestamp } from "firebase/firestore";

export const MAX_UPLOADS = 20;

export type AlbumEvent = {
  slug: string;
  ownerId: string;
  name1: string;
  name2: string;
  /** YYYY-MM-DD */
  date: string;
  location: string;
  coverUrl: string | null;
  coverPath: string | null;
  createdAt: Timestamp | null;
};

export type Guest = {
  name: string;
  uploadCount: number;
  joinedAt: Timestamp | null;
};

export type MediaType = "photo" | "video";

export type Media = {
  id: string;
  uploaderId: string;
  uploaderName: string;
  type: MediaType;
  url: string;
  path: string;
  thumbUrl: string | null;
  thumbPath: string | null;
  width: number | null;
  height: number | null;
  /** seconds, videos only */
  duration: number | null;
  caption: string;
  likedBy: string[];
  likesCount: number;
  createdAt: Timestamp | null;
};

export type Transition = "fade" | "zoom" | "slide";

export type VideoDraft = {
  mediaIds: string[];
  track: string;
  customTrackName: string | null;
  customTrackUrl: string | null;
  customTrackPath: string | null;
  transition: Transition;
  /** Last generated video, kept until the next one replaces it. */
  videoUrl: string | null;
  videoPath: string | null;
  videoType: string | null;
};
