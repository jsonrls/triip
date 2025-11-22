
export type ViewState = 'landing' | 'rider' | 'driver' | 'kyc';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'rider' | 'driver';
  isVerified?: boolean;
  licenseNumber?: string;
  phoneNumber?: string;
  kycData?: any; // Flexible object to store the detailed KYC form data
}

export interface Location {
  lat: number;
  lng: number;
}

export interface RideRequest {
  id: string;
  passengerName: string;
  destination: string;
  fareOffer: number;
  distance: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  timestamp: number;
  date?: string; // Human readable date for history
}

export interface AiRouteInsight {
  estimatedFare: number;
  distanceLabel: string;
  trafficTip: string;
  safetyTip: string;
  fullSummary?: string;
  groundingMetadata?: {
    groundingChunks: Array<{
      web?: { uri: string; title: string };
      maps?: { uri: string; title: string; source: string };
    }>;
  };
}

export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  role: 'rider' | 'driver';
}
