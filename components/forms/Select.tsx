'use client'

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'
import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import FormField from '@/components/forms/FormField'

type BaseSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> & {
  name?: string
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, BaseSelectProps>(
  function Select(
    { label, hint, error, className = '', containerClassName = '', id, name, children, ...rest },
    ref,
  ) {
    const selectId = id ?? name
    const control = (
      <select
        ref={ref}
        id={selectId}
        name={name}
        className={`admin-form-control ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
    )

    if (!label) return control

    return (
      <FormField
        label={label}
        htmlFor={selectId}
        required={rest.required}
        hint={hint}
        error={error}
        className={containerClassName}
      >
        {control}
      </FormField>
    )
  },
)

type FormSelectProps<T extends FieldValues> = Omit<BaseSelectProps, 'name' | 'error'> & {
  name: FieldPath<T>
}

/** Controlled Select — must be used inside a RHF `FormProvider`. */
export function FormSelect<T extends FieldValues>({
  name,
  label,
  hint,
  children,
  ...rest
}: FormSelectProps<T>) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Select
          {...rest}
          {...field}
          value={field.value ?? ''}
          label={label}
          hint={hint}
          error={fieldState.error?.message}
        >
          {children}
        </Select>
      )}
    />
  )
}
