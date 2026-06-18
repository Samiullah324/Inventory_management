import client from './client'

export async function fetchTransactions() {
  const { data } = await client.get('/transactions/')
  return data
}

export async function createTransaction(payload) {
  const { data } = await client.post('/transactions/', payload)
  return data
}

export async function deleteTransaction(id) {
  await client.delete(`/transactions/${id}/`)
}
