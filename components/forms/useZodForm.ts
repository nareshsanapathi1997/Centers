'use client'

import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodType } from 'zod'

/**
 * Typed RHF + Zod helper for object schemas used as form values.
 * Pass a Zod object schema whose inferred output extends FieldValues.
 */
export function useZodForm<TValues extends FieldValues>(
  schema: ZodType<TValues>,
  props?: Omit<UseFormProps<TValues>, 'resolver'>,
): UseFormReturn<TValues> {
  return useForm<TValues>({
    ...props,
    // Zod v4 + resolvers: runtime is correct; cast keeps TS stable across minor zod brands.
    resolver: zodResolver(schema as never),
  })
}

export type { FieldValues, UseFormReturn }
