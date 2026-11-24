export interface CartItem {
  id: number
  title: string
  price: number
  thumbnail: string
  quantity: number
}

export type CartProduct = Omit<CartItem, 'quantity'>
