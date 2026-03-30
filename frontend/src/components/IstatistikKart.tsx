interface Props {
  icon: string
  sayi: number
  etiket: string
}

export default function IstatistikKart({ icon, sayi, etiket }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
      <span className="text-2xl sm:text-3xl">{icon}</span>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{sayi}</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{etiket}</p>
      </div>
    </div>
  )
}
