import client from './client'

export async function fetchCategories() {
  const { data } = await client.get('/categories/')
  return data
}

export async function createCategory(payload) {
  const { data } = await client.post('/categories/', payload)
  return data
}

export async function updateCategory(id, payload) {
  const { data } = await client.put(`/categories/${id}/`, payload)
  return data
}

export async function deleteCategory(id) {
  await client.delete(`/categories/${id}/`)
}
