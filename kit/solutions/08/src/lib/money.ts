const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** 1234.5 -> « 1 234,50 € ». */
export const formatMoney = (amount: number) => euro.format(amount)
