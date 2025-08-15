import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export function useValidatedForm<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  defaultValues?: z.infer<TSchema>
) {
  // Use onChange validation mode for better test compatibility
  const mode = 'onChange'
  
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  })
}
