export type Ecc = 'L' | 'M' | 'Q' | 'H';
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';
export type ContentType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard';
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

export interface WifiInput {
  ssid: string;
  password: string;
  encryption: WifiEncryption;
  hidden: boolean;
}

export interface EmailInput {
  address: string;
  subject: string;
  body: string;
}

export interface PhoneInput {
  number: string;
}

export interface SmsInput {
  number: string;
  message: string;
}

export interface VCardInput {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  note: string;
}

export type QrForm =
  | { type: 'url'; url: string }
  | { type: 'text'; text: string }
  | { type: 'wifi'; ssid: string; password: string; encryption: string; hidden: boolean }
  | { type: 'email'; address: string; subject: string; body: string }
  | { type: 'phone'; number: string }
  | { type: 'sms'; number: string; message: string }
  | { type: 'vcard'; card: VCardInput };

export interface StyleSettings {
  ecc: string;
  margin: number;
  size: number;
  fg: string;
  bg: string;
  hasLogo: boolean;
}

export function isEcc(value: string): value is Ecc {
  return value === 'L' || value === 'M' || value === 'Q' || value === 'H';
}

export function isEncryption(value: string): value is WifiEncryption {
  return value === 'WPA' || value === 'WEP' || value === 'nopass';
}

export function isContentType(value: string | undefined): value is ContentType {
  return (
    value === 'url' ||
    value === 'text' ||
    value === 'wifi' ||
    value === 'email' ||
    value === 'phone' ||
    value === 'sms' ||
    value === 'vcard'
  );
}
