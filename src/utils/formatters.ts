export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export const formatCurrency = (amount: number): string => {
  return `₦${formatNumber(Number.parseFloat(amount.toFixed(2)))}`
}
