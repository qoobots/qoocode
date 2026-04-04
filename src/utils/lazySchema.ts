// Lazy Schema - Creates schemas that are evaluated only when needed
// This avoids issues with circular imports and allows dynamic schema creation

type SchemaFactory<T> = () => T

export function lazySchema<T>(factory: SchemaFactory<T>): () => T {
  let schema: T | undefined
  let initialized = false

  return () => {
    if (!initialized) {
      schema = factory()
      initialized = true
    }
    return schema as T
  }
}
