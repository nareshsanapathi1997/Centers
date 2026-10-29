'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'

type BaseCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> & {
  name?: string
  label: string
  hint?: string
  error?: string
  containerClassName?: string
}

export const Checkbox = forwardRef<HTMLInputElement, BaseCheckboxProps>(
  function Checkbox(
    { label, hint, error, className = '', containerClassName = '', id, name, ...rest },
    ref,
  ) {
    const inputId = id ?? name

    return (
      <div className={`admin-form-field ${containerClassName}`.trim()}>
        <label htmlFor={inputId} className="admin-form-check">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="checkbox"
            className={className || undefined}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          <span>{label}</span>
        </label>
        {error ? <p className="admin-form-error">{error}</p> : null}
        {!error && hint ? <p className="admin-form-hint">{hint}</p> : null}
      </div>
    )
  },
)

type FormCheckboxProps<T extends FieldValues> = Omit<BaseCheckboxProps, 'name' | 'error'> & {
  name: FieldPath<T>
}

/** Controlled Checkbox — must be used inside a RHF `FormProvider`. */
export function FormCheckbox<T extends FieldValues>({
  name,
  label,
  hint,
  ...rest
}: FormCheckboxProps<T>) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Checkbox
          {...rest}
          name={name}
          label={label}
          hint={hint}
          checked={Boolean(field.value)}
          onChange={(e) => field.onChange(e.target.checked)}
          onBlur={field.onBlur}
          ref={field.ref}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
