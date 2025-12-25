export interface Asset {
  id: string;
  name: string;
  room: string;
  building: string;
  floor: string;
  lat: number | null;
  lon: number | null;
  type: string;
  status: string;
  condition: string;
  notes: string;
  description: string;
  image_url: string;
}

export interface Message {
  id: number;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
  assets?: Asset[];
}
