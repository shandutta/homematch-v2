import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export function useValidatedForm<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  defaultValues?: z.infer<TSchema>
) {
  return useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  })
}
