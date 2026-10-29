'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { useFormContext, Controller, type FieldPath, type FieldValues } from 'react-hook-form'

type BaseSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  name?: string
  label: string
  hint?: string
  error?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  containerClassName?: string
}

/**
 * Accessible toggle switch. Uses a button role=switch so it works outside
 * native form submit payloads; pair with FormSwitch for RHF state.
 */
export const Switch = forwardRef<HTMLButtonElement, BaseSwitchProps>(
  function Switch(
    {
      label,
      hint,
      error,
      checked = false,
      onCheckedChange,
      className = '',
      containerClassName = '',
      id,
      name,
      disabled,
      ...rest
    },
    ref,
  ) {
    const switchId = id ?? name

    return (
      <div className={`admin-form-field ${containerClassName}`.trim()}>
        <div className="admin-form-switch">
          <button
            ref={ref}
            id={switchId}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            className={`admin-form-switch__track ${checked ? 'is-on' : ''} ${className}`.trim()}
            onClick={() => onCheckedChange?.(!checked)}
            {...rest}
          >
            <span className="admin-form-switch__thumb" aria-hidden />
          </button>
          <label htmlFor={switchId} className="admin-form-label admin-form-switch__label">
            {label}
          </label>
        </div>
        {error ? <p className="admin-form-error">{error}</p> : null}
        {!error && hint ? <p className="admin-form-hint">{hint}</p> : null}
      </div>
    )
  },
)

type FormSwitchProps<T extends FieldValues> = Omit<
  BaseSwitchProps,
  'name' | 'checked' | 'onCheckedChange' | 'error'
> & {
  name: FieldPath<T>
}

/** Controlled Switch — must be used inside a RHF `FormProvider`. */
export function FormSwitch<T extends FieldValues>({
  name,
  label,
  hint,
  ...rest
}: FormSwitchProps<T>) {
  const { control } = useFormContext<T>()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Switch
          {...rest}
          name={name}
          label={label}
          hint={hint}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          ref={field.ref}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
