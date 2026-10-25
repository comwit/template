'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * ForesightLink: a drop-in next/link wrapper for the base template.
 *
 * Comwit uses ForesightJS for pointer-predicted prefetching; the base template uses
 * plain next/link without extra dependencies. Identical exports and props preserve
 * the admin _components import { ForesightLink as Link }.
 * Install @foresightjs/react and replace this with Comwit's implementation for predictive prefetching.
 */
type ForesightLinkProps = ComponentProps<typeof NextLink>

export function ForesightLink(props: ForesightLinkProps) {
  return <NextLink {...props} />
}
