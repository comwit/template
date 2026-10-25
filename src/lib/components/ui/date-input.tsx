'use client'

import * as React from 'react'
import { DatePicker } from './date-picker'
import { invalidField } from '@/lib/interaction'
import { cn } from '@/lib/utils/cn'

/**
 * Input's date adapter. DatePicker owns the visible UI; an offscreen date input
 * preserves native form values, constraints, refs, and real React change events.
 */
export function DateInput({
  className,
  bare,
  id,
  ref,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  onInvalid,
  style,
  tabIndex,
  hidden,
  autoFocus,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'> & { bare?: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [localValue, setLocalValue] = React.useState(String(defaultValue ?? ''))
  const controlled = value != null

  const setRef = React.useCallback((input: HTMLInputElement | null) => {
    inputRef.current = input
    if (typeof ref === 'function') return ref(input)
    if (ref) ref.current = input
  }, [ref])

  React.useEffect(() => {
    const input = inputRef.current
    const form = input?.form
    if (!input || !form) return
    const reset = (event: Event) => {
      // The reset event fires before the browser restores defaultValue.
      queueMicrotask(() => {
        if (!event.defaultPrevented) setLocalValue(input.value)
      })
    }
    form.addEventListener('reset', reset)
    return () => form.removeEventListener('reset', reset)
  }, [props.form])

  const select = (next: string) => {
    const input = inputRef.current
    if (!input || input.disabled || input.readOnly) return
    // Bypass React's value tracker so React emits a real onChange event.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, next)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const forwardFocus = (event: React.FocusEvent<HTMLButtonElement>, type: 'focusin' | 'focusout') => {
    event.stopPropagation()
    inputRef.current?.dispatchEvent(new FocusEvent(type, {
      bubbles: true,
      relatedTarget: event.relatedTarget,
    }))
  }

  return (
    <>
      <DatePicker
        id={id}
        value={controlled ? String(value) : localValue}
        onChange={select}
        min={props.min == null ? undefined : String(props.min)}
        max={props.max == null ? undefined : String(props.max)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        className={cn(
          'min-w-0',
          invalidField,
          bare && 'h-auto rounded-none border-0 px-0 focus-visible:ring-0',
          className,
        )}
        triggerProps={{
          ref: triggerRef,
          'data-slot': 'input',
          'aria-label': props['aria-label'],
          'aria-labelledby': props['aria-labelledby'],
          'aria-describedby': props['aria-describedby'],
          'aria-invalid': props['aria-invalid'],
          title: props.title,
          style,
          tabIndex,
          hidden,
          autoFocus,
          onFocus: event => forwardFocus(event, 'focusin'),
          onBlur: event => forwardFocus(event, 'focusout'),
        }}
      />
      <input
        {...props}
        ref={setRef}
        type="date"
        value={value}
        defaultValue={defaultValue}
        tabIndex={-1}
        aria-hidden="true"
        aria-label={undefined}
        aria-labelledby={undefined}
        aria-describedby={undefined}
        className="pointer-events-none sr-only"
        onChange={(event) => {
          if (!controlled) setLocalValue(event.currentTarget.value)
          onChange?.(event)
        }}
        onFocus={(event) => {
          // ref.focus() and form-validation focus land on the visible picker.
          if (document.activeElement === event.currentTarget) {
            triggerRef.current?.focus()
          } else {
            onFocus?.(event)
          }
        }}
        onBlur={(event) => {
          if (event.relatedTarget !== triggerRef.current) onBlur?.(event)
        }}
        onInvalid={(event) => {
          onInvalid?.(event)
          if (!event.defaultPrevented) triggerRef.current?.focus()
        }}
      />
    </>
  )
}
