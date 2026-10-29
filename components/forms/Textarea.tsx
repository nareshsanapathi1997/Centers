'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import FormField from '@/components/forms/FormField'

type BaseTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> & {
  name?: string
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, BaseTextareaProps>(
  function Textarea(
    { label, hint, error, className = '', containerClassName = '', id, name, ...rest },
    ref,
  ) {
    const textareaId = id ?? name
    const control = (
      <textarea
        ref={ref}
        id={textareaId}
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
        htmlFor={textareaId}
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

type FormTextareaProps<T extends FieldValues> = Omit<BaseTextareaProps, 'name' | 'error'> & {
  name: FieldPath<T>
}

/** Controlled Textarea — must be used inside a RHF `FormProvider`. */
export function FormTextarea<T extends FieldValues>({
  name,
  label,
  hint,
  ...rest
}: FormTextareaProps<T>) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Textarea
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
