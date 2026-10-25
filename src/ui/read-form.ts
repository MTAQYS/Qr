import { isContentType, type QrForm, type StyleSettings, type VCardInput } from '../payload/types.ts';
import { fieldChecked, fieldValue } from './dom.ts';

function card(): VCardInput {
  return {
    firstName: fieldValue('vcard-first'),
    lastName: fieldValue('vcard-last'),
    organization: fieldValue('vcard-org'),
    title: fieldValue('vcard-title'),
    phone: fieldValue('vcard-phone'),
    email: fieldValue('vcard-email'),
    url: fieldValue('vcard-url'),
    street: fieldValue('vcard-street'),
    city: fieldValue('vcard-city'),
    region: fieldValue('vcard-region'),
    postalCode: fieldValue('vcard-postal'),
    country: fieldValue('vcard-country'),
    note: fieldValue('vcard-note'),
  };
}

export function readForm(): QrForm {
  const selected = document.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
  const type = selected?.dataset.type;
  if (!isContentType(type) || type === 'url') return { type: 'url', url: fieldValue('url') };
  switch (type) {
    case 'text':
      return { type: 'text', text: fieldValue('text') };
    case 'wifi':
      return {
        type: 'wifi',
        ssid: fieldValue('ssid'),
        password: fieldValue('wifi-password'),
        encryption: fieldValue('wifi-encryption'),
        hidden: fieldChecked('wifi-hidden'),
      };
    case 'email':
      return {
        type: 'email',
        address: fieldValue('email'),
        subject: fieldValue('email-subject'),
        body: fieldValue('email-body'),
      };
    case 'phone':
      return { type: 'phone', number: fieldValue('phone') };
    case 'sms':
      return { type: 'sms', number: fieldValue('sms-number'), message: fieldValue('sms-message') };
    case 'vcard':
      return { type: 'vcard', card: card() };
  }
}

export function readSettings(hasLogo: boolean): StyleSettings {
  return {
    ecc: fieldValue('ecc'),
    margin: Number(fieldValue('margin')),
    size: Number(fieldValue('size')),
    fg: fieldValue('fg-hex'),
    bg: fieldValue('bg-hex'),
    hasLogo,
  };
}
