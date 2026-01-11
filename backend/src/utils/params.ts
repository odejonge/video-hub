/**
 * Safely extract a string from Express query/params which can be string | string[] | undefined
 */
export function getString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * Safely extract a required string, throws if not present
 */
export function requireString(value: string | string[] | undefined, name: string): string {
  const result = getString(value)
  if (!result) throw new Error(`Missing required parameter: ${name}`)
  return result
}
