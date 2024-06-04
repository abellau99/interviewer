import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import { Section } from '@/components/section'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'

export async function querySuggestor(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  const objectStream = createStreamableValue<PartialRelated>()
  uiStream.append(
    <Section title="Related" separator={true}>
      <SearchRelated relatedQueries={objectStream.value} />
    </Section>
  )

  let finalRelatedQueries: PartialRelated = {}
  await streamObject({
    model: getModel(),
    system: `As a professional user researcher, your task is to generate a set of five short answers that are most common to a given qualitative question, building upon the topic of the research and the information uncovered in the search results.

    For instance, if the original query was "What are the best smartphone brands", your output should follow this format:

    "{
      "related": [
        "Apple",
        "Samsung",
        "Huawei",
        "Xiaomi",
        "Google",
      ]
    }"

    Aim to create answers that progressively delve into more details or adjacent topics related to the initial query. The goal is to anticipate the user's potential thoughts needs and guide them towards a more comprehensive understanding of the subject matter.
    Please match the language of the response to the user's language.`,
    messages,
    schema: relatedSchema
  })
    .then(async result => {
      for await (const obj of result.partialObjectStream) {
        if (obj.items) {
          objectStream.update(obj)
          finalRelatedQueries = obj
        }
      }
    })
    .finally(() => {
      objectStream.done()
    })

  return finalRelatedQueries
}
