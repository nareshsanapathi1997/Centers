'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import FormField from '@/components/forms/FormField'

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> & {
  name?: string
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, BaseInputProps>(
  function Input(
    { label, hint, error, className = '', containerClassName = '', id, name, ...rest },
    ref,
  ) {
    const inputId = id ?? name
    const control = (
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={`admin-form-control ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    )

    if (!label) return control

    return (
      <FormField
        label={label}
        htmlFor={inputId}
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

type FormInputProps<T extends FieldValues> = Omit<BaseInputProps, 'name' | 'error'> & {
  name: FieldPath<T>
}

/** Controlled Input — must be used inside a RHF `FormProvider`. */
export function FormInput<T extends FieldValues>({
  name,
  label,
  hint,
  ...rest
}: FormInputProps<T>) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Input
          {...rest}
          {...field}
          value={field.value ?? ''}
          label={label}
          hint={hint}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
