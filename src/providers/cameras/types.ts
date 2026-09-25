export type CameraMediaMode = 'iframe' | 'image' | 'link';
export type CameraProviderId = 'camera-netmadeira' | 'camera-portolisboa' | 'camera-cnsantamaria' | 'camera-meo-beachcam' | 'camera-meteoestrela' | 'camera-madeira-web' | 'camera-viaverde' | 'camera-vr1madeira' | 'camera-funchal';
export type CameraPoseConfidence = 'published' | 'estimated' | 'unknown';
export type CameraSourceStatus = 'catalogued' | 'unverified' | 'offline' | 'removed';
export interface CameraDescriptor {
  id: string;
  operator: string;
  name: string;
  providerId: CameraProviderId;
  region: 'Madeira' | 'Portugal continental' | 'Açores';
  longitude: number;
  latitude: number;
  sourcePage: string;
  mediaMode: CameraMediaMode;
  mediaUrl?: string;
  attribution: string;
  locationConfidence: 'approximate';
  poseConfidence: CameraPoseConfidence;
  sourceStatus: CameraSourceStatus;
  sourceCheckedAt: string;
}
