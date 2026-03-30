const durumRenk: Record<string, string> = {
  'Onaylandı': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Beklemede': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Tamamlandı': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  'İptal':     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface Props {
  durum: string
}

export default function DurumBadge({ durum }: Props) {
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-medium ${durumRenk[durum] ?? ''}`}>
      {durum}
    </span>
  )
}
