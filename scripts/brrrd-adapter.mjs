import upstream from '@brrrd/adapter'
import { prepareRuntimePageManifest } from './brrrd-runtime-pages.mjs'

export function withCompleteDocuments(adapter) {
  return {
    ...adapter,
    async onBuildComplete(context) {
      await adapter.onBuildComplete(context)
      const count = await prepareRuntimePageManifest(context.projectDir)
      console.log(`[brrrd] ${count} PPR documents use complete runtime rendering`)
    },
  }
}

export default withCompleteDocuments(upstream)
