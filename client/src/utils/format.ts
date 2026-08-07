const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateShort = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatDate(value: string): string {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return dateShort.format(date);
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'payee':
    case 'accepte':
    case 'termine':
    case 'actif':
      return 'badge badge-success';
    case 'envoyee':
    case 'envoye':
    case 'en_cours':
    case 'prospect':
      return 'badge badge-info';
    case 'en_retard':
    case 'refuse':
    case 'annule':
    case 'annulee':
    case 'inactif':
      return 'badge badge-danger';
    case 'brouillon':
    case 'expire':
    default:
      return 'badge badge-warning';
  }
}

export function statusLabelKey(status: string): `status.${string}` {
  return `status.${status}` as `status.${string}`;
}
