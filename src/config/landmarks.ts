export type LandmarkId = 'guanghua' | 'lawn' | 'xianghui' | 'teaching' | 'gate' | 'yanyuan';
export type FocusId = LandmarkId | 'overview';
export interface LandmarkInfo {
  id: LandmarkId;
  name: string;
  position: [number, number, number];
  camera: [number, number, number];
}
export const SCENE_SCALE = 0.32;
export const landmarks: LandmarkInfo[] = [
  { id: 'guanghua', name: '光华楼', position: [0, 12, -26], camera: [33, 8, 69] },
  { id: 'lawn', name: '光草', position: [0, 1, -4], camera: [39, 21, 47] },
  { id: 'xianghui', name: '相辉堂', position: [-28, 4, -8], camera: [34, 15, 46] },
  { id: 'teaching', name: '二教·三教', position: [33, 3.3, 5.5], camera: [30, 8, 13] },
  { id: 'gate', name: '老校门', position: [0, 3.7, 36], camera: [23, 9, 39] },
  { id: 'yanyuan', name: '燕园', position: [-30, 2.6, 22], camera: [30, 16, 37] },
];
export const dockLandmarks: { id: FocusId; name: string }[] = [
  { id: 'overview', name: '全景' },
  ...landmarks.filter(l => l.id !== 'lawn'),
];
