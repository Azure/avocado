import * as YAML from 'js-yaml'

export const safeLoad = (content: string) => {
  try {
    return YAML.safeLoad(content) as any
  } catch (err) {
    return undefined
  }
}
